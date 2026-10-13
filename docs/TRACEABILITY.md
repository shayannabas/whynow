# WhyNow traceability

## Stage 2 local completion — 2026-10-13

Closed the remaining local Stage 2 implementation gaps. Seller research now expands its bounded plan from relevant homepage and sitemap links and may accept seller-tied results from the allowlisted Greenhouse, Lever, Ashby and SEC/EDGAR hosts. Redirects must remain on the approved seller or external host. The results screen shows bounded progress events without exposing provider credentials or treating search snippets as evidence.

Completed the editable review surface for all generated targeting settings: segment enablement, six scoring weights, signal definitions and rubrics, source preferences, timing windows, tier rules, messaging guidance and the one-sentence pitch. Numeric and enum values are bounded on the server. Saving creates a new review revision; approval still requires an explicit acknowledgement and keeps delivery disabled in Demo mode.

Added `refresh-runner.cjs`, the persistent monthly coordinator. A due approved seller is copied into a hidden system workspace, the existing bounded research and source-only synthesis pipelines run there, grounding is rechecked, and only a reviewable diff reaches the approved workspace. The original profile stays active. Hidden refresh workspaces cannot appear in the switcher or Workspaces page and cannot be opened directly. Interrupted runs can resume. With the current `OPENAI_ENABLED=false` and zero-dollar limit, the coordinator is dormant and no paid request is made.

Added complete recorded onboarding fixtures for Resolve AI, Shopify and Vercel. All three pass evidence collection, strict grounded drafting, at least 90% receipt coverage, editable review and explicit human approval without provider calls. Resolve's generated segments and buyer/champion personas overlap the frozen reference configuration as required. Browser verification used isolated local state and visibly confirmed the complete generated-review screen, 100% receipt report and monthly before/after approval screen at desktop and 768-pixel widths; no real workspace was changed.

Verification: 18 test files and 93 tests passed. `npm audit --omit=dev --audit-level=high` found zero vulnerabilities. The ignored local `.env` and `.whynow/` state stayed outside Git. The Implementation Plan's real-key three-company paid acceptance is deliberately not claimed because the owner instructed that paid OpenAI remain off. Stage 2 is complete for the current local/no-paid-OpenAI configuration; Stage 3 has not started.

## Stage 2 offline research core — 2026-09-17

Implemented the main name-first research path in `scripts/onboarding/research.cjs`, `research-page.cjs`, `routes.cjs` and `server/router.cjs`. Serper requires an explicit switch, private key and positive persisted caps; the coordinator reserves queries before sending them, hard-limits a run to four searches/twenty pages, requires candidate confirmation, keeps only the selected seller domain, records progress and partial errors, deduplicates concurrent jobs and resumes safe in-progress work after restart. Search snippets never become claim evidence.

Implemented source-only drafting in `synthesize.cjs`, `validate.cjs` and `synthesis-runner.cjs`. Input is a bounded set of saved excerpts. Output must match a strict schema. The server derives source URLs, checks exact quotes, marks unsupported general claims inferred, removes unsupported customers/competitors, counts rejected attempts against receipt coverage, rejects stale outputs and hands successful drafts to the existing editable human-review flow. OpenAI remains disabled with a zero dollar limit; no live AI call is claimed.

Added a frozen, load-only Resolve AI comparison in `config/reference-profiles/resolve-ai.json`, transcribed from the friend's `resolve-gtm.cjs`, `stage3-signals.cjs` and tier rules. It contains targeting configuration but no invented seller profile. Official-page excerpt fixtures for Resolve AI, Vercel and Shopify exercise exact-receipt behavior offline. Their source URLs are `https://resolve.ai/product/overview`, `https://vercel.com/docs` and `https://www.shopify.com/about`.

Added monthly refresh proposal logic and review UI in `refresh.cjs` and `profile-page.cjs`: semantic and receipt-only differences are visible, the active profile is never auto-overwritten, proposals are workspace/revision guarded, approval rechecks saved quotes, rejection preserves the current profile and history is bounded. The automatic monthly provider runner remains paused until paid OpenAI is separately approved.

The final offline audit closed five gaps: refresh approval now checks every non-empty factual field against its matching evidence entry; every AI-created targeting and messaging setting is visible and editable before approval; seller-page redirects are blocked before fetching when they leave the confirmed company domain; stale tabs cannot confirm research, start drafting or approve refreshes after the active workspace changes; and Serper search is fail-closed by default for future callers. The local `.env` containing the authorized Serper key is ignored by Git and restricted to its owner with mode `0600`.

Verification: 16 test files, 84 tests passed on Node 22, including local HTTP flows. Provider tests use injected recorded responses and do not contact Serper or OpenAI. On September 17, a separate owner-authorized live Vercel check used four Serper searches, confirmed `vercel.com`, saved twenty official-domain pages with zero page errors and completed in about forty seconds. The browser visibly showed the completed research state and twenty saved sources at desktop and 768-pixel widths, plus the complete editable review controls at desktop and mobile widths. Paid OpenAI stayed disabled with a zero limit, so no AI request ran. Commit `349d6ac` is published; GitHub tests, the production dependency audit and full-history secret scan passed. Three-seller generated-profile acceptance is still pending; Stage 3 has not started.

## OpenAI foundation — 2026-09-17

Prepared the Stage 2 OpenAI client using the reference project's direct-HTTP GPT-4o mini setup, strengthened to meet WhyNow's requirements: strict JSON-schema output, local validation, timeouts, one bounded retry, persistent conservative usage reservations, per-workspace request limits, cache isolation and redacted errors. `OPENAI_ENABLED=false` and a zero spending limit are the defaults; a key alone cannot cause a request. Seven offline tests use injected responses and never contact OpenAI. The client is not yet connected to onboarding or synthesis, and no paid call is claimed.

## Current audit — 2026-09-16

Stage 2 is incomplete; see STAGE-2-STATUS.md for the requirement-by-requirement checklist. Added Workspaces list, created/approved dates, reversible archive/restore, stale-action checks, lifecycle audit events and exclusion of archived workspaces from switching. Restoring an approved workspace requires another review. No user workspace was archived during browser verification; archive/restore round trips ran against temporary test state. The browser showed both existing companies and the explicit confirmation control. Added Research results and Workspaces navigation while preserving the existing design.

Closed an API-disable gap in manual onboarding: configured keys no longer trigger search through the manual POST route. Full local suite: 7 files, 41 tests passed on Node 22. No new dependencies, API calls or deployment. Name-first increment CI on b314ecb passed; current increment CI is checked after publishing. Historical checkpoints below are retained and are not the current completion status.

Name-first UX update: Overview and `/onboarding` ask for company name only. `/onboarding/start` persists an isolated research request and redirects to `/onboarding/results`, showing “Research not configured,” not-started steps and empty facts/ICP/sources. Approval remains blocked. Four new tests cover Vercel without invented facts, repeated submissions, isolation, escaped/invalid names, no provider calls even with keys present, restart persistence, origin protection and server-side refusal of empty approval. All 37 tests passed on Node 22. No APIs or AI were enabled. Manual entry remains a fallback.

Current checkpoint: repository published at https://github.com/shayannabas/whynow. GitHub CI passed on commit `65a4e8c` (tests, production audit, full-history secret scan). Earlier pending-CI notes below describe historical checkpoints.

Sources: [Implementation Plan v4](https://docs.google.com/document/d/1zRa4eMng9gCy1ehLhbSXvlpVtmBvqgXzJ2sQwhg83E8/edit), [PRD v4](https://docs.google.com/document/d/1t9YUZ33bUCPdxgfFshEvdqCw5S9fdhU40QQECeMkl-0/edit).

| Requirement | Implementation | Verification |
| --- | --- | --- |
| Node 22, CommonJS, allowed dependencies | package.json, .nvmrc, CI | Seven tests passed on Node 22.23.2 |
| Environment loader, env-only settings | scripts/env.cjs, .env.example | Configuration precedence test |
| Versioned state, atomic replacement, fsync, backup | scripts/server/state.cjs | Interrupted save, recovery and corrupt-file tests |
| Workspace creation and isolation | state.cjs, actions.cjs | Copy isolation and HTTP restart tests |
| esc, stableId, nowIso, json | scripts/utils.cjs | Escaping and ID tests; health uses JSON helper |
| Overview, wordmark, sidebar, switcher, empty state | pages.cjs, styles.cjs | HTTP verified; visual check blocked by browser policy verification failure |
| Local font, tokens, delegated navigation | pages.cjs, styles.cjs, router.cjs | Font HTTP test passed; visual/navigation browser check pending |
| Health, 404 and generic errors | router.cjs, server.cjs | HTTP tests |
| CI installation, tests, audit, secret scan | .github/workflows/ci.yml | Configured; remote run pending repository publication |

No later-stage seller research, collection, scoring, contacts, outreach, auth or deployment is implemented.

This sentence describes the Stage 0 checkpoint. Stage 1 infrastructure is added below; seller research and prospect collectors are still absent.

## Verification results

- Node 22.23.2: 1 test file passed, 7 tests passed (135 ms test time).
- `npm audit --omit=dev --audit-level=high`: found 0 vulnerabilities.
- The initial sandbox test attempt blocked localhost binding (`EPERM`); rerunning with localhost permission passed.
- Browser tool refused localhost access because it could not verify an admin-enforced policy. No visual check is claimed. Still required: inspect at 1280px and 768px, create a workspace, switch it, and verify the rendered screen after restart.
- GitHub Actions and Gitleaks are configured, but have not run remotely. No GitHub remote was created or existing flowfire remote reused. Stage 0 acceptance remains pending browser verification and a green remote CI run.

## Stage 1 traceability

| Requirement | Implementation | Verification |
| --- | --- | --- |
| CollectorRuntime, identifying email gate | scripts/collectors/runtime.cjs | Missing identity rejected before requests; correct header tested |
| Public HTTPS and SSRF guard | runtime.cjs | Private IPv4/IPv6, encoded IPs, mixed DNS, credentials, ports, redirect targets tested |
| Budgets, pacing, TTL cache, source health | runtime.cjs; workspace budgets in router.cjs | Concurrent budget limit, hit/miss/expiry, saved counters across restart |
| robots.txt, timeouts, bounded responses | runtime.cjs | Disallow, errors, missing robots, delay, timeout, binary and size rejection |
| Common normalization helpers | scripts/collectors/common.cjs | Inferred receipt behavior, text stripping, attribution checks |
| Serper adapter | scripts/serper.cjs | Recorded empty response; no key in cache or health |
| Versioned source store and grounding | scripts/sources.cjs | Revision preservation, defensive copies, exact whitespace-normalized quote and paraphrase rejection |
| Admin Collectors page, debug job, source view | scripts/server/collectors-page.cjs; router.cjs | Local HTTP workflow, production and origin denial, switching isolation |
| Real page receipt | Local admin fetch action | Passed after explicit approval: Node.js About page and robots.txt both returned HTTP 200; 5,834 characters stored |
| Browser check | /collectors | Browser connection failed to initialize; visual verification pending |

Stage 1 results: Node 22, 3 test files passed, 19 tests passed. Production dependency audit: zero vulnerabilities. Tests use local responses, temporary data and local HTTP only.

Design note: default transport uses built-in HTTPS with pinned DNS, while tests inject a fetch-like adapter. This closes the DNS re-resolution gap without adding an unapproved HTTP dependency. CI and Gitleaks remain configured but have not run remotely.

Known development limitation: usage is persisted when the debug job finishes; process death during the job can lose its latest usage count. The local debug action serializes jobs. This is not yet a production collector service.

Live acceptance: on 2026-09-16 at 01:44 UTC, the local admin action fetched https://nodejs.org/en/about, with the owner-approved crawler identity. It checked robots.txt (HTTP 200), fetched the page (HTTP 200), and persisted source `79978f3faa54ac3e426523e1`, titled “Node.js — About Node.js®”, with 5,834 characters. Verified by reading saved state. Browser verification and remote CI remain pending. The local repository has no GitHub remote.

## Stage 2 initiation checkpoint

Owner requested AI remain disabled and will select providers separately. Implemented company identification and explicit candidate confirmation under `/onboarding`, scoped to the active draft workspace. Supplied websites require no provider calls; unconfigured search returns a website-entry fallback. Candidate text remains unverified and confirmation does not activate a workspace.

Five new tests cover supplied websites without provider calls, ambiguous/deduplicated matches, zero results, invalid URLs, HTML escaping and forged selections. All 24 tests passed on Node 22. This is the initiation increment only; full research, profile review and three-seller acceptance are not complete. See `STAGE-2-STATUS.md`.

## Manual seller profile and ICP review

Implemented in `scripts/onboarding/manual-profile.cjs`, `profile-page.cjs`, and `routes.cjs`. Profile and ICP drafts are workspace-scoped and versioned. Source links without exact saved quotes remain unverified; manual approval does not change evidence labels. Customer evidence requires seller-domain saved quotes. Approval requires category, description, target size, industry, 3–10 segments, buyer and champion roles, and explicit review acknowledgement. Save moves to `needs_review`; approval moves to `active`, always in Demo mode with delivery disabled. Later edits revoke approval. Revision checks protect against stale forms. The audit log records approval with workspace ID and unverified count; hash-chain hardening remains Stage 3.

Nine new tests passed: defaults and draft shape, approval acknowledgement and unverified claims, incomplete/reapproval gates, stale forms and workspace isolation, customer receipt rules, exact quote/paraphrase distinction, schema bounds and unsafe links, escaped rendering with error-form preservation, and local HTTP save/review/approve with origin and workspace checks. Total: 33 tests passed on Node 22. Browser verification remains blocked by a connection initialization error, not presented as completed.
