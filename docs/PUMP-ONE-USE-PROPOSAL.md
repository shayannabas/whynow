# Pump one-use proposal — not authorized, not run

Date: November 16, 2026. Owner supplied identity: Pump, pump.co, YC S22. This identity has not been checked online. No Pump page, search, model call or company API has been requested. No workspace/profile was created or approved. Hold README/Phase3 close-out until after this proposed verification.

## Part A — first-party seller research and playbook

- First-party domains under pump.co only, using homepage/sitemap links and prioritized customer/case-study, comparison, pricing and about pages. No external YC lookup or search engine.
- **Maximum20 content HTTP requests,2 sitemap requests and3 robots requests:25 total.** Redirects count toward these ceilings. Respect robots and private-address/redirect/size/pacing guards. Missing or disallowed pages remain missing; never bypass.
- **Serper0, Apollo0** during research.
- Deterministic customer/competitor extraction preserves exact saved receipts and domain provenance. Unknown domains remain blank/suggested, never guessed or auto-confirmed.
- **Exactly3 focused GPT-5.5 calls**, low reasoning, max8000 output tokens each, no retries: seller facts; organization-candidate review; ICP targeting plus playbook. The third call includes the playbook, so there is no redundant fourth generation.
- Preflight each serialized request at **at most40000 estimated input tokens** (using the existing conservative bytes/token estimator), total maximum24000 output tokens. If the real saved packet or request exceeds the bounds, stop before any generation rather than trim away evidence silently.
- Configured GPT-5.5 rates: $5 per million uncached input tokens and $30 per million output tokens. At the limits:3 × ($0.20 input + $0.24 output) = **$1.32 conservative maximum**. Propose **$1.35 process-only cap**. This is a bounded estimate, not a quote from unread Pump pages or a new pricing/API check; actual returned usage may cost less.
- Save seller profile and playbook needs_review, then **STOP for owner review/confirmation/approval**. No automatic approvals. Restore providers disabled/zero; .env unchanged.

## Part B — separate one-use pipeline after approval and owner OK

This cannot execute in the research batch before human approval. Use a distinct durable one-use marker and approved customer domains from Pump's actual reviewed research; no invented seed companies or domains.

- **Apollo max5 API attempts:** up to4 customer lookups to obtain3 usable profiles, then1 company search, one page/per_page25. No retries. A200 not-found is recorded and proceeds to the next approved confirmed seed; any HTTP error/refusal/paid usage stops. Corrected primary domains are suggestions only. One Apollo robots network check at most if a fresh copy is unavailable.
- **At most25 candidates**, customer/competitor/seller/retained-kill exclusions and domain dedupe; retain rejections with reasons and estimated Apollo receipts.
- Timing uses **Pump's approved playbook**, never Resolve/Vercel constants or unapproved fallback. **Serper max30 shared queries** (up to25 initial +5 follow-ups), no retries.
- Free collector caps identical to the Vercel proposal: Greenhouse20, Lever20, Ashby20, HN40, board/receipt pages20, collector robots30: **150 maximum**, with persisted/day limits possibly lower. Disable any source not supported by the approved playbook or outside this allowance. Never count a source without an event collector.
- Existing scorecard/tiering/kills/Act now rules remain; no new fit gate. **Maximum25 deterministic copy-only Demo templates** for actual Act now results, all existing validation gates. **OpenAI0** in discovery/timing/drafting. Blocked templates are reported, never silently rewritten or sent.
- No people/contact endpoint, sending, paid upgrade, deployment, GDELT, SEC, Wikidata or unapproved extra research.
- Restore all child-process provider switches/caps disabled/zero, .env unchanged, keep port3000 running disabled. Report attempts/credits/queries, ranked counts, receipts, kills, draft blocks and errors; never repeat a consumed run.

## Combined proposed ceiling

**3 OpenAI calls / $1.35 cap ($1.32 conservative maximum),5 Apollo attempts,30 Serper queries,25 research fetches +150 collector fetches +1 Apollo robots check,25 company candidates,25 template drafts.** The two parts have an explicit owner-review stop between them and separate one-use markers. No credit purchase or plan upgrade. Apollo/Serper dollar costs are not guessed from unverified account entitlements; only approved free-plan/query allowances apply.

Proposal only. No execution is authorized by this document.
