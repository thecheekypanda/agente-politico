-- Speeds up "find iniciativas still needing canonical URL resolution"
-- (backlog 1.3), which runs on every ingestion cycle.
create index if not exists iniciativas_canonical_url_null_idx
  on iniciativas (id)
  where canonical_url is null;
