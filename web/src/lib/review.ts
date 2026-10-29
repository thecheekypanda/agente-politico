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
  numero: string;
  dataEntrada: string | null;
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
    numero: row.numero as string,
    dataEntrada: (row.data_entrada as string | null) ?? null,
  };
}

export interface InitiativeGroup {
  iniciativaId: number;
  titulo: string;
  tipoDesc: string;
  epigrafe: string | null;
  canonicalUrl: string | null;
  numero: string;
  dataEntrada: string | null;
  pendingByParty: PendingVerdict[];
}

// One group per iniciativa_id, preserving the input rows' relative order
// within each group. Pure grouping only — no sorting here, see
// sortInitiativeGroups.
export function groupPendingVerdictsByInitiative(rows: PendingVerdict[]): InitiativeGroup[] {
  const groups = new Map<number, InitiativeGroup>();

  for (const row of rows) {
    let group = groups.get(row.iniciativaId);
    if (!group) {
      group = {
        iniciativaId: row.iniciativaId,
        titulo: row.titulo,
        tipoDesc: row.tipoDesc,
        epigrafe: row.epigrafe,
        canonicalUrl: row.canonicalUrl,
        numero: row.numero,
        dataEntrada: row.dataEntrada,
        pendingByParty: [],
      };
      groups.set(row.iniciativaId, group);
    }
    group.pendingByParty.push(row);
  }

  return [...groups.values()];
}

export type SortDirection = 'asc' | 'desc';

export interface SortOptions {
  direction: SortDirection;
  pinCurrentYear: boolean;
}

// Pure and deterministic: the caller passes referenceYear explicitly
// (e.g. new Date().getFullYear()) rather than this function reading the
// clock itself, so "current year" behavior stays testable without faking
// time. A null dataEntrada always sorts last, in either direction, and is
// never treated as the current year. Lexical comparison on the
// ISO-formatted dataEntrada string is sufficient, same trick
// digest.ts's groupDigestItems already uses for weekStart.
export function sortInitiativeGroups(
  groups: InitiativeGroup[],
  options: SortOptions,
  referenceYear: number,
): InitiativeGroup[] {
  const { direction, pinCurrentYear } = options;
  const sign = direction === 'desc' ? -1 : 1;

  const byDate = (a: InitiativeGroup, b: InitiativeGroup): number => {
    if (a.dataEntrada === null && b.dataEntrada === null) return 0;
    if (a.dataEntrada === null) return 1;
    if (b.dataEntrada === null) return -1;
    return sign * a.dataEntrada.localeCompare(b.dataEntrada);
  };

  if (!pinCurrentYear) {
    return [...groups].sort(byDate);
  }

  const isCurrentYear = (group: InitiativeGroup) =>
    group.dataEntrada !== null && group.dataEntrada.startsWith(String(referenceYear));

  const currentYear = groups.filter(isCurrentYear).sort(byDate);
  const rest = groups.filter((group) => !isCurrentYear(group)).sort(byDate);
  return [...currentYear, ...rest];
}

// Each pending row already carries its own draftLabel, which becomes the
// approved final_label for the bulk action — there's no per-party override
// UI in bulk mode; a reviewer wanting to change one party's label
// individually uses that party's own row/select instead. Reuses
// buildReviewInsert so its validation isn't duplicated.
export function buildBulkApproveInserts(pendingByParty: PendingVerdict[], notes = ''): ReviewInsert[] {
  return pendingByParty.map((row) => buildReviewInsert(row.verdictId, 'approved', row.draftLabel, notes));
}
