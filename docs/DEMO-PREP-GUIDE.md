# WhyNow — night-before interview demo guide

Updated October 21, 2026. WhyNow is designed to be prepared locally the day before an interview. The owner reviews and approves the seller profile; the software never approves one automatically. The demo stays copy-only and has no sending path.

## What the workflow does

In simple English: enter the company you are interviewing with, let WhyNow collect public evidence about what it sells and who it sells to, correct anything weak, approve that profile yourself, then let the app find and rank real companies that have a current reason to care. The final Today page explains who to contact, why now, and which public receipt supports that conclusion.

Technically: Stage 2 uses the guarded public-page collector, deterministic customer/competitor candidate extraction, and three focused GPT-5.5 Structured Outputs calls for seller facts, candidate review and ICP targeting. Human approval unlocks workspace-driven discovery, guarded collectors, entity exclusions, free firmographics, six-signal scoring, tiering, kill rules and receipt-backed ranking. `Prepare demo` runs discovery → Refresh all → re-rank as one background job with one hard Serper ceiling and no OpenAI call.

## Before starting

1. Work from the local WhyNow repository and keep the demo on `127.0.0.1` for screen sharing.
2. In the ignored local `.env`, set `CRAWLER_CONTACT_EMAIL`, the private Serper key and the private OpenAI key. Never paste keys into a document, chat, fixture or commit.
3. Keep `OPENAI_ENABLED=false` and `OPENAI_MONTHLY_LIMIT_USD=0` until a priced research or draft action is deliberately authorized. A stored key alone does nothing.
4. Start the app with `npm start`, open the local workspace page, and create a workspace named for the interview company.

## Prepare one seller

1. **Research the seller.** Enter only its company name. WhyNow finds and saves public first-party pages, prioritizing customers, case studies, comparisons, enterprise, pricing and about pages. The focused research path uses deterministic customer/competitor extraction before any model review.
2. **Price the model step.** A free `GET /v1/models` check confirmed this account can access `gpt-5.5`. For the saved 106 KB Vercel evidence packet, the three focused calls estimate 40,453 + 1,174 + 44,509 input tokens and a conservative maximum of **$0.615** at the official $5/M input and $30/M output pricing checked October 21. Set a process cap only after reviewing this estimate.
3. **Generate the draft profile.** Temporarily enable OpenAI with the chosen cap, run the three focused calls, then immediately restore `OPENAI_ENABLED=false` and the local limit to `0`.
4. **Review every field yourself.** Check customers, competitors, buyer/champion titles, measurable size floor, segment searches, signal definitions and every receipt. Edit weak fields. Resolve blocking warnings or type a specific acknowledgement. Click Approve only when you personally accept the profile.
5. **Prepare the prospect queue.** On Today, click **Prepare demo**. It runs in the background, makes no OpenAI call, and shares a maximum of 150 Serper queries across ICP-driven discovery and Refresh all. Progress and query use are saved in the workspace.
6. **Quality-check Today.** Open each top `Act now` account. Confirm the company identity, tier/size receipt, current trigger, why-now line and public receipt. Move an account to `working`, or `skipped` with a reason. Signals that do not apply show **Not used for this seller**; uncollected signals remain **Unknown · low confidence** rather than being treated as negative.
7. **Prepare outreach separately.** Use the deterministic template for a free, grounded fallback. A model draft is always a separate manual action and needs its own cost authorization. Demo mode uses `{{first_name}}`, an approved persona title and a Copy button; it cannot send.

## Time and provider budget

- Seller-page research has historically taken under a few minutes when public pages are reachable.
- Human review is the variable step; reserve about 10–20 minutes.
- The recorded Resolve discovery took 17 seconds and its 25-account Refresh all took 5 minutes 50 seconds. Allow 10 minutes for Prepare demo because public sites can be slower or unavailable.
- A practical night-before buffer is **20–40 minutes** for one company, plus any manual profile corrections.
- Prepare demo uses at most **150 Serper queries**. The seller-research search step keeps its own smaller cap. The deterministic template, scoring and browser review cost no OpenAI credits.
- The conservative three-call seller-research maximum for the recorded Vercel-size packet is **$0.615**. Actual cost depends on real output/reasoning tokens and can be lower; always use the preflight estimate and a process-only cap.

## If something is weak

- Do not invent a missing customer, competitor, contact, size or trigger.
- Keep a weak account under Needs review or skip it with a reason.
- If a source is blocked, show the recorded error and use another permitted source; do not bypass robots or access controls.
- If a generated draft fails validation, use the deterministic template. Do not silently relax the validator.
- If the seller profile is not good enough, edit it and approve the new revision yourself before preparing the demo.

## Three-minute interview flow

1. Show the approved seller profile and one exact receipt.
2. Open Today and explain `Act now` versus `Worth researching` versus `Needs review`.
3. Open one account and walk through its fit score, firmographic tier, active trigger, kill result and clickable receipts.
4. Generate or open the deterministic merge-field draft, explain that only approved seller claims and current prospect evidence are allowed, and use Copy. Point out that WhyNow has no send path.

The core explanation: **WhyNow turns public evidence into a reviewed sales strategy, uses that strategy to find and rank accounts, and refuses to turn unsupported claims into outreach.**
