-- Procedural timeline per iniciativa (Entrada, Admissão, Baixa comissão,
-- Anúncio, Votação, ...), scraped from parlamento.pt's own DetalheIniciativa
-- page — openAR's API has no equivalent field (confirmed directly against
-- a live response, 2026-10-29), and parlamento.pt is already this project's
-- canonical citation source (CLAUDE.md). See pipeline/src/parlamento-client.ts
-- (fetchIniciativaFases) for the scraper and pipeline/src/fases-store.ts for
-- how rows here are kept in sync.
--
-- ctl_index is the phase's position in the page's own rptFases repeater —
-- not a stable id from the source, but stable enough within one page to
-- use as a natural key alongside iniciativa_id.
--
-- parecer_nao_emitido_data/_motivo capture an optional committee-level
-- detail nested inside some phases (e.g. "Baixa comissão"): the date and
-- reason a committee didn't issue its parecer in time (such as being
-- postponed "por arrastamento" to a later plenary session) — distinct from
-- `obs`, which is a separate, simpler note the page shows directly under
-- some phases (e.g. "Conexão à 11.ª Comissão").
create table if not exists iniciativa_fases (
  iniciativa_id bigint not null references iniciativas (id),
  ctl_index smallint not null,
  data date,
  evento text not null,
  obs text,
  parecer_nao_emitido_data date,
  parecer_nao_emitido_motivo text,
  scraped_at timestamptz not null default now(),
  primary key (iniciativa_id, ctl_index)
);

create index if not exists iniciativa_fases_iniciativa_id_idx on iniciativa_fases (iniciativa_id);
