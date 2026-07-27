import { z } from 'zod';

// Mirrors openAR's documented `Iniciativa` schema (api.openar.pt/openapi.json).
// Validation failures here are what trigger the outage/schema-change alert
// path (backlog 1.4) — never widen a field to `.any()` to make an error go
// away without confirming the upstream shape actually changed on purpose.
//
// `tipo` is deliberately an open string, not the enum the spec documents
// (R/P/J/D/S/A/I/C). A full sweep of live data (2026-07-27) turned up G/U/F
// too, and several of the spec's own code->description mappings are wrong
// for what's actually in production (e.g. `I` is documented as "Iniciativa
// Europeia" but real records use it for "Inquérito Parlamentar"). `tipoDesc`
// is the authoritative human-readable label straight from the source for
// every record — hardcoding our own code->meaning table here would risk
// silently mislabeling initiatives, which is the one thing this project
// cannot do.
export const IniciativaSchema = z.object({
  id: z.number().int(),
  legislaturaId: z.string(),
  numero: z.string(),
  tipo: z.string(),
  tipoDesc: z.string(),
  titulo: z.string(),
  epigrafe: z.string().nullable(),
  dataEntrada: z.string().nullable(),
  dataFim: z.string().nullable(),
  estado: z.string().nullable(),
  linkTexto: z.string().nullable(),
  // Present in live responses but not in the published spec — kept optional
  // so its disappearance alone doesn't count as a breaking schema change.
  updatedAt: z.string().optional(),
});

export type Iniciativa = z.infer<typeof IniciativaSchema>;

export const PaginatedIniciativasSchema = z.object({
  data: z.array(IniciativaSchema),
  total: z.number().int(),
  page: z.number().int(),
  limit: z.number().int(),
});

export type PaginatedIniciativas = z.infer<typeof PaginatedIniciativasSchema>;
