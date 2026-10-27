# SignalScout UI port — local demo

Verified October 26, 2026. Public reference: SignalScout by Isa Iqbal, `flowfire` commit `130789f1bac1d5e11f5f5154f269155dc17f2d21`. Reference files were read-only; no environment file or secret was read/copied.

This is the source design system and in-scope workflow layout adapted to WhyNow, not a claim that every SignalScout production feature exists. WhyNow keeps its own branding, workspace switcher, explicit human review, JSON state and send-free Demo mode.

## Screen map

| Local route | UI and behavior |
| --- | --- |
| `/today` | KPI strip, Daily Brief, ranked full-width Act now cards, Worth researching and Needs review, collapsible Prepare/Refresh operations |
| `/results` | Separate ranked account rail and selected detail; search/tier/sort; Overview, Outreach, Evidence and Score tabs; kills available explicitly and retained in Kill Log |
| `/` or `/overview` | Seven-day saved-account chart, receipt gauge, real KPIs and five-column account board; server-side search/filter/sort |
| `/accounts` | Canonical account table; name/domain/segment/source manual entry; segment/tier/fit/decision filters |
| `/accounts/:id` | Account work with previous/next, actual score confidence/tier, status form, guarded refresh, dated trigger and signal receipts |
| `/discovery` | Saved ICP discovery plan, query preview, segments, saved run/task monitor, latest/all scope and filters |
| `/scorecard` | Tier × Fit matrix with working filter drilldowns; full six-signal table using real configured weights |
| `/kill-log` | Retained primary/secondary decisions, actual company tier/fit, reason and clickable source |
| `/history`, `/runs`, `/funnel`, `/metrics` | Actual workspace audit/job/discovery/evidence data; no fabricated outreach activity or contact coverage |
| `/collectors` | Saved refresh/source health plus the existing guarded local public-page checker |
| `/workspaces`, `/onboarding`, `/onboarding/results`, `/onboarding/profile` | Same design language; original isolated research/review actions, revision checks and explicit approval gates |

## What was actually checked

- Full `npm test`: 58 files passed, 296 tests passed, one pre-existing future golden-set scaffold skipped (297 total). Fifteen new UI tests cover shell, renderers, saved evidence, route sweep and stale-workspace actions. Tests use recorded/in-memory data and local HTTP only.
- Browser at desktop 1440×1000, tablet 768×1024 and narrow 390×844: no document-wide horizontal overflow in checked layouts; table/board scrolling remains inside its own container.
- Results search picks a visible account; killed accounts are excluded by default. Tabs, deep links and Back work. The matrix's whole link area now navigates, not just its text.
- Saved evidence remains inspectable even when there are no trigger records. Blank-signal score priors are labeled unknown/low-confidence, not observed negative evidence. Killed companies keep their actual firmographic tier.
- Workspace switching and Vercel review were inspected without saving or approving its profile. Its two blocking warnings and unchecked acknowledgment remain visible.
- The real Resolve local workspace was still at v5, without approved framing/closings. Clicking the existing **Load Resolve reference demo** refreshed only the frozen demo configuration to v7, preserving its accounts/kills and leaving it `reference_demo`, not approved.
- Coalition's deterministic template was created through the browser without APIs. The Copy output exactly matched the visible body; the template persisted across server restart. An invalid generic recipient was rejected with the error still on Outreach. No recipient was invented/saved.
- Persistent `OPENAI_ENABLED=false` and local limit `0` were verified without printing credentials. The loopback demo was started with process-only OpenAI/Serper/scheduler disables. No provider or new page-fetch request was made.

## Deliberate differences and remaining boundaries

- No Apollo/contact lookup, contact-coverage claims, sending, CRM sync or deployment controls were ported. Outreach shows approved persona titles, a literal Demo merge token and Copy only.
- Daily Brief uses WhyNow's existing Act now / Worth researching / Needs review sections. SignalScout's production contact/decay/anti-stranding dashboards are not simulated with invented values.
- Discovery settings remain owned by the reviewed seller ICP; previews are read-only here and link to **Edit ICP**. No fake preview-save action exists.
- Provider-backed actions retain their existing budget/configuration guards and were not live-run for a UI task. A disabled provider is intentional, not a promise of a working paid integration while off.
- Vercel still needs owner correction/review. Gong is not a completed research profile. Nothing in this UI port approves either one.
- Recorded model drafts are not silently imported into state; the browser template is the deterministic local fallback. New paid generation requires separate authorization.

No software check can prove that every possible input is bug-free. These are the verified demo paths, not a blanket production reliability claim.
