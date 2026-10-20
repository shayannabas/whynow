# WhyNow SignalScout port notes

Updated October 20, 2026. SignalScout by Isa Iqbal is the read-only behavioral reference and is used with permission. WhyNow keeps its own isolated workspaces, atomic JSON state, receipts, human approval and send-free Demo mode. Phases A and B are complete; no later port chunk has started.

## `scripts/scoring.cjs`

**What it does:** Turns six 1–5 signal scores into a 0–100 fit score while showing how much each signal contributed.

**How it decides:** It reads signal weights from the active workspace, reduces confidence when evidence is missing or inferred, decays old Active Pain evidence, and reports receipt coverage separately from fit. A strong-looking claim without a URL cannot earn full credit.

**What changed from SignalScout:** The math and output shape match SignalScout, but no Resolve weight is hidden in this module. Resolve's weights, version and 90-day trigger window live in the load-only reference configuration.

## `scripts/kills.cjs`

**What it does:** Applies evidence-backed disqualifiers after fit is calculated. A killed account stays saved and visible.

**How it decides:** It checks the workspace's existing customers, public evidence patterns for solving in-house/build culture, verified size evidence and explicit unsellable evidence. It sorts simultaneous kills by the configured precedence and rejects any persisted kill without a code, reason and evidence URL.

**What changed from SignalScout:** Resolve customer names, source URL, keyword patterns, size floor and precedence moved from code into workspace/reference configuration. WhyNow adds `KILL_SELLER_OR_COMPETITOR` so an approved seller or named rival cannot be treated as a prospect; this extension does not change SignalScout's original five-code parity cases.

## `scripts/tiering.cjs`

**What it does:** Separates company magnitude from product fit by assigning Tier 1, 2, 3 or Parked.

**How it decides:** Public-company status, revenue, employee count, valuation, funding stage and funding amount are compared with workspace tier thresholds. Weak confidence makes the tier provisional instead of silently discarding the account. Missing firmographics park it for later verification.

**What changed from SignalScout:** The evidence-only tier behavior is retained, but thresholds come from `workspace.icpConfig.tierRules`. No Apollo or PDL branch is called or required.

## `scripts/decisioning.cjs`

**What it does:** Converts fit and tier into a normalized priority while ensuring kills override ranking.

**How it decides:** It multiplies the tier weight by fit, a freshness factor and the available stack factor, then divides by the configured ceiling. Any kill makes priority exactly zero. It retains the first kill as primary and every remaining reason as `alsoKilledBy`.

**What changed from SignalScout:** Core output remains parity-compatible. Decision weights and the normalization ceiling come from workspace configuration. In the live adapter, external incident/news/executive triggers count only when their source reports a date and the event remains inside its configured window; stale rows remain audit history rather than current “why now” evidence.

## `scripts/signal-rubric.cjs`

**What it does:** Describes the six scorecard rows in a form the UI and tests can consume.

**How it decides:** It reads each signal label and weight from `icpConfig`, fixes the score range at 1–5 and records that full confidence requires evidence.

**What changed from SignalScout:** Resolve labels are no longer module constants. Collector-specific trigger rows stay deferred to Phase B instead of being silently activated.

## `scripts/entity-rules.cjs`

**What it does:** Normalizes company names/domains and recognizes configured parent/brand aliases for duplicate and exclusion checks.

**How it decides:** Exact normalized names or root domains match directly; otherwise both records must resolve to the same configured parent rule.

**What changed from SignalScout:** Uber/Uber Eats is not a hidden global constant. The exact alias rule lives in the frozen Resolve reference and other sellers can supply their own rules.

## `scripts/phase-a-config.cjs`

**What it does:** Creates one safe scoring configuration for the active workspace.

**How it decides:** A normal workspace must be `active` with an owner approval timestamp. The only exception is the explicit load-only Resolve reference demo. The adapter gathers seller identity, customers, competitors, signals, tiers, kills and decision settings without mutating the workspace.

**What changed from SignalScout:** This is WhyNow's isolation and approval boundary. SignalScout's single-seller globals become per-workspace inputs.

## `scripts/score-account.cjs`

**What it does:** Runs the complete Phase A sequence for one account.

**How it decides:** Score first, assign tier independently, then apply kills and priority. This preserves a high fit score even when the account is disqualified.

**What changed from SignalScout:** The orchestration is a small pure function that accepts a complete workspace configuration; it neither loads global state nor calls a provider.

## `scripts/accounts.cjs`

**What it does:** Validates and saves a manually entered account so Phase A can be tested without discovery.

**How it decides:** It requires name, valid domain, enabled workspace segment and public HTTPS source URL; it rejects duplicates using configured entity rules. It initializes six honest “not collected” signals, scores the record and appends an audit event.

**What changed from SignalScout:** Manual entry writes through WhyNow's versioned atomic state and remains workspace-isolated. A source URL is saved as provenance but is not rewritten into an invented quote.

## `scripts/reference-demo.cjs`

**What it does:** Loads the frozen Resolve configuration as a local scoring demo.

**How it decides:** It creates one deterministic `reference_demo` workspace from the validated load-only file and records a `reference_demo_loaded` audit event.

**What changed from SignalScout:** This never writes `approvedAt`, never records profile approval, keeps delivery disabled and cannot stand in for the owner's review of a real seller profile.

## `scripts/server/phase-a-pages.cjs` and Phase A routes

**What it does:** Adds Accounts, Scorecard and Kill Log browser pages.

**How it decides:** The form uses segments from the active configuration. Scorecard shows six contributions, fit, tier and priority. Kill Log displays primary and secondary kills with clickable evidence. Mutating demo actions are local-only and same-origin.

**What changed from SignalScout:** Pages use WhyNow's existing server-rendered shell and workspace switcher. There is no discovery, authentication bypass, outreach or send path in Phase A.

## Railway-ready foundation changes

**What it does:** Lets the existing atomic state file live on a future mounted volume.

**How it decides:** `STATE_DIR` selects the directory and defaults to `.whynow/`; the existing server already reads `process.env.PORT`. Research/provider work remains in background coordinators.

**What changed from SignalScout:** No Railway runtime, database, backup or deployment workflow was copied. Deployment is Phase G only after the owner's explicit OK.

## Worked example — why the Binance-like account is killed

The captured Binance-like account has strong public signals and scores **90/100**. Its size also makes it **Tier 1**. However, its fixture includes a public evidence URL showing that the current prospecting surface is unavailable. The configured kill engine therefore emits `KILL_UNSELLABLE_ORG` with that receipt. Decisioning keeps the 90 fit score for learning and auditability but sets priority to **0**, retains the account in the Kill Log and explains the exact reason. In simple terms: it looks valuable, but the team cannot pursue it through this sales motion, so it should not consume seller time.

## Parity result

`tests/fixtures/parity/signalscout-phase-a.json` was captured once from SignalScout commit `130789f1bac1d5e11f5f5154f269155dc17f2d21`. Ten WhyNow cases reproduce its complete saved scoring, kill, tier and decision outputs exactly. Tests use only the fixture and do not import or modify SignalScout at runtime. No exact-parity exception is recorded for Phase A.

## Phase B collector modules

### `scripts/collectors/runtime.cjs`

**What it does:** Provides the only live network path for collectors. **How it decides:** It requires the crawler contact email, public HTTPS/DNS, allowed redirects, robots permission, per-source pacing, size/type limits and cached budgets. **What changed from SignalScout:** SignalScout's relevant source budgets and cache times are preserved, while WhyNow keeps its stricter DNS pinning, robots checks, atomic cache writes and saved health counters. Skipped sources have no runtime budget.

ATS JSON has a source-specific 16 MB ceiling because large public boards such as Databricks can exceed the normal page limit; every other source keeps its tighter ceiling. Greenhouse, Lever and Ashby slugs are derived from configured domain/name aliases and their standard public board URL shapes. A failed or forbidden source is recorded independently and never blocks unrelated collectors.

### `scripts/firmographics.cjs` and `scripts/collectors/firmographics.cjs`

**What they do:** Build a free, receipted company-size profile from bounded public search and Wikidata evidence. **How they decide:** Employee, revenue, funding, valuation and listing claims must belong to the target company; the tier engine may use lower-confidence proof but marks the tier provisional. Generic `IPO`/`public company` text, truncated one-dollar revenue and metrics stated for a neighboring company are rejected. **What changed from SignalScout:** No Apollo or PDL path exists. WhyNow keeps exact source fields and confidence, prunes legacy misattributed free fields offline, and accepts structured Wikidata exchange claims without treating them like untrusted search boilerplate.

### `scripts/collector-triggers.cjs`, `scripts/pain-themes.cjs` and `scripts/incident-attribution.cjs`

**What they do:** Add expiry dates to time-sensitive events, classify incident pain themes and distinguish first-party incidents from upstream/unknown reports. **How they decide:** Workspace SLA days, configured theme terms and receipt ownership determine decay, labels and whether an incident is safe to cite. **What changed from SignalScout:** They are small collector dependencies only; no scheduler, outreach or later-chunk logic came with them.

### `scripts/collectors/hiring.cjs`

**What it does:** Normalizes Greenhouse, Lever and Ashby jobs into reliability, platform, stack and AI-RCA evidence. **How it decides:** Public job titles/descriptions must match explicit role/tool patterns and keep the posting URL. Three recent new infrastructure roles can create a hiring-surge trigger. **What changed from SignalScout:** The pure classification is parity-compatible; live requests use WhyNow's guarded runtime and workspace SLAs.

### `scripts/collectors/active-pain.cjs`

**What it does:** Collects recent operational incidents from public Statuspage APIs, Hacker News and dated Serper News/search evidence. **How it decides:** A result must name the target or use its domain, describe operational impact, provide a public URL and include a date inside the configured window. A healthy/no-current-problems page scores zero, and an incident about another company does not transfer to the target merely because it appears on the target's content domain. **What changed from SignalScout:** StatusGator's API collector was not ported. Google News RSS was robots-blocked and was replaced with bounded Serper News while continuing to respect robots. This stricter healthy-page/date/near-entity rule is a deliberate correctness deviation from SignalScout.

### `scripts/collectors/search-evidence.cjs`

**What it does:** Runs four bounded searches per account for pain, technology, AI adoption and engineering-leadership changes. **How it decides:** It discards results that neither use the target domain nor explicitly name the target. **What changed from SignalScout:** Search is injected behind WhyNow's persistent per-run/monthly Serper reservation; tracked-person discovery is not used by the Phase B runner.

### `scripts/collectors/executive-change.cjs`

**What it does:** Converts exact public appointment/departure language for CTO and senior engineering roles into expiring triggers. **How it decides:** Target name, action, role and recency must occur in a supported sentence with a URL. **What changed from SignalScout:** PhantomBuster and people-led account discovery were removed; only receipted search results for the refreshed account are used.

### `scripts/collectors/edgar-form-d.cjs`

**What it does:** Checks SEC daily indexes and one workspace segment query for matching Form D fundraising. **How it decides:** Company/alias matching is exact after legal-suffix normalization, and details are included only when disclosed in the filing. **What changed from SignalScout:** Resolve segment queries moved into workspace configuration. Risk-factor collection and discovery promotion are not run; account refresh keeps only events for the named account. The live SEC endpoint still returned 403 with the required name-plus-contact identity; that error is retained without blocking other sources, and Phase B does not spend more time retrying it.

### `scripts/collectors/tech-culture.cjs`

**What it does:** Finds receipted production-stack, observability, OpenTelemetry-adoption and build-in-house evidence. **How it decides:** Explicit technology phrases create signals; explicit built/open-sourced/internal platform phrases create retained kill hints. **What changed from SignalScout:** GitHub and the OTel graph were not ported. The collector uses bounded search results or explicitly configured public engineering sources.

### `scripts/collectors/ai-compatibility.cjs`

**What it does:** Scores public evidence of LLM, generative-AI and AI-assisted engineering adoption. **How it decides:** One or more explicit AI engineering terms plus a URL are required. **What changed from SignalScout:** Classification parity is preserved, but inputs come only from the current account's guarded search/job evidence.

### `scripts/collectors/competitive-wedge.cjs`

**What it does:** Verifies configured seller customers on the saved customer page and maps same-segment customer proof to a prospect. **How it decides:** Customer names and segment wedge lists come from the workspace; unverified names produce no signal. **What changed from SignalScout:** Resolve customer names, URL, source ID and seller label are configuration, not module constants.

### `scripts/collectors/revenue-sensitivity.cjs`

**What it does:** Estimates how directly production failure affects transactions. **How it decides:** Workspace segment rules distinguish lost transactions, returning customers and non-transactional models; a public event can add a receipted boost, otherwise the signal is explicitly inferred. **What changed from SignalScout:** All Resolve segment and keyword rules moved into the reference/workspace configuration.

### `scripts/phase-b-config.cjs`, `scripts/phase-b-runner.cjs` and the account page

**What they do:** Translate an approved/reference workspace into collector inputs, run each collector in a background job, merge evidence without erasing better receipts, and rerun Phase A scoring/kills/tiers. **How they decide:** Normal workspaces require owner approval; the frozen Resolve demo is the only load-only exception. Serper queries are reserved persistently before use, interrupted runs are recorded, and every collector shows complete, disabled or error. **What changed from SignalScout:** WhyNow adds workspace isolation, atomic JSON progress, the manual **Refresh account** button and a receipt/error UI. No scheduler, discovery promotion, OpenAI or send path is active.

## Phase B parity and worked example

`tests/fixtures/parity/signalscout-phase-b.json` freezes 18 pure collector outputs from the same SignalScout commit. WhyNow reproduces them exactly without importing SignalScout at test time. For example, the Binance fixture turns its public Greenhouse reliability/AI-RCA roles into stack and hiring triggers, then the Phase A engine recalculates fit and priority; the job URLs remain the explanation for every point earned. Live adapters add network safety and persistence around that unchanged classification contract.

The live Binance account is not automatically `KILL_UNSELLABLE_ORG`. The parity fixture supplies an explicit unavailable prospecting surface and receipt; the saved live evidence does not. WhyNow never infers a kill from size or fit alone.
