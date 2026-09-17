# WhyNow

WhyNow runs locally by default on `127.0.0.1`. This avoids hosting charges during development. External provider use is separate: Serper searches consume provider credits, and OpenAI requests are usage-billed. Both integrations are fail-closed behind environment switches and persisted caps; OpenAI paid calls remain disabled.

## Start with a company name

Enter **Vercel** (or another company name) on Overview or `/onboarding` and click **Continue**. When Serper is explicitly enabled, WhyNow finds up to five possible official websites and pauses for you to choose the right company. It then uses no more than four Serper searches and twenty same-domain public pages in one run. Search snippets guide discovery but never count as evidence.

The results screen follows the background job and links every saved page. With paid OpenAI disabled, the flow stops honestly at **Evidence is ready**. No seller facts, customers or ideal-customer claims are invented. Manual company selection remains available at `/onboarding/manual`.

To enable only Serper, put the authorized key after `SERPER_API_KEY=` in the ignored local `.env` file, keep `SERPER_ENABLED=true`, and restart the app. The default local limits are four queries per run, fifty per month across saved workspaces, and twenty pages per run. A key alone is insufficient: the enable switch and positive caps are all required. Never put a key in chat, a form, documentation or GitHub.

A prospecting engine that explains who to contact, why now, and where the proof is. Stage 1 adds public-page collection and saved evidence to the workspace foundation.

## Run locally

Use Node 22 (`nvm use` if installed), then `npm ci`, `npm test`, and `npm start`. Open http://127.0.0.1:3000. Optional `.env` settings are documented in `.env.example`; existing environment variables take precedence. The app binds to localhost by default.

Create a workspace with a name of your choosing. It starts empty, in Draft status and Demo mode. Stop and restart the server: the workspace still appears. Create another workspace and use the header switcher to move between them. `/health` returns JSON with status `ok`; other unrecognized paths return 404.

## How the foundation works

Node's built-in HTTP server routes requests. Pages are HTML rendered on the server, with every dynamic value escaped. Manrope is served locally. Internal page links use a small delegated handler to replace the main content; forms use normal POST/redirect flows so the header stays current after workspace changes.

The state module saves `.whynow/local-state.json`. It flushes a complete temporary file to disk, then renames it into place. The preceding valid document is retained as `.bak`. A broken primary file restores that backup; if neither is valid, the app reports an error rather than resetting saved work. A backup can be one successful change behind. This is designed for one local server process.

Workspace reads return copies; updates target one workspace ID. HTTP mutations run in sequence to prevent one save overwriting another. Blank workspace names are user labels, not researched seller facts. No prospect data is seeded.

Tests use temporary directories and local HTTP servers, never external providers. CI targets Node 22 and runs installation, tests, production dependency audit, and Gitleaks. Public deployment and authentication belong to Stage 10.

## Interview explanation

“I built the foundation with plain Node.js so I could understand the request flow end to end. Each seller gets its own workspace from the start. I used atomic file replacement and a backup to protect saved work, and tested interrupted saves and workspace isolation before adding data collection. The initial screen honestly shows zero accounts.”

See `docs/TRACEABILITY.md` for requirements and verification status.

## Stage 1: public pages and evidence

Set `CRAWLER_CONTACT_EMAIL` to an address you monitor in `.env`, restart, then open `/collectors`. Choose a workspace, enter a public HTTPS URL and click **Fetch and save evidence**. The page shows progress and a link to the saved source. This local administrator action is disabled in production, rejects remote clients and requires a same-origin form submission. Full managed authentication remains Stage 10.

The runtime checks DNS and blocks private/reserved addresses, checks robots.txt, enforces source budgets and minimum intervals, follows up to three validated redirects, and limits each response to 2 MB. Robots errors fail closed; an actual 404 means there is no robots file. Cached public pages live under `.whynow/collector-cache/`. Errors remain visible; no substitute data is produced. DNS checks also have a deadline.

The production transport uses Node's built-in HTTPS request with a pinned, validated DNS answer. This avoids resolving a hostname again to a different private address after validation. Tests inject a fetch-compatible adapter; this small transport exception to the plan's global-fetch preference adds no dependency. Optional Serper search uses the same guarded runtime with its official fixed endpoint; credentials stay in headers and are omitted from cache keys and health messages.

Daily request counts are workspace-scoped and retained in that workspace's `budgets.collector`; UTC-day changes start a new budget. The debug action records counters and health when the job completes or fails. A process crash during a job can therefore leave its most recent usage unrecorded; durable in-flight job accounting remains future hardening. Only one debug fetch runs at a time in the local process. The in-memory job history is bounded and resets on restart; saved evidence and completed usage survive.

Source records contain URL, fetch time, title, extracted text and a SHA-256 content hash. Changed text creates a new source version so old evidence isn't overwritten. Exact quotes are checked after whitespace normalization; paraphrases fail this check. Public source records may be shared between workspaces; workspace-specific prospect data is not shared.

### Interview explanation for Stage 1

“I built the evidence pipeline before adding AI. It identifies itself to sites, follows their crawling rules, limits requests and reuses cached pages. Each saved source includes its URL, time and text fingerprint. Later, I can check that a claimed quote actually appears in that source, instead of trusting the model's wording.”

The Collectors page remains a one-page infrastructure check. Stage 2 seller research uses that guarded runtime; prospect-signal collectors and scoring belong to later stages and have not started.

## Stage 2: seller research and review

Stage 2 now has an offline-tested research path. A persistent background coordinator reserves each Serper query before it is sent, survives restarts, prevents duplicate jobs, keeps workspaces isolated and stores partial page failures. The public-page runtime still checks DNS, robots rules, redirects, response sizes and daily limits. Only pages on the confirmed seller domain enter the synthesis evidence set.

The source-only synthesis layer is connected behind the existing OpenAI switch. It sends bounded saved excerpts, requires strict structured output, derives URLs on the server, checks exact quotes locally and drops unsupported customer or competitor claims. Generated profiles always enter `needs_review` in Demo mode. Approval is a separate human action; editing invalidates the old approval.

Paid OpenAI remains intentionally off. Setting an API key alone cannot make a request: the enable switch, dollar limit and per-workspace request limit must also be positive. Until the owner separately approves those settings, the app displays collected evidence and offers the manual fallback.

The original Resolve AI targeting configuration from the reference repository is stored as a frozen, load-only comparison—it is never silently used as another seller's profile. Offline official-page fixtures cover Resolve AI, Vercel and Shopify. Monthly refresh logic creates a visible, stale-safe diff and keeps the approved profile unchanged until a human approves grounded receipts; automatic refresh collection/drafting remains paused with OpenAI off.

Interview explanation: “I split discovery, evidence and judgment into separate gates. Search proposes an identity, I confirm it, the crawler saves permitted pages, and the model can only cite those saved excerpts. The server checks every quote again and a human approves the draft. I also reserve usage before provider calls, so a crash cannot quietly bypass the cost cap.”

## Manual seller profile (AI disabled)

From Overview, choose **Set up seller**, supply a company name and website, and confirm the company. Then open **Seller profile** in the sidebar. Enter the seller description and supporting links, plus its ideal industries, size, 3–10 customer segments and buyer/champion roles. Optional sections capture proof, customers, competitors and targeting keywords. Empty optional sections stay empty.

Click **Save draft for review**. Review the saved claims and source links, check the acknowledgement and click **Approve saved profile**. Approval activates the workspace in Demo mode but neither enables sending nor starts discovery. Editing an approved profile requires approval again. The server rejects outdated revision numbers to prevent a second tab overwriting newer work.

A source URL alone is not verification. Only an exact quote matched to saved source text gets a matched-quote label; other claims stay unverified after approval and must be excluded from future outreach. Matching text does not prove that a quote supports the surrounding claim: the owner still reviews its meaning. Customer quote matching currently requires the seller's own domain. Adding a link does not automatically fetch it; use the existing Collectors action separately if you want to save a public source.

No AI or search provider is called by manual profile editing or approval. Your existing `CRAWLER_CONTACT_EMAIL` remains solely for explicit public-page collection. No new APIs were enabled.

Interview explanation: “I separated profile approval from evidence verification. A human can approve the targeting strategy, but unsupported claims stay visibly unverified. Each workspace has independent drafts, and edits invalidate approval so stale information cannot silently become approved.”
