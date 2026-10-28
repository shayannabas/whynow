# Gong seller research — October 27, 2026

Owner-authorized run from `46acd82fd5580769cc367f32ea0e8c0d2524782d`: exactly three focused GPT-5.5 calls, 8,000 maximum output tokens each, low reasoning, no retries. Maximum reservation $0.876110 against a $0.90 process cap. Reused four saved sources (30,079 evidence bytes, 171 receipts); zero new page fetches and zero Serper queries. Actual token-priced cost: **$0.222170**, calculated from provider-reported usage and configured official pricing, not an invoice lookup. Saved through the normal atomic state path, left `needs_review` with no approval or Prepare-demo run. OpenAI remained disabled/zero in persistent configuration; the temporary process environment was reset afterward. This authorization is exhausted.

## Tokens and cost

| Call | Input | Output | Reasoning (included in output) | Cost USD |
| --- | ---: | ---: | ---: | ---: |
| sellerFacts | 9207 | 808 | 441 | $0.070275 |
| organizationReview | 704 | 84 | 0 | $0.006040 |
| icpTargeting | 10847 | 3054 | 0 | $0.145855 |

## Customers and competitors

Retained customers are supported by saved first-party index/story text. All three domains remain missing; none was guessed. Index receipts are not the same as an independently verified current customer relationship; review the exact quote and linked story before approval.

### Anthropic

[Saved first-party source](https://www.gong.io/customers/case-studies)

> Anthropic&#x27;s 64% productivity gain: Combining revenue AI with a customer-centric GTM strategy Software Development 1,300 employees - - 0 1 2 3 4 5 6 7 8 9 .

### Google

[Saved first-party source](https://www.gong.io/customers)

> Google Frontify Our partnership with Gong was that piece of magic we needed; it’s been complementary to how we evaluate our performance.

### Nasdaq

[Saved first-party source](https://www.gong.io/customers/case-studies)

> Featured Stories How a Google sales team got hours of its time back using Gong Software Development 10,000+ The future of Fintech: Nasdaq uses Gong to make bullish bets Financial Services 5,000+

**Competitors: 0.** No confirmed comparison candidate existed in this saved source set. The organization reviewer was not permitted to invent organizations. This remains a blocking gap, not a successful competitor-research result.

## Segments and buyer-oriented search proposals

### 1. Enterprise B2B SaaS and software companies with scaled revenue teams

Sub-industries: Horizontal SaaS, Vertical SaaS, Developer tools, Cloud software, Data and AI software, Cybersecurity software.

- "sales productivity" "pipeline risk" "SaaS" "CRO"
- "forecast accuracy" "revenue operations" "SaaS"
- "sales ramp" "sales enablement" "SaaS" hiring
- "customer interactions" "voice of the customer" "revenue operations"
- "pipeline conversion" "RevOps" "SaaS"

### 2. Financial services firms modernizing revenue and advisory teams

Sub-industries: Capital markets, Fintech, Banking technology, Payments, Insurance distribution, Wealth and asset management.

- "forecast accuracy" "financial services" "sales leaders"
- "revenue operations" "financial services" "pipeline"
- "sales productivity" "financial services" "enterprise deals"
- "sales enablement" "financial services" hiring
- "customer interaction data" "financial services" "sales"

### 3. Healthcare and life sciences organizations with regulated commercial teams

Sub-industries: Healthcare technology, Medical devices, Life sciences, Digital health, Healthcare services.

- "sales enablement" "healthcare" "compliance" hiring
- "revenue operations" "healthcare" "forecast"
- "digital-first" "healthcare" "sales team"
- "sales productivity" "healthcare" "customer conversations"
- "pipeline risk" "healthcare" "CRO"

### 4. Manufacturers with enterprise sales, dealer, or account teams

Sub-industries: Industrial manufacturing, B2B hardware, Equipment manufacturing, Electronics manufacturing, Building products, Automotive suppliers.

- "sales enablement" "manufacturing" "enterprise sales"
- "forecast accuracy" "manufacturing" "revenue"
- "revenue operations" "manufacturing" "pipeline"
- "customer conversations" "manufacturing" "sales"
- "sales productivity" "manufacturing" "account teams"

### 5. Large business services and staffing organizations with high-volume sales onboarding

Sub-industries: Staffing, Recruiting services, Professional services, Business process outsourcing, Education services.

- "faster ramp" "sales" "staffing"
- "sales enablement" "new hires" "staffing"
- "sales coaching" "business services" "pipeline"
- "revenue operations" "professional services" "forecast"
- "sales productivity" "account executives" "business services"

### 6. Enterprise marketplace and platform companies with complex GTM motions

Sub-industries: Mobility platforms, Business travel platforms, Online marketplaces, Advertising platforms, Collaboration platforms.

- "revenue operations" "marketplace" "pipeline"
- "sales productivity" "platform company" "CRO"
- "customer interaction data" "sales leaders" "marketplace"
- "forecast accuracy" "enterprise deals" "platform"
- "voice of the customer" "go-to-market" "platform"

## Personas

Buyer titles (proposed targeting, not contacts): Chief Revenue Officer; Chief Sales Officer; Chief Customer Officer; Chief Operating Officer; Chief Commercial Officer; VP Sales; SVP Sales; VP Revenue; SVP Revenue; VP Customer Success.

Champion titles: VP Revenue Operations; Head of Revenue Operations; Director of Revenue Operations; Sales Operations Director; Sales Enablement Director; Head of Sales Enablement; GTM Enablement Lead; Sales Strategy and Systems Lead; Customer Success Operations Director; Sales Productivity Lead.

Excluded titles: VP Engineering; Director of IT Infrastructure; Procurement Manager; Marketing Operations Manager; Customer Support Manager.

## Size rule and remaining review

`minEmployees`, floor **500**. This is measurable. `targetCompanySize` is blank, so consistency with a written target cannot be established until the owner fills that required field. It is not treated as a contradiction or silently filled.

**11 blocking findings, 0 advisories:** empty competitors plus ten search-phrase warnings. The search heuristic is conservative: several flagged phrases look buyer-oriented, such as forecast accuracy + financial services + sales leaders. They are reported unchanged as possible false positives; no rule was loosened or output rewritten to make the profile pass. The owner can edit or explicitly acknowledge each with a typed reason.

- `VENDOR_SEEKING_QUERY` · `icpConfig.segments.1.queryTemplates.0`
- `VENDOR_SEEKING_QUERY` · `icpConfig.segments.1.queryTemplates.1`
- `VENDOR_SEEKING_QUERY` · `icpConfig.segments.1.queryTemplates.2`
- `VENDOR_SEEKING_QUERY` · `icpConfig.segments.1.queryTemplates.4`
- `VENDOR_SEEKING_QUERY` · `icpConfig.segments.4.queryTemplates.2`
- `VENDOR_SEEKING_QUERY` · `icpConfig.segments.4.queryTemplates.3`
- `VENDOR_SEEKING_QUERY` · `icpConfig.segments.4.queryTemplates.4`
- `VENDOR_SEEKING_QUERY` · `icpConfig.segments.5.queryTemplates.1`
- `VENDOR_SEEKING_QUERY` · `icpConfig.segments.5.queryTemplates.3`
- `VENDOR_SEEKING_QUERY` · `icpConfig.segments.5.queryTemplates.4`
- `EMPTY_COMPETITORS` · `sellerProfile.competitors`

No profile was approved, no outreach generated or sent, and no additional run is authorized. Model-list verification was free (HTTP 200, GPT-5.5 available). Pricing/settings were checked against [official OpenAI documentation](https://developers.openai.com/api/docs/models/gpt-5.5).
