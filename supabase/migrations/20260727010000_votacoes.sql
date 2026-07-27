-- Plenary votes, mirrored from openAR (api.openar.pt).
-- `id` in the source API is unique only per-initiative, not globally (per
-- openAR's own /votacoes/{id} docs), so the primary key here is composite.
-- Titulo/numero/tipo already live on iniciativas — not duplicated here.
create table if not exists votacoes (
  iniciativa_id bigint not null references iniciativas (id),
  votacao_id text not null,
  legislatura_id text not null,
  data date,
  resultado text not null,
  unanime boolean not null,
  reuniao text,
  tipo_reuniao text,
  descricao text,
  a_favor text[] not null default '{}',
  contra text[] not null default '{}',
  abstencao text[] not null default '{}',
  ausencias text[] not null default '{}',
  ingested_at timestamptz not null default now(),
  primary key (iniciativa_id, votacao_id)
);

create index if not exists votacoes_legislatura_id_idx on votacoes (legislatura_id);
