import { describe, expect, it } from 'vitest';
import type { IniciativaFase } from '../src/parlamento-client.js';
import { type FaseRow, type FasesStore, ingestFases, toFaseRow } from '../src/fases-store.js';

// Mirrors the composite primary key (iniciativa_id, ctl_index) from
// supabase/migrations/20261029020000_iniciativa_fases.sql.
class FakeFasesStore implements FasesStore {
  rows = new Map<string, FaseRow[]>();
  activeIds: number[];
  replaceCalls: number[] = [];

  constructor(activeIds: number[]) {
    this.activeIds = activeIds;
  }

  async findActiveIds(): Promise<number[]> {
    return this.activeIds;
  }

  async replacePhases(iniciativaId: number, rows: FaseRow[]): Promise<void> {
    this.replaceCalls.push(iniciativaId);
    this.rows.set(String(iniciativaId), rows);
  }
}

function sampleFase(overrides: Partial<IniciativaFase> = {}): IniciativaFase {
  return {
    ctlIndex: 0,
    data: '2026-03-31',
    evento: 'Entrada',
    obs: null,
    parecerNaoEmitidoData: null,
    parecerNaoEmitidoMotivo: null,
    ...overrides,
  };
}

function htmlResponse(html: string): Response {
  return { ok: true, status: 200, text: async () => html } as Response;
}

const prefix = 'ctl00_ctl51_g_951a642c_ced8_43d8_af6a_57edb1db8006_ctl00';

function pageFor(phases: { ctl: string; data: string; evento: string }[]): string {
  return (
    '<html><body>' +
    phases
      .map(
        (p) =>
          `<span id="${prefix}_rptFases_${p.ctl}_lblData" class="TextoRegular">${p.data}</span>` +
          `<span id="${prefix}_rptFases_${p.ctl}_lblEvento" class="TextoRegular-Titulo">${p.evento}</span>`,
      )
      .join('') +
    '</body></html>'
  );
}

describe('toFaseRow', () => {
  it('maps API fields to snake_case DB columns, attaching the iniciativa id', () => {
    const row = toFaseRow(
      356479,
      sampleFase({ ctlIndex: 1, parecerNaoEmitidoData: '2026-01-07', parecerNaoEmitidoMotivo: 'por arrastamento' }),
    );

    expect(row).toEqual({
      iniciativa_id: 356479,
      ctl_index: 1,
      data: '2026-03-31',
      evento: 'Entrada',
      obs: null,
      parecer_nao_emitido_data: '2026-01-07',
      parecer_nao_emitido_motivo: 'por arrastamento',
    });
  });
});

describe('ingestFases', () => {
  it('scrapes every active iniciativa and replaces its phases', async () => {
    const fetchImpl = async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('BID=100')) {
        return htmlResponse(pageFor([{ ctl: 'ctl00', data: '2026-01-01', evento: 'Entrada' }]));
      }
      return htmlResponse(pageFor([{ ctl: 'ctl00', data: '2026-02-01', evento: 'Entrada' }]));
    };
    const store = new FakeFasesStore([100, 200]);

    const result = await ingestFases(store, { fetchImpl });

    expect(result).toEqual({ attempted: 2, succeeded: 2, failed: 0 });
    expect(store.rows.get('100')?.[0].data).toBe('2026-01-01');
    expect(store.rows.get('200')?.[0].data).toBe('2026-02-01');
  });

  it('tallies a transient failure without aborting the rest of the batch', async () => {
    const fetchImpl = async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('BID=100')) {
        return { ok: false, status: 503, text: async () => '' } as Response;
      }
      return htmlResponse(pageFor([{ ctl: 'ctl00', data: '2026-02-01', evento: 'Entrada' }]));
    };
    const store = new FakeFasesStore([100, 200]);

    const result = await ingestFases(store, { fetchImpl });

    expect(result).toEqual({ attempted: 2, succeeded: 1, failed: 1 });
    expect(store.replaceCalls).toEqual([200]);
  });

  it('does nothing when there are no active iniciativas', async () => {
    const store = new FakeFasesStore([]);

    const result = await ingestFases(store, { fetchImpl: async () => htmlResponse(pageFor([])) });

    expect(result).toEqual({ attempted: 0, succeeded: 0, failed: 0 });
    expect(store.replaceCalls).toEqual([]);
  });

  it('halts instead of silently storing nothing when every active iniciativa fails', async () => {
    const fetchImpl = async () => ({ ok: false, status: 500, text: async () => '' }) as Response;
    const store = new FakeFasesStore([100, 200]);

    await expect(ingestFases(store, { fetchImpl })).rejects.toThrow(/may be unreachable/);
  });

  it('running the job twice does not duplicate phases — replacePhases overwrites per iniciativa', async () => {
    const firstFetch = async () =>
      htmlResponse(pageFor([{ ctl: 'ctl00', data: '2026-01-01', evento: 'Entrada' }]));
    const secondFetch = async () =>
      htmlResponse(
        pageFor([
          { ctl: 'ctl00', data: '2026-01-01', evento: 'Entrada' },
          { ctl: 'ctl01', data: '2026-01-15', evento: 'Admissão' },
        ]),
      );
    const store = new FakeFasesStore([100]);

    await ingestFases(store, { fetchImpl: firstFetch });
    await ingestFases(store, { fetchImpl: secondFetch });

    expect(store.rows.get('100')).toHaveLength(2);
    expect(store.replaceCalls).toEqual([100, 100]);
  });
});
