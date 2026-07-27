-- Party program corpus for the alignment engine (backlog Phase 2).
--
-- ar_siglas holds every AR parliamentary-group sigla this program should be
-- matched against for alignment purposes. Usually one entry, but AD (the
-- PSD/CDS-PP coalition) ran 2025 on a single joint program while AR vote
-- data still tracks PSD and CDS-PP as separate parliamentary groups — see
-- pipeline/src/party-programs.ts for the full sourcing notes per party.
create table if not exists party_programs (
  id serial primary key,
  label text not null unique,
  party_name text not null,
  ar_siglas text[] not null,
  source_url text not null,
  election_cycle text not null,
  ingested_at timestamptz
);

-- One row per PDF page — page-level chunking gives every retrieved passage
-- an exact, citable page number for free, with no separate boundary-tracking
-- logic needed.
create table if not exists program_chunks (
  id bigserial primary key,
  program_id integer not null references party_programs (id) on delete cascade,
  page_number integer not null,
  content text not null,
  content_tsv tsvector generated always as (to_tsvector('portuguese', content)) stored,
  unique (program_id, page_number)
);

create index if not exists program_chunks_tsv_idx on program_chunks using gin (content_tsv);

-- Ranked full-text search, server-side — PostgREST can't express ts_rank()
-- through plain select/filter query params, so this is an RPC function
-- rather than a .from().select() call.
create or replace function search_program_chunks(
  p_program_id integer,
  p_query text,
  p_limit integer default 5
)
returns table (page_number integer, content text, rank real)
language sql
stable
as $$
  select
    program_chunks.page_number,
    program_chunks.content,
    ts_rank(program_chunks.content_tsv, websearch_to_tsquery('portuguese', p_query)) as rank
  from program_chunks
  where program_chunks.program_id = p_program_id
    and program_chunks.content_tsv @@ websearch_to_tsquery('portuguese', p_query)
  order by rank desc
  limit p_limit;
$$;
