# General pipeline v5 — Phase 1 offline verification

Date: November 14, 2026. Scope: Phase 1 only of [the owner-approved plan](GENERAL-PIPELINE-PLAN.md). Phase 2 is not authorized.

## Result

Versioned seller playbooks, independent human review, timing-slot wiring and organization-only lookalike discovery are implemented offline. Tiering, the kill engine, decisioning and Act now eligibility retain their existing rules. No fit gate or minimum score was added. The only scoring input changed by an approved playbook is why-now/activePain; strength maps to strong5/medium3/weak1 within the existing weighted scorecard. No profile or playbook was approved during this work.

The plan/authorization was committed first (`23e2452`), followed by the owner's unchanged-eligibility clarification (`c33c0de`). Green implementation steps: playbook/review `1f06e95`, timing compatibility `3ac2f82`, and company-lookalike discovery/provenance `fb57953`. Final hardening and verification are committed with this report.

## What was built

- Seller-profile playbooks have their own version, receipt inventory, status, approval digest and audit events. Receipt IDs resolve against saved seller evidence. Missing receipts, invalid windows, missing strong triggers and unsupported factual policy claims produce blocking review warnings. Roles and triggers are editable; approval acknowledgment starts unchecked. Changes invalidate only playbook approval. Seller-profile edits invalidate their dependent playbook approval too.
- The focused targeting schema/prompt now includes the playbook. A separately testable one-call proposal builder can use an existing seller packet for a future bounded verification request; it has no automatic execution path. Generation only stores needs_review proposals.
- Approved source-specific timing rules use original ATS publication, title/department matching, early-career exclusion, dated event receipts, keyword windows and strength. Existing incident-quality and executive corroboration rules remain. Timing projection preserves permanent evidence used by tiers/kills. Unapproved, edited or missing playbooks use the exact legacy path.
- Apollo is off by default with zero run/month limits. Its client allows organization enrichment and company search only; it sanitizes organization estimates, reserves attempts durably per workspace before requests, counts its single 429 retry, stops on errors and rejects changed seller revisions. Keys stay in environment/request headers only. Guarded runtime, robots and private-address protections remain.
- Lookalike discovery enriches approved customer domains, derives a shared estimated industry/country/employee/technology pattern, searches companies, excludes seller/customers/competitors/existing kills, deduplicates domains and retains rejection reasons. Shared patterns and returned organization estimates get dated saved-source receipts labeled Apollo. Segment ambiguity stays under review. Existing kills are retained.
- Ordinary new sellers default to lookalike discovery; optional trigger search and frozen Resolve discovery remain available. Background jobs keep separate Apollo/Serper counters. Account pages show Found via, matched pattern, dated source estimates and customer-pattern receipts. Draft guidance receives the matched message angle without promoting that guidance into a factual claim.

## Tests and Resolve parity

Full suite (`npm test -- --maxWorkers=4`): **82 test files passed; 409 tests passed, 1 intentional skipped test (410 total)**. [Complete output](GENERAL-PIPELINE-PHASE-1-TESTS.txt).

New tests use hand-written fictional organizations and injected responses, clocks and transports. Existing frozen Resolve/reference fixtures remain the compatibility inputs; none was fabricated or updated to fit the result. Coverage includes schema/receipt grounding, explicit approval/revision guards, real HTTP review routes with temporary fictional state, timing source/window/strength, job exclusions, incident-quality and event-date checks, permanent kill evidence, generic seller outreach wording, Apollo caps/retry/restart/workspace isolation, retained exclusions, estimates and provenance UI. No test calls a live provider. Two runs at the default worker count timed out in the existing local saved-packet/schema replay; that test passed alone in 0.9 seconds and the complete four-worker run passed in 8.66 seconds. No test assertion or timeout was changed.

Read-only replay of all **33 saved Resolve accounts** produced identical score and decision results before and after adding the deterministic, unapproved playbook proposal to an in-memory copy. The committed compatibility test also checks the frozen Coalition hiring fixture: **Coalition remains Act now at fit37, Tier1**. Current frozen scoring/collector parity tests pass. Conversion does not grant approval or inject seller evidence; until the owner reviews and approves it, fallback preserves Resolve behavior. This is not a claim that a newly approved, edited playbook produces identical scores.

## Browser and state checks

A separate fictional-data server was used for editable playbook fields, Add timing trigger, unchecked/disabled approval, non-nested forms, dated Apollo Found via/pattern receipts, full KILL_EXISTING_CUSTOMER code/reason and a long workspace name without truncation. No approval control was used. That test server was stopped.

The real local server was restarted on port3000 with OpenAI disabled/zero and Apollo, Serper, GDELT, EDGAR, GitHub and scheduler switches disabled process-only. Resolve Today was checked read-only and shows Coalition Act now at fit37/Tier1. Hash comparisons confirm the complete saved Resolve workspace, approved Vercel seller profile, all workspace drafts and .env are unchanged. Vercel's playbook review UI is pending; its approved seller profile is untouched. Gong remains needs_review. No actual-state migration or approval was necessary.

## Limits and Phase 2 proposal — not authorization

No OpenAI, Apollo, Serper, GDELT, ATS, Wikidata, SEC or page-fetch call was made. Therefore Apollo free-plan endpoint access, actual search-filter behavior and credit accounting are **not verified**. Real seller playbook quality and live lookalike discovery are also unverified. Conservative policy validation can require human correction; it never silently rewrites output. Anti-triggers are reviewed policy text with receipts; they do not introduce arbitrary executable kill rules or change the existing kill engine. Contact endpoints, sending, CRM and deployment remain out of scope.

Proposed live budget, requiring separate owner authorization:

1. Exactly **one Apollo organizations/enrich test attempt**, then stop and inspect free-plan access/credit behavior. No people endpoints, paid upgrade or paid Apollo credits.
2. Only after that checkpoint and the owner's continuation: a small Gong run, up to **three customer enrichments plus one company search**, at most ten candidates. Combined maximum **five Apollo attempts** including the first test; a 429 retry consumes that same ceiling, never increases it. Preserve existing monthly usage. If free-plan access fails, stop.
3. Exactly **one Gong playbook-generation call** using saved seller pages, GPT-5.5, low reasoning and an 8,000-output-token maximum. The actual saved-packet request builder estimates **40,335 input tokens** and a conservative **$0.441675 maximum** using the repository's configured pricing assumptions. Proposed temporary process cap: **$0.50**, no retry, restore disabled/zero immediately. Pricing and account entitlement have not been refreshed online in this offline phase.

No Serper, new page fetches, collector refresh, contact lookup or other provider allowance is implied. Phase 3 README/Drive demo-script/checklist and screenshot refresh remains a later plan step, after verification.

## Changed files

All paths below are relative to the WhyNow repository. Includes the plan/authorization commits and this checkpoint; private ignored notes and screenshots are excluded.

- `.env.example`
- `AGENTS.md`
- `CLAUDE.md`
- `docs/BUILD-CHECKLIST.md`
- `docs/GENERAL-PIPELINE-PHASE-1-TESTS.txt`
- `docs/GENERAL-PIPELINE-PHASE-1.md`
- `docs/GENERAL-PIPELINE-PLAN.md`
- `docs/TRACEABILITY.md`
- `scripts/collectors/apollo.cjs`
- `scripts/collectors/playbook-news.cjs`
- `scripts/collectors/runtime.cjs`
- `scripts/collectors/search-evidence.cjs`
- `scripts/discovery-runner.cjs`
- `scripts/lookalike-discovery.cjs`
- `scripts/onboarding/draft-icp-targeting.cjs`
- `scripts/onboarding/draft-playbook.cjs`
- `scripts/onboarding/manual-profile.cjs`
- `scripts/onboarding/playbook-page.cjs`
- `scripts/onboarding/profile-page.cjs`
- `scripts/onboarding/routes.cjs`
- `scripts/onboarding/synthesize.cjs`
- `scripts/onboarding/validate.cjs`
- `scripts/outreach-drafts.cjs`
- `scripts/outreach-model.cjs`
- `scripts/phase-a-config.cjs`
- `scripts/phase-b-config.cjs`
- `scripts/phase-b-runner.cjs`
- `scripts/playbook-timing.cjs`
- `scripts/playbook.cjs`
- `scripts/prepare-demo.cjs`
- `scripts/score-account.cjs`
- `scripts/scoring.cjs`
- `scripts/server/phase-a-pages.cjs`
- `scripts/server/router.cjs`
- `tests/apollo-lookalike.test.mjs`
- `tests/chunk2-browser.test.mjs`
- `tests/fixtures/pipeline/apollo-fictional.mjs`
- `tests/fixtures/pipeline/fictional.mjs`
- `tests/playbook-outreach.test.mjs`
- `tests/playbook-routes.test.mjs`
- `tests/playbook-timing.test.mjs`
- `tests/playbook.test.mjs`
- `tests/prepare-demo.test.mjs`
- `tests/trigger-first-runner.test.mjs`
