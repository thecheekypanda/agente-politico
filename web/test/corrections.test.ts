import { describe, expect, it } from 'vitest';
import { buildCorrectionInsert, rowToCorrectionRequest } from '../src/lib/corrections';

describe('buildCorrectionInsert', () => {
  it('builds a valid insert row', () => {
    expect(buildCorrectionInsert('Veredicto #42 (PS)', 'A passagem citada não corresponde ao tema.', '', 42)).toEqual({
      verdict_id: 42,
      reference_note: 'Veredicto #42 (PS)',
      description: 'A passagem citada não corresponde ao tema.',
      submitter_email: null,
    });
  });

  it('defaults verdict_id to null when not tied to a specific item', () => {
    expect(buildCorrectionInsert('Página de metodologia', 'Erro de data.', '').verdict_id).toBeNull();
  });

  it('trims and keeps a provided email', () => {
    expect(buildCorrectionInsert('X', 'Y', '  pessoa@example.com  ').submitter_email).toBe('pessoa@example.com');
  });

  it('trims and nullifies an empty email', () => {
    expect(buildCorrectionInsert('X', 'Y', '   ').submitter_email).toBeNull();
  });

  it('rejects an empty reference note', () => {
    expect(() => buildCorrectionInsert('   ', 'Y', '')).toThrow(/refere o pedido/i);
  });

  it('rejects an empty description', () => {
    expect(() => buildCorrectionInsert('X', '   ', '')).toThrow(/descrever o problema/i);
  });
});

describe('rowToCorrectionRequest', () => {
  it('maps a snake_case DB row to the camelCase shape the UI uses', () => {
    const row = {
      id: 1,
      verdict_id: 42,
      reference_note: 'Veredicto #42 (PS)',
      description: 'A passagem citada não corresponde ao tema.',
      status: 'resolved',
      resolution_notes: 'Passagem corrigida após revisão.',
      submitted_at: '2026-08-01T00:00:00Z',
      resolved_at: '2026-08-02T00:00:00Z',
    };

    expect(rowToCorrectionRequest(row)).toEqual({
      id: 1,
      verdictId: 42,
      referenceNote: 'Veredicto #42 (PS)',
      description: 'A passagem citada não corresponde ao tema.',
      status: 'resolved',
      resolutionNotes: 'Passagem corrigida após revisão.',
      submittedAt: '2026-08-01T00:00:00Z',
      resolvedAt: '2026-08-02T00:00:00Z',
    });
  });

  it('handles a pending request with no resolution yet', () => {
    const row = {
      id: 2,
      verdict_id: null,
      reference_note: 'Página de metodologia',
      description: 'Erro de data.',
      status: 'pending',
      resolution_notes: null,
      submitted_at: '2026-08-01T00:00:00Z',
      resolved_at: null,
    };

    expect(rowToCorrectionRequest(row)).toMatchObject({ status: 'pending', resolutionNotes: null, resolvedAt: null });
  });
});
