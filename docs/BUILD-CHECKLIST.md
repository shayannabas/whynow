# WhyNow — build checklist

Updated: October 19, 2026. Current stage: the authorized saved-pages-only Stage 2 redraft stopped on Resolve AI with no new profile; no retry is authorized; Stage 3 has not started.

This is the working checklist, updated only after verification. The original acceptance did not persist its profiles, so a bounded recovery run later saved three public-data snapshots and separate `needs_review` state. That recovery made four provider attempts because Shopify used the existing transient retry. Shopify and Vercel reported $0.005177 combined; Resolve AI's usage record was lost with the first stopped process, and the conservative total reservation was $0.038686 under the $0.05 cap.

The October 19 offline quality audit keeps the original 9/23/27 findings but separates their effect: Resolve AI has 7 blocking and 2 advisory warnings, Shopify 18 blocking and 5 advisory, and Vercel revision 1 has 23 blocking and 4 advisory. Advisory findings remain beside their fields but do not require an explanation. No profile is approved, no provider call was made for the audit, and Stage 2 remains open.

The one authorized final rerun then fetched all 29 allowlisted first-party pages with zero errors, used zero Serper queries and made exactly three GPT-4o mini calls with no retry. Token-reported cost was $0.007646 under the temporary $0.05 process cap. The normal local OpenAI settings remained disabled/zero. Final drafts remain `needs_review`: Resolve AI has 2 customers, 0 competitors and 8 blocking/4 advisory warnings; Shopify has 0/0 and 25/1; Vercel has 0/0 and 16/5.

The subsequent offline root-cause audit found that the 24 KB evidence menu divided space across all saved sources and selected text from page starts, so deeper customer and comparison evidence often never reached the model. The corrected menu has a 120 KB hard ceiling, weights customer/case-study, comparison, pricing and about/enterprise pages, ranks relevant sentences and preserves every existing grounding/quality gate. On the unchanged saved pages, receipt totals increased from 101/122/74 to 548/605/489 for Resolve AI/Shopify/Vercel; all checked individual customer and competitor names now reach their source's receipt menu.

The owner then authorized one saved-pages-only GPT-4o mini draft per seller. Preflight estimated $0.024729 input cost and $0.032103 maximum total, below the $0.04 stop line. The run stopped on Resolve AI after one provider attempt with safe status `REQUEST_FAILED`; Shopify and Vercel made zero attempts. The isolated working state prevented partial output from replacing the prior profiles. No page fetch, Serper query, new profile or approval occurred. Normal OpenAI settings are confirmed disabled/zero, and no retry is authorized.

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

- **2026-10-19:** Recorded the authorized saved-pages-only redraft preflight ($0.032103 maximum estimate) and stopped attempt: one Resolve AI provider attempt ended `REQUEST_FAILED`; Shopify/Vercel were not called; no profile changed; settings remained disabled/zero; 113 tests pass with one intentional skip.
- **2026-10-19:** Confirmed the 24 KB start-of-page evidence menu was hiding deeper saved customer/comparison evidence. Added a priority-weighted, relevance-ranked 120 KB packet and offline coverage/cap tests.
- **2026-10-19:** Replaced the broad remaining Stage 3–12 roadmap with `docs/IMPLEMENTATION-PLAN-TRIMMED.md`: stages 3, 4, 5, 6, 8, draft-only 9 and 11 remain; stages 7, 10, advanced Stage 9 delivery/contact work and Stage 12 are deferred.
- **2026-10-19:** Recorded the last automated Stage 2 rerun and its real page, call, cost and pass-bar results. Remaining profile work is manual.

Stage 0–1 infrastructure is implemented. Historical acceptance details and outstanding checks remain in TRACEABILITY.md; this checklist does not retroactively mark unverified checks complete.
