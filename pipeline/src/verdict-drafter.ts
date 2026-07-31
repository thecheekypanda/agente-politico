import { getProgramPosition } from './program-retrieval.js';
import type { ProgramChunksStore } from './program-chunks-store.js';
import { PARTY_PROGRAM_SOURCES } from './party-programs.js';
import { sleep } from './sleep.js';
import type { AnthropicBatchClient, BatchCreateRequest, BatchResult } from './topic-tagger.js';
import type { PendingVerdict, VerdictInsert, VerdictStore } from './verdict-store.js';
import { isAddressedVerdictLabel, type AddressedVerdictLabel } from './verdict-labels.js';
import { buildVerdictPrompt, VERDICT_SCHEMA } from './verdict-prompt.js';

const MODEL = 'claude-haiku-4-5';
const MAX_TOKENS = 512;
const POLL_INTERVAL_MS = 5000;

const PARTY_NAME_BY_LABEL = new Map(PARTY_PROGRAM_SOURCES.map((source) => [source.label, source.partyName]));

function partyNameFor(label: string): string {
  const partyName = PARTY_NAME_BY_LABEL.get(label);
  if (!partyName) {
    throw new Error(`No known party name for label "${label}" — check party-programs.ts.`);
  }
  return partyName;
}

// Same field set topic-tagger.ts uses to describe an initiative to the
// model — kept identical so both LLM steps see the same summary of what an
// initiative is.
function initiativeSummary(pending: PendingVerdict): string {
  return [
    `Título: ${pending.titulo}`,
    `Tipo: ${pending.tipoDesc}`,
    pending.epigrafe ? `Epígrafe: ${pending.epigrafe}` : null,
  ]
    .filter((line): line is string => line !== null)
    .join('\n');
}

function customId(pending: PendingVerdict): string {
  return `${pending.iniciativaId}:${pending.partyLabel}`;
}

interface AddressedItem {
  pending: PendingVerdict;
  citationPageNumber: number;
  quotedPassage: string;
  prompt: string;
}

function buildBatchRequest(item: AddressedItem): BatchCreateRequest {
  return {
    custom_id: customId(item.pending),
    params: {
      model: MODEL,
      max_tokens: MAX_TOKENS,
      messages: [{ role: 'user', content: item.prompt }],
      output_config: { format: { type: 'json_schema', schema: VERDICT_SCHEMA } },
    },
  };
}

interface ParsedVerdict {
  label: AddressedVerdictLabel;
  rationale: string;
}

// Mirrors parseTopicResult's shape and rigor: null for anything short of a
// clean, schema-compliant success — never a guessed label.
export function parseVerdictResult(result: BatchResult): ParsedVerdict | null {
  if (result.result.type !== 'succeeded') {
    return null;
  }
  const { message } = result.result;
  if (message.stop_reason !== 'end_turn') {
    return null;
  }

  const textBlock = message.content.find((block) => block.type === 'text' && block.text);
  if (!textBlock?.text) {
    return null;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(textBlock.text);
  } catch {
    return null;
  }

  if (
    typeof parsed !== 'object' ||
    parsed === null ||
    !('label' in parsed) ||
    !('rationale' in parsed) ||
    typeof (parsed as { label: unknown }).label !== 'string' ||
    typeof (parsed as { rationale: unknown }).rationale !== 'string'
  ) {
    return null;
  }

  const { label, rationale } = parsed as { label: string; rationale: string };
  if (!isAddressedVerdictLabel(label) || rationale.trim() === '') {
    return null;
  }
  return { label, rationale };
}

async function runBatch(
  client: AnthropicBatchClient,
  items: AddressedItem[],
): Promise<Map<string, ParsedVerdict | null>> {
  const outcomes = new Map<string, ParsedVerdict | null>();
  if (items.length === 0) {
    return outcomes;
  }

  const batch = await client.create(items.map(buildBatchRequest));
  for (;;) {
    const status = await client.retrieve(batch.id);
    if (status.processing_status === 'ended') {
      break;
    }
    await sleep(POLL_INTERVAL_MS);
  }

  for await (const result of await client.results(batch.id)) {
    outcomes.set(result.custom_id, parseVerdictResult(result));
  }
  return outcomes;
}

export interface DraftVerdictsResult {
  attempted: number;
  notAddressed: number;
  drafted: number;
  undrafted: number;
}

export async function draftVerdicts(
  store: VerdictStore,
  chunksStore: ProgramChunksStore,
  client: AnthropicBatchClient,
): Promise<DraftVerdictsResult> {
  const pending = await store.findPendingPairs(PARTY_PROGRAM_SOURCES.map((source) => source.label));
  if (pending.length === 0) {
    return { attempted: 0, notAddressed: 0, drafted: 0, undrafted: 0 };
  }

  const addressed: AddressedItem[] = [];
  let notAddressed = 0;

  for (const item of pending) {
    const position = await getProgramPosition(chunksStore, item.partyLabel, item.topic);
    if (!position.addressed) {
      await store.saveVerdict({
        iniciativaId: item.iniciativaId,
        partyLabel: item.partyLabel,
        topic: item.topic,
        label: 'not_addressed',
        citationPageNumber: null,
        quotedPassage: null,
        rationale: null,
        prompt: null,
      });
      notAddressed += 1;
      continue;
    }

    // Top-ranked chunk only — every party gets exactly one citation to keep
    // the amount of evidence identical across parties, never more for one
    // than another.
    const topChunk = position.chunks[0];
    addressed.push({
      pending: item,
      citationPageNumber: topChunk.pageNumber,
      quotedPassage: topChunk.content,
      prompt: buildVerdictPrompt(partyNameFor(item.partyLabel), initiativeSummary(item), topChunk.content),
    });
  }

  const firstPass = await runBatch(client, addressed);

  // One retry pass for anything that didn't validate the first time — same
  // transient-failure allowance as tagTopics.
  const stillPending = addressed.filter((item) => !firstPass.get(customId(item.pending)));
  const retryPass = stillPending.length > 0 ? await runBatch(client, stillPending) : new Map<string, ParsedVerdict | null>();

  let drafted = 0;
  for (const item of addressed) {
    const parsed = firstPass.get(customId(item.pending)) ?? retryPass.get(customId(item.pending));
    if (parsed) {
      await store.saveVerdict({
        iniciativaId: item.pending.iniciativaId,
        partyLabel: item.pending.partyLabel,
        topic: item.pending.topic,
        label: parsed.label,
        citationPageNumber: item.citationPageNumber,
        quotedPassage: item.quotedPassage,
        rationale: parsed.rationale,
        prompt: item.prompt,
      });
      drafted += 1;
    }
    // Otherwise left undrafted — findPendingPairs() picks it up again next
    // run, same eventually-consistent pattern as topic-tagger.ts.
  }

  // Same canary as tagTopics: individual failures are expected
  // occasionally, but if *nothing* addressed-and-batched drafted even
  // after the retry, that's much more likely a bad API key or an outage
  // than every single one being a genuine refusal — halt loudly instead of
  // quietly leaving everything undrafted. A batch made up entirely of
  // not_addressed pairs never reaches this check, since it never calls the
  // LLM at all.
  if (addressed.length > 0 && drafted === 0) {
    throw new Error(
      `Failed to draft a verdict for any of ${addressed.length} addressed initiative/party pairs — ` +
        'the Anthropic API key may be invalid, the model may be unavailable, or the service may be down.',
    );
  }

  return {
    attempted: pending.length,
    notAddressed,
    drafted,
    undrafted: addressed.length - drafted,
  };
}
