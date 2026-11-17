# WhyNow — General Pipeline Plan (v5)

Date: November 14, 2026. Status: owner-approved direction. Not yet built. This plan supersedes the v4 assumption that new-seller discovery starts from job postings.

## 1. What WhyNow is

Type in the company you sell for. WhyNow figures out who should buy from you, which of them need it right now, and drafts the first email, with a source for every claim.

- SDR / BDR: a short daily list of accounts worth contacting today, each with the reason it is urgent and an editable draft.
- GTM engineer: no hand-built targeting per seller. The tool researches the seller, writes its targeting playbook, and a human reviews and approves it.
- Sales leader: reps spend time on accounts that can buy and have a reason to buy now, and every claim is checkable.

## 2. What changes from v4

v4 found new accounts mainly through job-posting searches. That is Resolve-specific: for Resolve, hiring SREs is the pain itself. v5 is seller-configured. Research writes a per-seller "why now" playbook, the approved playbook supplies discovery and timing triggers. Apollo can enrich companies by domain, with lookalike search available as an explicit opt-in. Resolve becomes one configuration, not the built-in logic.

## 3. End-to-end flow

1. Learn the seller: research produces the seller profile (customers, competitors, size) plus the playbook. A human approves both.
2. Find accounts: default strategy `trigger_search` uses the seller’s approved playbook. The discovery adapters verify ATS postings and dated news articles from the approved playbook. Pump Part B still requires separate authorization. Optional `lookalike` requires the separate Apollo company-search switch. Competitor-customer discovery is a documented next step.
3. Check timing: run the existing timing collectors on candidates according to the approved playbook triggers.
4. Rank: use the existing six-slot scorecard, firmographic tiering, decisioning and kill engine. Tiering and Act now eligibility remain exactly as they are for every workspace, including future playbooks; no new fit gate or threshold is introduced. An approved playbook supplies the why-now / activePain slot's triggers, keywords, freshness windows and strength. When Act now is empty, Today shows a research-only Top prospects list ranked by fit and recent receipted signals.
5. Draft: existing outreach drafting with receipts. The opener uses the matched trigger's message angle.

Company-scoped persona search is covered by Interface v2 in section 12. Contact-detail lookup remains out of scope.

## 4. Playbook specification

Stored inside the seller profile as `playbook`, versioned, with its own approval state.

- `buyerRoles`: `economicBuyer[]`, `champion[]`, `endUser[]` (job titles).
- `triggers[]`: `id`, `label`, `whyItMatters`, `source` (`ats_jobs` | `news` | `apollo_firmographic` | `statuspage` | `sec` | `other`), `keywords[]`, `freshnessDays`, `strength` (`strong` | `medium` | `weak`), `messageAngle`, `receiptIds[]`.
- `antiTriggers[]`: `label`, `rule`, `receiptIds[]`.

Generation: produced by the focused research (targeting) step, grounded only in saved seller pages, with receipt IDs.

Validation: every trigger has at least one receipt; `freshnessDays` is between 7 and 180; at least one strong trigger; no invented companies, people or metrics. Failures appear as blocking warnings on the review page.

Approval: shown as its own section on the profile review page. Editable by the owner. Never auto-approved. Until the playbook is approved, the workspace uses current behavior.

Examples (illustrative, not data):

- Gong: buyers VP Sales / CRO, RevOps, Sales Enablement. Triggers: several sales-rep job postings (strong, ~30–45 days), new sales leader (strong, ~30–90 days), funding (medium, ~90 days).
- Vercel: buyers VP Engineering, Head of Frontend, CTO. Triggers: frontend/Next.js hiring, site re-platform or redesign, major product launch.
- Resolve: buyers VP Engineering, Head of SRE. Triggers: SRE hiring, public incidents, new infrastructure leader.

## 5. Apollo lookalike discovery

Collector `scripts/collectors/apollo.cjs`, limited to `organizations/enrich` and `mixed_companies/search`.

- Key read only from `APOLLO_API_KEY`. Never logged, never in headers in logs, never in Git.
- `APOLLO_ENABLED=false` by default. Company search also requires `APOLLO_COMPANY_SEARCH_ENABLED=true`. Vercel’s HTTP 403 is recorded as a free-plan limitation and was not retried. Persistent per-workspace monthly call counter and a per-run cap. Stop on the first error. On HTTP 429, one retry with backoff.
- Strategy: enrich the approved customers → derive the common pattern (industry, employee range, country, technologies) and show it as receipts → company search with that pattern → exclude the seller's customers, competitors and existing kills → dedupe by domain → keep rejected candidates with reasons.
- Apollo firmographic values are receipts labeled "Apollo" with the retrieval date. They are estimates and must be shown as sourced, not as facts.
- Company discovery uses only these organization endpoints. Section 12 specifies the separate persona search.

## 6. Scoring

The six-slot scorecard, firmographic tiering, decisioning, Act now eligibility and kill engine retain their existing rules for every workspace, including future playbooks. Do not add a fit gate, minimum score or other eligibility threshold. References to fit describe those existing rules, not new thresholds. Only the why-now / activePain slot changes: it reads triggers, keywords, freshness windows and strength from the approved playbook. Until the playbook is approved, current behavior applies. Hiring evidence counts toward why-now / activePain only when the playbook includes an `ats_jobs` trigger. Existing freshness rules stay: original ATS publication date, job title/department matching, executive-change corroboration, early-career exclusion. The Resolve parity test must retain Coalition in Act now even at fit 37.

## 7. What must not change

Receipts for every claim; ungrounded claims stay inferred. Human approval of profiles, playbooks and output. Demo mode default with no send path. Workspace isolation. Retained kills and rejected candidates. Atomic JSON state. Tests never call live providers. Secrets only in environment variables. No contact data in Git, fixtures, docs or logs. Robots and access controls respected.

## 8. Compatibility

- Resolve: its current trigger configuration is converted into its playbook deterministically (no model call). A parity test proves the Resolve ranking is unchanged.
- Vercel: the approved profile stays approved. Its playbook shows "needs review" and current behavior applies until the owner approves it.
- Gong: remains needs_review.

## 9. Phases

1. Build offline: playbook, scoring wiring, Apollo collector and lookalike strategy, UI. Mocked fixtures only, zero provider calls.
2. Live verification (separate owner authorization required): one Apollo test call to confirm plan/credit behavior first, then one small seller run (Gong proposed) plus one research call to generate its playbook. Codex proposes the exact budget; nothing runs without owner approval.
3. Docs and demo: update README, Demo Script, Live Build Checklist and screenshots only after the build is verified.

## 10. Out of scope

Contact-detail lookup and enrichment, sending, CRM sync, deployment, paid firmographics beyond the Apollo free plan, and competitor-customer discovery (documented next step only).

## 11. Acceptance criteria (Phase 1)

- Playbook schema, validator, generation prompt and review/approval UI exist with tests.
- Resolve parity test passes.
- Why-now slot reads from the approved playbook, with a fallback when unapproved.
- Apollo collector and lookalike strategy pass fixture tests with fictional companies; zero live calls.
- Account page shows "Found via" and the matched pattern.
- Kill Log shows full kill code and reason; sidebar workspace name is not truncated.
- Full test suite and CI green; BUILD-CHECKLIST and TRACEABILITY updated.

## 12. Interface v2 + ICPs

**Offline only.** no provider calls of any kind. Hand-written fictional fixtures only. Do not change Act
now eligibility, the scorecard, tiering or kill rules.

The owner authorized offline implementation on November 17, 2026. Apollo people search
(`mixed_people/api_search`) is in scope for personas. PhantomBuster, LinkedIn scraping,
email and phone reveal, sending and CRM stay out of scope. This section is committed before implementation.

Use WhyNow’s own design, branding and copy.

### A. First-class ICPs
1. Every workspace gets icps[] objects: id, name, description, firmographics (industries,
   employee range, geographies, funding stages, tech-stack keywords), buyer personas (titles,
   from the playbook buyer roles), linked playbook trigger ids, exclusions, query rules
   (sources, freshness days), receipts and a version.
2. They're generated automatically when a company name is entered, from the existing research
   output (ideal-customer segments + targeting + playbook). No extra model call. For existing
   workspaces (Pump, Vercel, Resolve reference), derive them deterministically from saved
   output.
3. ICPs are reviewed and approved with the seller profile (never auto-approved), and
   editable/versioned in a new "ICP Studio" page.
4. Discovery builds its queries per ICP x playbook trigger, and every query is visible (the
   "Queries" tab). Every candidate stores matchedIcpId plus the reason it matched. Matched ICP
   is a label and filter only. It is not a new fit gate.

### B. Results
1. Header: title, subtitle, actions "Save search", "Export" (local CSV download) and
   "Find missing contacts" (Part C). No CRM button.
2. Tabs: Companies, Contacts, Signals, Sources, Queries, Runs.
3. Filter chip bar, each chip removable with "+" to add: ICPs, Funding, Hiring, Tech stack,
   Geography, Sources, Query rules (freshness), Exclusions (with count). Signal-type chips
   (Funding, Hiring, etc.) are generated from the seller's approved playbook, so each seller
   only sees chips that apply to it. Nothing Resolve-specific.
4. Search box; discovery-session pills (All sessions / Latest / each run date with counts);
   status pills (All, Tier 1, Tier 2, Tier 3, Needs review, Approved, Blocked, Archived).
5. Table columns: checkbox, Company (initials badge + domain), Matched ICP, Top signal, Score
   badge, Tier, Evidence (N sources), Contact (Ready / Missing), Status.
6. Saved searches are stored per workspace.

### C. Priority leads and personas
1. Left panel "Priority leads": sorted by urgency, fit and review status, with tier tabs and
   counts. Each card shows the signal category label (small caps, e.g. RECENT FUNDING),
   company, matched ICP and tier, a status chip (Contact path / Needs enrichment / Review
   required) and the score.
2. Right panel, account detail: "Find personas" uses Apollo mixed_people/api_search, filtered by
   the playbook buyer roles and the matched ICP personas, max 10 people per account. Show name,
   title and a LinkedIn link that opens externally. No email or phone reveal, no people/match,
   no LinkedIn scraping.
3. Fallback that always works and costs nothing: for each buyer role, a "Search on LinkedIn"
   link (LinkedIn people-search URL built from title + company). The user clicks it; nothing is
   fetched.
4. Contact column = "Ready" when at least one persona with a LinkedIn link exists.
5. Drafts: deterministic template drafts per persona, personalized by role + trigger, using the
   existing validators and merge fields. Copy-only, no send path.
6. Privacy: person data lives only in local app state (.whynow). Never in Git, fixtures, docs,
   logs, committed screenshots, or caches beyond local state. Apollo key only from .env, never
   logged. People search stays off by default with per-workspace call caps; its live check
   needs my separate OK.

### D. Interface and navigation
1. One consistent design system: spacing, type scale, chips, badges, tables, cards, empty
   states. No truncated labels (kill codes, workspace names, chips).
2. Sidebar groups:
   - Workspace switcher at the top.
   - PIPELINE: Overview, New discovery, Results, Review queue.
   - DATA: History, Runs, Funnel, Scorecard, Kill log, Exports, Metrics.
   - SETUP: ICP Studio, Seller profile & playbook, Settings.
   Keep the existing History, Runs, Funnel, Scorecard, Kill log and workspaces features.
3. Remove clutter: merge duplicate pages, hide internal or debug text from main views, keep
   receipts one click away.

### Tests and verification
- Full suite green. New tests for ICP derivation, query building per ICP x trigger, filters,
  saved searches, people-search caps/privacy (fictional fixtures) and the LinkedIn fallback URL.
- Browser-check every changed page at desktop width with fictional data.
- Update BUILD-CHECKLIST and TRACEABILITY. Small commits, push, CI green.
- Keep port 3000 running with providers disabled.

Report the changes, show fictional screenshots of Results, Priority leads, ICP Studio and
an account with personas, and propose one Apollo people search followed by at most ten
requests per top Pump account. The proposal confers no live authorization.
