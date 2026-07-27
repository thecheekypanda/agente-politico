import { describe, expect, it } from 'vitest';
import { fetchAllVotacoes } from '../src/openar-client.js';
import type { Votacao } from '../src/schemas/votacao.js';

function sampleVotacao(overrides: Partial<Votacao> = {}): Votacao {
  return {
    id: '1',
    iniciativaId: 100,
    iniciativaTitulo: 'Título de teste',
    iniciativaNumero: '1',
    iniciativaTipo: 'J',
    legislaturaId: 'XVII',
    data: '2026-01-01',
    resultado: 'Aprovado',
    unanime: false,
    reuniao: '10',
    tipoReuniao: 'RP',
    descricao: null,
    aFavor: ['PS'],
    contra: ['PSD'],
    abstencao: [],
    ausencias: [],
    ...overrides,
  };
}

function jsonResponse(body: unknown, ok = true, status = 200): Response {
  return { ok, status, statusText: ok ? 'OK' : 'Error', json: async () => body } as Response;
}

describe('fetchAllVotacoes', () => {
  it('parses a page of valid votes, including an undocumented resultado value', async () => {
    const items = [
      sampleVotacao({ id: '1', resultado: 'Aprovado' }),
      sampleVotacao({ id: '2', resultado: 'Prejudicado' }),
    ];
    const fetchImpl = async () => jsonResponse({ data: items, total: 2, page: 1, limit: 200 });

    const result = await fetchAllVotacoes({ fetchImpl });

    expect(result.map((v) => v.resultado)).toEqual(['Aprovado', 'Prejudicado']);
  });

  it('walks multiple pages until the total is reached', async () => {
    const page1 = [sampleVotacao({ id: '1' }), sampleVotacao({ id: '2' })];
    const page2 = [sampleVotacao({ id: '3' })];
    const fetchImpl = async (input: RequestInfo | URL) => {
      const url = new URL(input as string);
      const page = url.searchParams.get('page');
      if (page === '1') return jsonResponse({ data: page1, total: 3, page: 1, limit: 2 });
      return jsonResponse({ data: page2, total: 3, page: 2, limit: 2 });
    };

    const result = await fetchAllVotacoes({ fetchImpl, pageLimit: 2 });

    expect(result.map((v) => v.id)).toEqual(['1', '2', '3']);
  });

  it('throws when the response does not match the expected schema', async () => {
    const malformed = [{ id: '1', iniciativaId: 100 }]; // missing required fields
    const fetchImpl = async () =>
      jsonResponse({ data: malformed, total: 1, page: 1, limit: 200 });

    await expect(fetchAllVotacoes({ fetchImpl })).rejects.toThrow(/schema/i);
  });

  it('throws on a non-ok HTTP response', async () => {
    const fetchImpl = async () => jsonResponse({ error: 'boom' }, false, 503);

    await expect(fetchAllVotacoes({ fetchImpl })).rejects.toThrow(/503/);
  });

  it('throws on an empty payload instead of silently ingesting nothing', async () => {
    const fetchImpl = async () => jsonResponse({ data: [], total: 0, page: 1, limit: 200 });

    await expect(fetchAllVotacoes({ fetchImpl })).rejects.toThrow(/empty payload/i);
  });
});
