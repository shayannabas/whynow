# Vercel Prepare demo and Resolve window correction — October 29, 2026

The one authorized Vercel run is complete. **34 Serper queries, 0 OpenAI calls.** No profile was approved. Vercel remains the owner's approved revision 5; Gong remains unapproved. Normal OpenAI settings are false/zero; the local server is left on port 3000 with live providers disabled process-only.

## Vercel outcome

**The goal of 3–5 genuine Act now buyers was not met.** The automated run initially ranked Canonical as one Act now account, but offline review found a false-positive why-now and adjacent-vendor uncertainty. It was flagged for review, not counted as a validated buyer, deleted, or given an unsupported kill.

| Section | Raw run | After explicit offline review |
|---|---:|---:|
| Act now | 1 | **0** |
| Worth researching | 0 | **0** |
| Needs review | 7 | **8** |
| Killed | 0 | **0** |

### Ranked Needs review — final saved state

Scores/tiers below are retained computed values, **not proof of qualification**. All entries have no accepted why-now for outreach.

| Rank | Account / saved candidate | Fit | Tier | Job title / date behind the candidate | Receipt / reason |
|---|---|---:|---|---|---|
| 1 | Canonical | 66 | Tier 2 | Engineering Manager – Web. First published **Dec 15, 2022**; API updated **Aug 5, 2026**. | [Job](https://job-boards.greenhouse.io/canonical/jobs/4754075). Possible adjacent infrastructure vendor; segment, trigger quality and tier provenance need review. |
| 2 | Organic Growth for the Next Stage · pikegrowth.com | 29 | Unknown/Parked | None verified | [About page](https://www.pikegrowth.com/about). Headline was used as a company name. |
| 3 | Approximated | 20 | Unknown/Parked | None verified | [Product](https://approximated.app/). Vendor candidate from a saved search snippet; not a confirmed first-party vendor kill. |
| 4 | Custom domains and white-labelling for SaaS | 20 | Unknown/Parked | None verified | [Product](https://saascustomdomains.com/). Same vendor-candidate limitation. |
| 5 | How Next.js supports AI coding agents | 20 | Unknown/Parked | None verified | [Documentation](https://nextjs.org/docs/app/guides/ai-agents). Seller-related framework documentation, not a buyer. |
| 6 | Design Engineer Jobs | 19 | Unknown/Parked | None verified | [Job board](https://designengineer.io/). Not a hiring company. |
| 7 | Hydrogen: Shopify commerce in your framework | 14 | Unknown/Parked | None verified | [Framework](https://hydrogen.shopify.dev/). Not an independent buyer company. |
| 8 | The best headless commerce blog | 14 | Unknown/Parked | None verified | [Resources](https://www.front-commerce.com/resources/). Article/resources page. |

Act now and Worth researching have no final entries. There are no Vercel kill receipts because no factual kill was established. The seven earlier candidates are retained as quarantined history, with rejection reasons; they were not re-promoted or refreshed.

### Canonical — why the raw Act now result was rejected

Potential Vercel use case, stated conditionally: **Canonical's own web team hires engineering leadership and uses modern frontend technology, so Vercel could serve its internal web-delivery needs; however Canonical sells infrastructure software and is not a confirmed buyer.** This is a possible adjacent vendor and requires review. It does not match any named customer/competitor in the approved Vercel profile, but absence from those lists does not establish buyer fit.

- The discovered [Engineering Manager – Web job](https://job-boards.greenhouse.io/canonical/jobs/4754075) was first published `2022-12-15T10:49:30-05:00`, with `updated_at=2026-08-05T18:23:33-04:00`. The pipeline used the update date as hiring recency; it must not be described as a newly posted role.
- Refresh created **225 active triggers**, including Accountant, Accounts Receivable Clerk, Office Administrator and Legal Counsel. Shared company boilerplate says “AI, engineering innovation”; normalization made that match the approved “AI engineering” function phrase.
- The raw top why-now was [Legal Counsel – Commercial & Technology Transactions](https://job-boards.greenhouse.io/canonical/jobs/8311130), first published **Oct 23, 2026** (`09:41:10-04:00`), updated the same day (`21:34:39-04:00`). It is not a Vercel-targeted hiring function.
- The assigned AI-native segment relied on generic homepage matches: teams, workflows, healthcare and developer. This does not establish that Canonical is an AI-native application company.
- Free search found a 1,000-employee snippet from [ZoomInfo](https://www.zoominfo.com/c/canonical-ltd/350694814). The Tier 2 revenue receipt is an opaque Google redirect for a $199.5M snippet, so the revenue provenance needs review. Fit 66/Tier 2 remain raw computed numbers, visibly quarantined.
- First-party identity receipt: [Canonical](https://canonical.com/). Its role as an infrastructure-software vendor is flagged as ambiguity, not silently asserted to be a configured Vercel competitor.
- A saved `discovery_account_flagged_for_review` audit entry records these reasons and the agent review actor. No approval was created or changed. Original facts, trigger records and the raw run report remain available.

### Queries, limits and source failures

| Work | Queries |
|---|---:|
| ATS searches | 18 |
| Employer identity searches | 10 |
| Firmographic discovery search | 1 |
| Refresh Canonical | 5 |
| **Total** | **34 / 100** |

The saved monthly counter is **70 → 104**. The owner explicitly authorized a process-only ceiling of **170**, because persistent `.env` remains 50; that file was not changed. No unused allowance authorizes another run.

Run ID: `af58f3c8-b2a7-4bb6-b19a-97af8cd57223`; status `complete_with_errors`. Its one-use marker prevents repetition. The run lasted about 90 seconds. Discovery used 29 queries and refresh 5. No GDELT call or OpenAI call was made.

Ten candidates were checked: one saved company, nine rejected. Optimizedpayments and Great Gray were job-not-found; Maple, Ttecdigital and Pigment were outside the API-date window; Headway, Confido and Mobi were blocked by guarded Ashby requests (HTTP 401 at the robots pre-check; it was not bypassed); a SonicWall result misparsed as “React and TypeScript ...” had unresolved identity. Great Gray's /apply URL may expose a strict path-matching gap and needs offline follow-up.

Canonical refresh recorded Wikidata robots refusals and a Statuspage 404. These errors did not block other sources. The parent run's empty error array does not imply clean child collectors.

**Remaining discovery quality work is explicit:** remove company boilerplate from role matching; distinguish original publication dates from bulk updates/evergreen ads; correct employer/title parsing and /apply matching; use business-specific segmentation; tighten vendor-category and firmographic-source review. None was disguised as a successful 3–5-buyer outcome. No additional search, page fetch or provider call followed the completed run.

## Executive-departure window — offline fix

`executive_departure` now maps to **exec_change**, default **30 days**, instead of default/90. The decorator ignores the incorrect cached default/90 metadata, anchors expiry to the reported event date rather than later detection, and respects an explicitly configured executive window. `activeTriggers` defensively interprets old cached departure rows under the corrected alias.

The offline migration updated **10 saved trigger/history rows** using the workspace's 30-day rule, recalculated priority, and wrote through normal atomic saveState. Event types, IDs, evidence text, dates, source URLs, profiles and approvals were preserved. It is idempotent.

| Resolve section | Before | After |
|---|---:|---:|
| Act now | 3 | **2: Okta, Coalition** |
| Worth researching | 3 | **3: Instacart, Airbnb, HubSpot** |
| Needs review | 14 | **14** |
| Active kills | 2 | **2** |

CrowdStrike moves from Act now to **Unranked**: fit **35** is below the 40-point Worth researching threshold. It is neither killed nor deleted.

- Fit **35**, Tier **1**, unchanged.
- Priority **0.140 → 0.112**; the fresh-trigger multiplier is removed.
- Active triggers **5 → 0**.
- Five trigger records and six history records remain saved.
- August 20 departures expired September 19; August 22 expired September 21; the September 4 report expired October 4. Fetching or seeing the same story later cannot refresh that event.

Receipts retained include [August report](https://finance.yahoo.com/technology/ai/articles/exclusive-crowdstrikes-cto-leaving-launch-102507811.html) and [September report](https://www.thekeyexecutives.com/2026/09/04/crowdstrike-cto-elia-zaitsev-leaves-after-13-years-to-launch-170-million-ai-security-fund/).

## Verification and boundary

- **75 files passed; 368 tests passed, 1 intentional skip (369 total).** Full console output: `docs/TEST-OUTPUT-OCT29.txt`.
- New tests cover the alias, the 30-day boundary, positive in-window behavior, configured overrides, the five real CrowdStrike receipts, history/approval preservation, priority and idempotence.
- The immutable SignalScout departure fixture remains unchanged. Its comparison deliberately differs only in the corrected SLA key/days/expiry; all other captured output is still compared exactly.
- Code checkpoint `238aefe` [passed CI](https://github.com/shayannabas/whynow/actions/runs/41003606035).
- Browser verified Vercel 0/0/8 and Resolve's two Act now accounts. No refresh/source link, model generation, approval or sending action was clicked during verification.
- Port 3000 remains running. OpenAI is false/zero, live Serper/GDELT/scheduling disabled process-only. Persistent environment settings are unchanged.

