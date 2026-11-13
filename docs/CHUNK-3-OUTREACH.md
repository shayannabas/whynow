# Chunk 3 — outreach drafts

Updated October 21, 2026. The first bounded paid checkpoint stopped safely on an incomplete response; the corrected 4,000-token batch then produced three drafts that passed the older validator. A later accuracy audit rejected those drafts for demo use and tightened the rules below. Drafts remain copy-only and cannot be sent.

## Accuracy checkpoint

The current Resolve reference is `resolve-ai-v5-current-claims-2026-10-21`. WhyNow fetched the current AI SRE, product overview, Coinbase and DoorDash pages through its guarded, robots-aware collector (four pages, one robots request, zero Serper/OpenAI calls). The demo may now use only these exact, saved claims:

- Product: “Agents that investigate your production systems during on-call, incidents, and daily production tasks.” — <https://resolve.ai/product/ai-sre>
- Coinbase: “72% reduction in investigation time” — the saved receipt continues, “incidents that previously required long manual triage now move from alert to informed action in minutes, not half an hour or more.” — <https://resolve.ai/customers/coinbase>
- DoorDash: “Investigations went from hours to minutes...” — <https://resolve.ai/product/overview>

“Built by the creators of OpenTelemetry.” was not present and was removed. The former DoorDash sentence “cut investigation times by 87%” was not verbatim and was replaced by the current exact quote. Every seller claim now carries a saved quote, and validation fails unless the claim is a verbatim substring of that quote.

The prospect validator now requires a hiring draft to preserve the complete saved job title. Any mentioned location, number, named technology or operational detail must occur in the saved receipt text. Coalition's saved receipt says **Senior Site Reliability Engineer**, **Location: Any location, Canada**, and **Named stack: Kubernetes, AWS**; those details pass. An added GCP, New York or production-reliability statement would fail unless the receipt said it.

Accelerator Program, intern, graduate, new-grad and junior posts stay in evidence history but never become why-now triggers. The saved rerank therefore removed Binance and produced only two `Act now` accounts:

1. Coalition — Tier 1, fit 40 — Senior Site Reliability Engineer — <https://www.coalitioninc.com/job-posting?gh_jid=4742193005>
2. CrowdStrike — Tier 1, fit 35 — recent engineering leadership change, corroborated across five saved publisher domains — <https://www.thekeyexecutives.com/2026/09/04/crowdstrike-cto-elia-zaitsev-leaves-after-13-years-to-launch-170-million-ai-security-fund/>

The phrase “next operating state” is banned. Executive-change emails must say “the recent engineering leadership change,” may not lead with the person's departure or dollar amount, and show `single source — verify before outreach` unless a second publisher domain corroborates the event.

The owner authorized exactly three paid calls for the top three reranked `Act now` accounts. Because only two accounts qualify, zero calls were made. WhyNow did not substitute a `Worth researching`, `Needs review` or untiered account. OpenAI stayed disabled with a zero local limit.

## What is built

- A deterministic first-touch email template generalized to the active workspace seller.
- One fresh, public, account-relevant receipt is required. Expired, weak, uncitable or wrong-entity evidence is blocked.
- Seller language can come only from the frozen Resolve reference config or an owner-approved seller profile with a public receipt.
- With a manually entered real recipient, the browser uses that first name and an approved title. This private entry stays in local state and is never copied into Git, fixtures or documentation.
- With no saved recipient, Demo mode uses the literal `{{first_name}}` token and automatically chooses an approved workspace persona that matches the trigger. The draft is labeled **Template with merge fields — recipient filled at send time**.
- **Contact source: deferred (Apollo planned).** No contact lookup runs.
- The account page shows a `Demo · copy only · no send path` watermark, supporting receipts and a Copy button.
- There is no sending endpoint, contact provider or CRM integration.

## Reference behavior retained

The port keeps the useful parts of `resolve-outreach.cjs` and `message-targeting.cjs`: buyer/champion gating, above/below-the-power-line framing, awareness-sensitive calls to action, a receipt-led opener, strict subject/body structure, exact seller-claim wording and validator rejection instead of silent rewriting.

WhyNow deliberately narrows the current surface. Apollo/contact selection, candidate ranking, objection sheets, call plans and delivery are not active. The Demo merge token is accepted only as the exact greeting `Hi {{first_name}},`; generic greetings and invented names remain blocked.

## Model preflight

- Configured outreach model: `gpt-5.5`, separate from the Stage 2 drafting model.
- Free read-only check: `GET /v1/models` returned HTTP 200 and listed `gpt-5.5` for the configured API key.
- Official model documentation confirms Responses API and Structured Outputs support: <https://developers.openai.com/api/docs/models/gpt-5.5>.
- Official price checked October 21, 2026: $5 per million input tokens and $30 per million output tokens.
- The Structured Outputs request uses reasoning effort `medium` and a 4,000-token output budget for GPT-5.x, matching Reference's proven default. There is no automatic output-budget escalation retry.
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

## Corrected 4,000-token paid checkpoint — historical, not demo-ready

The corrected batch used commit `21f3451`, GPT-5.5 reasoning effort `medium`, exactly three logical calls and three provider attempts, with no retry. The provider returned model snapshot `gpt-5.5-2026-04-23` for every result. All three drafts passed the validator that existed then; they fail the later accuracy standard and are retained only as an audit trail.

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

## Allowed-facts regeneration and final demo status

The next offline fix gave GPT-5.5 an exhaustive `allowedFacts` list: verbatim prospect receipt facts, exact approved seller claims, and—only for a corroborated executive change—the approved phrase “the recent engineering leadership change.” The neutral phrase is now treated as grounded by its corroborating receipts; every other prospect detail still needs exact saved text.

The owner-authorized conditional regeneration made exactly two calls, one for Coalition and one for CrowdStrike, with no retry. It used 2,106 input tokens, 2,325 output tokens (including 2,068 reasoning tokens) and **$0.080280** total. OpenAI returned to disabled/zero; nothing was saved or sent.

- Coalition originally failed because the capitalization check treated the discourse word **“Also”** as a prospect-specific proper noun. After that general false-positive rule was fixed offline, the exact recorded draft revalidates with zero findings and is the Demo model draft.
- CrowdStrike still correctly fails `UNGROUNDED_PROSPECT_DETAIL`. The sentence “I’m reaching out because that timing can make on-call, incidents, and daily production tasks worth revisiting.” adds **on-call** and **production** to the prospect opener even though the executive-change receipts do not say them. The deterministic template passes and remains the Demo fallback.

### Coalition Demo model draft

**Subject:** Production investigations during incidents

```text
Hi {{first_name}},

I saw "Senior Site Reliability Engineer." "Location: Any location, Canada." "Named stack: Kubernetes, AWS." Also noted, "About us Coalition is the world's first Active Insurance provider designed to help prevent digital risk before it strikes."

Agents that investigate your production systems during on-call, incidents, and daily production tasks. Investigations went from hours to minutes...

Open to a brief conversation about on-call, incidents, and daily production tasks?

Shayan
```

Receipts: <https://www.coalitioninc.com/job-posting?gh_jid=4742193005>, <https://resolve.ai/product/ai-sre>, <https://resolve.ai/product/overview>. Persona: **Head of SRE**, because the saved senior SRE opening maps to the approved reliability champion.

### CrowdStrike deterministic fallback

**Subject:** Engineering leadership and investigation support

```text
Hi {{first_name}},

I noticed the recent engineering leadership change at CrowdStrike. It may be a useful moment to review how investigation work is supported.

It could help engineering leadership improve the operating model without another manual reliability program. Agents that investigate your production systems during on-call, incidents, and daily production tasks. 72% reduction in investigation time

Would it be useful to compare how AI-assisted investigation could fit the current workflow?

Shayan
```

Persona: **VP Engineering**, because an engineering leadership change belongs with an approved budget-owner persona. The template cites the five saved corroborating publisher receipts plus <https://resolve.ai/product/ai-sre> and <https://resolve.ai/customers/coinbase>.

## Trigger-first discovery checkpoint

The bounded live run used **26/40 Serper queries**, zero OpenAI calls, found 39 ATS candidates and admitted three new accounts after job verification, entity/noise checks, customer/competitor exclusion, firmographics, scoring, tiering and kills:

| Account | Role | Fit | Tier | Receipt surface |
| --- | --- | ---: | --- | --- |
| Okta | Principal Site Reliability Engineer | 42 | Tier 1 provisional | [Direct job text](https://www.okta.com/company/careers/opportunity/8002576?gh_jid=8002576) |
| SecurityScorecard | Senior Site Reliability Engineer | 38 | Tier 2 provisional | [Direct job text](https://job-boards.greenhouse.io/securityscorecard/jobs/8062312) |
| Altana | Principal Platform Engineer | 38 | Tier 1 provisional | [Direct job text](https://job-boards.greenhouse.io/altanaai/jobs/8034201003) |

All three qualifying links exposed the job text directly; zero qualifying receipts were generic JavaScript careers shells. Together with Coalition and CrowdStrike, Today now has five genuine `Act now` accounts. MongoDB and Zscaler were excluded as known customers. The run recorded ATS/page errors instead of weakening the gate.

## Readable, fact-grounded Demo drafts

Template version `whynow-outreach-template-v2` replaces pasted receipt fragments with natural sentences while keeping risky facts exact. Company names, complete job titles, technologies, locations, people and numbers must appear in the allowed-facts menu; every statistic or quote names the source customer; quotes remain verbatim. The validator also requires fewer than eight subject words, 60–110 body words, complete sentences, five blocks, exactly one ask question, and no stacked quotes, “About us” copy or noun-phrase fragments.

The owner-authorized GPT-5.5 check ran from commit `ee5d798` with 4,000 maximum output tokens, medium reasoning, no retry and a $0.25 process cap. Exactly three calls/attempts passed validation:

| Account | Persona | Input | Output | Reasoning | Cost |
| --- | --- | ---: | ---: | ---: | ---: |
| Coalition | Head of SRE | 1,317 | 637 | 516 | $0.025695 |
| Okta | Head of Platform Engineering | 1,355 | 640 | 516 | $0.025975 |
| CrowdStrike | VP Engineering | 1,506 | 655 | 516 | $0.027180 |
| **Total** |  | **4,178** | **1,932** | **1,548** | **$0.078850** |

The generated emails and their deterministic fallbacks both pass the same local validator. Nothing was saved as sent or written to application state. The normal local OpenAI settings were confirmed disabled/zero after the run.
