# Chunk 2 — discovery and Today

Completed October 20, 2026 for the frozen Resolve reference demo. No seller profile was approved, OpenAI remained disabled, and no later port chunk started.

## Outcome

WhyNow now loads SignalScout's curated Resolve prospect universe as read-only workspace configuration, expands it through a capped background Serper job, applies a seller/customer/competitor/duplicate noise gate, and promotes a balanced demo set into WhyNow's atomic state. Today ranks saved accounts and shows a plain why-now line with a clickable receipt. Account detail shows the current tier/size explanation, fit score, active triggers, collector refresh action and explicit `new`, `working` or `skipped` status.

The live run used **10 Serper queries** of the authorized extra 60-query ceiling and **0 OpenAI calls**. It considered 62 config/search candidates, selected and saved 25, represented all 10 Resolve segments, reported zero errors and produced zero seller/customer/competitor leaks. Fifty authorized queries were not spent.

| Segment | Saved prospects |
| --- | --- |
| Crypto / fintech | Circle, Fireblocks, Gemini |
| Delivery / marketplaces | Deliveroo, Gopuff, Instacart |
| Ticketing / live events | AXS, DICE, SeatGeek |
| Sports betting / iGaming | BetMGM, Caesars Sportsbook, FanDuel |
| Data / AI infrastructure | Confluent, Grafana Labs, Together AI |
| Cybersecurity | CrowdStrike, Snyk |
| Travel / hospitality | Airbnb, Booking.com |
| Restaurant / commerce SaaS | ChowNow, Olo |
| Insurance / vertical SaaS | Coalition, Duck Creek Technologies |
| Enterprise platforms | Atlassian, HubSpot |

Every discovered account keeps its official-site source URL. These accounts deliberately begin with fit 8 and `Parked` because discovery does not invent firmographics or signals. The Today page says “No active why-now signal yet — refresh this account” until a collector adds current evidence. Existing live accounts with evidence rank above them; killed and skipped accounts remain saved but do not enter the active queue.

## Verification

- Offline suite before the live run: 43 test files, 205 passed, 1 intentionally skipped; tests made no provider calls.
- Browser: Discovery showed `complete · 10 Serper queries · 25 new accounts`; Today showed 29 active accounts and retained Databricks as one killed account outside the queue.
- Account detail: Circle showed its source receipt, honest Parked/8 state, six uncollected signals, Refresh account, and the `new / working / skipped` form.
- Restart: the 25 prospects and completed discovery summary persisted after a fresh server start.
- Status tests prove a skip needs a typed reason, the reason is written to the audit log, and changing away from skipped clears it.

## Boundary

This completes Chunk 2 only. It does not refresh all 25 accounts, invent “why now” claims, generate contacts or drafts, send messages, approve a seller profile, start a scheduler, or deploy to Railway.
