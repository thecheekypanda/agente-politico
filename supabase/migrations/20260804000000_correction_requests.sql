-- Correction / right-of-reply mechanism for backlog B.2. Anyone can submit
-- a correction request tied to a published verdict (or just described in
-- prose); the log of requests and resolutions is publicly visible.
--
-- submitter_email is real PII (unlike anything else made public so far in
-- this schema) — column-level grants, not whole-table ones, keep it
-- structurally unreachable by anon even via a direct query, not merely
-- omitted by the curated view.
create table correction_requests (
  id bigserial primary key,
  -- Nullable: set automatically when reported via a "report this item"
  -- link from the digest; a request can also just describe the issue in
  -- prose via reference_note without pointing at a specific verdict row.
  verdict_id bigint references verdicts (id),
  reference_note text not null,
  description text not null,
  submitter_email text,
  status text not null default 'pending' check (status in ('pending', 'resolved', 'rejected')),
  resolution_notes text,
  submitted_at timestamptz not null default now(),
  resolved_at timestamptz
);

alter table correction_requests enable row level security;

-- with check forces every anon-submitted row to start pending and
-- unresolved, regardless of what the client sends — defense in depth on
-- top of the column-level insert grant below, which excludes those
-- columns from what anon can even attempt to set.
create policy "anyone can submit a correction request" on correction_requests
  for insert to anon, authenticated
  with check (status = 'pending' and resolved_at is null and resolution_notes is null);

-- No update/delete grant to anyone. Resolving a request is a manual
-- service-role edit via Supabase's Table Editor (see GETTING_STARTED.md)
-- — a rare admin action, not a client-facing feature, same pattern as
-- correcting a mis-submitted review in verdict_reviews (backlog 3.4).
grant insert (verdict_id, reference_note, description, submitter_email) on correction_requests to anon, authenticated;
grant select (id, verdict_id, reference_note, description, status, resolution_notes, submitted_at, resolved_at)
  on correction_requests to anon, authenticated;

create or replace view public_correction_requests with (security_invoker = true) as
select id, verdict_id, reference_note, description, status, resolution_notes, submitted_at, resolved_at
from correction_requests
order by submitted_at desc;

grant select on public_correction_requests to anon, authenticated;
