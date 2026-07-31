-- Human review gate for backlog 3.4. Every draft verdict from 3.3 needs a
-- logged human sign-off before it can ever reach a public page — this is
-- the mechanism, not just the policy.
--
-- Append-only decision log, kept separate from `verdicts` so the LLM's
-- original draft (label/rationale/citation) is never overwritten and stays
-- comparable to the human's final call — needed for the 3.5 audit view.
create table if not exists verdict_reviews (
  id bigserial primary key,
  verdict_id bigint not null references verdicts (id),
  -- Derived from the requester's JWT server-side, never sent by the
  -- client — a reviewer cannot submit a review under someone else's
  -- identity even if the client code tried to.
  reviewer_id uuid not null default auth.uid() references auth.users (id),
  decision text not null check (decision in ('approved', 'rejected')),
  -- A rejection has no final label (there's nothing to publish); an
  -- approval must have one of the four closed labels, matching
  -- pipeline/src/verdict-labels.ts — the reviewer can pick any of the
  -- four here, not just the three the LLM was allowed to draft, since a
  -- human is allowed to override "aligned" down to "not_addressed" (or
  -- vice versa) if the draft was wrong.
  final_label text check (
    (decision = 'approved' and final_label in ('aligned', 'partially_aligned', 'contradicts', 'not_addressed'))
    or (decision = 'rejected' and final_label is null)
  ),
  notes text,
  reviewed_at timestamptz not null default now(),
  -- One decision per verdict. A mis-click is a rare manual service-role
  -- fix by an admin, not a client-facing "undo" feature — building an
  -- edit-after-submit flow is out of scope for a 1-3 person reviewer team.
  unique (verdict_id)
);

-- RLS, enabled here for the first time on `verdicts` — until now only the
-- service-role pipeline ever touched it, so nothing needed restricting.
-- From here on, unreviewed drafts and the review log are readable only by
-- signed-in reviewers, never by anon/public.
alter table verdicts enable row level security;
create policy "authenticated can read verdicts" on verdicts
  for select to authenticated using (true);

alter table verdict_reviews enable row level security;
create policy "authenticated can read reviews" on verdict_reviews
  for select to authenticated using (true);
create policy "authenticated can submit their own review" on verdict_reviews
  for insert to authenticated with check (reviewer_id = auth.uid());
-- No update/delete policy at all — default-deny, matching the append-only
-- design above.

-- Explicit grants rather than relying on Supabase's default schema
-- privileges being what we assume — self-contained regardless of dashboard
-- defaults. RLS above still gates which rows are visible/insertable.
grant usage on schema public to authenticated;
grant select on verdicts to authenticated;
grant select, insert on verdict_reviews to authenticated;
grant select on iniciativas to authenticated;
grant select on party_programs to authenticated;

-- What the reviewer UI queries. `security_invoker = true` is essential —
-- without it, the view would run as its owner and silently bypass the RLS
-- policies above for whoever queries it.
create or replace view pending_verdicts with (security_invoker = true) as
select
  v.id as verdict_id,
  v.iniciativa_id,
  i.titulo,
  i.tipo_desc,
  i.epigrafe,
  i.canonical_url,
  v.party_label,
  pp.party_name,
  pp.source_url as program_source_url,
  v.topic,
  v.label as draft_label,
  v.citation_page_number,
  v.quoted_passage,
  v.rationale,
  v.drafted_at
from verdicts v
join iniciativas i on i.id = v.iniciativa_id
join party_programs pp on pp.label = v.party_label
where not exists (
  select 1 from verdict_reviews r where r.verdict_id = v.id
)
order by v.drafted_at asc;

grant select on pending_verdicts to authenticated;

-- The one path any future public page is meant to query — never `verdicts`
-- directly. Nothing consumes this yet (Phase 4 doesn't exist), but it
-- exists now as the structurally-enforced single door: no `anon` grant is
-- given anywhere here, so this stays unreachable by the public until a
-- future migration deliberately opens it, at which point "approved-only,
-- reviewer's final label, not the raw draft" is already the shape on
-- offer.
create or replace view approved_verdicts with (security_invoker = true) as
select
  v.id as verdict_id,
  v.iniciativa_id,
  v.party_label,
  v.topic,
  r.final_label as label,
  v.citation_page_number,
  v.quoted_passage,
  r.reviewer_id,
  r.reviewed_at
from verdicts v
join verdict_reviews r on r.verdict_id = v.id
where r.decision = 'approved';

grant select on approved_verdicts to authenticated;
