# Pump Part B — news-first run

November 17, 2026. The one-use batch completed on `1eb9e4f` under owner-approved seller revision 4 and playbook v6. It selected 25 candidates. Four reached scoring, 15 received a discovery rejection, and the shared Serper budget ran out during verification. Twelve of the rejected candidates were retained as review accounts.

| Queue | As run | After saved-evidence identity review |
| --- | ---: | ---: |
| Act now | 3 | 2 |
| Worth researching | 0 | 0 |
| Top prospects | 0 | 0 |
| Needs review | 12 | 13 |
| Killed | 1 | 1 |

| Account | Result | Evidence |
| --- | --- | --- |
| Ramp | Act now, Tier 1, fit 22 | Router launch on August 20. [Saved article](http://127.0.0.1:3000/sources/379ca9a5969e1eada9a2c786) |
| Conveo | Act now, Tier 2, fit 20 | Funding on September 2. [Saved article](http://127.0.0.1:3000/sources/a689a5e0c455aa8f26ea8081) |
| Nuvia | Moved from Act now to Needs review using saved evidence | The September 23 [funding article](http://127.0.0.1:3000/sources/97677bde6ba36eb30e3de663) describes a Latin American AI startup. The saved [nuvia.com homepage](https://www.nuvia.com/) describes nuclear-industry services. The startup domain is unverified. |
| Base | `KILL_BELOW_ICP_SIZE` | The [Apollo estimate](https://api.apollo.io/api/v1/organizations/enrich?domain=base.org) was 24 employees against a floor of 40. [Stablecoin integration announcement](http://127.0.0.1:3000/sources/c0426b81ac1b0c5968c130a4) |

The three template attempts were blocked by `NO_APPROVED_SELLER_CLAIM`. No drafts were created. No approval or workspace switch occurred.

| Other review records | Evidence retained | Review reason |
| --- | --- | --- |
| Complaion | [Funding listing](https://www.saasrise.com/deals/complaion-raises-us146m-135m-to-simplify-compliance-for-european-smes-50a5ba37-45ca-4e60-9e3b-9e038b4910c5) | Identity unresolved |
| “Deploy an” and “llm-d 1.0 hardens” | [NVIDIA listing](http://127.0.0.1:3000/sources/0353f6ac238c94c448cd03c5), [IBM listing](http://127.0.0.1:3000/sources/5e40fef74adcb8315ff5751f) | Headline fragments, no verified company |
| Dropbox, Everpure and Hasbro | [Dropbox job](https://job-boards.greenhouse.io/dropbox/jobs/8356941), [Everpure job](https://job-boards.greenhouse.io/purestorage/jobs/8179659), [Hasbro job](https://job-boards.greenhouse.io/hasbro/jobs/4341808009) | Employer identity unresolved |
| FINEOS, FlyAkeed and Mach Industries | [Migration listing](https://finance.yahoo.com/healthcare/articles/fineos-announces-successful-cloud-migration-200000751.html), [Funding listing](http://127.0.0.1:3000/sources/41473fc3f07fdb489b8f1928), [Mach Industries job](https://job-boards.greenhouse.io/machindustries/jobs/4488055009) | Official page verification incomplete |
| Coast | [Funding listing](http://127.0.0.1:3000/sources/73c7e578bd32e056c99c2752) | Identity unresolved |
| Ohio State and Microsoft | [Partnership listing](https://www.edtechinnovationhub.com/news/https/wwwedtechinnovationhubcom/news/tag/ai) | Article describes a partnership, with no separate company verified |
| PrismML | [Funding listing](https://www.saasrise.com/news/prismml-secures-2225m-seed-to-build-tiny-llms-for-saas-ai-72b8d5ba-ae6f-4f19-8e8c-93a2e869b4c0) | Company identity not corroborated |

Rejection counts were eight unresolved identities, three unavailable articles, three unavailable official pages and one unverified company identity. Eleven page skips were logged, including two robots disallows and nine budget exhaustions. The FlyAkeed robots check returned a 404 and was recorded as having no rules. Needs review listings are not timing evidence.

| Usage | Actual | Cap |
| --- | ---: | ---: |
| Serper | 80 live and reserved, 55 News and 25 Search | 80 |
| Free HTTP | 34, including 18 robots checks, 13 web requests and 3 Greenhouse requests | 150 |
| Apollo organization enrich | 10 | 15 |
| Apollo search, people search, OpenAI | 0 | 0 |

News accounted for 68.75% of requests. The Serper monthly ledger is 129 of 300. The owner-authorized cap change is the only persistent environment edit. All run providers returned to disabled with zero process caps. The authorization is exhausted.
