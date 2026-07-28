import { describe, expect, it } from 'vitest';
import { ingestIniciativas, toIniciativaRow, type IniciativaRow, type IniciativasStore } from '../src/iniciativas-store.js';
import type { Iniciativa } from '../src/schemas/iniciativa.js';

// In-memory stand-in for the `iniciativas` Postgres table. Keying by `id` and
// overwriting on upsert mirrors the real `ON CONFLICT (id) DO UPDATE` — it's
// what makes this test able to prove idempotency without a live Supabase project.
class FakeIniciativasStore implements IniciativasStore {
  rows = new Map<number, IniciativaRow>();
  upsertCalls = 0;
  upsertBatchSizes: number[] = [];

  async upsert(rows: IniciativaRow[]): Promise<void> {
    this.upsertCalls += 1;
    this.upsertBatchSizes.push(rows.length);
    for (const row of rows) {
      this.rows.set(row.id, row);
    }
  }

  async findMissingIds(ids: number[]): Promise<number[]> {
    return ids.filter((id) => !this.rows.has(id));
  }
}

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

function jsonResponse(body: unknown): Response {
  return { ok: true, status: 200, statusText: 'OK', json: async () => body } as Response;
}

describe('toIniciativaRow', () => {
  it('maps API fields to snake_case DB columns and omits canonical_url/ingested_at', () => {
    const row = toIniciativaRow(sampleIniciativa({ titulo: 'Exemplo' }));

    expect(row).toEqual({
      id: 1,
      legislatura_id: 'XVII',
      numero: '1',
      tipo: 'J',
      tipo_desc: 'Projeto de Lei',
      titulo: 'Exemplo',
      epigrafe: null,
      data_entrada: '2026-01-01',
      data_fim: null,
      estado: 'Entrada',
      link_texto: null,
      openar_updated_at: null,
    });
    expect(row).not.toHaveProperty('canonical_url');
    expect(row).not.toHaveProperty('ingested_at');
  });
});

describe('ingestIniciativas idempotency', () => {
  it('running the job twice does not duplicate rows', async () => {
    const items = [sampleIniciativa({ id: 1 }), sampleIniciativa({ id: 2 })];
    const fetchImpl = async () =>
      jsonResponse({ data: items, total: 2, page: 1, limit: 200 });
    const store = new FakeIniciativasStore();

    const first = await ingestIniciativas(store, { fetchImpl });
    const second = await ingestIniciativas(store, { fetchImpl });

    expect(first.fetched).toBe(2);
    expect(second.fetched).toBe(2);
    expect(store.rows.size).toBe(2);
    expect(store.upsertCalls).toBe(2);
  });

  it('collapses duplicate ids within a single fetch into one stored row', async () => {
    const items = [sampleIniciativa({ id: 1, titulo: 'Primeira' }), sampleIniciativa({ id: 1, titulo: 'Segunda' })];
    const fetchImpl = async () =>
      jsonResponse({ data: items, total: 2, page: 1, limit: 200 });
    const store = new FakeIniciativasStore();

    await ingestIniciativas(store, { fetchImpl });

    expect(store.rows.size).toBe(1);
    expect(store.rows.get(1)?.titulo).toBe('Segunda');
  });

  it('never passes a batch containing a duplicate id to the store (Postgres rejects that outright)', async () => {
    // A real INSERT ... ON CONFLICT DO UPDATE errors with "cannot affect row
    // a second time" if one statement's VALUES contain the same conflict
    // key twice — this reproduces the production bug (2026-07-28), where
    // openAR's offset pagination let the same iniciativa land in one fetch
    // twice. The in-memory store above would silently tolerate that either
    // way, so this asserts on the batch size actually passed to upsert().
    const items = [sampleIniciativa({ id: 1, titulo: 'Primeira' }), sampleIniciativa({ id: 1, titulo: 'Segunda' })];
    const fetchImpl = async () =>
      jsonResponse({ data: items, total: 2, page: 1, limit: 200 });
    const store = new FakeIniciativasStore();

    await ingestIniciativas(store, { fetchImpl });

    expect(store.upsertBatchSizes).toEqual([1]);
  });

  it('updated fields from a later run overwrite the stored row instead of adding a new one', async () => {
    const store = new FakeIniciativasStore();
    const firstFetch = async () =>
      jsonResponse({ data: [sampleIniciativa({ id: 1, estado: 'Entrada' })], total: 1, page: 1, limit: 200 });
    const secondFetch = async () =>
      jsonResponse({ data: [sampleIniciativa({ id: 1, estado: 'Aprovado' })], total: 1, page: 1, limit: 200 });

    await ingestIniciativas(store, { fetchImpl: firstFetch });
    await ingestIniciativas(store, { fetchImpl: secondFetch });

    expect(store.rows.size).toBe(1);
    expect(store.rows.get(1)?.estado).toBe('Aprovado');
  });
});
