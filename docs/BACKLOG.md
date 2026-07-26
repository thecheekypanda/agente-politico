# Starter Backlog — build in this order

Each block below is written to be pasted directly into a GitHub issue (title as the issue title, everything else as the body) or worked through top-to-bottom as a plain checklist with Claude Code — either works. Do them **in order**; later items assume earlier ones exist. Full context/rationale for all of this: `docs/strategy.md`.

Legend — Priority: Must / Should / Could (MoSCoW). Size: S / M / L (T-shirt).

---

## Phase 0 — Scaffold

### [ ] 0.1 Repo scaffold + CI skeleton
**Priority:** Must · **Size:** S · **Depends on:** —

Set up the project structure: frontend app (Astro or Next.js static export), a `/pipeline` directory for ingestion scripts, a `/docs` directory holding `strategy.md` and `BACKLOG.md`, and a GitHub Actions workflow file that runs on a schedule (cron) but does nothing yet beyond a "hello world" step.

**Acceptance criteria:** repo builds and deploys an empty placeholder page to Cloudflare Pages; the scheduled GitHub Actions workflow runs successfully at least once, visible in the Actions tab.

---

## Phase 1 — Ingestion (build and test in isolation before any LLM code)

### [ ] 1.1 Pull iniciativas from openAR
**Priority:** Must · **Size:** M · **Depends on:** 0.1

Fetch `/iniciativas` from `api.openar.pt` on a daily schedule and store the results.

**Acceptance criteria:** running the job twice in a row does not create duplicate rows (idempotent upsert keyed on the canonical initiative ID).

### [ ] 1.2 Pull vote results
**Priority:** Must · **Size:** M · **Depends on:** 1.1

Fetch `/votacoes` per iniciativa (aprovado/rejeitado/unânime) and link each vote to its initiative.

**Acceptance criteria:** every stored initiative that has a recorded vote shows the correct outcome; re-running the job doesn't duplicate votes.

### [ ] 1.3 Cross-check against parlamento.pt Dados Abertos
**Priority:** Must · **Size:** M · **Depends on:** 1.1

For every ingested initiative, resolve and store the canonical parlamento.pt Dados Abertos URL/ID — this, not the openAR ID, is what gets shown to users as the citation.

**Acceptance criteria:** a test asserts every stored initiative has a non-null, resolvable canonical URL.

### [ ] 1.4 Outage / schema-change alerting
**Priority:** Must · **Size:** S · **Depends on:** 1.1, 1.2

If the feed errors, returns an empty payload, or a schema field is missing/renamed, the job should fail loudly (e.g. open a GitHub issue automatically, or post to a webhook) rather than silently ingesting nothing or garbage.

**Acceptance criteria:** deliberately breaking the expected response shape in a test triggers the alert path, not a silent no-op.

### [ ] 1.5 DRE decree-law ingestion (lite)
**Priority:** Should · **Size:** M · **Depends on:** 0.1

Scrape the public DRE portal for new decretos-lei, storing the exact série/número and a permalink. **There is no official DRE API** — do not build against `diariodarepublica.pt/dr/api`, it does not exist (confirmed by direct fetch, redirects to an error page).

**Acceptance criteria:** the scraper asserts the expected page structure (title, série, número, date) before storing anything; if the assertion fails, the job halts and flags for manual review instead of ingesting malformed data.

---

## Phase 2 — Program corpus

### [ ] 2.1 Ingest party program PDFs
**Priority:** Must · **Size:** M · **Depends on:** 0.1

Load each party's official 2025-cycle program PDF (CNE-lodged version), chunk it, and index it by topic for retrieval.

**Acceptance criteria:** given a party + topic, the system returns the relevant program chunk(s) with page/section reference.

### [ ] 2.2 "Not addressed" default
**Priority:** Must · **Size:** S · **Depends on:** 2.1

When retrieval confidence for a party+topic is below a defined threshold, the system must label it "program does not address this" rather than returning a low-confidence guess.

**Acceptance criteria:** a test with a deliberately off-topic query returns the "not addressed" state, not a fabricated match.

---

## Phase 3 — Alignment engine (highest risk — use plan mode before coding)

### [ ] 3.1 Deterministic classification
**Priority:** Must · **Size:** S · **Depends on:** 1.1, 1.2

Classify initiative type and outcome directly from source fields. No LLM involved in this step.

### [ ] 3.2 Closed-list topic-tagging
**Priority:** Must · **Size:** M · **Depends on:** 1.1

LLM assigns each initiative to one topic from a fixed list of ~20–30 (habitação, saúde, fiscalidade, etc.). The model may only pick from the list — never invent a topic.

**Acceptance criteria:** every output topic tag is a member of the fixed list; a test confirms an out-of-list output is rejected/retried.

### [ ] 3.3 Verdict drafting
**Priority:** Must · **Size:** L · **Depends on:** 2.1, 2.2, 3.1, 3.2

Given an initiative and its retrieved program passage, draft a verdict (aligned / partially aligned / contradicts / not addressed) using **one identical prompt template for every party** — the only variables are party name, initiative text, and retrieved passage. Log the exact prompt used, verbatim, for every call.

**Acceptance criteria:** the same prompt template file is used regardless of party (a test should fail if any party-specific branching is introduced); every draft verdict stores its source citation and quoted program passage alongside the label.

### [ ] 3.4 Human review gate
**Priority:** Must · **Size:** M · **Depends on:** 3.3

Build the reviewer interface showing the initiative, the citation, the program passage, and the draft verdict side-by-side, with approve/edit/reject actions. **Build this before wiring anything to a publish action.**

**Acceptance criteria:** there is no code path from a drafted verdict to a public-facing page that doesn't pass through an explicit human approval, logged with reviewer identity and timestamp.

### [ ] 3.5 Methodology audit view
**Priority:** Must · **Size:** S · **Depends on:** 3.3

A page (internal or public) showing the exact prompt template and retrieval logic in use, so an auditor can confirm no party received different treatment.

---

## Phase 4 — Digest & frontend

### [ ] 4.1 Weekly digest generation
**Priority:** Must · **Size:** M · **Depends on:** 3.4

Generate one card per party per week from approved verdicts, in plain PT-PT.

### [ ] 4.2 Digest → source drill-down
**Priority:** Must · **Size:** S · **Depends on:** 4.1

Clicking a card shows the full citation, vote result, and program comparison.

### [ ] 4.3 Search/filter by party and date
**Priority:** Must · **Size:** M · **Depends on:** 4.1

### [ ] 4.4 Public methodology page
**Priority:** Must · **Size:** S · **Depends on:** 3.5

Publish the full methodology (not a summary) — taxonomy, prompt template, confidence threshold — on a permanent, linkable page.

### [ ] 4.5 Accessibility pass
**Priority:** Must · **Size:** M · **Depends on:** 4.1, 4.2, 4.3

WCAG 2.1 AA on the digest, explainer, and methodology pages. Add automated axe-core checks to CI.

---

## Parallel track A — Civic literacy (no dependency on Phases 1–4, start anytime)

### [ ] A.1 Inline glossary
**Priority:** Must · **Size:** S

Clickable glossary terms inline wherever they appear (e.g. "baixa à comissão"), ~25 terms at launch (full list in `docs/strategy.md` §6).

### [ ] A.2 Explainer articles
**Priority:** Must · **Size:** M

~15 launch explainers (how a bill becomes law, AR vs Governo vs Presidência, etc. — full list in `docs/strategy.md` §6).

---

## Parallel track B — Compliance & trust (no dependency on Phases 1–4, start anytime)

### [ ] B.1 Privacy notice + analytics
**Priority:** Must · **Size:** S

GDPR-compliant privacy notice; consent-free or consent-gated analytics (e.g. self-hosted Plausible/Umami), no PII tied to reading behavior.

### [ ] B.2 Correction / right-of-reply mechanism
**Priority:** Must · **Size:** M · **Depends on:** 4.2 (needs a published item to attach the request to)

A form letting anyone submit a correction request tied to a specific published item, with a publicly visible log of requests and resolutions.

---

## Later (v1.1+, deliberately cut from MVP — see strategy doc §8 for rationale)

- Individual deputy profiles / voting history / timeline
- Notifications/subscriptions by party or topic
- Daily (vs. weekly) digest cadence
- Automating DRE ingestion further, or securing an official API/data-sharing arrangement with INCM
- Municipal/autarquia and MEP/European Parliament coverage
- English-language version
- User accounts/personalization
