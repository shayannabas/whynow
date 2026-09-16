# Stage 2 initiation

Owner decision: AI remains disabled; the owner will choose APIs before any are enabled. No new provider dependency was added.

Implemented first increment: the `/onboarding` page accepts a seller name and supplied HTTPS website, offers explicit company confirmation, and persists the selection in the active draft workspace. Search candidate resolution is testable against recorded responses using the existing Serper adapter; no search key is currently configured. Supplied URLs and search snippets remain unverified. Selecting a company does not approve a profile or activate a workspace.

Manual review increment implemented: `/onboarding/profile` lets the owner edit product category, description, pricing, target size, value propositions, proof, credentials, target industries, customers and competitors, with source links and optional quotes. Customer/competitor entries require URLs. A matching quote in a saved source is labelled matched; other claims stay inferred/unverified, including after approval. Customer quote matching is restricted to seller-domain sources in this manual increment (external first-party press-release classification is not yet implemented).

The ICP form supports 3–10 segments at approval, 4–8 custom search phrases per segment or deterministic strategy defaults, buyer/champion/excluded roles, signal and trigger keywords, size and disqualification patterns, and source preferences. Starting weights, SLAs and tier rules are configuration defaults, not seller facts. Every save requires review; approval requires explicit acknowledgement, marks the workspace active in Demo mode, and appends a workspace-scoped audit event. Editing an active profile removes approval. Revision checks reject stale tabs. No provider is called by this flow.

Remaining Stage 2 scope: bounded background research, saved page fixtures for three real sellers, workspace archive/list, Resolve reference profile, refresh diffs, and browser acceptance. AI synthesis remains disabled by owner instruction and will require separate approval to enable a provider.

The manual workflow is implemented; full automated onboarding and three-seller acceptance are not complete. Browser verification is blocked by the browser connection failing to initialize. All 33 local tests passed on Node 22.
