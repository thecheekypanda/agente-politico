# Current status — read this first

Living doc of where the project actually stands right now, separate from
`docs/BACKLOG.md` (which tracks code completion) and `CLAUDE.md` (which
tracks constraints that never change). Update this whenever real-world
state changes — a deploy, a live run, an account-level step done or still
pending. Last updated: 2026-10-29.

## Live site: up and working

**https://agente-politico.pedro-c-braganca.workers.dev** — Cloudflare
Workers (static assets), auto-deploys from `main`. `/review` is signed-in
and showing the real queue. Both the public digest (still empty — see
below) and `/review` were broken until three real bugs, found live this
session, were fixed (see "Bugs found and fixed" below).

## Reviewer account: done

A Supabase Auth user exists (invited via Authentication → Users), public
sign-up is disabled, and signing in via magic link at `/review` works.
**Known Supabase default to remember:** Site URL / Redirect URLs under
Authentication → URL Configuration need to list the live site's actual
URL, not `localhost:3000` (Supabase's default) — fixed this session.

## Code: all MVP backlog items complete

Every item in `docs/BACKLOG.md` Phases 0–4 and Tracks A–B is checked off
and merged into `main` via **PR #2**
(https://github.com/thecheekypanda/agente-politico/pull/2, merged
2026-10-20). Only Phase 1.5 (DRE decree-law ingestion) is deliberately
deferred — see the backlog file for why.

## Live Supabase project: real data, pipeline verified end-to-end

Project ref `zxewotduifkdvigaroco` (`https://zxewotduifkdvigaroco.supabase.co`,
shown in the dashboard under the project **name** `tradutor-politico` — same
project, just a different display name; don't let that name confuse a future
session). All 12 migrations through `20261029010000_...` are applied (the
11th fixes the RLS bug below). **`20261029020000_iniciativa_fases.sql`
(new table for the procedural-timeline feature below) still needs to be
run manually in the Supabase SQL Editor** — not auto-applied, same as every
migration here.

- **2,343 iniciativas**, **2,223 votações** ingested as of run #104
  (2026-10-19). The daily cron (`0 6 * * *` UTC) has kept running since;
  exact current counts will be higher — check live rather than trusting
  this file for current row counts.
- **6,192 verdicts drafted** as of 2026-10-29 (grew from 985 on Oct 19 via
  the daily cron, before hitting the Anthropic billing block below). Every
  initiative gets one verdict **per party** (8 parties) — that's why the
  count is large and why `/review` shows the same initiative title
  repeated once per party; this is by design (`CLAUDE.md`'s identical
  per-party treatment rule), not a bug.
- **0 verdicts approved** — review is just starting (queue is now visible
  and working, see bugs below).

**New blocker (2026-10-28 onward): Anthropic billing.** The last several
daily Ingestion runs fail at the topic-tagging step with *"Your credit
balance is too low to access the Anthropic API."* Ingestion itself
(iniciativas/votações) still succeeds — only the two LLM steps are
affected. Needs credits topped up at
[console.anthropic.com](https://console.anthropic.com) → Plans & Billing.
Not urgent (6,192 already-drafted verdicts are plenty to review in the
meantime) but will silently stop new data from being tagged/drafted until
fixed.

GitHub Actions repo secrets `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`,
`ANTHROPIC_API_KEY` are all correctly configured.

## New feature (2026-10-29): per-initiative procedural timeline — backend done, UI not yet built

User asked for a procedural timeline per initiative (Entrada, Admissão,
Baixa comissão, Anúncio, Votação, ...), matching what parlamento.pt's own
`DetalheIniciativa` page shows. openAR has no equivalent field (confirmed
live) — parlamento.pt's own page, already this project's canonical
citation source, is the only source. Shipped so far:

- `pipeline/src/parlamento-client.ts`: `fetchIniciativaFases(id)` scrapes
  the page's `rptFases` repeater into an ordered phase list, plus an
  optional nested committee-parecer detail (date + reason, e.g. a
  "por arrastamento" postponement) some phases carry. Throws on a
  structural mismatch (0 phases from a 200 OK page) rather than silently
  storing nothing, per `CLAUDE.md`'s DRE-scraper halt-on-mismatch
  philosophy; returns `null` (skip, retry next run) on a transient
  network/HTTP failure.
- New table `iniciativa_fases` (migration above, **not yet applied live**).
- `pipeline/src/fases-store.ts` + `ingest-fases.ts` (`npm run ingest:fases
  --workspace=pipeline`): scoped to active iniciativas only (`data_fim is
  null`) with a resolved `canonical_url`; re-scrapes every run until an
  iniciativa concludes, then stops — both scoping decisions were
  explicitly approved by the user. Wired into `.github/workflows/ingest.yml`
  right after canonical-URL resolution.
- Tests: `pipeline/test/parlamento-client.test.ts` (scraper, using real
  confirmed markup shapes) and `pipeline/test/fases-store.test.ts`
  (ingest idempotency, partial-failure tallying, halt-on-total-failure).

**Still pending**: rendering this on `/review` and the public homepage —
not built yet, needs its own follow-up once the migration is applied and
the next ingestion run has populated real `iniciativa_fases` rows to
design the UI against.

(The temporary investigation artifacts from this work —
`pipeline/src/debug-fetch-raw.ts` and `.github/workflows/debug.yml` — were
deleted once the real markup was confirmed; no longer present.)

### Bugs found and fixed during live verification (chronological)

All committed with full detail in their commit messages — worth reading
if debugging something similar. First batch (2026-10-19, getting the
pipeline itself working):

1. `e72f5f1` — `draft:verdicts` was built (backlog 3.3) but never wired
   into `.github/workflows/ingest.yml`, so the daily cron silently never
   drafted verdicts.
2. `9b880a0` — `openar-client.ts`'s `fetchOpenAR` only retried HTTP 429
   responses; a thrown network error (`ECONNRESET`) crashed the whole
   ingestion job instead of retrying like a rate limit does.
3. `87e8577` — `verdict-drafter.ts`'s Batch API `custom_id` used `:` as a
   separator (`iniciativaId:partyLabel`), which violates Anthropic's
   required `^[a-zA-Z0-9_-]{1,64}$` pattern. Switched to `_`.

Second batch (2026-10-29, getting the live site working):

4. `0bee8cb` — Cloudflare's project was set up as **Workers** (not classic
   Pages), which runs `wrangler deploy` after the build — but no
   `wrangler.toml` existed, so Wrangler couldn't tell this was a static
   site or where the build output lived. Added a root-level
   `wrangler.toml` with an `[assets]` block pointing at `web/dist`.
5. (Cloudflare dashboard config, not a code fix) — `PUBLIC_SUPABASE_URL` /
   `PUBLIC_SUPABASE_ANON_KEY` were never added as **build-time** variables
   in the Cloudflare project settings (distinct from Worker runtime
   variables/bindings — Astro bakes these into the JS bundle via
   `import.meta.env` at build time). Without them, `supabase-client.ts`
   throws the instant its module loads in the browser, which silently
   broke *both* the homepage (stuck on "A carregar...") and `/review`'s
   sign-in form (submit button did nothing, zero requests reached
   Supabase) — one root cause, two symptoms.
6. `1a67d80` — `iniciativas` and `party_programs` had Row-Level Security
   **enabled** live, with zero policies ever defined for either table —
   not via any migration in this repo, almost certainly a one-click
   "Enable RLS" toggle in the Supabase Table Editor UI at some point. Both
   tables were always designed to rely on GRANTs alone (same category as
   `votacoes` — see the comment in `20260803000000_digest_drill_down.sql`).
   RLS-enabled-with-no-policy means default-deny for every role but the
   owner, which silently zeroed out `pending_verdicts`' joins: `/review`
   showed "no pending verdicts" despite 6,192 real ones. Fixed by a new
   migration disabling RLS on both tables (also run directly against the
   live DB via SQL Editor, since migrations here aren't auto-applied).

A non-code issue, also from the first batch: the `ANTHROPIC_API_KEY`
GitHub secret was initially saved as `ANTHROPIC_API` (typo).

Also found and explicitly **declined** to build: a "mass-approve the
backlog, flagged as unreviewed by default" feature. Refused per
`CLAUDE.md`'s no-auto-publish constraint — see that file before
reconsidering this.

## Pending account-level steps (only a human can do these)

- [x] **Reviewer account** (`GETTING_STARTED.md` Step 13) — done. Magic-link
  sign-in works at `/review`. Reminder: Authentication → URL Configuration
  → Site URL / Redirect URLs must list the live site's real URL, not
  Supabase's `localhost:3000` default, or magic links redirect nowhere.
- [x] **Cloudflare Workers deploy** (`GETTING_STARTED.md` Step 10) — done,
  after bugs 4–5 above. Live at
  `https://agente-politico.pedro-c-braganca.workers.dev`. Project is named
  `agente-politico` in Cloudflare, under account `Pedro.c.braganca@...`.
- [ ] **Top up Anthropic credits** — see "New blocker" above. Needed before
  the daily cron resumes drafting new verdicts.
- [ ] **Privacy notice contact** (`GETTING_STARTED.md` Step 15) —
  `web/src/pages/privacidade.astro` still has the placeholder
  `[a preencher pelo operador antes do lançamento — ver GETTING_STARTED.md]`.
  Not blocking an internal/stakeholder preview, but must be filled in
  before any public launch.
- [ ] **(Optional)** Cloudflare Web Analytics token (`GETTING_STARTED.md`
  Step 15) — unset, so `Analytics.astro` renders nothing. No tracking
  until deliberately configured.

## Suggested next steps, in order

1. Review and approve a batch of the 6,192 drafted verdicts at `/review`
   (now working) — the public digest stays empty until some are approved.
2. Top up Anthropic credits so the daily cron resumes drafting new ones.
3. Fill in the privacy notice contact before sharing the live URL beyond
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
