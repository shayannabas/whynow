# Stage 2 — In progress, not accepted

Current audit (2026-09-16), checked against Implementation Plan v4 in Drive:

| Requirement | Status |
| --- | --- |
| Name-only entry and honest waiting/results screen | Implemented and browser-checked; not automated research |
| Candidate resolution and explicit selection | Implemented; search adapter tested offline; live search intentionally disabled |
| Manual seller facts, receipts, ICP editing and approval | Implemented with tests; external first-party customer-source classification remains pending |
| Workspace list, status, created/approved dates, archive | Implemented, with restore, stale-action protection and tests; page and confirmation browser-checked |
| Background research with bounded discovery, page storage and progress | Not implemented |
| LLM wrapper, source-only synthesis and generated-schema validation | GPT-4o mini wrapper implemented and offline-tested with strict output, caching and fail-closed budgets; synthesis and field-level grounding remain pending; paid calls stay off |
| Resolve reference configuration and three real sellers' saved-page fixtures | Not implemented; cannot substitute invented evidence |
| Monthly re-research and approval-required diffs | Not implemented |
| Three real names complete in under three minutes with at least 90% receipted fields | Not run; requires the research implementation and real configured providers |

OpenAI paid calls remain disabled by owner instruction. On September 17 the owner authorized local-first Serper integration using a key shared with permission, but the key is not yet stored locally and no Serper call has run. Name-first and manual onboarding do not invoke providers merely because keys are present. Stage 3 has not started. Do not claim all offline Stage 2 work is complete.

Workspace management retains all saved records when archived and hides archived workspaces from switching. Restore returns an approved profile to needs_review, clears current approval and stays in Demo mode. Lifecycle changes have audit events and stale-revision checks. Automated tests cover lifecycle, isolation, restart, origin checks, local-only access and the manual provider-disable gate. Full suite: 41 passing tests on Node 22.

## Earlier implementation notes

Current primary experience: enter a company name on Overview or `/onboarding`, then open `/onboarding/results`. Posting `/onboarding/start` creates a draft Demo workspace with a versioned research-intent record. Repeated submissions reuse a waiting request for that name. No provider is invoked, even if keys are present. Every step is not started, facts/sources are empty, ICP is absent and approval is disabled. Existing manual profiles are preserved; manual selection remains at `/onboarding/manual` as a fallback. Vercel is used as a name-only test, with no invented domain or company facts.

Owner decision: AI remains disabled; the owner will choose APIs before any are enabled. No new provider dependency was added.

Implemented first increment: the `/onboarding` page accepts a seller name and supplied HTTPS website, offers explicit company confirmation, and persists the selection in the active draft workspace. Search candidate resolution is testable against recorded responses using the existing Serper adapter; no search key is currently configured. Supplied URLs and search snippets remain unverified. Selecting a company does not approve a profile or activate a workspace.

Manual review increment implemented: `/onboarding/profile` lets the owner edit product category, description, pricing, target size, value propositions, proof, credentials, target industries, customers and competitors, with source links and optional quotes. Customer/competitor entries require URLs. A matching quote in a saved source is labelled matched; other claims stay inferred/unverified, including after approval. Customer quote matching is restricted to seller-domain sources in this manual increment (external first-party press-release classification is not yet implemented).

The ICP form supports 3–10 segments at approval, 4–8 custom search phrases per segment or deterministic strategy defaults, buyer/champion/excluded roles, signal and trigger keywords, size and disqualification patterns, and source preferences. Starting weights, SLAs and tier rules are configuration defaults, not seller facts. Every save requires review; approval requires explicit acknowledgement, marks the workspace active in Demo mode, and appends a workspace-scoped audit event. Editing an active profile removes approval. Revision checks reject stale tabs. No provider is called by this flow.

Remaining Stage 2 scope is listed in the current audit above. AI synthesis remains disabled by owner instruction and will require separate approval to enable a provider.

The manual workflow is implemented; full automated onboarding and three-seller acceptance are not complete. Earlier browser connection failures were resolved for the name-first and workspace-list checks. Full manual form browser acceptance remains pending; do not infer it from passing HTTP tests.
