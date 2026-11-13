# Final local demo checkpoint — November 12, 2026

The offline close-out is complete. No live research, provider generation, profile approval, contact lookup, sending or deployment was performed. Git history is unchanged. The demo remains local on port 3000 with provider/scheduler switches disabled.

## Hiring fixes and saved evidence

- Greenhouse: `first_published`; Lever: `createdAt`; Ashby: `publishedAt`. `updated_at`, detection time and collection time cannot substitute for original publication. Missing or future publication produces no hiring trigger. Expiry is calculated from occurrence even when a detection timestamp is present.
- Role relevance uses job title and department only. Description text can supply supporting technology facts after a role qualifies, but cannot make Legal Counsel into an engineering buyer.
- Collection, trigger-first verification, hiring velocity, saved-evidence repair and defensive active-trigger checks use these rules. Historical reference captures remain unchanged except neutral provenance labels; parity tests explicitly document the intended date/field differences.

| Saved posting | Original publication | Last update | Correct result |
| --- | --- | --- | --- |
| Canonical — Engineering Manager - Web | Dec 15, 2022 | Aug 5, 2026 | Expired; not a new hire trigger |
| Canonical — Legal Counsel – Commercial & Technology Transactions | Oct 23, 2026 | Oct 23, 2026 | Operations/legal title; company boilerplate cannot qualify it |
| Okta — Principal Site Reliability Engineer | Jun 15, 2026 | Sep 21, 2026 | Expired; its 60-day AI-RCA window ended Aug 14 |
| Coalition — Senior Site Reliability Engineer | Oct 8, 2026 | Oct 8, 2026 | Inside its 90-day window; Act now |

The explicit request to retain Okta in Act now conflicts with its actual original date. The date rule wins: Okta is Unranked, fit 38/Tier 1, with its saved GPT-5.5 draft still visible and the no-current-trigger gate shown. Coalition remains Act now, fit 37/Tier 1, with template v2. No date or threshold was changed to keep an account artificially fresh.

The offline atomic repair is idempotent. Original timestamps remain in audit metadata, rejected/expired triggers remain in history, and all seller profiles, ICP configurations and saved drafts are byte-equivalent as JSON to the pre-repair snapshot. No recipient information was added to Git.

## Current queues

Resolve: **1 Act now** (Coalition); **4 Worth researching** (Instacart, Airbnb, HubSpot, Gemini); **11 Needs review**; **2 active kills** (Atlassian and Grafana Labs). Okta and CrowdStrike have historical drafts; they are not fresh why-now accounts.

Vercel: **0 Act now / 0 Worth researching / 1 Needs review** (Canonical), no active kills. The owner's approved revision 5 and manual messaging are unchanged. Canonical's questionable vendor status/segment remain clearly flagged; this close-out does not claim that new-seller discovery is solved.

Seven old page records are retained in `workspace.rejectedDiscovery`, outside accounts, ranked queues and refresh batches. Expand **Discovery → Rejected discovery noise · 7** to inspect the original source links. The full original records and receipts remain in local state:

1. How Next.js supports AI coding agents.
2. Organic Growth for the Next Stage.
3. Hydrogen: Shopify commerce in your framework.
4. Custom domains and white-labelling for SaaS.
5. Design Engineer Jobs.
6. The best headless commerce blog.
7. Approximated.

## Repository and documentation

Current tracked text, filenames, fixture references, provenance labels, UI comments and agent instructions use neutral reference terminology. Needed private checkout details and original implementation notes are in git-ignored `.internal/REFERENCE-NOTES.md`; they are not published. The current tree is cleaned without rewriting prior commits. `CLAUDE.md` points to current handoff instructions.

README explains the engine, features, flow, stack, local operation and honest limitations. Four screenshots are actual local browser captures with no keys or recipient contact data. Native Drive checklist and demo script are edited in place; historical checklist entries are retained with neutral terminology, and a new dated current snapshot supersedes old counts.

## Verification

- Full offline suite: **77 files passed; 378 tests passed, 1 intentional skip (379 total)**. Full output: `docs/FINAL-TEST-OUTPUT.txt`.
- New cases cover real Canonical dates/title, original-date vs update/detection, missing dates, each ATS publisher field, synthetic positive department match, offline repair idempotence/draft preservation, all seven rejections and the collapsed escaped receipt list.
- Browser: Today → Coalition Overview → Outreach → Kill Log → Workspaces → Vercel Seller profile. Additional checks: Score drilldown, Coalition saved receipt, Okta saved draft/no-current-trigger gate, hidden Vercel rejection archive, and original owner approval unchanged.
- Coalition body auto-sizes (247px content/client height). Demo copy controls and source labels render; no send action exists.
- Normal local OpenAI is `false`, monthly dollar limit `0`; ignored `.env` checksum is unchanged. The running server additionally disables Serper, scheduling, GDELT, EDGAR and GitHub process-only.
- Changes and renames: `docs/FINAL-CHANGE-MANIFEST.md`. Commit/CI result is reported in the final chat after push; this document does not anticipate a CI outcome.

No Apollo work or new discovery was started. Next steps remain future technographic discovery, separately authorized contact enrichment, and human review of unresolved profiles.
