import { describe, expect, it } from 'vitest';
import { buildVerdictPrompt, VERDICT_SCHEMA } from '../src/verdict-prompt.js';
import { ADDRESSED_VERDICT_LABELS } from '../src/verdict-labels.js';

describe('VERDICT_SCHEMA', () => {
  it('constrains the response to the addressed-only label list, never not_addressed', () => {
    expect(VERDICT_SCHEMA.properties.label.enum).toEqual(ADDRESSED_VERDICT_LABELS);
    expect(VERDICT_SCHEMA.properties.label.enum).not.toContain('not_addressed');
  });
});

describe('buildVerdictPrompt', () => {
  it('produces byte-identical templates across parties once the party name is factored out', () => {
    // The only thing that may legitimately differ between parties is the
    // substituted party name itself. If any other branch of logic snuck in
    // (a party-specific instruction, threshold, or example), this
    // substitution would leave a residual difference and the test fails —
    // this is what "one identical prompt template for every party" means
    // structurally, not just by convention.
    const summary = 'Título: Recomenda ao Governo medidas de apoio à habitação\nTipo: Projeto de Resolução';
    const passage = 'Medidas para a habitação e arrendamento acessível.';

    const psPrompt = buildVerdictPrompt('Partido Socialista', summary, passage);
    const chegaPrompt = buildVerdictPrompt('Chega', summary, passage);

    const psNormalized = psPrompt.replaceAll('Partido Socialista', '<PARTY>');
    const chegaNormalized = chegaPrompt.replaceAll('Chega', '<PARTY>');

    expect(psNormalized).toBe(chegaNormalized);
  });

  it('includes the party name, initiative summary, and program passage verbatim', () => {
    const prompt = buildVerdictPrompt('Livre', 'Título: X', 'Passagem Y');

    expect(prompt).toContain('Livre');
    expect(prompt).toContain('Título: X');
    expect(prompt).toContain('Passagem Y');
  });

  it('instructs the model to judge only from the supplied text', () => {
    const prompt = buildVerdictPrompt('PS', 'Título: X', 'Passagem Y');

    expect(prompt).toMatch(/não uses conhecimento externo/i);
  });
});
