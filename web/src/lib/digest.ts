import { type VerdictLabel } from './review';

export interface DigestItem {
  verdictId: number;
  iniciativaId: number;
  titulo: string;
  tipoDesc: string;
  canonicalUrl: string | null;
  topic: string;
  label: VerdictLabel;
  reviewedAt: string;
  numero: string;
  dataEntrada: string | null;
  citationPageNumber: number | null;
  quotedPassage: string | null;
  rationale: string | null;
  programSourceUrl: string;
  // AR parliamentary-group siglas this item's party maps to — usually one,
  // but AD is ['PSD', 'CDS-PP']. The vote-result UI must check each sigla
  // separately (web/src/lib/votes.ts), never merge them into one position.
  arSiglas: string[];
}

export interface DigestCard {
  weekStart: string;
  partyLabel: string;
  partyName: string;
  items: DigestItem[];
}

export type DigestRow = DigestItem & {
  weekStart: string;
  partyLabel: string;
  partyName: string;
};

export function rowToDigestItem(row: Record<string, unknown>): DigestRow {
  return {
    verdictId: row.verdict_id as number,
    iniciativaId: row.iniciativa_id as number,
    titulo: row.titulo as string,
    tipoDesc: row.tipo_desc as string,
    canonicalUrl: (row.canonical_url as string | null) ?? null,
    partyLabel: row.party_label as string,
    partyName: row.party_name as string,
    topic: row.topic as string,
    label: row.label as VerdictLabel,
    weekStart: row.week_start as string,
    reviewedAt: row.reviewed_at as string,
    numero: row.numero as string,
    dataEntrada: (row.data_entrada as string | null) ?? null,
    citationPageNumber: (row.citation_page_number as number | null) ?? null,
    quotedPassage: (row.quoted_passage as string | null) ?? null,
    rationale: (row.rationale as string | null) ?? null,
    programSourceUrl: row.program_source_url as string,
    arSiglas: (row.ar_siglas as string[]) ?? [],
  };
}

export interface DigestFilters {
  // undefined or empty = no party filter (show every party).
  partyLabels?: Set<string>;
  fromWeek?: string; // inclusive, 'YYYY-MM-DD'
  toWeek?: string; // inclusive, 'YYYY-MM-DD'
}

// Filters the flat rows fetched from public_digest, before grouping —
// backlog 4.3. Purely client-side over data already fetched once; no
// refetch, no new Supabase query params. Lexical comparison on the
// ISO-formatted weekStart string is sufficient for the range check, same
// as groupDigestItems' own sort below.
export function filterDigestRows(rows: DigestRow[], filters: DigestFilters = {}): DigestRow[] {
  const { partyLabels, fromWeek, toWeek } = filters;
  return rows.filter((row) => {
    if (partyLabels && partyLabels.size > 0 && !partyLabels.has(row.partyLabel)) {
      return false;
    }
    if (fromWeek && row.weekStart < fromWeek) {
      return false;
    }
    if (toWeek && row.weekStart > toWeek) {
      return false;
    }
    return true;
  });
}

// Groups flat public_digest rows into one card per (weekStart, partyLabel),
// most-recent-week-first — "one card per party per week" (backlog 4.1). No
// LLM step here: the card is a deterministic grouping of already-approved,
// already-human-reviewed content, never freshly synthesized prose.
export function groupDigestItems(rows: DigestRow[]): DigestCard[] {
  const cards = new Map<string, DigestCard>();

  for (const row of rows) {
    const key = `${row.weekStart}:${row.partyLabel}`;
    let card = cards.get(key);
    if (!card) {
      card = { weekStart: row.weekStart, partyLabel: row.partyLabel, partyName: row.partyName, items: [] };
      cards.set(key, card);
    }
    card.items.push({
      verdictId: row.verdictId,
      iniciativaId: row.iniciativaId,
      titulo: row.titulo,
      tipoDesc: row.tipoDesc,
      canonicalUrl: row.canonicalUrl,
      topic: row.topic,
      label: row.label,
      reviewedAt: row.reviewedAt,
      numero: row.numero,
      dataEntrada: row.dataEntrada,
      citationPageNumber: row.citationPageNumber,
      quotedPassage: row.quotedPassage,
      rationale: row.rationale,
      programSourceUrl: row.programSourceUrl,
      arSiglas: row.arSiglas,
    });
  }

  return [...cards.values()].sort((a, b) => b.weekStart.localeCompare(a.weekStart));
}
