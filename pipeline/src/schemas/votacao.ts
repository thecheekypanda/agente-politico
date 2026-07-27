import { z } from 'zod';

// Mirrors openAR's documented `VotacaoList` schema (api.openar.pt/openapi.json).
//
// `resultado` is deliberately an open string, not the spec's documented enum
// (Aprovado/Rejeitado) — a live sweep of ~2400 votes (2026-07-27) turned up
// `Prejudicado` (procedurally superseded) too. Same lesson as `tipo` in
// schemas/iniciativa.ts: this spec's enums lag reality, so don't hardcode
// them where the source's own value is authoritative.
//
// `id` is unique only per-initiative (confirmed by openAR's own
// /votacoes/{id} docs), so it's kept as-is and the composite key lives in
// the DB layer (votacoes-store.ts), not here.
export const VotacaoSchema = z.object({
  id: z.string(),
  iniciativaId: z.number().int(),
  iniciativaTitulo: z.string(),
  iniciativaNumero: z.string(),
  iniciativaTipo: z.string(),
  legislaturaId: z.string(),
  data: z.string().nullable(),
  resultado: z.string(),
  unanime: z.boolean(),
  reuniao: z.string().nullable(),
  tipoReuniao: z.string().nullable(),
  descricao: z.string().nullable(),
  aFavor: z.array(z.string()),
  contra: z.array(z.string()),
  abstencao: z.array(z.string()),
  ausencias: z.array(z.string()),
  // Present in live responses but not in the published spec — and can be
  // null, not just absent (confirmed against live data 2026-07-27).
  detalhe: z.string().nullable().optional(),
});

export type Votacao = z.infer<typeof VotacaoSchema>;

export const PaginatedVotacoesSchema = z.object({
  data: z.array(VotacaoSchema),
  total: z.number().int(),
  page: z.number().int(),
  limit: z.number().int(),
});

export type PaginatedVotacoes = z.infer<typeof PaginatedVotacoesSchema>;
