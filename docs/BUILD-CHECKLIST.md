# November 17 — Interface v2

- [x] Commit the [Interface v2 specification](GENERAL-PIPELINE-PLAN.md#12-interface-v2--icps) before writing code.
- [x] Derive ICPs from saved segments, targeting and playbooks. Review and version them in ICP Studio. Use linked ICP and trigger rules to build and label discovery queries.
- [x] Results tabs, filters, discovery sessions, saved searches and company-only CSV. Priority leads uses existing queues and scores.
- [x] Personas in the account brief, including the LinkedIn role-search fallback and local, copy-only drafts. Apollo people search implemented offline and disabled with a zero monthly cap.
- [x] Desktop verification at 1440 × 1000 with fictional companies and people. Four screenshots saved under the ignored `.internal/interface-v2/` directory.
- [x] Full suite: 92 files, 468 tests passed, one existing skip. CI passed on `8da8014`. Local port 3000 serves the new interface with providers disabled. [Verification and live-test proposal](INTERFACE-V2-VERIFICATION.md)

# November 17 — Pump news-first discovery

- [x] Date-filter News and ATS searches, prioritize News and retain identity and access failures.
- [x] Run and exhaust the one-use allowance. 80 Serper (55 News), 34 free HTTP, 10 Apollo organization enrichments, zero OpenAI.
- [x] Report two Act now after identity review, 13 Needs review and one killed. All three template attempts were blocked. [Results](PUMP-PART-B-NEWS-FIRST.md)
- [x] Offline suite passed with 458 tests and one existing skip. Providers disabled. Owner approvals, drafts and active workspace preserved.
- [ ] Interface v2 and ICPs are offline-only.

# November 17 — Pump public-page resilience rerun

- [x] Skip blocked public pages with candidate-level reasons and a 15-error cap. Provider auth, quota, rate limit and server errors stop the batch.
- [x] Try up to two outlets matching the same event. Dated unverified listings stay out of Act now and draft evidence.
- [x] Rerun once with approved playbook v6. Checked 25 leads, skipped four pages, used 19 live Serper requests and 25 free requests. Zero promoted accounts, Apollo calls, OpenAI calls or drafts.
- [x] Retain two listings on rejected leads using saved responses. Preserve approvals, workspace selection and .env. [Run results](PUMP-PART-B-RERUN.md)
- [x] Full suite 456 passed, one existing skip.
- [ ] Interface v2 is offline and requires the missing specification.

## Prior checkpoint

# November 17 — Pump Part B stopped on HTTP 403

- [x] Verify Pump seller revision 4 and playbook v6 owner approvals before consuming the batch.
- [x] Run the bounded trigger search once and stop on the first HTTP error. Twelve live Serper requests, eight free requests, zero Apollo and OpenAI.
- [x] Record zero saved prospects and templates. Keep providers disabled and .env unchanged. [Pump Part B results](PUMP-PART-B-RESULTS.md)

## Part A checkpoint

# November 17 — Pump Part A rerun saved for review

- [x] Prioritize core pages and comparisons and cap new customer stories at eight. Reuse all 18 Pump pages from the original run.
- [x] Trim supplemental story text first and preserve exact customer and comparison receipts. Use one shared evidence prefix and response schema across the three requests.
- [x] Feed approved playbook news rules into trigger search. Verify the company, article and original publication date before promotion. No live discovery.
- [x] Pump rerun saved 11 additional pages in 15 attempts. Three GPT-5.5 calls with no retry cost $0.343355. Cached input tokens were 0 / 19,200 / 19,200. Serper and Apollo used zero requests.
- [x] Pump profile and playbook both needs_review. 15 customers, 14 comparison entries, five segments and six triggers. Verified in the local browser. [Results and receipts](PUMP-PART-A-RERUN.md)
- [x] 446 offline tests passed with one existing skip. CI passed on 277ca8f.
- [ ] Owner review: 16 profile blockers and four playbook blockers. Four other-source triggers have no collector. Pump Part B remains proposal-only.

## Prior checkpoint

# November 17 — playbook discovery default and Pump research evidence

- [x] Default new seller discovery to the approved playbook’s ATS rules. Keep the frozen Resolve strategy and make Apollo company search an explicit opt-in independent of enrichment.
- [x] Show Top prospects when Act now is empty. This research list uses fit and recent sourced signals and leaves Act now and tiering unchanged.
- [x] Record the final Vercel HTTP 403 as a free-plan company-search limitation. No retry.
- [x] Run the Pump first-party collection once. Saved 18 pages in 25 requests. Two serialized model requests exceeded the 40,000 input-token ceiling, so preflight stopped the batch before generation. $0 actual. [Pump results](PUMP-PART-A-RESULTS.md)
- [x] Full offline suite passed across 88 files with 442 passes and one existing skip. Browser verified the saved Pump evidence. Providers disabled and `.env` unchanged.
- [ ] Pump seller profile and playbook remain pending generation. [Part B](PUMP-ONE-USE-PROPOSAL.md) requires separate owner authorization and approvals. README and Phase 3 close-out remain on hold.

## November 16 checkpoint (historical)

# November16 — final Vercel batch used; Pump proposal held

- [x] Verify actual owner approvals before requests: seller active revision7, playbookv3 approved. No agent approval, form save or active-workspace switch.
- [x] Commit/test bounded execution (d72cdd6), consume one exclusive marker/audit record, preserve domains and use4/5 Apollo attempts with no retries.
- [x] Weather lookup returns different Weather Channel/weather.com entity; Rogo/rogo.ai not found; Sensay enriched. Search page1/per_page25 returnsHTTP403; stop all subsequent project calls.
- [x] Exact usage:4 Apollo attempts; **2 credits owner-reported (95→93/95, Exports)**;0 Serper,0 free collector network requests,0 OpenAI,0 new candidates/timing checks/templates. Credits were not exposed by API metadata.
- [x] Counts: new batch0 Act now/0 Worth researching/0 Needs review/0 killed; whole Vercel0/0/1 pre-existing review/0. Retain all history, no success claim.
- [x] Flag weak Sensay-only21–50 employee pattern below approved100 floor; no silent change. Restore process providers disabled/zero, preserve .env, owner seller/playbook/Resolve/drafts and active workspace; port3000 remains running.
- [x] Prepare [Pump proposal](PUMP-ONE-USE-PROPOSAL.md) only:3 GPT-5.5 research calls including playbook, estimated max$1.32/proposed process cap$1.35, human-review stop, then separately authorized same bounded pipeline. No Pump fetch or generation.
- [ ] Apollo company-search403 unresolved. No reuse of the final Vercel allowance. No Pump discovery authorization. README/Phase3 close-out held until after Pump.
- [x] Full offline suite87 files,436 pass/1 existing skip. [Results](FINAL-VERCEL-VERIFICATION-RESULTS.md); [full test output](FINAL-VERCEL-VERIFICATION-TESTS.txt).

## Earlier checkpoints (historical)

# November 16 — offline corrections and final-run proposal

- [x] Narrow playbook name/compliance exceptions with positive/negative fictional tests; preserve every other rule. Saved Vercel v1 revalidated without regeneration or content/version/approval changes:4→2 blocking warnings, t6/t7 unsupported-name sequences remain.
- [x] Missing timing collectors show a non-blocking note and never contribute evidence. Vercel t7/other has one advisory; Apollo firmographic snapshots also cannot become timing events.
- [x] Safe Apollo diagnostics: top-level keys, redacted error/message fields, rate/credit headers, company-only cache sanitation; empty200, refusal, format variants and secret/contact redaction tested.
- [x] Owner-supplied diagnosis recorded: Rogo/rogo.com, Weather Company/weathercompany.com; failed lookup0 credits,95/95 remaining. No new API verification or domain change.
- [x] Bounded not-found fallback retains per-customer reasons; any HTTP error/refusal stops. Corrected domains are suggestions only, never applied automatically.
- [x] Provider-free [final proposal](VERCEL-FINAL-VERIFICATION-PLAN.md): Weather Company first, max5 Apollo attempts (4 enrich+1 search/page1/per_page25),0 retries,30 Serper queries,150 maximum free-source requests within existing budgets,0 OpenAI, templates only. Optional Stripe fallback requires confirmation.
- [ ] Future execution: NOT AUTHORIZED. Requires owner OK, confirmed Weather Company/Rogo domains and fresh approved seller/playbook. Previous Phase2 remains exhausted.
- [x] Full offline suite86 files:429 passed/1 existing skip. [Full output](NOV16-OFFLINE-FIXES-TESTS.txt). Vercel seller/Resolve/drafts/.env preserved, local port3000 kept providers-disabled.

Change log — Nov16 offline follow-up: corrected validator exceptions and diagnostics, retained unmatched-domain outcomes, prepared a guarded proposal. No provider call or approval.

## Earlier one-use batch (historical)

# Vercel Phase 2 — one-use checkpoint, November 16, 2026

- [x] Record owner authorization and commit offline-tested one-use controls before network access (`14c42d1`).
- [x] One Apollo robots check: HTTP200; both company API paths allowed. Guards preserved.
- [x] StepA attempted once on Rogo/rogo.ai: HTTP200, no usable organization in the expected response schema. Stop honored; StepB/search not run. No pattern/candidates/rejections. Credit usage was not exposed; usable free-plan access remains unverified.
- [x] One GPT-5.5 Vercel playbook call, saved pages only, low reasoning/max8000/no retry. Preflight$0.398220 within$0.50; returned usage20171 input/2210 output/0 reasoning; cost$0.167155.
- [x] Save playbook v1 needs_review:10 triggers,3 anti-triggers,4 blocking warnings. Flag likely validator false positives without silently loosening rules or changing output. No approval.
- [x] Apollo false/zero caps and OpenAI false/zero restored process-only; .env unchanged. Preserve Vercel approved seller revision5, Resolve and all drafts. No Serper, seller-page fetches, refreshes or contacts; port3000 kept running disabled.
- [x] Offline suite83 files:416 passed/1 existing skip. [Results and trigger/warning details](GENERAL-PIPELINE-PHASE-2.md); [full output](GENERAL-PIPELINE-PHASE-2-TESTS.txt).
- [ ] Apollo usable enrichment/search and real lookalike discovery: NOT VERIFIED. Authorization exhausted; no retry or continuation is authorized.

Change log — November16: consumed the single Vercel verification batch; recorded partial Apollo failure and pending playbook generation honestly. Phase3 documentation/demo work and further live investigation remain unstarted.

## Historical Phase 1 checkpoint

# General pipeline v5 — Phase 1 offline checkpoint, November 14, 2026

Source of truth: [General Pipeline Plan](GENERAL-PIPELINE-PLAN.md). [Verification and file inventory](GENERAL-PIPELINE-PHASE-1.md).

- [x] Commit the plan and authorization before code, then separately commit the owner's clarification: no new fit gate, tiers and Act now eligibility unchanged for every workspace.
- [x] Versioned seller playbook schema, grounded targeting output, saved-receipt validation and independent editable review/approval UI. Approval is explicit and unchecked; editing resets playbook approval only. No actual seller or playbook was approved.
- [x] Approved playbooks supply the why-now/activePain slot, source-specific keywords, strength, windows and outreach angle. Pending/missing/edited playbooks retain exact legacy behavior. Original ATS dates, title/department-only matching, early-career exclusions and executive corroboration remain.
- [x] Deterministic, unapproved Resolve playbook conversion. All 33 saved Resolve account scores/decisions match the current baseline under fallback; Coalition remains **Act now, fit 37, Tier 1**. Frozen scoring/collector parity tests remain green.
- [x] Organization-only Apollo client and lookalike strategy: disabled/zero-budget defaults, durable per-workspace monthly and per-run reservations, one capped 429 retry, stop on first other error, organization-only sanitized estimates, domain deduplication and retained exclusions. Fictional responses only.
- [x] Default lookalike strategy for ordinary sellers; explicit trigger search retained and frozen Resolve discovery unchanged. Account Found via shows the matched pattern and dated Apollo estimate receipts.
- [x] Full kill codes/reasons and untruncated workspace names checked in browser; fictional playbook controls and source links checked without approval. Local Resolve Today checked read-only.
- [x] Full offline suite: **82 files passed; 409 tests passed, 1 intentional skipped test (410 total)**. Full output: [test log](GENERAL-PIPELINE-PHASE-1-TESTS.txt).
- [x] Approved Vercel profile, all saved drafts, complete Resolve workspace and local environment file preserved. Zero provider calls. Port 3000 runs with providers disabled.
- [ ] Phase 2 live verification: **not authorized**. Proposed: one Apollo organization-enrichment access/credit test first; only after that checkpoint and owner continuation, up to three customer enrichments and one company search (five total Apollo attempts, free-plan credits only). One Gong playbook generation request: offline conservative maximum $0.441675, proposed process cap $0.50. No live action taken.
- [ ] Phase 3 demo documentation/screenshots after live verification; no sending, contact endpoints, CRM or deployment.

Change log — November 14: added seller playbooks and capped company-lookalike discovery offline. Tiering and Act now rules are unchanged. Live endpoint access, credit behavior and real-seller playbook quality remain unverified; no new usable-prospect claim is made.

## Earlier checkpoint (historical)

# Final offline demo checkpoint — November 12, 2026

- [x] Original ATS publication dates govern hiring freshness and expiry; title/department only govern role matching. Canonical 2022 Web and Legal Counsel negatives plus positive/missing-date cases are covered.
- [x] Seven rejected Vercel page records are retained in a collapsed Discovery archive, outside Needs review and refresh batches. Canonical remains the single genuine review record.
- [x] Resolve now has Coalition alone in Act now (fit37/Tier1), 4 Worth researching, 11 Needs review and 2 kills. Okta's original June15 posting is expired; its GPT-5.5 draft remains saved, with a current-trigger block. Coalition template v2 and CrowdStrike's historical template remain unchanged.
- [x] Neutral current-tree naming, renamed reference fixtures/style/docs, private ignored reference notes; no history rewrite. No profile approval or recipient data was published.
- [x] README rebuilt with features, workflow, stack, local instructions, four real screenshots and limitations. Full verification and changed-file inventory are in docs/FINAL-DEMO-CLOSEOUT.md and docs/FINAL-CHANGE-MANIFEST.md.
- [x] Full offline suite: 77 files; 378 passed, 1 intentional skip (379 total). Browser demo path checked. OpenAI false/zero; no live research/provider calls. Port3000 kept running.
- [deferred] Technographic discovery for new sellers; Apollo contact lookup behind future fit/kill gates and credit cap. Neither is implemented or authorized here.

Change log — November12: fixed date/title-driven false hiring urgency, archived seven known page rejections, refreshed repository/Drive demo documentation and captured real README screenshots. Okta cannot remain a current hiring trigger under the corrected original-date rule. CI outcome is recorded after push in the delivery report.

## Historical checklist

# WhyNow — build checklist

Latest checkpoint — October 29, 2026: **the one approved Vercel run finished but failed the buyer-quality goal.** 34/100 Serper queries, no OpenAI. Canonical's raw Act now result was flagged offline for boilerplate-driven roles, uncertain category/segment and tier provenance. Final: **0 Act now / 0 Worth researching / 8 Needs review / 0 kills**. Vercel owner approval revision 5 and Gong needs_review revision 4 remain unchanged.

## October 29 — authorized run and executive-window close-out

- [x] Record explicit owner permission for one 100-query run and the temporary process-only monthly ceiling 170; preserve the existing counter (70→104), persistent .env unchanged.
- [x] Execute Prepare demo once: 18 ATS searches + 10 employer searches + 1 size search + 5 refresh = **34**. No OpenAI/GDELT; no duplicate run.
- [x] Report all ranked lists, true first-published versus updated dates, candidate/collector errors and zero kills. Retain all seven earlier rejected page records.
- [x] Explicitly flag Canonical, a possible adjacent infrastructure vendor. Its web-manager ad was first published December 2022; refresh's top Legal Counsel trigger and 225 active triggers came from company boilerplate. Fit66/Tier2 are raw, not qualified-buyer proof.
- [ ] Discovery reliably produces genuine Act now buyers for new sellers. **Not met**. Remaining: job-function/boilerplate filtering, evergreen dates, employer/title and /apply parsing, segment evidence, vendor and revenue-source quality.
- [x] Offline-only departure alias fix: exec_change/30 days, cached default/90 rejected, event date preserved, configured overrides respected.
- [x] Repair ten trigger/history rows through saveState, retain evidence/approval and recalculate priority. Resolve now 2 Act now (Okta/Coalition), 3 Worth researching, 14 Needs review; CrowdStrike Unranked at fit35/Tier1, priority .112, zero active departures.
- [x] Full suite **75 files, 368 pass/1 intentional skip (369 total)**; code 238aefe passed CI. Browser checked Vercel 0/0/8 and Resolve's two Act now accounts without source/provider calls.
- [x] Update the same Drive checklist/demo script once; keep the local server running on port3000, OpenAI false/zero and live collectors disabled process-only.

Full ranked rows, job dates, receipts and failure analysis: [October 29 report](OCT29-PREPARE-DEMO-REPORT.md). The run authorization is exhausted; no additional live research, model call or approval follows this close-out.

## Earlier October 28 offline checkpoint

Latest checkpoint, October 28, 2026: **offline new-seller discovery is implemented; live Vercel rerun awaits owner OK.** 74 files, 365 passed/1 intentional skip (366 total). Zero research-provider calls in this checkpoint. Local port 3000 is running, OpenAI false/zero. No seller approval changed.

## New-seller discovery — offline checkpoint

- [x] Read approved workspace buyer/champion/function roles and technologies; build up to 18 Greenhouse/Lever/Ashby queries without Resolve-only search constants.
- [x] Verify the actual ATS job ID and date; reject early-career/missing/future/expired/closed jobs. Senior jobs mentioning mentorship of juniors still pass.
- [x] Require a first-party operating-company identity/domain; ambiguous names need review. Reject docs/blogs/job boards/frameworks/projects/seller properties.
- [x] Reject all seven saved Vercel candidates in offline tests, with synthetic operating-employer positives through all three ATS providers. No domain blacklist.
- [x] First-party-confirmed adjacent vendors become specific retained Kill Log records; snippet-only vendor candidates are not asserted as facts. Exclude known customers/competitors before buyer promotion.
- [x] Classify employer, collect free size evidence, score/tier/kill and queue. Unknown/ambiguous/stale size or segment remains Needs review. Empty enrichment cannot erase valid unexpired size receipts.
- [x] Prepare demo uses the shared new-seller hard cap 100; refresh at most ten verified buyers and exclude prior unverified page records. Persist every reserved query, rejection and source.
- [x] Coalition's primary Today/account link opens saved job text, with original ATS link retained. Browser verified locally, no source calls.
- [x] GDELT exponential backoff/Retry-After, exactly one retry on 429, five API attempts maximum/check, explicit temporarily unavailable status. Recorded/fake-clock tests only.
- [x] Saved Resolve hiring replay: Okta/Coalition remain valid role/window examples. Altana's role matches but its 2019 corporate size receipt is unsafe; view now puts it in Needs review. SecurityScorecard stays closed/historical.
- [x] Full suite: 365 passed, one intentional skip across 74 files. Discovery pipeline f0b85f5 passed CI; query-preview wording is aa3c5e8. No approval or live research.
- [ ] Owner OK, then one Vercel Prepare demo: 18 ATS + up to 10 identity + 10 size + 50 refresh = 88 planned queries, hard stop 100. Goal 3–5 genuine Act now; report fewer honestly.
- [x] The executive_departure alias/history issue was resolved in the October 29 offline fix above. CrowdStrike's old receipts now expire under exec_change/30 and no longer place it in Act now.

Exact queries, gates, limits and evidence: [proposed discovery plan](DISCOVERY-TRIGGER-FIRST-PLAN.md). The existing Drive Demo Script/checklist are updated once at close-out, retaining their same IDs.

## Earlier October 28 live-research close-out

Updated: October 28, 2026. Local, send-free portfolio demo. Vercel is owner-approved at revision 5, with owner messaging preserved; its one Prepare demo run used 60/150 Serper queries but produced 0 Act now, 0 Worth researching and 7 Needs review candidates. Discovery quality is still insufficient for this seller. Gong's authorized three-call rerun cost $0.375920 under the raised $1.20 cap; it remains needs_review with 10 customers/0 competitors and 2 blocking/0 advisory. Full regression: 72 files, 340 passed, one intentional skip (341 total). OpenAI is disabled/zero. No agent approval, sending or deployment occurred.

## October 28 — review gaps, live preparation and Gong quality

- [x] Preserve the owner's Vercel revision 5 approval and manually entered framing/questions. Run Prepare demo exactly once: discovery 25 + refresh 35 = 60 Serper queries.
- [x] Report the honest 0/0/7 result and all seven candidates/receipts. Flag Next.js as seller-related, job-board/project/title noise and adjacent vendors.
- [ ] Vercel discovery produces a usable buyer queue. This run did not meet that outcome; all seven candidates have unknown tier/size and no current why-now receipt.
- [x] Focused targeting requires three editable general framing sentences, three closing questions and a consistent target-size description; legacy view-only suggestions do not overwrite owner text.
- [x] Fix minimum-floor semantics: 100 employees fits “100+ employees”; only an explicit maximum below the floor contradicts it. Match headcount/revenue units before using size evidence.
- [x] Run combined domain suggestions within 10 Serper queries. Leave five Vercel and three Gong suggestions sourced/unconfirmed. Save cannot verify a suggestion silently; explicit confirmation resets approval and acknowledgments.
- [x] Retract wrong Fern/Stably businesses and ambiguous Ramp; reject a Proofpoint security-wrapper customer domain. Never guess replacements.
- [x] Canonical ATS job receipts, secondary company links, readable saved text/API alternatives and verified board/job matching. Browser: Okta/Altana expose job detail, Coalition redirects to generic careers, SecurityScorecard job is 404/closed.
- [x] Mark SecurityScorecard historical/non-current. Resolve Today now has four Act now accounts: Okta, Coalition, Altana, CrowdStrike; three Worth researching, thirteen Needs review, two kills.
- [x] GDELT guarded collector, publication-date requirement, freshness/relevance, cross-source dedupe and rate-limit cooldown; offline tests pass.
- [ ] Successful live GDELT ingestion: five-account check yielded 0 signals/events each, one timeout and four HTTP 429s. These are unavailable-source results, not no-news evidence.
- [x] Fresh Gong first-party research: 2 Serper queries, 22 free fetches, 20 selected sources. Ten clear extracted customers plus one uncertain headline, zero competitors.
- [x] Owner-raised $1.20 authorization: exactly 3 GPT-5.5 calls, low reasoning/8,000-token allowances, zero retries; actual $0.375920. No fetches/Serper during generation. OpenAI returned false/zero immediately.
- [x] Strengthen saved relationship receipts offline; Google's dedicated Gong story supports keeping it. Gong remains needs_review, with six GTM segments, minRevenueTeamHeadcount/50, 2 blocking/0 advisory.
- [x] Grafana active vendor kill cites its own Grafana Cloud product page. Old decisions/receipts remain retained.
- [x] Full suite and desktop browser checks; code 8a65f35 passed CI. Existing Drive Demo Script and live checklist updated once at close-out; local server remains on port 3000.

Full results, receipts, tokens, warning text and limitations: [October 28 report](OCT28-DEMO-QUALITY-REPORT.md). Combined Serper use: 72 (60 + 10 + 2), respecting each separate cap. Remaining owner review and discovery/source gaps are not marked complete.

This is the working checklist, updated only after verification. The original acceptance did not persist its profiles, so a bounded recovery run later saved three public-data snapshots and separate `needs_review` state. That recovery made four provider attempts because Shopify used the existing transient retry. Shopify and Vercel reported $0.005177 combined; Resolve AI's usage record was lost with the first stopped process, and the conservative total reservation was $0.038686 under the $0.05 cap.

The October 19 offline quality audit keeps the original 9/23/27 findings but separates their effect: Resolve AI has 7 blocking and 2 advisory warnings, Shopify 18 blocking and 5 advisory, and Vercel revision 1 has 23 blocking and 4 advisory. Advisory findings remain beside their fields but do not require an explanation. No profile is approved, no provider call was made for the audit, and Stage 2 remains open.

The one authorized final rerun then fetched all 29 allowlisted first-party pages with zero errors, used zero Serper queries and made exactly three GPT-4o mini calls with no retry. Token-reported cost was $0.007646 under the temporary $0.05 process cap. The normal local OpenAI settings remained disabled/zero. Final drafts remain `needs_review`: Resolve AI has 2 customers, 0 competitors and 8 blocking/4 advisory warnings; Shopify has 0/0 and 25/1; Vercel has 0/0 and 16/5.

The subsequent offline root-cause audit found that the 24 KB evidence menu divided space across all saved sources and selected text from page starts, so deeper customer and comparison evidence often never reached the model. The corrected menu has a 120 KB hard ceiling, weights customer/case-study, comparison, pricing and about/enterprise pages, ranks relevant sentences and preserves every existing grounding/quality gate. On the unchanged saved pages, receipt totals increased from 101/122/74 to 548/605/489 for Resolve AI/Shopify/Vercel; all checked individual customer and competitor names now reach their source's receipt menu.

The owner then authorized one saved-pages-only GPT-4o mini draft per seller. Preflight estimated $0.024729 input cost and $0.032103 maximum total, below the $0.04 stop line. The run stopped on Resolve AI after one provider attempt with safe status `REQUEST_FAILED`; Shopify and Vercel made zero attempts. The isolated working state prevented partial output from replacing the prior profiles. No page fetch, Serper query, new profile or approval occurred. Normal OpenAI settings are confirmed disabled/zero, and no retry is authorized.

The request was then reconstructed offline. The old schema duplicated 548/605/489 stable receipt IDs across optional and required enums, yielding 1,097/1,211/979 enum values. Resolve AI and Shopify exceeded OpenAI's 1,000-value limit; Shopify also exceeded the 15,000-character large-enum limit. The fix sends one enum of short run-local IDs, maps them back to stable IDs server-side, and caps a future packet at 900 receipts in source-priority order. Post-fix schemas contain 548/605/489 enum values and 2,192/2,420/1,956 enum characters. The original failure did not retain an HTTP status; future safe failures store and show only the numeric status, never the response body.

The owner authorized one fixed-schema saved-pages draft per seller. Preflight passed all schema limits and estimated $0.026104 maximum cost, below the $0.04 stop line. Resolve AI, Shopify and Vercel each completed in one provider attempt with no retry. A local snapshot-path bug then interrupted finalization after all calls; the intact isolated outputs were finalized offline without another call. The exact provider token usage was lost with the interrupted in-memory usage array, so actual cost is unavailable; the persisted conservative reservation is $0.026104. All three remain `needs_review`: Resolve AI has 0 customers/0 competitors and 11 blocking/2 advisory warnings; Shopify has 0 customers/2 sourced competitors and 13/0; Vercel has 0/0 and 8/4. OpenAI is disabled/zero and no further automated draft is authorized.

## Reference UI — October 26, 2026

- [x] Port the complete public source stylesheet from Reference commit `130789f`, including its final shell and credibility layers; keep Manrope locally served.
- [x] Use the dark grouped sidebar, KPI strips, Daily Brief/queue cards, Overview board and Results master-detail layout. Keep WhyNow branding/workspace controls and omit excluded delivery/contact controls rather than faking them.
- [x] Connect filters, query parameters, selected Results account, account tabs and browser Back, score-matrix drilldowns, receipt links and saved background-job progress.
- [x] Give Outreach a persona → receipted template → Demo-only copy flow. No sending or contact lookup exists.
- [x] Keep actual signal weights/company tiers visible; show uncollected signal placeholders as unknown/low-confidence; expose saved signal receipts separately from trigger history.
- [x] Check all 18 routes/deep links offline without provider calls or state mutation; reject stale-workspace actions; preserve profile revisions, unchecked acknowledgments and typed blocking-warning reasons.
- [x] Real browser checks at 1440, 768 and 390 pixels: navigation, filtering, Results selection, tabs/Back, matrix drilldown, retained kills, setup/review, mobile Menu and workspace switching; no horizontal page overflow in the checked layouts.
- [x] Explicitly reload the stale local Resolve reference from v5 to current v7 through the existing demo button. Accounts and kills persist; no seller approval is created.
- [x] Create Coalition's free template in local state, verify exact Copy output, restart and confirm it persists; invalid generic recipients are blocked and the error remains on Outreach.
- [x] Full suite: 58 files passed; 296 tests passed; 1 pre-existing future golden-set test skipped (297 total). First UI implementation commit `6051a1b` passed GitHub tests, dependency audit and full-history secret scan; the clickable matrix correction is `2710e3d`.
- [x] Preserve the provider/approval boundary: zero Serper/OpenAI/page fetches, no profile approval, no sends, no deployment. Persistent OpenAI settings are false/zero; the running verification server additionally disables Serper and scheduling process-only.

See `docs/UI-REFERENCE-PARITY.md` for the verified scope and deliberate differences.

## October 27 — demo script, Vercel review and Gong preflight

### Desktop review close-out (latest)

- [x] Require the prospect's own internal-tooling engineering receipt for build/in-house kills. Product docs, marketing, events and videos do not qualify. Retain old decisions separately, never erase them.
- [x] Re-evaluate saved evidence: retire Databricks's unsupported kill; classify Atlassian/Opsgenie and Grafana Labs as adjacent vendors with specific reasons and receipts. Show all three former decisions under “Retired after evidence review.”
- [x] Correct Altana to Enterprise platforms · Supply-chain AI and check all five Act now segments. Generic query terms no longer manufacture an industry classification.
- [x] Auto-size complete email bodies on load, tab switch and resize; describe each receipt. Save and revalidate Okta's existing GPT-5.5 output and CrowdStrike template v2 as local Demo copy-only drafts, no new draft calls.
- [x] Fix double arrows, calendar-relative dates, SecurityScorecard casing, full workspace name, five-account preview and Okta's single-job identity (one receipt cannot earn two independent-signal boosts).
- [x] Split Metrics into collected/verified, collected/inferred and Unknown — not yet collected, including missing configured signal slots.
- [x] Preserve exact outbound-link provenance when an official competitor link exists. Vercel's saved comparison index contains no such links; its three domains and target-size description were left untouched for the owner.
- [x] Record the raised $0.90 Gong cap before calls, verify GPT-5.5 with free GET /v1/models, and pass schema/budget checks. Three focused calls completed from `46acd82`, with 8,000-token allowance/low reasoning, no retries, 0 Serper, 0 fetches; actual $0.222170. No approval/Prepare demo. Full report: `docs/GONG-RESEARCH-OCT27.md`.
- [x] Browser-verify the changed flows at 1440px; copy Coalition's body exactly; confirm Okta/CrowdStrike persisted through restart and Gong's acknowledgment remains unchecked.
- [x] Update the existing Drive Demo Script in place to v4, using Grafana Labs as the Kill Log example and current draft/source labels. Preserve structure, tone and Coalition email.
- [x] Full offline suite: 62 files, 317 passed, one intentional scaffold skip. Update local and Drive checklists once at close-out.
- [ ] Owner fills/acknowledges Vercel and Gong's remaining fields and warnings, then personally approves in the browser. Do not run Prepare demo or make more provider calls without a new instruction.

### Earlier October 27 checkpoint (history)

- [x] Update the existing Drive “05 — WhyNow Demo Script (3 minutes)” in place, preserving its structure/tone and featured Coalition template. Walk Today/Daily Brief, account Overview/Score/Outreach/Evidence, Scorecard drilldown, Kill Log, workspace switching and the disabled Prepare-demo gate in the real browser. Do not click approval or Prepare demo.
- [x] Fix the inherited mobile table rule that hid account identity; verify the Databricks Kill Log link on the narrow viewport.
- [x] Retain confirmed first-party comparison competitors by default. Require named evidence-based rejection reasons with exact supporting quotes; show dropped candidates and a one-click restore that keeps the profile unapproved and logs the change.
- [x] Re-materialize Vercel from saved outputs, no AI or fetch: retain Cloudflare, Netlify and Webflow. Preserve missing domains explicitly; do not guess them. See `docs/VERCEL-REVIEW-FIXES.md`.
- [x] Recognize employee/headcount/revenue identifiers in size rules. Preserve real enterprise/floor contradiction checks. Show blank target size as an editable required field.
- [x] Full offline suite: 59 files, 302 passed, 1 intentional skip (303 total). Script/mobile fix `7f761ac` and Vercel fix `564b11c` both pushed and passed CI.
- [x] Prepare Gong's real saved-packet cost estimate: 30,079 evidence bytes, 171 receipts, three 8,000-token/low-reasoning requests, maximum $0.875820. Zero OpenAI calls, zero Serper queries, zero new page fetches, $0 actual cost.
- [x] Owner reconciled Gong's earlier $0.60 hard cap by raising it to $0.90; the authorized run is now complete as recorded above.
- [ ] Owner reviews and approves Vercel and Gong in the browser. Do not run Prepare demo before owner approval.

## Port mode — current direction

- [x] Preserve the green Stage 2.5 baseline at commit `3cdabaf`; 125 active tests pass and one existing scaffold test is intentionally skipped.
- [x] Pause Stage 2.5. Keep its deterministic organization extractor and evaluation work as a future improvement.
- [x] Mark the trimmed remaining-stage plan as superseded historical scope.
- [x] Confirm the read-only behavioral baseline and permitted scope; keep private provenance in ignored local notes.
- [x] Record exclusions: no Apollo, PhantomBuster, PDL/paid firmographics, StatusGator, Instantly, HubSpot, Clerk, Postgres, backups, Railway or uptime workflow.
- [x] Preserve WhyNow workspaces, atomic JSON state, receipts, human approval and send-free Demo mode.
- [x] Owner approved Phase A before any ported code was written.
- [x] Freeze Reference's exact offline behavior for ten accounts at source commit `130789f1bac1d5e11f5f5154f269155dc17f2d21`; tests never import Reference at runtime.
- [x] Replace Resolve runtime constants with load-only reference/workspace configuration and record every moved value's source file and line range.
- [x] Port the workspace-configured six-signal scorer, kill engine and precedence, evidence-only tiering, and decision formula.
- [x] Retain primary and secondary kills in a visible Kill Log; killed accounts keep their fit score and receive zero priority.
- [x] Add local manual account entry for name, domain, segment and public source URL.
- [x] Add a frozen Resolve reference demo that never writes approval state or enables delivery.
- [x] Make state storage configurable through `STATE_DIR`; continue honoring `PORT`; keep long provider work in existing background coordinators.
- [x] Browser acceptance: load Resolve reference demo, add Coinbase, see its 8/100 scorecard, see its `KILL_EXISTING_CUSTOMER` receipt, restart and confirm persistence.
- [x] Full offline suite: 31 files, 144 active tests pass and one existing scaffold test remains intentionally skipped.
- [x] Owner authorized the narrowed Phase B scope: ATS hiring, Statuspage/HN/Google News active pain, Serper search/executive change, SEC Form D, tech culture, AI compatibility, competitive wedge and revenue sensitivity.
- [x] Freeze 18 Reference collector outputs at source commit `130789f1bac1d5e11f5f5154f269155dc17f2d21`; WhyNow reproduces them exactly without importing Reference at runtime.
- [x] Preserve WhyNow's stricter network/robots/budget/atomic-state boundary and match Reference's in-scope budgets and cache times.
- [x] Move Resolve transaction rules and EDGAR segment queries into the load-only reference configuration with source-line provenance.
- [x] Add persistent, background **Refresh account**; collected receipts update the six-signal scorecard, kills and tiers without deleting prior evidence.
- [x] Keep GitHub, StatusGator API, conference speakers, OTel graph, EDGAR risk factors and Chunk 2 out of scope.
- [x] Pass the Phase B full offline suite: 36 files, 177 active tests passed and one existing scaffold remains intentionally skipped.
- [x] Live Resolve reference check: five accounts, 20 Serper queries exactly, 0 OpenAI calls; results/errors are recorded in `docs/PHASE-B-LIVE-VERIFICATION.md`.
- [x] Browser verification after a fresh server start: the account detail showed scores, honest zeros, clickable receipts, query count and errors; the Kill Log retained Databricks's receipted build-culture kill.
- [x] Add free, receipted search/Wikidata firmographics and provisional-tier behavior; no Apollo or PDL.
- [x] Re-score the five saved live accounts after rejecting public-company/IPO boilerplate, misattributed metrics, healthy status pages, stale/undated evidence and duplicate triggers. The offline pass made zero provider calls.
- [x] Keep the remaining SEC 403 visible and isolated; other sources continue and no further Phase B effort is spent on EDGAR.
- [x] Owner authorized Chunk 2: discover 20–30 Resolve-segment prospects with at most 60 additional Serper queries, exclude customers/competitors, then add Today, account detail and new/working/skipped status.
- [x] Move Reference's Resolve discovery universe into load-only workspace configuration with source commit/line provenance; discovery code contains no Resolve prospect constants.
- [x] Add a 60-query-hard-cap background discovery runner, official-domain noise gate, balanced segment selection and atomic promotion.
- [x] Live Chunk 2 discovery: 10 Serper queries, 0 OpenAI calls, 62 raw config/search candidates, 25 selected prospects, all 10 segments represented, 0 source errors and 0 seller/customer/competitor leaks.
- [x] Add Today, account detail, clickable why-now/source receipts and explicit `new / working / skipped` state with required typed skip reason and audit event.
- [x] Browser-check Today, Discovery and account detail; restart and confirm the 25 prospects and completed run persist.
- [x] Complete Chunk 2 and stop before the next port phase.
- [x] Complete the single authorized 25-account Refresh-all background run without a duplicate: 25/25 accounts, exactly 125 Serper queries, zero OpenAI calls.
- [x] Report the Today evidence set: 7/25 refreshed discovery accounts and 8 total Today accounts have at least one dated, in-window receipt; preserve exact top-10 and fit distribution in `docs/STEP-1-REFRESH-ALL.md`.
- [x] Keep uncollected signals as Reference's score-1, 40%-confidence prior and label them `Unknown · low confidence`, never negative evidence.
- [x] Port workspace-neutral message targeting and validator gates, then build the deterministic receipt-backed template first.
- [x] Add the Demo watermark, manual recipient/sender fields, receipt links and Copy button. Keep every send code path absent.
- [x] Configure outreach independently as `OPENAI_OUTREACH_MODEL=gpt-5.5`; free `GET /v1/models` returned HTTP 200 and confirmed account access.
- [x] Confirm from official documentation that `gpt-5.5` supports Responses/Structured Outputs and costs $5/M input plus $30/M output tokens.
- [x] Match Reference's GPT-5.x request budget: reasoning effort `medium`, 4,000 maximum output tokens, and no automatic output-budget escalation retry. A real Binance request is about $0.008515 at 150 output tokens and $0.124015 at the full allowance.
- [x] Run the owner-authorized bounded GPT-5.5 checkpoint safely: Binance stopped with provider status `incomplete` after one logical call/one attempt; Coalition and CrowdStrike were not called; no validated draft was saved or sent; OpenAI returned to disabled/zero.
- [x] Preserve safe incomplete diagnostics: reason, input/cached-input/output/reasoning tokens, response identity and calculated cost—never prompt or key contents.
- [x] Complete the corrected owner-authorized batch: exactly three calls/three attempts, no retry, three validator-passing Demo merge-field drafts, $0.072110 actual total cost, no application-state/send mutation, and OpenAI restored to disabled/zero.
- [x] Re-fetch the current Resolve product, overview, Coinbase and DoorDash pages through the robots-aware runtime: four pages, one robots request, zero Serper/OpenAI calls.
- [x] Bump the frozen reference to `resolve-ai-v5-current-claims-2026-10-21`; keep only exact receipted wording (`72% reduction in investigation time`, `Investigations went from hours to minutes...`) and drop the absent OpenTelemetry credential.
- [x] Require each seller claim to be a verbatim substring of its saved receipt quote; require exact saved prospect job titles and reject unsupported locations, technologies, numbers and operational details.
- [x] Exclude Accelerator Program, intern, graduate, new-grad and junior roles from why-now, scoring boosts and Today `Act now`; keep saved evidence/history intact.
- [x] Ban “next operating state”; require neutral executive-change opening language and either a second publisher domain or the visible `single source — verify before outreach` label.
- [x] Rerank Today from saved evidence only: `Act now` now contains Coalition and CrowdStrike; Binance is not eligible. The authorized exact-three regeneration therefore made zero paid calls rather than substituting an ineligible account.
- [x] Resolve the executive neutral-language grounding conflict, pass an exhaustive allowed-facts list to the model, and retain strict grounding for every other prospect detail.
- [x] Revalidate the exact paid outputs offline: Coalition passes after the general “Also” false-positive fix; CrowdStrike still fails on unsupported on-call/production wording and uses the passing deterministic template.
- [x] Complete the conditional paid regeneration in exactly two calls/attempts for $0.080280, restore OpenAI to disabled/zero and save/send nothing.
- [x] Run trigger-first ATS discovery inside the authorized 40-query ceiling: 26 queries, 39 candidates, 3 verified new Act-now accounts (Okta, SecurityScorecard, Altana), 0 OpenAI calls and no customer/competitor leak.
- [x] Make focused new-seller research use configurable GPT-5.5 calls after deterministic organization extraction. Free model listing confirmed account access; official Structured Outputs support and pricing were checked.
- [x] Drive discovery from each approved ICP's segment query templates, buyer/champion hiring searches and competitors' customer searches; keep the default hard cap at 60.
- [x] Let the owner mark a signal “not used for this seller”; remove it from the denominator while keeping uncollected applicable signals unknown/low-confidence.
- [x] Add the owner-approved **Prepare demo** background action: discovery → Refresh all → re-rank, one default/hard 150-query Serper cap, progress persistence and zero OpenAI calls.
- [x] Prove the non-Resolve path offline with the saved Vercel ICP: approved config → discovery → recorded collection → tier/fit/kill → Today.
- [x] Add `docs/DEMO-PREP-GUIDE.md` with the night-before workflow, time estimate, model/Serper budget and three-minute interview walkthrough.
- [x] Polish template outreach offline: quotes are at most 15 words with no trailing ellipsis, each email uses at most one approved framing sentence, and the three approved closing questions rotate deterministically. Okta's saved GPT-5.5 draft still passes; Coalition and CrowdStrike use their passing template-v2 fallbacks.
- [x] Update the existing Drive Demo Script in place with Okta, Coalition, Altana, CrowdStrike and SecurityScorecard; Coalition template v2; the current Databricks `KILL_BUILD_CULTURE` example; exact local routes/buttons; and the owner-reviewed **Prepare demo** flow.
- [x] Confirm GPT-5.5 access with a free `GET /v1/models` request and Structured Outputs support from official documentation before the bounded any-seller run.
- [x] Fix research-page selection before paid calls: follow customer/case-study hubs, rank real customer stories ahead of generic “customer” blog posts, support nested `/customers/case-studies/<slug>` paths and reuse saved Vercel customer pages inside the 20-source ceiling.
- [x] Prepare Vercel/Gong within the owner cap: 7 Serper queries total; Vercel reached 14 deterministic customer candidates and Gong reached 3. Neither saved first-party set produced a comparison-page competitor candidate.
- [x] Stop the bounded any-seller run on Vercel's first incomplete seller-facts response with no retry and no Gong call. Usage: 23,071 input, 2,048 output/reasoning tokens; actual cost $0.176795. Both workspaces remain unapproved drafts; persistent OpenAI settings are disabled/zero.
- [x] Correct all three focused GPT-5.5 research calls to 8,000 maximum output tokens with low reasoning; retain usage, reasoning-token and incomplete-reason diagnostics.
- [x] Restore the saved Vercel comparisons page to the deterministic packet. Offline extraction now finds Cloudflare, Netlify and Webflow with first-party receipts.
- [x] Trim the Vercel packet from 94,044 to 82,402 bytes by using 14 saved canonical research pages instead of careers/templates; retain all 14 customer candidates and 3 competitor candidates, with zero navigation-heavy receipts.
- [x] Complete the Vercel-only rerun in exactly three calls/attempts, no retry, 0 Serper queries and $0.346560 actual cost. Leave Vercel unapproved in `needs_review`; do not run Gong or Prepare demo; restore OpenAI to disabled/zero.
- [ ] Owner reviews/corrects Vercel's 12 retained customers, restores the 3 valid competitor candidates if appropriate, and fixes or explains the `minEmployees` size label before approval.
- [x] Pass the final offline regression: 54 test files, 277 tests passed and one future golden-set scaffold intentionally skipped (278 total).
- [ ] The owner reviews and approves each real seller profile in the browser. WhyNow never approves it automatically.
- [ ] No further seller-research paid call, Apollo/contact lookup, sending, deployment or later port chunk is authorized.

## Stage 2.5 — research quality

- [x] Extract customer candidates deterministically from saved first-party customer-story URLs/titles and customer-index links/logo alt text.
- [x] Extract competitor candidates from saved first-party comparison, versus and alternatives pages.
- [x] Preserve a saved source URL and exact receipt/quote for each usable candidate; keep uncertain URL/logo results as candidates rather than facts.
- [x] Accept customer domains only from matching outbound links on the saved customer/case-study page; leave every other domain blank as `domain_missing`.
- [x] Confirm raw HTML exists for the relevant saved pages and skip/refetch nothing. Record unmatched raw-cache pages honestly.
- [x] Create independent, source-backed `unconfirmed` answer-key proposals for Resolve AI, Shopify and Vercel by reading saved pages without extractor reuse.
- [x] Add a confirmed-only offline evaluation harness for customer recall, competitor recall, persona match, size sanity and blocking-warning count.
- [x] Split drafting into focused seller-facts, organization-review and ICP-targeting request builders; organization review can only keep/drop supplied IDs.
- [x] Include the frozen Resolve targeting profile as a worked example and forbid seller-product/vendor-seeking prospect searches.
- [x] Keep per-purpose model configuration on `gpt-4o-mini` by default; do not switch models without separate owner approval.
- [x] Verify by read-only model listing that `gpt-5.4-mini-2026-03-17` is available to this account and verify Structured Outputs support from official documentation, without a generation call.
- [x] Run provisional organization recall against unconfirmed proposals: Resolve AI 7/7 customers and 2/2 competitors; Shopify 3/3 and 2/2; Vercel 3/3 and 3/3. Confirmed-only scores remain 0/0 until owner labeling.
- [x] Pass the full offline suite: 27 test files, 125 active tests passed and one existing Stage 3 scaffold test intentionally skipped (126 total).
- [ ] Owner confirms or corrects the three answer keys.
- [ ] Owner separately decides whether to authorize a bounded paid drafting test. Current maximum reservation estimate is $0.060889/$0.064908/$0.054006 per seller and exceeds the old $0.04 total cap.
- [ ] Browser acceptance after any separately authorized draft. The owner alone approves profiles.

## Current decision

The current boundary is the complete local portfolio-demo pipeline. Resolve Today has five saved Act now accounts: Okta, Coalition, Altana, CrowdStrike and SecurityScorecard; Altana is Supply-chain AI in the broad Enterprise platforms segment. Existing validated emails and deterministic fallbacks remain copy-only. Vercel and Gong both remain unapproved needs_review profiles. Vercel has 12 customers/3 competitors, 3 missing-domain warnings and an owner-fill target-size description. Gong's three-call $0.90 authorization completed for $0.222170, yielding 3 customers/0 competitors, minEmployees/500, 11 blocking/0 advisory and a blank target-size description. No approval, send, deployment or Prepare demo occurred. All paid authorizations are exhausted and normal OpenAI settings remain disabled/zero.

Owner chose OpenAI first, matching the baseline GPT-4o mini/direct HTTP setup. The bounded recovery run persisted three snapshots and three `needs_review` workspaces. It made four attempts because Shopify used the existing transient retry. Shopify and Vercel reported an estimated combined $0.005177; Resolve AI's usage record was lost when the first process stopped, so the exact total is unknown. The conservative reservation reached $0.038686 under the temporary $0.05 cap. The ignored local `.env` was then verified without displaying secrets: `OPENAI_ENABLED=false` and `OPENAI_MONTHLY_LIMIT_USD=0`. Local operation avoids hosting charges, but provider calls still consume credits.

Do not paste API keys into chat. Store keys in the local ignored `.env` file, never in this checklist or GitHub. OpenAI key/model/billing access worked for the bounded acceptance; this does not infer the account's remaining balance.

## Stage 2 — local implementation checklist

- [x] Company-name-only entry, including Vercel.
- [x] Honest results screen with no invented facts.
- [x] Manual company selection and profile/ideal-customer editing.
- [x] Saved-quote checks and explicit manual approval.
- [x] Workspace list, archive, restore and isolation.
- [x] Check current provider requirements and public pricing.
- [x] Choose OpenAI first and match the baseline profile-parser model: gpt-4o-mini.
- [x] Confirm Serper, store the authorized key privately and enforce explicit local-first caps.
- [x] Store the authorized Serper key privately and verify presence without displaying it.
- [x] Implement the OpenAI enable switch (off by default), persistent conservative spending reservations and per-workspace request caps. A key alone does not enable calls.
- [x] Connect name search and candidate confirmation to the main flow.
- [x] Build bounded background research: discover public pages, respect robots, save sources, show progress, handle errors/restarts.
- [x] Implement and offline-test AI wrapper: strict structured output, one bounded transient-error retry, timeout, caching and safe error messages.
- [x] Generate seller facts and ideal-customer proposals from collected excerpts only; live generation stays gated while paid OpenAI is off.
- [x] Give OpenAI a bounded menu of server-created exact receipt snippets. The model selects receipt IDs; the server attaches and rechecks the original URL and quote, so the model cannot alter receipt text.
- [x] Require every attempted generated fact to select a receipt, require the approval-critical category/product/industry fields, reject unsupported customers and competitors, and report receipt coverage.
- [x] Prioritize seller customer, case-study, enterprise, pricing, comparison/alternatives and about pages inside the 20-page ceiling; place partner/marketplace/template pages last.
- [x] Reject partner-page seller evidence, navigation-heavy/short receipts and receipts without meaningful claim overlap; mark rejected receipts inferred.
- [x] Add blocking review warnings for empty customers/competitors, unmeasurable or contradictory size, slogan-like facts, vendor-seeking queries and pain/trigger-like kill rules.
- [x] Require a fresh typed reason for every acknowledged quality warning, persist reasons in the approval audit event, never pre-check them and reset them after any edit.
- [x] Prove each new rule with synthetic positive cases and the real Resolve AI, Shopify and Vercel recovery snapshots without changing those snapshots.
- [x] Split quality findings into blocking and advisory levels. Only blocking findings require a fix or typed approval explanation; advisories remain visible beside their fields.
- [x] Connect generated results to editing and human approval behind the disabled-by-default OpenAI gate.
- [x] Add the original Resolve reference configuration without making it the default seller.
- [x] Add genuine official-page excerpt fixtures for Resolve AI, Vercel and Shopify; document the reference comparison.
- [x] Add the monthly refresh coordinator: due-date detection, hidden isolated research/drafting workspace, receipt-aware visible differences, restart recovery, grounding recheck and fresh approval. It is dormant unless both providers and positive limits are explicitly enabled.
- [x] Pass 109 active offline tests across 21 files before the final rerun, including synthetic positive cases, all three real quality snapshots, warning levels, advisory approval behavior, hallucinated claims, refresh receipt gaps, off-domain redirects, stale tabs/results, budget exhaustion, restarts, hidden refresh workspaces and cross-workspace isolation. One Stage 3 scaffold test remains intentionally skipped.
- [x] Browser-check the real Vercel candidate/evidence result at desktop and 768-pixel widths.
- [x] Browser-check the complete editable generated-review and monthly-refresh workflows at desktop and 768-pixel widths using isolated local fixtures; the existing manual save/review/approve flow is covered by its local HTTP acceptance test.
- [x] Run Vercel's live Serper identity/evidence check: four searches, twenty saved `vercel.com` pages, zero page errors, about forty seconds.
- [x] Pass the no-cost three-seller acceptance with recorded official-page fixtures: Resolve AI, Shopify and Vercel each finish well under 3 minutes, produce at least 90% receipted attempted factual claims and can be explicitly approved.
- [x] Persist the owner-authorized recovery outputs as immutable public-data snapshots and separate `needs_review` acceptance state. The original acceptance did not persist its profiles.
- [x] Run the one authorized final research/drafting flow: 12 Resolve AI, 9 Shopify and 8 Vercel first-party pages; 29/29 fetched, 0 errors, 0 Serper queries, exactly 3 GPT-4o mini calls, no retry, $0.007646 actual cost under the temporary $0.05 cap.
- [x] Persist the three final snapshots and acceptance workspaces through the normal save path, leave every profile in `needs_review`, and confirm normal OpenAI settings stayed disabled/zero.
- [x] Prove offline that the 24 KB start-of-page evidence menu omitted deeper customer and comparison names; replace it with a priority-weighted, relevance-ranked 120 KB packet without weakening grounding or quote-quality rules.
- [x] Rebuild all three saved final-run menus offline and verify the checked customer/competitor names reach receipt text and every packet remains within the new ceiling.
- [x] Pass the post-fix full offline suite: 22 test files, 113 passed tests and one intentionally skipped Stage 3 scaffold test (114 total).
- [x] Record the owner's saved-pages-only drafting authorization in `AGENTS.md`, preflight the real request sizes and confirm the $0.032103 maximum estimate is below the $0.04 stop line.
- [x] Attempt the bounded saved-pages redraft. It stopped on Resolve AI after one `REQUEST_FAILED` provider attempt; Shopify and Vercel made zero attempts; prior profiles stayed unchanged in `needs_review`.
- [x] Rebuild the stopped request offline and confirm its Structured Outputs schema violated the documented enum limits for Resolve AI and Shopify.
- [x] Replace duplicated stable-ID enums with one short run-local receipt enum, restore stable IDs server-side, add a 900-receipt priority cap and retain only safe HTTP status codes on future request failures.
- [x] Build and test the exact schema shape for all three captured packets against documented enum, enum-string, property, nesting and schema-string limits.
- [x] Run the owner-authorized fixed-schema saved-pages draft: one successful provider attempt per seller, no retry, no fetches, no Serper and no approvals.
- [x] Recover the three completed drafts offline after the local snapshot-path finalization error; persist all three as `needs_review` and record that exact token-priced cost was not retained.
- [x] Confirm after the stopped attempt that there were zero page fetches, zero Serper queries, no approvals, and normal OpenAI settings are disabled with a zero local limit.
- [ ] Owner decides the next action. No further provider attempt is authorized.
- [ ] After the owner-reviewed draft-only result, manually fix any remaining pass-bar failures in the review screen and approve each profile.
- [x] Update README, status and traceability documents, run the production audit and scan tracked/untracked project files for credentials before publishing.
- [ ] Mark Stage 2 complete only after the revised bounded run and owner review. Do not begin Stage 3 in this increment.

## Owner-deferred external follow-up

This is a deliberate owner decision, not unfinished Stage 2 code:

- Observe one real monthly automatic refresh only if the owner separately authorizes another paid run. The coordinator is implemented but intentionally dormant while normal OpenAI settings remain off/zero.

## Provider reference

| Service | Purpose now | Cost / decision |
| --- | --- | --- |
| Serper | Find the official company and supporting public pages | Advertises 2,500 free queries; paid Starter top-up is $50 for 50,000 queries before tax, credits valid 6 months. Use trial first; no top-up approved. |
| OpenAI API | Draft structured facts and targeting from evidence | GPT-4o mini selected to match the reference project. The bounded real-key acceptance passed, then normal calls returned to disabled with a zero local limit. Example pricing lists $0.15/million input tokens and $0.60/million output tokens. |
| Existing public-page collector | Fetch and save permitted public evidence | No additional scraping-provider subscription needed for the planned implementation. |

## Final rerun outcome

The pass bar was at least three customers backed by first-party sources, at least two competitors with sources, a measurable size metric consistent with target size, buyer and champion titles, and zero blocking warnings. None of the three drafts passed completely. Resolve AI has 2 customers, 0 competitors, a consistent Employees/1,000 size rule, complete personas and 8 blocking/4 advisory warnings. Shopify has 0 customers, 0 competitors, a compatible Employee Count/50 size rule, complete personas and 25/1 warnings. Vercel has 0 customers, 0 competitors, a compatible employees/100 size rule, complete personas and 16/5 warnings. Manual correction is paused while the owner reviews the offline evidence-packet fix and decides whether to authorize a saved-pages-only draft rerun. See `docs/STAGE-2-FINAL-RERUN.md`.

Pricing checked September 16, 2026: [Serper](https://serper.dev/), [OpenAI GPT-4o mini](https://developers.openai.com/api/docs/models/gpt-4o-mini). Public-page access can fail or be disallowed; do not bypass access controls.

## Superseded trimmed portfolio stages — historical only

- [ ] **Stage 2.5 (M):** owner confirms/corrects independent eval keys and decides whether to authorize a bounded focused-drafting check.
- [ ] **Stage 3 (L):** ICP normalization, evidence-backed kill engine and scorecard; pass confirmed hand-labeled golden set plus Resolve gold-standard fixtures.
- [ ] **Stage 4 (M):** only ATS hiring (Greenhouse/Lever/Ashby) and news (Google News RSS/Serper) collectors.
- [ ] **Stage 5 (M):** fit scoring and tiers using free public firmographics only; no PDL or paid enrichment.
- [ ] **Stage 6 (L):** light discovery of 20–30 real, correctly segmented prospects per seller, with noise gate and customer/competitor exclusion.
- [ ] **Stage 8 (M):** Today list, why-now line, clickable receipts, account detail and new/working/skipped status.
- [ ] **Stage 9 (M):** validated receipt-backed draft plus Copy button; no contacts, sending, Apollo, Instantly, HubSpot or CRM sync.
- [ ] **Stage 11 (S):** manual Refresh account, demo preflight and a three-minute `docs/DEMO-SCRIPT.md`.

## Deferred — possible later

- Stage 7 scheduler, SEC/EDGAR, executive-change and GitHub collectors, and signal stacking — unnecessary for a deterministic local portfolio demo.
- Apollo integration — if separately authorized, port only Reference's contact lookup behind an off-by-default switch, run it only after fit/kill checks pass, and enforce a strict credit cap. No sending or CRM sync.
- Railway deploy (backup only, owner OK required) — interview demos run locally with screen sharing; existing `STATE_DIR`/`PORT` support stays, but Railway is not a planned phase and no demo snapshot work is needed.
- Stage 10 authentication, Postgres and backups — the demo remains local and single-user.
- Stage 12 advanced integrations — optional expansion after the core portfolio flow works.

## Change log

- **2026-10-27, desktop review close-out:** Tightened kill ownership evidence and separated adjacent vendors; preserved retired decisions visibly. Corrected Altana and ambiguous classification, saved passing Okta/CrowdStrike drafts, fixed full-body/receipt/date/workspace/queue polish and honest Metrics, and retained exact competitor-domain link provenance without guessing Vercel domains. Completed Gong's three GPT-5.5 calls for $0.222170 with 0 Serper/fetches/retries, left needs_review with 11 blocking/0 advisory, and confirmed OpenAI false/zero. Script v4 updated in place. Full suite: 317 passed, 1 skipped across 62 files. Owner review remains the next gate.
- **2026-10-27:** Refreshed the existing Drive Demo Script after a real UI walkthrough; fixed mobile account-name visibility (`7f761ac`, green CI). Added conservative comparison retention, explicit rejection/restore UI and audit, measurable identifier handling, and offline Vercel recovery (`564b11c`, green CI). Vercel: 12 customers, Cloudflare/Netlify/Webflow retained with domains missing, 3 blocking/0 advisory, target size left for owner input. Full suite: 302 passed, 1 skipped. Gong stopped at free preflight: $0.875820 maximum versus $0.60 cap; zero provider calls, zero Serper, $0 actual. No approval or Prepare demo.
- **2026-10-26:** Ported the Reference UI across the local demo using Luna max implementation and Sol/Astra review. Added 15 offline UI tests, preserved WhyNow review/no-send boundaries, verified desktop/tablet/mobile interactions and corrected the matrix click target. Reloaded the stale local Resolve demo to v7 and created/copied a passing Coalition template without a provider call. Full regression: 58 files, 296 passing tests, one intentional skip. Vercel/Gong remain unapproved.
- **2026-10-21:** Fixed the GPT-5.5 seller-research length failure without weakening evidence gates. All three focused calls now use 8,000 maximum output tokens and low reasoning. The deterministic Vercel packet again exposes Cloudflare, Netlify and Webflow, and canonical-page selection reduced evidence from 94,044 to 82,402 bytes while retaining 14 customer and 3 competitor candidates. The authorized Vercel-only run used exactly three calls/attempts, 0 Serper queries and $0.346560. The unapproved result has 12 customers, 0 retained competitors, 2 blocking warnings and 0 advisories; Gong and Prepare demo were not run, and OpenAI returned to disabled/zero. Full offline regression: 55 files, 281 active tests and one intentional skip.
- **2026-10-21:** Polished outreach offline and updated the existing Drive Demo Script in place. Template quotes are capped at 15 words without trailing ellipses, one framing sentence is allowed, and three approved closing questions rotate. Okta's saved GPT-5.5 draft passes; Coalition and CrowdStrike saved AI drafts fail honestly while their template-v2 fallbacks pass. The script now uses the five current Act-now accounts, Coalition template v2, the real Databricks build-culture kill, exact local routes/buttons and the night-before Prepare-demo flow.
- **2026-10-21:** Ran the owner-authorized Vercel/Gong any-seller checkpoint. Research preparation used 7/20 Serper queries and corrected customer-page prioritization before paid calls. Free model listing confirmed GPT-5.5. The exact six-call maximum estimate was $0.923735 under the $1.30 cap. Vercel's first seller-facts call returned `finish_reason=length` after 23,071 input and 2,048 output/reasoning tokens, costing $0.176795. The runner made no retry, made no Gong call, approved nothing, did not run Prepare demo and confirmed persistent OpenAI settings false/zero.
- **2026-10-21:** Made outreach readable without weakening accuracy. Grounding now locks risky names, full titles, technologies, locations, people and numbers while allowing natural connective prose; customer quotes/statistics require attribution; seller framing is editable; and subjects/body structure pass stricter readability rules. The old saved Coalition and CrowdStrike drafts now fail honestly. Template v2 passes for Coalition, Okta and CrowdStrike. The authorized GPT-5.5 run used exactly three calls/attempts, produced three passing drafts, cost $0.078850, saved/sent nothing, and returned OpenAI to disabled/zero. Full regression: 53 files, 270 active tests, one intentional skip; commit `ee5d798` CI passed.
- **2026-10-21:** Finished Resolve trigger-first discovery with 26/40 Serper queries and zero OpenAI calls. Three verified direct-job-text prospects—Okta, SecurityScorecard and Altana—joined Coalition and CrowdStrike in `Act now`.
- **2026-10-21:** Finished allowed-facts draft validation. Coalition's exact recorded draft passes after a general false-positive fix; CrowdStrike remains blocked for unsupported on-call/production language and uses the deterministic template. The conditional two-call run cost $0.080280; no draft was saved or sent and OpenAI returned to disabled/zero.
- **2026-10-21:** Completed the offline any-seller pipeline: configurable GPT-5.5 focused research, ICP/persona/competitor-driven discovery, seller-specific signal applicability, capped Prepare demo background workflow and a recorded Vercel end-to-end test. The saved Vercel-size packet has a conservative three-call maximum estimate of $0.615. Added the night-before demo guide.

- **2026-10-21:** Finished the already-running 25-account Refresh-all job without launching a duplicate. It completed 25/25 accounts with 125/150 authorized Serper queries and zero OpenAI calls. Seven batch accounts (eight across Today) have a dated in-window trigger; fit scores span 11–51 with median 34. Optional-source failures remain unknown evidence.
- **2026-10-21:** Completed Chunk 3's offline checkpoint. Ported workspace-neutral message targeting and validator gates, added a deterministic receipt-backed five-block template, Demo watermark and Copy button, and kept the application send-free. The real Circle false-positive receipt is rejected for drafting. A free `GET /v1/models` check confirmed `gpt-5.5`; official pricing yields about $0.00857 typical and $0.02207 conservative maximum per saved-context request. No generation call ran.
- **2026-10-21:** Confirmed local screen-sharing as the interview demo path. Removed Railway as a planned phase; Railway backup and capped, off-by-default Apollo contact lookup are documented only as possible later work requiring separate owner approval. No deployment or snapshot work ran.
- **2026-10-21:** Ran the owner-authorized GPT-5.5 outreach checkpoint. The first Binance request returned provider status `incomplete`; the safety runner stopped after one logical call and one attempt, made no Coalition or CrowdStrike call, used no transient retry, and saved/sent no draft. Exact billed cost could not be recovered from the incomplete response; the conservative request reservation was $0.022015 under the $0.25 process cap. The normal OpenAI settings remain disabled/zero. Full regression: 49 files passed, 241 tests passed and one future golden-set scaffold stayed intentionally skipped.
- **2026-10-21:** Fixed the reasoning-token root cause offline. GPT-5.x outreach now uses 4,000 output tokens with medium reasoning and no budget-escalation retry; incomplete responses preserve safe reason/usage/cost metadata. Full regression: 49 files passed, 242 tests passed and one future scaffold stayed intentionally skipped. The corrected three-account batch then completed in exactly three calls/attempts with no retry. All drafts passed validation; total actual cost was $0.072110. OpenAI returned to disabled/zero, and no draft was saved as sent or into application state.
- **2026-10-21:** Reopened draft demo readiness for accuracy. Four current Resolve pages were fetched through the guarded robots-aware runtime with no Serper/OpenAI use; reference v5 now keeps only verbatim receipted claims. Added exact seller-quote and prospect-detail grounding, early-career exclusion, the banned-tone rule and neutral/corroborated executive-change handling. Full regression passed: 49 files, 252 tests and one intentional future scaffold skip. The saved-evidence rerank produced only Coalition and CrowdStrike in `Act now`, so the exact-three paid regeneration made zero calls; OpenAI stayed disabled/zero.
- **2026-10-20:** Owner superseded Stage 2.5 and the trimmed remaining-stage plan with port mode using a permitted read-only behavioral baseline. Stage 2.5 is paused and its extractor retained for future use. No module was ported, no profile approved and no provider called; Phase A awaits explicit owner approval.
- **2026-10-20:** Completed port-mode Phase A. Captured ten immutable offline Reference parity cases at commit `130789f`, moved Resolve constants into reference profile v2 with line-level provenance, added workspace-configured scoring/kills/tiering/decisioning, manual accounts, Scorecard, retained Kill Log and a non-approved Resolve demo loader. Real browser restart persistence passed. Full suite: 144 active tests passed, one intentional skip. No provider call, approval or deployment occurred; Phase B remains blocked.
- **2026-10-20:** Tightened Phase B live quality. Free firmographics now reject adjacent-company/IPO/public boilerplate, current triggers require dated in-window evidence, healthy status pages score zero, and repeated receipts are deduplicated. The five-account correction reused saved evidence and made no provider calls. SEC EDGAR's remaining 403 is recorded and isolated. The owner authorized Chunk 2 with a separate maximum of 60 Serper queries.
- **2026-10-20:** Completed Chunk 2. Ported the workspace-configured discovery universe/noise gate/background runner and the compact Today/account lifecycle surface. The live Resolve run used 10 Serper queries, saved 25 prospects across all 10 segments, had zero errors and no forbidden seller/customer/competitor accounts, and made no OpenAI calls. Browser restart persistence passed.
- **2026-10-20:** Reached the Stage 2.5 offline checkpoint. Deterministic saved-page extraction found 7/51/14 customer candidates with 2/3/2 proven domains and 2/2/3 competitors for Resolve AI/Shopify/Vercel. Independent unconfirmed keys produce provisional recall of 7/7 + 2/2, 3/3 + 2/2 and 3/3 + 3/3; confirmed-only scoring remains empty pending owner review. Raw HTML was available, no page/provider call ran, and no profile was approved. A read-only account model listing confirmed the proposed pinned GPT-5.4 mini ID is available; it remains disabled and the conservative focused-call estimate exceeds the old cap. Full verification passed with 125 active tests and one intentional skip across 27 files.
- **2026-10-19:** Recorded the authorized saved-pages-only redraft preflight ($0.032103 maximum estimate) and stopped attempt: one Resolve AI provider attempt ended `REQUEST_FAILED`; Shopify/Vercel were not called; no profile changed; settings remained disabled/zero; 113 tests pass with one intentional skip.
- **2026-10-19:** Confirmed offline that duplicated receipt enums put Resolve AI at 1,097 and Shopify at 1,211 enum values. Replaced them with one short-ID enum (548/605/489 values), added stable-ID restoration, a 900-receipt priority cap, documented-limit schema tests and safe HTTP-status diagnostics. Full verification passed with 116 tests and one intentional Stage 3 skip. No provider call or approval occurred.
- **2026-10-19:** Completed the fixed-schema saved-pages draft with one successful call per seller and no retry. Recovered finalization offline after a local snapshot-path error. New `needs_review` results are Resolve AI 0/0 organizations and 11/2 warnings, Shopify 0/2 and 13/0, Vercel 0/0 and 8/4. Exact token-priced cost was not retained; conservative reservation was $0.026104. No profile was approved and OpenAI returned to disabled/zero.
- **2026-10-19:** Confirmed the 24 KB start-of-page evidence menu was hiding deeper saved customer/comparison evidence. Added a priority-weighted, relevance-ranked 120 KB packet and offline coverage/cap tests.
- **2026-10-19:** Replaced the broad remaining Stage 3–12 roadmap with `docs/IMPLEMENTATION-PLAN-TRIMMED.md`: stages 3, 4, 5, 6, 8, draft-only 9 and 11 remain; stages 7, 10, advanced Stage 9 delivery/contact work and Stage 12 are deferred.
- **2026-10-19:** Recorded the last automated Stage 2 rerun and its real page, call, cost and pass-bar results. Remaining profile work is manual.

Stage 0–1 infrastructure is implemented. Historical acceptance details and outstanding checks remain in TRACEABILITY.md; this checklist does not retroactively mark unverified checks complete.
