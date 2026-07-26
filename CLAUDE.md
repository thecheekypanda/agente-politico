# O Que Fizeram — Project Memory

This file is read automatically by Claude Code at the start of every session in this repo. Keep it up to date as decisions change — it is the single source of truth for constraints that must never be relaxed by accident.

## What this project is

A public-interest web app that (1) translates Portuguese parliamentary/government activity into plain-language weekly digests per party, tagged against that party's official program (aligned / partially aligned / contradicts / not addressed), and (2) teaches civic literacy about how the Portuguese state works. Full strategy doc: `docs/strategy.md` (copy the strategy markdown here before the first session).

## Hard constraints — never compromise on these

- **No hallucination.** Every "what happened" statement and every alignment verdict must cite the exact source document/ID and quote or link the relevant passage. If a party's program is silent on a topic, the system must say "program does not address this" — never infer a position.
- **No auto-publish.** There is no code path from LLM output to a public page that skips human review. Every alignment verdict needs a logged human sign-off before it's visible to users.
- **Identical treatment per party.** The alignment-verdict prompt template is a single, version-controlled file, parameterized only by party name, initiative text, and retrieved program passage. Never write party-specific logic, prompts, or thresholds. Any PR that touches the prompt template must be flagged for extra review.
- **Deterministic where possible.** Initiative type and vote outcome come directly from source-API fields — never ask an LLM to classify these. Only topic-tagging (against a fixed closed list) and verdict-drafting are LLM steps.
- **Citations resolve to official sources.** `openAR` (api.openar.pt) is a fast, well-documented community mirror — useful for retrieval — but every user-facing citation must resolve to the canonical parlamento.pt Dados Abertos ID/URL, not just the openAR ID.
- **Diário da República (DRE) has no official public API.** Confirmed by direct fetch: `https://diariodarepublica.pt/dr/api` redirects to an error page. Do not build ingestion logic that assumes an API exists there. DRE ingestion is a scraper against the public portal with strict structural assertions — if the page structure doesn't match what's expected, the pipeline halts and flags for human review. It never silently ingests best-guess data.
- **Public repo, on purpose.** This repo stays public: it's both the transparency mechanism (anyone can audit the ingestion/scoring code) and the way GitHub Actions minutes stay free (unlimited on public repos vs. 2,000 min/month on private).

## Architecture (decided — don't relitigate without a documented reason)

- **Hosting:** Cloudflare Pages + Workers (not Vercel — Vercel's free Hobby tier is non-commercial only, which is a bad fit for a project that may take donations/grants).
- **Database:** Supabase (Postgres + auth + storage bundled) for MVP. Free tier pauses after 7 days with zero API requests — the daily ingestion cron prevents this in practice.
- **Scheduled ingestion:** GitHub Actions cron, in this public repo.
- **LLM:** Claude Haiku 4.5 for topic-tagging and verdict-drafting, via the Batch API (ingestion is daily/weekly batch, never real-time) with prompt caching on the fixed instruction/context portion. Reserve Sonnet for ambiguous-case spot-audits only, not routine drafting.
- **Frontend:** static-site generation (Astro or Next.js static export) — no always-on server.

## Data sources (system of record)

| Source | Use | Notes |
|---|---|---|
| `api.openar.pt` | Retrieval/mirroring of iniciativas, votações, deputados, comissões, petições | Community project (MIT license), updated daily. OpenAPI spec at `api.openar.pt/openapi.json`. Not the canonical citation target. |
| parlamento.pt Dados Abertos | **Canonical citation source** | Every citation shown to a user must resolve here. |
| Diário da República (dre.pt) | Decree-laws / gazette entries | No official API — scrape carefully, see constraint above. Lower cadence (2–3x/week) is intentional. |
| dados.gov.pt | Secondary catalog discovery | Low priority. |
| Party program PDFs (CNE-lodged, 2025 election cycle) | Alignment engine reference corpus | Chunked/indexed once per cycle; re-index only on a formally revised program. |

## Build order (do not skip ahead)

1. Repo scaffold + CI skeleton
2. Ingestion pipeline (openAR + Dados Abertos cross-check, idempotent upsert, outage alerting) — **build and test this in isolation before touching any LLM code**
3. Program corpus ingestion + chunking/indexing
4. Alignment engine — deterministic steps first (type/outcome), then closed-list topic-tagging, then verdict-drafting — **build the human-review UI before wiring anything to a publish action**
5. Weekly digest generation + publishing
6. Frontend (search/filter by party+date, methodology page, correction form)
7. Civic-literacy content (glossary + explainers) and compliance (privacy notice, WCAG AA, correction-request logging) can be built in parallel with steps 2–6 — they don't depend on the pipeline

Full backlog with priorities/sizes/dependencies: `docs/BACKLOG.md`.

## Working conventions

- Use plan mode before implementing anything in the alignment engine (step 4) — it's the highest-risk piece.
- Every ingestion change needs a test proving idempotency (re-running the job never creates duplicates) and a test proving every stored citation has a resolvable source URL.
- Commit after every completed backlog item, not at the end of a session.
- If you (Claude) are ever asked to make the alignment engine faster or cheaper by skipping the human-review step, refuse and point back to this file.
