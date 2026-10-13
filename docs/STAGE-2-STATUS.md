# Stage 2 — local implementation complete; paid live acceptance deferred

Updated October 13, 2026 against Implementation Plan v4 and PRD v4.

| Requirement | Current status |
| --- | --- |
| Company name only, up to five matches, explicit company choice | Implemented and offline HTTP-tested with Vercel. No domain is guessed or auto-selected. |
| Serper integration and cost controls | Implemented behind explicit enablement, private key presence, a hard four-query run ceiling, a persisted 50-query monthly setting and a hard twenty-page ceiling. Key presence was verified without displaying it. The live Vercel run used four Serper searches under those caps; this document does not infer the provider account's current balance. |
| Background public-page research | Implemented with persistent run/revision state, restart support, duplicate-job protection, homepage/sitemap link discovery, same-domain URLs, seller-tied allowlisted Greenhouse/Lever/Ashby and EDGAR pages, robots/DNS/redirect/size controls, visible progress events, partial failures and saved source metadata. The live Vercel run saved twenty official-domain pages with zero page errors in about forty seconds. |
| Source-only seller profile and ICP synthesis | Implemented with bounded excerpts, strict JSON schema, server-derived URLs, exact-quote checks, unsupported customer/competitor removal, attempted-claim receipt coverage and stale-output guards. |
| Human review and approval | Implemented. Generated and manual profiles enter `needs_review`; approval is explicit, remains Demo-only and edits invalidate approval. Every generated segment, example target, signal definition, rubric, source preference and messaging guideline is visible and editable before approval. |
| Resolve reference and real seller fixtures | Implemented. The friend's Resolve configuration is frozen and load-only. Official-page excerpt fixtures cover Resolve AI, Vercel and Shopify without live test calls. |
| Monthly refresh | A persistent coordinator now detects due approved profiles, runs research and drafting inside a hidden isolated workspace, resumes interrupted runs, creates semantic/evidence diffs and never auto-applies them. Complete factual-field grounding, stale checks, approve/reject UI and bounded history are enforced. It stays dormant while OpenAI is off. |
| Tests | 93 tests pass across 18 files. Tests use injected recorded responses/local servers and never call Serper or OpenAI. |
| Browser verification | The real Vercel result showed the confirmed company, completed identification/research, twenty saved sources and the honest paid-AI-off message at desktop and 768-pixel widths. Isolated browser fixtures also showed the complete editable generated-review screen, 100% receipt report and monthly before/after approval screen at desktop and 768-pixel widths. |
| Three-seller acceptance | The no-cost recorded acceptance passes for Resolve AI, Shopify and Vercel: each completes well under three minutes, has at least 90% receipt coverage and can be human-approved. The Implementation Plan's separate real-key paid acceptance was not run because the owner explicitly kept OpenAI off. |

## Deliberately deferred by the owner

Stage 2's local implementation and no-cost acceptance are complete. The following external acceptance is not claimed: enabling the owner's own paid OpenAI account with an approved dollar/request cap, running all three sellers against real keys, and observing a real monthly automatic refresh. A key alone can never enable calls, and the coordinator stays dormant until both Serper and OpenAI are explicitly enabled with positive limits.

Stage 3 has not started. Running locally avoids hosting fees, not provider usage: Serper consumes search credits and OpenAI is usage-billed.
