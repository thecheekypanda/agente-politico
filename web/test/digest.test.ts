import { describe, expect, it } from 'vitest';
import { groupDigestItems, rowToDigestItem } from '../src/lib/digest';

function row(overrides: Partial<Record<string, unknown>> = {}): Record<string, unknown> {
  return {
    verdict_id: 1,
    iniciativa_id: 10,
    titulo: 'Título',
    tipo_desc: 'Projeto de Lei',
    canonical_url: 'https://parlamento.pt/x',
    party_label: 'PS',
    party_name: 'Partido Socialista',
    topic: 'Habitação',
    label: 'aligned',
    week_start: '2026-07-27',
    reviewed_at: '2026-07-28T00:00:00Z',
    numero: '123/XVII',
    data_entrada: '2026-07-27',
    citation_page_number: 5,
    quoted_passage: 'Passagem do programa',
    rationale: 'Justificação',
    program_source_url: 'https://ps.pt/programa.pdf',
    ar_siglas: ['PS'],
    ...overrides,
  };
}

describe('rowToDigestItem', () => {
  it('maps a snake_case DB row to the camelCase shape the UI uses', () => {
    const mapped = rowToDigestItem(row());

    expect(mapped).toEqual({
      verdictId: 1,
      iniciativaId: 10,
      titulo: 'Título',
      tipoDesc: 'Projeto de Lei',
      canonicalUrl: 'https://parlamento.pt/x',
      partyLabel: 'PS',
      partyName: 'Partido Socialista',
      topic: 'Habitação',
      label: 'aligned',
      weekStart: '2026-07-27',
      reviewedAt: '2026-07-28T00:00:00Z',
      numero: '123/XVII',
      dataEntrada: '2026-07-27',
      citationPageNumber: 5,
      quotedPassage: 'Passagem do programa',
      rationale: 'Justificação',
      programSourceUrl: 'https://ps.pt/programa.pdf',
      arSiglas: ['PS'],
    });
  });

  it('carries a coalition party\'s multiple AR siglas through unchanged — never merges them', () => {
    const mapped = rowToDigestItem(row({ party_label: 'AD', ar_siglas: ['PSD', 'CDS-PP'] }));

    expect(mapped.arSiglas).toEqual(['PSD', 'CDS-PP']);
  });
});

describe('groupDigestItems', () => {
  it('groups items for the same week and party into one card', () => {
    const rows = [row({ verdict_id: 1 }), row({ verdict_id: 2 })].map(rowToDigestItem);

    const cards = groupDigestItems(rows);

    expect(cards).toHaveLength(1);
    expect(cards[0].items).toHaveLength(2);
    expect(cards[0].items.map((i) => i.verdictId)).toEqual([1, 2]);
  });

  it('splits items into separate cards by week and by party', () => {
    const rows = [
      row({ verdict_id: 1, week_start: '2026-07-27', party_label: 'PS' }),
      row({ verdict_id: 2, week_start: '2026-07-27', party_label: 'CH' }),
      row({ verdict_id: 3, week_start: '2026-08-03', party_label: 'PS' }),
    ].map(rowToDigestItem);

    const cards = groupDigestItems(rows);

    expect(cards).toHaveLength(3);
  });

  it('orders cards most-recent-week-first', () => {
    const rows = [
      row({ verdict_id: 1, week_start: '2026-07-20' }),
      row({ verdict_id: 2, week_start: '2026-08-03' }),
      row({ verdict_id: 3, week_start: '2026-07-27' }),
    ].map(rowToDigestItem);

    const cards = groupDigestItems(rows);

    expect(cards.map((c) => c.weekStart)).toEqual(['2026-08-03', '2026-07-27', '2026-07-20']);
  });

  it('retains each item field correctly on the card', () => {
    const rows = [row({ topic: 'Saúde', label: 'contradicts', canonical_url: null })].map(rowToDigestItem);

    const cards = groupDigestItems(rows);

    expect(cards[0].items[0]).toMatchObject({ topic: 'Saúde', label: 'contradicts', canonicalUrl: null });
  });

  it('returns no cards for no rows', () => {
    expect(groupDigestItems([])).toEqual([]);
  });
});
