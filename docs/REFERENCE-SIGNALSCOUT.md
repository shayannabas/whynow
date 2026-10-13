# Reference: how the original SignalScout works

WhyNow is a generalized rebuild of SignalScout, a prospecting engine built for one seller (Resolve AI). This document explains the original so an implementer understands the intent behind WhyNow's requirements. **It is background, not a spec** — `docs/PRD.md` is the spec. Selected original files may be available read-only in `reference/signalscout/`.

## 1. What it is

A plain-Node.js (no framework) B2B prospecting engine. It builds a universe of target companies, runs rate-budgeted public collectors (status pages, ATS job boards, SEC EDGAR, GitHub, news/search) to gather time-stamped, URL-backed evidence, scores each company on a weighted six-signal fit model, assigns a separate firmographic tier, applies an evidence-backed kill engine, ranks by a transparent priority formula with trigger stacking and SLA decay, finds a buyer and champion, and generates a validated outreach draft a human must approve.

The seller, Resolve AI, is an "AI production engineer" (autonomous AI SRE). Its ICP: engineering orgs with complex production, costly downtime, mature observability but manual investigation, fresh public pain, AI-forward culture, and a competitor already using Resolve (the "wedge"). All Resolve-specific content lived in configuration; the original's own positioning called Resolve "customer one for a general receipts-first GTM engine." WhyNow makes that generalization real.

Product thesis: outbound email is drowning in AI-generated volume, so the scarce asset is verifiable, time-stamped public evidence of pain. "AI prepares, human sends."

## 2. Golden rules

1. Receipts, not vibes — no URL means inferred, low confidence, greyed, never Tier 1.
2. Never invent data — empty collectors report zero; legacy synthetic fields (estimated ACV/CAC/expected value) were deliberately removed.
3. Public data only, politely — robots.txt, budgets, caching, identifying User-Agent, no auth bypass, no LinkedIn/Facebook messaging automation.
4. Kills are features, not deletions.
5. Verify before claiming done.
6. Private internal context is runtime-only.

## 3. Architecture

| Layer | Original implementation |
|---|---|
| Runtime | Node 22, built-in `http`, no build step. Deps: `@aws-sdk/client-s3`, `@clerk/backend`, `@fontsource-variable/manrope`, `pg`, `robots-parser`; dev `vitest`. |
| Entry | `scripts/demo-server.cjs` (~70 lines): timers, schedulers, HTTP server, per-request AsyncLocalStorage context, error alerting. |
| Server modules | `scripts/server/state.cjs` (state + config), `router.cjs` (~1,100 lines of explicit pathname checks, auth, permissions), `pages.cjs` (~2,500 lines of HTML), `actions.cjs` (~3,300 lines of mutations and jobs), `styles.cjs` (one token layer). |
| Domain modules | ~50 files: `resolve-gtm.cjs` (taxonomy, signals, scoring, kills), `tiering.cjs`, `decisioning.cjs`, `stage2-discovery.cjs`, `stage3-signals.cjs` (triggers, SLAs, stacking), `stage4-sdr.cjs`, `stage5-delivery.cjs`, `account-lifecycle.cjs`, `resolve-outreach.cjs`, `security.cjs`, `clerk-auth.cjs`, `postgres-state-runtime.cjs`, `backup-runtime.cjs`, `scheduler.cjs`, `alerts.cjs`, and more. |
| Front end | Pages are functions returning HTML strings; one head script with document-level event delegation and a fetch-based `<main>` swap; inline SVG charts. |
| State | Local: atomic JSON `.flowfi/local-state.json` (+ run history) with `.bak`. Production: Postgres `runtime_state`, fail-closed, checksum-verified. |
| Tests | vitest, ~58 files, 500+ cases; gold-standard fixtures. |
| Deploy | Railway via `railway up` (git push does not deploy); ~60 s proxy timeout → long work runs as background jobs with polling. |
| CI | GitHub Actions: `npm ci`, `npm test`, `npm audit --omit=dev --audit-level=high`, gitleaks; separate 15-minute production `/health` check. |

## 4. Pipeline

```
target discovery → public signal collection → leading-indicator stacking → six-signal scorecard
→ kill pass → tiering → buyer/champion enrichment → outreach → review/export
```

Kanban stages: discovered → tiered → enriched → approved → contacted. A later ten-state lifecycle sits on top (section 12).

## 5. Discovery and data quality

ICP-driven, not free-text: ten segments each define a company universe (provenance-backed seeds + expansion rules). A run fans out Serper queries over segment × task type (category index, ATS directory, funding news, competitor) × sub-industry with rotating cursors and freshness windows, capped at ~150 queries. Every candidate passes:

- **Noise gate** — publisher blocklist, headline-fragment detection, generic-phrase rejection, "no real company name → not an account." (An early build leaked ~300 junk accounts.)
- **Entity resolution** — normalized names, root/alias domains, aliases, parent links. (Duplicates like "EquiLibre" / "EquiLibre Technologies" once existed.)
- **Segment classification** — validated against the company, not inherited from the query. (Shopify was once labeled a crypto exchange.)
- **Auto-triage** — humans only review edge cases.

Each run persists a funnel (a real rehearsal: 2,997 raw → 1,894 → 52 new → 52 receipted → 7 queue-ready). **Watchlist mode** is the main volume engine: every known company is monitored indefinitely, and a new trigger on it is a new lead event.

The original ten segments: crypto/fintech exchanges & brokers; delivery/real-time marketplaces; ticketing/live events; sports betting/iGaming; data/AI infrastructure; cybersecurity; travel/hospitality; restaurant/commerce SaaS; insurance/vertical enterprise SaaS; enterprise platforms. Revenue-sensitivity bases were 5/5/5/5/4/4/4/4/3/3.

## 6. Collectors

Eight per-account collectors: `active_pain`, `hiring`, `tech_culture`, `ai_compatibility`, `competitive_wedge`, `revenue_sensitivity`, `executive_change`, `github_monitor` (flagged). Four global: `edgar_form_d`, `edgar_risk_factors`, `otel_contributor_graph`, `conference_speakers`. Supporting: `search-evidence` (Serper), `statusgator` (optional paid history).

Sources: Statuspage `/api/v2/summary.json` and `incidents.json`, HN Algolia, Google News RSS, Serper, Greenhouse `boards-api`, Lever `api.lever.co/v0`, Ashby postings, engineering blogs, GitHub REST, SEC EDGAR daily index and full-text search.

**Collector runtime** (shared): refuses requests without `CRAWLER_CONTACT_EMAIL`; identifying User-Agent; SSRF guard (HTTPS only; blocks localhost, `.local`, private/link-local literals, credentials); per-source budgets and cache TTLs (e.g. Statuspage 30 req / 350 ms / 15 min; Serper 150 / 500 ms / 6 h; EDGAR filings 8 / 400 ms / 30 d; GitHub 20 / 1 s / 6 h); robots.txt for arbitrary sites; atomic cache; per-source health. Evidence normalization forces URL-less evidence to inferred and only attributes evidence to a company by domain or whole-word name match.

## 7. Six-signal fit score

| Signal | Weight | Evidence (original keyword patterns) |
|---|---|---|
| Tech Stack | 1.3 | Kubernetes, microservices, multi-cloud, AWS/GCP/Azure, Datadog, Grafana, PagerDuty, OpenTelemetry, Prometheus, Splunk |
| Active Pain | 1.2 | outage, incident, downtime, degraded, service disruption, root cause, war room, on-call |
| Revenue Sensitivity | 1.1 | segment base, raised by real-time / money movement / trading / betting / ticket sales / checkout / payments / booking |
| Observability Scale | 1.0 | observability, SRE, status page, monitoring tools |
| AI Compatibility | 0.9 | AI, LLM, Copilot, Cursor, codegen, machine learning |
| Competitive Wedge | 0.8 | nearest Resolve customer for the segment (inferred 3 until verified) |

`contribution = score × weight × sourceConfidence × recency`; `fitScore = round(100 × Σ ÷ (5 × Σweights))` (Σweights = 6.3).

- Confidence: own domain 1.0; Statuspage/Greenhouse/Lever/Ashby 0.9; Reuters/Bloomberg/TechCrunch/wires 0.8; other URL 0.7; no URL 0.2–0.4.
- Active Pain recency: 1.0 ≤ 12 months, 0.5 ≤ 24 months, 0.25 after.
- Also: `fitConfidence` and band, `fitBand`, receipted count, live-trigger flag (≤ 90 days), per-signal breakdown.

**Gold-standard anchors** (used as test fixtures): Databricks scores highest but is killed for solving in-house (internal AI debugging platform); Uber Eats killed for build culture (invented Jaeger and M3); Binance killed as unsellable; Replicate killed as below ICP size; DraftKings is the best *sellable* account (chronic outages, per-second regulated revenue, a live chaos-engineering req, Coinbase as category-twin wedge). Lesson: the score shortlists; the disqualifier check decides.

## 8. Tiering (separate axis from fit)

An early version derived tier from fit score — a mistake later corrected. **Tier = company weight (firmographics); fit = ICP match; kill = override.**

- Tier 1: public, or revenue ≥ $500M, or ≥ 2,000 employees, or valuation ≥ $5B.
- Tier 2: revenue ≥ $25M, or ≥ 150 employees, or Series A–D / growth / PE.
- Tier 3: ≤ 149 employees, early stage, and ≥ $2M raised or verified production complexity.
- Parked: otherwise, or unclassified segment.

Firmographics are free-first (search, Apollo organization enrichment, Wikidata); PDL only for low-confidence companies behind flags. Low confidence makes a tier *provisional* (queue-eligible with a dampener) rather than parked. Every tier has a written reason and receipt.

## 9. Kill engine

Precedence: `KILL_EXISTING_CUSTOMER` > `KILL_UNSELLABLE_ORG` > `KILL_SOLVING_IN_HOUSE` > `KILL_BUILD_CULTURE` > `KILL_BELOW_ICP_SIZE` (engineering headcount < 200, only with a receipt). Sources: the seller's customer list, regex evidence, headcount receipts, prospecting-surface evidence, operator hints. Primary kill + `alsoKilledBy`. `assertValidKill` throws if code, reason, or evidence is missing. Parking is never a kill.

## 10. Triggers, SLAs, stacking, priority

Trigger: `{type, detectedAt, evidenceUrl, decaysAt}` with strength 1–3. Default SLA days: form_d_filing 14; funding 30; exec_change/departure/warm champion/inherited pain 30; outage 30; public_postmortem 30; ai_rca_hiring 60; hiring_surge 45; first_infra_hire 45; headcount_surge 45; reliability_hiring 90; internal_tool_maintenance 90; risk_factor_added 120; otel_adoption 90; conference_talk 120; otel_contributor 180; default 90.

Stacking: 0–1 types 1.0×, 2 → 1.5×, 3+ → 2.0×; funding/Form D + exec change 2.5×; AI-RCA hiring + any other 2.5×. Strength-3 triggers create "draft it" actions only for engaged accounts. Form D matters because it is filed within 15 days of first sale — often 30–90 days before press.

`priority = tierWeight(3/2/1/0) × fit/100 × freshness(1.25) × stack × provisionalDampener(0.85–1.0) × ThemeB(1.08)` ÷ 9.375; killed → 0; formula stored and shown.

## 11. Contacts, drafts, delivery

- Buyer: CTO, SVP Engineering, VP Engineering. Champion: Head/Director of SRE, Head of Platform Engineering, Director of Incident Management (betting adds performance/chaos directors). Sports-betting operations/compliance/AML titles flagged "wrong org."
- Apollo People Search first; capped paid matches when enabled; PhantomBuster optional (merge saved args, read the launch container, filter to target company). Auto-coverage worker every 15 minutes (20/day, batch 3).
- Verified contact: valid email, buyer/champion, confidence ≥ 0.7, provenance, not suppressed.
- Draft formula (~90 words): receipt-led opener → product in one sentence → wedge proof + credential → time-boxed CTA; plus objection sheet and call plan. Pain-theme quotebook (verbatim ≤ 200 chars). Incident attribution: only the company's own incidents are citable. Validator hard gates (e.g. banned "$25,000 per minute" arithmetic).
- Queue-ready: not killed/suppressed/opted out/archived/rejected/blocked; classified segment; Tier 1–2 (Tier 3 behind filter); fit ≥ 50; verified contact; valid draft.
- Approve & Send → Instantly only with full configuration and compliance confirmations, after rechecking kill, suppression, SLA, duplicates, and daily cap (50). Otherwise one idempotent copy record; "contacted" only via authenticated webhook or operator confirmation. HubSpot sync per account, review-gated.

## 12. Lifecycle, learning, and later additions

- Ten states (identified → closed_won), append-only transitions, touch ledger (only delivered messages), guards, per-state decay (working 4, engaging 7, meeting_held 5, opportunity 7, dormant 30 days).
- Build-watch: in-house kills move to building_internally with a six-month fuse and 14-day recheck.
- Tracked people; signal rubric as code and table; pain themes A–D; incident attribution; message targeting; runtime-only internal data adapters.
- Outcomes append-only with snapshots; weight suggestions after ≥ 3 positive and ≥ 3 negative outcomes, admin-approved; nightly re-score with decay.

## 13. Security and operations

- Clerk + Google only in production, fail-closed startup, roles admin/sdr, admin TOTP, 7-day/24-hour sessions, local-admin identity only in development.
- Permission map on every route; same-origin POSTs; 30 actions/minute limiter; security headers; hash-chained audit log (actors are Clerk user IDs); suppression, forget company, 12-month retention.
- Production Postgres: checksum-verified on startup and every write; daily pre-write snapshot; no JSON fallback. Migrations back up first and are idempotent. (A JSON truncation once lost ~800 leads.)
- Nightly AES-256-GCM encrypted backups, immediately restore-verified.
- `/health` and `/ready`; jittered non-overlapping scheduler (status pages 6 h, ATS + EDGAR daily, leadership daily, engineering weekly, build-watch 14 d, backup daily, re-score hourly check, contact coverage 15 min); Slack alerts; demo preflight command.
- `/metrics`: eight weeks of lead events, queue-readiness observations, receipt coverage, funnel, kill rate, Form D lead-time advantage — sparse values left blank.

## 14. How it was built

SignalScout started as a generic local-business lead scout (plus an unused Next.js tree) and was converted through five staged AI-agent specs: MP1 (Resolve ICP, signals, collectors, scoring, outreach, sustainability, security), MP2 (design system; tier vs fit correction; firmographics; entity resolution; confidence weighting), MP3 (delete dead code, split the monolith, repair data, volume, leading indicators, one SDR queue, delivery, production cutover, metrics), MP4 (lifecycle, live triggers, build-watch, adapters), MP5 (messaging-playbook intelligence). Each stage had a Definition of Done, tests, browser verification, a commit, a deploy, and a review stop; traceability ledgers mapped requirements to code and tests and separated "complete in code" from "owner-gated" production items.
