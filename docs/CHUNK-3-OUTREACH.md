# Chunk 3 — outreach drafts offline checkpoint

Updated October 21, 2026. No paid outreach generation call has been made.

## What is built

- A deterministic first-touch email template generalized to the active workspace seller.
- One fresh, public, account-relevant receipt is required. Expired, weak, uncitable or wrong-entity evidence is blocked.
- Seller language can come only from the frozen Resolve reference config or an owner-approved seller profile with a public receipt.
- The browser asks for the recipient's real first name/title and the sender's first name. No contact lookup runs.
- The account page shows a `Demo · copy only · no send path` watermark, supporting receipts and a Copy button.
- There is no sending endpoint, contact provider or CRM integration.

## SignalScout behavior retained

The port keeps the useful parts of `resolve-outreach.cjs` and `message-targeting.cjs`: buyer/champion gating, above/below-the-power-line framing, awareness-sensitive calls to action, a receipt-led opener, strict subject/body structure, exact seller-claim wording and validator rejection instead of silent rewriting.

WhyNow deliberately narrows the current surface. Apollo/contact selection, model generation, candidate ranking, objection sheets, call plans and delivery are not active. The template accepts a manually entered recipient so the local demo remains useful without introducing the deferred contact-enrichment scope.

## Model preflight

- Configured outreach model: `gpt-5.5`, separate from the Stage 2 drafting model.
- Free read-only check: `GET /v1/models` returned HTTP 200 and listed `gpt-5.5` for the configured API key.
- Official model documentation confirms Responses API and Structured Outputs support: <https://developers.openai.com/api/docs/models/gpt-5.5>.
- Official price checked October 21, 2026: $5 per million input tokens and $30 per million output tokens.
- The Structured Outputs request is built and tested offline, but it is not executed.
- No recorded model-output fixture exists yet. A guard requires any future recorded response to name the configured outreach model.

## Per-draft estimate

The estimate uses the actual request built from the saved Binance account context:

| Item | Estimate |
| --- | ---: |
| Request size | 3,253 bytes |
| Estimated input | 814 tokens |
| Input cost | $0.004070 |
| Typical 150-token output | $0.004500 |
| Typical total | about $0.008570 |
| Hard request output allowance | 600 tokens |
| Conservative maximum total | $0.022070 |

Actual cost can differ because the API bills real input, visible output and reasoning tokens. The maximum is not authorized spending; it is only a planning estimate. The owner must separately approve any generation call and cap.
