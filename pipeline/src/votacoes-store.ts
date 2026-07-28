import type { SupabaseClient } from '@supabase/supabase-js';
import type { Votacao } from './schemas/votacao.js';
import { dedupeByKey } from './dedupe-by-key.js';
import { type FetchVotacoesOptions, fetchAllVotacoes } from './openar-client.js';

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

export async function ingestVotacoes(
  store: VotacoesStore,
  options: FetchVotacoesOptions = {},
): Promise<IngestVotacoesResult> {
  const votacoes = await fetchAllVotacoes(options);
  const deduped = dedupeByKey(votacoes, (v) => `${v.iniciativaId}:${v.id}`);
  await store.upsert(deduped.map(toVotacaoRow));
  return { fetched: votacoes.length };
}
