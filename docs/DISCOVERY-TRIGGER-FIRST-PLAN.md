# New-seller discovery — offline checkpoint and proposed live plan

October 28, 2026. **Awaiting owner OK for live research.** No Serper, OpenAI, ATS, Wikidata, GDELT or external-page research call was made in this checkpoint. GitHub verification and the explicitly requested Google Docs updates are separate from research.

## What changed

In simple English: start with a real job opening, identify the company hiring, verify that company's website, then decide whether it is a buyer. A blog headline, job board, project or vendor is not a prospect just because its page contains a useful keyword.

The new path is shared by sellers with no curated seeds. It reads approved buyer/champion/function roles and technology keywords from the workspace, rather than a Resolve-only SRE search list. The frozen seeded reference path remains available; its parity tests stay green.

- Search Greenhouse, Lever and Ashby using approved targeting.
- Verify the actual job through the provider API. Direct job IDs must match. Reject early-career roles, missing/future dates, closed postings and dates outside the configured window. Mentoring junior colleagues does not turn a senior job into a junior posting.
- Resolve an unambiguous employer website, then fetch that first-party page through the existing robots/private-address/budget guard. A matching search title alone is insufficient. Same-name employers on different domains require disambiguation; an ATS slug is not a verified company name.
- Reject docs, blog/resources pages, job boards, frameworks/projects, the seller and supported seller-owned properties.
- Use first-party product language to establish an adjacent vendor. Retain it in the Kill Log with a specific reason/receipt. A search snippet alone creates only a vendor candidate, never a final factual kill.
- Exclude known customers/competitors, classify the employer from company evidence, collect free firmographics, then apply the existing scorecard, tiering and kill engine.
- Keep ambiguous segments, unknown size and outdated corporate-report size receipts under Needs review. A later empty enrichment result does not erase an unexpired receipted size.
- Prepare demo refreshes at most ten verified buyers, excluding the seven prior unverified page candidates and retained vendors. It has a shared hard ceiling of 100 Serper queries for this new-seller path. Quarantine retains old records and their sources; it does not delete them or alter seller approval.

## Offline results

All **7/7 saved Vercel negatives fail** the operating-company gate. These fixtures contain saved search-result snippets, explicitly labeled as such; none was presented as a newly fetched first-party page.

| Saved candidate | Outcome |
|---|---|
| Next.js AI-agent documentation | Non-company documentation page |
| Organic Growth for the Next Stage / Pike Growth page | Headline, not a verified employer name |
| Shopify Hydrogen | Framework/project, not a buyer company |
| SaaS Custom Domains | Adjacent-vendor candidate; first-party confirmation required before a kill |
| Design Engineer Jobs | Job board |
| Front-Commerce resources/blog | Non-company resources page |
| Approximated | Adjacent-vendor candidate; first-party confirmation required before a kill |

Synthetic positive fixtures are explicitly test data, not invented production prospects. They prove the complete path for an operating commerce employer hiring a Staff Frontend Engineer with Next.js/React through **each of Greenhouse, Lever and Ashby**, including company verification, segment, receipted size, score, tier and Today. Negative tests cover wrong job IDs, missing/old/future dates, early-career roles, ambiguous domains, seller properties, vendor versus buyer use of the same technology, customer/competitor exclusion, unclassified employers, shared caps and revision changes.

### Saved Resolve evidence

| Account | Saved job / source | What it proves |
|---|---|---|
| Okta | [Principal SRE](https://job-boards.greenhouse.io/okta/jobs/8002576), Sep 21; [ATS API](https://boards-api.greenhouse.io/v1/boards/okta/jobs/8002576) | Approved Resolve role still matches; dated saved receipt is inside its configured hiring window. Current fit 42, Tier 1. |
| Coalition | [Senior SRE](https://job-boards.greenhouse.io/coalition/jobs/4742193005), Oct 8; [ATS API](https://boards-api.greenhouse.io/v1/boards/coalition/jobs/4742193005) | Same match remains valid; current fit 40, Tier 1. Saved API text is the primary UI receipt. |
| Altana | [Principal Platform Engineer](https://job-boards.greenhouse.io/altanaai/jobs/8034201003), Oct 14 | Role matches, but the 6,476-employee receipt points to a 2019 ALTANA corporate report, not trustworthy current sizing for the supply-chain AI employer. It is now Needs review; this is not a successful identity/size proof. |
| SecurityScorecard | Previously saved SRE job | The current individual job was already recorded as HTTP 404 in the preceding checkpoint. It remains historical, not a current hiring proof. |

The old Resolve trigger-first run used 26 Serper queries and found Okta, SecurityScorecard and Altana. Its historical Altana cybersecurity label and size match were not treated as ground truth. The new offline replay proves the saved hiring normalization/matching; it does **not** claim the newly added first-party identity checks have been live-verified.

Current Resolve Today: **3 Act now (Okta, Coalition, CrowdStrike), 3 Worth researching, 14 Needs review, 2 kills**. No account/source/approval was deleted or rewritten to obtain these counts; the stale-size review gate changes Altana's displayed section.

Existing unrelated limitation found during review: the legacy `executive_departure` trigger alias currently falls through to the 90-day default instead of `exec_change`/30 days. CrowdStrike is therefore **not** used as proof of this hiring-discovery method or a 30-day freshness demonstration. This checkpoint does not claim to fix that separate alias/history migration.

## Coalition primary receipt

Today and account detail now lead with **Saved job text ↗**, using the saved source ID, and retain **Original ATS page ↗** as a secondary link. Saved text keeps its original URL and capture date; it is not disguised as a new fetch. Other verified ATS receipts with saved text use the same rule. Closed/uncitable jobs still cannot create active triggers.

## GDELT retry policy

On HTTP 429, wait for Retry-After or the minimum exponential delay, whichever is longer, then make **one retry only**. A second 429 doubles the backoff state, marks the collector **temporarily unavailable**, and lets other sources continue. Global pacing/cooldown prevents simultaneous accounts from hammering the source. A check/runtime has a maximum of **5 GDELT API attempts including retries**, also enforced by the guarded runtime budget; robots requests are tracked separately.

Offline tests use injected clocks/sleep and recorded failures, so no real wait or source request occurs. They cover retry success, repeated rate limits, shared cooldown and the five-attempt ceiling. No new live GDELT success is claimed; the previous timeout/429 results remain historical.

## Proposed Vercel run — NOT YET AUTHORIZED

Goal: **3–5 genuine Act now accounts**, not a guaranteed count. If fewer pass, report fewer. No invented names, guessed domains, automatic approval or OpenAI.

| Work | Serper allowance |
|---|---:|
| Six approved role batches × three ATS providers | 18 |
| Official employer website search, at most ten candidates | up to 10 |
| Free-source employee/revenue search, gated candidates only | up to 10 |
| Refresh at most ten verified buyers × at most five queries | up to 50 |
| Planned maximum | **88** |
| Hard combined stop | **100** |

The discovery child reserves at most 40; refresh receives only the remaining shared allowance. The 12-query difference is safety headroom, not permission for a second run or a broad fallback search. Existing workspace monthly caps, robots rules, cache ages and free-source runtime budgets remain in force. If those prevent qualification, record the limitation instead of resetting them silently.

After the ATS searches, employer-specific queries are exactly:

- `"<verified employer name>" official website`
- `"<verified employer name>" "<official domain>" employees revenue`

Search snippets identify candidates only. Provider dates/IDs and first-party company text decide admission. Free calls include the selected ATS API, selected first-party company pages and permitted firmographic sources within runtime caps. No conference/GitHub/paid enrichment or model call is added.

### Exact 18 ATS queries

The following strings come from the current approved Vercel workspace. Another seller gets its own roles and technologies through the same planner. Staff Frontend Engineer also expands to Senior and Principal variants; early-career terms are excluded in search and rechecked against the actual API job.

1. greenhouse

   `(site:job-boards.greenhouse.io OR site:boards.greenhouse.io) ("Head of Platform Engineering" OR "Director of Platform Engineering" OR "Director of Frontend Engineering") ("Next.js" OR "React" OR "Turborepo") -intern -graduate -"new grad" -junior`

2. lever

   `site:jobs.lever.co ("Head of Platform Engineering" OR "Director of Platform Engineering" OR "Director of Frontend Engineering") ("Next.js" OR "React" OR "Turborepo") -intern -graduate -"new grad" -junior`

3. ashby

   `site:jobs.ashbyhq.com ("Head of Platform Engineering" OR "Director of Platform Engineering" OR "Director of Frontend Engineering") ("Next.js" OR "React" OR "Turborepo") -intern -graduate -"new grad" -junior`

4. greenhouse

   `(site:job-boards.greenhouse.io OR site:boards.greenhouse.io) ("Head of Web Engineering" OR "Director of Developer Experience" OR "Engineering Manager, Web") ("Next.js" OR "React" OR "Turborepo") -intern -graduate -"new grad" -junior`

5. lever

   `site:jobs.lever.co ("Head of Web Engineering" OR "Director of Developer Experience" OR "Engineering Manager, Web") ("Next.js" OR "React" OR "Turborepo") -intern -graduate -"new grad" -junior`

6. ashby

   `site:jobs.ashbyhq.com ("Head of Web Engineering" OR "Director of Developer Experience" OR "Engineering Manager, Web") ("Next.js" OR "React" OR "Turborepo") -intern -graduate -"new grad" -junior`

7. greenhouse

   `(site:job-boards.greenhouse.io OR site:boards.greenhouse.io) ("Staff Frontend Engineer" OR "Senior Frontend Engineer" OR "Principal Frontend Engineer" OR "Design Engineering Lead" OR "Head of Ecommerce Engineering") ("Next.js" OR "React" OR "Turborepo") -intern -graduate -"new grad" -junior`

8. lever

   `site:jobs.lever.co ("Staff Frontend Engineer" OR "Senior Frontend Engineer" OR "Principal Frontend Engineer" OR "Design Engineering Lead" OR "Head of Ecommerce Engineering") ("Next.js" OR "React" OR "Turborepo") -intern -graduate -"new grad" -junior`

9. ashby

   `site:jobs.ashbyhq.com ("Staff Frontend Engineer" OR "Senior Frontend Engineer" OR "Principal Frontend Engineer" OR "Design Engineering Lead" OR "Head of Ecommerce Engineering") ("Next.js" OR "React" OR "Turborepo") -intern -graduate -"new grad" -junior`

10. greenhouse

   `(site:job-boards.greenhouse.io OR site:boards.greenhouse.io) ("platform engineering" OR "frontend engineering" OR "developer experience") ("Next.js" OR "React" OR "Turborepo") -intern -graduate -"new grad" -junior`

11. lever

   `site:jobs.lever.co ("platform engineering" OR "frontend engineering" OR "developer experience") ("Next.js" OR "React" OR "Turborepo") -intern -graduate -"new grad" -junior`

12. ashby

   `site:jobs.ashbyhq.com ("platform engineering" OR "frontend engineering" OR "developer experience") ("Next.js" OR "React" OR "Turborepo") -intern -graduate -"new grad" -junior`

13. greenhouse

   `(site:job-boards.greenhouse.io OR site:boards.greenhouse.io) ("web engineering" OR "design engineering" OR "ecommerce engineering") ("Next.js" OR "React" OR "Turborepo") -intern -graduate -"new grad" -junior`

14. lever

   `site:jobs.lever.co ("web engineering" OR "design engineering" OR "ecommerce engineering") ("Next.js" OR "React" OR "Turborepo") -intern -graduate -"new grad" -junior`

15. ashby

   `site:jobs.ashbyhq.com ("web engineering" OR "design engineering" OR "ecommerce engineering") ("Next.js" OR "React" OR "Turborepo") -intern -graduate -"new grad" -junior`

16. greenhouse

   `(site:job-boards.greenhouse.io OR site:boards.greenhouse.io) ("Chief Technology Officer" OR "Chief Product Officer" OR "VP Engineering") ("Next.js" OR "React" OR "Turborepo") -intern -graduate -"new grad" -junior`

17. lever

   `site:jobs.lever.co ("Chief Technology Officer" OR "Chief Product Officer" OR "VP Engineering") ("Next.js" OR "React" OR "Turborepo") -intern -graduate -"new grad" -junior`

18. ashby

   `site:jobs.ashbyhq.com ("Chief Technology Officer" OR "Chief Product Officer" OR "VP Engineering") ("Next.js" OR "React" OR "Turborepo") -intern -graduate -"new grad" -junior`

## Gates and report after owner OK

1. Preflight owner-approved revision, crawler identity, disabled OpenAI, existing monthly/runtime capacity and absence of another running Prepare demo.
2. Create one new durable run/authorization marker; do not reuse the exhausted October 28 run.
3. Run ATS-first discovery, persisting per-query counts and explicit rejection reasons.
4. Save confirmed vendors in the Kill Log and exclude seller properties/customers/competitors from buyer refresh.
5. Refresh only admitted buyer companies, preserving valid saved evidence, then re-rank.
6. Report Act now, Worth researching and Needs review with fit, tier, why-now, receipt; kills with reasons/receipts; exact Serper use, cache/source failures and any unmet goal.
7. Leave approvals to the owner, return live provider switches to their safe local defaults, retain the server on port 3000 and stop.

## Verification

- Full suite: **74 files passed; 365 tests passed; 1 intentional skip (366 total)**. Full console output is in `docs/TEST-OUTPUT-DISCOVERY-OFFLINE.txt`.
- Code: `f0b85f5` (pipeline) plus `aa3c5e8` (query-preview labels); preceding receipt/backoff step `8566da8`.
- Browser: saved-text primary links in Today and Coalition overview, full captured job text, Vercel's 18-query preview without running it, retained profile approval and new Altana review placement.
- The localhost server stays running with OpenAI false/zero, Serper/GDELT/scheduling disabled process-only.
- **No live research is authorized yet. Await the owner's OK for this proposed one-run plan.**

