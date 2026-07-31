import { GLOSSARY, type GlossaryEntry } from '../content/glossary';

// Exact (case-insensitive) match only — deliberately not a substring scan.
// Many glossary terms are literally the controlled-vocabulary values
// already sitting in tipo_desc/votacoes.descricao, so an exact match is
// precise; fuzzy matching arbitrary free text (titles, rationale, quoted
// program passages) risks false positives and, for a quote specifically,
// would misrepresent it by injecting links into text presented as verbatim.
export function findGlossaryTerm(text: string): GlossaryEntry | undefined {
  const normalized = text.trim().toLowerCase();
  return GLOSSARY.find((entry) => entry.term.toLowerCase() === normalized);
}
