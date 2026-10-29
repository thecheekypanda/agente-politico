import type { SupabaseClient } from '@supabase/supabase-js';
import {
  type FetchIniciativaFasesOptions,
  type IniciativaFase,
  fetchIniciativaFases,
} from './parlamento-client.js';
import { sleep } from './sleep.js';

// Mirrors the composite primary key (iniciativa_id, ctl_index) from
// supabase/migrations/20261029020000_iniciativa_fases.sql.
export interface FaseRow {
  iniciativa_id: number;
  ctl_index: number;
  data: string | null;
  evento: string;
  obs: string | null;
  parecer_nao_emitido_data: string | null;
  parecer_nao_emitido_motivo: string | null;
}

export function toFaseRow(iniciativaId: number, fase: IniciativaFase): FaseRow {
  return {
    iniciativa_id: iniciativaId,
    ctl_index: fase.ctlIndex,
    data: fase.data,
    evento: fase.evento,
    obs: fase.obs,
    parecer_nao_emitido_data: fase.parecerNaoEmitidoData,
    parecer_nao_emitido_motivo: fase.parecerNaoEmitidoMotivo,
  };
}

export interface FasesStore {
  /**
   * Active iniciativas (data_fim is null) that already have a resolved
   * canonical_url — scraping needs the real BID, which only exists once
   * resolve-canonical-urls.ts has confirmed it. Concluded iniciativas
   * (data_fim set) are excluded so this stops re-scraping a page once its
   * procedural timeline can no longer change.
   */
  findActiveIds(): Promise<number[]>;
  replacePhases(iniciativaId: number, rows: FaseRow[]): Promise<void>;
}

const SELECT_LIMIT = 2000;

export class SupabaseFasesStore implements FasesStore {
  constructor(private readonly client: SupabaseClient) {}

  async findActiveIds(): Promise<number[]> {
    const { data, error } = await this.client
      .from('iniciativas')
      .select('id')
      .is('data_fim', null)
      .not('canonical_url', 'is', null)
      .limit(SELECT_LIMIT);
    if (error) {
      throw new Error(`Failed to read active iniciativas for fases scraping: ${error.message}`);
    }
    return (data ?? []).map((row) => row.id as number);
  }

  // Delete-then-insert rather than upsert: a page's rptFases indices are
  // positional, not stable ids, so replacing the whole set per iniciativa
  // keeps stored rows exactly in sync with what the page shows right now
  // rather than letting a stale ctl_index from a prior (possibly buggy)
  // scrape linger forever.
  async replacePhases(iniciativaId: number, rows: FaseRow[]): Promise<void> {
    const { error: deleteError } = await this.client
      .from('iniciativa_fases')
      .delete()
      .eq('iniciativa_id', iniciativaId);
    if (deleteError) {
      throw new Error(
        `Failed to clear old fases for iniciativa ${iniciativaId}: ${deleteError.message}`,
      );
    }
    if (rows.length === 0) {
      return;
    }
    const { error: insertError } = await this.client.from('iniciativa_fases').insert(rows);
    if (insertError) {
      throw new Error(
        `Failed to insert fases for iniciativa ${iniciativaId}: ${insertError.message}`,
      );
    }
  }
}

export interface IngestFasesOptions extends FetchIniciativaFasesOptions {
  /** Delay between requests, in ms — a courtesy to parlamento.pt's server. */
  delayMs?: number;
}

export interface IngestFasesResult {
  attempted: number;
  succeeded: number;
  failed: number;
}

export async function ingestFases(
  store: FasesStore,
  options: IngestFasesOptions = {},
): Promise<IngestFasesResult> {
  const { fetchImpl, delayMs = 0 } = options;
  const activeIds = await store.findActiveIds();

  let succeeded = 0;
  let failed = 0;
  for (const id of activeIds) {
    // A structural-mismatch error from fetchIniciativaFases (zero phases
    // parsed from a 200 OK page) is deliberately NOT caught here — it
    // propagates and aborts this whole run, matching CLAUDE.md's
    // halt-on-mismatch policy for scrapers rather than quietly counting
    // one more "failed" and moving on. Only transient failures (network
    // error, non-200 — returned as null) are tallied below and retried
    // automatically next run.
    const fases = await fetchIniciativaFases(id, { fetchImpl });
    if (fases === null) {
      failed += 1;
    } else {
      await store.replacePhases(
        id,
        fases.map((fase) => toFaseRow(id, fase)),
      );
      succeeded += 1;
    }
    if (delayMs > 0) {
      await sleep(delayMs);
    }
  }

  // Same canary as resolveCanonicalUrls: an occasional transient failure is
  // expected, but if *none* of a non-empty batch succeeded, that's much
  // more likely parlamento.pt being down than every single page failing
  // independently — halt loudly instead of quietly scraping nothing.
  if (activeIds.length > 0 && succeeded === 0) {
    throw new Error(
      `Failed to scrape procedural phases for any of ${activeIds.length} active iniciativas — ` +
        'parlamento.pt may be unreachable.',
    );
  }

  return { attempted: activeIds.length, succeeded, failed };
}
