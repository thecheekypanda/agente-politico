import { describe, expect, it } from 'vitest';
import {
  resolveCanonicalUrls,
  type CanonicalUrlStore,
  type UnresolvedIniciativa,
} from '../src/canonical-url-store.js';

// In-memory stand-in for the `iniciativas` table's canonical_url column.
// findUnresolved() only ever returns rows still null, same as the real
// `WHERE canonical_url IS NULL` query — this is what proves a resolved row
// never gets re-verified on a later run.
class FakeCanonicalUrlStore implements CanonicalUrlStore {
  resolvedUrls = new Map<number, string>();
  markResolvedCalls: number[] = [];

  constructor(private readonly rows: UnresolvedIniciativa[]) {}

  async findUnresolved(): Promise<UnresolvedIniciativa[]> {
    return this.rows.filter((row) => !this.resolvedUrls.has(row.id));
  }

  async markResolved(id: number, url: string): Promise<void> {
    this.markResolvedCalls.push(id);
    this.resolvedUrls.set(id, url);
  }
}

function htmlResponse(body: string, ok = true): Response {
  return { ok, status: ok ? 200 : 404, text: async () => body } as Response;
}

describe('resolveCanonicalUrls', () => {
  it('resolves every row whose titulo verifies against the source page', async () => {
    const store = new FakeCanonicalUrlStore([
      { id: 1, titulo: 'Primeira iniciativa' },
      { id: 2, titulo: 'Segunda iniciativa' },
    ]);
    const fetchImpl = async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('BID=1')) return htmlResponse('<h1>Primeira iniciativa</h1>');
      return htmlResponse('<h1>Segunda iniciativa</h1>');
    };

    const result = await resolveCanonicalUrls(store, { fetchImpl });

    expect(result).toEqual({ attempted: 2, resolved: 2, unresolved: 0 });
    expect(store.resolvedUrls.get(1)).toContain('BID=1');
    expect(store.resolvedUrls.get(2)).toContain('BID=2');
  });

  it('leaves a row unresolved (not guessed) when its titulo does not verify, without throwing', async () => {
    const store = new FakeCanonicalUrlStore([
      { id: 1, titulo: 'Matches' },
      { id: 2, titulo: 'Does not match' },
    ]);
    const fetchImpl = async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('BID=1')) return htmlResponse('<h1>Matches</h1>');
      return htmlResponse('<h1>Something else entirely</h1>');
    };

    const result = await resolveCanonicalUrls(store, { fetchImpl });

    expect(result).toEqual({ attempted: 2, resolved: 1, unresolved: 1 });
    expect(store.resolvedUrls.has(2)).toBe(false);
  });

  it('never re-verifies a row that a previous run already resolved', async () => {
    const store = new FakeCanonicalUrlStore([{ id: 1, titulo: 'Já resolvida' }]);
    let fetchCalls = 0;
    const fetchImpl = async () => {
      fetchCalls += 1;
      return htmlResponse('<h1>Já resolvida</h1>');
    };

    const first = await resolveCanonicalUrls(store, { fetchImpl });
    const second = await resolveCanonicalUrls(store, { fetchImpl });

    expect(first.resolved).toBe(1);
    expect(second).toEqual({ attempted: 0, resolved: 0, unresolved: 0 });
    expect(fetchCalls).toBe(1);
    expect(store.markResolvedCalls).toEqual([1]);
  });

  it('throws instead of silently leaving every citation unresolved when nothing in a non-empty batch verifies', async () => {
    const store = new FakeCanonicalUrlStore([
      { id: 1, titulo: 'A' },
      { id: 2, titulo: 'B' },
    ]);
    const fetchImpl = async () => htmlResponse('Not Found', false);

    await expect(resolveCanonicalUrls(store, { fetchImpl })).rejects.toThrow(/parlamento\.pt/i);
  });

  it('does nothing and does not throw when there is nothing to resolve', async () => {
    const store = new FakeCanonicalUrlStore([]);
    const fetchImpl = async () => htmlResponse('irrelevant');

    const result = await resolveCanonicalUrls(store, { fetchImpl });

    expect(result).toEqual({ attempted: 0, resolved: 0, unresolved: 0 });
  });
});
