import type { SupabaseClient } from '@supabase/supabase-js';
import type { Iniciativa } from './schemas/iniciativa.js';
import type { Votacao } from './schemas/votacao.js';
import { dedupeByKey } from './dedupe-by-key.js';
import { type IniciativasStore, toIniciativaRow } from './iniciativas-store.js';
import { type FetchVotacoesOptions, fetchAllVotacoes, fetchIniciativaById } from './openar-client.js';

// `votacao_id` alone is not unique (openAR's own docs: unique per-initiative
// only) — the real key is the (iniciativa_id, votacao_id) pair, matching the
// composite primary key in supabase/migrations/20260727010000_votacoes.sql.
// iniciativaTitulo/Numero/Tipo/legislaturaId are dropped here since they're
// already stored on the `iniciativas` row for the same iniciativa_id.
export interface VotacaoRow {
  iniciativa_id: number;
  votacao_id: string;
  legislatura_id: string;
  data: string | null;
  resultado: string;
  unanime: boolean;
  reuniao: string | null;
  tipo_reuniao: string | null;
  descricao: string | null;
  a_favor: string[];
  contra: string[];
  abstencao: string[];
  ausencias: string[];
}

export function toVotacaoRow(votacao: Votacao): VotacaoRow {
  return {
    iniciativa_id: votacao.iniciativaId,
    votacao_id: votacao.id,
    legislatura_id: votacao.legislaturaId,
    data: votacao.data,
    resultado: votacao.resultado,
    unanime: votacao.unanime,
    reuniao: votacao.reuniao,
    tipo_reuniao: votacao.tipoReuniao,
    descricao: votacao.descricao,
    a_favor: votacao.aFavor,
    contra: votacao.contra,
    abstencao: votacao.abstencao,
    ausencias: votacao.ausencias,
  };
}

export interface VotacoesStore {
  upsert(rows: VotacaoRow[]): Promise<void>;
}

const UPSERT_BATCH_SIZE = 500;

export class SupabaseVotacoesStore implements VotacoesStore {
  constructor(private readonly client: SupabaseClient) {}

  async upsert(rows: VotacaoRow[]): Promise<void> {
    for (let i = 0; i < rows.length; i += UPSERT_BATCH_SIZE) {
      const batch = rows.slice(i, i + UPSERT_BATCH_SIZE);
      const { error } = await this.client
        .from('votacoes')
        .upsert(batch, { onConflict: 'iniciativa_id,votacao_id' });
      if (error) {
        throw new Error(`Failed to upsert votacoes (batch starting at ${i}): ${error.message}`);
      }
    }
  }
}

export interface IngestVotacoesResult {
  fetched: number;
}

// Courtesy delay between individual backfill lookups — a burst of dozens of
// single-record requests right after a full paginated fetch risks tripping
// openAR's rate limit.
const BACKFILL_DELAY_MS = 150;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// votacoes.iniciativa_id has an FK to iniciativas(id). Even with
// fetchAllIniciativas/fetchAllVotacoes both paginating oldest-first now
// (openar-client.ts), a votacao fetched moments after iniciativas can still
// reference something filed in the gap between the two steps — an
// unavoidable race against an actively updating legislature, not a
// pagination bug. Rather than let that FK violation abort the whole batch
// (observed in production, 2026-07-28), fetch and upsert exactly the
// missing iniciativas first. A referenced id that genuinely 404s (rare —
// none observed so far) is logged and its votes are skipped this run rather
// than fabricated or allowed to crash everything else; it'll be retried
// automatically next run since it stays unresolved either way.
async function backfillMissingIniciativas(
  iniciativasStore: IniciativasStore,
  referencedIds: number[],
  fetchImpl?: typeof fetch,
): Promise<Set<number>> {
  const missingIds = await iniciativasStore.findMissingIds(referencedIds);
  if (missingIds.length === 0) {
    return new Set();
  }

  const backfilled: Iniciativa[] = [];
  const unresolvable = new Set<number>();
  for (const id of missingIds) {
    const iniciativa = await fetchIniciativaById(id, { fetchImpl });
    if (iniciativa) {
      backfilled.push(iniciativa);
    } else {
      console.warn(
        `votacoes reference iniciativa ${id}, but openAR has no record of it (404) — skipping its votes this run.`,
      );
      unresolvable.add(id);
    }
    await sleep(BACKFILL_DELAY_MS);
  }

  if (backfilled.length > 0) {
    await iniciativasStore.upsert(backfilled.map(toIniciativaRow));
  }
  return unresolvable;
}

export async function ingestVotacoes(
  votacoesStore: VotacoesStore,
  iniciativasStore: IniciativasStore,
  options: FetchVotacoesOptions = {},
): Promise<IngestVotacoesResult> {
  const votacoes = await fetchAllVotacoes(options);
  const deduped = dedupeByKey(votacoes, (v) => `${v.iniciativaId}:${v.id}`);

  const referencedIds = [...new Set(deduped.map((v) => v.iniciativaId))];
  const unresolvable = await backfillMissingIniciativas(
    iniciativasStore,
    referencedIds,
    options.fetchImpl,
  );

  const ingestable =
    unresolvable.size > 0 ? deduped.filter((v) => !unresolvable.has(v.iniciativaId)) : deduped;
  await votacoesStore.upsert(ingestable.map(toVotacaoRow));
  return { fetched: votacoes.length };
}
