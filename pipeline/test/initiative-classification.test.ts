import { describe, expect, it } from 'vitest';
import {
  classifyInitiativeType,
  classifyPartyVotePositions,
} from '../src/initiative-classification.js';

function vote(overrides: Partial<Parameters<typeof classifyPartyVotePositions>[0][number]> = {}) {
  return {
    votacao_id: '1',
    data: '2026-01-01',
    descricao: 'Texto Final',
    resultado: 'Aprovado',
    unanime: false,
    a_favor: [] as string[],
    contra: [] as string[],
    abstencao: [] as string[],
    ausencias: [] as string[],
    ...overrides,
  };
}

describe('classifyInitiativeType', () => {
  it('passes through tipo/tipo_desc verbatim, unmodified', () => {
    const result = classifyInitiativeType({ tipo: 'J', tipo_desc: 'Projeto de Lei' });

    expect(result).toEqual({ code: 'J', label: 'Projeto de Lei' });
  });
});

describe('classifyPartyVotePositions', () => {
  it('returns favor when the sigla is in a_favor', () => {
    const [result] = classifyPartyVotePositions([vote({ a_favor: ['PS'] })], 'PS');
    expect(result.position).toBe('favor');
  });

  it('returns contra when the sigla is in contra', () => {
    const [result] = classifyPartyVotePositions([vote({ contra: ['PSD'] })], 'PSD');
    expect(result.position).toBe('contra');
  });

  it('returns abstencao when the sigla is in abstencao', () => {
    const [result] = classifyPartyVotePositions([vote({ abstencao: ['CH'] })], 'CH');
    expect(result.position).toBe('abstencao');
  });

  it('returns ausencia when the sigla is in ausencias', () => {
    const [result] = classifyPartyVotePositions([vote({ ausencias: ['IL'] })], 'IL');
    expect(result.position).toBe('ausencia');
  });

  it('returns nao_registado when the sigla is in none of the arrays and the vote is not unanimous', () => {
    const [result] = classifyPartyVotePositions(
      [vote({ a_favor: ['PS'], contra: ['PSD'] })],
      'BE',
    );
    expect(result.position).toBe('nao_registado');
  });

  it('returns favor for a unanimous vote even though every array is empty', () => {
    const [result] = classifyPartyVotePositions(
      [vote({ unanime: true, a_favor: [], contra: [], abstencao: [], ausencias: [] })],
      'BE',
    );
    expect(result.position).toBe('favor');
  });

  it('derives a distinct position per vote event for the same initiative', () => {
    // Mirrors real data from 1.2: iniciativa 356750 had one vote Aprovado
    // (Texto Final) and another Rejeitado (an unrelated procedural motion).
    const votos = [
      vote({ votacao_id: '1', descricao: 'Texto Final', resultado: 'Aprovado', a_favor: ['PSD'] }),
      vote({ votacao_id: '2', descricao: 'Requerimento oral', resultado: 'Rejeitado', contra: ['PSD'] }),
    ];

    const results = classifyPartyVotePositions(votos, 'PSD');

    expect(results).toEqual([
      { votacaoId: '1', data: '2026-01-01', descricao: 'Texto Final', resultado: 'Aprovado', position: 'favor' },
      { votacaoId: '2', data: '2026-01-01', descricao: 'Requerimento oral', resultado: 'Rejeitado', position: 'contra' },
    ]);
  });

  it('throws instead of silently guessing when a sigla appears in more than one position group', () => {
    const votos = [vote({ a_favor: ['PS'], contra: ['PS'] })];

    expect(() => classifyPartyVotePositions(votos, 'PS')).toThrow(/more than one position group/);
  });
});
