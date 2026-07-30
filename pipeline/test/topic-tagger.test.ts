import { describe, expect, it } from 'vitest';
import {
  buildBatchRequest,
  parseTopicResult,
  tagTopics,
  type AnthropicBatchClient,
  type BatchCreateRequest,
  type BatchResult,
} from '../src/topic-tagger.js';
import { TOPICS } from '../src/topics.js';
import type { TopicStore, UntaggedIniciativa } from '../src/topic-store.js';
import type { Topic } from '../src/topics.js';

function succeeded(topic: string, stopReason = 'end_turn'): BatchResult['result'] {
  return {
    type: 'succeeded',
    message: {
      stop_reason: stopReason,
      content: [{ type: 'text', text: JSON.stringify({ topic }) }],
    },
  };
}

function errored(): BatchResult['result'] {
  return { type: 'errored' };
}

function sample(overrides: Partial<UntaggedIniciativa> = {}): UntaggedIniciativa {
  return {
    id: 1,
    titulo: 'Recomenda ao Governo a construção de habitação a custos acessíveis',
    tipo_desc: 'Projeto de Resolução',
    epigrafe: null,
    ...overrides,
  };
}

// Queues one scripted response per custom_id, consumed in order across
// successive create()/results() calls — lets a test control exactly what
// the first pass vs. the retry pass returns for the same iniciativa,
// without a real network call or API key.
class FakeAnthropicBatchClient implements AnthropicBatchClient {
  private readonly queues: Map<string, BatchResult['result'][]>;
  private readonly pendingBatches = new Map<string, string[]>();
  private nextBatchId = 1;
  createCalls = 0;

  constructor(queues: Record<string, BatchResult['result'][]>) {
    this.queues = new Map(Object.entries(queues));
  }

  async create(requests: BatchCreateRequest[]): Promise<{ id: string }> {
    this.createCalls += 1;
    const id = `batch_${this.nextBatchId++}`;
    this.pendingBatches.set(
      id,
      requests.map((r) => r.custom_id),
    );
    return { id };
  }

  async retrieve(): Promise<{ processing_status: 'in_progress' | 'canceling' | 'ended' }> {
    return { processing_status: 'ended' };
  }

  async results(id: string): Promise<AsyncIterable<BatchResult>> {
    const customIds = this.pendingBatches.get(id) ?? [];
    const queues = this.queues;
    return (async function* () {
      for (const customId of customIds) {
        const queue = queues.get(customId) ?? [];
        const next = queue.shift() ?? errored();
        yield { custom_id: customId, result: next };
      }
    })();
  }
}

class FakeTopicStore implements TopicStore {
  private readonly rows: Map<number, UntaggedIniciativa & { topic?: Topic }>;
  saveTopicCalls: { id: number; topic: Topic }[] = [];

  constructor(initial: UntaggedIniciativa[]) {
    this.rows = new Map(initial.map((i) => [i.id, { ...i }]));
  }

  async findUntagged(): Promise<UntaggedIniciativa[]> {
    return [...this.rows.values()]
      .filter((row) => row.topic === undefined)
      .map(({ id, titulo, tipo_desc, epigrafe }) => ({ id, titulo, tipo_desc, epigrafe }));
  }

  async saveTopic(id: number, topic: Topic): Promise<void> {
    this.saveTopicCalls.push({ id, topic });
    const row = this.rows.get(id);
    if (row) row.topic = topic;
  }

  topicFor(id: number): Topic | undefined {
    return this.rows.get(id)?.topic;
  }
}

describe('buildBatchRequest', () => {
  it('constrains the response to the closed topic list via json_schema enum', () => {
    const request = buildBatchRequest(sample({ id: 42 }));

    expect(request.custom_id).toBe('42');
    expect(request.params.model).toBe('claude-haiku-4-5');
    expect(request.params.output_config.format.type).toBe('json_schema');
    const schema = request.params.output_config.format.schema as {
      properties: { topic: { enum: readonly string[] } };
    };
    expect(schema.properties.topic.enum).toEqual(TOPICS);
  });
});

describe('parseTopicResult', () => {
  it('accepts a clean, schema-compliant success', () => {
    expect(parseTopicResult({ custom_id: '1', result: succeeded('Habitação') })).toBe('Habitação');
  });

  it('rejects a non-succeeded result', () => {
    expect(parseTopicResult({ custom_id: '1', result: errored() })).toBeNull();
  });

  it('rejects a refusal or truncated completion even if content is present', () => {
    expect(parseTopicResult({ custom_id: '1', result: succeeded('Habitação', 'refusal') })).toBeNull();
    expect(parseTopicResult({ custom_id: '1', result: succeeded('Habitação', 'max_tokens') })).toBeNull();
  });

  it('rejects malformed JSON instead of throwing', () => {
    const result: BatchResult['result'] = {
      type: 'succeeded',
      message: { stop_reason: 'end_turn', content: [{ type: 'text', text: 'not json' }] },
    };
    expect(parseTopicResult({ custom_id: '1', result })).toBeNull();
  });

  it('rejects a topic outside the closed list — never a fabricated match', () => {
    // The json_schema enum should make this structurally impossible from the
    // real API, but the defensive check must catch it regardless.
    expect(parseTopicResult({ custom_id: '1', result: succeeded('Astrologia') })).toBeNull();
  });
});

describe('tagTopics', () => {
  it('tags every pending iniciativa that validates on the first pass', async () => {
    const store = new FakeTopicStore([sample({ id: 1 }), sample({ id: 2, titulo: 'Saúde' })]);
    const client = new FakeAnthropicBatchClient({
      '1': [succeeded('Habitação')],
      '2': [succeeded('Saúde')],
    });

    const result = await tagTopics(store, client);

    expect(result).toEqual({ attempted: 2, tagged: 2, untagged: 0 });
    expect(store.topicFor(1)).toBe('Habitação');
    expect(store.topicFor(2)).toBe('Saúde');
    expect(client.createCalls).toBe(1); // no retry needed
  });

  it('retries a result that fails validation and tags it if the retry succeeds', async () => {
    const store = new FakeTopicStore([sample({ id: 1 })]);
    const client = new FakeAnthropicBatchClient({
      '1': [errored(), succeeded('Habitação')],
    });

    const result = await tagTopics(store, client);

    expect(result).toEqual({ attempted: 1, tagged: 1, untagged: 0 });
    expect(store.topicFor(1)).toBe('Habitação');
    expect(client.createCalls).toBe(2); // first pass + retry
  });

  it('leaves a still-invalid iniciativa untagged after the retry, without throwing, as long as something else succeeded', async () => {
    const store = new FakeTopicStore([sample({ id: 1 }), sample({ id: 2, titulo: 'Saúde' })]);
    const client = new FakeAnthropicBatchClient({
      '1': [errored(), errored()], // fails both passes
      '2': [succeeded('Saúde')],
    });

    const result = await tagTopics(store, client);

    expect(result).toEqual({ attempted: 2, tagged: 1, untagged: 1 });
    expect(store.topicFor(1)).toBeUndefined();
    expect(store.topicFor(2)).toBe('Saúde');
  });

  it('throws instead of silently leaving everything untagged when nothing in a non-empty batch tags', async () => {
    const store = new FakeTopicStore([sample({ id: 1 })]);
    const client = new FakeAnthropicBatchClient({
      '1': [errored(), errored()],
    });

    await expect(tagTopics(store, client)).rejects.toThrow(/Anthropic/i);
  });

  it('does nothing and does not throw when there is nothing to tag', async () => {
    const store = new FakeTopicStore([]);
    const client = new FakeAnthropicBatchClient({});

    const result = await tagTopics(store, client);

    expect(result).toEqual({ attempted: 0, tagged: 0, untagged: 0 });
    expect(client.createCalls).toBe(0);
  });

  it('never resubmits an iniciativa a previous run already tagged', async () => {
    const store = new FakeTopicStore([sample({ id: 1 })]);
    const client = new FakeAnthropicBatchClient({
      '1': [succeeded('Habitação')],
    });

    await tagTopics(store, client);
    const second = await tagTopics(store, client);

    expect(second).toEqual({ attempted: 0, tagged: 0, untagged: 0 });
    expect(client.createCalls).toBe(1); // no additional batch submitted
  });
});
