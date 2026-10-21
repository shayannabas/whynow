# WhyNow SignalScout port notes

Updated October 21, 2026. SignalScout by Isa Iqbal is the read-only behavioral reference and is used with permission. WhyNow keeps its own isolated workspaces, atomic JSON state, receipts, human approval and send-free Demo mode. Phases A and B, Chunk 2, Refresh-all and Chunk 3's deterministic outreach checkpoint are complete. One bounded GPT-5.5 request was attempted and stopped on an incomplete response; no validated draft or send resulted, and no further paid call is authorized.

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

## Portable local-state foundation

**What it does:** Lets the existing atomic state file live on a future mounted volume.

**How it decides:** `STATE_DIR` selects the directory and defaults to `.whynow/`; the existing server already reads `process.env.PORT`. Research/provider work remains in background coordinators.

**What changed from SignalScout:** No Railway runtime, database, backup or deployment workflow was copied. Interview demos run locally with screen sharing. Railway is a deferred backup only and requires the owner's explicit OK; it is not a planned phase.

## Worked example — why the Binance-like account is killed

The captured Binance-like account has strong public signals and scores **90/100**. Its size also makes it **Tier 1**. However, its fixture includes a public evidence URL showing that the current prospecting surface is unavailable. The configured kill engine therefore emits `KILL_UNSELLABLE_ORG` with that receipt. Decisioning keeps the 90 fit score for learning and auditability but sets priority to **0**, retains the account in the Kill Log and explains the exact reason. In simple terms: it looks valuable, but the team cannot pursue it through this sales motion, so it should not consume seller time.

## Parity result

`tests/fixtures/parity/signalscout-phase-a.json` was captured once from SignalScout commit `130789f1bac1d5e11f5f5154f269155dc17f2d21`. Ten WhyNow cases reproduce its complete saved scoring, kill, tier and decision outputs exactly. Tests use only the fixture and do not import or modify SignalScout at runtime. No exact-parity exception is recorded for Phase A.

## Phase B collector modules

### `scripts/collectors/runtime.cjs`

**What it does:** Provides the only live network path for collectors. **How it decides:** It requires the crawler contact email, public HTTPS/DNS, allowed redirects, robots permission, per-source pacing, size/type limits and cached budgets. Documented SEC data APIs are the only exception to the robots preflight; they still require SEC's name-plus-contact identity and every other network guard. **What changed from SignalScout:** SignalScout's relevant source budgets and cache times are preserved, while WhyNow keeps its stricter DNS pinning, robots checks, atomic cache writes and saved health counters. The narrow SEC-data exception matches SignalScout's direct official-API behavior after a curl proved the endpoint itself accepted this machine. Skipped sources have no runtime budget.

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

**What it does:** Runs five bounded searches per account for pain, technology/AI, engineering-leadership changes and free firmographics. **How it decides:** It discards results that neither use the target domain nor explicitly name the target. A workspace-configured division rule may supply a parent name/domain for only the two sizing searches while the division remains visible. **What changed from SignalScout:** Search is injected behind WhyNow's persistent per-run/monthly Serper reservation; tracked-person discovery is not used by the Phase B runner.

### `scripts/collectors/executive-change.cjs`

**What it does:** Converts exact public appointment/departure language for CTO and senior engineering roles into expiring triggers. **How it decides:** Target name, action, role and recency must occur in a supported sentence with a URL. **What changed from SignalScout:** PhantomBuster and people-led account discovery were removed; only receipted search results for the refreshed account are used.

### `scripts/collectors/edgar-form-d.cjs`

**What it does:** Checks SEC daily indexes and one workspace segment query for matching Form D fundraising. **How it decides:** Company/alias matching is exact after legal-suffix normalization, and details are included only when disclosed in the filing. **What changed from SignalScout:** Resolve segment queries moved into workspace configuration. Risk-factor collection and discovery promotion are not run; account refresh keeps only events for the named account. WhyNow now calls only documented SEC data URLs directly, using the required name-plus-contact identity; its earlier 403 came from a robots pre-check rather than the data API. SEC errors remain isolated from every other collector.

### `scripts/collectors/tech-culture.cjs`

**What it does:** Finds receipted production-stack, observability, OpenTelemetry-adoption and build-in-house evidence. **How it decides:** Explicit technology phrases create signals; explicit built/open-sourced/internal platform phrases create retained kill hints. **What changed from SignalScout:** GitHub and the OTel graph were not ported. The collector uses bounded search results or explicitly configured public engineering sources.

### `scripts/collectors/ai-compatibility.cjs`

**What it does:** Scores public evidence of LLM, generative-AI and AI-assisted engineering adoption. **How it decides:** One or more explicit AI engineering terms plus a URL are required. **What changed from SignalScout:** Classification parity is preserved, but inputs come only from the current account's guarded search/job evidence.

### `scripts/collectors/competitive-wedge.cjs`

**What it does:** Verifies configured seller customers on the saved customer page and maps same-segment customer proof to a prospect. **How it decides:** Customer names and segment wedge lists come from the workspace; unverified names produce no signal. **What changed from SignalScout:** Resolve customer names, URL, source ID and seller label are configuration, not module constants.

### `scripts/collectors/revenue-sensitivity.cjs`

**What it does:** Estimates how directly production failure affects transactions. **How it decides:** Workspace segment rules distinguish lost transactions, returning customers and non-transactional models; a public event can add a receipted boost, otherwise the signal is explicitly inferred. **What changed from SignalScout:** All Resolve segment and keyword rules moved into the reference/workspace configuration.

### `scripts/phase-b-config.cjs`, `scripts/phase-b-runner.cjs` and the account page

**What they do:** Translate an approved/reference workspace into collector inputs, run each collector in a background job, merge evidence without erasing better receipts, and rerun Phase A scoring/kills/tiers. **How they decide:** Normal workspaces require owner approval; the frozen Resolve demo is the only load-only exception. Serper queries are reserved persistently before use, interrupted runs are recorded, and every collector shows complete, disabled or error. Workspace entity rules let a division inherit its parent's size evidence—for example, Uber Eats remains the visible account while Uber/uber.com is used for firmographics. **What changed from SignalScout:** WhyNow adds workspace isolation, atomic JSON progress, the manual **Refresh account** button and a receipt/error UI. No scheduler, OpenAI or send path is active.

## Phase B parity and worked example

`tests/fixtures/parity/signalscout-phase-b.json` freezes 18 pure collector outputs from the same SignalScout commit. WhyNow reproduces them exactly without importing SignalScout at test time. For example, the Binance fixture turns its public Greenhouse reliability/AI-RCA roles into stack and hiring triggers, then the Phase A engine recalculates fit and priority; the job URLs remain the explanation for every point earned. Live adapters add network safety and persistence around that unchanged classification contract.

The live Binance account is not automatically `KILL_UNSELLABLE_ORG`. The parity fixture supplies an explicit unavailable prospecting surface and receipt; the saved live evidence does not. WhyNow never infers a kill from size or fit alone.

## Chunk 2 discovery and SDR surface

### `config/reference-profiles/resolve-ai-discovery.json` and `scripts/discovery-universe.cjs`

**What they do:** Freeze SignalScout's curated Resolve prospect universe as load-only configuration with its source commit and lines. **How they decide:** Each seed has a real name, canonical domain, segment and official-site receipt; the reference loader copies those values into the demo workspace's `universeSeeds`. **What changed from SignalScout:** Resolve companies are not hidden module constants. Discovery code reads the active workspace, so another approved seller can provide a different universe without changing code.

### `scripts/company-discovery.cjs`

**What it does:** Builds a bounded workspace-segment search matrix, applies the noise/exclusion gate, balances candidates across segments and promotes receipted companies into atomic state. **How it decides:** Search results need an official-looking name/domain match plus segment terms. The seller, customers, competitors, existing accounts, blocked publishers/directories, duplicates and unclassified rows never become prospects. **What changed from SignalScout:** The 60-query hard ceiling is the owner-authorized light-demo limit rather than SignalScout's 150-query production matrix. SignalScout's seed behavior is retained through workspace configuration, and every promoted account starts with honest uncollected signals rather than invented fit evidence.

### `scripts/discovery-runner.cjs`

**What it does:** Runs discovery as a persisted background job and saves its funnel counts, errors, selected account IDs and exact Serper usage. **How it decides:** It requires Serper's normal enable/key/monthly guards plus a separate positive discovery-run cap, reserves each query before sending it, searches every enabled segment once before it may stop, and targets 20–30 balanced accounts. **What changed from SignalScout:** A failed query is isolated and the curated workspace universe can still produce a demo; interrupted or failed work is explicit state rather than an in-memory-only task. No OpenAI call or account collector is started by discovery.

### `scripts/account-lifecycle.cjs` and the Today/account pages

**What they do:** Turn saved prospects into a small seller work queue and let the user mark an account `new`, `working` or `skipped`. **How they decide:** Killed and skipped accounts remain saved but leave Today; working accounts rank first, then priority, active receipted triggers and fit. A skip requires a typed reason and every change enters the audit log. The why-now line uses only a currently active trigger and otherwise says that the account still needs a refresh. **What changed from SignalScout:** Contacts, drafts, sends and full CRM stages are deliberately absent. The account page adds the receipted size reason, current triggers and a compact status form while preserving WhyNow's existing Refresh account action.

### `scripts/refresh-all-runner.cjs`

**What it does:** Runs the account collectors sequentially across every discovered account as one persisted background job. **How it decides:** The feature is off by default, requires a positive process-only cap, refuses to start when the account count could exceed the hard 150-query ceiling, and records each child run plus its exact Serper usage. **What changed from SignalScout:** WhyNow exposes one local **Refresh all** action instead of relying on a scheduler. The existing guarded runtime, source-level errors and atomic state remain in charge, so one broken source or account does not erase other results.

Uncollected signals follow SignalScout exactly: the six-signal scorer assigns an explicit score-1, inferred prior at 40% confidence. Six entirely unknown signals therefore produce 8/100, zero receipts and the `mostly-inferred` label—not a claim that the company lacks pain or fit. WhyNow's browser now displays these rows as **Unknown · low confidence** so the numerical prior is not mistaken for negative evidence.

## Step 1 — evidence-filled Today queue

### `scripts/refresh-all-runner.cjs` live checkpoint

**What it does:** Completed one background pass over all 25 discovered accounts. **How it decides:** The persisted parent run holds the account list, a 150-query hard ceiling and every child run; the already-running job was allowed to finish instead of being duplicated. **What changed from SignalScout:** This is a local, explicit Refresh-all action rather than a scheduler. The run used 125 Serper queries, made zero OpenAI calls and left failed optional sources as unknown evidence.

**Worked example:** Binance reached Tier 1 with fit 49 and a current Greenhouse receipt. Its uncollected active-pain signal still displays as `Unknown · low confidence`; WhyNow does not turn that missing source into a claim that Binance has no production pain.

## Chunk 3 — offline outreach templates

### `scripts/message-targeting.cjs`

**What it does:** Classifies an approved workspace persona or manually entered recipient above or below the engineering power line, estimates awareness, chooses an operating-pressure layer and selects CTA severity. **How it decides:** Workspace buyer/champion titles gate eligibility; recent citable incidents outrank broad AI-forward language; absent history defaults to the least aggressive seed question. **What changed from SignalScout:** Resolve-aware wording became seller-neutral, and Apollo/contact selection is absent. A real recipient can be entered locally; otherwise Demo mode chooses an approved buyer/champion title and keeps the literal `{{first_name}}` merge token.

### `scripts/outreach-drafts.cjs`

**What it does:** Builds and validates a deterministic five-block first-touch email. **How it decides:** A non-killed account needs one dated, in-window, account-relevant public receipt plus frozen-reference or owner-approved receipted seller claims. The validator enforces an eight-word subject, 60–110 body words, exact claim wording, an approved real greeting or the exact Demo-only `Hi {{first_name}},` token, no body links and no internal enum leakage. **What changed from SignalScout:** WhyNow creates one transparent template before any AI option. It rejects uncitable/wrong-entity news such as the saved “Mann Circle” water-outage result, rejects generic or invented greetings, and has no delivery path.

### `scripts/outreach-model.cjs` and the account-page draft surface

**What they do:** Build a bounded Responses API Structured Outputs request, estimate/reserve cost, enforce recorded-fixture model identity, validate the result and expose a Demo-watermarked Copy button. **How they decide:** `OPENAI_OUTREACH_MODEL` is independent from Stage 2; the default is `gpt-5.5`. Only 429/5xx responses may use the single transient retry, and any incomplete or invalid result stops the batch. **What changed from SignalScout:** Contact lookup, candidate ranking and every send action remain absent. The authorized live checkpoint stopped after Binance returned `incomplete`; it made one request, produced no validator-ready draft, and did not call Coalition or CrowdStrike. Exact cost was not retained; the conservative reservation was $0.022015.

**Worked example:** With a real VP Engineering name, a current Acme Cloud SRE-job receipt and the frozen Resolve product/credential/proof receipts, the deterministic draft passes. Removing the receipt, aging it out, changing `73%` to `91%`, entering a CFO title or removing the approved seller evidence blocks the draft instead of silently rewriting it.
