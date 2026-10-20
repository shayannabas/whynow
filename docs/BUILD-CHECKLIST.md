# WhyNow — build checklist

Updated: October 19, 2026. Current stage: Stage 2 reopened for quality; Stage 3 has not started.

This is the working checklist, updated only after verification. The original acceptance did not persist its profiles, so a bounded recovery run later saved three public-data snapshots and separate `needs_review` state. That recovery made four provider attempts because Shopify used the existing transient retry. Shopify and Vercel reported $0.005177 combined; Resolve AI's usage record was lost with the first stopped process, and the conservative total reservation was $0.038686 under the $0.05 cap.

The October 19 offline quality audit keeps the original 9/23/27 findings but separates their effect: Resolve AI has 7 blocking and 2 advisory warnings, Shopify 18 blocking and 5 advisory, and Vercel revision 1 has 23 blocking and 4 advisory. Advisory findings remain beside their fields but do not require an explanation. No profile is approved, no provider call was made for the audit, and Stage 2 remains open.

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
- [x] Pass 107 active offline tests across 21 files, including synthetic positive cases, all three real quality snapshots, warning levels, advisory approval behavior, hallucinated claims, refresh receipt gaps, off-domain redirects, stale tabs/results, budget exhaustion, restarts, hidden refresh workspaces and cross-workspace isolation. One Stage 3 scaffold test remains intentionally skipped.
- [x] Browser-check the real Vercel candidate/evidence result at desktop and 768-pixel widths.
- [x] Browser-check the complete editable generated-review and monthly-refresh workflows at desktop and 768-pixel widths using isolated local fixtures; the existing manual save/review/approve flow is covered by its local HTTP acceptance test.
- [x] Run Vercel's live Serper identity/evidence check: four searches, twenty saved `vercel.com` pages, zero page errors, about forty seconds.
- [x] Pass the no-cost three-seller acceptance with recorded official-page fixtures: Resolve AI, Shopify and Vercel each finish well under 3 minutes, produce at least 90% receipted attempted factual claims and can be explicitly approved.
- [x] Persist the owner-authorized recovery outputs as immutable public-data snapshots and separate `needs_review` acceptance state. The original acceptance did not persist its profiles.
- [ ] Re-run the revised research/drafting flow for Resolve AI, Shopify and Vercel only after separate owner authorization for step 5; leave all three in `needs_review` for owner review.
- [x] Prepare the one-rerun allowlist without calling providers: 4 new Resolve AI pages, 5 Shopify pages and 8 Vercel pages; 0 Serper queries; 3 planned GPT-4o mini calls; expected API cost about $0.01 with the existing temporary $0.05 process cap.
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

## Step 5 one-rerun pass bar

Each seller must have at least three customers backed by first-party sources, at least two competitors with sources, a measurable size metric consistent with target size, buyer and champion titles, and zero blocking warnings. Anything still failing after the single rerun will be corrected manually in the review screen. The rerun has not been authorized or started.

Pricing checked September 16, 2026: [Serper](https://serper.dev/), [OpenAI GPT-4o mini](https://developers.openai.com/api/docs/models/gpt-4o-mini). Public-page access can fail or be disallowed; do not bypass access controls.

## Later stages — not started

- [ ] Stage 3: fit rules, disqualification rules and scorecard.
- [ ] Stage 4: prospect signal collectors.
- [ ] Stage 5: scoring, company enrichment and tiers.
- [ ] Stage 6: prospect discovery.
- [ ] Stage 7: triggers and scheduling.
- [ ] Stage 8: SDR workflow and account lifecycle.
- [ ] Stage 9: contacts, drafts and gated delivery. Apollo and any sending integrations are decisions for this stage, not purchases needed now.
- [ ] Stage 10: authentication, production storage, security and deployment.
- [ ] Stage 11: measured metrics and interview/demo story.
- [ ] Optional Stage 12: advanced integrations.

Stage 0–1 infrastructure is implemented. Historical acceptance details and outstanding checks remain in TRACEABILITY.md; this checklist does not retroactively mark unverified checks complete.
