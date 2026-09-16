# Stage 0 traceability

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
| Real page receipt | Local admin fetch action | Pending destination-specific email disclosure permission |
| Browser check | /collectors | Browser connection failed to initialize; visual verification pending |

Stage 1 results: Node 22, 3 test files passed, 19 tests passed. Production dependency audit: zero vulnerabilities. Tests use local responses, temporary data and local HTTP only.

Design note: default transport uses built-in HTTPS with pinned DNS, while tests inject a fetch-like adapter. This closes the DNS re-resolution gap without adding an unapproved HTTP dependency. CI and Gitleaks remain configured but have not run remotely.

Known development limitation: usage is persisted when the debug job finishes; process death during the job can lose its latest usage count. The local debug action serializes jobs. This is not yet a production collector service.
