# WhyNow

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

The Collectors page exposes only infrastructure and one-page checks. Seller onboarding, prospect collectors and scoring have not been built.
