# WhyNow — trimmed portfolio implementation plan

**Status: superseded on October 20, 2026 by the owner-directed Reference port plan.** Retain this file as historical scope only. Do not execute its remaining stages unless the owner explicitly restores it.

Updated October 20, 2026. This plan formerly replaced the remaining Stage 3–12 scope for the portfolio build. Stages 0–2 remain governed by the existing PRD, implementation record and traceability documents. Stage 2.5 is paused; no port phase has started.

## Portfolio outcome

The finished demo must show one coherent path:

`type a company → review a receipted ICP → discover real prospects → rank who to contact and why now with sources → create a receipt-backed draft`

The remaining work is deliberately local-first and send-free. It proves product judgment, evidence quality and an end-to-end GTM workflow without building production infrastructure or paid enrichment that is unnecessary for an interview demo.

## Golden rules — unchanged

1. **Receipts, not vibes.** Every prospect signal and every Seller Profile claim carries a source URL. No URL → inferred, greyed, low confidence. Inferred evidence can never make a prospect Tier 1; inferred seller claims can never appear in an email.
2. **Never invent data.** No fabricated companies, contacts, customers, proof points, metrics, or evidence. Empty results are reported as zero. No synthetic ACV/CAC/expected-value fields.
3. **Public data only, politely.** robots.txt, rate budgets, caching, identifying User-Agent; no login/CAPTCHA/anti-bot bypass; no LinkedIn/Facebook messaging automation; official JSON endpoints preferred.
4. **Kills are retained decisions** with code, reason, and evidence.
5. **Human review gates output.** A generated Seller Profile must be approved before discovery runs; drafts must be approved before copy/send; CRM sync and export are gated.
6. **No sending on behalf of a company you don't represent.** Delivery is off per workspace until the user attests they are authorized by that seller (FR-11).
7. **Workspace isolation.** Accounts, contacts, suppression, drafts, outcomes, and metrics never leak between workspaces.
8. Private context is runtime-only; secrets only in environment variables; verify before claiming done.

For this trimmed demo, rule 6 is satisfied by keeping Demo mode permanently send-free. There is no delivery integration.

## Build order

Finish and obtain owner acceptance for **Stage 2.5**, then build and verify one stage at a time in this order: **3 → 4 → 5 → 6 → 8 → 9 → 11**. Do not start the next stage until the current stage's tests and browser-verifiable Definition of Done pass.

---

## Stage 2.5 — research quality gate

**Effort: M**

### Goal

Make customer, competitor, size, persona and buyer-search inputs reliable enough for deterministic Stage 3 rules with minimal manual correction. Extract organization candidates from saved first-party pages without AI, preserve exact evidence and missing domains honestly, evaluate against independently proposed owner-confirmed keys, and separate later drafting into seller facts, candidate review and ICP targeting.

### Files

- `scripts/onboarding/extract-organizations.cjs` — deterministic saved-page customer/competitor candidates and proven outbound domains.
- `scripts/onboarding/draft-seller-facts.cjs`, `review-organizations.cjs`, `draft-icp-targeting.cjs` — focused request boundaries and no-invention review.
- `scripts/onboarding/research-quality-eval.cjs`, `scripts/stage2-5-offline-eval.cjs` — confirmed-only evaluation plus explicitly provisional reporting.
- `tests/fixtures/eval/*-expected.json` — independently read, sourced, unconfirmed owner proposals.
- `docs/STAGE-2.5-RESEARCH-QUALITY.md` — checkpoint results and model/cost decision record.

### Tests

- Saved URL/title, logo-alt and comparison extraction with exact source evidence.
- Customer domains are accepted only from matching outbound links; missing domains remain blank.
- Raw-HTML absence skips logo-alt/domain extraction without inventing data.
- Evaluation ignores unconfirmed labels by default and reports customer/competitor recall, personas, size sanity and blocking warnings.
- Focused prompts cannot invent organization IDs and keep buyer searches distinct from seller-product/vendor searches.
- Every focused Structured Outputs schema remains inside documented limits.

### Definition of Done — browser verifiable

After the owner confirms or corrects the answer keys and separately authorizes any bounded drafting test, the review screen shows the extracted customer/competitor evidence, blank missing domains, measurable size, present buyer/champion roles and buyer-oriented search phrases without silent rewrites. No profile is approved except by the owner. The current checkpoint is offline only; paid testing and browser acceptance remain separate decisions.

---

## Stage 3 — ICP model, kill engine and scorecard shell

**Effort: L**

### Goal

Turn the approved workspace ICP into deterministic account rules. Normalize the six-signal configuration, represent prospect accounts, apply evidence-backed kill rules in the documented precedence order, and show the result in a scorecard shell. A company may receive different labels or kill outcomes in different seller workspaces.

### Files

- `scripts/icp-model.cjs` — signal keys, default weights, configuration normalization, segment inference and labels.
- `scripts/kills.cjs` — kill evaluation, evidence requirements, precedence and retained kill records.
- `scripts/server/scorecard-page.cjs` — account × six-signal shell with receipt/inferred state.
- `scripts/server/kill-log-page.cjs` — retained primary and secondary kill decisions.
- `scripts/server/settings-page.cjs` — read-only approved ICP rules.
- `scripts/server/router.cjs`, navigation and styles — manual Add account and the three new views.
- `tests/fixtures/golden-set/vercel.json` — confirmed human labels only; `labeledBy: "unconfirmed"` entries remain ignored.
- `tests/fixtures/` — Resolve gold-standard account evidence.

### Tests

- Configuration bounds, defaults, de-duplication and workspace-specific labels.
- Kill precedence when more than one kill matches; malformed kills throw.
- Existing customers, the seller and named competitors are killed in their own workspace.
- Below-size kills require a measurable profile metric and a size receipt.
- Resolve gold-standard fixtures reproduce the expected keep/kill outcomes.
- The hand-labeled golden set passes after the owner confirms labels; unconfirmed proposals are ignored.
- Two workspaces can produce different valid outcomes for the same account.

### Definition of Done — browser verifiable

In two workspaces, manually add the same real company with a source URL. The Scorecard shows each workspace's six labels; the Kill Log shows a retained code, reason and clickable receipt where applicable; Settings shows the approved ICP; and changing workspaces changes the result. All confirmed golden-set and Resolve fixtures pass. No discovery collector runs yet.

---

## Stage 4 — minimal prospect-signal collectors

**Effort: M**

### Goal

Collect only the two signal families needed for a credible demo: hiring evidence and recent news. Reuse the guarded collector runtime, saved receipts, budgets and workspace rules already built.

### Files

- `scripts/collectors/hiring.cjs` — Greenhouse, Lever and Ashby public boards; function-role, buying-intent and technology matches.
- `scripts/collectors/news.cjs` — Google News RSS first, with Serper only behind the existing explicit switch and caps.
- `scripts/collectors/index.cjs` — the trimmed collector registry and bounded background run.
- `scripts/server/collectors-page.cjs` and `scripts/server/router.cjs` — run status, errors, zeros and clickable saved receipts.
- Recorded ATS and news fixtures under `tests/fixtures/collectors/`.

### Tests

- Each ATS adapter parses recorded public fixtures and attributes jobs to the intended company.
- Seller-specific role, pain, buying-intent and technology rules produce different signals from the same evidence.
- News evidence preserves title, date, URL and exact supporting text; URL-less results remain inferred.
- Robots, redirects, budgets, timeouts, cache behavior and workspace isolation remain enforced.
- No test makes a live provider request.

### Definition of Done — browser verifiable

For 3–5 real prospects in each of two workspaces, the Collectors view can run Hiring and News, show progress, preserve honest zeros/errors, and attach clickable receipts relevant to that seller. Only Greenhouse/Lever/Ashby and Google News RSS/Serper are enabled; every other planned collector is visibly absent or deferred.

---

## Stage 5 — fit scoring, free firmographics and tiers

**Effort: M**

### Goal

Turn saved evidence into an explainable six-signal fit score and a separate company tier. Use free public firmographic sources only. Do not add People Data Labs, Apollo organization enrichment or another paid enrichment dependency.

### Files

- `scripts/scoring.cjs` — signal scores, confidence, recency and visible breakdowns.
- `scripts/firmographics.cjs` — free-source provider interface, public evidence and cache/history.
- `scripts/tiering.cjs` — normalized tier rules, provisional values and evidence-backed reasons.
- `scripts/decisioning.cjs` — fit/tier priority without Stage 7 signal stacking.
- Scorecard, Tier × Fit and Settings views.

### Tests

- Hand-computed signal totals and weights.
- Confidence by source type and recency boundaries.
- Firmographic values require free public receipts; missing values stay unknown.
- Tier boundaries, provisional behavior and unclassified/parked handling.
- Killed accounts always have zero priority.
- Resolve reference fixtures reproduce their expected scores.
- The same company can score differently in two workspaces for explainable reasons.

### Definition of Done — browser verifiable

The Scorecard shows a realistic spread of fit scores, tiers and an expandable calculation for real accounts. Each non-inferred input opens its source. Unknown free firmographics remain visibly unknown rather than guessed. A workspace switch changes labels, weights or results where the approved ICP differs.

---

## Stage 6 — light real-prospect discovery

**Effort: L**

### Goal

Find **20–30 real, correctly segmented prospects per approved seller** with provenance. Keep discovery intentionally light: a bounded category/segment search, ATS-derived companies and public competitor-customer sources where allowed. Reject noise, merge duplicate entities and prevent seller customers or competitors from entering the prospect universe.

### Files

- `scripts/icp-universe.cjs` — workspace seeds and source provenance.
- `scripts/company-discovery.cjs` and `scripts/discovery-runs.cjs` — bounded tasks, cursors and explicit per-run limits.
- `scripts/noise-gate.cjs` — company-name validation, headline/junk rejection and publisher exclusions.
- `scripts/entity-rules.cjs` — canonical domains, aliases and receipt-preserving merges.
- `scripts/segment-classifier.cjs` — evidence-backed segment classification; weak matches become unclassified.
- Discovery, Runs and a compact Funnel view.

### Tests

- Junk names and article headlines are rejected.
- Repeated discoveries merge idempotently without losing receipts.
- A result from an unrelated query is not assigned to that segment without supporting company evidence.
- Customers, the seller and competitors never become prospects.
- Workspace data and query budgets remain isolated.
- Funnel totals reconcile from raw result through noise gate, canonical entity, segment and final prospect.

### Definition of Done — browser verifiable

For each approved demo seller, one bounded discovery run produces 20–30 real companies or an honest shortfall with reasons. A manual spot-check confirms names, domains, segment evidence and receipts. The UI demonstrates that seller customers and competitors were excluded, duplicates were merged, and unclassified companies were not silently forced into a segment.

---

## Stage 8 — Today view and simple account workflow

**Effort: M**

### Goal

Present the useful portfolio outcome: a ranked list of accounts, who the seller should contact, and why now. Keep the workflow small and explainable.

### Files

- `scripts/sdr-queue.cjs` — ranking, factual why-now line and skip reasons.
- `scripts/account-lifecycle.cjs` — only `new`, `working` and `skipped`, with a required reason for skipped.
- `scripts/server/today-page.cjs` — ranked account list with buyer/champion role suggestions and receipt links.
- `scripts/server/account-page.cjs` — account detail, score breakdown, signals, source timeline and status controls.
- Router, navigation and workspace-scoped persistence updates.

### Tests

- Ranking is deterministic from Stage 5 decisions.
- A why-now line can use only stored account facts and receipts.
- Thin evidence produces “limited public signal — verify before outreach.”
- Status transitions are limited to new/working/skipped; skip requires a reason.
- Switching workspaces changes every account and count.
- Killed accounts do not enter Today.

### Definition of Done — browser verifiable

The Today page ranks real accounts and shows a one-line why-now explanation, suggested buyer/champion roles and clickable receipts. Opening an account shows the full evidence and math. The user can mark it working or skipped with a reason, refresh, and see the state persist. No scheduler or sending path exists.

---

## Stage 9 — receipt-backed drafts only

**Effort: M**

### Goal

Create one reviewable email draft from approved seller facts and prospect receipts. Demo mode remains permanently send-free. There is no contact enrichment, Apollo, Instantly, HubSpot, CRM sync, webhook or delivery queue.

### Files

- `scripts/outreach.cjs` — bounded draft context, template fallback, model draft and validation gates.
- `scripts/pain-themes.cjs` — short verbatim prospect quotebook with citation status.
- `scripts/server/draft-page.cjs` — evidence review, regenerate/edit if authorized, explicit draft approval and Copy button.
- Router and draft persistence scoped to workspace/account/revision.

### Tests

- Draft context includes only approved seller claims and saved prospect receipts.
- Validator rejects invented facts, uncited claims, wrong-company evidence, unsupported money/time arithmetic and missing CTA constraints.
- A stale account or profile revision cannot save a draft.
- The Copy button remains disabled until the human explicitly approves the validated draft.
- Copyable output is watermarked as a draft in Demo mode.
- Router/action tests prove there is no send function or delivery route.

### Definition of Done — browser verifiable

From a real account detail page, generate or build a receipt-backed draft, open every cited source, edit the text, approve it and copy it. A validation failure is shown beside the problem and prevents approval/copy. There is no Send button, contact-purchase action, CRM sync or delivery configuration anywhere in the demo.

---

## Stage 11 — manual refresh and interview-ready demo

**Effort: S**

### Goal

Make the local portfolio demo repeatable. Replace all scheduling with a manual **Refresh account** action, add a fail-closed demo preflight, and document a three-minute interview walkthrough.

### Files

- `scripts/refresh-account.cjs` — rerun only the enabled ATS/news collectors for one account, de-duplicate evidence and recalculate decisions.
- `scripts/demo-preflight.cjs` — verify approved seller, usable prospect count, receipts, Today ranking, at least one valid draft, provider state and local data health.
- `package.json` — `demo:preflight` command.
- `docs/DEMO-SCRIPT.md` — exact three-minute flow, talking points and fallback lines.
- Optional `docs/DEMO-RUNBOOK.md` — local startup and recovery steps if needed.

### Tests

- Manual refresh is account- and workspace-scoped, cannot overlap itself and never starts a scheduler.
- Unchanged evidence is not duplicated; changed evidence creates a new source version and recalculates the account.
- Preflight reports clear PASS/FAIL items and never exposes secrets.
- Preflight fails when the profile is unapproved, receipts are missing, the Today queue is empty or no validated draft exists.

### Definition of Done — browser verifiable

Run `npm run demo:preflight -- --workspace <id>` and receive `PREFLIGHT PASS`. In the browser, click Refresh account, observe a bounded progress/result state, and complete the documented three-minute flow in one take: seller → approved ICP → real prospects → ranked why-now view → receipt-backed draft. The demo remains local and send-free.

---

## Deferred — future work

- **Stage 7 scheduler** — deferred because a portfolio demo needs deterministic manual actions, not always-on background operations.
- **SEC/EDGAR collector** — deferred to reduce parsing and issuer-matching scope that is not needed for the core demo.
- **Executive-change collector** — deferred because reliable identity and role-change evidence adds a separate enrichment problem.
- **GitHub collector** — deferred because it benefits only some technical sellers and expands authentication/rate-limit complexity.
- **Signal stacking** — deferred with the scheduler/expanded trigger library; the trimmed demo ranks from fit, tier and current ATS/news evidence.
- **Stage 9 contacts and Apollo** — deferred to avoid paid personal-data enrichment and because role suggestions are sufficient for the portfolio story.
- **Sending and Instantly** — deferred because the demo must remain send-free and the user may not represent every researched seller.
- **CRM/HubSpot sync** — deferred because it does not improve the core proof of targeting, evidence and drafting.
- **Stage 10 authentication** — deferred because the portfolio application remains local and single-user.
- **Postgres and production backups** — deferred because local atomic JSON persistence is sufficient for the demo; these become necessary for multi-user production.
- **Production deployment** — deferred to avoid public exposure before authentication, production storage and operational controls exist.
- **Stage 12 advanced integrations** — deferred because transcripts, internal CRM data, engagement data and specialized collectors are optional expansion paths.

## Completion standard

The trimmed portfolio is complete when one real seller can be demonstrated end to end in under three minutes, every visible factual claim has a clickable receipt or an explicit inferred label, customers/competitors cannot enter the prospect list, ranking math is explainable, the draft passes validator gates, and no send path exists.
