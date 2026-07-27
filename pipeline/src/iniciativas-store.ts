import type { SupabaseClient } from '@supabase/supabase-js';
import type { Iniciativa } from './schemas/iniciativa.js';
import { type FetchIniciativasOptions, fetchAllIniciativas } from './openar-client.js';

// Column set intentionally excludes `canonical_url` (filled by backlog 1.3)
// and `ingested_at` (DB default, first-insert-only) — Supabase's upsert only
// touches columns present in the row object, so omitting them here means
// re-running this job never clobbers what those other steps write.
export interface IniciativaRow {
  id: number;
  legislatura_id: string;
  numero: string;
  tipo: string;
  tipo_desc: string;
  titulo: string;
  epigrafe: string | null;
  data_entrada: string | null;
  data_fim: string | null;
  estado: string | null;
  link_texto: string | null;
  openar_updated_at: string | null;
}

export function toIniciativaRow(iniciativa: Iniciativa): IniciativaRow {
  return {
    id: iniciativa.id,
    legislatura_id: iniciativa.legislaturaId,
    numero: iniciativa.numero,
    tipo: iniciativa.tipo,
    tipo_desc: iniciativa.tipoDesc,
    titulo: iniciativa.titulo,
    epigrafe: iniciativa.epigrafe,
    data_entrada: iniciativa.dataEntrada,
    data_fim: iniciativa.dataFim,
    estado: iniciativa.estado,
    link_texto: iniciativa.linkTexto,
    openar_updated_at: iniciativa.updatedAt ?? null,
  };
}

export interface IniciativasStore {
  upsert(rows: IniciativaRow[]): Promise<void>;
}

const UPSERT_BATCH_SIZE = 500;

export class SupabaseIniciativasStore implements IniciativasStore {
  constructor(private readonly client: SupabaseClient) {}

  async upsert(rows: IniciativaRow[]): Promise<void> {
    for (let i = 0; i < rows.length; i += UPSERT_BATCH_SIZE) {
      const batch = rows.slice(i, i + UPSERT_BATCH_SIZE);
      const { error } = await this.client.from('iniciativas').upsert(batch, { onConflict: 'id' });
      if (error) {
        throw new Error(`Failed to upsert iniciativas (batch starting at ${i}): ${error.message}`);
      }
    }
  }
}

export interface IngestResult {
  fetched: number;
}

export async function ingestIniciativas(
  store: IniciativasStore,
  options: FetchIniciativasOptions = {},
): Promise<IngestResult> {
  const iniciativas = await fetchAllIniciativas(options);
  await store.upsert(iniciativas.map(toIniciativaRow));
  return { fetched: iniciativas.length };
}
