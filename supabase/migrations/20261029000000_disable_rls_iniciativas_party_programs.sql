-- iniciativas and party_programs are fully public, read-only reference data
-- (parliamentary records and electoral programs, nothing sensitive) — by
-- design they rely on GRANTs alone, never RLS, same category as votacoes
-- (see the note in 20260803000000_digest_drill_down.sql). RLS was somehow
-- enabled directly on the live project outside of any migration here —
-- almost certainly a one-click "Enable RLS" toggle in the Supabase Table
-- Editor UI — which, with no policy ever defined for either table, silently
-- denied every row to every role but the table owner. That broke
-- pending_verdicts' joins: /review showed "no pending verdicts" despite
-- 6,192 real ones sitting in `verdicts` (found live, 2026-10-29).
--
-- Idempotent: disabling RLS that's already off is a no-op.
alter table iniciativas disable row level security;
alter table party_programs disable row level security;
