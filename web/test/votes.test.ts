import { describe, expect, it } from 'vitest';
import { derivePartyVotePosition, type VotacaoRow } from '../src/lib/votes';

function vote(overrides: Partial<VotacaoRow> = {}): VotacaoRow {
  return {
    votacao_id: '1',
    data: '2026-01-01',
    descricao: 'Texto Final',
    resultado: 'Aprovado',
    unanime: false,
    a_favor: [],
    contra: [],
    abstencao: [],
    ausencias: [],
    ...overrides,
  };
}

describe('derivePartyVotePosition', () => {
  it('returns favor when the sigla is in a_favor', () => {
    expect(derivePartyVotePosition(vote({ a_favor: ['PS'] }), 'PS')).toBe('favor');
  });

  it('returns contra when the sigla is in contra', () => {
    expect(derivePartyVotePosition(vote({ contra: ['PSD'] }), 'PSD')).toBe('contra');
  });

  it('returns abstencao when the sigla is in abstencao', () => {
    expect(derivePartyVotePosition(vote({ abstencao: ['CH'] }), 'CH')).toBe('abstencao');
  });

  it('returns ausencia when the sigla is in ausencias', () => {
    expect(derivePartyVotePosition(vote({ ausencias: ['IL'] }), 'IL')).toBe('ausencia');
  });

  it('returns nao_registado when the sigla is in none of the arrays and the vote is not unanimous', () => {
    expect(derivePartyVotePosition(vote({ a_favor: ['PS'], contra: ['PSD'] }), 'BE')).toBe('nao_registado');
  });

  it('returns favor for a unanimous vote even though every array is empty', () => {
    expect(derivePartyVotePosition(vote({ unanime: true }), 'BE')).toBe('favor');
  });

  it('derives independent positions per sigla — e.g. a split AD vote (PSD vs. CDS-PP)', () => {
    const voto = vote({ a_favor: ['PSD'], contra: ['CDS-PP'] });

    expect(derivePartyVotePosition(voto, 'PSD')).toBe('favor');
    expect(derivePartyVotePosition(voto, 'CDS-PP')).toBe('contra');
  });

  it('throws instead of silently guessing when a sigla appears in more than one position group', () => {
    const voto = vote({ a_favor: ['PS'], contra: ['PS'] });

    expect(() => derivePartyVotePosition(voto, 'PS')).toThrow(/more than one position group/);
  });
});
