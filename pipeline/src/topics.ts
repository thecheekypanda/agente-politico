// The fixed, closed topic taxonomy for backlog 3.2. Single source of truth —
// both the LLM's JSON schema constraint and the DB CHECK constraint
// (supabase/migrations/20260730000000_iniciativas_topic.sql) derive from
// this list. Adding or removing a topic requires a new migration on
// purpose: a diffable, reviewable event, not a silent code change.
//
// Grounded in the actual portfolio structure of Portuguese government
// ministries plus standard civic-transparency topics (immigration, human
// rights, anti-corruption) — proposed during planning (2026-07-30), not
// pulled from any existing taxonomy in the source data (openAR/parlamento.pt
// have no topic/category field on iniciativas).
export const TOPICS = [
  'Habitação',
  'Saúde',
  'Fiscalidade e Impostos',
  'Educação',
  'Trabalho e Emprego',
  'Segurança Social e Pensões',
  'Justiça',
  'Segurança Interna',
  'Defesa Nacional',
  'Economia e Finanças Públicas',
  'Ambiente e Ação Climática',
  'Energia',
  'Agricultura e Pescas',
  'Transportes e Infraestruturas',
  'Administração Pública',
  'Autarquias e Administração Local',
  'Imigração e Fronteiras',
  'Igualdade e Direitos Humanos',
  'Cultura',
  'Ciência, Tecnologia e Inovação',
  'Comunicação Social',
  'Desporto',
  'Turismo',
  'Política Externa e Assuntos Europeus',
  'Direitos dos Consumidores',
  'Bem-Estar Animal',
  'Regiões Autónomas',
  'Reforma do Estado',
  'Combate à Corrupção',
] as const;

export type Topic = (typeof TOPICS)[number];

export function isTopic(value: string): value is Topic {
  return (TOPICS as readonly string[]).includes(value);
}
