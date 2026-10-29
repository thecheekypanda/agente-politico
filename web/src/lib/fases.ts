// Procedural timeline per iniciativa, scraped from parlamento.pt's own
// DetalheIniciativa page (pipeline/src/parlamento-client.ts,
// fetchIniciativaFases) and stored in iniciativa_fases
// (supabase/migrations/20261029020000_iniciativa_fases.sql).
export interface FaseRow {
  ctl_index: number;
  data: string | null;
  evento: string;
  obs: string | null;
  parecer_nao_emitido_data: string | null;
  parecer_nao_emitido_motivo: string | null;
}

export function rowToFase(row: Record<string, unknown>): FaseRow {
  return {
    ctl_index: row.ctl_index as number,
    data: (row.data as string | null) ?? null,
    evento: row.evento as string,
    obs: (row.obs as string | null) ?? null,
    parecer_nao_emitido_data: (row.parecer_nao_emitido_data as string | null) ?? null,
    parecer_nao_emitido_motivo: (row.parecer_nao_emitido_motivo as string | null) ?? null,
  };
}
