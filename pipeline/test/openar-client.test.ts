import { describe, expect, it } from 'vitest';
import { fetchAllIniciativas, fetchIniciativaById } from '../src/openar-client.js';
import type { Iniciativa } from '../src/schemas/iniciativa.js';

function sampleIniciativa(overrides: Partial<Iniciativa> = {}): Iniciativa {
  return {
    id: 1,
    legislaturaId: 'XVII',
    numero: '1',
    tipo: 'J',
    tipoDesc: 'Projeto de Lei',
    titulo: 'Título de teste',
    epigrafe: null,
    dataEntrada: '2026-01-01',
    dataFim: null,
    estado: 'Entrada',
    linkTexto: null,
    ...overrides,
  };
}

function jsonResponse(body: unknown, ok = true, status = 200): Response {
  return {
    ok,
    status,
    statusText: ok ? 'OK' : 'Error',
    json: async () => body,
  } as Response;
}

describe('fetchAllIniciativas', () => {
  it('parses a single page of valid data', async () => {
    const items = [sampleIniciativa({ id: 1 }), sampleIniciativa({ id: 2 })];
    const fetchImpl = async () =>
      jsonResponse({ data: items, total: 2, page: 1, limit: 200 });

    const result = await fetchAllIniciativas({ fetchImpl });

    expect(result).toHaveLength(2);
    expect(result.map((i) => i.id)).toEqual([1, 2]);
  });

  it('walks multiple pages until the total is reached', async () => {
    const page1 = [sampleIniciativa({ id: 1 }), sampleIniciativa({ id: 2 })];
    const page2 = [sampleIniciativa({ id: 3 })];
    let calls = 0;
    const fetchImpl = async (input: RequestInfo | URL) => {
      calls += 1;
      const url = new URL(input as string);
      const page = url.searchParams.get('page');
      if (page === '1') return jsonResponse({ data: page1, total: 3, page: 1, limit: 2 });
      return jsonResponse({ data: page2, total: 3, page: 2, limit: 2 });
    };

    const result = await fetchAllIniciativas({ fetchImpl, pageLimit: 2 });

    expect(calls).toBe(2);
    expect(result.map((i) => i.id)).toEqual([1, 2, 3]);
  });

  it('throws on a non-ok HTTP response instead of silently returning nothing', async () => {
    const fetchImpl = async () => jsonResponse({ error: 'boom' }, false, 500);

    await expect(fetchAllIniciativas({ fetchImpl })).rejects.toThrow(/500/);
  });

  it('throws when the response does not match the documented schema', async () => {
    // `tipo` is missing entirely — simulates openAR silently dropping/renaming a field.
    const malformed = [{ id: 1, legislaturaId: 'XVII' }];
    const fetchImpl = async () =>
      jsonResponse({ data: malformed, total: 1, page: 1, limit: 200 });

    await expect(fetchAllIniciativas({ fetchImpl })).rejects.toThrow(/schema/i);
  });

  it('throws on an empty payload instead of silently ingesting nothing', async () => {
    const fetchImpl = async () => jsonResponse({ data: [], total: 0, page: 1, limit: 200 });

    await expect(fetchAllIniciativas({ fetchImpl })).rejects.toThrow(/empty payload/i);
  });

  it('allows an empty payload when explicitly opted in', async () => {
    const fetchImpl = async () => jsonResponse({ data: [], total: 0, page: 1, limit: 200 });

    const result = await fetchAllIniciativas({ fetchImpl, allowEmpty: true });

    expect(result).toEqual([]);
  });

  it('requests results oldest-first, so new filings append past already-paginated pages', async () => {
    // Regression coverage for the production bug (2026-07-28): openAR's
    // default newest-first sort let a new filing shift every unfetched
    // page during a multi-page walk, silently skipping records.
    let requestedSort: string | null = null;
    const fetchImpl = async (input: RequestInfo | URL) => {
      requestedSort = new URL(input as string).searchParams.get('sort');
      return jsonResponse({ data: [sampleIniciativa()], total: 1, page: 1, limit: 200 });
    };

    await fetchAllIniciativas({ fetchImpl });

    expect(requestedSort).toBe('asc');
  });
});

describe('fetchIniciativaById', () => {
  it('fetches and validates a single iniciativa', async () => {
    const fetchImpl = async () => jsonResponse(sampleIniciativa({ id: 42 }));

    const result = await fetchIniciativaById(42, { fetchImpl });

    expect(result?.id).toBe(42);
  });

  it('returns null on a 404 instead of throwing', async () => {
    const fetchImpl = async () => jsonResponse({}, false, 404);

    const result = await fetchIniciativaById(999, { fetchImpl });

    expect(result).toBeNull();
  });

  it('throws on a non-404 error response', async () => {
    const fetchImpl = async () => jsonResponse({}, false, 500);

    await expect(fetchIniciativaById(1, { fetchImpl })).rejects.toThrow(/500/);
  });

  it('throws when the response does not match the expected schema', async () => {
    const fetchImpl = async () => jsonResponse({ id: 1 }); // missing required fields

    await expect(fetchIniciativaById(1, { fetchImpl })).rejects.toThrow(/schema/i);
  });
});
