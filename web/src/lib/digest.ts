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
}

export interface DigestCard {
  weekStart: string;
  partyLabel: string;
  partyName: string;
  items: DigestItem[];
}

export function rowToDigestItem(row: Record<string, unknown>): DigestItem & {
  weekStart: string;
  partyLabel: string;
  partyName: string;
} {
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
  };
}

// Groups flat public_digest rows into one card per (weekStart, partyLabel),
// most-recent-week-first — "one card per party per week" (backlog 4.1). No
// LLM step here: the card is a deterministic grouping of already-approved,
// already-human-reviewed content, never freshly synthesized prose.
export function groupDigestItems(
  rows: ReturnType<typeof rowToDigestItem>[],
): DigestCard[] {
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
    });
  }

  return [...cards.values()].sort((a, b) => b.weekStart.localeCompare(a.weekStart));
}
