# WhyNow traceability

## Port-mode Phase A — 2026-10-20

The owner authorized Phase A after the Stage 2.5 pause. The immutable fixture `tests/fixtures/parity/signalscout-phase-a.json` records full inputs and exact outputs from SignalScout's `scoreSignals`, `evaluateKills`, `tierCompany` and `applyDecisioning` functions at commit `130789f1bac1d5e11f5f5154f269155dc17f2d21`. It covers the five named gold-standard shapes, clean Tier 1/2/3 accounts, an existing customer and a simultaneous five-rule precedence case. WhyNow tests load only this saved fixture; SignalScout is never imported at test runtime. All ten cases match exactly.

Resolve reference profile v2 remains load-only and now records line-level provenance for every moved runtime constant: segments/personas, scoring weights and trigger window, customer exclusions, kill floor/patterns/precedence, tier rules, decision rules and the Uber identity alias. Normal workspaces require owner approval before scoring; the explicit `reference_demo` adapter is a non-approved local parity surface with delivery disabled.

Phase A adds `scoring.cjs`, `kills.cjs`, `tiering.cjs`, `decisioning.cjs`, `signal-rubric.cjs`, `entity-rules.cjs`, the workspace config adapter, score orchestrator, manual account persistence and local reference loader. The browser exposes Accounts, Scorecard and Kill Log. A real isolated walkthrough loaded Resolve, added Coinbase, displayed 8/100 inferred fit, retained `KILL_EXISTING_CUSTOMER` with `https://resolve.ai/customers`, restarted and preserved the same record. `STATE_DIR` selects the durable state directory and the existing server continues to honor `PORT`; Railway deployment is deferred backup-only work requiring owner approval.

Verification: 31 test files passed, 144 active tests passed and one pre-existing future scaffold remains skipped. No Serper, OpenAI or other provider ran; no seller profile was approved; no deployment occurred. Phase B is not authorized.

## Port-mode direction and Stage 2.5 pause — 2026-10-20

The owner superseded the active Stage 2.5 plan and `docs/IMPLEMENTATION-PLAN-TRIMMED.md` with a six-phase port of the permitted SignalScout functionality. SignalScout (`github.com/isaiqba-cell/flowfire`) by Isa Iqbal is read-only reference material used with permission; its environment files and secrets must never be read or copied. WhyNow retains workspace isolation, atomic JSON persistence, receipts, human approval and send-free Demo mode. Explicitly excluded services are Apollo, PhantomBuster, PDL/paid firmographics, StatusGator, Instantly, HubSpot, Clerk, Postgres, backups, Railway and uptime workflow.

The green Stage 2.5 code remains committed at `3cdabaf` as a future research-quality improvement. Its extractor and tests are not removed. This paragraph records the direction-change checkpoint before Phase A was later authorized and completed above.

## Stage 2.5 research-quality offline checkpoint — 2026-10-20

`scripts/onboarding/extract-organizations.cjs` now derives organization candidates from saved first-party customer-story URLs/titles, index links/logo alt text and comparison pages. Customer domains are retained only when a matching outbound company link is present on the saved page; otherwise the field stays blank with `domain_missing`. Candidates with saved receipts are distinguished from uncertain raw-HTML-only candidates, and the focused organization-review request may only keep or drop supplied IDs.

The independent `tests/fixtures/eval/*-expected.json` proposals were written by reading the saved sources directly, not from extractor output. A separate direct-source check verified every proposed URL and quote. All labels remain `unconfirmed`, so the default confirmed-only score has no denominator. Provisional recall is Resolve AI 7/7 customers and 2/2 competitors, Shopify 3/3 and 2/2, and Vercel 3/3 and 3/3. Extraction found 7/51/14 customer candidates, with proven domains for 2/3/2, and 2/2/3 competitor candidates respectively. Raw HTML matched 12/15, 9/14 and 8/14 first-party source records and covered the relevant organization pages; no refetch occurred.

Drafting request construction is split into seller facts, deterministic organization review and ICP targeting. The targeting request includes the frozen Resolve configuration as a specificity example and explicitly bans product-category/vendor-seeking prospect searches. Per-purpose model configuration defaults remain GPT-4o mini. A read-only authenticated model-list request returned HTTP 200 and listed `gpt-5.4-mini-2026-03-17`; no generation was made. Official model documentation confirms Structured Outputs support. The conservative actual-request maximum estimates are $0.060889/$0.064908/$0.054006 per seller, so no paid test is proposed under the old cap.

Offline tests cover synthetic positive and missing-HTML/domain cases, independent unconfirmed keys, confirmed-only filtering, organization/persona/size scoring, no-invention request boundaries, model routing and documented Structured Outputs limits. Full verification passes with 27 files, 125 active tests and one existing Stage 3 scaffold skip. No profile was edited or approved and Stage 3 did not start. See `docs/STAGE-2.5-RESEARCH-QUALITY.md`.

## Fixed-schema saved-pages draft — 2026-10-19

The owner authorized one additional GPT-4o mini draft for Resolve AI, Shopify and Vercel using only the saved final-run pages, fixed evidence packet and fixed receipt schema from commit `6fd10a4`. Preflight passed every documented schema limit and estimated $0.026104 maximum cost, below the $0.04 stop line. The process made exactly three provider attempts—one successful attempt per seller—with no retry, no page fetch, no Serper query and no automatic approval.

After the third success, a local snapshot-path import bug stopped post-processing. The generated drafts were intact in isolated persistent state and were finalized offline without another provider call. Because the runner's successful API usage array existed only in the interrupted process memory, provider-reported token usage and exact cost were not retained. The persisted conservative reservations total $0.026104; documentation does not mislabel that estimate as actual cost.

The new snapshots and acceptance state remain `needs_review`. Resolve AI has 0 customers, 0 competitors, Employees/500 matching “500+ employees,” buyer/champion titles and 11 blocking/2 advisory findings. Shopify has 0 customers, two sourced competitors (BigCommerce and WooCommerce), Annual Revenue/$100,000 matching “Small to Enterprise,” personas and 13/0 findings. Vercel has 0 customers, 0 competitors, Employees/1,000 matching “1000+ employees,” personas and 8/4 findings. Normal OpenAI settings are disabled/zero. No profile was approved and Stage 3 did not start.

## Saved-pages packet redraft attempt — 2026-10-19

The owner authorized one GPT-4o mini drafting call for each of Resolve AI, Shopify and Vercel using only the saved final-run pages and fixed packet from commit `68774af`. `AGENTS.md` records the exact limits: no page fetches, no Serper, existing single transient retry only, temporary process-only $0.05 cap, no automatic approval and immediate confirmation that normal settings are disabled/zero.

Preflight measured the complete requests at 171,685, 175,534 and 141,203 bytes. Using a conservative three request bytes per input token plus fixed overhead, the estimated input cost was $0.024729 and maximum estimated input-plus-output cost was $0.032103. This passed the owner's $0.04 stop threshold. The client now accepts a bounded 360 KB request and reserves against the same conservative token estimate; its larger-request and budget behavior are offline-tested.

The run stopped on the first seller. Resolve AI made one provider attempt and the isolated working state recorded safe status `REQUEST_FAILED`; the existing transient retry condition was not triggered. Shopify and Vercel made zero attempts. No generated output reached the main acceptance state, so the existing three `needs_review` profiles and their pass-bar results remain unchanged. The safe client did not expose the provider response body, and this record does not speculate about its contents.

The exact request was subsequently reconstructed offline. The old schema duplicated every receipt ID in two enums: Resolve AI had 1,097 total enum values, Shopify 1,211 and Vercel 979. Resolve AI and Shopify exceeded OpenAI's documented 1,000-value Structured Outputs limit; Shopify's 15,730-character large enum also exceeded the 15,000-character limit. The failed run did not retain its HTTP status. No additional provider call was made.

`scripts/onboarding/synthesize.cjs` now exposes only short run-local receipt IDs through one enum, caps future menus at 900 receipts in existing source-priority order, validates selections and maps them back to stable IDs before the unchanged grounding path. `scripts/openai-schema.cjs` measures and blocks schema-limit regressions. `scripts/llm.cjs` and `scripts/onboarding/synthesis-runner.cjs` retain only the numeric HTTP status in future safe `REQUEST_FAILED` diagnostics. The captured post-fix schemas are 548/605/489 enum values with 2,192/2,420/1,956 enum characters; each remains well within the documented property, nesting and total-string ceilings. Tests cover the three real captured packet shapes, priority cap, short-to-stable mapping and status-only error persistence. Full verification passed with 23 files, 116 passing tests and one intentional Stage 3 skip.

After the stopped attempt, `OPENAI_ENABLED=false` and `OPENAI_MONTHLY_LIMIT_USD=0` were confirmed without displaying secrets. There were zero page fetches, zero Serper queries, no approvals and no Stage 3 work. After the offline schema fix, the full suite passes with 116 tests across 23 files and one intentional Stage 3 skip. No further provider attempt is authorized.

## Stage 2 evidence-packet root-cause audit — 2026-10-19

The final-run pages were present, but the old drafting input capped the complete receipt menu at 24,000 bytes, split excerpt space across every selected source and sampled from each page's beginning. Resolve AI and Shopify nearly filled that ceiling with only 101 and 122 receipts; Vercel produced 74. This favored headers, navigation and hero copy over customer names and comparison evidence farther down the saved pages.

The offline fix raises the hard ceiling to 120,000 bytes, assigns larger page budgets to customer/case-study and comparison sources followed by pricing and about/enterprise sources, and ranks non-navigation sentences containing organization, customer, comparison, pricing and company-size language. It does not change receipt grounding, partner-page exclusion, claim-overlap checks or any other quality rule.

Rebuilding the unchanged saved sources produced 119,824 bytes/548 receipts for Resolve AI, 119,852/605 for Shopify and 93,160/489 for Vercel. All checked organization names on the individual customer and comparison pages now occur in their source's receipt menu. Names not actually present in an index page's saved text are reported as `not present in saved source`, not as packet failures. The source-by-source counts and before/after name matrix are in `docs/STAGE-2-FINAL-RERUN.md`.

Three new tests cover saved-page customer/competitor excerpts, priority-weighted budgets, navigation exclusion and a 20-source limit stress case. Full verification passed: 22 files, 112 tests passed and one intentionally skipped Stage 3 scaffold test (113 total). The first sandboxed run could not bind local HTTP test ports; the unchanged suite passed when rerun with localhost permission. No page fetch, Serper query, OpenAI call, profile edit or approval occurred. At that offline checkpoint `AGENTS.md` had not been changed and Stage 3 had not started.

The earlier instruction to proceed directly to manual correction is superseded by this checkpoint. Manual fixes are paused. A saved-pages-only GPT-4o mini drafting run requires a new explicit owner authorization and is not part of this commit.

## Final Stage 2 rerun — 2026-10-19

The owner authorized the last automated Stage 2 iteration. `scripts/stage2-final-rerun.cjs` uses a one-time marker, an explicit first-party allowlist, no Serper search and a process-only OpenAI cap. The run fetched 29/29 pages with zero errors, used exactly three GPT-4o mini calls with no retry and recorded $0.007646 in token-priced cost under the $0.05 cap. Normal local OpenAI settings stayed disabled/zero, no profile was approved and Stage 3 did not start.

The new persisted drafts honestly failed the complete pass bar. Resolve AI has 2 first-party customers, no competitors, a consistent Employees/1,000 rule, buyer/champion titles and 8 blocking/4 advisory warnings. Shopify has 0/0 organizations, a compatible Employee Count/50 rule, personas and 25/1 warnings. Vercel has 0/0 organizations, a compatible employees/100 rule, personas and 16/5 warnings. Manual correction was subsequently paused when the evidence-packet root cause above was confirmed. Full details are in `docs/STAGE-2-FINAL-RERUN.md`.

## Stage 2 warning levels and one-rerun preparation — 2026-10-19

Stage 2 remains reopened for quality. The 9/23/27 offline findings are now classified rather than all treated as blocking: Resolve AI has 7 blocking and 2 advisory findings, Shopify 18 and 5, and Vercel revision 1 has 23 and 4. Blocking findings require a fix or a typed audit reason. Advisories stay beside the affected field and do not appear in the approval-reason form. New tests cover missing personas, severity assignment, advisory UI and advisory-only approval behavior. Verification passed with 107 active tests across 21 files, one intentional Stage 3 skip and zero production dependency vulnerabilities.

This preparation was superseded before execution: the owner noticed that the 17-page plan lacked sufficient explicit Resolve AI and Shopify customer coverage. It is retained as history. The expanded 29-page final plan and its real results are recorded above.

## Stage 2 quality audit — 2026-10-13

Vercel revision 1 demonstrated that 100% exact-substring receipt coverage did not mean a generated profile was useful. Navigation text, page titles, taglines, unrelated quotes and partner-page descriptions could all pass the old check. The original acceptance runner also did not persist its profiles. A bounded recovery run later saved public-data snapshots for Resolve AI, Shopify and Vercel plus separate `needs_review` acceptance state; it did not auto-approve them.

Steps 1–4 of the quality correction are now implemented offline. Research prioritizes customers, case studies, enterprise, pricing, comparison/alternatives and about pages within the existing 20-page ceiling. Partner/marketplace/template pages rank last and cannot support the seller's own facts. Receipt candidates remove common page chrome and require minimum context plus meaningful claim overlap. ICP review now blocks empty organizations, unmeasurable or contradictory size, slogan-like facts, vendor-seeking prospect searches, pain-like kill rules and kill/trigger overlap.

Warnings do not rewrite model output. The review page explains each warning next to its field. Approval requires a distinct typed reason for every remaining warning; the audit log stores the finding and reason, and any edit invalidates the approval context so reasons must be entered again. Tests pair synthetic passing cases with real negative snapshots. The immutable recovered drafts now report 9 warnings for Resolve AI, 23 for Shopify and 27 for Vercel revision 1. Possible correct-but-weak-evidence flags are documented rather than silently loosened in `docs/STAGE-2-QUALITY-AUDIT.md`.

Verification: all 21 test files passed, with 104 active tests and one intentional Stage 3 scaffold skip. No page was fetched and no Serper or OpenAI call was made for this audit. Normal OpenAI settings remain disabled/zero. Step 5 requires separate owner approval; the three recovered profiles remain `needs_review`, and Stage 3 has not started.

## Superseded Stage 2 completion claim — 2026-10-13

The historical record below describes the earlier acceptance result. Its conclusion that Stage 2 was complete is superseded by the quality audit above. In particular, the original acceptance did not persist its profiles, and exact substring receipts did not establish evidence quality.

Completed the owner-authorized real-key acceptance for Resolve AI, Shopify and Vercel. The first live attempt exposed a too-short twenty-second AI timeout, and later runs exposed nondeterministic quote copying plus an approval-contract mismatch. The production fix keeps a bounded ninety-second timeout and converts each saved source excerpt into server-created receipt snippets. OpenAI can only select valid receipt IDs from the request schema; it cannot rewrite their text. The server resolves each ID back to the saved source, rechecks the exact quote, and requires receipt-backed category, product and target-industry fields before a generated draft can reach approval.

All 93 tests pass after the change. The final current-code acceptance saved 19 Resolve AI pages, 19 Shopify pages and 15 Vercel pages. Each draft used one OpenAI call with no retry, reached 100% receipt coverage with zero warnings or rejected organizations, rendered the review controls and passed explicit approval. Uncached research observations during the same acceptance were 63.9 seconds, 46.4 seconds and 123.0 seconds respectively. To avoid duplicate Serper charges, the final run reused the test's saved real-page cache for Resolve AI and Shopify; Vercel was uncached. The final three OpenAI calls reported 34,262 prompt tokens and 4,291 completion tokens, an estimated $0.007714 at the documented GPT-4o mini rates; the local conservative reservation was $0.028775 under a temporary $0.05 process cap. Earlier diagnostics are not included in that cost estimate.

The test never changed normal provider settings. A post-run secret-safe check confirmed the ignored `.env` still had `OPENAI_ENABLED=false` and `OPENAI_MONTHLY_LIMIT_USD=0`; the owner's $1 OpenAI platform limit remains the independent outer guard. A live monthly refresh is still deferred pending separate owner authorization.

Closed the remaining local Stage 2 implementation gaps. Seller research now expands its bounded plan from relevant homepage and sitemap links and may accept seller-tied results from the allowlisted Greenhouse, Lever, Ashby and SEC/EDGAR hosts. Redirects must remain on the approved seller or external host. The results screen shows bounded progress events without exposing provider credentials or treating search snippets as evidence.

Completed the editable review surface for all generated targeting settings: segment enablement, six scoring weights, signal definitions and rubrics, source preferences, timing windows, tier rules, messaging guidance and the one-sentence pitch. Numeric and enum values are bounded on the server. Saving creates a new review revision; approval still requires an explicit acknowledgement and keeps delivery disabled in Demo mode.

Added `refresh-runner.cjs`, the persistent monthly coordinator. A due approved seller is copied into a hidden system workspace, the existing bounded research and source-only synthesis pipelines run there, grounding is rechecked, and only a reviewable diff reaches the approved workspace. The original profile stays active. Hidden refresh workspaces cannot appear in the switcher or Workspaces page and cannot be opened directly. Interrupted runs can resume. With the current `OPENAI_ENABLED=false` and zero-dollar limit, the coordinator is dormant and no paid request is made.

Added complete recorded onboarding fixtures for Resolve AI, Shopify and Vercel. All three pass evidence collection, strict grounded drafting, at least 90% receipt coverage, editable review and explicit human approval without provider calls. Resolve's generated segments and buyer/champion personas overlap the frozen reference configuration as required. Browser verification used isolated local state and visibly confirmed the complete generated-review screen, 100% receipt report and monthly before/after approval screen at desktop and 768-pixel widths; no real workspace was changed.

Verification before the live acceptance: 18 test files and 93 tests passed. `npm audit --omit=dev --audit-level=high` found zero vulnerabilities. The ignored local `.env` and `.whynow/` state stayed outside Git. Earlier completion commit `9169eba` and GitHub Foundation checks run `38484528857` passed. Stage 2 is now complete including the bounded real-key acceptance; Stage 3 has not started.

## Stage 2 offline research core — 2026-09-17

Implemented the main name-first research path in `scripts/onboarding/research.cjs`, `research-page.cjs`, `routes.cjs` and `server/router.cjs`. Serper requires an explicit switch, private key and positive persisted caps; the coordinator reserves queries before sending them, hard-limits a run to four searches/twenty pages, requires candidate confirmation, keeps only the selected seller domain, records progress and partial errors, deduplicates concurrent jobs and resumes safe in-progress work after restart. Search snippets never become claim evidence.

Implemented source-only drafting in `synthesize.cjs`, `validate.cjs` and `synthesis-runner.cjs`. This historical checkpoint originally sent bounded excerpts and free-text quotes. The October 13 completion replaced free-text quote copying with bounded server-created receipt menus after live testing showed that exact quote transcription was nondeterministic. The server still derives URLs, rechecks quotes, removes unsupported customers/competitors, rejects stale outputs and hands successful drafts to the editable human-review flow.

Added a frozen, load-only Resolve AI comparison in `config/reference-profiles/resolve-ai.json`, transcribed from the friend's `resolve-gtm.cjs`, `stage3-signals.cjs` and tier rules. It contains targeting configuration but no invented seller profile. Official-page excerpt fixtures for Resolve AI, Vercel and Shopify exercise exact-receipt behavior offline. Their source URLs are `https://resolve.ai/product/overview`, `https://vercel.com/docs` and `https://www.shopify.com/about`.

Added monthly refresh proposal logic and review UI in `refresh.cjs` and `profile-page.cjs`: semantic and receipt-only differences are visible, the active profile is never auto-overwritten, proposals are workspace/revision guarded, approval rechecks saved quotes, rejection preserves the current profile and history is bounded. The automatic monthly provider runner remains paused until paid OpenAI is separately approved.

The final offline audit closed five gaps: refresh approval now checks every non-empty factual field against its matching evidence entry; every AI-created targeting and messaging setting is visible and editable before approval; seller-page redirects are blocked before fetching when they leave the confirmed company domain; stale tabs cannot confirm research, start drafting or approve refreshes after the active workspace changes; and Serper search is fail-closed by default for future callers. The local `.env` containing the authorized Serper key is ignored by Git and restricted to its owner with mode `0600`.

Verification: 16 test files, 84 tests passed on Node 22, including local HTTP flows. Provider tests use injected recorded responses and do not contact Serper or OpenAI. On September 17, a separate owner-authorized live Vercel check used four Serper searches, confirmed `vercel.com`, saved twenty official-domain pages with zero page errors and completed in about forty seconds. The browser visibly showed the completed research state and twenty saved sources at desktop and 768-pixel widths, plus the complete editable review controls at desktop and mobile widths. Paid OpenAI stayed disabled with a zero limit, so no AI request ran. Commit `349d6ac` is published; GitHub tests, the production dependency audit and full-history secret scan passed. Three-seller generated-profile acceptance is still pending; Stage 3 has not started.

## OpenAI foundation — 2026-09-17

Prepared the Stage 2 OpenAI client using the reference project's direct-HTTP GPT-4o mini setup, strengthened to meet WhyNow's requirements: strict JSON-schema output, local validation, timeouts, one bounded retry, persistent conservative usage reservations, per-workspace request limits, cache isolation and redacted errors. `OPENAI_ENABLED=false` and a zero spending limit are the defaults; a key alone cannot cause a request. Seven offline tests use injected responses and never contact OpenAI. The client is not yet connected to onboarding or synthesis, and no paid call is claimed.

## Current audit — 2026-09-16

Stage 2 is incomplete; see STAGE-2-STATUS.md for the requirement-by-requirement checklist. Added Workspaces list, created/approved dates, reversible archive/restore, stale-action checks, lifecycle audit events and exclusion of archived workspaces from switching. Restoring an approved workspace requires another review. No user workspace was archived during browser verification; archive/restore round trips ran against temporary test state. The browser showed both existing companies and the explicit confirmation control. Added Research results and Workspaces navigation while preserving the existing design.

Closed an API-disable gap in manual onboarding: configured keys no longer trigger search through the manual POST route. Full local suite: 7 files, 41 tests passed on Node 22. No new dependencies, API calls or deployment. Name-first increment CI on b314ecb passed; current increment CI is checked after publishing. Historical checkpoints below are retained and are not the current completion status.

Name-first UX update: Overview and `/onboarding` ask for company name only. `/onboarding/start` persists an isolated research request and redirects to `/onboarding/results`, showing “Research not configured,” not-started steps and empty facts/ICP/sources. Approval remains blocked. Four new tests cover Vercel without invented facts, repeated submissions, isolation, escaped/invalid names, no provider calls even with keys present, restart persistence, origin protection and server-side refusal of empty approval. All 37 tests passed on Node 22. No APIs or AI were enabled. Manual entry remains a fallback.

Current checkpoint: repository published at https://github.com/shayannabas/whynow. GitHub CI passed on commit `65a4e8c` (tests, production audit, full-history secret scan). Earlier pending-CI notes below describe historical checkpoints.

Sources: [Implementation Plan v4](https://docs.google.com/document/d/1zRa4eMng9gCy1ehLhbSXvlpVtmBvqgXzJ2sQwhg83E8/edit), [PRD v4](https://docs.google.com/document/d/1t9YUZ33bUCPdxgfFshEvdqCw5S9fdhU40QQECeMkl-0/edit).

## Port mode Phase B traceability — October 20, 2026

| Requirement | Implementation | Verification |
| --- | --- | --- |
| SignalScout pure collector parity | `tests/fixtures/parity/signalscout-phase-b.json`; Phase B collector modules | 18 exact frozen input/output cases from source commit `130789f1...`; reference repo is not imported at test time |
| Workspace configuration, not Resolve globals | `phase-b-config.cjs`; `resolve-ai.json` collector rules/provenance | Isolation tests plus reference validation; Phase A parity unchanged |
| Guarded public adapters | `collectors/runtime.cjs`; hiring, active-pain, search, executive, EDGAR, culture, AI, wedge, revenue modules | Recorded-response adapter tests; no test hits a provider |
| Persistent caps and failure isolation | `phase-b-runner.cjs`; `serper.cjs` | Per-run/monthly cap tests, source errors retained, free collectors continue after Serper failure |
| Signals feed Phase A | `mergeCollectorResult`; `scoreAccount` | Background-runner test proves receipts update fit and a kill hint reaches Kill Log precedence |
| Background Refresh account UI | `server/phase-a-pages.cjs`; `server/router.cjs` | Local-only/same-origin HTTP test; button, receipt links and errors render |
| Exclusions | No GitHub/StatusGator/OTel graph/risk-factor/conference module or route | Runtime budgets and parity fixture omit excluded sources |
| Free firmographics and tiers | `firmographics.cjs`; `collectors/firmographics.cjs`; `wikidata-universe.cjs` | Search metrics require target-local context; structured Wikidata receipts remain valid; five saved live accounts produce evidence-backed or explicitly provisional tiers without Apollo/PDL |
| Current why-now only | `active-pain.cjs`; `decisioning.cjs`; `phase-b-runner.cjs` | Synthetic positives and real negatives prove healthy pages, other-company incidents, stale/undated evidence and duplicate URLs do not become current triggers |
| ATS large-board handling | `collectors/runtime.cjs`; `collectors/hiring.cjs` | ATS JSON alone has a 16 MB ceiling; name/domain aliases drive bounded Greenhouse/Lever/Ashby slug attempts |
| Failure isolation | `phase-b-runner.cjs`; `docs/PHASE-B-LIVE-VERIFICATION.md` | SEC EDGAR's remaining HTTP 403 is recorded; other collector evidence is retained and scored |
| Full regression | All tests | 39 files passed; 194 active tests passed, 1 intentional skip |
| Live verification | `.whynow/phase-b-live-report.json`; `docs/PHASE-B-LIVE-VERIFICATION.md` | Five Resolve-segment accounts; 20-query initial run plus 25-query quality re-check; final correction from saved evidence used 0 queries; 0 OpenAI calls throughout |

## Port mode Chunk 2 traceability — October 20, 2026

| Requirement | Implementation | Verification |
| --- | --- | --- |
| Workspace-configured Resolve universe | `config/reference-profiles/resolve-ai-discovery.json`; `discovery-universe.cjs`; `reference-demo.cjs` | 52 SignalScout seeds frozen from source commit `130789f1...`, lines 22–145; active discovery reads `workspace.universeSeeds` |
| Noise gate and exclusions | `company-discovery.cjs` | Recorded tests reject blocked hosts, mismatched name/domain, seller, customers, competitors, duplicates and existing accounts; Fireworks AI/Fireworks alias regression covered |
| Bounded background discovery | `discovery-runner.cjs`; `chunk2-live-discovery.cjs` | Per-query reservation, separate fail-closed cap, monthly persistence, partial-error isolation and 20–30 target tests |
| Live Resolve set | `.whynow/chunk2-discovery-report.json`; `docs/CHUNK-2-STATUS.md` | 10 Serper queries, 0 OpenAI, 25 prospects across all 10 segments, 0 errors, 0 forbidden leaks |
| Today and account detail | `account-lifecycle.cjs`; `server/phase-a-pages.cjs`; `server/router.cjs` | Current-trigger ranking, receipt links, honest no-signal copy, local-only mutation and HTTP browser tests |
| Simple lifecycle | `updateAccountStatus` | `new / working / skipped`; skip reason required, audited and cleared after status changes; stale edit guarded |
| Persistence browser check | Atomic state + `/discovery`, `/today`, `/accounts/:id` | Completed run and 25 prospects visible after server restart |
| Full regression | All tests | 43 files passed; 205 active tests passed, 1 intentional future scaffold skipped |

## Refresh-all and Chunk 3 offline traceability — October 21, 2026

| Requirement | Implementation | Verification |
| --- | --- | --- |
| One non-duplicated 25-account refresh | Persisted `account_collector_refresh_all` run; `docs/STEP-1-REFRESH-ALL.md` | Original job finished 25/25 with 125 Serper queries, 0 failed accounts and 0 OpenAI calls |
| Today evidence | `account-lifecycle.cjs`; saved account receipts | 7/25 refreshed discovery accounts have a dated in-window trigger; 8 accounts across the complete Today queue |
| Unknown is not negative | `scoring.cjs`; Scorecard/account pages | Missing signals retain SignalScout's score-1, confidence-0.4 prior and render `Unknown · low confidence` with no receipt |
| Workspace-neutral targeting | `message-targeting.cjs`; `resolve-ai.json` outreach config | Ported title, power-line, awareness, Maslow and CTA tests pass without Resolve runtime constants |
| Deterministic receipt-backed template | `outreach-drafts.cjs`; account detail route/page | Blocks killed, stale, uncitable, wrong-entity, wrong-persona and unapproved-claim contexts; saves Demo-only drafts and audit events |
| Validator gates | `validateOutreachDraft` | Five blocks, 60–110 words, <=8-word subject, exact seller wording, named greeting/signature, no links or enum leakage |
| Copy-only browser surface | `/accounts/:id/drafts/template` and account page | Local/same-origin POST, watermark, receipts and clipboard button; no send route/action |
| Free model verification | `openai-model-check.cjs`; `outreach-model.cjs` | `GET /v1/models` returned HTTP 200 and listed `gpt-5.5`; no generation request; official docs confirm Responses/Structured Outputs |
| Cost estimate | `docs/CHUNK-3-OUTREACH.md` | Real saved Binance context: 814 estimated input tokens, about $0.00857 typical total, $0.02207 conservative maximum |
| Deployment direction | `AGENTS.md`; checklist | Local screen-share is the demo path; no snapshot/deploy; Railway backup and Apollo lookup remain deferred and owner-gated |

| Requirement | Implementation | Verification |
| --- | --- | --- |
| Node 22, CommonJS, allowed dependencies | package.json, .nvmrc, CI | Seven tests passed on Node 22.23.2 |
| Environment loader, env-only settings | scripts/env.cjs, .env.example | Configuration precedence test |
| Versioned state, atomic replacement, fsync, backup | scripts/server/state.cjs | Interrupted save, recovery and corrupt-file tests |
| Workspace creation and isolation | state.cjs, actions.cjs | Copy isolation and HTTP restart tests |
| esc, stableId, nowIso, json | scripts/utils.cjs | Escaping and ID tests; health uses JSON helper |
| Overview, wordmark, sidebar, switcher, empty state | pages.cjs, styles.cjs | HTTP verified; visual check blocked by browser policy verification failure |
| Local font, tokens, delegated navigation | pages.cjs, styles.cjs, router.cjs | Font HTTP test passed; visual/navigation browser check pending |
| Health, 404 and generic errors | router.cjs, server.cjs | HTTP tests |
| CI installation, tests, audit, secret scan | .github/workflows/ci.yml | Configured; remote run pending repository publication |

The table above is the historical Stage 0 boundary. Current port-mode implementation and verification are recorded in the dated sections that precede it.

This sentence describes the Stage 0 checkpoint. Stage 1 infrastructure is added below; seller research and prospect collectors are still absent.

## Verification results

- Node 22.23.2: 1 test file passed, 7 tests passed (135 ms test time).
- `npm audit --omit=dev --audit-level=high`: found 0 vulnerabilities.
- The initial sandbox test attempt blocked localhost binding (`EPERM`); rerunning with localhost permission passed.
- Browser tool refused localhost access because it could not verify an admin-enforced policy. No visual check is claimed. Still required: inspect at 1280px and 768px, create a workspace, switch it, and verify the rendered screen after restart.
- GitHub Actions and Gitleaks are configured, but have not run remotely. No GitHub remote was created or existing flowfire remote reused. Stage 0 acceptance remains pending browser verification and a green remote CI run.

## Stage 1 traceability

| Requirement | Implementation | Verification |
| --- | --- | --- |
| CollectorRuntime, identifying email gate | scripts/collectors/runtime.cjs | Missing identity rejected before requests; correct header tested |
| Public HTTPS and SSRF guard | runtime.cjs | Private IPv4/IPv6, encoded IPs, mixed DNS, credentials, ports, redirect targets tested |
| Budgets, pacing, TTL cache, source health | runtime.cjs; workspace budgets in router.cjs | Concurrent budget limit, hit/miss/expiry, saved counters across restart |
| robots.txt, timeouts, bounded responses | runtime.cjs | Disallow, errors, missing robots, delay, timeout, binary and size rejection |
| Common normalization helpers | scripts/collectors/common.cjs | Inferred receipt behavior, text stripping, attribution checks |
| Serper adapter | scripts/serper.cjs | Recorded empty response; no key in cache or health |
| Versioned source store and grounding | scripts/sources.cjs | Revision preservation, defensive copies, exact whitespace-normalized quote and paraphrase rejection |
| Admin Collectors page, debug job, source view | scripts/server/collectors-page.cjs; router.cjs | Local HTTP workflow, production and origin denial, switching isolation |
| Real page receipt | Local admin fetch action | Passed after explicit approval: Node.js About page and robots.txt both returned HTTP 200; 5,834 characters stored |
| Browser check | /collectors | Browser connection failed to initialize; visual verification pending |

Stage 1 results: Node 22, 3 test files passed, 19 tests passed. Production dependency audit: zero vulnerabilities. Tests use local responses, temporary data and local HTTP only.

Design note: default transport uses built-in HTTPS with pinned DNS, while tests inject a fetch-like adapter. This closes the DNS re-resolution gap without adding an unapproved HTTP dependency. CI and Gitleaks remain configured but have not run remotely.

Known development limitation: usage is persisted when the debug job finishes; process death during the job can lose its latest usage count. The local debug action serializes jobs. This is not yet a production collector service.

Live acceptance: on 2026-09-16 at 01:44 UTC, the local admin action fetched https://nodejs.org/en/about, with the owner-approved crawler identity. It checked robots.txt (HTTP 200), fetched the page (HTTP 200), and persisted source `79978f3faa54ac3e426523e1`, titled “Node.js — About Node.js®”, with 5,834 characters. Verified by reading saved state. Browser verification and remote CI remain pending. The local repository has no GitHub remote.

## Stage 2 initiation checkpoint

Owner requested AI remain disabled and will select providers separately. Implemented company identification and explicit candidate confirmation under `/onboarding`, scoped to the active draft workspace. Supplied websites require no provider calls; unconfigured search returns a website-entry fallback. Candidate text remains unverified and confirmation does not activate a workspace.

Five new tests cover supplied websites without provider calls, ambiguous/deduplicated matches, zero results, invalid URLs, HTML escaping and forged selections. All 24 tests passed on Node 22. This is the initiation increment only; full research, profile review and three-seller acceptance are not complete. See `STAGE-2-STATUS.md`.

## Manual seller profile and ICP review

Implemented in `scripts/onboarding/manual-profile.cjs`, `profile-page.cjs`, and `routes.cjs`. Profile and ICP drafts are workspace-scoped and versioned. Source links without exact saved quotes remain unverified; manual approval does not change evidence labels. Customer evidence requires seller-domain saved quotes. Approval requires category, description, target size, industry, 3–10 segments, buyer and champion roles, and explicit review acknowledgement. Save moves to `needs_review`; approval moves to `active`, always in Demo mode with delivery disabled. Later edits revoke approval. Revision checks protect against stale forms. The audit log records approval with workspace ID and unverified count; hash-chain hardening remains Stage 3.

Nine new tests passed: defaults and draft shape, approval acknowledgement and unverified claims, incomplete/reapproval gates, stale forms and workspace isolation, customer receipt rules, exact quote/paraphrase distinction, schema bounds and unsafe links, escaped rendering with error-form preservation, and local HTTP save/review/approve with origin and workspace checks. Total: 33 tests passed on Node 22. Browser verification remains blocked by a connection initialization error, not presented as completed.
