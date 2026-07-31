import { describe, expect, it } from 'vitest';
import { buildReviewInsert, rowToPendingVerdict } from '../src/lib/review';

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
    });
  });
});
