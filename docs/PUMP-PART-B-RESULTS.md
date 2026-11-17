# Pump Part B — November 17, 2026

The one-use batch `pump-part-b-nov17-2026-one-use` stopped during discovery on the first HTTP error. The attempt is consumed.

The app recorded the owner's seller profile revision 4 approval at 2026-11-17T21:22:29.956Z and playbook v6 approval at 2026-11-17T21:22:41.009Z. The run verified both approval records and the approved policy before starting. It preserved the active workspace, both approved forms, existing drafts, and the other workspaces.

The runner selected 25 leads for verification from the authorized news and ATS searches. The first failed HTTP response was **403** on a funding article for Isomorphic Labs. The article's robots check returned 200. The article could not be verified and supplied no trigger. The transport stopped immediately. [Article that returned 403](https://www.fiercebiotech.com/biotech/isomorphic-labs-raises-5b-series-c-months-after-21b-round)

| Request type | Actual | Authorized cap |
| --- | ---: | ---: |
| Serper | 12 live requests (3 News, 9 Search) | 40 |
| Free collectors | 8 requests (4 robots, 3 public pages, 1 Greenhouse API) | 150 |
| Apollo organization enrich | 0 | 10 |
| OpenAI | 0 | 0 |

Serper reserved 13 queries against the workspace ledger because one query was served from cache. Twelve requests reached the provider. The collector count includes the failed article request.

| Pump queue | Saved accounts | Trigger and receipt |
| --- | ---: | --- |
| Act now | 0 | — |
| Worth researching | 0 | — |
| Top prospects | 0 | — |
| Killed | 0 | — |

No prospect completed verification and no draft was created. Providers are disabled with zero process caps, `.env` is unchanged, and port 3000 remains running.
