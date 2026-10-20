# WhyNow — build checklist

Updated: October 20, 2026. Current stage: Stage 2.5 research quality has reached its offline checkpoint. Profiles remain `needs_review`; no profile was approved and Stage 3 has not started.

This is the working checklist, updated only after verification. The original acceptance did not persist its profiles, so a bounded recovery run later saved three public-data snapshots and separate `needs_review` state. That recovery made four provider attempts because Shopify used the existing transient retry. Shopify and Vercel reported $0.005177 combined; Resolve AI's usage record was lost with the first stopped process, and the conservative total reservation was $0.038686 under the $0.05 cap.

The October 19 offline quality audit keeps the original 9/23/27 findings but separates their effect: Resolve AI has 7 blocking and 2 advisory warnings, Shopify 18 blocking and 5 advisory, and Vercel revision 1 has 23 blocking and 4 advisory. Advisory findings remain beside their fields but do not require an explanation. No profile is approved, no provider call was made for the audit, and Stage 2 remains open.

The one authorized final rerun then fetched all 29 allowlisted first-party pages with zero errors, used zero Serper queries and made exactly three GPT-4o mini calls with no retry. Token-reported cost was $0.007646 under the temporary $0.05 process cap. The normal local OpenAI settings remained disabled/zero. Final drafts remain `needs_review`: Resolve AI has 2 customers, 0 competitors and 8 blocking/4 advisory warnings; Shopify has 0/0 and 25/1; Vercel has 0/0 and 16/5.

The subsequent offline root-cause audit found that the 24 KB evidence menu divided space across all saved sources and selected text from page starts, so deeper customer and comparison evidence often never reached the model. The corrected menu has a 120 KB hard ceiling, weights customer/case-study, comparison, pricing and about/enterprise pages, ranks relevant sentences and preserves every existing grounding/quality gate. On the unchanged saved pages, receipt totals increased from 101/122/74 to 548/605/489 for Resolve AI/Shopify/Vercel; all checked individual customer and competitor names now reach their source's receipt menu.

The owner then authorized one saved-pages-only GPT-4o mini draft per seller. Preflight estimated $0.024729 input cost and $0.032103 maximum total, below the $0.04 stop line. The run stopped on Resolve AI after one provider attempt with safe status `REQUEST_FAILED`; Shopify and Vercel made zero attempts. The isolated working state prevented partial output from replacing the prior profiles. No page fetch, Serper query, new profile or approval occurred. Normal OpenAI settings are confirmed disabled/zero, and no retry is authorized.

The request was then reconstructed offline. The old schema duplicated 548/605/489 stable receipt IDs across optional and required enums, yielding 1,097/1,211/979 enum values. Resolve AI and Shopify exceeded OpenAI's 1,000-value limit; Shopify also exceeded the 15,000-character large-enum limit. The fix sends one enum of short run-local IDs, maps them back to stable IDs server-side, and caps a future packet at 900 receipts in source-priority order. Post-fix schemas contain 548/605/489 enum values and 2,192/2,420/1,956 enum characters. The original failure did not retain an HTTP status; future safe failures store and show only the numeric status, never the response body.

The owner authorized one fixed-schema saved-pages draft per seller. Preflight passed all schema limits and estimated $0.026104 maximum cost, below the $0.04 stop line. Resolve AI, Shopify and Vercel each completed in one provider attempt with no retry. A local snapshot-path bug then interrupted finalization after all calls; the intact isolated outputs were finalized offline without another call. The exact provider token usage was lost with the interrupted in-memory usage array, so actual cost is unavailable; the persisted conservative reservation is $0.026104. All three remain `needs_review`: Resolve AI has 0 customers/0 competitors and 11 blocking/2 advisory warnings; Shopify has 0 customers/2 sourced competitors and 13/0; Vercel has 0/0 and 8/4. OpenAI is disabled/zero and no further automated draft is authorized.

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

## Trimmed remaining portfolio stages — not started

- [ ] **Stage 2.5 (M):** owner confirms/corrects independent eval keys and decides whether to authorize a bounded focused-drafting check.
- [ ] **Stage 3 (L):** ICP normalization, evidence-backed kill engine and scorecard; pass confirmed hand-labeled golden set plus Resolve gold-standard fixtures.
- [ ] **Stage 4 (M):** only ATS hiring (Greenhouse/Lever/Ashby) and news (Google News RSS/Serper) collectors.
- [ ] **Stage 5 (M):** fit scoring and tiers using free public firmographics only; no PDL or paid enrichment.
- [ ] **Stage 6 (L):** light discovery of 20–30 real, correctly segmented prospects per seller, with noise gate and customer/competitor exclusion.
- [ ] **Stage 8 (M):** Today list, why-now line, clickable receipts, account detail and new/working/skipped status.
- [ ] **Stage 9 (M):** validated receipt-backed draft plus Copy button; no contacts, sending, Apollo, Instantly, HubSpot or CRM sync.
- [ ] **Stage 11 (S):** manual Refresh account, demo preflight and a three-minute `docs/DEMO-SCRIPT.md`.

## Deferred — future work

- Stage 7 scheduler, SEC/EDGAR, executive-change and GitHub collectors, and signal stacking — unnecessary for a deterministic local portfolio demo.
- Stage 9 contacts, Apollo, sending and CRM sync — paid/personal-data and authorization scope is not needed for receipt-backed drafts.
- Stage 10 authentication, Postgres, backups and production deploy — the demo remains local and single-user.
- Stage 12 advanced integrations — optional expansion after the core portfolio flow works.

## Change log

- **2026-10-20:** Reached the Stage 2.5 offline checkpoint. Deterministic saved-page extraction found 7/51/14 customer candidates with 2/3/2 proven domains and 2/2/3 competitors for Resolve AI/Shopify/Vercel. Independent unconfirmed keys produce provisional recall of 7/7 + 2/2, 3/3 + 2/2 and 3/3 + 3/3; confirmed-only scoring remains empty pending owner review. Raw HTML was available, no page/provider call ran, and no profile was approved. A read-only account model listing confirmed the proposed pinned GPT-5.4 mini ID is available; it remains disabled and the conservative focused-call estimate exceeds the old cap. Full verification passed with 125 active tests and one intentional skip across 27 files.
- **2026-10-19:** Recorded the authorized saved-pages-only redraft preflight ($0.032103 maximum estimate) and stopped attempt: one Resolve AI provider attempt ended `REQUEST_FAILED`; Shopify/Vercel were not called; no profile changed; settings remained disabled/zero; 113 tests pass with one intentional skip.
- **2026-10-19:** Confirmed offline that duplicated receipt enums put Resolve AI at 1,097 and Shopify at 1,211 enum values. Replaced them with one short-ID enum (548/605/489 values), added stable-ID restoration, a 900-receipt priority cap, documented-limit schema tests and safe HTTP-status diagnostics. Full verification passed with 116 tests and one intentional Stage 3 skip. No provider call or approval occurred.
- **2026-10-19:** Completed the fixed-schema saved-pages draft with one successful call per seller and no retry. Recovered finalization offline after a local snapshot-path error. New `needs_review` results are Resolve AI 0/0 organizations and 11/2 warnings, Shopify 0/2 and 13/0, Vercel 0/0 and 8/4. Exact token-priced cost was not retained; conservative reservation was $0.026104. No profile was approved and OpenAI returned to disabled/zero.
- **2026-10-19:** Confirmed the 24 KB start-of-page evidence menu was hiding deeper saved customer/comparison evidence. Added a priority-weighted, relevance-ranked 120 KB packet and offline coverage/cap tests.
- **2026-10-19:** Replaced the broad remaining Stage 3–12 roadmap with `docs/IMPLEMENTATION-PLAN-TRIMMED.md`: stages 3, 4, 5, 6, 8, draft-only 9 and 11 remain; stages 7, 10, advanced Stage 9 delivery/contact work and Stage 12 are deferred.
- **2026-10-19:** Recorded the last automated Stage 2 rerun and its real page, call, cost and pass-bar results. Remaining profile work is manual.

Stage 0–1 infrastructure is implemented. Historical acceptance details and outstanding checks remain in TRACEABILITY.md; this checklist does not retroactively mark unverified checks complete.
