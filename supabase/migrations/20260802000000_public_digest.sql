-- Public weekly digest for backlog 4.1. The first migration granting
-- anything to the `anon` role — everything before this was reviewer-only
-- or service-role-only. Precision matters here: anon must see ONLY rows a
-- human has approved, never a pending or rejected draft, even indirectly.

-- Scoped strictly to decision = 'approved' — a pending or rejected verdict
-- stays fully invisible to anon, exactly as before this migration. The
-- existing `authenticated` policies from 20260801000000_verdict_reviews.sql
-- are untouched; reviewers still see every draft regardless of review state.
create policy "anon can read approved verdicts" on verdicts
  for select to anon
  using (
    exists (
      select 1 from verdict_reviews r
      where r.verdict_id = verdicts.id and r.decision = 'approved'
    )
  );

create policy "anon can read approved reviews" on verdict_reviews
  for select to anon
  using (decision = 'approved');

-- Explicit grants, same defensive style as the 3.4 migration — required
-- for the anon-scoped policies above to have any effect, and for the
-- security_invoker view below to resolve as the anon role all the way
-- down its join chain.
grant usage on schema public to anon;
grant select on verdicts to anon;
grant select on verdict_reviews to anon;
grant select on iniciativas to anon;
grant select on party_programs to anon;
grant select on approved_verdicts to anon;

-- What the public homepage queries. Built on approved_verdicts (reuses its
-- decision='approved' projection rather than re-deriving it), grouped by
-- the initiative's own tabling week — not the week it happened to clear
-- review, which is a reviewer-bandwidth artifact, not parliamentary
-- activity. security_invoker = true so this inherits the anon-scoped RLS
-- above rather than running as the view owner.
create or replace view public_digest with (security_invoker = true) as
select
  av.verdict_id,
  av.iniciativa_id,
  i.titulo,
  i.tipo_desc,
  i.canonical_url,
  av.party_label,
  pp.party_name,
  av.topic,
  av.label,
  date_trunc('week', i.data_entrada)::date as week_start,
  av.reviewed_at
from approved_verdicts av
join iniciativas i on i.id = av.iniciativa_id
join party_programs pp on pp.label = av.party_label
where i.data_entrada is not null;

grant select on public_digest to anon;
