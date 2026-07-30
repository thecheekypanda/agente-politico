import { sleep } from './sleep.js';
import { TOPICS, isTopic, type Topic } from './topics.js';
import type { TopicStore, UntaggedIniciativa } from './topic-store.js';

const MODEL = 'claude-haiku-4-5';
const MAX_TOKENS = 256;
const POLL_INTERVAL_MS = 5000;

export interface BatchCreateRequest {
  custom_id: string;
  params: {
    model: string;
    max_tokens: number;
    messages: { role: 'user'; content: string }[];
    output_config: { format: { type: 'json_schema'; schema: Record<string, unknown> } };
  };
}

export interface AnthropicMessageLike {
  stop_reason: string | null;
  content: { type: string; text?: string }[];
}

export interface BatchResult {
  custom_id: string;
  result:
    | { type: 'succeeded'; message: AnthropicMessageLike }
    | { type: 'errored' | 'canceled' | 'expired' };
}

// Deliberately narrow — the three Batches methods this module actually
// uses — so tests can supply a fake with no real API key or network call,
// the same fetchImpl-injection pattern used everywhere else in this
// pipeline. A real `Anthropic` client's `messages.batches` satisfies this
// structurally; see ingest-topics.ts.
export interface AnthropicBatchClient {
  create(requests: BatchCreateRequest[]): Promise<{ id: string }>;
  retrieve(id: string): Promise<{ processing_status: 'in_progress' | 'canceling' | 'ended' }>;
  results(id: string): Promise<AsyncIterable<BatchResult>>;
}

// `enum` on the schema's `topic` field makes an out-of-list answer
// structurally impossible on a clean success — this is what actually
// enforces "never invent a topic", not the prompt wording.
const TOPIC_SCHEMA = {
  type: 'object',
  properties: {
    topic: { type: 'string', enum: TOPICS },
  },
  required: ['topic'],
  additionalProperties: false,
} as const;

function buildPrompt(iniciativa: UntaggedIniciativa): string {
  return [
    'Classifica esta iniciativa parlamentar portuguesa num único tópico da lista fornecida.',
    `Título: ${iniciativa.titulo}`,
    `Tipo: ${iniciativa.tipo_desc}`,
    iniciativa.epigrafe ? `Epígrafe: ${iniciativa.epigrafe}` : null,
  ]
    .filter((line): line is string => line !== null)
    .join('\n');
}

export function buildBatchRequest(iniciativa: UntaggedIniciativa): BatchCreateRequest {
  return {
    custom_id: String(iniciativa.id),
    params: {
      model: MODEL,
      max_tokens: MAX_TOKENS,
      messages: [{ role: 'user', content: buildPrompt(iniciativa) }],
      output_config: { format: { type: 'json_schema', schema: TOPIC_SCHEMA } },
    },
  };
}

// Returns the validated topic, or null for anything short of a clean,
// schema-compliant success — refused, truncated, errored, or malformed.
// Never guessed at: null means "retry or leave untagged", never "assume".
export function parseTopicResult(result: BatchResult): Topic | null {
  if (result.result.type !== 'succeeded') {
    return null;
  }
  const { message } = result.result;
  // refusal / max_tokens / anything else: structured-output compliance
  // isn't guaranteed outside a clean end_turn completion.
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
    !('topic' in parsed) ||
    typeof (parsed as { topic: unknown }).topic !== 'string'
  ) {
    return null;
  }

  const { topic } = parsed as { topic: string };
  // Belt-and-suspenders re-check — matches this codebase's rule of never
  // trusting external data just because it round-tripped without error.
  return isTopic(topic) ? topic : null;
}

async function runBatch(
  client: AnthropicBatchClient,
  requests: BatchCreateRequest[],
): Promise<Map<string, Topic | null>> {
  const outcomes = new Map<string, Topic | null>();
  if (requests.length === 0) {
    return outcomes;
  }

  const batch = await client.create(requests);
  for (;;) {
    const status = await client.retrieve(batch.id);
    if (status.processing_status === 'ended') {
      break;
    }
    await sleep(POLL_INTERVAL_MS);
  }

  for await (const result of await client.results(batch.id)) {
    outcomes.set(result.custom_id, parseTopicResult(result));
  }
  return outcomes;
}

export interface TagTopicsResult {
  attempted: number;
  tagged: number;
  untagged: number;
}

export async function tagTopics(
  store: TopicStore,
  client: AnthropicBatchClient,
): Promise<TagTopicsResult> {
  const pending = await store.findUntagged();
  if (pending.length === 0) {
    return { attempted: 0, tagged: 0, untagged: 0 };
  }

  const firstPass = await runBatch(
    client,
    pending.map((iniciativa) => buildBatchRequest(iniciativa)),
  );

  // One retry pass for anything that didn't validate the first time —
  // covers transient refusals/truncation, not a permanent failure mode.
  const stillPending = pending.filter((iniciativa) => !firstPass.get(String(iniciativa.id)));
  const retryPass =
    stillPending.length > 0
      ? await runBatch(
          client,
          stillPending.map((iniciativa) => buildBatchRequest(iniciativa)),
        )
      : new Map<string, Topic | null>();

  let tagged = 0;
  for (const iniciativa of pending) {
    const topic = firstPass.get(String(iniciativa.id)) ?? retryPass.get(String(iniciativa.id));
    if (topic) {
      await store.saveTopic(iniciativa.id, topic);
      tagged += 1;
    }
    // Otherwise left untagged — findUntagged() picks it up again next run,
    // same eventually-consistent pattern as the 1.2/1.3 backfills.
  }

  // Individual failures (a refusal, truncated output) are expected
  // occasionally. But if *nothing* in a non-empty batch tagged even after
  // the retry, that's much more likely a bad API key, a deprecated model,
  // or an outage — halt loudly instead of quietly leaving everything
  // untagged, same canary shape as resolveCanonicalUrls.
  if (tagged === 0) {
    throw new Error(
      `Failed to tag a topic for any of ${pending.length} iniciativas — ` +
        'the Anthropic API key may be invalid, the model may be unavailable, or the service may be down.',
    );
  }

  return { attempted: pending.length, tagged, untagged: pending.length - tagged };
}
