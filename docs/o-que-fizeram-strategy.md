
# "O Que Fizeram" — Product & Technical Strategy

*Working name kept as proposed. Alternatives worth testing with users: **Promessa & Ato**, **Radar Parlamentar**, **Contas ao Parlamento**, **Voto Feito**. "O Que Fizeram" is direct and already frames the value prop ("what did they do"), so I'd only switch if user testing shows it reads as accusatory rather than neutral.*

## Assumptions (stated per your instruction — proceed, don't stall)

- **Language:** PT-PT only at launch. No English version in MVP.
- **Political scope:** national level only — Assembleia da República activity and Governo decree-laws/resoluções. Autarquias (municipal) and Portuguese MEPs at the European Parliament are out of scope for v1.
- **Current context (verified July 2026):** we're in the **XVII Legislatura** of the AR, elected 18 May 2025 (a snap election), in office since 3 June 2025. The AD coalition (PSD + CDS-PP) holds the largest bloc (91 seats), Chega is second (60 seats), and PS fell to third place for the first time in the democratic era. Seven parliamentary groups sit in this legislature; I'd confirm the exact current roster live via the openAR `/meta` endpoint rather than hardcode it, since by-election replacements and party-switching happen. The government is the **XXV Constitutional Government**, PM **Luís Montenegro** (PSD), heading the AD coalition. **António José Seguro** was elected President on 8 February 2026 (66.8% in the runoff against André Ventura) and took office 9 March 2026, succeeding Marcelo Rebelo de Sousa. [Sources: parlamento.pt, pt.wikipedia.org/XVII_Legislatura, portugal.gov.pt, CNE, RTP/Euronews election coverage]
- **Party program corpus:** use each party's official program as lodged with the CNE for the **2025 legislative election cycle** — that's the mandate currently in force and the one voters most recently endorsed. Re-index if a party publishes a formally revised program mid-term (rare, but it happens around confidence votes or coalition renegotiations).
- **Team size:** solo founder or a very small (1–3 person) team, bootstrapped, not VC-funded — inferred from your "near-zero fixed cost" framing. This shapes the entire backlog: the review bottleneck is human time, not compute.
- **Monetization:** none in MVP. No ads, no paywall on core transparency content. Sustained via minimal infra spend + possible future grants/donations (see Risk Register).
- **Legal posture:** operating informally at launch, not registered as a media outlet — this has GDPR and correction-mechanism implications flagged in the Risk Register.
- **Important correction to your source list:** I checked `https://diariodarepublica.pt/dr/api` directly — it redirects to an error page. There is **no documented official public API** for the Diário da República Eletrónico as of this research; only unofficial third-party scrapers/wrappers exist (e.g. Apify, Parse.bot). This materially changes the ingestion plan for decree-laws (see §4) — I'm treating DRE as a portal to be scraped carefully with strict source-URL citation, not an API to poll, and flagging this as a standing risk (§7). By contrast, **openAR** (`api.openar.pt`) is a real, live, well-documented, MIT-licensed API with exactly the endpoints this project needs (`/iniciativas`, `/votacoes`, `/deputados`, `/comissoes`, `/peticoes`), updated daily, mirroring parlamento.pt's own Dados Abertos — I fetched its OpenAPI spec directly to confirm this. It's a community project, not an official AR channel, so the system of record for citations still resolves back to parlamento.pt's own initiative/vote IDs.

---

## 1. MVP Definition

### Personas

**Cidadão Curioso (primary).** Mid-30s to 60s, votes, reads the news, doesn't trust any single outlet, wants five minutes a week to know "what actually happened" without spin. Zero prior knowledge of legislative procedure.

**Eleitor Empenhado (primary).** Follows one or two issues closely (habitação, saúde, fiscalidade) and one or two parties closely. Wants to know if a party is walking its talk on *that* issue specifically, with proof.

**Jornalista/Investigador (secondary, shapes requirements not UI).** Won't be marketed to in v1, but every citation and methodology page must survive their scrutiny — they're the toughest critic and the best free audit the project will get.

### Core user journeys

1. **Weekly digest scan.** Cidadão Curioso opens the homepage on a Sunday, sees one card per party: "Esta semana, o PS fez X, o Chega fez Y..." in plain language, each tagged aligned/partially aligned/contradicts/not addressed against that party's program.
2. **Verify a claim.** Eleitor Empenhado clicks a card about housing policy, sees the exact AR initiative (number, type, date, link to parlamento.pt), the vote result, the exact program passage quoted side-by-side, and the reasoning for the alignment tag.
3. **Learn a term mid-read.** Either persona hits "baixa à comissão" in a card, clicks it, gets a one-paragraph plain-language explanation inline, with a link to the full explainer if they want more.

### In scope (v1)

- Weekly (not daily) digest, at **party level** (not individual deputy) — national AR activity: iniciativas legislativas tabled, plenary vote outcomes, committee-stage transitions.
- Decree-laws from DRE, at reduced/lite cadence given the no-official-API finding above.
- Program-alignment engine: 4-state label, always with quote + link, always human-reviewed before publish.
- Civic glossary (~25 terms) + explainer articles (~15 topics).
- Basic search/filter by party and date/topic keyword.
- Public methodology page, correction/right-of-reply form.

### Out of scope (v1) — and why that's fine

- **Individual deputy profiles/voting history** — cut because the alignment engine's throughput is gated by human review time, not scraping speed; going party-level first means every review-hour buys more coverage per hour than deputy-level granularity would.
- **Notifications/subscriptions** — nothing to notify about yet until there's a track record of reviewed content; premature before week 1.
- **Municipal/autarquia and MEP data** — different data sources, different program corpus, doubles scope for no proven demand yet.
- **Daily cadence** — same reviewer-bottleneck logic as above; weekly is honest about capacity.
- **User accounts/personalization** — no benefit without the above features to personalize.
- **Full DRE automation** — no official API exists; automating a fragile scraper before validating demand is wasted engineering.

This is the actual justification for the MVP shape: **the bottleneck in this whole system is not code, it's trustworthy human review**, because "no hallucination + human sign-off" is a hard constraint you set. Every cut above is a cut that doesn't yet have enough reviewed, trustworthy content behind it to be worth building UI for.

### Success metrics / KPIs

- **Activation:** % of new visitors reading ≥1 full digest card (not just the headline) per session.
- **Engagement:** week-over-week returning visitor rate; average time on an alignment-detail page (a proxy for "did they actually check the source").
- **Trust signal:** correction requests filed and resolved — track this transparently; a number near zero isn't automatically good, it may just mean no one's scrutinizing yet.
- **Editorial integrity (compliance floor, not an optimization target):** 100% of published verdicts have a logged human reviewer sign-off. No exceptions, ever.
- **Reach:** unique weekly visitors, organic shares/referrals.
- **Cost discipline:** infra spend stays within free tiers up to a defined visitor threshold (see §3 cost table).

---

## 2. Product Backlog

Priority: MoSCoW (Must/Should/Could/Won't-this-round). Size: T-shirt (S/M/L).

| Epic | Story | Priority | Size | Depends on |
|---|---|---|---|---|
| E1. AR Data Ingestion | As the system, I pull new/updated iniciativas from openAR on a daily schedule so digest data stays current. | Must | M | — |
| E1 | As the system, I pull plenary vote results (aprovado/rejeitado/unânime) per iniciativa so I can label outcomes. | Must | M | E1.1 |
| E1 | As the system, I upsert every record keyed by the canonical parlamento.pt ID so re-runs never duplicate. | Must | S | E1.1 |
| E1 | As an engineer, I get an automatic alert if the feed errors, returns an empty payload, or a schema I don't recognize, so outages are caught same-day. | Must | S | E1.1 |
| E1 | As the system, I cross-check every citation against parlamento.pt's own Dados Abertos feed (not just openAR) so the system-of-record is always the official source, not the community mirror. | Must | M | E1.1 |
| E2. DRE Ingestion | As the system, I capture new decretos-lei from the official DRE portal with the exact série/número and permalink, since no official API exists. | Should | M | — |
| E2 | As the scraper, I assert the expected page structure before ingesting, and halt + flag for review if that assertion fails, rather than ingesting malformed data. | Must | S | E2.1 |
| E2 | As an editor, I can manually add a DRE entry the automated capture missed. | Should | S | E2.1 |
| E3. Program Corpus | As an editor, I upload each party's official 2025-cycle program PDF and have it chunked/indexed by topic. | Must | M | — |
| E3 | As the system, I default a topic to "program does not address this" when retrieval confidence is below threshold, rather than inferring a position. | Must | S | E3.1 |
| E4. Alignment Engine | As the system, I classify initiative type and outcome deterministically from openAR/Dados Abertos fields — no LLM involved. | Must | S | E1 |
| E4 | As the system, I topic-tag each initiative into a fixed, closed taxonomy (~20–30 topics) using an LLM constrained to that list only. | Must | M | E1 |
| E4 | As the system, I retrieve the top-matching program passage(s) for a given party+topic via the same retrieval code path for every party. | Must | M | E3 |
| E4 | As the system, I draft an alignment verdict using one identical prompt template per party (only party name/text/passage vary), logged verbatim for audit. | Must | L | E4.3 |
| E4 | As a human reviewer, I approve, edit, or reject every draft verdict before it can publish — there is no auto-publish path. | Must | M | E4.4 |
| E4 | As a methodology auditor, I can view the exact prompt template and retrieval logic used for every party. | Must | S | E4.4 |
| E5. Digest & Publishing | As a reader, I see one weekly card per party summarizing activity in plain PT-PT. | Must | M | E4.5 |
| E5 | As a reader, I click through from a card to full citations and the program comparison. | Must | S | E5.1 |
| E6. Civic Literacy | As a reader, I click an inline glossary term and get a plain explanation without leaving the page. | Must | S | — |
| E6 | As a reader, I read a short explainer on how a bill becomes law in Portugal. | Must | M | — |
| E6 | As a reader, I read explainers on the AR, the Governo, the Presidência, and how they relate. | Must | M | — |
| E7. Frontend | As a reader, I filter the digest by party and date range. | Must | M | E5 |
| E7 | As a reader, I read the full scoring methodology on a permanent, linkable page. | Must | S | E4 |
| E7 | As a reader, I submit a correction/right-of-reply request tied to a specific published item. | Must | M | E8 |
| E7 | As a reader using assistive tech, I can navigate the digest, explainers, and methodology page — WCAG 2.1 AA. | Must | M | E5, E6 |
| E8. Compliance & Trust | As the operator, I publish a GDPR-compliant privacy notice and use consent-free or consent-gated analytics. | Must | S | — |
| E8 | As the operator, I log and publicly track correction requests and their resolution. | Must | M | E7.3 |
| E8 | As the operator, I publish the full methodology (not a summary) so hostile critics can audit it. | Must | S | E4 |
| E9. Observability | As an engineer, I see a dashboard of last-successful-sync time per source, so staleness is visible at a glance. | Should | S | E1, E2 |

**Sequencing:** E1 → E3 → E4 → E5 → E7 is the critical path (can't publish a card without ingestion, program corpus, and a reviewed verdict). E6 (civic literacy) and E8 (compliance) can start in parallel from day one — they don't depend on the pipeline. E2 (DRE) can slip a sprint or two without blocking launch, since it's a "Should" not a "Must." E9 wraps E1/E2 once both exist.

---

## 3. Architecture Proposal

**Pattern:** static-site generation + scheduled batch ingestion + edge functions for search/interactivity. No always-on server. This is the standard shape that makes near-zero-cost civic-tech work.

**Frontend/hosting:** Astro or Next.js (static export) on **Cloudflare Pages + Workers**. I'd pick Cloudflare over Vercel here specifically because Vercel's free Hobby tier is contractually **non-commercial only** — a fuzzy line the moment this project takes donations or grants — while Cloudflare's free tier carries no such restriction in what I found.

**Database:** **Supabase** (Postgres + auth + storage bundled) for MVP — fewer moving parts than assembling Neon + separate auth + separate storage. Watch item: free-tier projects pause after 7 days with zero API requests; the daily ingestion cron itself will touch the DB daily, so this shouldn't bite in practice. If you want a leaner pure-Postgres option later, Neon's serverless autoscaling (100 CU-hours/month free, never expires) pairs well with Cloudflare via Hyperdrive.

**Scheduled ingestion:** **GitHub Actions cron**, running in a **public** repository. Public repos get unlimited free Actions minutes — this sidesteps the private-repo 2,000 min/month cap entirely, and a public ingestion pipeline is itself a transparency asset (anyone can audit exactly how data gets from openAR/DRE into the app).

**LLM layer:** **Claude Haiku 4.5** for the two LLM-touching steps (topic classification against a closed list, and drafting the alignment verdict from an already-retrieved passage) — cheap, and appropriate because retrieval is deterministic and human review is the real safety net regardless of model tier. Use the **Batch API** (50% cheaper) since ingestion is weekly/daily batch, never real-time, and **prompt caching** (90% off cached input) for the fixed instruction/party-program-context portion of every call. Reserve Sonnet 4.6 for spot-audits of ambiguous cases, not routine drafting.

**Search:** Cloudflare D1 (SQLite at the edge, free tier: 5GB storage, 5M rows read/day) or Postgres full-text search via Supabase — either is overkill-proof at MVP volume.

### Cost table

| Tier | Traffic assumption | What's running | Est. monthly cost | Exceeded when |
|---|---|---|---|---|
| **Hobby (MVP)** | <5k monthly visitors, weekly digest, ~50–100 initiatives/week processed | CF Pages/Workers, Supabase free, GitHub Actions (public repo), Haiku batch | **~$5–20/mo** (mostly LLM calls + domain) | Workers free tier exceeded past 100k requests/day; Supabase free exceeded past 500MB DB / 5GB egress / 50k MAU |
| **Growing** | ~50k monthly visitors, near-daily cadence, deputy profiles live (v1.1) | CF Workers Paid ($5/mo base), Supabase Pro ($25/mo), more LLM volume | **~$100–250/mo** | Once DB history (full vote records, deputy timelines) exceeds 500MB and request volume regularly clears 100k/day |
| **Viral** | 500k+ visitors, notifications, press-spike traffic | CF Workers Paid at scale, Supabase Team or Neon Scale, notification service (e.g. Resend/OneSignal), higher LLM volume even with batching/caching | **~$700–2,000+/mo** | This is the point to actively pursue grants/donations — genuinely past "near-zero," and the right response is funding, not more cost-cutting |

Domain registration (~€10–15/year) and a transactional email provider for the correction-form workflow (most have free tiers at this volume) are the only other fixed costs at Hobby scale.

---

## 4. Data Ingestion Plan

| Source | Feeds | Frequency | Dedup/idempotency | Outage/change detection |
|---|---|---|---|---|
| **openAR API** (`api.openar.pt`) | Digest cards, alignment engine base data (iniciativas, votações, deputados, comissões, petições) | Daily (matches openAR's own daily update cadence) | Upsert by canonical `id`/`IniId`/`DepCadId` | Workflow checks HTTP status + non-empty `total`; alert after 3 consecutive failures or an unexplained drop in the legislature's running totals (schema-change canary) |
| **Parlamento Dados Abertos** (XML/JSON) | Canonical citation resolution — every user-facing link resolves to *this*, not to openAR, since openAR is a community mirror | Daily | Dedup by AR's own initiative ID | XML/JSON schema validation as canary; same alerting pattern as above |
| **Diário da República Eletrónico** | Decree-laws / gazette entries | 2–3×/week (deliberately lower cadence — no official API exists, confirmed by direct fetch of the URL you cited, which redirects to an error page) | Dedup by DRE série + número | Scraper asserts expected DOM fields (title, série, número, date) before ingesting; on assertion failure, pipeline halts and flags for human review rather than ingesting silently-broken data. Recommend a parallel track: reach out to INCM about a data-sharing arrangement. |
| **dados.gov.pt** | Secondary catalog discovery, potential future mirror | Weekly | N/A (catalog-level, not record-level) | Low priority; manual spot-check |
| **Portal do Governo (comunicados)** | Narrative context linking government actions to decree-laws | Weekly | Dedup by URL | Manual spot-check |
| **Party programs (CNE-lodged PDFs)** | Alignment engine reference corpus | Once per election cycle; re-indexed only if a party formally revises its program | Versioned by ingestion date + program edition | Manual — this is a static asset, not a polled feed |
| **Presidência / Tribunal Constitucional / CNE** | Civic-literacy content freshness (not core weekly digest) | Monthly / on-demand | N/A | Manual |

---

## 5. Alignment-Scoring Methodology

**Deterministic steps (no LLM, no ambiguity):**
1. Initiative type (Projeto de Lei / Proposta de Lei / Resolução / etc.) — read directly from the openAR/Dados Abertos `tipo` field.
2. Outcome (aprovado / rejeitado / pendente / baixa à comissão) — read directly from vote/event data.

**LLM-assisted steps (constrained, logged, always reviewed):**
3. Topic-tag the initiative into a **fixed, closed taxonomy** (~20–30 policy areas: habitação, saúde, fiscalidade, etc.) — the model may only pick from the list, never invent a topic.
4. Retrieve the top-matching program passage(s) for that party+topic via **the same embedding-retrieval code path for every party** — deterministic, not LLM-driven.
5. Draft a verdict (aligned / partially aligned / contradicts / not addressed) using **one identical prompt template per party**, parameterized only by initiative text, party name, and retrieved passage — template is version-controlled and diffable.

**Where the LLM must never be trusted unchecked:**
- It does not determine vote outcome or bill status — those are already deterministic.
- It does not infer a party's position when the program is silent — below a retrieval-confidence threshold, the system defaults to "program does not address this," full stop.
- It never auto-publishes. There is no code path from LLM output to public page that skips human sign-off.

**Human review loop:** every draft verdict reaches a reviewer showing the initiative text, the program passage, and the draft label side-by-side; the reviewer approves, edits, or rejects. Nothing publishes without this. Reviewer identity and decision are logged.

**Anti-bias safeguards:**
- Identical prompt template per party, stored in version control — any deviation is a diffable, auditable event.
- Optional blind-review pass: reviewer sees "Party A/B/C" during quality-checking, unmasked only after approving, to reduce halo/horn effects.
- Quarterly external audit: an outside civic-tech or journalism-ethics reviewer samples N verdicts per party and checks for asymmetric treatment.
- Rotate which reviewer handles which party over time so no single person becomes the sole gatekeeper for one party's coverage.
- Full methodology published on-site, not summarized — including the taxonomy, the prompt template, and the confidence threshold for "not addressed."

---

## 6. Civic-Literacy Content Plan

**Explainer articles (launch set, ~15):**

Como o Estado português está organizado (poderes legislativo, executivo, judicial); o que é a Assembleia da República e como se elege; o que é o Governo e o Conselho de Ministros; o papel do Presidente da República; o que faz o Tribunal Constitucional; o que faz a Comissão Nacional de Eleições; como nasce uma lei — da iniciativa à publicação no Diário da República; Projeto de Lei vs Proposta de Lei — qual a diferença; o que significa "baixa à comissão"; como funcionam as votações em plenário; o que é um Decreto-Lei e quando o Governo pode legislar sem a Assembleia; o Orçamento do Estado — como é discutido e aprovado; o que são petições e como os cidadãos as podem usar; moções de censura e de confiança — o que significam; como funciona uma coligação de governo (ex.: AD).

**Glossary (launch set, ~25 terms):** Projeto de Lei, Proposta de Lei, Projeto de Resolução, Decreto-Lei, Decreto da Assembleia da República, Baixa à comissão, Discussão na generalidade, Discussão e votação na especialidade, Votação final global, Grupo parlamentar, Bancada, Deputado, Círculo eleitoral, Legislatura, Sessão legislativa, Moção de censura, Moção de confiança, Comissão parlamentar, Relator, Audição parlamentar, Petição, Apreciação parlamentar, Lei de Bases, Veto presidencial, Promulgação, Referendo.

Each glossary term should be clickable inline wherever it appears in a digest card (journey 3 above), not just findable via a standalone glossary page.

---

## 7. Risk Register

| Risk | Mitigation |
|---|---|
| Copyright exposure from party program text | Fair-use/citation-only excerpts; never reproduce full program PDFs; always link to the official source for full text |
| Defamation/reputational disputes from parties over a verdict | Visible correction/right-of-reply mechanism; published methodology; logged human sign-off; conservative "not addressed" default under uncertainty |
| Perceived political bias | Identical prompt template per party; published methodology; quarterly external audit; optional blind review |
| Misinformation/hallucination | No auto-publish path; mandatory citation + quote for every claim; retrieval-grounded LLM only; confidence threshold triggers "not addressed" instead of a guess |
| Source rate-limits or shutdown — especially DRE, which has no official API | Redundant sources (openAR + parlamento Dados Abertos cross-check); documented scraper with structural-change detection that halts rather than ingests garbage; cached historical snapshots; outreach to INCM for official access |
| Funding sustainability past the "Viral" cost tier | Cost tiers documented and monitored; pursue civic-tech/journalism grants (e.g. Google News Initiative, EU civic-tech funding lines, Fundação Calouste Gulbenkian); optional voluntary donations; never paywall core transparency content |
| GDPR/privacy exposure | Minimal or consent-gated analytics (e.g. self-hosted Plausible/Umami); no tracking of individual reading habits tied to PII; clear privacy notice |
| Accessibility non-compliance | WCAG 2.1 AA audit before launch; automated axe-core checks in CI on every deploy |
| Reviewer bottleneck / bus factor | Recruit a small volunteer editorial board early; document the review SOP so it isn't tribal knowledge held by one person |
| Political pressure/retaliation against the project | Transparent methodology as the primary shield; legal review of the correction-mechanism terms; clear, named accountability for the project (GDPR requires a responsible party anyway) |

---

## 8. Phased Roadmap

**v1.1** (first post-launch increment, pulling directly from the MVP's deliberate cuts): individual deputy profiles, voting history, and timeline view; notification/subscription by party or topic; move to daily cadence if reviewer capacity allows; harden DRE ingestion further, or better, land an official data-sharing arrangement with INCM.

**v1.2 / v2:** municipal/autarquia coverage; Portuguese MEP / European Parliament coverage; English-language version for foreign press and diaspora; user accounts and personalization; PWA/mobile push notifications; faceted search across topic, party, and deputy simultaneously.

**v2+:** cumulative term-long "manifesto scorecards" per party across the full legislature; an open API exposing the alignment dataset for journalists and researchers to query directly; partnerships with existing Portuguese fact-checking outlets (e.g. Polígrafo, Observador Fact Check) for cross-validation of verdicts.

---

*Sources consulted for the facts and constraints above: [parlamento.pt Dados Abertos](https://www.parlamento.pt/Cidadania/Paginas/DadosAbertos.aspx), [openAR OpenAPI spec](https://api.openar.pt/openapi.json), [dados.gov.pt API docs](https://dados.gov.pt/en/docapi/), Wikipedia PT — [XVII Legislatura](https://pt.wikipedia.org/wiki/XVII_Legislatura_da_Terceira_Rep%C3%BAblica_Portuguesa), [Eleições presidenciais portuguesas de 2026](https://pt.wikipedia.org/wiki/Elei%C3%A7%C3%B5es_presidenciais_portuguesas_de_2026), [Comissão Nacional de Eleições](https://www.cne.pt/content/eleicao-para-o-presidente-da-republica-2026-2o-sufragio), [portugal.gov.pt](https://portugal.gov.pt/gc25/governo/nomeacoes/primeiro-ministro), plus direct fetches of `diariodarepublica.pt/dr/api` (confirmed non-existent) and `api.openar.pt/openapi.json` (confirmed live), and current (July 2026) pricing pages/aggregators for Cloudflare, Vercel, Supabase, Neon, GitHub Actions, and the Claude API.*
