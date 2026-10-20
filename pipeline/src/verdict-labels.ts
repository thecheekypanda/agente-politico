// The fixed, closed verdict taxonomy for backlog 3.3. Single source of
// truth — both the LLM's JSON schema constraint (verdict-prompt.ts) and the
// DB CHECK constraint (supabase/migrations/20260731000000_verdicts.sql)
// derive from this list.
//
// `not_addressed` is deliberately excluded from what the LLM may output —
// it's decided upstream, deterministically, by getProgramPosition
// (program-retrieval.ts, backlog 2.2) before the LLM is ever called. The
// LLM only ever sees the addressed case and only ever picks among the
// other three.
export const VERDICT_LABELS = ['aligned', 'partially_aligned', 'contradicts', 'not_addressed'] as const;

export type VerdictLabel = (typeof VERDICT_LABELS)[number];

export const ADDRESSED_VERDICT_LABELS = VERDICT_LABELS.filter(
  (label): label is Exclude<VerdictLabel, 'not_addressed'> => label !== 'not_addressed',
);

export type AddressedVerdictLabel = (typeof ADDRESSED_VERDICT_LABELS)[number];

export function isVerdictLabel(value: string): value is VerdictLabel {
  return (VERDICT_LABELS as readonly string[]).includes(value);
}

export function isAddressedVerdictLabel(value: string): value is AddressedVerdictLabel {
  return (ADDRESSED_VERDICT_LABELS as readonly string[]).includes(value);
}
