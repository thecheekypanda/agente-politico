-- Digest drill-down for backlog 4.2: full citation, vote result, and
-- program comparison behind each digest card item.

-- votacoes has no RLS — same category as iniciativas/party_programs, 100%
-- public government data — so a bare grant is enough.
grant select on votacoes to anon;

-- Append-only, per Postgres's CREATE OR REPLACE VIEW rule (existing
-- columns must keep their name/order/type). `rationale` is the LLM's
-- stated reasoning, already read and endorsed by whichever reviewer
-- approved the label — the "reasoning for the alignment tag" the strategy
-- doc's journey 2 asks for. Deliberately not adding verdict_reviews.notes
-- here — that's a reviewer's own working commentary, not requested by the
-- acceptance criteria and not intrinsic to the verdict the way rationale is.
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
  r.reviewed_at,
  v.rationale
from verdicts v
join verdict_reviews r on r.verdict_id = v.id
where r.decision = 'approved';

-- Same append-only rule. No grant changes needed for either view —
-- CREATE OR REPLACE VIEW preserves existing privileges.
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
  av.reviewed_at,
  i.numero,
  i.data_entrada,
  av.citation_page_number,
  av.quoted_passage,
  av.rationale,
  pp.source_url as program_source_url,
  pp.ar_siglas
from approved_verdicts av
join iniciativas i on i.id = av.iniciativa_id
join party_programs pp on pp.label = av.party_label
where i.data_entrada is not null;
