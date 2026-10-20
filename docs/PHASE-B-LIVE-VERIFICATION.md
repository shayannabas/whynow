# Phase B live verification

Captured October 20, 2026 against the frozen Resolve reference demo. This was the one owner-authorized live check after the full offline suite passed. It used **20 Serper queries exactly** (4 per company), free public collectors and **0 OpenAI calls**. No profile was approved and no later port chunk started.

All five jobs reached `complete_with_errors`: successful sources were retained and rescored while blocked/missing sources stayed visible as errors. `Parked` means free collectors did not produce receipted firmographics; WhyNow did not guess company size.

| Account | Segment | Fit | Tier | Non-zero signal scores | Triggers | Kill |
| --- | --- | ---: | --- | --- | ---: | --- |
| Databricks | Data / AI infrastructure | 53 | Parked | tech 5, revenue 4 inferred, observability 5, pain 4, AI 4 | 4 | `KILL_BUILD_CULTURE` |
| Uber Eats | Delivery / real-time marketplaces | 48 | Parked | tech 4, revenue 5 inferred, pain 4, AI 5, wedge 5 | 4 | none |
| Binance | Crypto / fintech | 54 | Parked | tech 4, revenue 5 inferred, observability 5, pain 4, AI 3, wedge 5 | 15 | none |
| Replicate | Data / AI infrastructure | 49 | Parked | tech 4, revenue 4 inferred, observability 5, pain 4, AI 3 | 7 | none |
| DraftKings | Sports betting / iGaming | 46 | Parked | tech 3, revenue 5 inferred, observability 3, pain 4, AI 4, wedge 4 inferred | 3 | none |

## Receipts and honest zeros

- **Databricks:** [technology receipt](https://www.cloudthat.com/resources/blog/unified-monitoring-for-databricks-and-kubernetes-using-grafana/), [observability receipt](https://www.youtube.com/watch?v=zsUcAKyv-Cw), [active-pain receipt](https://www.outagely.com/status/databricks/), [AI receipt](https://www.databricks.com/learn/certification/genai-engineer-associate), and [build-culture kill receipt](https://docs.databricks.com/aws/en/lakehouse-architecture/deployment-guide/observability). Competitive wedge remained 0/1 with no receipt.
- **Uber Eats:** [technology receipt](https://dev.to/signadot/everything-you-need-to-know-about-kubernetes-microservices-4j0f), [active-pain receipt](https://downdetector.com/status/uber-eats/), [AI receipt](https://www.uber.com/us/en/blog/open-source-and-in-house-how-uber-optimizes-llm-training/), and [Resolve customer-wedge receipt](https://resolve.ai/customers). Observability remained 0/1 with no receipt.
- **Binance:** [technology/observability receipt](https://startup.jobs/associate-site-reliability-engineer-binance-us-10448662), [active-pain receipt](https://downdetector.com/status/binance/), [AI receipt](https://sg.linkedin.com/jobs/view/llm-data-scientist-algorithm-engineer-top-talent-program-at-binance-4304878015), and [Resolve customer-wedge receipt](https://resolve.ai/customers).
- **Replicate:** [technology receipt](https://www.linkedin.com/posts/prayag-sangode-41737318_kubernetes-replicaset-k8s-activity-7459134750910353408-zKW3), [observability receipt](https://www.manageengine.com/it-operations-management/blog/best-kubernetes-monitoring-tools.html), [first-party active-pain receipt](https://replicate.com/blog/new-status-page), and [AI receipt](https://www.youtube.com/watch?v=huQPkrwVWwc). Competitive wedge remained 0/1 with no receipt.
- **DraftKings:** [technology receipt](https://medium.com/draftkings-engineering/draftkings-workshop-demystifying-kubernetes-4ce86c187408), [observability receipt](https://careers.draftkings.com/jobs/jr14624/senior-lead-site-reliability-engineer-database/), [active-pain receipt](https://statusgator.com/services/draftkings), [AI receipt](https://www.facebook.com/draftkingslife/posts/ai-is-changing-more-than-how-engineers-code-its-changing-what-they-get-to-buildi/1714260440699341/), and [Resolve category-wedge receipt](https://resolve.ai/customers).

## Collector errors and limitations

- SEC daily indexes returned unsupported content types/403 responses on the first account; the shared four-request EDGAR index budget was then exhausted. Form D was therefore 0 for every account.
- Google News RSS was disallowed by its current `robots.txt` path. Hacker News and Serper continued.
- ATS discovery returned honest 404/401/no-match results for most companies. Binance's public Greenhouse board succeeded; Databricks's response exceeded the strict 2 MB ceiling.
- Several inferred or search-derived “active pain” candidates are monitoring pages that say a service is currently healthy. This is retained as a visible SignalScout-parity limitation, not silently rewritten. A later quality phase should add negation/current-status handling without changing the frozen pure-output fixture.
- StatusGator was **not** used as an API collector. Some ordinary Serper results happened to link to StatusGator pages; these remain transparent search receipts.
