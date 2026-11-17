# Vercel final verification — proposal only

Date: November 16, 2026. The owner has now authorized this one final run, retaining Rogo/rogo.ai. Execution still requires the actual saved seller/playbook approvals; no batch marker is consumed before that preflight succeeds. The proposal below records its original review checkpoint. **Not run yet.** The earlier Phase2 batch remains used/exhausted. No provider call or approval was made during this offline follow-up.

## Offline fixes and current review state

Vercel playbook **v1 remains needs_review**, with the policy/receipt digest unchanged. Only derived validation metadata was refreshed. Seller approval/revision5, all drafts, Resolve and .env remain unchanged.

Narrow validator exceptions now recognize the seller's own brand, named products in its approved product description/catalog, approved competitors and SOC2 / ISO27001 / PCI DSS / HIPAA / GDPR. Other metric, personal-name, unsupported-entity, receipt, role, strength and freshness checks remain. The same workspace context is used by generation, save, review and approved-policy reads.

Re-validation: **4 → 2 blocking warnings**:

| Trigger | Code | Remaining reason |
| --- | --- | --- |
| t6: enterprise governance | UNSUPPORTED_NAME | The existing combined-name heuristic flags the joined identity-keyword sequence “Okta Entra RBAC”. Those terms were not added to the requested seller/product/approved-competitor/compliance exception list. |
| t7: platform comparisons | UNSUPPORTED_NAME | The same heuristic flags the remaining “Cloud Kubernetes Render Workers OpenNext” sequence after the approved competitors are recognized. No broader name-rule relaxation or keyword rewrite was made. |

The numeric warning for compliance identifiers and the “Position Vercel” warning are gone. These remaining combined-keyword warnings may still be heuristic false positives; they were not silently cleared outside the requested exceptions.

**One advisory:** t7 source `other` shows “No data source yet”. It never contributes to timing evidence. The source note itself does not block approval; t7's separate name warning still does. `apollo_firmographic` likewise has no implemented timing-change collector: its current organization snapshots are estimates, not dated buying events. ATS, news, Statuspage and SEC have implemented event collectors; an off switch is distinct from a missing collector.

The saved output was not regenerated, rewritten, version-bumped or approved. Future timing requires the owner to approve a reviewed playbook; this final batch cannot silently use legacy fallback.

## Apollo diagnosis and safe diagnostics

The owner checked Apollo's web app and reports Rogo's primary domain is **rogo.com**, the Weather Company's is **weathercompany.com**, and failed lookup usage was **0 credits**, with95/95 remaining. This is owner-supplied evidence, not another API result. The previous StepA miss is now understood as a domain miss, rather than proof of an access problem. Its original provider response body cannot be recovered from the sanitized old cache; the old batch is not repeated.

The company client now saves top-level response keys, bounded error/message fields, rate-limit/credit headers and numeric credit-usage metadata in the run's Apollo diagnostics. Only known diagnostic text is kept verbatim; unknown free-form text is redacted because it may echo contacts or credentials. Keys/auth/cookies, person/contact records and arbitrary provider bodies are never retained. Company response fields are sanitized before cache writes. An empty HTTP200 has its own not-found code; a returned different domain is an unconfirmed suggestion. HTTP200 refusals, paid usage and all HTTP errors are distinct stop conditions.

No approved customer domain changes automatically. An optional bounded fallback records each not-found/mismatch reason in `customerLookups`, proceeds only to another approved confirmed customer, and retains matching-company corrected domains as unconfirmed suggestions. It does not enrich an unconfirmed correction or edit the seller profile. Unknown/no usable company-search shapes stop rather than masquerading as empty search success.

## Proposed first customer and order

**First: The Weather Company → weathercompany.com.** It is an approved Vercel customer, and the owner checked this primary domain in Apollo. This replaces the earlier speculative Stripe-first proposal. It is selected for Apollo-domain confidence; no unverified comparative size claim is needed.

| Order | Customer | Proposed domain | Before execution |
| --- | --- | --- | --- |
| 1 | The Weather Company | weathercompany.com | Owner confirms domain and profile approval; saved domain currently blank |
| 2 | Rogo | rogo.ai | Owner explicitly retained this saved domain for the authorized run; record not-found if it misses, never substitute rogo.com |
| 3 | Sensay | sensay.io | Already in the approved profile; Apollo matching not yet tested |
| 4, optional fallback | Stripe | stripe.com | Existing saved suggestion only; skip unless owner confirms it |

Confirming/editing a domain requires the normal fresh seller-profile approval. This preparation never performs either action. The owner must also resolve/review the two playbook warnings and approve the playbook. Prepared guards report these prerequisites rather than fabricate approval.

## Exact proposed caps

| Resource | Hard maximum |
| --- | --- |
| Apollo API attempts, total | **5** |
| Customer enrich attempts | **4**, aiming for3 usable profiles; not-found attempts consume the same allowance |
| Company search | **1 attempt**, page1, per_page25; reserve this attempt while enriching |
| Retries | **0**; HTTP429 is an error and stops this final batch |
| Apollo robots access-control checks | **1** network check at most, if a fresh cache is unavailable; preserve all guards |
| Company candidates checked | **25**, only results from this search |
| Serper queries | **30 shared**: up to25 initial queries (one per candidate), with5 for needed corroboration/follow-up |
| Free ATS APIs | Greenhouse20 + Lever20 + Ashby20 requests maximum |
| Free HN/news API | HN40 requests maximum |
| Free company/receipt pages | engineering_web20 requests shared, for ATS-board identity and receipt verification only |
| Collector robots checks | **30** network requests maximum; never bypass a disallow |
| Free source total | **150** requests maximum across the six source budgets above; existing persisted/day limits may reduce it |
| OpenAI | **0 calls / $0** |
| Template drafts | At most25, only for actual Act now results that pass existing validators |

Apollo uses free-plan credits only, with no purchase/upgrade. Serper's query ceiling is a credit allowance, not a newly verified dollar estimate. Preserve all existing monthly counters; future process ceilings can only add this one run's allowance. No GDELT, SEC, Wikidata, Statuspage, contact lookup, sending or unrelated page research is included in this proposed run.

## Execution recipe after a new owner OK and prerequisite approvals

1. Rebuild the preparation manifest from current approved state. Check profile revision, playbook digest/version and confirmed-domain seed order. Consume a new exclusive marker and durable run/audit record before the first request. The old Phase2 marker stays exhausted.
2. Check Apollo robots with the guarded runtime. If disallowed, stop Apollo; do not bypass. Try the Weather Company domain first. Save diagnostics on every response.
3. An individual HTTP200 not-found saves “Not found in Apollo under this domain” and proceeds to the next eligible seed. A different primary domain is a suggestion only; never silently correct/retry it. Any HTTP error, refusal, unexpected paid charge or changed approval stops the batch.
4. Obtain at most3 usable customer profiles within4 enrich attempts, reuse the initial result, and make at most1 search. If none is usable, do not search or run timing. Show the real pattern/sample size, exclude seller/customers/competitors/existing kills, dedupe domains and retain rejected candidates with reasons.
5. Run supported approved-playbook ATS/news timing on at most25 new candidates. Use a combined approved-news-keyword query per candidate rather than only the first news trigger, plus at most5 explicitly counted follow-ups. No hardcoded Resolve targeting. Shared source budgets and freshness/entity/relevance/deduplication checks remain; absent data stays unknown.
6. Use the existing six-slot scorecard, tiers, kills and Act now eligibility without a new fit gate. Retain all kills. Generate only deterministic Demo merge-field templates for actual Act now accounts; receipt/claim/readability gates still apply. Record blocked drafts instead of inventing facts or people. No OpenAI and no send path.
7. Restore provider flags/caps to disabled/zero process-only, preserve .env, and leave port3000 running disabled. Report exact attempts, queries, pattern, ranked lists, kills, receipts, templates and errors; never repeat a consumed run.

The preparation entry point is `node scripts/prepare-vercel-final-verification.cjs --prepare`. It is deliberately provider-free and has no live execution command. `assertFinalReady` rejects both missing owner authorization and unmet approvals/domain prerequisites. The above is a reviewable proposed run, not permission to execute it.

## Verification

Full offline suite: **86 files,429 passed,1 existing intentional skip (430 total)**. New fixtures/tests use fictional companies only. Tests cover allowed-name/standard positives and unsupported-name/metric negatives, advisory/non-counting sources, safe empty200 diagnostics, secret/contact redaction, refusal stopping, not-found continuation, unconfirmed domain corrections and preparation/approval guards. [Full output](NOV16-OFFLINE-FIXES-TESTS.txt).

Code checkpoint `696ca5b` contains the offline fixes and proposal. The final follow-up adds diagnostic format-edge tests and this report. No provider call or approval was made.
