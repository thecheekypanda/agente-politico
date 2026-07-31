-- Draft alignment verdicts for backlog 3.3. "Draft" is the operative word —
-- per CLAUDE.md's no-auto-publish constraint, there is deliberately no
-- reviewer/approval column here yet. That's backlog 3.4's own migration;
-- nothing reads from this table to render a public page yet, so leaving it
-- unreviewable-by-default doesn't violate the constraint.
--
-- One row per (iniciativa, party) pair, always — including the
-- not_addressed case — so downstream digest generation (Phase 4) can query
-- this table directly instead of re-deriving retrieval confidence.
create table if not exists verdicts (
  id bigserial primary key,
  iniciativa_id bigint not null references iniciativas (id),
  party_label text not null references party_programs (label),
  topic text not null,
  -- Defense-in-depth alongside the Zod-equivalent runtime check in
  -- pipeline/src/verdict-labels.ts, which is the single source of truth
  -- this list is copied from — keep the two in sync when it changes.
  label text not null check (label in ('aligned', 'partially_aligned', 'contradicts', 'not_addressed')),
  -- Null for not_addressed rows — there is no citation to give when the
  -- program doesn't address the topic at all.
  citation_page_number integer,
  quoted_passage text,
  rationale text,
  prompt text,
  drafted_at timestamptz not null default now(),
  unique (iniciativa_id, party_label)
);

create index if not exists verdicts_iniciativa_id_idx on verdicts (iniciativa_id);

-- Finds every (initiative, party) pair that doesn't have a verdict yet.
-- PostgREST can't express the cross-join-then-anti-join needed for this
-- through plain select/filter query params (same reasoning as
-- search_program_chunks in the party_programs migration), so this is an
-- RPC function.
create or replace function find_pending_verdicts(
  p_party_labels text[],
  p_limit integer default 500
)
returns table (
  iniciativa_id bigint,
  titulo text,
  tipo_desc text,
  epigrafe text,
  topic text,
  party_label text
)
language sql
stable
as $$
  select i.id, i.titulo, i.tipo_desc, i.epigrafe, i.topic, pl.label
  from iniciativas i
  cross join unnest(p_party_labels) as pl(label)
  where i.topic is not null
    and not exists (
      select 1 from verdicts v
      where v.iniciativa_id = i.id and v.party_label = pl.label
    )
  limit p_limit;
$$;
