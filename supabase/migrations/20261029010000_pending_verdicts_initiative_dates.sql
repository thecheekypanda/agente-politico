-- Review-queue redesign (grouping by initiative + date-based sort/priority)
-- needs each pending verdict's initiative entry date and official number
-- directly on pending_verdicts, instead of a second round-trip to
-- `iniciativas` per row. Append-only per Postgres's CREATE OR REPLACE VIEW
-- rule: both new columns are added at the end of the select list; every
-- existing column keeps its name/position/type, so no existing consumer
-- (web/src/lib/review.ts's rowToPendingVerdict, any ad-hoc SQL Editor
-- query) breaks.
--
-- The `order by` clause is NOT subject to the append-only rule (only the
-- select list's column shape is) and is updated here too: data_entrada
-- descending (nulls last) is a more useful base default than the old
-- drafted_at-ascending order, matching the review page's own new
-- newest-first default. The page itself still sets its own explicit
-- .order() on every fetch for deterministic pagination — this view-level
-- order is a safety net for any other direct consumer, not load-bearing
-- for the UI.
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
  v.drafted_at,
  i.data_entrada,
  i.numero
from verdicts v
join iniciativas i on i.id = v.iniciativa_id
join party_programs pp on pp.label = v.party_label
where not exists (
  select 1 from verdict_reviews r where r.verdict_id = v.id
)
order by i.data_entrada desc nulls last, v.drafted_at asc;

-- No grant changes needed — CREATE OR REPLACE VIEW preserves the existing
-- `grant select on pending_verdicts to authenticated` from
-- 20260801000000_verdict_reviews.sql.
