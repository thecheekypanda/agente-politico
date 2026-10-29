import { describe, expect, it } from 'vitest';
import { filterDigestRows, groupDigestRowsByInitiative, groupInitiativeCardsByWeek, rowToDigestItem } from '../src/lib/digest';

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

describe('groupDigestRowsByInitiative', () => {
  it('groups verdicts for the same initiative into one card, even across different parties', () => {
    const rows = [
      row({ verdict_id: 1, iniciativa_id: 10, party_label: 'PS' }),
      row({ verdict_id: 2, iniciativa_id: 10, party_label: 'CH' }),
    ].map(rowToDigestItem);

    const cards = groupDigestRowsByInitiative(rows);

    expect(cards).toHaveLength(1);
    expect(cards[0].verdicts).toHaveLength(2);
    expect(cards[0].verdicts.map((v) => v.verdictId)).toEqual([1, 2]);
  });

  it('splits into separate cards by initiative', () => {
    const rows = [
      row({ verdict_id: 1, iniciativa_id: 10 }),
      row({ verdict_id: 2, iniciativa_id: 20 }),
    ].map(rowToDigestItem);

    expect(groupDigestRowsByInitiative(rows)).toHaveLength(2);
  });

  it('carries the initiative-level fields and each verdict\'s own party fields', () => {
    const rows = [
      row({ titulo: 'Habitação acessível', numero: '9/XVII', party_label: 'PS', party_name: 'Partido Socialista' }),
    ].map(rowToDigestItem);

    const [card] = groupDigestRowsByInitiative(rows);

    expect(card.titulo).toBe('Habitação acessível');
    expect(card.numero).toBe('9/XVII');
    expect(card.verdicts[0].partyLabel).toBe('PS');
    expect(card.verdicts[0].partyName).toBe('Partido Socialista');
  });

  it('returns no cards for no rows', () => {
    expect(groupDigestRowsByInitiative([])).toEqual([]);
  });
});

describe('groupInitiativeCardsByWeek', () => {
  function initiativeCard(overrides: Partial<Record<string, unknown>> = {}) {
    return {
      iniciativaId: 1,
      titulo: 'Título',
      tipoDesc: 'Projeto de Lei',
      canonicalUrl: null,
      numero: '1/XVII',
      dataEntrada: '2026-07-27',
      weekStart: '2026-07-27',
      verdicts: [],
      ...overrides,
    };
  }

  it('orders sections most-recent-week-first', () => {
    const cards = [
      initiativeCard({ iniciativaId: 1, weekStart: '2026-07-20', dataEntrada: '2026-07-20' }),
      initiativeCard({ iniciativaId: 2, weekStart: '2026-08-03', dataEntrada: '2026-08-03' }),
      initiativeCard({ iniciativaId: 3, weekStart: '2026-07-27', dataEntrada: '2026-07-27' }),
    ];

    const sections = groupInitiativeCardsByWeek(cards);

    expect(sections.map((s) => s.weekStart)).toEqual(['2026-08-03', '2026-07-27', '2026-07-20']);
  });

  it('orders initiatives within a week most-recently-filed-first', () => {
    const cards = [
      initiativeCard({ iniciativaId: 1, weekStart: '2026-07-27', dataEntrada: '2026-07-27' }),
      initiativeCard({ iniciativaId: 2, weekStart: '2026-07-27', dataEntrada: '2026-07-30' }),
    ];

    const [section] = groupInitiativeCardsByWeek(cards);

    expect(section.initiatives.map((i) => i.iniciativaId)).toEqual([2, 1]);
  });

  it('returns no sections for no cards', () => {
    expect(groupInitiativeCardsByWeek([])).toEqual([]);
  });
});

describe('filterDigestRows', () => {
  const rows = [
    row({ verdict_id: 1, party_label: 'PS', week_start: '2026-07-20' }),
    row({ verdict_id: 2, party_label: 'CH', week_start: '2026-07-27' }),
    row({ verdict_id: 3, party_label: 'PS', week_start: '2026-08-03' }),
  ].map(rowToDigestItem);

  it('returns every row unchanged when no filters are given', () => {
    expect(filterDigestRows(rows)).toEqual(rows);
    expect(filterDigestRows(rows, {})).toEqual(rows);
  });

  it('filters to only the selected parties', () => {
    const result = filterDigestRows(rows, { partyLabels: new Set(['PS']) });

    expect(result.map((r) => r.verdictId)).toEqual([1, 3]);
  });

  it('treats an empty party set the same as no party filter', () => {
    expect(filterDigestRows(rows, { partyLabels: new Set() })).toEqual(rows);
  });

  it('filters to a week range, inclusive on both ends', () => {
    const result = filterDigestRows(rows, { fromWeek: '2026-07-27', toWeek: '2026-07-27' });

    expect(result.map((r) => r.verdictId)).toEqual([2]);
  });

  it('excludes rows outside an open-ended range', () => {
    expect(filterDigestRows(rows, { fromWeek: '2026-07-27' }).map((r) => r.verdictId)).toEqual([2, 3]);
    expect(filterDigestRows(rows, { toWeek: '2026-07-27' }).map((r) => r.verdictId)).toEqual([1, 2]);
  });

  it('combines party and date filters', () => {
    const result = filterDigestRows(rows, { partyLabels: new Set(['PS']), fromWeek: '2026-08-01' });

    expect(result.map((r) => r.verdictId)).toEqual([3]);
  });
});
