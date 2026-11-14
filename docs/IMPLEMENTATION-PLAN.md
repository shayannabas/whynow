# WhyNow — Implementation Plan (v4)

Build order for `docs/PRD.md`. Rules, tech decisions, and the working agreement live in `AGENTS.md` and apply to every stage.

## How to run a stage

1. The owner sets **Current stage** in `AGENTS.md`.
2. Use the prompt in "Stage prompt" at the bottom of this file.
3. Before coding: restate the stage goals, list files to create or change, list tests to add, and wait for the owner's OK.
4. Implement, run `npm test`, verify in a browser, update `docs/TRACEABILITY.md`, commit, and stop.
5. The owner checks the Definition of Done (DoD) before moving on.

**Order rationale.** The collector runtime comes first (Stage 1) because onboarding must fetch the seller's public pages politely. Onboarding (Stage 2) comes before the scoring engine because every later stage reads the workspace's generated ICP config. Everything after that is the baseline architecture, parameterized by workspace. The original was built by converting an older app and then paying for it later (dead code, a 6,300-line monolith, tier/fit confusion, junk accounts, duplicate entities, a data-loss incident, dual auth); this plan builds the final design from day one.

Throughout, "the original calls this X" points at the matching file in `reference/reference/` (if present) for design intent.

---

## Stage 0 — Foundation (workspace-aware)

**Build**
- `package.json` (name `whynow`; scripts `start` → `node scripts/server.cjs`, `test` → `vitest run`, `test:watch` → `vitest`), `vitest.config.ts`, `README.md` (name, tagline, pipeline, run instructions). Keep the existing `.gitignore`, `.env.example`, `AGENTS.md`, and `docs/`.
- `CLAUDE.md` containing `@AGENTS.md` (so other agents read the same rules).
- Minimal `.env` loader (no dotenv dependency) that never overrides real environment variables.
- `scripts/server/state.cjs`: `loadState`, `saveState` (atomic temp → fsync → rename, `.bak`, recovery from `.bak` on parse failure), `defaultState()` with the shape in `AGENTS.md`, `getWorkspace(state, id)`, `updateWorkspace(state, id, fn)`, `createWorkspace(state, {name})`, `esc`, `stableId`, `nowIso`, `json(res, body, status)`.
- `scripts/server/router.cjs`: `handleRequest(req, res)` with explicit pathname checks; `GET /health` → `{"ok": true}`; 404 page.
- `scripts/server/styles.cjs`: one design-token layer (`--accent`, `--accent-strong`, `--ink`, `--ink-2`, `--line`, `--canvas`, `--surface`, `--sidebar`, `--warn`, `--danger`, type scale, radii 14–18 px); no `!important`. Self-host the font at `/fonts/` (`@fontsource-variable/manrope`).
- `scripts/server/pages.cjs`: `shell(title, body)` with the WhyNow wordmark, sidebar, **workspace switcher** in the header, and the head script (event delegation + `<main>` swap); Overview with live counts, an honest empty state, and a "New workspace" call to action.
- `scripts/server/actions.cjs`: create/switch workspace actions.
- `scripts/server.cjs`: HTTP server on `PORT || 3000`, `HOST || 127.0.0.1`; request errors logged and rendered as a generic error page (no stack traces).
- `.github/workflows/ci.yml`: `npm ci`, `npm test`, `npm audit --omit=dev --audit-level=high`, gitleaks (full history) on push and pull request.

**Tests** — atomic write survives a simulated crash (temp file left behind, live file intact); `.bak` recovery; workspace helpers never modify other workspaces; `esc` escapes HTML; `/health` returns 200 JSON.

**DoD** — `npm start` shows Overview and an empty workspace switcher; creating a blank workspace persists across restart; CI green; no framework present.

**Not yet** — collectors, onboarding, scoring, auth, Postgres.

---

## Stage 1 — Collector runtime and source store

**Build**
- `scripts/collectors/runtime.cjs` (the original calls this `collectors/runtime.cjs`): `CollectorRuntime` with the contact-email gate, WhyNow User-Agent, `assertPublicHttpsUrl` SSRF guard, per-source `DEFAULT_BUDGETS`, per-run usage counters, minimum-interval sleeps, timeouts, TTL disk cache under `.whynow/collector-cache/` (atomic writes), robots.txt checks via `robots-parser`, per-source health, `CollectorHttpError`.
  - Budgets (max requests per run / min interval / cache TTL): statuspage 30 / 350 ms / 15 min; greenhouse, lever, ashby 20 / 500 ms / 6 h; hn 40 / 400 ms / 1 h; google_news_rss 20 / 750 ms / 30 min; serper 150 / 500 ms / 6 h; seller_site 25 / 1 s / 24 h; engineering_web 20 / 1.5 s / 12 h; robots 30 / 500 ms / 24 h. Unknown sources: 10 / 1 s / 1 h. Timeouts 8–20 s.
- `scripts/collectors/common.cjs`: `stripHtml`, `stableId`, `clampScore`, `signal()`, `event()`, `withinDays`, `domainForTarget`, `normalizeEntityText`, `evidenceBelongsToTarget`.
- `scripts/serper.cjs`: search client that goes through the runtime.
- `scripts/sources.cjs`: source store `{id, url, fetchedAt, contentHash, title, text}` with `recordSource`, `getSource`, and `quoteIsGrounded(sourceId, quote)` (exact substring after whitespace normalization).
- Admin **Collectors** page skeleton: per-source health and budget usage.

**Tests** — missing contact email refuses every request; SSRF cases (http, localhost, `.local`, 10.x, 172.16–31.x, 192.168.x, 169.254.x, 127.x, credentials in URL); budget exhaustion; cache hit, miss, and expiry; robots disallow; grounding accepts exact quotes and rejects paraphrases; no live network.

**DoD** — an admin-only debug action fetches one real public page politely and stores it as a source.

---

## Stage 2 — Seller onboarding

**Build**
- `scripts/llm.cjs`: OpenAI call via `fetch` with JSON-schema output, retries with backoff, per-workspace call caps (`ONBOARDING_MAX_LLM_CALLS`), response cache keyed by prompt version + input hash, redacted logging.
- `scripts/onboarding/resolve-seller.cjs`: company name → up to 5 candidates via Serper (name, domain, description, source URL). Require a pick when more than one plausible match.
- `scripts/onboarding/research.cjs`: background job with progress events. Fetch homepage, product/solutions, pricing, customers/case studies, about, careers (links discovered from homepage and sitemap; cap `ONBOARDING_MAX_PAGES`, default 20); Serper queries (`"{seller}" customers`, `case study`, `alternatives`, `vs`, `raises`, `hiring`); the seller's ATS board; EDGAR if public. Store every page as a source.
- `scripts/onboarding/synthesize.cjs`: versioned prompts producing the Seller Profile (PRD 7.2.1) and ICP config (PRD 7.2.2) from source excerpts only; each factual field returns `{value, sourceId, evidenceQuote}`.
- `scripts/onboarding/validate.cjs`: schema validation; grounding check on every field (failure → `inferred: true`); customers only from the seller's own domain or first-party case study/press release; competitors need a source; 3–10 segments; 4–8 query templates per segment; de-duplicated, length-capped keyword lists; defaults for weights, SLAs, and tier rules.
- `scripts/onboarding/manual-profile.cjs`: the same schema as a form when `OPENAI_API_KEY` is absent.
- `config/reference-profiles/resolve-ai.json`: the original configuration expressed in the new schema — segments, query templates, personas, and keyword lists from `reference/reference/resolve-gtm.cjs`; wedge customers with `https://resolve.ai/customers` as the source; trigger mapping per PRD 6.2. Load-only fixture; never a default seller.
- Pages:
  - **New workspace** — name + optional website → candidate picker → progress view.
  - **Seller Profile review** — every field with its receipt link; inferred fields greyed with a warning; inline edit; add/remove segments, personas, keywords, competitors, customers (URL required); **Approve** → status `active` + audit event.
  - **Workspaces** — list with status, created/approved dates, archive.
- Monthly re-research job producing a diff that requires approval.

**Tests** — recorded-fixture onboarding for three sellers (Resolve AI plus two real companies from different industries; pages under `tests/fixtures/onboarding/`, LLM responses recorded); grounding rejects invented customers and paraphrased quotes; ambiguous names require a pick; the Resolve fixture's generated segments and personas substantially overlap the reference profile (write the comparison into the test output); workspace isolation; no key → manual form path.

**DoD** — with real keys, three real company names each finish research in under 3 minutes and show a reviewable profile with ≥ 90% receipted fields that can be approved. Nothing about any seller is invented.

---

## Stage 3 — ICP engine, kill engine, scorecard shell (per workspace)

**Build**
- `scripts/icp-model.cjs` (the original calls this `resolve-gtm.cjs`): `SIGNAL_KEYS` (unchanged keys), `DEFAULT_WEIGHTS`, `normalizeIcpConfig` (clamps, dedupes, list limits, defaults), `signalLabels(config)`, `inferSegment(account, config)`, `signal()` helper, `KILL_PRECEDENCE` (PRD 6.3).
- Account schema per workspace: `id, name, domain, website, aliases, aliasDomains, icpSegment, segmentClassification, discoveryQuality{sourceUrl, targetAccountName}, signals, triggers, kills, killStatus, firmographics, tier, fitScore, contacts, pipelineStage, createdAt, updatedAt`.
- `scripts/kills.cjs`: `evaluateKills(account, workspace)`, `assertValidKill`, `applyKillEngine` — existing customer (profile customers), seller/competitor (profile domain + competitor domains), unsellable, in-house and build-culture (profile patterns), below size (profile metric and floor, only with a receipt).
- `scripts/security.cjs` (partial): `appendAudit` / `verifyAuditLog` SHA-256 hash chain; entries include `workspaceId`; every mutation writes one.
- Pages (active workspace): **Scorecard** (accounts × six slots with the workspace's labels; receipt dot vs grey "inferred"), **Kill Log**, **Settings** (read-only ICP config), manual **Add account** (name + domain + segment + source URL, validated).

**Tests** — config normalization bounds; kill precedence with multiple kills; invalid kill throws; seller and competitors are killed in their own workspace; gold-standard fixtures under the Resolve reference profile (Databricks-like → `KILL_SOLVING_IN_HOUSE`; Uber-Eats-like → `KILL_BUILD_CULTURE`; Binance-like → `KILL_UNSELLABLE_ORG`; Replicate-like → `KILL_BELOW_ICP_SIZE`; DraftKings-like → not killed), with evidence text in `tests/fixtures/` labeled as fixtures; audit tamper detection.

**DoD** — fixtures pass; two workspaces show different labels and kill outcomes for the same manually added company.

---

## Stage 4 — Prospect collectors (parameterized)

**Build**
- Each collector exports `collectX(target, runtime, workspace)` → `{signals, events, errors, health}`:
  - `pain.cjs` — Statuspage `summary.json` / `incidents.json` when `painSources.statuspage`; HN Algolia; Google News RSS; Serper with `painEventKeywords`.
  - `hiring.cjs` — probe and cache the Greenhouse/Lever/Ashby slug; match function roles, buying-intent patterns, and named technologies; extract technologies as environment receipts.
  - `environment.cjs` — company/engineering blogs and RSS (robots-checked).
  - `adoption.cjs` — adoption-readiness evidence per the slot definition.
  - `wedge.cjs` — nearest seller customer by segment and relationship; competitor-usage evidence.
  - `impact.cjs` — segment base + transactional-urgency keywords.
- `scripts/attribution.cjs` (the original calls this `incident-attribution.cjs`): own / upstream / physical / unknown; only own events are citable; operator "verify" action for unknown.
- `scripts/collectors/index.cjs`: `COLLECTORS`, `COLLECTOR_MODES` (full, pain, daily, weekly, targeted), `buildTargetUniverse(workspace)`, `runCollectors` (merge by stable ID; public results cached in `companyCache`).
- Collectors page per workspace (disabled collectors shown as disabled) and a **Run collectors** background job with polling.

**Tests** — each collector against recorded fixtures under two different profiles produces different signals from the same evidence; URL-less evidence → inferred; attribution cases; evidence attribution rejects substring false positives; no live network.

**DoD** — for 3–5 real prospects in each of two workspaces, collectors produce clickable receipts relevant to that seller; zeros show as zero.

---

## Stage 5 — Fit scoring, firmographics, tiering, priority v1

**Build**
- `scripts/scoring.cjs`: `scoreSignals(account, workspace)`, `sourceConfidence`, `painRecencyFactor`, `liveTrigger`, `normalizeScoringConfig`, `scoreBreakdownPresentation` per PRD FR-5; slot scores from rubric + keywords; optional LLM slot proposals must return a grounded quote.
- `scripts/firmographics.cjs`: provider interface `enrichFirmographics(company)`; free search; Apollo organization enrichment; Wikidata; PDL adapter behind both flags with a monthly cap; concurrency 6; chunks of 20; 7-day cache; history appended; stored in `companyCache`.
- `scripts/tiering.cjs`: `tierCompany`, `normalizeTierRules`, provisional logic, seed size-band fallback, `tierReason` with evidence.
- `scripts/decisioning.cjs`: `priorityForAccount` (tier × fit × freshness × provisional dampener; stacking added in Stage 7; ceiling 9.375), `applyDecisioning`, `decisionReport`.
- Scorecard: editable weights and live-trigger window, per-account breakdown drill-in, Tier × Fit tab. Settings: editable tier thresholds.
- Nightly re-score (checked hourly) across active workspaces with pain decay and a promotions/demotions report.

**Tests** — hand-computed fit examples; confidence per host type; recency at 365 / 730 days; tier boundaries (including "~200-person Series A infrastructure startup → Tier 2"); provisional rules; unclassified → parked; priority formula string; killed → 0; the Resolve reference profile reproduces the original's scores on fixture accounts.

**DoD** — scores spread realistically; the same company can score differently in two workspaces, with reasons visible.

---

## Stage 6 — Discovery and volume

**Build**
- `scripts/icp-universe.cjs`: seeds per workspace segment from category searches and competitors' public customer pages (each with provenance); `canonicalDomain`; seed import (CSV/JSON with provenance required).
- `scripts/company-discovery.cjs` + `scripts/discovery-runs.cjs`: task matrix (segments × `category_index` / `ats_directory` / `funding_news` / `competitor_customers` × sub-industries), rotating cursors, freshness windows, per-workspace query cap.
- `scripts/noise-gate.cjs`: `validateAccountCandidate`, `extractTargetName`, `looksLikeHeadline`, `isGenericAccountName`, publisher/aggregator blocklist, with junk-name regression fixtures.
- `scripts/entity-rules.cjs`: canonical entity resolution and merging (keep the richer record; union aliases, receipts, triggers).
- `scripts/segment-classifier.cjs`: validate segment against company evidence using workspace segments; below threshold → `unclassified` + review.
- Auto-triage rules; watchlist (every known account monitored; changed content on a known URL = new trigger).
- Pages: **Discovery** (narrowing builder; Run button disabled while polling), **Runs**, **Funnel** (raw → noise-gated → new canonical → receipted → queue-ready; watched triggers; kills; biggest drop-off; expansion suggestions). After profile approval, onboarding offers **Run first discovery**.

**Tests** — no repeated query-window pairs across consecutive runs; junk names rejected; idempotent merges; misclassification guard (a company found by an unrelated segment query is not labeled with it); funnel reconciliation; customer and competitor domains never become prospects.

**DoD** — for two different sellers, the first discovery run finishes in under 5 minutes with real, correctly segmented prospects (spot-check 20 by hand) or an honest zero with suggestions.

---

## Stage 7 — Triggers, SLAs, stacking, scheduler

**Build**
- `scripts/triggers.cjs` (the original calls this `stage3-signals.cjs`): trigger library (PRD 6.2), `normalizeSlaConfig`, `decorateAccountTriggers` (sets `decaysAt`), `activeTriggers`, `signalStack` (1.0 / 1.5 / 2.0 and both 2.5 pairs), SLA countdown labels.
- `scripts/signal-rubric.cjs` + `docs/SIGNAL-RUBRIC.md` + a Settings table (editable SLA days).
- Collectors: `edgar.cjs` (daily-index parsing, full-text search, filing detail, per-workspace matching; unmatched → review-only candidates), `executive-change.cjs` (persona titles), `github-monitor.cjs` (technical sellers only), headcount surge from firmographic history, ATS velocity and first-function hires in `hiring.cjs`, optional `statusgator.cjs`.
- Priority gains the stack multiplier.
- `scripts/scheduler.cjs`: `JitteredScheduler` (add, jittered delays, skip if already running, health and failure callbacks). Jobs iterate active workspaces: pain every 6 h (where enabled), ATS + EDGAR daily, leadership daily, environment weekly, build-watch every 14 days, re-research monthly. Runs only when `SCHEDULER_ENABLED` and a valid contact email are set. Health persisted.

**Tests** — SLA boundaries; stacking including both 2.5 pairs; expired triggers stop counting; EDGAR parsing from fixtures; scheduler never overlaps and keeps scheduling after a failure; triggers never cross workspaces.

**DoD** — in two workspaces, a stacked prospect outranks a single-trigger prospect of similar fit, with the math shown.

---

## Stage 8 — SDR surface and lifecycle

**Build**
- `scripts/sdr-queue.cjs` (the original calls this `stage4-sdr.cjs`): Today sections; **why-now generator** (facts only; "limited public signal — verify before outreach" when thin); skip reasons.
- Pages (active workspace): **Today**, **Accounts** (merged table, filters, inline review), **Account work view** (why-now first, per PRD FR-9), **History**; Overview hero band (7-day bar chart, gauge, KPIs) and kanban.
- `scripts/account-lifecycle.cjs`: ten states, `deriveInitialState`, transitions with reasons, touch ledger, guards, decay deadlines, build-watch (six-month fuse, 14-day recheck).
- Append-only outcomes with snapshots; manual touch logging; tracked people CRUD; development-only role switch (real roles in Stage 10).

**Tests** — lifecycle guards (`working` needs two real contacts; closed needs an outcome; a queued delivery is not a touch); decay deadlines; immutable snapshots; why-now contains only facts present on the account; switching workspace changes every figure.

**DoD** — work 10 accounts end to end in one workspace without leaving the SDR pages; empty states are honest (the queue fills once Stage 9 adds contacts and drafts).

---

## Stage 9 — Contacts, drafts, queue gate, delivery modes

**Build**
- `scripts/apollo.cjs` (People Search, capped paid matches, organization enrich), optional `scripts/phantombuster.cjs` (safeguards per PRD FR-10), `scripts/enrichment-handoff.cjs`, auto contact-coverage worker (every 15 min, 20/day, batch 3).
- `scripts/outreach.cjs` (the original calls this `resolve-outreach.cjs`): persona classification from workspace personas (buyer / champion / wrong-org); `buildDraftContext` (prospect receipts + approved seller claims only); LLM draft + template fallback; objection sheet; call plan; `validateOutreachDraft` hard gates (PRD FR-11).
- `scripts/pain-themes.cjs`: verbatim quotebook (≤ 200 chars, token-boundary cuts, usable flag, citation status).
- `scripts/delivery.cjs` (the original calls this `stage5-delivery.cjs`): `isVerifiedContact`, `baseQueueEligibility`, `queueEligibility` with failure codes, coverage metrics, **delivery modes** (Demo: no send code path, drafts watermarked "Draft — not sent"; Live: attestation form + Instantly readiness + all rechecks + daily cap), copy fallback, Mark contacted, `POST /webhooks/instantly` with signature verification and immediate unsubscribe suppression.
- `scripts/hubspot.cjs` per-account review-gated sync; compliance-gated CSV export.

**Tests** — verified-contact rules; each queue-gate failure code (`BLOCKED`, `UNCLASSIFIED`, `TIER`, `FIT`, `CONTACTLESS`, `DRAFT_BLOCKED`); validator rejects money-per-time arithmetic, unapproved seller claims, and uncited receipts; a Demo workspace cannot reach any send function (test both the router and the action); Live requires attestation and full configuration; suppression and daily cap are checked before every push; webhook signature check.

**DoD** — in two Demo workspaces, at least one real prospect each reaches queue-ready with a verified contact and an approved, copyable draft; sending is impossible.

---

## Stage 10 — Security, auth, production

**Build**
- `scripts/security.cjs` (complete): `ROLE_PERMISSIONS`, `permissionForRequest` (includes workspace scope), `SlidingWindowLimiter` (30 POST actions/min), `sameOrigin`, security headers, input validation helpers.
- `scripts/clerk-auth.cjs` + `scripts/provision-clerk.cjs`: session verification with authorized parties, roles from metadata, admin TOTP check, deny unknown users; local-admin identity only outside production.
- `scripts/production-config.cjs`: fail-closed startup checks.
- `scripts/postgres-state-runtime.cjs` + `scripts/migrate-json-to-postgres.cjs`: `runtime_state` table, transactional upsert, recursively sorted SHA-256 checksum, reread verification, daily pre-write snapshot, no JSON fallback.
- `scripts/backup-runtime.cjs`: AES-256-GCM, S3 upload, download-decrypt-verify, daily scheduler job.
- `scripts/alerts.cjs` (Slack, deduplicated, credential-redacted); `scripts/production-health.cjs` (`/health`, `/ready`); uptime workflow; privacy features (suppression, forget company, 12-month retention).
- Docs: `docs/DATA-HANDLING.md`, `docs/PROVIDER-SETUP.md`, `docs/PRODUCTION-CUTOVER.md` (checkbox ledger).
- Deploy to the chosen host; custom domain + TLS.

**Tests** — permission matrix for every route; cross-workspace access denied; unknown user denied; admin without TOTP denied; rate limiter; same-origin rejection; production startup refuses incomplete config; checksum mismatch refuses startup; backup round trip; alert redaction.

**DoD** — signed-out redirect, SDR, admin with TOTP, unknown-user denial, and logout verified in a browser; `/ready` is 200 only when fully configured; a restore drill passes. **Do not deploy publicly before this stage is complete.**

---

## Stage 11 — Metrics, demo, story

**Build**
- `scripts/metrics.cjs` and the **Metrics** page per workspace (PRD §10, definitions shown, eight weeks, sparse values blank); learning-loop weight suggestions (≥ 3 positive and ≥ 3 negative outcomes; Apply/Dismiss).
- `scripts/demo-preflight.cjs` (`npm run demo:preflight -- --workspace <id>`): keys present, workspace approved, ≥ 1 queue-ready account, collectors healthy, backup fresh → `PREFLIGHT PASS` / `FAIL` with one-line fixes.
- `scripts/demo-snapshot.cjs`: copy a workspace's state for offline demos.
- `docs/DEMO-SCRIPT.md` (PRD §11 flow with fallback lines), `docs/DEMO-RUNBOOK.md`, `docs/POSITIONING.md` (measured numbers only).

**DoD** — a three-minute demo runs in one take for a real seller, including starting a live onboarding.

---

## Stage 12 — Advanced (optional)

Internal data adapters (`CrmAdapter`, `TranscriptAdapter`, `EngagementAdapter`; stub and fixture modes; runtime-only), inherited-pain and warm-champion flows, quote nudge, conference-speaker and OpenTelemetry-contributor collectors for technical sellers, EDGAR risk-factor collector, `docs/INTERNAL-DATA-WISHLIST.md`.

---

## Owner decisions

1. **Name — decided:** WhyNow.
2. **Seller — decided:** any real company typed on the dashboard; one workspace each; Demo mode by default.
3. Stage 2: OpenAI model (must follow JSON schemas reliably) and a monthly spend cap.
4. Stage 5: People Data Labs free tier?
5. Stage 7: StatusGator; GitHub token.
6. Stage 9: Apollo paid plan (required for real contact emails); Instantly only when sending for a company that employs you.
7. Stage 10: host, domain, Clerk + Google OAuth, backup bucket.

## Stage prompt

```
You are continuing WhyNow. Read AGENTS.md, docs/PRD.md, and docs/IMPLEMENTATION-PLAN.md.
Build ONLY Stage N. First, restate the stage goals, list the files you will create or change,
and list the tests you will add. Wait for my OK. Then implement, run npm test, update
docs/TRACEABILITY.md, and report: files changed, tests added, test output, and how to verify
in the browser. Do not start Stage N+1.
```
