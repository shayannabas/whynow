# Pump Part B rerun — November 17, 2026

The authorized rerun `pump-part-b-nov17-2026-page-resilience-rerun` completed without a provider failure. The saved Pump seller revision 4 and playbook v6 approvals passed preflight. The batch checked 25 leads and skipped four page failures. The allowance is consumed.

| Queue | Saved accounts | Trigger and receipt |
| --- | ---: | --- |
| Act now | 0 | — |
| Worth researching | 0 | — |
| Top prospects | 0 | — |
| Needs review | 0 | — |
| Killed | 0 | — |

The 25 lead checks ended with 10 job postings outside the approved window, nine unresolved company identities, three ATS checks unavailable, two stale or unverified news dates, and one missing job. No lead cleared promotion and no drafts were created. Two cached Isomorphic Labs listings were retained offline under rejected discovery because the official company identity could not be resolved. They are explicitly unverified and supply no timing evidence. [Listing from Fierce Biotech](http://127.0.0.1:3000/sources/1048eb5a496a3626e7840570) · [Second search listing](http://127.0.0.1:3000/sources/27cc48c0896f598e0b2983ac)

| Candidate | Skipped page | Reason |
| --- | --- | --- |
| Isomorphic Labs | [Fierce Biotech funding article](https://www.fiercebiotech.com/biotech/isomorphic-labs-raises-5b-series-c-months-after-21b-round) | HTTP 403 |
| Isomorphic Labs | Google News redirect | The redirect left the allowed domain |
| Isomorphic Labs | Fierce Biotech funding article, reached from another listing | HTTP 403 |
| Supabase | [Ashby robots check](https://api.ashbyhq.com/robots.txt) | HTTP 401 on the public access check. The board API was not called. |

| Resource | Actual | Cap |
| --- | ---: | ---: |
| Serper live requests | 19 (2 News, 17 Search) | 40 |
| Serper ledger reservations | 36 (19 live and 17 cache hits) | 40 |
| Free collector requests | 25 (4 robots, 4 pages, 8 Greenhouse, 9 Lever) | 150 |
| Skipped pages | 4 | 15 |
| Apollo organization enrich | 0 | 10 |
| OpenAI | 0 | 0 |

The cumulative Serper ledger is 49 of 50. All child providers were restored to disabled with zero caps. The active workspace, approvals, other saved data and `.env` were preserved. No additional requests were made to recover the listings.
