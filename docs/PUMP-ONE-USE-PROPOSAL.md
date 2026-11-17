# Pump one-use research and discovery plan

Date: November 16, 2026. Owner supplied identity: Pump, pump.co, YC S22. This identity has not been checked online. No Pump page, search, model call or company API has been requested. No workspace/profile was created or approved. Hold README/Phase3 close-out until after this proposed verification.

## Part A — first-party seller research and playbook

Authorized once by the owner on November 17, 2026, after the offline changes pass tests and are pushed.

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

- **Serper max 40 total.** Prioritize current funding announcements, DevOps/platform/cloud infrastructure hiring, and evidence that an AI startup is scaling cloud infrastructure. Use the approved Pump playbook’s terms and freshness windows. Verify ATS posts at the source and verify dated funding and expansion announcements against original reporting before using them for timing. News-based candidate discovery and verification need a recorded-response test before this run.
- **Up to 25 companies.** Verify operating-company identity, dedupe by domain, exclude the seller, customers, competitors and retained kills, and retain rejected candidates with reasons and receipts.
- **Free collectors max 150 HTTP requests**, including redirects and robots. Respect per-source and persisted budgets.
- **Apollo organizations/enrich max 10 API attempts**, no company search and no paid plan upgrade. Use enrichment only for verified domains and display estimates as estimates. Any required Apollo robots check comes from the free HTTP allowance.
- **At most 25 copy-only templates** for Act now, subject to the existing validation gates. Zero OpenAI. Existing scoring, tiering, kills and Act now eligibility apply.
- Restore providers disabled/zero and report counts, receipts, attempts, credits, rejections and errors. No contact lookup or sending. The exhausted Vercel company-search batch will not be retried.
