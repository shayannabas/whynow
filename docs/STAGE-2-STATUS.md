# Stage 2 — research path live; paid drafting acceptance pending

Updated September 17, 2026 against Implementation Plan v4 and PRD v4.

| Requirement | Current status |
| --- | --- |
| Company name only, up to five matches, explicit company choice | Implemented and offline HTTP-tested with Vercel. No domain is guessed or auto-selected. |
| Serper integration and cost controls | Implemented behind explicit enablement, private key presence, a hard four-query run ceiling, a persisted 50-query monthly setting and a hard twenty-page ceiling. Key presence was verified without displaying it. The live Vercel run used four Serper searches, so 46 of the locally configured 50-query monthly allowance remain. |
| Background public-page research | Implemented with persistent run/revision state, restart support, duplicate-job protection, same-domain URLs, robots/DNS/redirect/size controls, partial failures and saved source metadata. The live Vercel run saved twenty official-domain pages with zero page errors in about forty seconds. |
| Source-only seller profile and ICP synthesis | Implemented with bounded excerpts, strict JSON schema, server-derived URLs, exact-quote checks, unsupported customer/competitor removal, attempted-claim receipt coverage and stale-output guards. |
| Human review and approval | Implemented. Generated and manual profiles enter `needs_review`; approval is explicit, remains Demo-only and edits invalidate approval. Every generated segment, example target, signal definition, rubric, source preference and messaging guideline is visible and editable before approval. |
| Resolve reference and real seller fixtures | Implemented. The friend's Resolve configuration is frozen and load-only. Official-page excerpt fixtures cover Resolve AI, Vercel and Shopify without live test calls. |
| Monthly refresh | Reviewable proposal storage, semantic/evidence diffs, stale checks, complete factual-field grounding recheck, approve/reject UI and bounded history are implemented. Missing or mismatched evidence is rejected; explicitly inferred manual facts remain reviewable. Automatic monthly collection/drafting is not active while OpenAI is off. |
| Tests | 84 tests pass on Node 22 across 16 files. Tests use injected responses/local servers and never call Serper or OpenAI. |
| Browser verification | The real Vercel result visibly showed the confirmed company, completed identification/research, twenty saved sources and the honest paid-AI-off message at desktop and 768-pixel widths. |
| Live three-seller acceptance | Not run. Serper is ready, but receipt coverage for generated profiles requires paid OpenAI drafting, which the owner has explicitly kept off. |

## What remains before Stage 2 can be called complete

1. Separately decide whether to enable paid OpenAI with the owner's own key and explicit dollar/request limits. A key alone must never enable it.
2. If approved, browser-check generated profile editing and review, then run Resolve AI, Vercel and Shopify end to end in under three minutes each and verify at least 90% of attempted factual claims have matched receipts.
3. Activate and verify the monthly collection/drafting runner only after the same paid-provider decision.

The bounded research milestone is published at `349d6ac`, and its GitHub tests, production dependency audit and full-history secret scan passed.

Stage 3 has not started. Running locally avoids hosting fees, not provider usage: Serper consumes search credits and OpenAI is usage-billed.
