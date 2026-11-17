# Pump first-party research results — November 17, 2026

The one-use batch `pump-part-a-nov17-2026-one-use` saved 18 first-party pages and stopped at the approved request-size preflight. Pump remains a draft with evidence ready. The run produced no seller profile, ICP segments, playbook or review warnings.

| Request | Estimated input tokens | Output token cap | Maximum estimated cost |
| --- | ---: | ---: | ---: |
| Seller facts | 40,548 | 8,000 | $0.442740 |
| Customer and competitor candidate review | 4,134 | 8,000 | $0.260670 |
| ICP and playbook | 45,770 | 8,000 | $0.468850 |
| Total | 90,452 | 24,000 | $1.172260 |

The total fits the $1.35 cap. Seller facts and targeting exceed the separate 40,000 estimated input-token limit per request. Actual OpenAI usage and cost were **0 calls and $0**. Apollo and Serper both used zero requests.

The page budget was fully used: 20 content attempts, 2 sitemap attempts and 3 robots requests. A homepage redirect counted toward the content limit. A script fragment was picked up as a link and returned 404. The saved pages cover the homepage, customers index and customer stories. Customer stories filled the content budget before comparison, pricing and about pages could be saved.

## Customer evidence for review

These are company names read from Pump’s own saved case-study titles. The deterministic extractor returned 16 candidates, with four domains supported by links. Several raw candidate names contain headline text, which the focused organization review would normally clean up. The names below are a reading of the receipts. The app has not saved them as customers on a seller profile. The saved pages yielded zero deterministic competitor candidates.

| Company | Saved Pump case study |
| --- | --- |
| Daemo.ai | [Daemo.ai](http://127.0.0.1:3000/sources/c68c9001f89c10b6f9a49936) |
| GeoServes | [GeoServes](http://127.0.0.1:3000/sources/341b521fee3f1478985c9cb2) |
| beehiiv | [beehiiv](http://127.0.0.1:3000/sources/3cdf235c406becabab28f321) |
| Finsera | [Finsera](http://127.0.0.1:3000/sources/e21db6c69dd44f42480be61f) |
| ForUsAll | [ForUsAll](http://127.0.0.1:3000/sources/228e56a060de56d5821d94cc) |
| Greybeam | [Greybeam](http://127.0.0.1:3000/sources/398a046570212adc4191831b) |
| HEO Space | [HEO Space](http://127.0.0.1:3000/sources/98d623d3b72927d890a93b70) |
| ICANotes | [ICANotes](http://127.0.0.1:3000/sources/fe9a35c7315615c31bd472d1) |
| EasyEcom | [EasyEcom](http://127.0.0.1:3000/sources/a84769e6408ab53185d02aba) |
| Salesforge | [Salesforge](http://127.0.0.1:3000/sources/0f35d8ead8e254e85c63a56b) |
| Tellonym | [Tellonym](http://127.0.0.1:3000/sources/94581d76150feb5f654fb849) |
| Terra | [Terra](http://127.0.0.1:3000/sources/686dd941dc8d8edf778b28cf) |
| UserGems | [UserGems](http://127.0.0.1:3000/sources/bfdf5e68b875690cb91207d7) |
| Whalesync | [Whalesync](http://127.0.0.1:3000/sources/c6f18f9f24a2c3310f3d6f28) |
| Zil Money | [Zil Money](http://127.0.0.1:3000/sources/2c0c9a83c11dcfad0a95a896) |
| Olio Labs | [Olio Labs](http://127.0.0.1:3000/sources/64a5646ea6958a1bb7321bd1) |

## Review and restoration

[Local research results](http://127.0.0.1:3000/onboarding/results) show the saved evidence in the existing Pump workspace. The active workspace and every other workspace were preserved. No approval was recorded. The local server runs on port 3000 with providers disabled and spending limits at zero. The process-only settings were restored and `.env` is unchanged.

The research fetch allowance is used. Any generation follow-up requires a separately authorized saved-page batch with a request-size limit that fits the actual packets. [Pump Part B](PUMP-ONE-USE-PROPOSAL.md) remains proposal-only.
