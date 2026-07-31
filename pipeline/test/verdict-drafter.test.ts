import { describe, expect, it } from 'vitest';
import { draftVerdicts, parseVerdictResult } from '../src/verdict-drafter.js';
import type { AnthropicBatchClient, BatchCreateRequest, BatchResult } from '../src/topic-tagger.js';
import type { ChunkSearchResult, ProgramChunksStore } from '../src/program-chunks-store.js';
import type { ExtractedPage } from '../src/pdf-extractor.js';
import type { PartyProgramSource } from '../src/party-programs.js';
import type { PendingVerdict, VerdictInsert, VerdictStore } from '../src/verdict-store.js';

function succeeded(label: string, rationale = 'justificação breve', stopReason = 'end_turn'): BatchResult['result'] {
  return {
    type: 'succeeded',
    message: {
      stop_reason: stopReason,
      content: [{ type: 'text', text: JSON.stringify({ label, rationale }) }],
    },
  };
}

function errored(): BatchResult['result'] {
  return { type: 'errored' };
}

function sample(overrides: Partial<PendingVerdict> = {}): PendingVerdict {
  return {
    iniciativaId: 1,
    titulo: 'Recomenda ao Governo a construção de habitação a custos acessíveis',
    tipoDesc: 'Projeto de Resolução',
    epigrafe: null,
    topic: 'Habitação',
    partyLabel: 'PS',
    ...overrides,
  };
}

// Same queued-responses-per-custom_id pattern as topic-tagger.test.ts's
// FakeAnthropicBatchClient, reused here unchanged in spirit.
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
    this.pendingBatches.set(id, requests.map((r) => r.custom_id));
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

// Keyed on `${partyLabel}:${topic}` — lets each test control exactly what
// getProgramPosition sees per pair, without depending on real ts_rank
// scoring (same stubbing approach as program-retrieval.test.ts).
class FakeChunksStore implements ProgramChunksStore {
  constructor(private readonly results: Map<string, ChunkSearchResult[]>) {}

  async upsertProgram(_source: PartyProgramSource): Promise<number> {
    throw new Error('not used in these tests');
  }

  async upsertChunks(_programId: number, _pages: ExtractedPage[]): Promise<void> {
    throw new Error('not used in these tests');
  }

  async searchChunks(label: string, query: string): Promise<ChunkSearchResult[]> {
    return this.results.get(`${label}:${query}`) ?? [];
  }
}

class FakeVerdictStore implements VerdictStore {
  private readonly pending: PendingVerdict[];
  saved: VerdictInsert[] = [];

  constructor(pending: PendingVerdict[]) {
    this.pending = pending;
  }

  async findPendingPairs(): Promise<PendingVerdict[]> {
    const savedKeys = new Set(this.saved.map((row) => `${row.iniciativaId}:${row.partyLabel}`));
    return this.pending.filter((row) => !savedKeys.has(`${row.iniciativaId}:${row.partyLabel}`));
  }

  async saveVerdict(row: VerdictInsert): Promise<void> {
    this.saved.push(row);
  }

  savedFor(iniciativaId: number, partyLabel: string): VerdictInsert | undefined {
    return this.saved.find((row) => row.iniciativaId === iniciativaId && row.partyLabel === partyLabel);
  }
}

describe('parseVerdictResult', () => {
  it('accepts a clean, schema-compliant success', () => {
    expect(parseVerdictResult({ custom_id: '1:PS', result: succeeded('aligned') })).toEqual({
      label: 'aligned',
      rationale: 'justificação breve',
    });
  });

  it('rejects a non-succeeded result', () => {
    expect(parseVerdictResult({ custom_id: '1:PS', result: errored() })).toBeNull();
  });

  it('rejects a refusal or truncated completion even if content is present', () => {
    expect(parseVerdictResult({ custom_id: '1:PS', result: succeeded('aligned', 'x', 'refusal') })).toBeNull();
    expect(parseVerdictResult({ custom_id: '1:PS', result: succeeded('aligned', 'x', 'max_tokens') })).toBeNull();
  });

  it('rejects malformed JSON instead of throwing', () => {
    const result: BatchResult['result'] = {
      type: 'succeeded',
      message: { stop_reason: 'end_turn', content: [{ type: 'text', text: 'not json' }] },
    };
    expect(parseVerdictResult({ custom_id: '1:PS', result })).toBeNull();
  });

  it('rejects a label outside the addressed-only list — including not_addressed itself', () => {
    // The json_schema enum should make this structurally impossible from
    // the real API, but the defensive check must catch it regardless — the
    // LLM must never be the one deciding "not_addressed".
    expect(parseVerdictResult({ custom_id: '1:PS', result: succeeded('not_addressed') })).toBeNull();
    expect(parseVerdictResult({ custom_id: '1:PS', result: succeeded('astrologia') })).toBeNull();
  });

  it('rejects an empty rationale', () => {
    expect(parseVerdictResult({ custom_id: '1:PS', result: succeeded('aligned', '') })).toBeNull();
  });
});

describe('draftVerdicts', () => {
  it('saves a not_addressed pair without ever calling the batch client', async () => {
    const pair = sample();
    const store = new FakeVerdictStore([pair]);
    const chunksStore = new FakeChunksStore(new Map()); // no match registered => addressed:false
    const client = new FakeAnthropicBatchClient({});

    const result = await draftVerdicts(store, chunksStore, client);

    expect(result).toEqual({ attempted: 1, notAddressed: 1, drafted: 0, undrafted: 0 });
    expect(client.createCalls).toBe(0);
    expect(store.savedFor(1, 'PS')).toEqual({
      iniciativaId: 1,
      partyLabel: 'PS',
      topic: 'Habitação',
      label: 'not_addressed',
      citationPageNumber: null,
      quotedPassage: null,
      rationale: null,
      prompt: null,
    });
  });

  it('drafts an addressed pair using only the deterministically retrieved top chunk as citation, never the LLM output', async () => {
    const pair = sample();
    const store = new FakeVerdictStore([pair]);
    const chunksStore = new FakeChunksStore(
      new Map([['PS:Habitação', [{ pageNumber: 5, content: 'Medidas para a habitação acessível.', rank: 0.4 }]]]),
    );
    const client = new FakeAnthropicBatchClient({
      '1:PS': [succeeded('aligned', 'A iniciativa concretiza a medida do programa.')],
    });

    const result = await draftVerdicts(store, chunksStore, client);

    expect(result).toEqual({ attempted: 1, notAddressed: 0, drafted: 1, undrafted: 0 });
    const saved = store.savedFor(1, 'PS');
    expect(saved?.label).toBe('aligned');
    expect(saved?.citationPageNumber).toBe(5);
    expect(saved?.quotedPassage).toBe('Medidas para a habitação acessível.');
    expect(saved?.rationale).toBe('A iniciativa concretiza a medida do programa.');
    expect(saved?.prompt).toContain('Medidas para a habitação acessível.');
  });

  it('retries a result that fails validation and drafts it if the retry succeeds', async () => {
    const pair = sample();
    const store = new FakeVerdictStore([pair]);
    const chunksStore = new FakeChunksStore(
      new Map([['PS:Habitação', [{ pageNumber: 5, content: 'passagem', rank: 0.4 }]]]),
    );
    const client = new FakeAnthropicBatchClient({
      '1:PS': [errored(), succeeded('partially_aligned')],
    });

    const result = await draftVerdicts(store, chunksStore, client);

    expect(result).toEqual({ attempted: 1, notAddressed: 0, drafted: 1, undrafted: 0 });
    expect(store.savedFor(1, 'PS')?.label).toBe('partially_aligned');
    expect(client.createCalls).toBe(2);
  });

  it('leaves a still-invalid pair undrafted after the retry, without throwing, as long as something else drafted', async () => {
    const pairs = [sample({ iniciativaId: 1 }), sample({ iniciativaId: 2, partyLabel: 'CH' })];
    const store = new FakeVerdictStore(pairs);
    const chunksStore = new FakeChunksStore(
      new Map([
        ['PS:Habitação', [{ pageNumber: 5, content: 'passagem PS', rank: 0.4 }]],
        ['CH:Habitação', [{ pageNumber: 9, content: 'passagem CH', rank: 0.4 }]],
      ]),
    );
    const client = new FakeAnthropicBatchClient({
      '1:PS': [errored(), errored()],
      '2:CH': [succeeded('contradicts')],
    });

    const result = await draftVerdicts(store, chunksStore, client);

    expect(result).toEqual({ attempted: 2, notAddressed: 0, drafted: 1, undrafted: 1 });
    expect(store.savedFor(1, 'PS')).toBeUndefined();
    expect(store.savedFor(2, 'CH')?.label).toBe('contradicts');
  });

  it('throws instead of silently leaving everything undrafted when nothing addressed drafts', async () => {
    const pair = sample();
    const store = new FakeVerdictStore([pair]);
    const chunksStore = new FakeChunksStore(
      new Map([['PS:Habitação', [{ pageNumber: 5, content: 'passagem', rank: 0.4 }]]]),
    );
    const client = new FakeAnthropicBatchClient({
      '1:PS': [errored(), errored()],
    });

    await expect(draftVerdicts(store, chunksStore, client)).rejects.toThrow(/Anthropic/i);
  });

  it('never throws for a batch made up entirely of not_addressed pairs, since it never calls the LLM', async () => {
    const pair = sample();
    const store = new FakeVerdictStore([pair]);
    const chunksStore = new FakeChunksStore(new Map());
    const client = new FakeAnthropicBatchClient({});

    await expect(draftVerdicts(store, chunksStore, client)).resolves.not.toThrow();
  });

  it('does nothing and does not throw when there is nothing pending', async () => {
    const store = new FakeVerdictStore([]);
    const chunksStore = new FakeChunksStore(new Map());
    const client = new FakeAnthropicBatchClient({});

    const result = await draftVerdicts(store, chunksStore, client);

    expect(result).toEqual({ attempted: 0, notAddressed: 0, drafted: 0, undrafted: 0 });
    expect(client.createCalls).toBe(0);
  });

  it('never redrafts a pair a previous run already saved', async () => {
    const pair = sample();
    const store = new FakeVerdictStore([pair]);
    const chunksStore = new FakeChunksStore(
      new Map([['PS:Habitação', [{ pageNumber: 5, content: 'passagem', rank: 0.4 }]]]),
    );
    const client = new FakeAnthropicBatchClient({
      '1:PS': [succeeded('aligned')],
    });

    await draftVerdicts(store, chunksStore, client);
    const second = await draftVerdicts(store, chunksStore, client);

    expect(second).toEqual({ attempted: 0, notAddressed: 0, drafted: 0, undrafted: 0 });
    expect(client.createCalls).toBe(1);
  });
});
