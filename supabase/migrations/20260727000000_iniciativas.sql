-- Iniciativas legislativas, mirrored from openAR (api.openar.pt).
-- `id` is openAR's own IniId — the canonical parlamento.pt Dados Abertos URL
-- is resolved separately in backlog item 1.3 and stored in canonical_url.
create table if not exists iniciativas (
  id bigint primary key,
  legislatura_id text not null,
  numero text not null,
  tipo text not null,
  tipo_desc text not null,
  titulo text not null,
  epigrafe text,
  data_entrada date,
  data_fim date,
  estado text,
  link_texto text,
  canonical_url text,
  openar_updated_at timestamptz,
  ingested_at timestamptz not null default now()
);

create index if not exists iniciativas_legislatura_id_idx on iniciativas (legislatura_id);
