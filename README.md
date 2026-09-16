# WhyNow

A prospecting engine that explains who to contact, why now, and where the proof is. Stage 0 provides the workspace foundation only.

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
