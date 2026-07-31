// Mirrors pipeline/src/verdict-labels.ts — kept as a separate copy here
// deliberately (the web app has no dependency on the pipeline package);
// keep the two lists in sync if the taxonomy ever changes.
export const VERDICT_LABELS = ['aligned', 'partially_aligned', 'contradicts', 'not_addressed'] as const;
export type VerdictLabel = (typeof VERDICT_LABELS)[number];

export type ReviewDecision = 'approved' | 'rejected';

export interface PendingVerdict {
  verdictId: number;
  iniciativaId: number;
  titulo: string;
  tipoDesc: string;
  epigrafe: string | null;
  canonicalUrl: string | null;
  partyLabel: string;
  partyName: string;
  programSourceUrl: string;
  topic: string;
  draftLabel: VerdictLabel;
  citationPageNumber: number | null;
  quotedPassage: string | null;
  rationale: string | null;
  draftedAt: string;
}

export interface ReviewInsert {
  verdict_id: number;
  decision: ReviewDecision;
  final_label: VerdictLabel | null;
  notes: string | null;
}

// Same rule the DB CHECK constraint in
// supabase/migrations/20260801000000_verdict_reviews.sql enforces —
// checked here too so a malformed submission is caught with a clear
// message before it ever reaches the network, not just as an opaque
// Postgres error.
export function buildReviewInsert(
  verdictId: number,
  decision: ReviewDecision,
  finalLabel: VerdictLabel | null,
  notes: string,
): ReviewInsert {
  if (decision === 'approved' && finalLabel === null) {
    throw new Error('An approval must include a final label.');
  }
  if (decision === 'rejected' && finalLabel !== null) {
    throw new Error('A rejection must not include a final label.');
  }

  const trimmedNotes = notes.trim();
  return {
    verdict_id: verdictId,
    decision,
    final_label: decision === 'approved' ? finalLabel : null,
    notes: trimmedNotes === '' ? null : trimmedNotes,
  };
}

export function rowToPendingVerdict(row: Record<string, unknown>): PendingVerdict {
  return {
    verdictId: row.verdict_id as number,
    iniciativaId: row.iniciativa_id as number,
    titulo: row.titulo as string,
    tipoDesc: row.tipo_desc as string,
    epigrafe: (row.epigrafe as string | null) ?? null,
    canonicalUrl: (row.canonical_url as string | null) ?? null,
    partyLabel: row.party_label as string,
    partyName: row.party_name as string,
    programSourceUrl: row.program_source_url as string,
    topic: row.topic as string,
    draftLabel: row.draft_label as VerdictLabel,
    citationPageNumber: (row.citation_page_number as number | null) ?? null,
    quotedPassage: (row.quoted_passage as string | null) ?? null,
    rationale: (row.rationale as string | null) ?? null,
    draftedAt: row.drafted_at as string,
  };
}
