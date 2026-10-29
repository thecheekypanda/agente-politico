import { describe, expect, it } from 'vitest';
import {
  buildBulkApproveInserts,
  buildReviewInsert,
  groupPendingVerdictsByInitiative,
  rowToPendingVerdict,
  sortInitiativeGroups,
  type InitiativeGroup,
  type PendingVerdict,
} from '../src/lib/review';

describe('buildReviewInsert', () => {
  it('builds an approved row with its final label', () => {
    expect(buildReviewInsert(1, 'approved', 'aligned', '')).toEqual({
      verdict_id: 1,
      decision: 'approved',
      final_label: 'aligned',
      notes: null,
    });
  });

  it('trims notes and stores null for an empty/whitespace-only note', () => {
    expect(buildReviewInsert(1, 'approved', 'aligned', '  looks right  ').notes).toBe('looks right');
    expect(buildReviewInsert(1, 'approved', 'aligned', '   ').notes).toBeNull();
  });

  it('builds a rejected row with no final label', () => {
    expect(buildReviewInsert(2, 'rejected', null, 'wrong topic')).toEqual({
      verdict_id: 2,
      decision: 'rejected',
      final_label: null,
      notes: 'wrong topic',
    });
  });

  it('rejects an approval submitted without a final label', () => {
    // Mirrors the DB CHECK constraint in
    // supabase/migrations/20260801000000_verdict_reviews.sql — caught here
    // with a clear message instead of only as an opaque Postgres error.
    expect(() => buildReviewInsert(1, 'approved', null, '')).toThrow(/final label/i);
  });

  it('rejects a rejection submitted with a final label', () => {
    expect(() => buildReviewInsert(1, 'rejected', 'aligned', '')).toThrow(/must not include/i);
  });
});

describe('rowToPendingVerdict', () => {
  it('maps a snake_case DB row to the camelCase shape the UI uses', () => {
    const row = {
      verdict_id: 7,
      iniciativa_id: 42,
      titulo: 'Título',
      tipo_desc: 'Projeto de Lei',
      epigrafe: null,
      canonical_url: 'https://parlamento.pt/x',
      party_label: 'PS',
      party_name: 'Partido Socialista',
      program_source_url: 'https://ps.pt/programa.pdf',
      topic: 'Habitação',
      draft_label: 'aligned',
      citation_page_number: 5,
      quoted_passage: 'Passagem',
      rationale: 'Justificação',
      drafted_at: '2026-08-01T00:00:00Z',
      numero: '123/XVII',
      data_entrada: '2026-07-15',
    };

    expect(rowToPendingVerdict(row)).toEqual({
      verdictId: 7,
      iniciativaId: 42,
      titulo: 'Título',
      tipoDesc: 'Projeto de Lei',
      epigrafe: null,
      canonicalUrl: 'https://parlamento.pt/x',
      partyLabel: 'PS',
      partyName: 'Partido Socialista',
      programSourceUrl: 'https://ps.pt/programa.pdf',
      topic: 'Habitação',
      draftLabel: 'aligned',
      citationPageNumber: 5,
      quotedPassage: 'Passagem',
      rationale: 'Justificação',
      draftedAt: '2026-08-01T00:00:00Z',
      numero: '123/XVII',
      dataEntrada: '2026-07-15',
    });
  });
});

function pending(overrides: Partial<PendingVerdict> = {}): PendingVerdict {
  return {
    verdictId: 1,
    iniciativaId: 1,
    titulo: 'Título',
    tipoDesc: 'Projeto de Lei',
    epigrafe: null,
    canonicalUrl: null,
    partyLabel: 'PS',
    partyName: 'Partido Socialista',
    programSourceUrl: 'https://ps.pt/programa.pdf',
    topic: 'Habitação',
    draftLabel: 'aligned',
    citationPageNumber: null,
    quotedPassage: null,
    rationale: null,
    draftedAt: '2026-08-01T00:00:00Z',
    numero: '1/XVII',
    dataEntrada: '2026-08-01',
    ...overrides,
  };
}

describe('groupPendingVerdictsByInitiative', () => {
  it('groups rows sharing an iniciativaId, preserving insertion order within the group', () => {
    const rows = [
      pending({ verdictId: 1, iniciativaId: 1, partyLabel: 'PS' }),
      pending({ verdictId: 2, iniciativaId: 2, partyLabel: 'PS' }),
      pending({ verdictId: 3, iniciativaId: 1, partyLabel: 'CH' }),
    ];

    const groups = groupPendingVerdictsByInitiative(rows);

    expect(groups).toHaveLength(2);
    const group1 = groups.find((g) => g.iniciativaId === 1)!;
    expect(group1.pendingByParty.map((p) => p.verdictId)).toEqual([1, 3]);
    const group2 = groups.find((g) => g.iniciativaId === 2)!;
    expect(group2.pendingByParty.map((p) => p.verdictId)).toEqual([2]);
  });

  it('carries the initiative-level fields from the first row in the group', () => {
    const rows = [pending({ iniciativaId: 5, titulo: 'Habitação acessível', numero: '9/XVII', dataEntrada: '2026-01-01' })];

    const [group] = groupPendingVerdictsByInitiative(rows);

    expect(group.titulo).toBe('Habitação acessível');
    expect(group.numero).toBe('9/XVII');
    expect(group.dataEntrada).toBe('2026-01-01');
  });
});

describe('sortInitiativeGroups', () => {
  function group(overrides: Partial<InitiativeGroup> = {}): InitiativeGroup {
    return {
      iniciativaId: 1,
      titulo: 'Título',
      tipoDesc: 'Projeto de Lei',
      epigrafe: null,
      canonicalUrl: null,
      numero: '1/XVII',
      dataEntrada: '2026-01-01',
      pendingByParty: [],
      ...overrides,
    };
  }

  it('pins current-year groups first, newest-first within each tier, when pinCurrentYear is true', () => {
    const groups = [
      group({ iniciativaId: 1, dataEntrada: '2025-06-01' }),
      group({ iniciativaId: 2, dataEntrada: '2026-03-01' }),
      group({ iniciativaId: 3, dataEntrada: '2025-01-01' }),
      group({ iniciativaId: 4, dataEntrada: '2026-09-01' }),
    ];

    const sorted = sortInitiativeGroups(groups, { direction: 'desc', pinCurrentYear: true }, 2026);

    expect(sorted.map((g) => g.iniciativaId)).toEqual([4, 2, 1, 3]);
  });

  it('keeps tier order but flips within-tier order when direction is asc', () => {
    const groups = [
      group({ iniciativaId: 1, dataEntrada: '2025-06-01' }),
      group({ iniciativaId: 2, dataEntrada: '2026-03-01' }),
      group({ iniciativaId: 3, dataEntrada: '2025-01-01' }),
      group({ iniciativaId: 4, dataEntrada: '2026-09-01' }),
    ];

    const sorted = sortInitiativeGroups(groups, { direction: 'asc', pinCurrentYear: true }, 2026);

    expect(sorted.map((g) => g.iniciativaId)).toEqual([2, 4, 3, 1]);
  });

  it('sorts as one flat list when pinCurrentYear is false, regardless of year', () => {
    const groups = [
      group({ iniciativaId: 1, dataEntrada: '2025-06-01' }),
      group({ iniciativaId: 2, dataEntrada: '2026-03-01' }),
    ];

    const sorted = sortInitiativeGroups(groups, { direction: 'desc', pinCurrentYear: false }, 2026);

    expect(sorted.map((g) => g.iniciativaId)).toEqual([2, 1]);
  });

  it('always sorts a null dataEntrada last, in either direction, and never treats it as current year', () => {
    const groups = [
      group({ iniciativaId: 1, dataEntrada: null }),
      group({ iniciativaId: 2, dataEntrada: '2026-01-01' }),
      group({ iniciativaId: 3, dataEntrada: '2025-01-01' }),
    ];

    const desc = sortInitiativeGroups(groups, { direction: 'desc', pinCurrentYear: true }, 2026);
    expect(desc.map((g) => g.iniciativaId)).toEqual([2, 3, 1]);

    const asc = sortInitiativeGroups(groups, { direction: 'asc', pinCurrentYear: true }, 2026);
    expect(asc.map((g) => g.iniciativaId)).toEqual([2, 3, 1]);
  });
});

describe('buildBulkApproveInserts', () => {
  it('builds one approved insert per row, using each row\'s own draft label', () => {
    const rows = [
      pending({ verdictId: 1, draftLabel: 'aligned' }),
      pending({ verdictId: 2, draftLabel: 'contradicts' }),
    ];

    expect(buildBulkApproveInserts(rows)).toEqual([
      { verdict_id: 1, decision: 'approved', final_label: 'aligned', notes: null },
      { verdict_id: 2, decision: 'approved', final_label: 'contradicts', notes: null },
    ]);
  });

  it('shares the same trimmed/empty-to-null notes behavior as buildReviewInsert', () => {
    const rows = [pending({ verdictId: 1 })];

    expect(buildBulkApproveInserts(rows, '  shared note  ')[0].notes).toBe('shared note');
    expect(buildBulkApproveInserts(rows, '   ')[0].notes).toBeNull();
  });
});
