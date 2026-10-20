# Stage 2.5 — research quality offline checkpoint

**Status: paused and superseded by port mode on October 20, 2026.** The verified extractor, independent fixtures and focused-drafting design remain in the repository as a future research-quality improvement. Do not continue the Stage 2.5 plan or run its proposed paid experiment unless the owner explicitly revives it.

Updated October 20, 2026. This checkpoint improved the research fields that the later kill engine would have depended on. It did not approve a profile, make a paid generation call, fetch a page, query Serper or start Stage 3.

## What changed

- `scripts/onboarding/extract-organizations.cjs` deterministically extracts customer candidates from saved customer-story URLs, page titles, headings and logo alt text, and competitor candidates from saved comparison/versus pages.
- Customer domains come only from outbound links saved in that customer or case-study page. If no matching outbound link exists, the domain is blank and the candidate is marked `domain_missing`; names are never converted into guessed domains.
- A candidate with a saved receipt is marked `confirmed_candidate`. A URL/title/logo result without a saved receipt remains `uncertain_candidate`, not a seller-profile fact.
- Drafting is separated into focused seller-facts, organization-review and ICP-targeting requests. Organization review may keep or drop deterministic candidate IDs but cannot invent or rename a company. The frozen Resolve profile is provided only to the targeting call as a worked example of specific personas and buyer-oriented searches.
- Per-purpose model settings were added, but defaults remain `gpt-4o-mini`. No stronger model is enabled without a separate owner authorization.

## Independent proposed answer keys

The three `tests/fixtures/eval/*-expected.json` files were written by manually reading the saved first-party page URL, title, text and raw outbound anchors. The extractor was not run or reused to create them. Every entry records how it was found, an exact saved quote and a saved source URL, and remains `labeledBy: "unconfirmed"` until the owner reviews it. A separate direct-source check found every proposed URL and quote in the saved source records/raw pages.

Confirmed-only evaluation therefore reports `0/0` today. The provisional numbers below include unconfirmed proposals only to show whether the harness and extractor can be compared before owner labeling; they are not a pass result.

| Seller | Extracted customers | Customer candidates with domain | Extracted competitors | Provisional customer recall | Provisional competitor recall |
| --- | ---: | ---: | ---: | ---: | ---: |
| Resolve AI | 7 confirmed, 0 uncertain | 2/7 | 2 | 7/7 | 2/2 |
| Shopify | 18 confirmed, 33 uncertain | 3/51 | 2 | 3/3 | 2/2 |
| Vercel | 13 confirmed, 1 uncertain | 2/14 | 3 | 3/3 | 3/3 |

### Extracted organizations

- **Resolve AI customers:** Blueground (`domain_missing`), Coinbase (`domain_missing`), DoorDash (`domain_missing`), Gametime (`gametime.co`), Global NoSQL (`domain_missing`), Salesforce (`salesforce.com`), Zscaler (`domain_missing`). Competitors: incident.io (`incident.io`) and PagerDuty (`pagerduty.com`).
- **Shopify customers:** 51 case-study candidates are preserved from the saved case-study index and three saved individual stories. The independent key currently proposes Diane Von Furstenberg (`dvf.com`), Maggy London (`maggylondon.com`) and Anián (`anianmfg.com`); these three are all extracted. The remaining candidate domains are blank because no matching outbound company link was present in the saved page. Competitors: BigCommerce (`bigcommerce.com`) and WooCommerce (`domain_missing`).
- **Vercel customers:** Avalara, Code And Theory, Fern, Klaviyo, Notion Workers Vercel Sandbox, Openevidence, Ramp, Rogo (`rogo.ai`), Searchable, Sensay (`sensay.io`), Shopify And Vercel, Stably, Stripe and The Weather Company. All except Rogo and Sensay are `domain_missing`; the Notion entry is uncertain. Competitors: Cloudflare, Netlify and Webflow, all with blank domains because no canonical outbound company link was saved.

## Raw HTML status

Raw HTML is available, so logo-alt and outbound-link extraction ran without a refetch. It matched 12/15 Resolve AI, 9/14 Shopify and 8/14 Vercel first-party source records. The relevant saved customer indexes, individual stories and competitor comparison pages used by this evaluation have raw HTML where needed.

The unmatched records are ordinary seller/product/pricing sources: Resolve homepage, product deep dive and AI SRE; Shopify homepage, customer accounts, retail customer experience, pricing blog and custom-platform comparison; Vercel homepage, three solution pages, Pro-pricing blog and pricing documentation. Logo-alt or outbound-link evidence from those exact pages would require a future refetch. No refetch occurred here.

## Evaluation harness

`scripts/onboarding/research-quality-eval.cjs` scores customer recall, competitor recall, buyer-title match, champion-title match, size sanity and blocking-warning count. It ignores unconfirmed expectations by default. `scripts/stage2-5-offline-eval.cjs` loads only the saved final-run state/pages and reports both the honest confirmed-only result and a clearly marked provisional result.

The new tests cover URL/title, logo-alt and comparison extraction; proven and missing domains; raw-HTML absence; independent unconfirmed keys; confirmed-only filtering; persona, size and warning scoring; focused prompt boundaries; no-invention organization review; per-purpose model routing; and Structured Outputs limits for all three focused schemas. The full offline suite passes: 27 test files, 125 active tests passed and one existing Stage 3 scaffold test intentionally skipped (126 total).

## Model proposal and free verification

The proposed stronger model for organization review and ICP targeting is the pinned `gpt-5.4-mini-2026-03-17`; seller facts remain on `gpt-4o-mini`. A read-only authenticated `GET /v1/models` returned HTTP 200 and listed that exact model ID for the configured API key. This was not a generation request and produced no model tokens. OpenAI's official model page states that GPT-5.4 mini supports Structured Outputs and lists $0.75 per million input tokens and $4.50 per million output tokens.

Using the actual focused request bodies and conservative maximum output reservations, the estimated ceiling is $0.060889 for Resolve AI, $0.064908 for Shopify and $0.054006 for Vercel ($0.179803 total). These are deliberately conservative maximums, not charges or a run proposal. The old $0.04 total cap would be exceeded, so any paid experiment needs a separately approved model/call/cap decision. Normal settings remain `OPENAI_ENABLED=false` and `OPENAI_MONTHLY_LIMIT_USD=0`.

## Checkpoint boundary

No provider generated content, no source was fetched, no Serper query ran, no seller profile was edited or approved, and Stage 3 did not start.
