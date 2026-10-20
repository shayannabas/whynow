# Stage 2 offline quality audit

Updated October 19, 2026. This audit covers steps 1–4 and step 5 planning only. It uses the three immutable recovery snapshots and makes no project-provider calls. No profile was approved and Stage 3 was not started.

## Outcome

The earlier receipt-coverage result was insufficient: a quote could be an exact substring of a saved page while still being navigation text, unrelated to the claim, or about a partner instead of the seller. The same 9/23/27 findings now have two levels. Blocking findings require edits or explicit typed reasons; advisory findings remain visible beside fields and do not block approval.

| Snapshot | Blocking | Advisory | Total |
| --- | ---: | ---: | ---: |
| Resolve AI | 7 | 2 | 9 |
| Shopify | 18 | 5 | 23 |
| Vercel revision 1 | 23 | 4 | 27 |

These are blocking review warnings, not automatic rewrites. The generated values remain visible and editable.

## Rules proved offline

- Research prioritizes the homepage, sitemap, `/customers`, case studies, `/enterprise`, `/pricing`, comparison/alternatives pages and `/about` inside the existing 20-page ceiling. Partner, marketplace, template and solution-partner pages rank last.
- Seller facts cannot use partner, marketplace, template or solution-partner pages as evidence.
- Receipt candidates strip common header/footer/navigation chunks. Receipts are rejected when shorter than 24 characters, navigation-heavy, or lacking meaningful normalized terms from the claim. A rejected receipt is marked inferred rather than treated as grounded.
- The minimum-size label must describe a measurable unit such as employees, engineering headcount or revenue. An enterprise target with a very small floor is flagged as contradictory.
- Empty customers/competitors, missing buyer/champion personas, unmeasurable or contradictory size, vendor-seeking searches, pain/trigger-like kill rules, partner-page evidence and unusable evidence on core seller facts block approval.
- Slogan-like facts and weak/short evidence on value propositions, proof points, credentials and industries are advisory only.
- Every blocking warning can be accepted only with a typed 10–500 character reason. The approval audit event records the finding, field and reason. Reasons are blank by default and saving any edit creates a new revision that requires fresh reasons. Advisories never appear in that acknowledgment form.
- The drafting prompt now tells the model to avoid partner-page evidence, use measurable size units, target buyer-company searches, align personas with purchase/use roles and keep no-buy kill rules separate from pains and buying signals.

Every new rule has a synthetic passing case. Tests also use the real saved failures as negative cases, so the implementation is not a special-case list for Vercel.

## Detailed snapshot results

### Resolve AI — 7 blocking, 2 advisory

| Code | Field(s) | Count |
| --- | --- | ---: |
| `KILL_LOOKS_LIKE_BUYING_PAIN` | `icpConfig.killPatterns.buildCulture.1` | 1 |
| `SIZE_METRIC_UNMEASURABLE` | `icpConfig.killPatterns.sizeMetric.label` | 1 |
| `VENDOR_SEEKING_QUERY` | `segments.0.queryTemplates.1`, `segments.0.queryTemplates.2`, `segments.1.queryTemplates.1` | 3 |
| `EMPTY_COMPETITORS` | `sellerProfile.competitors` | 1 |
| `EMPTY_CUSTOMERS` | `sellerProfile.customers` | 1 |
| `RECEIPT_NO_CLAIM_OVERLAP` | `sellerProfile.evidence.targetIndustries.0`, `sellerProfile.evidence.valueProps.1` | 2 |

Possible correct-but-weak-evidence cases: the `Technology` industry and custom-agent value proposition may be factually reasonable, but the saved quotes do not share enough meaningful terms to support those claims. The checker flags the evidence relationship, not the truth of the text, so those warnings were retained.

### Shopify — 18 blocking, 5 advisory

| Code | Field(s) | Count |
| --- | --- | ---: |
| `KILL_LOOKS_LIKE_BUYING_PAIN` | `buildCulture.0`, `solvingInHouse.1` | 2 |
| `KILL_DUPLICATES_TRIGGER` | `solvingInHouse.0` | 1 |
| `SIZE_METRIC_UNMEASURABLE` | `sizeMetric.label` | 1 |
| `VENDOR_SEEKING_QUERY` | All four queries in segment 0; queries 0, 1 and 3 in segment 1; queries 1 and 3 in segment 2 | 9 |
| `EMPTY_COMPETITORS` | `sellerProfile.competitors` | 1 |
| `EMPTY_CUSTOMERS` | `sellerProfile.customers` | 1 |
| `RECEIPT_NAVIGATION_BOILERPLATE` | `category`, `pricingModel`, `productOneLiner`, `targetIndustries.0`, `targetIndustries.1`, `valueProps.0` | 6 |
| `RECEIPT_NO_CLAIM_OVERLAP` | `valueProps.2` | 1 |
| `SLOGAN_LIKE_FACT` | `productOneLiner` | 1 |

Possible correct-but-weak-evidence cases: `E-commerce Platform`, the Retail/E-commerce industries and a subscription model are broadly plausible Shopify facts, but their saved quotes contain navigation-heavy text or do not support the claimed detail. The saved product title is real but still reads like a slogan. “Building custom e-commerce solutions” could be a valid kill condition if a prospect is firmly committed to that strategy, but its overlap with buying pain remains a conservative review warning. None of these checks was loosened.

### Vercel revision 1 — 23 blocking, 4 advisory

| Code | Field(s) | Count |
| --- | --- | ---: |
| `KILL_LOOKS_LIKE_BUYING_PAIN` | `buildCulture.0`, `buildCulture.1`, `solvingInHouse.1` | 3 |
| `SIZE_FLOOR_CONTRADICTS_TARGET` | `sizeMetric.floor` (`10` against an Enterprise target) | 1 |
| `SIZE_METRIC_UNMEASURABLE` | `sizeMetric.label` (`Small to Medium Enterprises`) | 1 |
| `VENDOR_SEEKING_QUERY` | Queries 0, 2 and 3 in segment 0; all four in segment 1; queries 0, 1 and 3 in segment 2 | 10 |
| `EMPTY_COMPETITORS` | `sellerProfile.competitors` | 1 |
| `EMPTY_CUSTOMERS` | `sellerProfile.customers` | 1 |
| `RECEIPT_NAVIGATION_BOILERPLATE` | `category`, `pricingModel`, `targetIndustries.1` | 3 |
| `RECEIPT_PARTNER_SOURCE` | `credentials.0`, `targetIndustries.0` | 2 |
| `RECEIPT_QUOTE_TOO_SHORT` | `productOneLiner`, `targetCompanySize` | 2 |
| `RECEIPT_NO_CLAIM_OVERLAP` | `valueProps.0` | 1 |
| `SLOGAN_LIKE_FACT` | `pricingModel`, `productOneLiner` | 2 |

This reproduces the owner review: revision 1 is not usable despite its historical 100% substring-receipt score.

## Verification

`npm test` passed with 21 test files and 107 active tests. One Stage 3 golden-set test remains intentionally skipped. All tests are offline and use synthetic data, recorded snapshots or local servers. The production dependency audit found zero vulnerabilities.

## Step 5 preparation — not executed

The one-rerun allowlist reuses all saved sources and adds only these public pages:

| Seller | New pages |
| --- | --- |
| Resolve AI | `https://resolve.ai/about-us`; `https://resolve.ai/pricing`; `https://resolve.ai/glossary/pagerduty-sre-agent-vs-resolve-ai`; `https://resolve.ai/glossary/incident-io-vs-resolve-ai` |
| Shopify | `https://www.shopify.com/about`; `https://www.shopify.com/enterprise`; `https://www.shopify.com/pricing`; `https://www.shopify.com/compare/shopify-vs-bigcommerce`; `https://www.shopify.com/compare/shopify-vs-woocommerce` |
| Vercel | `https://vercel.com/customers`; `https://vercel.com/customers/how-rogo-ships-agent-written-code-to-production-in-5-minutes-on-vercel`; `https://vercel.com/customers/how-the-weather-company-serves-real-time-forecasts-to-350-million-daily-active-users-on-vercel`; `https://vercel.com/customers/how-sensay-went-from-zero-to-product-in-six-weeks`; `https://vercel.com/about`; `https://vercel.com/enterprise`; `https://vercel.com/pricing`; `https://domains.vercel.com/kb/comparisons` |

That is 4 + 5 + 8 = 17 new page requests and zero Serper queries. The saved sitemaps, homepage links and first-party comparison index already identify the required URLs, so another paid search would add no necessary coverage. The rerun plans exactly three GPT-4o mini calls. At the current $0.15/million input and $0.60/million output rates, prior observed usage suggests about $0.01 total; the temporary process ceiling remains $0.05.

Pass bar per seller: at least three customers with first-party receipts, at least two competitors with receipts, measurable size consistent with target size, buyer and champion titles, and zero blocking warnings. Any remaining failure after the single rerun will be edited manually.

Step 5 is not authorized. No listed page was fetched by WhyNow, no Serper query ran, no OpenAI request ran, and all three recovered profiles remain `needs_review`.
