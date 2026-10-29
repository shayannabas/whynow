# WhyNow — night-before interview demo guide

Updated October 28, 2026. WhyNow is designed to be prepared locally the day before an interview. The owner reviews and approves the seller profile; the software never approves one automatically. The demo stays copy-only and has no sending path. Start the app and keep its terminal open before and throughout the interview.

## What the workflow does

In simple English: enter the company you are interviewing with, let WhyNow collect public evidence about what it sells and who it sells to, correct anything weak, approve that profile yourself, then let the app find and rank real companies that have a current reason to care. The final Today page explains who to contact, why now, and which public receipt supports that conclusion.

Technically: Stage 2 uses the guarded public-page collector, deterministic customer/competitor candidate extraction, and three focused GPT-5.5 Structured Outputs calls for seller facts, candidate review and ICP targeting. Human approval unlocks workspace-driven discovery, guarded collectors, entity exclusions, free firmographics, six-signal scoring, tiering, kill rules and receipt-backed ranking. `Prepare demo` runs discovery → Refresh all → re-rank as one background job with one hard Serper ceiling and no OpenAI call.

## Before starting

1. Work from the local WhyNow repository and keep the demo on `127.0.0.1` for screen sharing.
2. In the ignored local `.env`, set `CRAWLER_CONTACT_EMAIL`, the private Serper key and the private OpenAI key. Never paste keys into a document, chat, fixture or commit.
3. Keep `OPENAI_ENABLED=false` and `OPENAI_MONTHLY_LIMIT_USD=0` until a priced research or draft action is deliberately authorized. A stored key alone does nothing.
4. Start the app with `npm start` and **keep that terminal open**. Open http://127.0.0.1:3000/workspaces and create/select the interview-company workspace. For the current prepared demo select “Resolve AI · Reference demo” in “Active workspace,” click “Switch,” then open /today.

## Prepare one seller

1. **Research the seller.** Enter only its company name. WhyNow finds and saves public first-party pages, prioritizing customers, case studies, comparisons, enterprise, pricing and about pages. The focused research path uses deterministic customer/competitor extraction before any model review.
2. **Price the model step.** A free `GET /v1/models` check confirmed access to `gpt-5.5`. Current research uses three focused calls, low reasoning and **8,000 output tokens each**. The October 28 Gong packet had a conservative maximum of **$1.162665**, requiring explicit owner authorization of a $1.20 process cap. Actual three-call cost was **$0.375920**. This is an example, not a fixed per-company price; use the current packet's preflight before authorizing any new run.
3. **Generate the draft profile.** Temporarily enable OpenAI with the chosen cap, run the three focused calls, then immediately restore `OPENAI_ENABLED=false` and the local limit to `0`.
4. **Review every field yourself.** Check customers, competitors, buyer/champion titles, measurable size floor, segment searches, signal definitions and every receipt. Edit weak fields. Resolve blocking warnings or type a specific acknowledgement. Click Approve only when you personally accept the profile.
5. **Prepare the prospect queue.** Select the owner-approved seller in **Active workspace**, click **Switch**, then open **Today**. Expand **Prepare or refresh the queue** and click **Prepare demo** only after its provider/query budget is authorized. It runs in the background, makes no OpenAI call, and shares a maximum of 150 Serper queries across ICP-driven discovery and Refresh all. Progress and query use are saved in the workspace. This control is disabled for the unapproved frozen reference; do not approve a real profile just to enable it.
6. **Quality-check Today.** Open each top `Act now` account. Confirm the company identity, tier/size receipt, current trigger, why-now line and public receipt. Move an account to `working`, or `skipped` with a reason. Signals that do not apply show **Not used for this seller**; uncollected signals remain **Unknown · low confidence** rather than being treated as negative. An approved seller does not guarantee a usable queue: Vercel's October 28 run used 60 queries and returned seven noisy Needs review candidates, zero Act now and zero Worth researching. Inspect these results rather than presenting them as qualified prospects.
7. **Prepare outreach separately.** Use the deterministic template for a free, grounded fallback. A model draft is always a separate manual action and needs its own cost authorization. Demo mode uses `{{first_name}}`, an approved persona title and a Copy button; it cannot send.

## Time and provider budget

- Seller-page research has historically taken under a few minutes when public pages are reachable.
- Human review is the variable step; reserve about 10–20 minutes.
- The recorded Resolve discovery took 17 seconds and its 25-account Refresh all took 5 minutes 50 seconds. Allow 10 minutes for Prepare demo because public sites can be slower or unavailable.
- A practical night-before buffer is **20–40 minutes** for one company, plus any manual profile corrections.
- Prepare demo uses at most **150 Serper queries**. The seller-research search step keeps its own smaller cap. The deterministic template, scoring and browser review cost no OpenAI credits.
- The recorded Gong packet's current three-call maximum is **$1.162665** with 8,000-token allowances, versus **$0.375920 actual**. Packet size/output changes the cost; always use the current preflight and a separately authorized process-only cap.

## Current source and review caveats

Resolve currently has four Act now accounts: Okta, Coalition, Altana and CrowdStrike. SecurityScorecard's job is now 404 and appears as historical evidence/Needs review. On Coalition's Outreach tab, the canonical Greenhouse job redirects to generic careers; use “Coalition saved ATS job text ↗” under “ATS job receipts” to show the readable capture, or the ATS API receipt. Okta/Altana job detail is visible. Never call historical/closed evidence a current trigger.

Gong remains unapproved: ten receipted customers, zero competitors and two blocking warnings. Google is backed by its dedicated Gong-owned customer story. Domain values marked “Suggested — source” are not verified: inspect the source and click Confirm only if you accept it. Confirmation resets approval, so approve the resulting saved revision yourself after review. The five-company GDELT check was unavailable (timeout/rate limits), not proof of no news.

## If something is weak

- Do not invent a missing customer, competitor, contact, size or trigger.
- Keep a weak account under Needs review or skip it with a reason.
- If a source is blocked, show the recorded error and use another permitted source; do not bypass robots or access controls.
- If a generated draft fails validation, use the deterministic template. Do not silently relax the validator.
- If the seller profile is not good enough, edit it and approve the new revision yourself before preparing the demo.

## Three-minute interview flow

The native [Demo Script](https://docs.google.com/document/d/1ySTmwMnjl9hzSjagK3OJi7z3uZ8BMRydmPXLOjX83_4) retains its three-minute structure and is the speaking script. Its October 27 click paths were walked in the real browser without provider calls, profile approval or Prepare demo.

1. Select **Resolve AI · Reference demo** in **Active workspace**, click **Switch**, then **Today** (`/today`). If the sidebar is collapsed, open **Menu** first.
2. Point to **Daily Brief**, then **Open Act now list →**. The saved queue currently contains Okta, Coalition, Altana, CrowdStrike and SecurityScorecard; verify freshness before the interview.
3. Click **Coalition** or its **Open account** button. **Overview** shows **Why now**, **Open trigger receipt ↗** and **Open size receipt ↗**. **Score** shows the six-signal breakdown; **Evidence** shows saved signal text and separate trigger history.
4. Sidebar **Scorecard** → Tier 1 / 40–69 **View accounts →** opens `/accounts?tier=1&fit=40-69`. Sidebar **Kill Log** (`/kill-log`) shows Atlassian and Grafana Labs as `KILL_SELLER_OR_COMPETITOR` adjacent vendors, with account-specific reasons and **View receipt ↗**. Databricks's unsupported build-culture kill is under **Retired after evidence review**, not an active exclusion; old receipts remain visible.
5. Return through **Today** → **Open Act now list →** → **Coalition** → **Outreach**. Under **Receipt-backed template**, use **Latest saved draft**, or **Create template draft** if needed (blank recipient fields, sender Shayan). The body expands fully; descriptive links identify the Coalition SRE job, Resolve AI product and DoorDash quote. Under **Copy after review**, use **Copy email**. Okta's existing GPT-5.5 email and CrowdStrike's template v2 are also saved locally, with their Source labels. No new model call, contact lookup or send action occurs when copying.
6. For future preparation, **Workspaces** → **Add a company** → **Who are you selling for?** (`/onboarding`) → **Company name** → **Continue**. Only after the owner's review and **Approve saved profile** at `/onboarding/profile` should **Today** → **Prepare or refresh the queue** → **Prepare demo** be run with a separately authorized budget. For a walkthrough, reveal the controls but do not submit research, approve or start the job.

The browser walkthrough also exposed source CSS hiding WhyNow's account-name column on narrow screens. The local adapter now keeps the first data cell visible; Databricks is clickable in the mobile Kill Log.

The core explanation: **WhyNow turns public evidence into a reviewed sales strategy, uses that strategy to find and rank accounts, and refuses to turn unsupported claims into outreach.**
