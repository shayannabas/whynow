# Pump one-use research and discovery plan

Date: November 16, 2026. Owner supplied identity: Pump, pump.co, YC S22. Part A saved first-party evidence and stopped before generation. Part B remains proposal-only. Hold README/Phase3 close-out until after this proposed verification.

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

## Part B — separate one-use pipeline after approval and owner OK

Proposal only. Requires the saved seller profile, the saved playbook and separate owner authorization. Use a distinct durable one-use marker.

- **Serper max 40 total.** Prioritize current funding announcements, DevOps/platform/cloud infrastructure hiring, and evidence that an AI startup is scaling cloud infrastructure. Use the approved Pump playbook’s terms and freshness windows. Verify ATS posts at the source and verify dated funding and expansion announcements against original reporting before using them for timing. News-based candidate discovery and publication-date verification are covered by recorded-response tests.
- **Up to 25 companies.** Verify operating-company identity, dedupe by domain, exclude the seller, customers, competitors and retained kills, and retain rejected candidates with reasons and receipts.
- **Free collectors max 150 HTTP requests**, including redirects and robots. Respect per-source and persisted budgets.
- **Apollo organizations/enrich max 10 API attempts**, no company search and no paid plan upgrade. Use enrichment only for verified domains and display estimates as estimates. Any required Apollo robots check comes from the free HTTP allowance.
- **At most 25 copy-only templates** for Act now, subject to the existing validation gates. Zero OpenAI. Existing scoring, tiering, kills and Act now eligibility apply.
- Restore providers disabled/zero and report counts, receipts, attempts, credits, rejections and errors. No contact lookup or sending. The exhausted Vercel company-search batch will not be retried.
