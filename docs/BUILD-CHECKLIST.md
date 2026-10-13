# WhyNow — build checklist

Updated: October 13, 2026. Current stage: Stage 2 implementation complete locally; Stage 3 has not started.

This is the working checklist, updated only after verification. Latest local verification: 93 tests passed across 18 files on Node 24 against the project's Node 22 target, the production dependency audit found zero vulnerabilities, and the complete generated-review and monthly-refresh screens passed browser checks at desktop and 768-pixel widths. Three recorded official-page sellers—Resolve AI, Shopify and Vercel—each completed research, grounded drafting, review and approval with at least 90% receipt coverage without contacting a provider. The earlier bounded live Vercel research run also passed: four Serper searches, twenty official-domain pages saved, no page errors and about forty seconds from start to finish. No OpenAI request was made.

## Current decision

Owner chose OpenAI first, matching the friend's GPT-4o mini/direct HTTP setup, then explicitly requested that paid calls stay OFF. No OpenAI spending is approved. The owner approved Serper integration using a key shared by a friend with permission and asked to run WhyNow locally. Local operation avoids hosting charges, but Serper calls still consume that account's credits. The key is stored only in the ignored local `.env`; presence was verified without displaying it. The live Vercel check respected the 4-query run cap, 50-query monthly cap and 20-page research cap.

Do not paste API keys into chat. Store keys in the local ignored .env file, never in this checklist or GitHub. Provider credentials and billing have not been verified.

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
- [x] Validate every factual field; reject unsupported customers and competitors, count them against receipt coverage, and flag uncertainty.
- [x] Connect generated results to editing and human approval behind the disabled-by-default OpenAI gate.
- [x] Add the original Resolve reference configuration without making it the default seller.
- [x] Add genuine official-page excerpt fixtures for Resolve AI, Vercel and Shopify; document the reference comparison.
- [x] Add the monthly refresh coordinator: due-date detection, hidden isolated research/drafting workspace, receipt-aware visible differences, restart recovery, grounding recheck and fresh approval. It is dormant unless both providers and positive limits are explicitly enabled.
- [x] Pass 93 offline tests, including hallucinated claims, refresh receipt gaps, off-domain redirects, stale tabs/results, budget exhaustion, restarts, hidden refresh workspaces and cross-workspace isolation.
- [x] Browser-check the real Vercel candidate/evidence result at desktop and 768-pixel widths.
- [x] Browser-check the complete editable generated-review and monthly-refresh workflows at desktop and 768-pixel widths using isolated local fixtures; the existing manual save/review/approve flow is covered by its local HTTP acceptance test.
- [x] Run Vercel's live Serper identity/evidence check: four searches, twenty saved `vercel.com` pages, zero page errors, about forty seconds.
- [x] Pass the no-cost three-seller acceptance with recorded official-page fixtures: Resolve AI, Shopify and Vercel each finish well under 3 minutes, produce at least 90% receipted attempted factual claims and can be explicitly approved.
- [x] Update README, status and traceability documents, run the production audit and scan tracked/untracked project files for credentials before publishing.
- [x] Mark the local, paid-provider-off Stage 2 implementation complete. Do not begin Stage 3 in this increment.

## Owner-deferred paid acceptance

These are deliberate owner decisions, not unfinished code. They stay outside the completed local checklist until the owner separately changes the paid-off instruction:

- Agree an OpenAI dollar/request limit and live-test allowance.
- Add and verify the owner's own OpenAI account, billing and key privately.
- Enable OpenAI and run the Implementation Plan's formal real-key three-company DoD. That live paid-provider result is not claimed here.
- After that approval, observe one real monthly automatic refresh. The coordinator is implemented but intentionally dormant now.

## Provider reference

| Service | Purpose now | Cost / decision |
| --- | --- | --- |
| Serper | Find the official company and supporting public pages | Advertises 2,500 free queries; paid Starter top-up is $50 for 50,000 queries before tax, credits valid 6 months. Use trial first; no top-up approved. |
| OpenAI API | Draft structured facts and targeting from evidence | GPT-4o mini selected to match the reference project. Usage-based paid API; calls remain disabled with a zero limit. Example pricing lists $0.15/million input tokens and $0.60/million output tokens; no quality acceptance implied. |
| Existing public-page collector | Fetch and save permitted public evidence | No additional scraping-provider subscription needed for the planned implementation. |

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
