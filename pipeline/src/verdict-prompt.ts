import { ADDRESSED_VERDICT_LABELS } from './verdict-labels.js';

// Bump this whenever the template wording changes — logged verbatim
// alongside every verdict (see verdict-drafter.ts), so an auditor can tell
// which version produced any given draft (backlog 3.5).
export const VERDICT_PROMPT_VERSION = 'v1';

// The one identical prompt template for every party (backlog 3.3 hard
// constraint). Parameterized ONLY by partyName, initiativeSummary and
// programPassage — no party-specific branching, lookup tables, or
// thresholds live in this file. Adding an `if (partyName === ...)` here
// would violate the constraint this file exists to enforce.
export function buildVerdictPrompt(
  partyName: string,
  initiativeSummary: string,
  programPassage: string,
): string {
  return [
    `Estás a avaliar se uma iniciativa parlamentar portuguesa está alinhada com o programa eleitoral do partido "${partyName}".`,
    '',
    'Iniciativa:',
    initiativeSummary,
    '',
    'Passagem do programa eleitoral:',
    programPassage,
    '',
    'Classifica o alinhamento entre a iniciativa e esta passagem do programa em exatamente uma categoria:',
    '- aligned: a iniciativa concretiza ou é claramente consistente com o que o programa propõe.',
    '- partially_aligned: há sobreposição parcial, mas com diferenças relevantes de alcance, condições ou instrumentos.',
    '- contradicts: a iniciativa vai contra o que o programa propõe.',
    '',
    'Responde apenas com base no texto fornecido acima. Não uses conhecimento externo sobre a posição do partido.',
    'Inclui uma justificação breve (uma frase, em português europeu) que cite os elementos concretos do texto que sustentam a tua classificação.',
  ].join('\n');
}

export const VERDICT_SCHEMA = {
  type: 'object',
  properties: {
    label: { type: 'string', enum: ADDRESSED_VERDICT_LABELS },
    rationale: { type: 'string' },
  },
  required: ['label', 'rationale'],
  additionalProperties: false,
} as const;
