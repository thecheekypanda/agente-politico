import { describe, expect, it } from 'vitest';
import { buildMethodologyReport } from '../src/export-methodology.js';
import { PARTY_PROGRAM_SOURCES } from '../src/party-programs.js';
import { VERDICT_LABELS, ADDRESSED_VERDICT_LABELS } from '../src/verdict-labels.js';
import { TOPICS } from '../src/topics.js';

describe('buildMethodologyReport', () => {
  it('lists every configured party exactly once, with no silent omission or addition', () => {
    const report = buildMethodologyReport();

    expect(report.parties.map((p) => p.label).sort()).toEqual(
      PARTY_PROGRAM_SOURCES.map((p) => p.label).sort(),
    );
    for (const source of PARTY_PROGRAM_SOURCES) {
      expect(report.parties).toContainEqual({
        label: source.label,
        partyName: source.partyName,
        arSiglas: source.arSiglas,
        sourceUrl: source.sourceUrl,
        electionCycle: source.electionCycle,
      });
    }
  });

  it('renders the verdict prompt template with its placeholder tokens still present — proof it came from the generic template function, not a party-specific string', () => {
    const report = buildMethodologyReport();

    expect(report.verdictDrafting.promptTemplate).toContain('{{PARTIDO}}');
    expect(report.verdictDrafting.promptTemplate).toContain('{{RESUMO_DA_INICIATIVA}}');
    expect(report.verdictDrafting.promptTemplate).toContain('{{PASSAGEM_DO_PROGRAMA}}');
  });

  it('renders the topic-tagging prompt template with its placeholder tokens still present', () => {
    const report = buildMethodologyReport();

    expect(report.topicTagging.promptTemplate).toContain('{{TÍTULO}}');
    expect(report.topicTagging.promptTemplate).toContain('{{TIPO}}');
    expect(report.topicTagging.promptTemplate).toContain('{{EPÍGRAFE}}');
  });

  it('matches the single-source-of-truth label and topic lists exactly', () => {
    const report = buildMethodologyReport();

    expect(report.verdictDrafting.labels).toEqual(VERDICT_LABELS);
    expect(report.verdictDrafting.addressedOnlyLabels).toEqual(ADDRESSED_VERDICT_LABELS);
    expect(report.topicTagging.topics).toEqual(TOPICS);
  });
});
