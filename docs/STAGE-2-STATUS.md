# Stage 2 — complete, including bounded real-key acceptance

Updated October 13, 2026 against Implementation Plan v4 and PRD v4.

| Requirement | Current status |
| --- | --- |
| Company name only, up to five matches, explicit company choice | Implemented and offline HTTP-tested with Vercel. No domain is guessed or auto-selected. |
| Serper integration and cost controls | Implemented behind explicit enablement, private key presence, a hard four-query run ceiling, a persisted 50-query monthly setting and a hard twenty-page ceiling. Key presence was verified without displaying it. The live Vercel run used four Serper searches under those caps; this document does not infer the provider account's current balance. |
| Background public-page research | Implemented with persistent run/revision state, restart support, duplicate-job protection, homepage/sitemap link discovery, same-domain URLs, seller-tied allowlisted Greenhouse/Lever/Ashby and EDGAR pages, robots/DNS/redirect/size controls, visible progress events, partial failures and saved source metadata. The live Vercel run saved twenty official-domain pages with zero page errors in about forty seconds. |
| Source-only seller profile and ICP synthesis | Implemented with a bounded menu of server-created receipt snippets, a strict JSON schema constrained to valid receipt IDs, server-derived URLs and exact quotes, unsupported customer/competitor removal, receipt coverage and stale-output guards. Approval-critical category, product and target-industry fields must be receipt-backed. |
| Human review and approval | Implemented. Generated and manual profiles enter `needs_review`; approval is explicit, remains Demo-only and edits invalidate approval. Every generated segment, example target, signal definition, rubric, source preference and messaging guideline is visible and editable before approval. |
| Resolve reference and real seller fixtures | Implemented. The friend's Resolve configuration is frozen and load-only. Official-page excerpt fixtures cover Resolve AI, Vercel and Shopify without live test calls. |
| Monthly refresh | A persistent coordinator now detects due approved profiles, runs research and drafting inside a hidden isolated workspace, resumes interrupted runs, creates semantic/evidence diffs and never auto-applies them. Complete factual-field grounding, stale checks, approve/reject UI and bounded history are enforced. It stays dormant while OpenAI is off. |
| Tests | 93 tests pass across 18 files. Tests use injected recorded responses/local servers and never call Serper or OpenAI. |
| Browser verification | The real Vercel result showed the confirmed company, completed identification/research, twenty saved sources and the honest paid-AI-off message at desktop and 768-pixel widths. Isolated browser fixtures also showed the complete editable generated-review screen, 100% receipt report and monthly before/after approval screen at desktop and 768-pixel widths. |
| Three-seller acceptance | Both acceptances pass for Resolve AI, Shopify and Vercel. Recorded fixtures remain no-cost. In the owner-authorized real-key run, all three current-code drafts reached 100% receipt coverage with zero grounding warnings/rejected organizations and were explicitly approved. Uncached research observations were 63.9, 46.4 and 123.0 seconds respectively, all below three minutes. The final run reused this test's real-page cache for Resolve AI and Shopify and crawled Vercel uncached. |

## Normal provider state and deferred follow-up

The paid test used a temporary $0.05 WhyNow process ceiling beneath the owner's $1 OpenAI platform limit. The final three calls reserved $0.028775 conservatively and reported enough tokens for an estimated $0.007714 model cost. Earlier diagnostics are excluded from that estimate. After testing, the normal ignored `.env` was verified at `OPENAI_ENABLED=false` and `OPENAI_MONTHLY_LIMIT_USD=0`; a key alone can never enable calls. A real monthly automatic refresh remains deferred until the owner authorizes another paid run.

Stage 3 has not started. Running locally avoids hosting fees, not provider usage: Serper consumes search credits and OpenAI is usage-billed.
