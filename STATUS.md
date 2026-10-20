# Current status — read this first

Living doc of where the project actually stands right now, separate from
`docs/BACKLOG.md` (which tracks code completion) and `CLAUDE.md` (which
tracks constraints that never change). Update this whenever real-world
state changes — a deploy, a live run, an account-level step done or still
pending. Last updated: 2026-10-20.

## Code: all MVP backlog items complete

Every item in `docs/BACKLOG.md` Phases 0–4 and Tracks A–B is checked off
and merged into `main` via **PR #2**
(https://github.com/thecheekypanda/agente-politico/pull/2, merged
2026-10-20). Only Phase 1.5 (DRE decree-law ingestion) is deliberately
deferred — see the backlog file for why.

## Live Supabase project: real data, pipeline verified end-to-end

Project ref `zxewotduifkdvigaroco` (`https://zxewotduifkdvigaroco.supabase.co`).
All 10 migrations applied. As of the last Ingestion workflow run
(run #104, 2026-10-19, commit `87e8577`):

- **2,343 iniciativas**, **2,223 votações** ingested
- **0** canonical URLs needing resolution (already resolved from an earlier run)
- **1,000/1,000** initiatives topic-tagged
- **985 verdicts drafted**, **15 not_addressed** (deterministic, no LLM call), **0 undrafted** — out of 1,000 pending pairs
- **0 verdicts approved** — nothing is publicly visible yet; this is the no-auto-publish constraint working as intended, not a bug

GitHub Actions repo secrets `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`,
`ANTHROPIC_API_KEY` are all correctly configured (confirmed by the
successful run above). The daily cron (`0 6 * * *` UTC) will keep this
data moving forward automatically.

### Three real bugs found and fixed during this live verification

All committed with full detail in their commit messages — worth reading
if debugging something similar:

1. `e72f5f1` — `draft:verdicts` was built (backlog 3.3) but never wired
   into `.github/workflows/ingest.yml`, so the daily cron silently never
   drafted verdicts.
2. `9b880a0` — `openar-client.ts`'s `fetchOpenAR` only retried HTTP 429
   responses; a thrown network error (`ECONNRESET`) crashed the whole
   ingestion job instead of retrying like a rate limit does.
3. `87e8577` — `verdict-drafter.ts`'s Batch API `custom_id` used `:` as a
   separator (`iniciativaId:partyLabel`), which violates Anthropic's
   required `^[a-zA-Z0-9_-]{1,64}$` pattern. Switched to `_`.

A fourth non-code issue: the `ANTHROPIC_API_KEY` GitHub secret was
initially saved as `ANTHROPIC_API` (typo) — not a bug, just a reminder to
double-check exact secret names.

## Pending account-level steps (only a human can do these)

These are documented in detail in `GETTING_STARTED.md` — this is just the
live checklist of what's actually done vs. not, for this specific project:

- [ ] **Reviewer account** (`GETTING_STARTED.md` Step 13) — no Supabase
  Auth user has been created yet, so nobody can sign into `/review` to
  approve any of the 985 drafted verdicts. This blocks the public digest
  from showing anything at all.
- [ ] **Cloudflare Pages/Workers deploy** (`GETTING_STARTED.md` Step 10) —
  the GitHub integration is connected and auto-deploys on push to `main`,
  but the first deployment (commit `87e8577`, 2026-10-19 ~22:10 UTC)
  **failed**. Likely cause, not yet confirmed from the actual build log:
  - Root directory may be set to `web/` instead of the repo root `/` — this
    is an npm-workspaces monorepo, and `web`'s `prebuild` script runs
    `export:methodology --workspace=pipeline`, which needs the `pipeline`
    workspace's dependencies installed too.
  - `PUBLIC_SUPABASE_URL` / `PUBLIC_SUPABASE_ANON_KEY` build environment
    variables are probably missing — `web/src/lib/supabase-client.ts`
    throws at build time without them.
  - Correct settings per `GETTING_STARTED.md` Step 10: root directory `/`,
    build command `npm install && npm run build --workspace=web`, output
    directory `web/dist`.
- [ ] **Privacy notice contact** (`GETTING_STARTED.md` Step 15) —
  `web/src/pages/privacidade.astro` still has the placeholder
  `[a preencher pelo operador antes do lançamento — ver GETTING_STARTED.md]`.
  Not blocking an internal/stakeholder preview, but must be filled in
  before any public launch.
- [ ] **(Optional)** Cloudflare Web Analytics token (`GETTING_STARTED.md`
  Step 15) — unset, so `Analytics.astro` renders nothing. No tracking
  until deliberately configured.

## Suggested next steps, in order

1. Create the reviewer Supabase Auth account (Step 13).
2. Fix the Cloudflare build settings + env vars above, retry the deploy.
3. Sign into the live `/review` page and approve a batch of the 985
   drafted verdicts, so the public digest has real content to show.
4. Fill in the privacy notice contact before sharing the live URL beyond
   trusted stakeholders.

## Credentials — never committed, always re-supplied per session

No `.env` file (repo root or `web/`) is ever committed — both are
gitignored. A fresh Claude Code session/sandbox starts with neither
present, even though this file references the project. To resume
Claude-assisted work against the live project, the user needs to supply
again: `SUPABASE_URL` (safe to share — it's `https://zxewotduifkdvigaroco.supabase.co`),
`SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY`, and `ANTHROPIC_API_KEY`.
None of these are secret in the sense of being lost — they're all
retrievable from the Supabase dashboard (Project Settings → API) and
Anthropic Console respectively.
