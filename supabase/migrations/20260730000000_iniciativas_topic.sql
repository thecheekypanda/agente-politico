-- LLM-assigned topic tag from a fixed, closed list (backlog 3.2). The CHECK
-- constraint is defense-in-depth alongside the Zod-equivalent runtime check
-- in pipeline/src/topics.ts, which is the single source of truth this list
-- is copied from — keep the two in sync when the list changes.
alter table iniciativas
  add column if not exists topic text
  constraint iniciativas_topic_check check (
    topic is null or topic = any (array[
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
      'Combate à Corrupção'
    ])
  );

-- Speeds up "find iniciativas still needing a topic", which runs on every
-- ingestion cycle — same pattern as the canonical_url partial index.
create index if not exists iniciativas_topic_null_idx
  on iniciativas (id)
  where topic is null;
