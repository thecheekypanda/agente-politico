import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { MODEL as VERDICT_MODEL } from './verdict-drafter.js';
import { buildVerdictPrompt, VERDICT_PROMPT_VERSION } from './verdict-prompt.js';
import { ADDRESSED_VERDICT_LABELS, VERDICT_LABELS } from './verdict-labels.js';
import { MODEL as TOPIC_MODEL, buildTopicPrompt } from './topic-tagger.js';
import { TOPICS } from './topics.js';
import { DEFAULT_LIMIT, DEFAULT_MIN_CONFIDENT_RANK } from './program-retrieval.js';
import { PARTY_PROGRAM_SOURCES } from './party-programs.js';

export interface MethodologyReport {
  verdictDrafting: {
    model: string;
    promptVersion: string;
    // Rendered by calling the real buildVerdictPrompt with placeholder
    // tokens instead of real data — this is the exact function used in
    // production, not a hand-copied string, so it can't silently drift
    // from what's actually sent to the model.
    promptTemplate: string;
    labels: readonly string[];
    addressedOnlyLabels: readonly string[];
  };
  topicTagging: {
    model: string;
    promptTemplate: string;
    topics: readonly string[];
  };
  retrieval: {
    minConfidentRank: number;
    limit: number;
    notAddressedRule: string;
  };
  parties: {
    label: string;
    partyName: string;
    arSiglas: string[];
    sourceUrl: string;
    electionCycle: string;
  }[];
}

export function buildMethodologyReport(): MethodologyReport {
  return {
    verdictDrafting: {
      model: VERDICT_MODEL,
      promptVersion: VERDICT_PROMPT_VERSION,
      promptTemplate: buildVerdictPrompt('{{PARTIDO}}', '{{RESUMO_DA_INICIATIVA}}', '{{PASSAGEM_DO_PROGRAMA}}'),
      labels: VERDICT_LABELS,
      addressedOnlyLabels: ADDRESSED_VERDICT_LABELS,
    },
    topicTagging: {
      model: TOPIC_MODEL,
      promptTemplate: buildTopicPrompt({
        id: 0,
        titulo: '{{TÍTULO}}',
        tipo_desc: '{{TIPO}}',
        epigrafe: '{{EPÍGRAFE}}',
      }),
      topics: TOPICS,
    },
    retrieval: {
      minConfidentRank: DEFAULT_MIN_CONFIDENT_RANK,
      limit: DEFAULT_LIMIT,
      notAddressedRule:
        'Se a pesquisa de texto completo não encontrar nenhuma correspondência, ou se a pontuação da melhor correspondência ' +
        'ficar abaixo do limiar mínimo, o veredicto é "não abordado no programa" — decidido antes de qualquer chamada ao modelo, ' +
        'que nunca chega a ver este caso.',
    },
    parties: PARTY_PROGRAM_SOURCES.map((source) => ({
      label: source.label,
      partyName: source.partyName,
      arSiglas: source.arSiglas,
      sourceUrl: source.sourceUrl,
      electionCycle: source.electionCycle,
    })),
  };
}

// Entry point: writes the report as JSON for web/'s methodology page to
// import at build time (see web/package.json's "prebuild" script). Sibling
// directory, since pipeline/ and web/ are both direct children of the repo
// root.
const isMain = process.argv[1] === fileURLToPath(import.meta.url);
if (isMain) {
  const outPath = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'web', 'src', 'data', 'methodology.json');
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, JSON.stringify(buildMethodologyReport(), null, 2) + '\n');
  console.log(`Wrote methodology report to ${outPath}`);
}
