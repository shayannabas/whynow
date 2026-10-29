# October 28, 2026 — demo quality and Gong research

All times below use the October 28 Los Angeles workday; persisted timestamps after midnight are October 29 UTC. Code checkpoint: `8a65f35eb30f2829b53fbf097cea89f4ddf5f87b`. [Passing CI](https://github.com/shayannabas/whynow/actions/runs/40796861465).

## Outcome and boundaries

Vercel remains owner-approved at revision 5; no approval or owner messaging was changed. Prepare demo completed with collector errors, but produced **zero usable queue accounts**. The seven discovery candidates below need identity/qualification review. This is a failed live quality outcome, despite a working background pipeline.

Gong remains `needs_review` at revision 4 with **10 customers, 0 competitors, 2 blocking warnings and 0 advisories**. Exactly three authorized GPT-5.5 calls completed under the owner-raised $1.20 process cap for **$0.375920**. This authorization is exhausted. Normal OpenAI settings are `OPENAI_ENABLED=false`, `OPENAI_MONTHLY_LIMIT_USD=0`; the persistent environment file was never enabled. No profile approval, outreach generation, sending or deployment occurred.

## Vercel Prepare demo

One durable background run, `d2cc5321-4948-4a67-af98-693f192f4fbe`, used **60 Serper queries: 25 discovery + 35 refresh**, below the authorized 150. It was not repeated.

| Section | Count |
|---|---:|
| Discovered candidate accounts | 7 |
| Act now | 0 |
| Worth researching | 0 |
| Needs review | 7 |
| Active kills | 0 |

All seven are Tier unknown/Parked, without a receipted size or a dated active why-now trigger. The links below are **discovery receipts**, not trigger receipts. There are no additional top-ten entries.

| Needs review rank | Saved name / domain | Fit | Receipt | Quality finding |
|---|---|---:|---|---|
| 1 | Organic Growth for the Next Stage · pikegrowth.com | 29 | [About](https://www.pikegrowth.com/about) | Page headline was used as company name. |
| 2 | Approximated · approximated.app | 20 | [Product](https://approximated.app/) | Potential adjacent custom-domain vendor; verify buyer relevance. |
| 3 | Custom domains and white-labelling for SaaS · saascustomdomains.com | 20 | [Product](https://saascustomdomains.com/) | Product/category name and potential adjacent vendor. |
| 4 | How Next.js supports AI coding agents · nextjs.org | 20 | [Guide](https://nextjs.org/docs/app/guides/ai-agents) | Vercel-owned project, not an independent buyer. |
| 5 | Design Engineer Jobs · designengineer.io | 19 | [Job board](https://designengineer.io/) | Job board, not a buyer company. |
| 6 | Hydrogen: Shopify commerce in your framework · hydrogen.shopify.dev | 14 | [Project](https://hydrogen.shopify.dev/) | Shopify project/framework, not an independent buyer. |
| 7 | The best headless commerce blog · front-commerce.com | 14 | [Resources](https://www.front-commerce.com/resources/) | Blog headline and adjacent commerce vendor. |

No exact approved customer or named Cloudflare/Netlify/Webflow competitor appeared. The Next.js seller-related leak and project/job-board/title candidates show the discovery noise gate is still inadequate for Vercel. No false positives were promoted into Today, silently deleted, or approved.

Child collector runs retain Wikidata robots refusals, SEC 403/budget exhaustion, ATS 404/401 and unavailable status sources. The parent says `complete_with_errors`; an empty parent error array does not mean its child sources succeeded. Missing signals remain unknown/low confidence.

## Review improvements

The focused targeting schema now requires three editable general framing sentences, three closing questions, and a target-size description. Existing owner lines win over fallback proposals. Legacy profiles receive view-only suggestions until the owner saves. Gong's new focused output supplies all six lines; Vercel's manually entered starters remain intact.

Size floors are minimums. `100 employees` is consistent with “Mid-market and enterprise engineering teams (100+ employees).” A contradiction requires an explicit upper bound below the floor, such as “under 50 employees.” Employee/headcount/revenue labels and unit-specific ranges are recognized. Size matching also keeps engineering, total-company and revenue-team headcounts separate; unavailable departmental size remains unknown.

### Domain suggestions

The combined Vercel/Gong lookup batch used **10 Serper queries**, then stopped. Disallowed Wikidata search API paths were not bypassed. An allowed fallback follows an actual Wikipedia article's Wikidata link and reads its P856 official website through the explicitly allowed EntityData path.

| Seller | Pending suggestions |
|---|---|
| Vercel | Avalara → avalara.com; Code And Theory → codeandtheory.com; Klaviyo → klaviyo.com; OpenEvidence → openevidence.com; Stripe → stripe.com |
| Gong | Anthropic → anthropic.com ([P856](https://www.wikidata.org/wiki/Special:EntityData/Q116758847.json)); Google → about.google ([P856](https://www.wikidata.org/wiki/Special:EntityData/Q95.json)); Nasdaq → nasdaq.com ([P856](https://www.wikidata.org/wiki/Special:EntityData/Q82059.json)) |

All eight remain **Suggested**, with source and one-click confirmation. Actual blank domains remain blank; normal Save cannot silently verify a prefilled suggestion. Explicit confirmation records its source, increments the revision, resets acknowledgments and requires fresh owner approval. No confirmation was clicked.

Fern's forest-nonprofit result, ambiguous Ramp and Stably's stablecoin-company result were retracted rather than treated as facts. An Absorb outbound Proofpoint security-wrapper URL was rejected as a company domain. Current automated search matching remains conservative and may leave short names blank.

## ATS job receipts and freshness

Hosted job URLs are built from actual provider board/job IDs. Company careers links remain secondary. Verified ATS board/job identity keeps a valid Coalition receipt eligible for outreach without allowing another company's board.

| Account | Hosted job | Browser/API result |
|---|---|---|
| Coalition | [Greenhouse job](https://job-boards.greenhouse.io/coalition/jobs/4742193005) | Redirects to general company careers. [Direct ATS API](https://boards-api.greenhouse.io/v1/boards/coalition/jobs/4742193005) returns current complete job text; readable saved text is linked in the app. |
| Okta | [Greenhouse job](https://job-boards.greenhouse.io/okta/jobs/8002576) | Redirects to an Okta-owned actual job-detail page with job text; API 200 and readable saved text retained. |
| Altana | [Greenhouse job](https://job-boards.greenhouse.io/altanaai/jobs/8034201003) | Hosted page shows actual job text; API 200 and readable saved text retained. |
| SecurityScorecard | [Greenhouse job](https://job-boards.greenhouse.io/securityscorecard/jobs/8062312) | Redirects to a job list; individual API is 404. Historical captured job text remains visible, marked unavailable and not citable as a current trigger. |

We cannot force an ATS provider to stop redirecting its hosted URL. The app therefore provides explicitly labeled saved-text/API alternatives rather than claiming every hosted page works. Four saved source texts were cleaned offline of encoded HTML, retaining their original URLs/capture dates and older content-addressed history.

The Resolve queue is now **4 Act now / 3 Worth researching / 13 Needs review / 2 active kills**. Act now: Okta (fit 42, Tier 1), Coalition (40, Tier 1), Altana (38, Tier 1), CrowdStrike (35, Tier 1). SecurityScorecard moved to Needs review after the current posting returned 404.

Grafana Labs remains `KILL_SELLER_OR_COMPETITOR` with the first-party [Grafana Cloud product page](https://grafana.com/products/cloud/) and exact title quote “Grafana Cloud | AI-Powered Full-Stack Observability | Grafana Labs.” Atlassian is the other adjacent-vendor kill. Retired weak and replaced decisions remain in history.

## GDELT news

The optional collector uses the guarded runtime, robots handling, request pacing, cache and global rate-limit cooldown. Article observation time (`seendate`) is not treated as a publication date. Signals require fetched article publication dates, the existing relevance/freshness rules, and dedupe by canonical source/type across news providers.

| Resolve account | Signals | Events | Live result |
|---|---:|---:|---|
| Okta | 0 | 0 | Timeout |
| Coalition | 0 | 0 | HTTP 429 |
| Altana | 0 | 0 | HTTP 429 |
| CrowdStrike | 0 | 0 | HTTP 429 |
| SecurityScorecard | 0 | 0 | HTTP 429 |

These zeros mean **unavailable**, not evidence that no news exists. A shared Retry-After/minimum cooldown was added after the rate limits; no further live retries were made. Recorded failure/date/dedupe tests pass, but successful end-to-end live GDELT ingestion was not established. It remains off in the local verification server.

## Gong first-party research

Free preparation used **2 Serper queries** and **22 page fetches**, with **20 selected saved sources** in drafting. The initial plan mistakenly prioritized generic “vs” blog pages over pricing/about; two corrective free fetches supplied those required pages. The 20-source synthesis ceiling remains intact. No genuine named competitor comparison was found; generic build-vs-buy/inbound-vs-outbound pages were not turned into invented competitors.

The deterministic extractor found **10 clear customer candidates + 1 uncertain Frontify headline candidate**, and **0 competitors**. The reviewer retained the ten clear names and dropped the uncertain headline. The saved response is preserved; a later offline correction strengthened relationship quotes and removed the Proofpoint wrapper domain without another model call.

| Customer | Gong-owned receipt |
|---|---|
| Absorb Software | [Customer story](https://www.gong.io/customers/case-studies/absorb-software-sees-30-revenue-boost-by-adopting-gen-ai-for-productivity-gains-and-improving-buyer-experience) |
| Anthropic | [Customer story](https://www.gong.io/customers/case-studies/anthropics-64-productivity-gain-combining-revenue-ai-with-a-customer-centric-gtm-strategy) |
| Appen | [Customer story](https://www.gong.io/customers/case-studies/gong-for-cs-appen-wants-it-loves-it-needs-it) |
| Atlassian | [Customer story](https://www.gong.io/customers/case-studies/atlassian-build-vs-buy-boost-meddpicc-use) |
| Element451 | [Customer story](https://www.gong.io/customers/case-studies/element451-accelerates-sales-performance-driving-a-131-increase-in-arr-with-gong-ai) |
| Google | [Customer story](https://www.gong.io/customers/case-studies/how-a-google-sales-team-got-hours-of-its-time-back-using-gong) |
| Nasdaq | [Customer story](https://www.gong.io/customers/case-studies/the-future-of-fintech-nasdaq-uses-gong-to-make-bullish-bets) |
| SoftServe | [Customer story](https://www.gong.io/customers/case-studies/how-softserve-used-gong-to-adapt-and-align-their-teams) |
| ThoughtSpot | [Customer story](https://www.gong.io/customers/case-studies/thoughtspot-leaves-telephone-game) |
| Yotpo | [Customer story](https://www.gong.io/customers/case-studies/yotpo-unified-revenue-teams) |

Google remains because its clean first-party story explicitly says **“How a Google sales team got hours of its time back using Gong.”** The original model selected an incidental Google mention; the offline correction uses this stronger exact headline. No customer domain is guessed; all ten actual domain fields are blank pending sourced owner confirmation, including three current suggestions.

Six proposed GTM segments (not simply industries):

1. Scaled B2B revenue teams standardizing enterprise sales execution.
2. High-growth companies moving from startup to scale-up GTM.
3. Revenue organizations consolidating fragmented GTM workflows.
4. Sales teams scaling coaching, onboarding and rep productivity.
5. Customer success and expansion teams managing renewal and churn risk.
6. Complex B2B organizations aligning sales, product and RevOps around customer insight.

Buyers: Chief Revenue Officer, Chief Sales Officer, Chief Commercial Officer, Chief Customer Officer, Chief Operating Officer, Chief Financial Officer, Chief Executive Officer.

Champions: VP/Head/Director Revenue Operations, VP Sales, VP Enterprise Sales, Head/Director Sales Enablement, VP Customer Success, Director Customer Success Operations, Sales Operations Leader, GTM Enablement Lead.

Size proposal: **minRevenueTeamHeadcount / 50**. The editable target describes at least 50 revenue-team employees across sales, RevOps, enablement, solutions engineering and customer success, prioritizing complex B2B sales/expansion/renewal motions. It is a consistent measurable targeting proposal, not an established size fact. Current free firmographics do not provide this departmental count; it must remain unknown unless receipted.

Blocking warnings:

- `EMPTY_COMPETITORS`: zero supported competitors. Do not invent one to clear it.
- `VENDOR_SEEKING_QUERY` at `icpConfig.segments.2.queryTemplates.1`: `"disconnected systems" "sales" "forecasting" "revenue operations"`. This is a conservative possible false positive: it describes buyer pain but could surface vendors. It remains visible for owner editing/typed acknowledgment; the rule was not loosened.

There are **0 advisories** and one unverified inferred target-size description, as shown in the review UI.

### Paid call accounting

Free model-list check: HTTP 200, GPT-5.5 available. Each request used low reasoning and an 8,000-token output allowance; zero retries. Preflight maximum was $1.162665, below the explicitly raised $1.20 process cap.

| Focused call | Input tokens | Output tokens | Reasoning tokens (included in output) | Cost USD |
|---|---:|---:|---:|---:|
| Seller facts | 25,049 | 557 | 0 | 0.141955 |
| Organization review | 1,692 | 236 | 0 | 0.015540 |
| ICP targeting | 26,867 | 2,803 | 0 | 0.218425 |
| Total | 53,608 | 3,596 | 0 | **0.375920** |

The generation batch made **0 page fetches and 0 Serper queries**. Its durable one-use marker prevents duplicate spend. Safe original outputs and per-call usage remain in ignored local state. OpenAI was disabled/zero immediately afterward; no incomplete response occurred.

Combined Serper use across the three separate authorizations: **72 queries = 60 Vercel preparation + 10 domain suggestions + 2 Gong research**. No cap was borrowed from another authorization.

## Verification and remaining work

- Full offline suite: **72 files passed, 340 tests passed, 1 intentional future golden-set skip (341 total)**. Tests use saved responses/local fixtures and never live providers.
- CI for the code checkpoint passed tests, dependency audit and full-history secret scan.
- Desktop browser at 1440px: Vercel 0/0/7 queue and unchanged owner-approved revision 5; unconfirmed suggestions; Gong 10/0, 2 blocking/0 advisory, proposed messaging/size and unchecked approval; Coalition's eligible job and complete copy-only template; readable saved job text; Grafana product receipt in Kill Log. Hosted ATS behavior was checked for all four requested companies.
- The same native Drive Demo Script is updated in place, preserving structure and the featured Coalition template. It says to start the app and keep its terminal open.
- Local server remains on port 3000 with OpenAI off/zero and live collectors/scheduler disabled process-only.
- Remaining: owner review of Gong and suggestions; Vercel discovery/entity quality and unavailable firmographics; GDELT source availability. No automatic approval, another provider run or further scope is implied.

