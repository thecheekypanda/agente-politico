import { describe, expect, it } from 'vitest';
import { findGlossaryTerm } from '../src/lib/glossary';

describe('findGlossaryTerm', () => {
  it('matches a known term exactly', () => {
    expect(findGlossaryTerm('Projeto de Lei')?.slug).toBe('projeto-de-lei');
  });

  it('matches case-insensitively', () => {
    expect(findGlossaryTerm('projeto de lei')?.slug).toBe('projeto-de-lei');
    expect(findGlossaryTerm('PROJETO DE LEI')?.slug).toBe('projeto-de-lei');
  });

  it('tolerates surrounding whitespace', () => {
    expect(findGlossaryTerm('  Decreto-Lei  ')?.slug).toBe('decreto-lei');
  });

  it('returns undefined for an unrelated string', () => {
    expect(findGlossaryTerm('Recomenda ao Governo medidas de apoio à habitação')).toBeUndefined();
  });

  it('does not match a mere substring occurrence — no false positives', () => {
    // Contains "lei" as a substring of "legislativo", not the standalone
    // term "Lei" — must not match anything.
    expect(findGlossaryTerm('Relatório legislativo anual')).toBeUndefined();
  });

  it('returns undefined for an empty string', () => {
    expect(findGlossaryTerm('')).toBeUndefined();
  });
});
