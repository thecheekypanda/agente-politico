-- Supabase's Table Editor prompted to "enable RLS" when iniciativa_fases
-- was created and that prompt was accepted — same mistake, and same
-- silent-block-every-read failure mode, as the one fixed in
-- 20261029000000_disable_rls_iniciativas_party_programs.sql. This table is
-- public reference data (procedural timeline, scraped from parlamento.pt),
-- same category as votacoes/iniciativas/party_programs: relies on GRANTs
-- alone, never RLS.
alter table iniciativa_fases disable row level security;
