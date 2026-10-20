# Stage 2 final automated rerun

Run once on October 19, 2026. This was the last automated Stage 2 iteration that included page research. A later saved-pages-only draft attempt is recorded below. Stage 3 was not started and no profile was approved.

## Execution controls

- 29 explicitly allowlisted first-party page fetches: 12 Resolve AI, 9 Shopify and 8 Vercel.
- 29 pages fetched successfully; zero page errors.
- Zero Serper queries.
- Exactly three logical GPT-4o mini calls and three provider attempts; no retry was used.
- Actual token-reported cost: **$0.007646** under the temporary process-only **$0.05** cap.
- The normal ignored `.env` was never changed. Post-run verification confirmed `OPENAI_ENABLED=false` and `OPENAI_MONTHLY_LIMIT_USD=0`.
- All three results were persisted through the normal state path and remain `needs_review`.

## Pass-bar results

| Seller | First-party customers | Sourced competitors | Size metric | Target-size match | Buyer titles | Champion titles | Blocking | Advisory | Result |
| --- | ---: | ---: | --- | --- | --- | --- | ---: | ---: | --- |
| Resolve AI | 2 — Coinbase, DoorDash | 0 | Employees, floor 1,000 | Yes — target is 1,000+ employees | CTO; Head of Engineering; IT Operations Manager | Site Reliability Engineer; DevOps Engineer; Product Manager | 8 | 4 | Fails customer, competitor and zero-blocking bars |
| Shopify | 0 | 0 | Employee Count, floor 50 | Yes — compatible with “small to large enterprises” | Chief Marketing Officer; E-commerce Manager; Retail Operations Director | Store Manager; Digital Marketing Specialist; Product Manager | 25 | 1 | Fails customer, competitor and zero-blocking bars |
| Vercel | 0 | 0 | employees, floor 100 | Yes — compatible with “mid-sized to large enterprises” | CTO; VP of Engineering; Head of DevOps; Product Manager | Software Engineer; Platform Engineer; DevOps Engineer; Technical Architect | 16 | 5 | Fails customer, competitor and zero-blocking bars |

The warning totals are computed from the persisted final drafts, not copied from the older recovery snapshots. Common remaining blockers are vendor-seeking segment queries, empty competitors, weak claim/receipt overlap and—on Shopify and Vercel—empty customers.

## Evidence-packet root cause and offline fix

The zero/low customer and competitor output was traced to the evidence packet, not to missing saved research. The old implementation capped the complete menu at 24,000 bytes, divided excerpt room evenly across as many as 20 sources and read from the beginning of each page. Resolve AI and Shopify filled almost the entire cap. The model therefore received many header, navigation and hero fragments while deeper customer and comparison evidence was omitted.

No page was fetched and no Serper or OpenAI call was made for this audit. The same saved final-run sources were rebuilt twice: once with the old algorithm, then with the corrected algorithm.

The correction raises the hard packet ceiling to 120,000 bytes; weights customer/case-study and comparison pages highest, then pricing, then about/enterprise pages; ranks usable sentences for customer, comparison, organization-name, pricing and company-size language; and continues to remove navigation-heavy snippets. Existing grounding, partner-source and quote-quality rules are unchanged.

### Packet totals

| Seller | Before | Receipts before | After | Receipts after | Within new ceiling |
| --- | ---: | ---: | ---: | ---: | --- |
| Resolve AI | 23,842 bytes | 101 | 119,824 bytes | 548 | Yes |
| Shopify | 23,949 bytes | 122 | 119,852 bytes | 605 | Yes |
| Vercel | 17,084 bytes | 74 | 93,160 bytes | 489 | Yes |

### Receipts per saved source — before → after

| Seller | Saved source | Receipts |
| --- | --- | ---: |
| Resolve AI | `/customers` | 7 → 29 |
| Resolve AI | `/customers/blueground` | 7 → 46 |
| Resolve AI | `/customers/coinbase` | 7 → 46 |
| Resolve AI | `/customers/doordash` | 7 → 46 |
| Resolve AI | `/customers/gametime` | 6 → 46 |
| Resolve AI | `/customers/global-nosql` | 7 → 46 |
| Resolve AI | `/customers/salesforce` | 7 → 45 |
| Resolve AI | `/customers/zscaler` | 6 → 45 |
| Resolve AI | `/glossary/pagerduty-sre-agent-vs-resolve-ai` | 7 → 46 |
| Resolve AI | `/glossary/incident-io-vs-resolve-ai` | 6 → 45 |
| Resolve AI | `/pricing` | 7 → 24 |
| Resolve AI | `/about-us` | 7 → 34 |
| Resolve AI | `/` | 7 → 15 |
| Resolve AI | `/product/ai-sre` | 7 → 17 |
| Resolve AI | `/blog/product-deep-dive` | 6 → 18 |
| Shopify | `/case-studies` | 9 → 50 |
| Shopify | `/case-studies/diane-von-furstenberg` | 9 → 50 |
| Shopify | `/case-studies/maggy-london` | 9 → 49 |
| Shopify | `/blog/case-study-anian` | 9 → 50 |
| Shopify | `/compare/shopify-vs-bigcommerce` | 9 → 50 |
| Shopify | `/compare/shopify-vs-woocommerce` | 8 → 49 |
| Shopify | `/compare/shopify-vs-custom-platform` | 9 → 50 |
| Shopify | `/pricing` | 9 → 49 |
| Shopify | `/about` | 9 → 45 |
| Shopify | `/enterprise` | 7 → 49 |
| Shopify | `/` | 9 → 33 |
| Shopify | `/pos/retail-customer-experience` | 9 → 25 |
| Shopify | `/customer-accounts` | 9 → 29 |
| Shopify | `/blog/how-to-price-your-product` | 8 → 27 |
| Vercel | `/customers` | 7 → 21 |
| Vercel | `/customers/how-rogo-…` | 4 → 12 |
| Vercel | `/customers/how-the-weather-company-…` | 4 → 10 |
| Vercel | `/customers/how-sensay-…` | 5 → 72 |
| Vercel | `domains.vercel.com/kb/comparisons` | 5 → 31 |
| Vercel | `/pricing` | 6 → 63 |
| Vercel | `/docs/pricing` | 5 → 62 |
| Vercel | `/about` | 5 → 15 |
| Vercel | `/enterprise` | 3 → 47 |
| Vercel | `/solutions/multi-tenant-saas` | 6 → 36 |
| Vercel | `/solutions/platform-engineering` | 8 → 41 |
| Vercel | `/solutions/design-engineering` | 7 → 37 |
| Vercel | `/` | 5 → 16 |
| Vercel | `/blog/new-pro-pricing-plan` | 4 → 26 |

### Named customer and comparison evidence

This check searches receipt text for the principal organization named by each saved individual story/comparison page. For large index pages, it checks representative names actually present in the saved text; it does not claim coverage of every listing on Shopify's 615-case-study index.

| Saved source | Names checked | Before | After |
| --- | --- | --- | --- |
| Resolve `/customers` | Coinbase, DoorDash, Salesforce, Zscaler | 4/4 | 4/4 |
| Resolve `/customers` | Blueground, Gametime, Global NoSQL | not present in saved source | not present in saved source |
| Resolve individual stories | Blueground, Coinbase, DoorDash, Gametime, Global NoSQL, Salesforce, Zscaler | 2/7 | 7/7 |
| Resolve comparison pages | PagerDuty, incident.io | 0/2 | 2/2 |
| Shopify `/case-studies` | Yoggies | 1/1 | 1/1 |
| Shopify `/case-studies` | Diane Von Furstenberg, Maggy London, Anián | not present in saved source | not present in saved source |
| Shopify individual stories | Diane Von Furstenberg, Maggy London, Anián | 2/3 | 3/3 |
| Shopify comparison pages | BigCommerce, WooCommerce, custom platform | 0/3 | 3/3 |
| Vercel customer index | Rogo, The Weather Company, Sensay | 2/3 | 3/3 |
| Vercel individual stories | Rogo, The Weather Company, Sensay | 2/3 | 3/3 |
| Vercel comparison index | Cloudflare, Netlify, Webflow Cloud, Kubernetes, Render | 1/5 | 5/5 |

Offline tests use saved-page excerpts plus a synthetic 20-source stress case. They prove priority weighting, deep customer/competitor-name inclusion, navigation exclusion and the 120,000-byte hard limit. The complete suite passes: 22 files, 112 passed tests and one intentionally skipped Stage 3 scaffold test (113 total). This is an offline checkpoint only. A draft-only GPT-4o mini rerun against these already-saved pages requires a separate owner OK; it will make no fetch or Serper call and will not approve any profile.

## Authorized saved-pages packet redraft attempt

On October 19, the owner authorized one GPT-4o mini drafting call per seller against the already-saved final-run pages and fixed evidence packet from commit `68774af`. The authorization allowed no page fetches or Serper queries, the existing single transient retry only, a temporary process-only $0.05 cap, no automatic approval, and an immediate return to disabled/zero normal OpenAI settings.

The executable preflight used each complete serialized request, including prompt and receipt-ID schema, with a conservative estimate of one input token per three UTF-8 request bytes plus fixed overhead:

| Seller | Packet bytes | Request bytes | Estimated input tokens | Estimated input cost | Maximum estimated call cost |
| --- | ---: | ---: | ---: | ---: | ---: |
| Resolve AI | 119,824 | 171,685 | 57,911 | $0.008687 | $0.011145 |
| Shopify | 119,852 | 175,534 | 59,194 | $0.008879 | $0.011337 |
| Vercel | 93,160 | 141,203 | 47,751 | $0.007163 | $0.009621 |
| **Total** | **332,836** | **488,422** | **164,856** | **$0.024729** | **$0.032103** |

The $0.032103 maximum estimate was below both the owner's $0.04 stop threshold and the temporary $0.05 process cap. The old 48 KB client request guard was raised to a bounded 360 KB guard, and cost reservation now uses the same conservative three-bytes-per-token estimate. Offline tests cover the larger request range and spending reservation.

The run then stopped on the first seller. Resolve AI made one provider attempt and persisted the safe `REQUEST_FAILED` status in the isolated working state. No transient retry condition was triggered. Shopify and Vercel made zero provider attempts. The safe client intentionally discarded the provider response body, so no unsupported diagnosis is claimed and actual token usage/cost is unavailable. No generated profile or new snapshot was produced, and the main acceptance state was never overwritten.

Post-attempt checks confirmed `OPENAI_ENABLED=false` and `OPENAI_MONTHLY_LIMIT_USD=0`. No page fetch, Serper query, approval or Stage 3 work occurred. The previous three profiles remain unchanged in `needs_review`; another provider attempt requires a new explicit owner authorization.

## Structured Outputs schema-limit diagnosis and offline fix

The stopped request was rebuilt offline from the same saved pages. The diagnosis is confirmed at the request-schema level: the old schema defined the same stable receipt IDs twice, once in `$defs.receiptId` and again in `$defs.requiredReceiptId`. Resolve AI therefore sent 1,097 enum values and Shopify 1,211, above OpenAI's documented 1,000-value total limit. Shopify's larger enum also contained 15,730 characters, above the documented 15,000-character limit for a string enum with more than 250 values. Vercel was never called and its old schema was within those two limits.

The failed attempt did not retain an HTTP status code. Its isolated state contains only the safe code `REQUEST_FAILED` and generic message. Provider bodies were intentionally discarded. Future `REQUEST_FAILED` records now retain and display the numeric HTTP status only, never the response body.

The fix uses deterministic, request-local IDs (`R001`, `R002`, and so on) in the evidence menu and one shared receipt enum. Optional receipt fields use an empty-string `const` or the shared enum; required fields reference the same enum without copying it. After local validation, the server maps selected short IDs back to the original stable IDs before the unchanged receipt grounding, source and quote-quality checks run. A 900-receipt ceiling is a future-safe backstop below the 1,000-enum limit. Because the saved evidence sources are already priority ordered, the cap retains customer/case-study and comparison-page receipts before generic-page receipts.

| Seller | Old enum definitions | Old enum values | Old enum characters | Largest old enum | New enum definitions | New enum values | New enum characters | Properties | Nesting | Total schema strings, before → after |
| --- | ---: | ---: | ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Resolve AI | 2 | 1,097 | 28,496 | 549 values / 14,248 chars | 1 | 548 | 2,192 | 132 | 7 | 29,764 → 3,443 |
| Shopify | 2 | 1,211 | 31,460 | 606 values / 15,730 chars | 1 | 605 | 2,420 | 132 | 7 | 32,728 → 3,671 |
| Vercel | 2 | 979 | 25,428 | 490 values / 12,714 chars | 1 | 489 | 1,956 | 132 | 7 | 26,696 → 3,207 |

The receipt count did not change. Short IDs reduced the serialized packet sizes to 107,768 bytes for Resolve AI, 106,542 for Shopify and 82,402 for Vercel without removing any receipt from these three packets. A committed public-data manifest records the packet hashes, source-set hashes, counts and exact post-fix schema metrics. Offline tests build the production schema for every captured packet and assert the current documented ceilings: 1,000 total enum values, 15,000 characters for a string enum over 250 values, 5,000 object properties, 10 nesting levels and 120,000 total schema-string characters. A separate test proves the 900-receipt priority cap and synthesis tests prove the short-to-stable server mapping. Full verification passed: 23 test files, 116 tests passed and one intentionally skipped Stage 3 scaffold test (117 total).

### Current pass-bar state after the stopped attempt

| Seller | Customers with first-party sources | Competitors with sources | Size metric and target match | Buyer titles | Champion titles | Blocking / advisory | Top blocking reasons |
| --- | --- | --- | --- | --- | --- | ---: | --- |
| Resolve AI | 2 — Coinbase, DoorDash | 0 | Employees, floor 1,000; matches “1,000+ employees” | CTO; Head of Engineering; IT Operations Manager | Site Reliability Engineer; DevOps Engineer; Product Manager | 8 / 4 | vendor-seeking queries (5); weak claim/receipt overlap (2); empty competitors (1) |
| Shopify | 0 | 0 | Employee Count, floor 50; compatible with “small to large enterprises” | Chief Marketing Officer; E-commerce Manager; Retail Operations Director | Store Manager; Digital Marketing Specialist; Product Manager | 25 / 1 | vendor-seeking queries (21); weak claim/receipt overlap (2); empty customers (1); empty competitors (1) |
| Vercel | 0 | 0 | employees, floor 100; compatible with “mid-sized to large enterprises” | CTO; VP of Engineering; Head of DevOps; Product Manager | Software Engineer; Platform Engineer; DevOps Engineer; Technical Architect | 16 / 5 | vendor-seeking queries (10); weak claim/receipt overlap (4); empty customers (1); empty competitors (1) |

Final offline verification after recording the stopped attempt: 22 test files, 113 passed tests and one intentionally skipped Stage 3 scaffold test (114 total).

## Owner action

Do not begin manual fixes yet. The authorized saved-pages drafting attempt stopped before producing a new profile. Its schema-limit cause is fixed and verified offline, but no retry is authorized. The owner must decide the next action; no profile may be auto-approved, and normal OpenAI settings remain disabled/zero.
