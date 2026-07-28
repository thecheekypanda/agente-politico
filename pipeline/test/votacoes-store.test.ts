import { describe, expect, it } from 'vitest';
import {
  ingestVotacoes,
  toVotacaoRow,
  type VotacaoRow,
  type VotacoesStore,
} from '../src/votacoes-store.js';
import type { Votacao } from '../src/schemas/votacao.js';

function compositeKey(row: VotacaoRow): string {
  return `${row.iniciativa_id}:${row.votacao_id}`;
}

// Mirrors the composite primary key (iniciativa_id, votacao_id) from
// supabase/migrations/20260727010000_votacoes.sql.
class FakeVotacoesStore implements VotacoesStore {
  rows = new Map<string, VotacaoRow>();
  upsertCalls = 0;
  upsertBatchSizes: number[] = [];

  async upsert(rows: VotacaoRow[]): Promise<void> {
    this.upsertCalls += 1;
    this.upsertBatchSizes.push(rows.length);
    for (const row of rows) {
      this.rows.set(compositeKey(row), row);
    }
  }
}

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

function jsonResponse(body: unknown): Response {
  return { ok: true, status: 200, statusText: 'OK', json: async () => body } as Response;
}

describe('toVotacaoRow', () => {
  it('maps API fields to snake_case DB columns and drops duplicated iniciativa metadata', () => {
    const row = toVotacaoRow(sampleVotacao({ resultado: 'Prejudicado' }));

    expect(row).toEqual({
      iniciativa_id: 100,
      votacao_id: '1',
      legislatura_id: 'XVII',
      data: '2026-01-01',
      resultado: 'Prejudicado',
      unanime: false,
      reuniao: '10',
      tipo_reuniao: 'RP',
      descricao: null,
      a_favor: ['PS'],
      contra: ['PSD'],
      abstencao: [],
      ausencias: [],
    });
    expect(row).not.toHaveProperty('iniciativaTitulo');
  });
});

describe('ingestVotacoes idempotency', () => {
  it('running the job twice does not duplicate rows and shows the correct outcome', async () => {
    const items = [
      sampleVotacao({ id: '1', iniciativaId: 100, resultado: 'Aprovado' }),
      sampleVotacao({ id: '2', iniciativaId: 100, resultado: 'Rejeitado' }),
    ];
    const fetchImpl = async () => jsonResponse({ data: items, total: 2, page: 1, limit: 200 });
    const store = new FakeVotacoesStore();

    const first = await ingestVotacoes(store, { fetchImpl });
    const second = await ingestVotacoes(store, { fetchImpl });

    expect(first.fetched).toBe(2);
    expect(second.fetched).toBe(2);
    expect(store.rows.size).toBe(2);
    expect(store.rows.get('100:1')?.resultado).toBe('Aprovado');
    expect(store.rows.get('100:2')?.resultado).toBe('Rejeitado');
  });

  it('does not collide votes that share a votacao_id across different iniciativas', async () => {
    // openAR's id is only unique per-initiative — vote "1" on iniciativa 100
    // and vote "1" on iniciativa 200 are different rows.
    const items = [
      sampleVotacao({ id: '1', iniciativaId: 100, resultado: 'Aprovado' }),
      sampleVotacao({ id: '1', iniciativaId: 200, resultado: 'Rejeitado' }),
    ];
    const fetchImpl = async () => jsonResponse({ data: items, total: 2, page: 1, limit: 200 });
    const store = new FakeVotacoesStore();

    await ingestVotacoes(store, { fetchImpl });

    expect(store.rows.size).toBe(2);
    expect(store.rows.get('100:1')?.resultado).toBe('Aprovado');
    expect(store.rows.get('200:1')?.resultado).toBe('Rejeitado');
  });

  it('never passes a batch containing a duplicate (iniciativa_id, votacao_id) pair to the store', async () => {
    // Same class of bug as iniciativas-store: a real Postgres ON CONFLICT DO
    // UPDATE errors if one statement's VALUES repeat the composite key.
    const items = [
      sampleVotacao({ id: '1', iniciativaId: 100, resultado: 'Aprovado' }),
      sampleVotacao({ id: '1', iniciativaId: 100, resultado: 'Rejeitado' }),
    ];
    const fetchImpl = async () => jsonResponse({ data: items, total: 2, page: 1, limit: 200 });
    const store = new FakeVotacoesStore();

    await ingestVotacoes(store, { fetchImpl });

    expect(store.upsertBatchSizes).toEqual([1]);
  });

  it('a later run with an updated resultado overwrites the stored row instead of adding one', async () => {
    const store = new FakeVotacoesStore();
    const firstFetch = async () =>
      jsonResponse({
        data: [sampleVotacao({ id: '1', iniciativaId: 100, resultado: 'Aprovado' })],
        total: 1,
        page: 1,
        limit: 200,
      });
    const secondFetch = async () =>
      jsonResponse({
        data: [sampleVotacao({ id: '1', iniciativaId: 100, resultado: 'Rejeitado' })],
        total: 1,
        page: 1,
        limit: 200,
      });

    await ingestVotacoes(store, { fetchImpl: firstFetch });
    await ingestVotacoes(store, { fetchImpl: secondFetch });

    expect(store.rows.size).toBe(1);
    expect(store.rows.get('100:1')?.resultado).toBe('Rejeitado');
  });
});
