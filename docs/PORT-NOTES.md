# WhyNow SignalScout port notes

## October 29 — live discovery result and executive-window repair

**What the run does:** one marked Vercel preparation under100 queries, with no model. **How it decides:** existing shared gates/collectors; persist every query/account and keep review history. **What changed from SignalScout:** explicit owner/run/monthly budget boundaries and no fabricated success. **Example:**34 queries returned Canonical, but its Legal Counsel “why now” matched boilerplate and its infrastructure-vendor status was ambiguous. It is flagged Needs review; zero genuine Act now is reported.

**What the window fix does:** `collector-triggers.cjs`, `decisioning.cjs` and `repair-executive-windows.cjs` expire departures after the configured executive-change window. **How it decides:** map executive_departure to exec_change/30, override incorrect legacy default/90 metadata, use the reported event date and preserve source receipts. **What changed:** the immutable SignalScout departure capture has a documented metadata-only parity deviation; no factual event text/date/type is rewritten. **Example:** CrowdStrike's September4 receipt expired October4. All five departure records remain, but Today drops it and priority becomes .112.

The live run exposed remaining defects rather than proving general discovery quality: company-boilerplate role matches, original publication versus bulk update dates, /apply and employer parsing, broad segment words and opaque revenue receipts. The report preserves these findings for the next owner-authorized task. No extra provider iteration occurred.

## New-seller discovery — October 28 offline checkpoint

**What it does:** `workspace-hiring.cjs` and the shared trigger-first runner start with a job opening instead of a broad company-page search. **How it decides:** use approved personas/functions/technologies, verify the actual ATS job/date, identify its operating employer from a first-party page, classify it, then apply free sizing, exclusions, scorecard, tiers and kills. **What changed from SignalScout:** Resolve's fixed SRE search phrases become workspace data; strict WhyNow robots/network/budget guards remain. **Example:** a synthetic commerce company hiring a Staff Frontend Engineer with Next.js passes Vercel targeting across all three ATS formats. A graduate role or missing posting does not.

**What the company gate does:** `company-identity.cjs` separates a company from a page, project or vendor. **How it decides:** a domain/name keyword alone is insufficient; same-name domains require disambiguation, and final vendor status needs a first-party product statement tied to the seller's approved capabilities. **What changed:** no page-title promotion or domain blacklist, and the seven saved Vercel failures have explicit negative fixtures. **Example:** Approximated's saved snippet makes it a vendor candidate; only a fetched first-party product receipt can produce its final vendor kill. An ecommerce company merely using custom domains still passes.

**What the coordinator does:** persist each query, source, rejection and admitted account, then refresh only verified buyers under one 100-query hard ceiling. **How it decides:** current Vercel plan budgets 18 ATS searches, up to ten identity/ten size searches and fifty refresh queries; stale profile revisions stop promotion. **What changed:** unknown enrichment cannot erase valid size receipts, old broad candidates remain quarantined history, and zero verified buyers produces an honest zero result. **Example:** a prior Next.js documentation result cannot be refreshed into a buyer merely because it has a saved account ID.

**What receipt/backoff helpers do:** lead with saved ATS job text and bound GDELT 429 retries. **How they decide:** keep original URL/capture date; respect Retry-After/exponential delays, retry once, max five API attempts/check, then temporarily unavailable. **What changed:** WhyNow exposes readable receipt alternatives and failure state rather than assuming a redirect works or unavailable news means no event. **Example:** Coalition's Today receipt opens saved job text; no source request is needed during an interview.

Saved Resolve replay remains honest: Okta/Coalition are valid ATS examples; Altana's role matches but its 2019 corporate sizing needs review. The separate legacy executive-departure SLA alias issue is tracked in the discovery plan, not silently treated as verified freshness.

Final vendor-gate review: approved seller category/offer text constrains category matching; infrastructure-component terms apply only to infrastructure sellers. Targeting technologies alone never establish a vendor. The synthetic AI-application company remains a Vercel buyer candidate even when it sells AI agents through an API, while a first-party custom-domain infrastructure offering is excluded.

## October 28 — review quality and source availability

### Targeting proposals, size bounds and measurement

**What they do:** `draft-icp-targeting.cjs` proposes three framing lines, three questions and target-size text; `messaging-proposals.cjs` gives legacy profiles editable review defaults; `size-rule.cjs` and `size-measurement.cjs` interpret minimums and units. **How they decide:** preserve owner lines, compare a floor only with an explicit smaller maximum, and never substitute total employees for a departmental count. **What changed from SignalScout:** generalized seller configuration replaces Resolve assumptions and missing defaults; human review remains required. **Example:** “100+ employees” accepts floor 100, whereas “under 50 employees” conflicts; Gong's 50-person revenue-team rule cannot be satisfied by 50 engineers.

### Domain suggestions

**What it does:** `domain-suggestions.cjs` proposes sourced organization domains and adds an explicit Confirm action. **How it decides:** use official links/P856 or conservative matching search results; reject short ambiguous names, contradictory businesses and URL-protection wrappers. Follow a real article's Wikidata link when its search API is robots-disallowed. Save cannot silently verify a suggestion. **What changed:** WhyNow records suggestion/confirmation provenance and resets profile approval on confirmation. **Example:** Google's P856 says about.google; it remains Suggested until the owner confirms, while Fern's forest nonprofit and Stably's unrelated stablecoin business are retracted.

### ATS receipt helpers

**What they do:** `ats-receipts.cjs` builds canonical job pages and checks board/job identity; `job-receipt-links.cjs` links readable captures/API fallbacks; `clean-saved-ats-text.cjs` strips encoded markup offline. **How they decide:** actual provider identifiers and original capture dates are retained; closed jobs cannot create current triggers. **What changed:** redirects are exposed honestly, with local content-addressed receipts rather than assuming every provider page renders. **Example:** Coalition's valid SRE job remains eligible via its matching board/job ID and saved API text; SecurityScorecard's 404 is retained as history and drops out of Act now.

### GDELT news

**What it does:** `gdelt-news.cjs` adds a free optional news index beside Serper. **How it decides:** guarded robots/pacing/budgets, fetched publication dates, the same relevance/windows and canonical dedupe; a 429 sets shared cooldown. **What changed:** this is an additional source, not a SignalScout parity replacement, and index observation time alone is not a trigger. **Example:** October 28's one timeout/four rate limits yield unavailable zeros, not negative evidence. Successful live ingestion is still unverified.

### Bounded local research and preparation helpers

**What they do:** one-use Vercel/Gong runners persist progress/caps and safe outputs; `finalize-oct28-receipts.cjs` strengthens saved customer relationship quotes offline. **How they decide:** preflight before spend, mark batches before execution, never repeat a started batch or approve a profile, preserve original outputs/history. **What changed:** this adds durable owner-budget and audit boundaries around workspace-driven ported logic. **Example:** Gong's $1.162665 maximum fits the owner's explicit $1.20 authorization; actual cost is $0.375920, but missing competitors still block approval. Vercel's completed job produces zero usable queue accounts and is reported as a discovery-quality gap, not a successful demo.

Updated October 21, 2026. SignalScout by Isa Iqbal is the read-only behavioral reference and is used with permission. WhyNow keeps its own isolated workspaces, atomic JSON state, receipts, human approval and send-free Demo mode. Phases A and B, Chunk 2, Refresh-all and Chunk 3's validated outreach checkpoint are complete. After the first GPT-5.5 request stopped incomplete, the corrected three-account batch completed with three validator-passing Demo drafts and no send or application-state mutation. No further paid call is authorized.

## `scripts/prepare-demo.cjs`

**What it does:** Runs the night-before pipeline—discover prospects, refresh their public evidence, then expose the recalculated Today ranking—as one persisted background job.

**How it decides:** It requires an owner-approved active workspace and refuses to run while OpenAI is enabled. It shares one hard 150-query Serper budget across discovery and account refresh, reserves the refresh allowance first, records progress and child run IDs, and fails closed if the full set cannot fit.

**What changed from SignalScout:** WhyNow uses an explicit manual button instead of a scheduler, keeps model drafting separate, and persists each stage through atomic workspace state. The reference behavior informs the funnel, but no single-seller constant or unattended send path was copied.

## Any-seller discovery and scorecard configuration

**What it does:** Builds discovery queries and six-signal scoring from the approved seller workspace rather than Resolve-specific constants.

**How it decides:** Search tasks start with the seller's approved segment query templates, then add approved buyer/champion hiring searches and named competitors' customer-story searches. A signal explicitly marked unused is removed from the fit denominator and displayed as **Not used for this seller**; an applicable but uncollected signal stays **Unknown · low confidence**.

**What changed from SignalScout:** SignalScout's single Resolve strategy becomes per-workspace configuration. Existing workspaces remain backward-compatible—all six signals are used unless the owner turns one off. The Vercel recorded-fixture test proves approved ICP → discovery → collected receipt → tier/score/kill → Today without importing Resolve data.

## Focused Stage 2 drafting for a new seller

**What it does:** Separates seller facts, deterministic organization-candidate review and ICP targeting into three bounded Structured Outputs requests.

**How it decides:** Customer and competitor candidates come from saved pages before the model runs; the organization call may keep or drop candidate IDs but cannot invent a company. The targeting call receives the frozen Resolve example and the seller's own evidence. Every purpose is independently configurable and now defaults to GPT-5.5 behind the existing disabled-by-default switch and spending cap.

**What changed from SignalScout:** WhyNow retains the evidence menu, receipt mapping, human review and approval boundary. A free model-list check confirmed GPT-5.5 access; no any-seller paid research call ran in this checkpoint.

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

**What it does:** Builds and validates a deterministic five-block first-touch email. **How it decides:** A non-killed account needs one dated, in-window, account-relevant public receipt plus frozen-reference or owner-approved receipted seller claims. The validator permits natural connective paraphrase but locks company names, complete job titles, technologies, locations, people and numbers to the allowed-facts menu. It also requires customer attribution for every statistic/quote, exact quoted wording, fewer than eight subject words, 60–110 body words, complete sentences, exactly one question, an approved real greeting or the exact Demo-only `Hi {{first_name}},` token, and no body links or internal enum leakage. **What changed from SignalScout:** WhyNow creates one transparent, natural template before any AI option. General non-factual framing comes from an owner-editable seller library. It rejects uncitable/wrong-entity news such as the saved “Mann Circle” water-outage result, rejects generic/invented names and pasted source fragments, and has no delivery path.

### `scripts/outreach-model.cjs`, `scripts/outreach-live.cjs` and the account-page draft surface

**What they do:** Build a bounded Responses API Structured Outputs request, estimate/reserve cost, retain safe provider usage, validate the result and expose a Demo-watermarked Copy button. **How they decide:** `OPENAI_OUTREACH_MODEL` is independent from Stage 2; the default is `gpt-5.5`. GPT-5.x receives SignalScout's 4,000-token, medium-reasoning budget. The prompt receives the same allowed-facts and framing boundary as the local validator, while the validator—not the model—makes the final acceptance decision. Incomplete responses preserve their reason/tokens/cost and are never retried. **What changed from SignalScout:** WhyNow omits automatic output-budget escalation, contact lookup, candidate ranking and every send action. The readable bounded batch completed Coalition, Okta and CrowdStrike in three calls/attempts, validated all three, cost $0.078850 total and left OpenAI disabled/zero.

**Historical worked example (before the accuracy audit):** Binance used its saved AI System Performance Engineer receipt, chose Head of SRE, preserved the literal Demo merge token and cited the frozen Resolve product receipt. The returned 78-word draft passed the gates that existed then. The later accuracy correction below intentionally rejects that draft because the posting is an Accelerator Program role and the copy added unsupported detail.

## Chunk 3 accuracy correction

### Current seller claims and prospect-detail grounding

**What it does:** Refreshes the load-only Resolve demo claims from current first-party pages and makes every draftable claim carry an exact receipt quote. The draft validator also checks concrete prospect details, not just broad keyword overlap. **How it decides:** A seller claim must be a verbatim substring of its saved quote. A hiring opener must preserve the complete saved title; any named technology, location-like proper phrase, number or operational detail must appear in the saved trigger text. **What changed from SignalScout:** The old hard-coded 73%/87%/OpenTelemetry lines are no longer trusted merely because they came from the reference app. WhyNow dates and versions the refreshed evidence and drops wording that is not currently present.

### Early-career and executive-change safeguards

**What it does:** Keeps early-career hiring out of why-now ranking and makes leadership-change copy neutral. **How it decides:** Accelerator Program, intern, graduate, new-grad and junior postings remain auditable but cannot become active triggers or score boosts. Executive changes need two distinct publisher domains; otherwise the UI labels them `single source — verify before outreach`. The opener must say “the recent engineering leadership change,” cannot repeat departure/dollar details, and the phrase “next operating state” is banned. **What changed from SignalScout:** These are deliberate accuracy safeguards added after real model output exposed overly literal and unsupported outreach phrasing.

**Worked example:** Coalition's receipt explicitly contains `Senior Site Reliability Engineer`, `Any location, Canada`, `Kubernetes` and `AWS`, so those details can be used. Binance's Accelerator Program posting is retained in history but no longer puts Binance in `Act now`. After the correction, only Coalition and CrowdStrike qualify, so the exact-three paid batch did not run.

## Chunk 3 readable-email correction

### `config/reference-profiles/resolve-ai.json` and the seller review form

**What they do:** Store a short seller-specific library of safe, general framing sentences and make that library editable with the rest of the workspace targeting configuration. **How they decide:** Framing entries must be complete sentences. They are explicitly non-factual connective language, so they do not pretend to be prospect evidence; names, technologies, places and numbers still have to come from allowed facts. **What changed from SignalScout:** Interview-demo tone can be adjusted per seller without hard-coding Resolve prose or weakening receipt validation.

### `scripts/run-resolve-demo-readable-drafts.cjs`

**What it does:** Executes only the owner-authorized Coalition, Okta and CrowdStrike batch, retains the passing model draft beside its passing deterministic fallback, and records safe usage/cost metadata outside Git. **How it decides:** It starts only when normal local OpenAI settings are off/zero, pins GPT-5.5, one attempt per account and a $0.25 process cap, and refuses any account without a validator-passing fallback. **What changed from SignalScout:** This is a one-use local safety runner, not an application send path. The run used exactly three calls/attempts, cost $0.078850, wrote nothing into application state and returned OpenAI to off/zero.

**Worked example:** Coalition's final model email turns the raw receipt into “Noticed Coalition is hiring a Senior Site Reliability Engineer with Kubernetes and AWS experience.” It keeps the exact risky facts, uses a general approved framing sentence instead of pasted “About us” copy, and attributes the verbatim customer quote to DoorDash.

**Free polish:** WhyNow now allows at most one approved framing sentence, caps a quoted excerpt at 15 words, rejects a quote ending in an ellipsis and deterministically rotates among three owner-editable closing questions. Revalidating the saved GPT-5.5 outputs leaves Okta passing, blocks Coalition only for its trailing quote ellipsis and blocks CrowdStrike only for its overlong quote. Their deterministic template-v2 fallbacks all pass without another provider call.

## SignalScout UI port — October 26, 2026

### `scripts/server/signalscout-styles.cjs`, `styles.cjs` and `pages.cjs`

**What they do:** Bring SignalScout's full public design system, dark grouped sidebar, type, cards, charts and account board into WhyNow. **How they decide:** Navigation counts and Overview metrics come from the selected workspace's saved state; filters are GET parameters, not decorative controls. **What changed:** WhyNow branding, local fonts, explicit workspace switching, narrow-screen Menu and semantic setup forms sit on top of the unchanged source style layers. Full-page navigation keeps the sidebar and scripts current; local detail tabs support browser history.

### `scripts/server/phase-a-pages.cjs`

**What it does:** Renders separate Today, Results, Accounts, account work, Discovery, Scorecard and Kill Log screens in the source layout. **How it decides:** Existing workspace scoring/lifecycle/receipt functions remain authoritative. Missing evidence displays unknown; kills retain scores/tiers/receipts. **What changed:** Source send/contact controls are omitted. Outreach uses approved persona titles, a validated deterministic template and a Demo-only Copy action. Discovery plan previews link to the seller review form rather than silently changing an ICP. Saved signals and trigger history have separate Evidence sections.

**Worked example:** Coalition shows Act now, Tier 1 and fit 40 independently. Its real SRE receipt and approved Resolve claims produce a local merge-field template; Copy reproduces that displayed body exactly. A generic invented recipient is blocked, not accepted to make the demo look complete.

### `scripts/server/activity-pages.cjs` and setup/review renderers

**What they do:** Show saved audit history, background progress, discovery funnel and evidence metrics; restyle existing onboarding, workspace and collector forms. **How they decide:** Only persisted workspace records are counted, including Prepare-demo stage progress. Typed warning reasons, revision checks and unchecked approval acknowledgment remain intact. **What changed:** No fabricated contacts, sends, subscriptions or production integrations are shown. Setup screens have no exact SignalScout counterpart, so their original safe workflow uses the same visual system.
# October 27 — kill evidence quality (deliberate SignalScout deviation)

**What it does:** `kill-evidence.cjs` distinguishes evidence that a prospect operates its own internal tools from product docs, marketing, conference pages and videos. A keyword match alone no longer kills an account. Both the ownership and internal-tooling statement must occur in the same prospect-owned engineering receipt; generated hypotheses cannot lend meaning to an unrelated citation.

**How it decides:** the live tech-culture adapter filters weak hints, and the kill engine independently rechecks saved hints. Build/in-house kills carry the account name and actual supporting text. Workspace-configured adjacent-vendor categories separately exclude category sellers. A vendor claim needs explicit receipted seller language or an owner-directed classification with its saved supporting receipt. Ordinary buyers merely mentioning Grafana are not vendors. Retired decisions remain in `killHistory`; they no longer suppress priority.

**What changed:** this intentionally supersedes three historical Phase A fixture decisions whose citation text did not itself establish internal tooling. The original SignalScout fixture file remains unchanged; scoring/tiering and unaffected decisions retain exact parity. Phase B's frozen pure analyzer output remains a historical normalization contract, while its live adapter and the authoritative kill engine enforce the stricter policy. The load-only Resolve reference is version 8 with dated owner-policy provenance.

**Worked example:** live Databricks' receipt is product documentation describing features it sells, not its internal incident tools. Its build-culture kill is retired. Grafana Labs' saved ATS text explicitly says it is the company behind an observability platform, so its active code becomes `KILL_SELLER_OR_COMPETITOR` (adjacent vendor), not `KILL_BUILD_CULTURE`. The owner explicitly identified Atlassian/Opsgenie as another adjacent incident-tooling vendor; saved Opsgenie reporting is retained as its receipt. No new source was fetched.

## October 27 — desktop review helpers

### `trigger-identity.cjs` and `server/display-date.cjs`

**What they do:** Prevent one job from counting twice and make saved dates readable. **How they decide:** ATS provider plus job ID identifies a job across trigger types; distinct job IDs remain distinct, and ordinary events retain their own identity. Dates use the demo's Los Angeles calendar day rather than rounding elapsed hours. **What changed from SignalScout:** WhyNow adds explicit cross-type receipt identity and a shared date label without changing saved source timestamps. **Worked example:** Okta's one Principal SRE posting no longer earns two independent-trigger boosts; Coalition displays `Oct 8, 2026 · 19 days ago` on October 27.

### `save-recorded-demo-drafts.cjs`

**What it does:** Promotes an existing recorded passing draft into local copy-only state without another generation call. **How it decides:** Revalidate against current allowed facts and receipt gates, keep the source model/template version, require Demo merge fields and save through the normal atomic path. **What changed from SignalScout:** This is an idempotent local recovery helper, not a contact or sending integration. **Worked example:** Okta's saved GPT-5.5 output appears beside its job/product/Coinbase receipt links after a server restart; CrowdStrike uses its passing template-v2 fallback.

### `run-gong-live-research.cjs`

**What it does:** Runs only the owner's three-call Gong authorization. **How it decides:** Reuse saved pages, preflight schema/model/budget, reserve every call's full allowance against $0.90, persist each result, never retry and leave the profile unapproved. **What changed from SignalScout:** A durable one-use marker prevents duplicate spend, and the process restores disabled/zero OpenAI settings in a `finally` block. **Worked example:** The $0.876110 maximum fits the raised cap; actual token-priced cost is $0.222170, but zero competitors still blocks quality approval. No score or status is fabricated to disguise that gap.
