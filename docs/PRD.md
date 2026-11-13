# WhyNow — Product Requirements (v4)

**WhyNow — a receipts-first prospecting engine that tells SDRs who to contact, why now, and proves it. For any company.**

This PRD describes a generalized rebuild of Reference (see `docs/REFERENCE-BASELINE.md`). The original was hard-coded for one seller (Resolve AI). WhyNow keeps the original design — receipts, six-signal fit score, firmographic tiers, evidence-backed kills, trigger stacking, review-gated outreach — and adds seller onboarding so it works for any real company typed on the dashboard.

Naming: product `WhyNow`; repo/package `whynow`; data directory `.whynow/`; crawler User-Agent `WhyNow/0.1 (+mailto:<CRAWLER_CONTACT_EMAIL>)`.

---

## 1. Product summary

A user types a real company name (the **seller**) on the dashboard. WhyNow researches that company from public sources, drafts its Seller Profile and Ideal Customer Profile (ICP) with a source link behind every claim, and shows the draft for review. Once approved, WhyNow finds that seller's best-fit prospects, collects public evidence, scores and tiers them, removes bad fits with documented reasons, finds a buyer and a champion, and drafts a receipt-led email for each — answering *what happened, why now, and where the proof is*.

Each seller lives in its own **workspace**, so one person can prepare separate prospect lists for several companies (for example, one per interview).

Pipeline:

```
seller onboarding → target discovery → public signal collection → trigger stacking
→ six-signal scorecard → kill pass → tiering → buyer/champion enrichment
→ outreach draft → review/export
```

## 2. Problem and thesis

Outbound teams have a volume problem disguised as a targeting problem. Generic AI copy makes inboxes noisier, and bought intent data is hard to verify. The scarce asset is verifiable, time-stamped public evidence that a company needs what the seller sells — caught early, dropped when weak, and handed to a human only when a real person is contactable. Model: **AI prepares, human sends.**

The same discipline applies to understanding the seller: the ICP is built from the seller's own public materials, not guessed.

## 3. Users and roles

| Role | Job | Surfaces |
|---|---|---|
| `admin` | Create and approve seller workspaces; edit ICP, weights, SLAs; manage integrations; review metrics | Everything: Workspaces, Seller Profile review, Discovery, Scorecard, Collectors, Runs, Funnel, Metrics, ICP Studio, Exports, Integrations, Settings, Build-watch |
| `sdr` | Work a ranked daily queue in the active workspace; draft in under 60 seconds; log outcomes | Workspace switcher, Today, Accounts, History, Kill Log (read-only) |

## 4. Product rules (non-negotiable)

1. **Receipts, not vibes.** Every prospect signal and every Seller Profile claim carries a source URL. No URL → inferred, greyed, low confidence. Inferred evidence can never make a prospect Tier 1; inferred seller claims can never appear in an email.
2. **Never invent data.** No fabricated companies, contacts, customers, proof points, metrics, or evidence. Empty results are reported as zero. No synthetic ACV/CAC/expected-value fields.
3. **Public data only, politely.** robots.txt, rate budgets, caching, identifying User-Agent; no login/CAPTCHA/anti-bot bypass; no LinkedIn/Facebook messaging automation; official JSON endpoints preferred.
4. **Kills are retained decisions** with code, reason, and evidence.
5. **Human review gates output.** A generated Seller Profile must be approved before discovery runs; drafts must be approved before copy/send; CRM sync and export are gated.
6. **No sending on behalf of a company you don't represent.** Delivery is off per workspace until the user attests they are authorized by that seller (FR-11).
7. **Workspace isolation.** Accounts, contacts, suppression, drafts, outcomes, and metrics never leak between workspaces.
8. Private context is runtime-only; secrets only in environment variables; verify before claiming done.

## 5. Core concepts

| Concept | Definition |
|---|---|
| Workspace | One seller: its profile, ICP config, accounts, runs, contacts, suppression list, drafts, outcomes, metrics. Switched from the header. |
| Seller Profile | Grounded facts about the seller (what it sells, to whom, proof, customers, competitors), every field with receipts. |
| ICP config | The seller-specific rules the engine runs on: segments, signal definitions, trigger mapping, kill patterns, personas, weights, SLAs, tier rules. Generated from the Seller Profile, then reviewed. |
| Reference profile | A built-in Resolve AI profile that reproduces the original Reference configuration. Used as a regression fixture and example, never as a default seller. |

## 6. The generalized model

### 6.1 Six signal slots

Same keys and default weights as the original. Labels and evidence rules come from each workspace's ICP config.

| Key (unchanged) | Generic meaning | Default weight | Original label |
|---|---|---|---|
| `techStack` | **Environment fit** — the prospect uses the technologies, systems, or processes the product plugs into | 1.3 | Tech Stack |
| `activePain` | **Active pain** — fresh public evidence of the problem the product solves | 1.2 | Active Pain |
| `revenueSensitivity` | **Impact sensitivity** — how costly the problem is for this prospect | 1.1 | Revenue Sensitivity |
| `observabilityScale` | **Operational scale** — size/maturity of the function the product serves | 1.0 | Observability Scale |
| `aiCompatibility` | **Adoption readiness** — signals that the prospect adopts this kind of product | 0.9 | AI Compatibility |
| `competitiveWedge` | **Competitive wedge** — nearest real seller customer (direct rival > category twin > same-vertical peer), or a documented competitor-displacement opportunity | 0.8 | Competitive Wedge |

Each slot definition in the ICP config:

```json
{ "label": "", "description": "", "evidenceKeywords": [], "negativeKeywords": [],
  "preferredSources": [], "rubric": { "1": "", "3": "", "5": "" } }
```

### 6.2 Trigger library

| Trigger | Type | Default strength / SLA (days) |
|---|---|---|
| `form_d_filing` | Universal | 3 / 14 |
| `funding` | Universal | 3 / 30 |
| `exec_change`, `executive_departure`, `new_account_with_warm_champion`, `old_account_inherited_pain` | Universal (titles from the profile's personas) | 3 / 30 |
| `hiring_surge` (≥ 3 relevant reqs in 30 days) | Universal (role keywords from profile) | 2 / 45 |
| `first_function_hire` (first/founding role in the served function) | Universal | 2 / 45 |
| `headcount_surge` (> 15% per quarter) | Universal | 2 / 45 |
| `risk_factor_added` (public filings mention the problem) | Universal (keywords from profile) | 2 / 120 |
| `pain_event` (outage, breach, compliance action, etc. — per profile) | Seller-parameterized | 3 / 30 |
| `public_postmortem` / `public_pain_writeup` | Seller-parameterized | 3 / 30 |
| `buying_intent_hiring` (a req that describes the seller's product category) | Seller-parameterized | 3 / 60 |
| `function_hiring` (relevant roles open) | Seller-parameterized | 2 / 90 |
| `internal_tool_maintenance` (req to maintain an in-house alternative) | Seller-parameterized | 2 / 90 |
| `tech_adoption` (adopting a technology the product plugs into) | Seller-parameterized | 1 / 90 |
| `competitor_adoption` (public evidence they use a named competitor) | Seller-parameterized | 1 / 120 |
| `conference_talk` | Universal (topics from profile) | 1 / 120 |
| (default) | — | 1 / 90 |

Stacking multiplier by number of live trigger types: 0–1 → 1.0×; 2 → 1.5×; 3+ → 2.0×. Named 2.5× pairs: funding/Form D + executive change; `buying_intent_hiring` + any other type.

The Resolve reference profile maps: outage → `pain_event`, ai_rca_hiring → `buying_intent_hiring`, reliability_hiring → `function_hiring`, otel_adoption → `tech_adoption`.

### 6.3 Kill codes (precedence order)

1. `KILL_EXISTING_CUSTOMER` — on the seller's public customer list.
2. `KILL_IS_SELLER_OR_COMPETITOR` — the seller itself, a subsidiary, or a named competitor.
3. `KILL_UNSELLABLE_ORG` — verified prospecting constraints.
4. `KILL_SOLVING_IN_HOUSE` — public evidence they built their own version (patterns from profile).
5. `KILL_BUILD_CULTURE` — strong build-and-open-source reflex in the product's domain (patterns from profile).
6. `KILL_BELOW_ICP_SIZE` — verified size of the served function below the profile's floor (metric and label from profile; default 200 engineers), only when a size receipt exists.

Every kill = `{code, reason, evidenceUrl, evidenceText}`. A kill missing any of these throws. First kill is primary; others go in `alsoKilledBy[]`. Parking is expressed through tier, never as a kill.

## 7. Functional requirements

### FR-1 Workspaces

- Create, rename, archive, and switch workspaces; the header shows the active seller's name.
- Statuses: `draft` (researching), `needs_review`, `active`, `archived`. Discovery, collectors, and the SDR queue run only for `active` workspaces.
- A global company cache (firmographics, ATS slugs, status URLs, public receipts) may be shared across workspaces because it is public data. Scores, kills, contacts, suppression, drafts, and outcomes are per workspace.
- Per-workspace budgets: max Serper queries per run, max LLM calls per onboarding, max paid enrichments per day.

### FR-2 Seller onboarding

1. **Input:** company name, optional website. If ambiguous, show up to 5 candidates (name, domain, one-line description, source link) and require a pick. The chosen domain is canonical.
2. **Research job** (background, progress shown, target < 3 minutes), through the collector runtime:
   - Fetch the seller's homepage, product/solutions, pricing, customers/case studies, about, and careers pages (robots-respecting; discover links from homepage and sitemap; cap `ONBOARDING_MAX_PAGES`, default 20).
   - Serper queries: `"{seller}" customers`, `"{seller}" case study`, `"{seller}" alternatives`, `"{seller}" vs`, `"{seller}" raises`, `"{seller}" hiring`.
   - The seller's own ATS board (reveals ICP language); SEC filings if public.
   - Store every fetched page as a source record `{id, url, fetchedAt, contentHash, title, text}`.
3. **Synthesis:** OpenAI with a strict JSON schema produces the draft Seller Profile (7.2.1) and ICP config (7.2.2) from source excerpts only. Every factual field returns `{value, sourceId, evidenceQuote}`. The server verifies `evidenceQuote` is an exact substring (after whitespace normalization) of that source; failures become `inferred: true`. Customer names are accepted only from the seller's own site or a first-party case study/press release.
4. **Review screen:** every field shown with its receipt link; inferred fields greyed with a warning; inline editing; add/remove segments, personas, keywords, competitors, customers (each added customer needs a URL). **Approve** → workspace `active` + audit event.
5. **Refresh:** a monthly re-research job produces a diff (new customers, competitors, positioning changes) that requires approval; never auto-applied.
6. **Fallback:** without an OpenAI key, a manual profile form with the same fields and URL requirements.

#### 7.2.1 Seller Profile schema

```json
{
  "sellerName": "", "domain": "", "category": "", "productOneLiner": "",
  "valueProps": [], "proofPoints": [{"claim": "", "sourceUrl": "", "evidenceQuote": ""}],
  "credentials": [], "customers": [{"name": "", "domain": "", "sourceUrl": ""}],
  "competitors": [{"name": "", "domain": "", "sourceUrl": ""}],
  "pricingModel": "", "targetCompanySize": "", "targetIndustries": [],
  "deliveryAllowed": false, "authorization": {"attestedBy": "", "attestedAt": ""},
  "generatedAt": "", "approvedAt": "", "sources": []
}
```

#### 7.2.2 Generated ICP config schema

```json
{
  "segments": [{
    "key": "", "label": "", "enabled": true, "subIndustries": [],
    "queryTemplates": ["4-8 items"], "revenueSensitivityBase": 3,
    "wedgeCustomers": [], "exampleTargets": [{"name": "", "domain": "", "sourceUrl": ""}]
  }],
  "personas": {"buyerTitles": [], "championTitles": [], "wrongOrgTitles": []},
  "signalDefinitions": {"techStack": {}, "activePain": {}, "revenueSensitivity": {},
                        "observabilityScale": {}, "aiCompatibility": {}, "competitiveWedge": {}},
  "triggerMapping": {"painEventKeywords": [], "buyingIntentRolePatterns": [],
                     "functionRoles": [], "techAdoptionTechnologies": [], "competitorNames": []},
  "killPatterns": {"solvingInHouse": [], "buildCulture": [],
                   "sizeMetric": {"label": "engineers", "floor": 200}},
  "painSources": {"statuspage": false, "hn": true, "news": true, "filings": true},
  "transactionalUrgency": {"transactionGoneKeywords": [], "customerReturnsKeywords": []},
  "pitch": {"oneSentenceProduct": "", "credentialLine": "", "ctaStyle": ""},
  "objectionTemplates": ["3 items"],
  "weights": "defaults from 6.1",
  "slaDays": "defaults from 6.2",
  "tierRules": "defaults from FR-6"
}
```

Constraints: 3–10 segments; 4–8 query templates per segment; keyword lists de-duplicated and length-capped. Collectors that don't apply to a seller (e.g. status pages for a non-reliability product) are disabled for that workspace and displayed as disabled.

### FR-3 Discovery (ICP-driven, per workspace)

- Universe per segment: provenance-backed seeds `{name, domain, segment, sizeBand, provenanceUrl}`. Initial seeds come from the generated segments' category searches and competitors' public customer lists. Never invent a seed to hit a count.
- Query fan-out: segments × task types (`category_index`, `ats_directory`, `funding_news`, `competitor_customers`) × sub-industries, with rotating cursors and freshness windows (day/week/month/year) so consecutive runs don't repeat. Cap 150 Serper queries per run (configurable per workspace).
- The search builder only narrows (geography, sub-industry, size band, keyword include/exclude, freshness). No free-text query drives the crawl.
- Every candidate passes:
  - **Noise gate** — publisher/aggregator blocklist, headline-fragment detector, generic-phrase rejection, "no real company name → not an account." Rejections are counted.
  - **Entity resolution** — normalized name, root and alias domains, `aliases[]`, parent link.
  - **Segment classification** — validated against the company, using the workspace's segments; low confidence → `unclassified` + review flag.
  - **Auto-triage** — clean candidates enter; unclassified/low-confidence are parked; humans review only edge cases (standing review queue < 20).
- Persisted funnel per run: raw → noise-gated → new canonical → receipted → queue-ready, plus watched triggers, kills, biggest drop-off, and expansion suggestions. Zero is reported as zero.
- **Watchlist:** every known account in an active workspace is monitored; a new trigger on a known account is a new lead event.
- Runs are background jobs with status polling (worker bound ~170 s per chunk; long runs chunked).

### FR-4 Collectors

- **Shared runtime:** refuses all requests without a valid `CRAWLER_CONTACT_EMAIL`; identifying User-Agent; HTTPS-only SSRF guard (blocks localhost, `.local`, private/link-local IP literals, credentials in URLs); per-source budgets (max requests per run, min interval, timeout) and cache TTLs; robots.txt check for arbitrary sites; atomic cache files under `.whynow/collector-cache/`; per-source health.
- **Per-account collectors**, parameterized by the workspace ICP config:
  - pain — Statuspage JSON (when `painSources.statuspage`), HN Algolia, Google News RSS, Serper with `painEventKeywords`
  - hiring — Greenhouse, Lever, Ashby public APIs (slug discovered once and cached); function roles, buying-intent patterns, named technologies
  - environment — company/engineering blogs
  - adoption readiness
  - competitive wedge — profile customers; competitor-usage evidence
  - impact sensitivity — segment base + transactional-urgency keywords
  - executive change — persona titles
  - GitHub monitor — optional, technical sellers only (`GITHUB_ENABLED`)
- **Global collectors:** EDGAR Form D and risk factors (`EDGAR_ENABLED`, no key; keywords from each active workspace), conference speakers, OpenTelemetry contributors (only when relevant).
- **Evidence normalization:** stable hashed IDs; stripped HTML; URL-less evidence forced to inferred; evidence attributed to a company only by domain match or whole-word name match.
- **Event attribution:** the prospect's own event vs upstream/third-party vs unknown. Only the prospect's own events are citable; unknown ones need one-click operator verification.
- A zero-target run is valid; disabled collectors display as disabled, never as "ran."

### FR-5 Six-signal fit score

- Signal shape: `{score 1–5, evidenceUrl, evidenceText, inferred, observedAt, confidence?, metadata}`.
- Slot score comes from the slot rubric plus keyword matches in receipted evidence (deterministic). An optional LLM classifier may propose a score but must return a quote from the evidence, which is validated.
- `fitScore = round(100 × Σ(score × weight × confidence × recency) ÷ (5 × Σweights))`. With default weights Σ = 6.3.
- Source confidence: prospect's own domain 1.0; Statuspage/Greenhouse/Lever/Ashby 0.9; Reuters/Bloomberg/TechCrunch/Business Wire/PR Newswire/GlobeNewswire 0.8; other URL 0.7; no URL 0.2–0.4.
- Recency (Active Pain only): 1.0 up to 12 months; 0.5 up to 24 months; 0.25 after.
- Outputs: `fitScore`; `fitBand` (≥ 70 strong, ≥ 40 moderate, else weak); `fitConfidence` and band (≥ 0.8 high, ≥ 0.55 mixed, else mostly-inferred); receipted-signal count; `liveTrigger` (pain/function trigger within 90 days, editable 1–365); a per-signal breakdown whose formula text reconciles to the total.
- Impact sensitivity: "transaction gone" keywords keep or raise the segment base; "customer returns" keywords cap it one level below base.
- Weights editable per workspace (0.1–3).

### FR-6 Firmographics and tiering

- Profile: `revenueEstimate`/`revenueBand`, `employeeCount`, `fundingStage`, `totalRaised`, `valuation`, `geography`, `isPublic`, `foundedYear`, `confidence`, `source`, per-field source URLs, `asOf`. History is appended, never overwritten.
- Providers, free first: search, Apollo organization enrichment, Wikidata. People Data Labs only for low-confidence companies, behind `ENABLE_PAID_FIRMOGRAPHICS` + `PDL_API_KEY`, with a monthly cap. Concurrency 6; jobs of ~20 companies; 7-day cache.
- Default tier rules (editable per workspace; the generator may propose different thresholds for SMB/mid-market sellers, with a stated reason):
  - **Tier 1:** public company, or revenue ≥ $500M, or ≥ 2,000 employees, or valuation ≥ $5B.
  - **Tier 2:** revenue ≥ $25M, or ≥ 150 employees, or Series A–D / growth / private equity.
  - **Tier 3:** ≤ 149 employees, early stage, and ≥ $2M raised or verified domain complexity.
  - **Parked:** otherwise; unclassified segment → parked.
- **Provisional** when confidence < 0.7, fewer than 3 known fields, Wikidata-only, or seed size-band fallback. Provisional tiers stay queue-eligible with a dampener.
- Every tier stores `tierReason`, evidence source, and receipt. Tier is independent of fit.

### FR-7 Kill engine

Per section 6.3, evaluated after scoring and tiering. A Kill Log per workspace shows tier, fit, code, reason, and evidence link.

### FR-8 Triggers, SLAs, priority

- Trigger shape: `{type, detectedAt, occurredAt?, evidenceUrl, decaysAt, strength}`. Library and SLAs per 6.2, editable per workspace.
- Detectors: Form D daily (matched to watched accounts; unmatched keyword hits become review-only candidates); executive-change sweeps; headcount surge from firmographic history; ≥ 3 new relevant reqs in 30 days → `hiring_surge`; first function/founding req → `first_function_hire`.
- Priority = `tierWeight (3/2/1/0) × fitScore/100 × freshness (1.25 with a live trigger) × stackMultiplier × provisionalDampener (0.85–1.0) × optional quote nudge (default 1.08, max 1.25)`, normalized by the ceiling 9.375. Killed → 0. The formula string is stored and shown.
- Expired receipts stop contributing immediately; cards show SLA countdown chips.
- A strength-3 trigger creates a "draft it" action only for accounts in `engaging`, `working`, `meeting_held`, or `opportunity`.

### FR-9 SDR surface

- **Today** (active workspace): ranked queue-ready accounts; each card shows company, tier badge, fit + confidence band, **why-now sentence**, trigger chips with SLA countdowns, wedge line, contact status, Open and Skip (skip requires a reason). Header strip: queue-ready, contacted/drafts approved today, meetings this week. Honest empty state linking to the funnel.
- **Account work view** (single column, work order): why-now → receipts (each linked; inferred greyed) → score breakdown → buyer and champion cards → editable draft → objection sheet + call plan → actions (Approve, Copy email, Mark contacted, Skip with reason; Send only in Live mode).
- **Accounts:** one table with filters (stage, tier, fit band, segment, needs-review, killed) and inline review actions.
- **History:** append-only outcomes with snapshots.
- **Admin pages:** Overview (hero stats: 7-day bar chart, gauge, KPIs; kanban discovered → tiered → enriched → approved → contacted), Discovery, Scorecard (matrix, weights, Tier × Fit tab), Kill Log, Collectors, Runs, Funnel, Metrics, ICP Studio, Exports, Integrations, Settings, Build-watch, Workspaces, Seller Profile review.
- Why-now narratives cite only facts the account carries; thin evidence says "limited public signal — verify before outreach."
- Navigation: `sdr` sees Today, Accounts, History, Kill Log; `admin` sees everything.

### FR-10 Contacts

- Buyer and champion slots from the workspace personas; missing slots shown as unresolved.
- Apollo People API Search first (no credits); paid person matches only with `APOLLO_PAID_ENABLED=true`, capped per action (default 2).
- PhantomBuster optional, with safeguards: merge saved agent arguments before launch, read the specific launch container's results, filter people to the target company, surface real failure reasons.
- Auto-coverage worker: every 15 minutes, daily cap 20, batch 3, never sends.
- **Verified contact** = valid email + buyer or champion + confidence ≥ 0.7 + provenance (provider attribution or source URL) + not suppressed/opted out. `wrongOrgTitles` are excluded with a reason.
- Every enrichment writes an audit event with provider attribution.

### FR-11 Outreach and delivery

- **Draft (~90 words):** receipt-led opener about the prospect → seller one-liner → proof/credential (only approved, receipted Seller Profile claims) → time-boxed CTA. Also a three-part objection sheet and a permission-based call plan. OpenAI when configured; deterministic template fallback otherwise.
- Context from receipts only; a verbatim quotebook (≤ 200 chars, cut on token boundaries, usable flag, citation status).
- **Validator hard gates:** invented money-per-time arithmetic (e.g. "$25,000 per minute"), ungrounded prospect claims, unapproved or inferred seller claims, uncited receipts, CTA/awareness mismatch. A failing draft cannot be approved.
- **Queue-ready** = not killed / suppressed / opted out / archived / rejected / compliance-blocked + classified segment + Tier 1–2 (Tier 3 behind a filter) + fit ≥ 50 + ≥ 1 verified contact + validated draft. Failure codes: `BLOCKED`, `UNCLASSIFIED`, `TIER`, `FIT`, `CONTACTLESS`, `DRAFT_BLOCKED`.
- **Delivery modes (per workspace):**
  - **Demo (default):** drafts are generated, reviewed, and copyable, labeled "Draft — not sent." No send code path exists.
  - **Live:** only after the admin attests "I am employed by or authorized by {seller} to send email on its behalf" (name, date, audit event) and Instantly is fully configured (API key, campaign ID, webhook secret, physical-address and unsubscribe confirmations). Before each push, recheck kill, suppression, opt-out, SLA, duplicates, and the daily cap (default 50).
- Copy fallback creates one idempotent record; **Mark contacted** only after a real manual send; authenticated Instantly webhooks append outcomes; unsubscribes suppress immediately.
- HubSpot: per-account, review-gated sync with tier, fit, triggers, and receipt URLs. CSV export: compliance-gated, placeholder emails filtered.

### FR-12 Lifecycle, outcomes, learning

- Ten account states: `identified`, `researching`, `engaging`, `working`, `meeting_held`, `opportunity`, `building_internally`, `dormant`, `closed_lost`, `closed_won`.
- Append-only transitions with operator reasons; touch ledger (only delivered messages count as touches); guards (`working` needs two real mapped contacts; closed states need an outcome record); decay deadlines (working 4, engaging 7, meeting_held 5, opportunity 7, dormant 30 days).
- Build-watch: in-house/build-culture kills → `building_internally` with a six-month fuse and a 14-day recheck.
- Outcomes: `contacted`, `replied`, `meeting`, `demo_booked`, `won`, `lost`, `bad_fit`, `skipped` — append-only with tier/fit/trigger/receipt snapshots.
- Weight suggestions only after ≥ 3 positive and ≥ 3 negative outcomes; admin Apply/Dismiss; never auto-applied.
- Nightly re-score (checked hourly): pain decay, promotions/demotions, stale Tier 1 flags, staleness indicators (fresh < 7 days, aging < 30 days, stale).
- Tracked people (settings CRUD) produce movement signals; new accounts are created only with a matching non-publisher domain.

### FR-13 Configuration

Per workspace, editable without a deploy: Seller Profile, all ICP config fields, weights, live-trigger window, tier thresholds, SLAs, budgets, delivery mode. Saving validates, rebuilds discovery sources, re-scores the workspace, and appends an audit event.

## 8. Non-functional requirements

| Area | Requirement |
|---|---|
| Stack | Node 22, CommonJS, built-in `http`; no web/ORM/front-end framework; deps limited to `pg`, `robots-parser`, `@clerk/backend`, `@aws-sdk/client-s3`, a self-hosted font; `vitest`. OpenAI via `fetch`. New deps need approval. |
| Layout | `scripts/server.cjs` entry; `scripts/server/{state,router,pages,actions,styles}.cjs`; domain modules in `scripts/`; `scripts/collectors/`; `scripts/onboarding/`; `tests/`. |
| UI | Server-rendered HTML; event delegation; `<main>` swap; one token layer, no `!important`; self-hosted font at `/fonts/`; inline SVG; WCAG contrast; works at 1280 px and 768 px without horizontal body scroll. |
| Latency | Anything over ~60 s is a background job with status polling. Onboarding target < 3 min; first discovery run < 5 min with progress. |
| LLM use | JSON-schema output validated; every factual field grounded by exact-substring quote checks; prompts and model versioned; per-workspace call caps; responses cached by prompt version + input hash; no secrets and minimal contact data sent. |
| Durability | Local atomic JSON at `.whynow/local-state.json` with `.bak`. Production Postgres only, checksum-verified on startup and every write, daily pre-write snapshot, no silent JSON fallback. Migrations back up first, idempotent, dry-run, verify counts. |
| Backups | Nightly AES-256-GCM client-side encryption to S3-compatible storage, immediately downloaded, decrypted, and count-verified. |
| Auth | Production: Clerk + Google only; roles `admin`/`sdr`; admin TOTP required; 7-day max / 24-hour idle sessions; fail-closed startup. Local development: in-process local-admin identity, never in production. |
| Security | Permission map on every route including workspace scope; same-origin POSTs; 30 actions/min sliding-window limiter; security headers (CSP, HSTS, frame-deny, nosniff, referrer policy); input validation; generic error pages; hash-chained audit log with workspaceId; secrets only in env; gitleaks + `npm audit` in CI. |
| Privacy | Suppression/opt-out per workspace; forget company; 12-month retention for stale non-killed accounts; `docs/DATA-HANDLING.md`. |
| Ops | `/health` (state readable, audit chain intact, workers healthy) and `/ready` (503 until configured); jittered non-overlapping scheduler across active workspaces; Slack alerts (deduped, redacted); external uptime check every 15 min; demo preflight command. |
| Quality | Tests green at every commit; Resolve reference profile reproduces the original scoring on fixtures; recorded-fixture tests for onboarding; no live network or LLM in tests. |

## 9. Integrations and environment

See `.env.example` for the full list.

| Integration | Env vars | Needed for a working demo? |
|---|---|---|
| Crawler identity | `CRAWLER_CONTACT_EMAIL`, `CRAWLER_USER_AGENT`, `SCHEDULER_ENABLED` | **Yes** |
| Serper | `SERPER_API_KEY` | **Yes** (research + discovery) |
| OpenAI | `OPENAI_API_KEY`, `OPENAI_MODEL` | **Yes** for automatic onboarding and drafts (manual form + template fallback otherwise) |
| Apollo | `APOLLO_API_KEY`, `APOLLO_PAID_ENABLED`, `APOLLO_MAX_PERSON_ENRICHMENTS_PER_ACTION` | **Yes** for contacts (paid plan needed for emails) |
| SEC EDGAR | `EDGAR_ENABLED` | Free, recommended |
| GitHub | `GITHUB_ENABLED`, `GITHUB_TOKEN` | Optional |
| People Data Labs | `ENABLE_PAID_FIRMOGRAPHICS`, `PDL_API_KEY`, `PDL_MONTHLY_LIMIT` | Optional |
| PhantomBuster | `PHANTOMBUSTER_API_KEY` | Optional |
| StatusGator | `STATUSGATOR_API_TOKEN`, `STATUSGATOR_BOARD_ID`, `STATUSGATOR_MONITOR_MAP` | Optional |
| Contact worker | `AUTO_CONTACT_ENRICHMENT_ENABLED`, `CONTACT_ENRICHMENT_DAILY_CAP`, `CONTACT_ENRICHMENT_BATCH_SIZE` | Optional |
| Instantly | `INSTANTLY_*` | Live mode only |
| HubSpot | `HUBSPOT_ACCESS_TOKEN` | Optional |
| State | `DATABASE_URL`, `STATE_BACKEND`, `STATE_JSON_EXPORT_ENABLED` | json locally; postgres when deployed |
| App | `APP_BASE_URL`, `APP_HMAC_SECRET`, `PORT`, `HOST`, `NODE_ENV` | Yes |
| Clerk | `CLERK_*` | When deployed |
| Backups / alerts | `BACKUP_*`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `SLACK_WEBHOOK_URL`, `UPTIME_MONITOR_CONFIRMED` | When deployed |
| Budgets | `WORKSPACE_MAX_SERPER_QUERIES_PER_RUN`, `ONBOARDING_MAX_PAGES`, `ONBOARDING_MAX_LLM_CALLS` | Defaults provided |

## 10. Success metrics (per workspace, on `/metrics`, each with its definition)

- Onboarding: time to approved profile; share of profile fields with receipts (target ≥ 90%); fields edited during review.
- New lead events per week (new companies + new triggers on watched accounts).
- Queue-ready accounts per week (append-only observations).
- Receipt coverage: share of queue-ready accounts with ≥ 4 receipted signals (target > 90%).
- Funnel: queue-ready → contacted → replied → meeting → demo (Live workspaces); drafts approved (Demo workspaces). Pre-ledger outcomes excluded, not backfilled.
- Kill rate (30–50% of high scorers is healthy).
- Contact coverage and the "queue-ready but contactless" leak.
- Form D lead-time advantage (only account-matched filings with a later press receipt; blank until samples exist).

Sparse or unmeasured values stay blank rather than estimated.

## 11. Demo story (interview use case)

1. **Before the interview:** create a workspace for the interviewing company, approve its profile, and run discovery and enrichment the day before so real results are ready. Run `npm run demo:preflight -- --workspace <id>`.
2. **In the interview:** open the workspace → Today → one account's why-now, receipts, score breakdown, buyer/champion, and draft (labeled Demo). Then show the Seller Profile review screen ("here's how WhyNow understood your company — every line links to your own site").
3. **Optional live moment:** type a second company name and show onboarding progress; switch back to the prepared workspace for results.
4. **Close** on the Kill Log and the honest funnel.

## 12. Out of scope

- Multiple organizations/teams with separate billing (workspaces serve one owner).
- A custom email sequencer; LinkedIn/Facebook message automation; bought intent data; synthetic ACV/CAC.
- Sending on behalf of a seller without attestation.
- The original's legacy code generations (Next.js tree, local-business scout, Manus integration).

## 13. Acceptance for the whole product

For at least three real, different sellers (one of them Resolve AI, compared against the reference profile):

- onboarding produces an approved profile with ≥ 90% receipted fields in under 3 minutes;
- the first discovery run yields real prospects, or an honest zero with suggestions;
- at least one Tier 1–2 prospect per workspace reaches queue-ready with six scored slots, a live trigger, a verified buyer or champion, a why-now sentence, and a validated draft;
- Demo workspaces cannot send;
- all figures reconcile with state.

## 14. Decisions

1. **Product name — decided:** WhyNow.
2. **Seller — decided:** any real company entered on the dashboard; one workspace per seller; Demo delivery by default.
3. **Paid providers** (before Stage 9): Apollo paid plan (required for real contact emails); PDL; StatusGator; Instantly (only if sending for a company that employs you).
4. **OpenAI model** (before Stage 2): one your key supports that follows JSON schemas reliably, plus a monthly spend cap.
5. **Hosting** (before Stage 10): Railway or another host; custom domain.
