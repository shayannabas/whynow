# Chunk 3 — outreach drafts

Updated October 21, 2026. The first bounded paid checkpoint stopped safely on an incomplete response; the corrected 4,000-token batch then produced three validator-passing Demo drafts. Drafts remain copy-only and cannot be sent.

## What is built

- A deterministic first-touch email template generalized to the active workspace seller.
- One fresh, public, account-relevant receipt is required. Expired, weak, uncitable or wrong-entity evidence is blocked.
- Seller language can come only from the frozen Resolve reference config or an owner-approved seller profile with a public receipt.
- With a manually entered real recipient, the browser uses that first name and an approved title. This private entry stays in local state and is never copied into Git, fixtures or documentation.
- With no saved recipient, Demo mode uses the literal `{{first_name}}` token and automatically chooses an approved workspace persona that matches the trigger. The draft is labeled **Template with merge fields — recipient filled at send time**.
- **Contact source: deferred (Apollo planned).** No contact lookup runs.
- The account page shows a `Demo · copy only · no send path` watermark, supporting receipts and a Copy button.
- There is no sending endpoint, contact provider or CRM integration.

## SignalScout behavior retained

The port keeps the useful parts of `resolve-outreach.cjs` and `message-targeting.cjs`: buyer/champion gating, above/below-the-power-line framing, awareness-sensitive calls to action, a receipt-led opener, strict subject/body structure, exact seller-claim wording and validator rejection instead of silent rewriting.

WhyNow deliberately narrows the current surface. Apollo/contact selection, candidate ranking, objection sheets, call plans and delivery are not active. The Demo merge token is accepted only as the exact greeting `Hi {{first_name}},`; generic greetings and invented names remain blocked.

## Model preflight

- Configured outreach model: `gpt-5.5`, separate from the Stage 2 drafting model.
- Free read-only check: `GET /v1/models` returned HTTP 200 and listed `gpt-5.5` for the configured API key.
- Official model documentation confirms Responses API and Structured Outputs support: <https://developers.openai.com/api/docs/models/gpt-5.5>.
- Official price checked October 21, 2026: $5 per million input tokens and $30 per million output tokens.
- The Structured Outputs request uses reasoning effort `medium` and a 4,000-token output budget for GPT-5.x, matching SignalScout's proven default. There is no automatic output-budget escalation retry.
- Incomplete responses retain only safe diagnostic metadata: `incomplete_details.reason`, input/cached-input/output/reasoning token counts, response identity and calculated cost. Prompt contents and keys are never copied into the report.
- No recorded model-output fixture exists yet. A guard requires any future recorded response to name the configured outreach model.

## Per-draft estimate

The estimate uses the corrected request built from the saved Binance account context:

| Item | Estimate |
| --- | ---: |
| Request size | 3,211 bytes |
| Estimated input | 803 tokens |
| Input cost | $0.004015 |
| Typical 150-token output | $0.004500 |
| Typical total | about $0.008515 |
| Hard request output allowance | 4,000 tokens, including reasoning |
| Conservative maximum total | $0.124015 |

Across Binance, Coalition and CrowdStrike, the three-request conservative maximum is $0.371815. Adding one maximum-size transient retry yields $0.495855, inside the authorized temporary $0.50 cap. Actual cost can differ because the API bills real input, visible output and reasoning tokens; the runtime still stops before a reservation would exceed the cap.

## First bounded paid-test outcome — historical

The owner authorized one three-target batch for Binance, Coalition and CrowdStrike. The runner started Binance, received provider status `incomplete`, and stopped immediately because this was not a retryable 429 or 5xx response and the requirement that every draft pass validation could no longer be met.

- Logical calls: 1 of 3; provider attempts: 1.
- Coalition and CrowdStrike calls: not made.
- Validator-ready drafts: 0; drafts saved as sent: 0.
- Temporary cap: $0.25; conservative reservation for the attempted request: $0.022015.
- Actual billed cost: unavailable because usage metadata from the incomplete response was not retained. The reservation is an upper bound, not a claim that this amount was charged.
- Normal local configuration after the stop: `OPENAI_ENABLED=false` and `OPENAI_MONTHLY_LIMIT_USD=0`.

No draft, subject, receipt citation or persona result can be reported as model output from this first checkpoint. The owner later supplied the separate corrected-run authorization described above; any request beyond that one corrected batch requires new explicit authorization.

## Corrected 4,000-token paid checkpoint

The corrected batch used commit `21f3451`, GPT-5.5 reasoning effort `medium`, exactly three logical calls and three provider attempts, with no retry. The provider returned model snapshot `gpt-5.5-2026-04-23` for every result. All three drafts passed the local receipt, claim, greeting and structure validator.

| Account | Persona | Why this persona | Input | Output | Reasoning | Cost |
| --- | --- | --- | ---: | ---: | ---: | ---: |
| Binance | Head of SRE | Reliability/performance hiring maps to the leader responsible for SRE and incident work. | 666 | 655 | 516 | $0.022980 |
| Coalition | Head of SRE | Reliability/performance hiring maps to the leader responsible for SRE and incident work. | 656 | 752 | 596 | $0.025840 |
| CrowdStrike | VP Engineering | An executive-change trigger is best reviewed by an engineering budget owner. | 644 | 669 | 516 | $0.023290 |
| **Total** |  |  | **1,966** | **2,076** | **1,628** | **$0.072110** |

OpenAI's `output_tokens` total includes reasoning tokens. The reasoning column above is the subset reported in `output_tokens_details.reasoning_tokens`.

Every result used template version `whynow-outreach-template-v1`, label **Template with merge fields — recipient filled at send time**, literal greeting `Hi {{first_name}},` and sender `Shayan`.

### Binance

**Subject:** AI performance on-call coverage

```text
Hi {{first_name}},

Saw the AI System Performance Engineer (APAC Remote) opening across Hong Kong, Singapore, and Taiwan—focused on system performance and production reliability.

Resolve AI puts an autonomous AI production engineer on-call: if production slips, it investigates logs and hands your team the root cause in minutes. Built by the creators of OpenTelemetry. Coinbase achieved 73% faster time to root cause.

Worth exploring whether an AI production engineer on-call fits the next SRE operating state you’re building?

Shayan
```

Receipts:

- <https://job-boards.eu.greenhouse.io/binance/jobs/5002733101>
- <https://resolve.ai/product/ai-sre>

### Coalition

**Subject:** Protecting deploy cadence as SRE grows

```text
Hi {{first_name}},

Saw the Senior Site Reliability Engineer opening in Canada calling out Kubernetes and AWS. Since that points to continued investment in reliability and incident work, I figured the next operating state may be less about firefighting and more about deploying on time.

Resolve AI puts an autonomous AI production engineer on-call: if production slips, it investigates logs and hands your team the root cause in minutes. Built by the creators of OpenTelemetry. DoorDash cut investigation times by 87%.

Worth exploring whether this could help your SRE team protect deploy cadence as the team grows?

Shayan
```

Receipts:

- <https://www.coalitioninc.com/job-posting?gh_jid=4742193005>
- <https://resolve.ai/product/ai-sre>
- <https://resolve.ai/product/overview>

### CrowdStrike

**Subject:** Operating model after CTO transition

```text
Hi {{first_name}},

Saw the report that CrowdStrike Global CTO Elia Zaitsev left after 13 years to launch a $170 Million AI Security Fund. For engineering, that kind of transition can be a moment to revisit the next operating state for production ownership.

Resolve AI puts an autonomous AI production engineer on-call: if production slips, it investigates logs and hands your team the root cause in minutes. Built by the creators of OpenTelemetry. Coinbase achieved 73% faster time to root cause.

Is this direction relevant as you plan post-CTO engineering priorities?

Shayan
```

Receipts:

- <https://www.thekeyexecutives.com/2026/09/04/crowdstrike-cto-elia-zaitsev-leaves-after-13-years-to-launch-170-million-ai-security-fund/>
- <https://resolve.ai/product/ai-sre>

The report confirms `savedToApplicationState=false`, `noSend=true`, `OPENAI_ENABLED=false` and `OPENAI_MONTHLY_LIMIT_USD=0`. No draft was marked or saved as sent. This authorization is exhausted.
