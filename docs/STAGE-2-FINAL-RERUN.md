# Stage 2 final automated rerun

Run once on October 19, 2026. This was the last automated Stage 2 iteration. Stage 3 was not started and no profile was approved.

## Execution controls

- 29 explicitly allowlisted first-party page fetches: 12 Resolve AI, 9 Shopify and 8 Vercel.
- 29 pages fetched successfully; zero page errors.
- Zero Serper queries.
- Exactly three logical GPT-4o mini calls and three provider attempts; no retry was used.
- Actual token-reported cost: **$0.007646** under the temporary process-only **$0.05** cap.
- The normal ignored `.env` was never changed. Post-run verification confirmed `OPENAI_ENABLED=false` and `OPENAI_MONTHLY_LIMIT_USD=0`.
- All three results were persisted through the normal state path and remain `needs_review`.

## Pass-bar results

| Seller | First-party customers | Sourced competitors | Size metric | Target-size match | Buyer titles | Champion titles | Blocking | Advisory | Result |
| --- | ---: | ---: | --- | --- | --- | --- | ---: | ---: | --- |
| Resolve AI | 2 — Coinbase, DoorDash | 0 | Employees, floor 1,000 | Yes — target is 1,000+ employees | CTO; Head of Engineering; IT Operations Manager | Site Reliability Engineer; DevOps Engineer; Product Manager | 8 | 4 | Fails customer, competitor and zero-blocking bars |
| Shopify | 0 | 0 | Employee Count, floor 50 | Yes — compatible with “small to large enterprises” | Chief Marketing Officer; E-commerce Manager; Retail Operations Director | Store Manager; Digital Marketing Specialist; Product Manager | 25 | 1 | Fails customer, competitor and zero-blocking bars |
| Vercel | 0 | 0 | employees, floor 100 | Yes — compatible with “mid-sized to large enterprises” | CTO; VP of Engineering; Head of DevOps; Product Manager | Software Engineer; Platform Engineer; DevOps Engineer; Technical Architect | 16 | 5 | Fails customer, competitor and zero-blocking bars |

The warning totals are computed from the persisted final drafts, not copied from the older recovery snapshots. Common remaining blockers are vendor-seeking segment queries, empty competitors, weak claim/receipt overlap and—on Shopify and Vercel—empty customers.

## Owner action

There will be no further automated Stage 2 rerun. The owner will edit each profile in the review screen, add or correct supported customers and competitors, fix buyer-oriented search phrases and weak factual receipts, then approve manually. Typed reasons remain available for deliberately accepted blocking warnings and are recorded in the audit log.
