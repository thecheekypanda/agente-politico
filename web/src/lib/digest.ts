import { type VerdictLabel } from './review';

export interface DigestItem {
  verdictId: number;
  iniciativaId: number;
  titulo: string;
  tipoDesc: string;
  canonicalUrl: string | null;
  partyLabel: string;
  partyName: string;
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

export type DigestRow = DigestItem & {
  weekStart: string;
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

export interface InitiativeDigestCard {
  iniciativaId: number;
  titulo: string;
  tipoDesc: string;
  canonicalUrl: string | null;
  numero: string;
  dataEntrada: string | null;
  weekStart: string;
  // One entry per party whose verdict for this initiative has been
  // approved so far — an initiative with only some parties reviewed shows
  // only those; nothing here was ever published without its own human
  // sign-off (CLAUDE.md's no-auto-publish rule).
  verdicts: DigestItem[];
}

export interface WeekSection {
  weekStart: string;
  initiatives: InitiativeDigestCard[];
}

// Groups flat public_digest rows into one card per initiative, so an
// initiative with several parties' verdicts approved appears once — not
// once per party — with every party's alignment verdict for it together.
// No LLM step here: purely a deterministic grouping of already-approved,
// already-human-reviewed content.
export function groupDigestRowsByInitiative(rows: DigestRow[]): InitiativeDigestCard[] {
  const cards = new Map<number, InitiativeDigestCard>();

  for (const row of rows) {
    let card = cards.get(row.iniciativaId);
    if (!card) {
      card = {
        iniciativaId: row.iniciativaId,
        titulo: row.titulo,
        tipoDesc: row.tipoDesc,
        canonicalUrl: row.canonicalUrl,
        numero: row.numero,
        dataEntrada: row.dataEntrada,
        weekStart: row.weekStart,
        verdicts: [],
      };
      cards.set(row.iniciativaId, card);
    }
    card.verdicts.push(row);
  }

  return [...cards.values()];
}

// Groups initiative cards into weeks, most-recent-week-first and
// most-recently-filed-initiative-first within a week.
export function groupInitiativeCardsByWeek(cards: InitiativeDigestCard[]): WeekSection[] {
  const sections = new Map<string, WeekSection>();

  for (const card of cards) {
    let section = sections.get(card.weekStart);
    if (!section) {
      section = { weekStart: card.weekStart, initiatives: [] };
      sections.set(card.weekStart, section);
    }
    section.initiatives.push(card);
  }

  const result = [...sections.values()];
  for (const section of result) {
    section.initiatives.sort((a, b) => (b.dataEntrada ?? '').localeCompare(a.dataEntrada ?? ''));
  }
  return result.sort((a, b) => b.weekStart.localeCompare(a.weekStart));
}
