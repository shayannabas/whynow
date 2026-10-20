# Phase B live verification

Captured October 20, 2026 against the frozen Resolve reference demo. The initial check used 20 Serper queries. The owner-authorized quality re-check used 25 more queries, exactly five per company. Across both checks OpenAI calls remained **zero**. The table below is the final offline re-score of the five accounts from the already-saved evidence after the firmographic and freshness fixes; this re-score made **zero new provider calls**.

## Final saved-evidence result

| Account | Tier and receipted size basis | Fit | Dated active pain | Active deduplicated triggers | Kills |
| --- | --- | ---: | --- | ---: | --- |
| Databricks | Tier 1 — 11,000 employees; [receipt](https://www.trueup.io/co/databricks) | 35 | none | 0 | `KILL_BUILD_CULTURE`; [receipt](https://docs.databricks.com/aws/en/lakehouse-architecture/deployment-guide/observability) |
| Uber Eats | Tier 1, provisional — $5.8B revenue; [receipt](https://www.theguardian.com/technology/2022/feb/09/uber-eats-earnings-report-stocks) | 31 | none | 0 | none |
| Binance | Tier 1 — 5,000 employees; [receipt](https://www.binance.com/en/square/post/20642089256402) | 49 | none | 9 | none |
| Replicate | Tier 3 — 37 employees plus meaningful seed funding; [receipt](https://mlq.ai/startups/replicate/) | 22 | none | 0 | none |
| DraftKings | Tier 1, provisional — $6.5B valuation; [receipt](https://productmint.com/draftkings-business-model-how-does-draftkings-make-money/) | 24 | none | 0 | none |

The nine active Binance triggers are dated job-board signals inside their configured windows: AI/dev-tools, system-performance, data-science/LLM, identity/security, language operations and technical-support hiring. Duplicate URLs and stale or undated search evidence are absent. All five active-pain counts are honestly zero because no saved page both attributed a dated incident to the target and placed it inside the trigger window.

## Quality fixes proven offline

- Free-search firmographics now require the metric and target company to occur in the same sentence. Generic `IPO`, `public company` and one-dollar truncated snippets no longer create high-impact fields. Structured Wikidata stock-exchange facts remain valid because they are not free-text guesses.
- Saved free fields whose URL and quote do not identify the target are removed before re-scoring. The five accounts can therefore keep a tier only when the saved receipt supports that company.
- Active-pain pages that say a service is healthy score zero. Third-party incidents mentioned on seller-hosted content pages do not become the seller's incident.
- Search/news/incident/executive triggers require a reported date, must be inside their configured window and are deduplicated by trigger type plus canonical evidence URL. Historical rows remain in `triggerHistory` for audit but do not leak into the current score or report.
- ATS JSON has a source-specific 16 MB ceiling; the normal public-page ceiling remains unchanged. Slugs are tried from the configured domain/name aliases and common vendor URL shapes.

## Binance unsellable-kill explanation

The frozen SignalScout parity case is killed because its input explicitly says the prospecting surface is unavailable and includes a public evidence URL. The live Binance record has no `prospectingSurface`, no receipted `prospectingSurfaceEvidenceUrl`, and no equivalent kill hint. Large size and a high fit score cannot substitute for the missing evidence, so `KILL_UNSELLABLE_ORG` correctly does not fire.

## Remaining source errors

- **SEC EDGAR still returned HTTP 403** even after the request identity was changed to the SEC-required name-plus-contact format and supported content types were accepted. The collector remains implemented, but this source error is isolated: the other collectors continue, their successful evidence is retained and the job reports `complete_with_errors`. No more time is being spent on EDGAR in this phase.
- Google News RSS was blocked by its `robots.txt`; WhyNow continues to respect that. News collection now uses dated Serper News results inside the authorized query budget.
- The Wikidata API path was disallowed by its current robots policy during the check. Free-search firmographics still produced the receipted tiers above; no access control was bypassed.
- Databricks's Greenhouse board exceeded the earlier 8 MB ATS-only ceiling. The offline fix raises only ATS JSON to 16 MB. No new fetch was made for this checkpoint.

This is a correctness-first checkpoint: successful evidence stays visible, zeros stay zero, failures cannot block unrelated sources, and no historical trigger is presented as “why now.”
