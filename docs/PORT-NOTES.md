# WhyNow SignalScout port notes

Updated October 20, 2026. SignalScout by Isa Iqbal is the read-only behavioral reference and is used with permission. WhyNow keeps its own isolated workspaces, atomic JSON state, receipts, human approval and send-free Demo mode. Phase A is complete; Phase B is not authorized.

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

**What changed from SignalScout:** Core output remains parity-compatible. Trigger collectors and advanced stacking are not ported in Phase A; their interface remains present with no-trigger behavior matching SignalScout. Decision weights and the normalization ceiling now come from workspace configuration.

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
