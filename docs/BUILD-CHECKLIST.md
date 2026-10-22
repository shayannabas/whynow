# WhyNow — build checklist

Updated: October 21, 2026. Current direction: port mode. Stage 2.5 and the trimmed remaining-stage plan are paused, while its deterministic extractor now supports the any-seller research path. Phases A and B, Chunk 2, trigger-first discovery, outreach accuracy and the offline any-seller pipeline are complete. Coalition has a passing recorded model draft; CrowdStrike correctly falls back to the deterministic template. The Demo Script now matches the live routes and queue. The corrected Vercel-only GPT-5.5 research check completed and left an unapproved `needs_review` profile with 12 customers, 0 competitors, 2 blocking warnings and 0 advisories. Gong was not called. OpenAI is disabled/zero, and no send path exists.

This is the working checklist, updated only after verification. The original acceptance did not persist its profiles, so a bounded recovery run later saved three public-data snapshots and separate `needs_review` state. That recovery made four provider attempts because Shopify used the existing transient retry. Shopify and Vercel reported $0.005177 combined; Resolve AI's usage record was lost with the first stopped process, and the conservative total reservation was $0.038686 under the $0.05 cap.

The October 19 offline quality audit keeps the original 9/23/27 findings but separates their effect: Resolve AI has 7 blocking and 2 advisory warnings, Shopify 18 blocking and 5 advisory, and Vercel revision 1 has 23 blocking and 4 advisory. Advisory findings remain beside their fields but do not require an explanation. No profile is approved, no provider call was made for the audit, and Stage 2 remains open.

The one authorized final rerun then fetched all 29 allowlisted first-party pages with zero errors, used zero Serper queries and made exactly three GPT-4o mini calls with no retry. Token-reported cost was $0.007646 under the temporary $0.05 process cap. The normal local OpenAI settings remained disabled/zero. Final drafts remain `needs_review`: Resolve AI has 2 customers, 0 competitors and 8 blocking/4 advisory warnings; Shopify has 0/0 and 25/1; Vercel has 0/0 and 16/5.

The subsequent offline root-cause audit found that the 24 KB evidence menu divided space across all saved sources and selected text from page starts, so deeper customer and comparison evidence often never reached the model. The corrected menu has a 120 KB hard ceiling, weights customer/case-study, comparison, pricing and about/enterprise pages, ranks relevant sentences and preserves every existing grounding/quality gate. On the unchanged saved pages, receipt totals increased from 101/122/74 to 548/605/489 for Resolve AI/Shopify/Vercel; all checked individual customer and competitor names now reach their source's receipt menu.

The owner then authorized one saved-pages-only GPT-4o mini draft per seller. Preflight estimated $0.024729 input cost and $0.032103 maximum total, below the $0.04 stop line. The run stopped on Resolve AI after one provider attempt with safe status `REQUEST_FAILED`; Shopify and Vercel made zero attempts. The isolated working state prevented partial output from replacing the prior profiles. No page fetch, Serper query, new profile or approval occurred. Normal OpenAI settings are confirmed disabled/zero, and no retry is authorized.

The request was then reconstructed offline. The old schema duplicated 548/605/489 stable receipt IDs across optional and required enums, yielding 1,097/1,211/979 enum values. Resolve AI and Shopify exceeded OpenAI's 1,000-value limit; Shopify also exceeded the 15,000-character large-enum limit. The fix sends one enum of short run-local IDs, maps them back to stable IDs server-side, and caps a future packet at 900 receipts in source-priority order. Post-fix schemas contain 548/605/489 enum values and 2,192/2,420/1,956 enum characters. The original failure did not retain an HTTP status; future safe failures store and show only the numeric status, never the response body.

The owner authorized one fixed-schema saved-pages draft per seller. Preflight passed all schema limits and estimated $0.026104 maximum cost, below the $0.04 stop line. Resolve AI, Shopify and Vercel each completed in one provider attempt with no retry. A local snapshot-path bug then interrupted finalization after all calls; the intact isolated outputs were finalized offline without another call. The exact provider token usage was lost with the interrupted in-memory usage array, so actual cost is unavailable; the persisted conservative reservation is $0.026104. All three remain `needs_review`: Resolve AI has 0 customers/0 competitors and 11 blocking/2 advisory warnings; Shopify has 0 customers/2 sourced competitors and 13/0; Vercel has 0/0 and 8/4. OpenAI is disabled/zero and no further automated draft is authorized.

## Port mode — current direction

- [x] Preserve the green Stage 2.5 baseline at commit `3cdabaf`; 125 active tests pass and one existing scaffold test is intentionally skipped.
- [x] Pause Stage 2.5. Keep its deterministic organization extractor and evaluation work as a future improvement.
- [x] Mark the trimmed remaining-stage plan as superseded historical scope.
- [x] Confirm the SignalScout reference repository and author: read-only `flowfire`, product SignalScout, by Isa Iqbal, used with permission.
- [x] Record exclusions: no Apollo, PhantomBuster, PDL/paid firmographics, StatusGator, Instantly, HubSpot, Clerk, Postgres, backups, Railway or uptime workflow.
- [x] Preserve WhyNow workspaces, atomic JSON state, receipts, human approval and send-free Demo mode.
- [x] Owner approved Phase A before any ported code was written.
- [x] Freeze SignalScout's exact offline behavior for ten accounts at source commit `130789f1bac1d5e11f5f5154f269155dc17f2d21`; tests never import SignalScout at runtime.
- [x] Replace Resolve runtime constants with load-only reference/workspace configuration and record every moved value's source file and line range.
- [x] Port the workspace-configured six-signal scorer, kill engine and precedence, evidence-only tiering, and decision formula.
- [x] Retain primary and secondary kills in a visible Kill Log; killed accounts keep their fit score and receive zero priority.
- [x] Add local manual account entry for name, domain, segment and public source URL.
- [x] Add a frozen Resolve reference demo that never writes approval state or enables delivery.
- [x] Make state storage configurable through `STATE_DIR`; continue honoring `PORT`; keep long provider work in existing background coordinators.
- [x] Browser acceptance: load Resolve reference demo, add Coinbase, see its 8/100 scorecard, see its `KILL_EXISTING_CUSTOMER` receipt, restart and confirm persistence.
- [x] Full offline suite: 31 files, 144 active tests pass and one existing scaffold test remains intentionally skipped.
- [x] Owner authorized the narrowed Phase B scope: ATS hiring, Statuspage/HN/Google News active pain, Serper search/executive change, SEC Form D, tech culture, AI compatibility, competitive wedge and revenue sensitivity.
- [x] Freeze 18 SignalScout collector outputs at source commit `130789f1bac1d5e11f5f5154f269155dc17f2d21`; WhyNow reproduces them exactly without importing SignalScout at runtime.
- [x] Preserve WhyNow's stricter network/robots/budget/atomic-state boundary and match SignalScout's in-scope budgets and cache times.
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
- [x] Move SignalScout's Resolve discovery universe into load-only workspace configuration with source commit/line provenance; discovery code contains no Resolve prospect constants.
- [x] Add a 60-query-hard-cap background discovery runner, official-domain noise gate, balanced segment selection and atomic promotion.
- [x] Live Chunk 2 discovery: 10 Serper queries, 0 OpenAI calls, 62 raw config/search candidates, 25 selected prospects, all 10 segments represented, 0 source errors and 0 seller/customer/competitor leaks.
- [x] Add Today, account detail, clickable why-now/source receipts and explicit `new / working / skipped` state with required typed skip reason and audit event.
- [x] Browser-check Today, Discovery and account detail; restart and confirm the 25 prospects and completed run persist.
- [x] Complete Chunk 2 and stop before the next port phase.
- [x] Complete the single authorized 25-account Refresh-all background run without a duplicate: 25/25 accounts, exactly 125 Serper queries, zero OpenAI calls.
- [x] Report the Today evidence set: 7/25 refreshed discovery accounts and 8 total Today accounts have at least one dated, in-window receipt; preserve exact top-10 and fit distribution in `docs/STEP-1-REFRESH-ALL.md`.
- [x] Keep uncollected signals as SignalScout's score-1, 40%-confidence prior and label them `Unknown · low confidence`, never negative evidence.
- [x] Port workspace-neutral message targeting and validator gates, then build the deterministic receipt-backed template first.
- [x] Add the Demo watermark, manual recipient/sender fields, receipt links and Copy button. Keep every send code path absent.
- [x] Configure outreach independently as `OPENAI_OUTREACH_MODEL=gpt-5.5`; free `GET /v1/models` returned HTTP 200 and confirmed account access.
- [x] Confirm from official documentation that `gpt-5.5` supports Responses/Structured Outputs and costs $5/M input plus $30/M output tokens.
- [x] Match SignalScout's GPT-5.x request budget: reasoning effort `medium`, 4,000 maximum output tokens, and no automatic output-budget escalation retry. A real Binance request is about $0.008515 at 150 output tokens and $0.124015 at the full allowance.
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

The current boundary is the complete local portfolio-demo pipeline. Resolve Today has five eligible `Act now` accounts: Okta, Coalition, Altana, CrowdStrike and SecurityScorecard. Coalition's recorded model draft passes; CrowdStrike's model draft remains blocked and its deterministic template is the approved fallback behavior. A new seller can be researched, reviewed and owner-approved, then prepared through one capped background discovery/refresh/rank action. The corrected Vercel-only generation produced an unapproved review profile with 12 customers, 0 retained competitors, complete personas, 2 blocking warnings and 0 advisories. Gong remains an evidence-only draft. Nothing was sent, no profile was approved on the owner's behalf, and normal OpenAI settings remain disabled/zero.

Owner chose OpenAI first, matching the friend's GPT-4o mini/direct HTTP setup. The bounded recovery run persisted three snapshots and three `needs_review` workspaces. It made four attempts because Shopify used the existing transient retry. Shopify and Vercel reported an estimated combined $0.005177; Resolve AI's usage record was lost when the first process stopped, so the exact total is unknown. The conservative reservation reached $0.038686 under the temporary $0.05 cap. The ignored local `.env` was then verified without displaying secrets: `OPENAI_ENABLED=false` and `OPENAI_MONTHLY_LIMIT_USD=0`. Local operation avoids hosting charges, but provider calls still consume credits.

Do not paste API keys into chat. Store keys in the local ignored `.env` file, never in this checklist or GitHub. OpenAI key/model/billing access worked for the bounded acceptance; this does not infer the account's remaining balance.

## Stage 2 — local implementation checklist

- [x] Company-name-only entry, including Vercel.
- [x] Honest results screen with no invented facts.
- [x] Manual company selection and profile/ideal-customer editing.
- [x] Saved-quote checks and explicit manual approval.
- [x] Workspace list, archive, restore and isolation.
- [x] Check current provider requirements and public pricing.
- [x] Choose OpenAI first and match the friend's default profile-parser model: gpt-4o-mini.
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
- Apollo integration — if separately authorized, port only SignalScout's contact lookup behind an off-by-default switch, run it only after fit/kill checks pass, and enforce a strict credit cap. No sending or CRM sync.
- Railway deploy (backup only, owner OK required) — interview demos run locally with screen sharing; existing `STATE_DIR`/`PORT` support stays, but Railway is not a planned phase and no demo snapshot work is needed.
- Stage 10 authentication, Postgres and backups — the demo remains local and single-user.
- Stage 12 advanced integrations — optional expansion after the core portfolio flow works.

## Change log

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
- **2026-10-20:** Owner superseded Stage 2.5 and the trimmed remaining-stage plan with port mode using SignalScout by Isa Iqbal as a read-only reference. Stage 2.5 is paused and its extractor retained for future use. No module was ported, no profile approved and no provider called; Phase A awaits explicit owner approval.
- **2026-10-20:** Completed port-mode Phase A. Captured ten immutable offline SignalScout parity cases at commit `130789f`, moved Resolve constants into reference profile v2 with line-level provenance, added workspace-configured scoring/kills/tiering/decisioning, manual accounts, Scorecard, retained Kill Log and a non-approved Resolve demo loader. Real browser restart persistence passed. Full suite: 144 active tests passed, one intentional skip. No provider call, approval or deployment occurred; Phase B remains blocked.
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
