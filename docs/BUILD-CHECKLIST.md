# WhyNow — build checklist

Updated: September 17, 2026. Current stage: 2 — seller onboarding.

This is the working checklist, updated as work is verified. Checked means completed, not merely planned. No live provider calls have been enabled for onboarding. Latest application verification: 41 tests passed and GitHub checks green (4585a94).

## Current decision

Owner chose OpenAI first, matching the friend's GPT-4o mini/direct HTTP setup, then explicitly requested that paid calls stay OFF. No spending is approved. Serper remains disabled. The OpenAI client is prepared and offline-tested, not activated or wired into automatic research. No key or billing setup is needed while paid calls remain off.

Do not paste API keys into chat. Store keys in the local ignored .env file, never in this checklist or GitHub. Provider credentials and billing have not been verified.

## Stage 2 — connect and finish

- [x] Company-name-only entry, including Vercel.
- [x] Honest results screen with no invented facts.
- [x] Manual company selection and profile/ideal-customer editing.
- [x] Saved-quote checks and explicit manual approval.
- [x] Workspace list, archive, restore and isolation.
- [x] Check current provider requirements and public pricing.
- [x] Choose OpenAI first and match the friend's default profile-parser model: gpt-4o-mini.
- [ ] Confirm and configure Serper separately.
- [ ] Agree spending limit and live-test allowance.
- [ ] User creates/opens provider accounts and configures billing as needed.
- [ ] Store Serper and OpenAI keys privately; verify presence without displaying them.
- [x] Implement the OpenAI enable switch (off by default), persistent conservative spending reservations and per-workspace request caps. A key alone does not enable calls.
- [ ] Connect name search and candidate confirmation to the main flow.
- [ ] Build bounded background research: discover public pages, respect robots, save sources, show progress, handle errors/restarts.
- [x] Implement and offline-test AI wrapper: strict structured output, one bounded transient-error retry, timeout, caching and safe error messages.
- [ ] Activate and verify the OpenAI connection only after the owner changes the paid-off decision, supplies their own key privately and approves a cap.
- [ ] Generate seller facts and ideal-customer proposals from collected excerpts only.
- [ ] Validate every factual field; reject unsupported customers and flag uncertainty.
- [ ] Connect generated results to editing and human approval.
- [ ] Add the original Resolve reference configuration without making it the default seller.
- [ ] Add genuine saved-page fixtures for Resolve AI and two unrelated sellers; document the reference comparison.
- [ ] Add monthly refresh proposals, visible differences and fresh approval.
- [ ] Pass offline tests, including hallucinated claims, stale results, budget exhaustion and cross-workspace isolation.
- [ ] Browser-check the complete manual and generated-review workflows.
- [ ] Run Vercel live after configuration and spending approval; do not claim researched facts beforehand.
- [ ] Pass three-seller acceptance: under 3 minutes each and at least 90% receipted fields, with human approval.
- [ ] Update traceability, publish verified changes and confirm GitHub checks.
- [ ] Mark Stage 2 complete; only then begin Stage 3.

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
