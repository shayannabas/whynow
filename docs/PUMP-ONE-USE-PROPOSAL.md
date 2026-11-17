# Pump one-use research and discovery plan

Date: November 16, 2026. Owner supplied identity: Pump, pump.co, YC S22. Part A saved first-party evidence and stopped before generation. Part B has a separate bounded authorization below. Hold README/Phase3 close-out until after this proposed verification.

## Part A rerun — used and exhausted

[Saved rerun results](PUMP-PART-A-RERUN.md). The allowance ended after three calls and the profile and playbook were saved for review.

Reuse all 18 saved pages and spend at most 15 new first-party HTTP requests, respecting robots and counting redirects. Homepage, about, pricing, how-it-works, security and comparison pages take priority. The eight-story quota applies to new collection, with the saved stories retained for receipts. Up to five Serper queries are available solely for competitor leads. Saved first-party comparison links take precedence and every proposed competitor still needs a receipt and the owner's approval.

Make three focused GPT-5.5 calls with the same evidence prefix and response schema. Use low reasoning, an 8,000 output-token maximum, zero retries and a $1.35 process cap. The preflight targets 40,000 estimated input tokens per request and permits up to 50,000 when required receipts prevent further trimming. Save seller facts, ICP and playbook as needs_review. Record actual cost and cached input tokens, then restore providers disabled/zero.

## Original Part A — first-party seller research and playbook

Authorized once by the owner on November 17, 2026. The fetch allowance has been used. [Results and preflight](PUMP-PART-A-RESULTS.md) record the 18 saved pages and the zero-call stop.

- First-party domains under pump.co only, using homepage/sitemap links and prioritized customer/case-study, comparison, pricing and about pages. No external YC lookup or search engine.
- **Maximum20 content HTTP requests,2 sitemap requests and3 robots requests:25 total.** Redirects count toward these ceilings. Respect robots and private-address/redirect/size/pacing guards. Missing or disallowed pages remain missing; never bypass.
- **Serper0, Apollo0** during research.
- Deterministic customer/competitor extraction preserves exact saved receipts and domain provenance. Unknown domains remain blank/suggested, never guessed or auto-confirmed.
- **Exactly3 focused GPT-5.5 calls**, low reasoning, max8000 output tokens each, no retries: seller facts; organization-candidate review; ICP targeting plus playbook. The third call includes the playbook, so there is no redundant fourth generation.
- Preflight each serialized request at **at most40000 estimated input tokens** (using the existing conservative bytes/token estimator), total maximum24000 output tokens. If the real saved packet or request exceeds the bounds, stop before any generation rather than trim away evidence silently.
- Configured GPT-5.5 rates: $5 per million uncached input tokens and $30 per million output tokens. At the limits:3 × ($0.20 input + $0.24 output) = **$1.32 conservative maximum**. Propose **$1.35 process-only cap**. This is a bounded estimate, not a quote from unread Pump pages or a new pricing/API check; actual returned usage may cost less.
- Save seller profile and playbook needs_review, then **STOP for owner review/confirmation/approval**. No automatic approvals. Restore providers disabled/zero; .env unchanged.

## Part B — used and exhausted

[Results](PUMP-PART-B-RESULTS.md) record the first-HTTP-error stop and actual usage. The authorization below is historical.

The owner authorized one run on November 17, 2026 after both owner approvals persist. Verify the saved profile revision and playbook v6 with `node scripts/run-pump-part-b.cjs --verify`. The runner verifies the corresponding approval audit events before consuming the marker.

- Discover with the approved recent-funding, AI/GPU spend and migration news rules plus the approved DevOps/cloud hiring rule. Verify publication date and company identity before promotion. Up to **40 Serper queries**, **150 free HTTP requests** including robots and redirects, and **25 candidate checks**.
- Use up to **10 Apollo organizations/enrich attempts** for missing employee counts on promoted accounts. Keep the estimate and receipt. Company search and people endpoints are outside the authorization.
- Use the existing scorecard, tiering and kills. Save deterministic Demo drafts only for Act now. Zero OpenAI.
- The first HTTP error stops the entire batch. Robots HTTP errors count. Restore all providers to disabled with zero caps. Retain the existing approved profile, playbook, .env, active workspace and other saved state.


The separately authorized public-page resilience rerun is also consumed. See [the rerun results](PUMP-PART-B-RERUN.md). The stop-on-any-HTTP rule above applies to the original run.
