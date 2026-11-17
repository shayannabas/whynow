# Pump Part A rerun — November 17, 2026

Pump profile revision 1 and playbook version 1 are saved as needs_review. [Open the review screen](http://127.0.0.1:3000/onboarding/profile).

The run reused 18 saved pages and saved 11 new pages in 15 HTTP requests: 14 content attempts and one robots request. The pricing page, comparison index and nine direct comparisons were saved. The about, how-it-works and security paths returned 404. The saved sitemap supplied the comparison leads. Serper and Apollo use were zero. No additional customer stories were fetched.

| GPT-5.5 call | Estimated input | Actual input | Cached input | Output | Reasoning within output | Actual cost |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Seller facts | 32,302 | 20,407 | 0 | 660 | 0 | $0.121835 |
| Organization review | 38,837 | 24,949 | 19,200 | 1,557 | 0 | $0.085055 |
| ICP and playbook | 34,316 | 21,557 | 19,200 | 3,836 | 153 | $0.136465 |

Actual total **$0.343355**, with **38,400 cached input tokens**. The full uncached preflight was $1.247275. Every request fit below the 40,000 estimated input target. All three calls used low reasoning and an 8,000 output-token maximum, with zero retries.

## Draft customers

| Company | Domain from saved link | Receipt |
| --- | --- | --- |
| beehiiv | Missing | [Case study](https://www.pump.co/customers/how-beehiiv-saves-15k-per-month-on-aws-without-lifting-a-finger-with-pump-save) |
| EasyEcom | Missing | [Case study](https://www.pump.co/customers/how-pump-empowers-easyecom-to-cut-costs-on-aws-for-free) |
| Finsera | Missing | [Case study](https://www.pump.co/customers/how-finsera-cut-60-off-compute-costs-in-months-with-pump-save) |
| ForUsAll | forusall.com | [Case study](https://www.pump.co/customers/how-forusall-eliminated-hidden-aws-costs-across-rds-infrastructure-with-pump-save) |
| GeoServes | Missing | [Case study](https://www.pump.co/customers/geoserves) |
| Greybeam | Missing | [Case study](https://www.pump.co/customers/how-greybeam-got-clear-ec2-spend-visibility-without-leaving-their-workflow-using-pump-view) |
| HEO Space | heospace.com | [Case study](https://www.pump.co/customers/how-heo-space-built-full-cloud-visibility-across-3-aws-environments-with-pump-view) |
| ICANotes | icanotes.com | [Case study](https://www.pump.co/customers/how-icanotes-consolidated-finops-security-and-compliance-into-one-platform-with-pump) |
| Olio Labs | Missing | [Case study](https://www.pump.co/customers/olio) |
| SalesForge | Missing | [Case study](https://www.pump.co/customers/how-salesforge-cut-10-off-their-aws-bill-on-autopilot-with-pump-save) |
| Tellonym | tellonym.me | [Case study](https://www.pump.co/customers/how-tellonym-runs-500k-aws-on-autopilot-with-pump-save) |
| Terra | Missing | [Case study](https://www.pump.co/customers/how-terra-saved-nearly-30k-in-months-on-aws-with-pump-save) |
| UserGems | Missing | [Case study](https://www.pump.co/customers/how-usergems-saved-time-and-money-using-pump-view) |
| Whalesync | Missing | [Case study](https://www.pump.co/customers/how-whalesync-saved-13k-in-months-and-cut-compute-costs-by-62-with-pump-save) |
| Zil Money | Missing | [Case study](https://www.pump.co/customers/how-zil-money-cut-15%E2%80%9320-of-their-aws-bill-without-long-term-commitments-with-pump-save) |

[Daemo.ai](https://www.pump.co/customers/daemo) appeared in the saved evidence and was used in the playbook, but it did not make the saved customer list.

## Draft competitor comparisons

All 14 domain fields remain blank for review. Some comparisons name products or platform features rather than companies.

| Comparison entry | Receipt |
| --- | --- |
| Antimetal | [Pump comparison](https://www.pump.co/vs) |
| Apptio Cloudability | [Pump comparison](https://www.pump.co/vs) |
| Archera | [Pump comparison](https://www.pump.co/vs) |
| Azure Cost Management + Billing | [Pump comparison](https://www.pump.co/vs) |
| CloudCheckr | [Pump comparison](https://www.pump.co/vs) |
| DoiT International | [Pump comparison](https://www.pump.co/vs) |
| Finout | [Pump comparison](https://www.pump.co/vs) |
| Flexera | [Pump comparison](https://www.pump.co/vs) |
| Google Cloud Cost Management | [Pump comparison](https://www.pump.co/vs) |
| Kion | [Pump comparison](https://www.pump.co/vs) |
| ParkMyCloud | [Pump comparison](https://www.pump.co/vs/parkmycloud) |
| ProsperOps | [Pump comparison](https://www.pump.co/vs/prosperops) |
| Spot by NetApp | [Pump comparison](https://www.pump.co/vs/spot) |
| Zesty | [Pump comparison](https://www.pump.co/vs/zesty) |

## ICP segments

- AWS-heavy SaaS teams with lean engineering operations
- Cloud-native fintech, payments and regulated software companies
- High-growth digital media, creator and social platforms
- Data, AI and ML infrastructure companies with compute-intensive workloads
- Multi-cloud or cloud-migration teams consolidating spend and governance

The draft size floor is 40 employees and a production public-cloud footprint. Buyer titles include CTO, VP Engineering and CFO. Champions include DevOps, cloud and platform engineers and FinOps leads.

## Playbook triggers

| Trigger | Source | Window | Strength |
| --- | --- | ---: | --- |
| Lean engineering team running production AWS | other | 90 days | strong |
| Manual reporting, budget or anomaly-monitoring workflow appears active | other | 120 days | medium |
| Savings Plans or Reserved Instance planning is visible | other | 120 days | strong |
| AI, Bedrock or GPU spend is becoming material | news | 90 days | strong |
| Cloud security or compliance evidence is part of the infrastructure workflow | other | 180 days | medium |
| Cloud migration, consolidation or multi-environment visibility initiative | news | 180 days | medium |

Only the two news triggers have a supported discovery adapter in the saved draft. The four other-source rules show a non-blocking collector note and supply no timing evidence. The draft contains no explicit funding or hiring trigger.

## Review findings

- Seller profile: 16 blocking warnings (14 missing competitor domains and two vendor-seeking search phrases in digital media), zero advisories, and one unverified seller claim. Some research quotes include page markup or navigation and deserve a manual check.
- Playbook: four blocking warnings. Commitment planning has a numeric-claim and an unsupported-name warning. The AI/GPU trigger has an unsupported-name warning. The size/credit anti-trigger includes numeric thresholds the playbook validator rejects.

The one-use rerun is exhausted. The owner’s approvals, other workspaces and .env are unchanged. Providers were restored to disabled with zero caps. Pump Part B did not run and remains proposal-only.
