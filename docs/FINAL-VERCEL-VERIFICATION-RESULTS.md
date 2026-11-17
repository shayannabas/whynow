# Final Vercel one-use verification — November 16, 2026

**Status: stopped on Apollo company-search HTTP403. Authorization used and exhausted; do not repeat or spend the unused fifth attempt.** Pump discovery remains proposal-only; README/Phase3 close-out is held.

## Saved approvals and workspace isolation

Before any provider call, the runner verified actual owner approvals: seller active revision7 (approving saved revision6 advanced it), approvedAt2026-11-17T02:27:10.339Z; playbookv3 approvedAt2026-11-17T02:27:28.230Z. These are UTC timestamps, corresponding to November16 in the owner's timezone. Earlier preflight checks correctly refused while both were needs_review and consumed no marker or provider allowance. The owner completed the app actions; the agent never approved or saved either form.

The runner reads/writes Vercel by workspace ID, never switches activeWorkspaceId, and verifies profile revision, approval timestamp and playbook digest before requests. Active workspace remains Vercel. Customer domains are unchanged: Weather Company/weathercompany.com, Rogo/rogo.ai as explicitly retained, Sensay/sensay.io. Stripe remained unconfirmed and was not called.

Code before execution: d72cdd6. Exclusive marker and durable authorization/run record: vercel-final-verification-one-use. Every HTTP attempt was counted before transport. No retry or continuation followed the403.

## Usage and outcomes

| Resource | Used | Cap |
| --- | --- | --- |
| Apollo API attempts | **4**:3 enrich +1 search |5 |
| Apollo credits | **2**, owner-reported from web app/Exports; balance95→93 out of95 | Free-plan allowance only; no purchase/upgrade |
| API-reported credit usage | Not exposed | Never infer zero from missing headers |
| Serper queries | **0** |30 |
| Free collector HTTP requests | **0** |150 |
| Apollo robots network requests | **0**, fresh saved access-control result reused |1 |
| OpenAI calls/cost | **0 / $0** |0 |
| New companies / timing checks / template drafts | **0 / 0 / 0** |25 each |

The credit delta is explicitly an owner observation from the web app after the batch, not an API field or an estimate. The API returned rate limits but no credit usage. Do not attribute the two credits to particular requests without evidence.

| Attempt | Request | Result |
| --- | --- | --- |
|1 | Enrich weathercompany.com | HTTP200 returned **The Weather Channel / weather.com**, a different company/domain. Not accepted as a correction or a pattern seed; profile left untouched. |
|2 | Enrich rogo.ai | HTTP200 with no organization. Saved “Not found in Apollo under this domain”; continued as authorized. Never substituted rogo.com. |
|3 | Enrich sensay.io | HTTP200 usable Sensay estimate. |
|4 | mixed_companies/search, page1/per_page25 | **HTTP403**. Immediate whole-batch stop, no retry. |

The owner accepted the HTTP 403 as a free-plan limitation for company search on this account. The transport did not retain the response body. There was no retry or follow-up diagnostic request.

## Derived pattern and limitations

Only Sensay was usable: Apollo estimates industry **information technology & services**, country **Singapore**, employeeCount**21**, search band**21–50**, with technology tags including AI, Ahrefs, Apple iOS, Brevo, C, Canny and Cloudflare. These are third-party estimates, not verified facts. [Saved estimate receipt](http://127.0.0.1:3000/sources/8e132d0f0bf0aa9d0739b6da).

This is a weak single-customer pattern, and its employee band is below Vercel's approved100-employee minimum. It was not silently broadened and the size rule was not changed. No returned prospect could be tested against that floor because search was refused. This configuration/sample-quality limitation remains separate from the403 access problem.

## Ranked counts

| Scope | Act now | Worth researching | Needs review | Killed |
| --- | --- | --- | --- | --- |
| New final-batch candidates |0 |0 |0 |0 |
| Whole Vercel workspace after run |0 |0 |**1 pre-existing account** |0 |

No candidate was returned, so there is no new ranked list, why-now receipt, kill or draft to display. The old reviewed/noise history was retained. Do not claim successful end-to-end discovery or timing verification.

## Restoration and next boundary

All child provider switches/caps were returned disabled/zero, including Apollo and Serper; OpenAI stayed false/zero throughout. .env is unchanged. Approved seller fields, ICP/playbook/approval, Resolve and existing drafts passed preservation checks. The local server remains on port3000 with provider switches/caps disabled/zero, preserving the active workspace.

[Pump plan](PUMP-ONE-USE-PROPOSAL.md) records separate authorization for Pump research and the proposal for trigger search. Vercel’s company-search refusal does not block first-party Pump research.

Full offline suite:87 files,436 passed,1 existing skipped test (437 total). Seven new fictional-response runner tests cover one-use/approval guards, no retries, strict HTTP and HTTP200-refusal stops, linked ATS identity, preserved candidates and blocked templates. [Full output](FINAL-VERCEL-VERIFICATION-TESTS.txt). No tests call live providers.
