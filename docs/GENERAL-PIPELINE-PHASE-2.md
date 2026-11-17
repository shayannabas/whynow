# Vercel Phase 2 — one-use verification, November 16, 2026

Status: authorization used and exhausted. Do not repeat this batch, including its unused allowance. No profile or playbook was approved.

## Owner follow-up and offline correction

The owner subsequently checked Apollo's web app: Rogo's primary domain is rogo.com, the Weather Company's is weathercompany.com; the failed lookup consumed0 credits and the balance stayed95/95. This identifies the miss as a domain mismatch, not evidence of an access problem. Those domains are suggestions requiring owner confirmation, not automatic profile changes. Offline revalidation later reduces the playbook warnings4→2. See [offline fixes and final proposal](VERCEL-FINAL-VERIFICATION-PLAN.md). The original one-use run observations below are retained as historical records; no call was repeated.

## Apollo access result

- Exactly one api.apollo.io robots.txt check returned HTTP200 and allowed both authorized API paths. Existing DNS/private-address, robots, redirect, pacing and response guards remained active.
- Step A: one GET organizations/enrich request for the confirmed Rogo domain `rogo.ai` returned HTTP200, but the client found no usable organization in the expected response shape. The normalized, sanitized saved response contains no organization object. The original provider response body was not retained; its underlying explanation cannot be reconstructed from that sanitized copy.
- This is not proof that the free plan supports usable enrichment. It is also not evidence of a work-email refusal: no company search was attempted.
- Apollo stopped after **1 of 5 allowed API attempts**. No retry, second enrichment, company search, people/contact request, paid-credit purchase or plan upgrade occurred. Sensay (`sensay.io`) was the second available approved-profile customer domain and was not called.
- Apollo supplied no usable organization estimate, so **derived pattern: none; candidates: 0; rejections: 0** for this batch. There are no new Found via records. Existing prospects, kills and rejected candidates were retained.
- Credit consumption was not exposed by the retained safe metadata. Do not claim verified zero Apollo credits or successful free-plan entitlement. No additional request was made to investigate.

## Playbook generation

- Exactly one GPT-5.5 request from saved Vercel pages; low reasoning, maximum8000 output tokens, no retry and no model-list request.
- Offline preflight: estimated31644 input tokens, conservative maximum **$0.398220**, under the process-only **$0.50** cap.
- Actual usage: **20171 input / 2210 output / 0 reasoning tokens**, no cached input. Cost calculated from returned usage and the repository model rates: **$0.167155**.
- Saved as playbook **version1, needs_review**, with ten triggers, three anti-triggers and four blocking warnings. Vercel remains approved seller revision5; its existing profile fields/approval and targeting configuration are unchanged. Until owner approval, the pending playbook does not change scoring, tiering or Act now eligibility.

### Proposed triggers — not approved

| ID | Trigger | Source | Strength | Window | Seller receipts |
| --- | --- | --- | --- | --- | --- |
| t1 | AI agents or agent-written code moving toward production | ats_jobs | strong | 30 days | 10 |
| t2 | Hiring for platform engineering, developer productivity, DevOps, or internal deployment tooling | ats_jobs | strong | 45 days | 10 |
| t3 | Urgent launch, MVP, conference launch, or product-market-fit iteration | news | strong | 21 days | 10 |
| t4 | Replatforming a high-traffic web experience or content/CMS stack | news | medium | 60 days | 10 |
| t5 | Multi-tenant SaaS, custom domains, customer-hosted apps, or platform product expansion | ats_jobs | medium | 90 days | 10 |
| t6 | Enterprise governance, SSO, auditability, secure previews, or centralized controls for apps and agents | ats_jobs | strong | 60 days | 10 |
| t7 | Cloud or platform comparison activity involving Netlify, Cloudflare, Webflow Cloud, Kubernetes, or Render | other | medium | 180 days | 10 |
| t8 | Design-engineering workflow investment or design-to-production bottleneck | ats_jobs | medium | 45 days | 10 |
| t9 | Spend predictability, pricing review, or usage-management concern | news | medium | 30 days | 10 |
| t10 | Security, bot mitigation, DDoS, WAF, or edge protection initiatives | ats_jobs | medium | 60 days | 10 |

### Buyer roles

- Economic buyers: CTO, VP Engineering, VP Infrastructure, Chief Product Officer, Head of Platform Engineering.
- Champions: Director of Platform Engineering, Engineering Manager, Staff/Principal Engineer, Head of Developer Experience, AI Engineering Lead, Design Engineering Lead.
- End users: Frontend Engineer, Full-Stack Engineer, Platform Engineer, DevOps Engineer, Design Engineer, AI Engineer.

### Blocking warnings

- **t2 / UNSUPPORTED_NAME:** the capitalization heuristic reads “Position Vercel” as a multiword named entity. This appears to be a validator false positive, not an invented company.
- **t6 / FACTUAL_PLAYBOOK_CLAIM:** digit detection flags compliance-standard identifiers (SOC2 / ISO27001 context) as a factual metric. This also appears to be a false positive.
- **t6 / UNSUPPORTED_NAME:** capitalization/concatenated-keyword matching flags “Vercel Enterprise”, “Frame Vercel” and “Okta Entra RBAC” against its selected excerpts.
- **t7 / UNSUPPORTED_NAME:** the same heuristic flags “Webflow Cloud” and the concatenated comparison-keyword list. The exact selected excerpts still require review.

The generated output, receipt selection and validator rules were not edited or loosened to clear these warnings. Approval remains blocked. Some `other` source policies also require a separately implemented/authorized evidence path before they can yield timing events; no new collector was run here.

### Complete proposed policy text and source links

#### t1 — AI agents or agent-written code moving toward production

Keywords: AI agent, agentic, coding agent, agent-written code, AI engineer, LLM application, AI SDK, model gateway, sandboxed environments, durable agents, workflow orchestration, internal agents.

Why it matters (model proposal): Vercel’s positioning centers on infrastructure for humans and agents building software together, with customer evidence around agent-written code shipping to production, agent swarms handling incidents, sandboxed agents, model gateway, workflows, and secure internal agents.

Message angle (guidance, not account facts): Frame the conversation around making agent-built software production-ready without creating a separate deployment, security, and observability stack for every agentic workflow.

Saved sources: [customers/how-rogo-ships-agent-written-code-to-production-in-5-minutes-on-vercel](https://vercel.com/customers/how-rogo-ships-agent-written-code-to-production-in-5-minutes-on-vercel), [about](https://vercel.com/about), [Vercel homepage](https://vercel.com/).

#### t2 — Hiring for platform engineering, developer productivity, DevOps, or internal deployment tooling

Keywords: platform engineer, developer productivity, DevOps, internal developer platform, deployment tooling, preview environments, rollbacks, CI/CD, build optimization, infrastructure provisioning, monitoring, alerting.

Why it matters (model proposal): Vercel repeatedly ties its value to removing infrastructure drag, preview environments, rollbacks, monitoring, alerting, automated deployment, and faster developer workflows—especially where teams might otherwise build or maintain internal platforms.

Message angle (guidance, not account facts): Position Vercel as a way to redirect platform-engineering effort from maintaining deployment plumbing toward guardrails, enablement, and faster product delivery.

Saved sources: [customers/how-sensay-went-from-zero-to-product-in-six-weeks](https://vercel.com/customers/how-sensay-went-from-zero-to-product-in-six-weeks), [solutions/platform-engineering](https://vercel.com/solutions/platform-engineering).

#### t3 — Urgent launch, MVP, conference launch, or product-market-fit iteration

Keywords: MVP, beta launch, product launch, conference launch, Web Summit, pilot, product-market fit, PMF, pivot, rapid iteration, feature flags, preview deployments.

Why it matters (model proposal): Customer evidence highlights teams using Vercel to compress time from concept to launch, keep one codebase through pivots, avoid DevOps hiring, use previews and feature flags, and reduce the risk of shipping quickly.

Message angle (guidance, not account facts): Lead with speed-to-learning: help the team launch, test, and change direction without pausing to build a bespoke infrastructure layer first.

Saved sources: [customers/how-sensay-went-from-zero-to-product-in-six-weeks](https://vercel.com/customers/how-sensay-went-from-zero-to-product-in-six-weeks).

#### t4 — Replatforming a high-traffic web experience or content/CMS stack

Keywords: replatform, website rebuild, CMS migration, web serving stack, global delivery, traffic surge, performance, core web vitals, real-time content, high traffic, customer experience.

Why it matters (model proposal): Vercel customer stories and enterprise messaging emphasize serving large-scale user experiences, rebuilding web serving stacks and CMS workflows, shortening design-to-publish cycles, global delivery, scaling, reliability, and performance.

Message angle (guidance, not account facts): Center the outreach on lowering migration risk while giving product, design, and engineering teams a faster path from change request to live customer experience.

Saved sources: [customers/how-the-weather-company-serves-real-time-forecasts-to-350-million-daily-active-users-on-vercel](https://vercel.com/customers/how-the-weather-company-serves-real-time-forecasts-to-350-million-daily-active-users-on-vercel), [enterprise](https://vercel.com/enterprise), [solutions/platform-engineering](https://vercel.com/solutions/platform-engineering), [Vercel homepage](https://vercel.com/).

#### t5 — Multi-tenant SaaS, custom domains, customer-hosted apps, or platform product expansion

Keywords: multi-tenant, SaaS platform, custom domains, tenant isolation, domain management, SSL certificates, hosted product, customer subdomains, white-label, platform engineering.

Why it matters (model proposal): Vercel has a dedicated multi-tenant SaaS and platforms story around hosted products, custom domains, tenant isolation, instant SSL, domain management, preview URLs, security, and scaling without infrastructure overhead.

Message angle (guidance, not account facts): Open with the operational complexity of letting every customer have a fast, secure, branded web surface—without making domain, certificate, and scaling work a core product tax.

Saved sources: [solutions/multi-tenant-saas](https://vercel.com/solutions/multi-tenant-saas), [Vercel homepage](https://vercel.com/).

#### t6 — Enterprise governance, SSO, auditability, secure previews, or centralized controls for apps and agents

Keywords: SSO, SAML, Okta, Entra, RBAC, audit logs, MFA, lifecycle management, identity provider, secure previews, deployment protection, compliance, SOC 2, ISO 27001, PCI DSS, model access governance.

Why it matters (model proposal): Vercel Enterprise messaging emphasizes a single control plane for apps, agents, and workflows, with automated provisioning, MFA, lifecycle management, compliance, SSO-protected previews, audit logs, RBAC, spend limits, and model access governance.

Message angle (guidance, not account facts): Frame Vercel as the governance layer that lets teams expand apps and agents safely instead of slowing them down with manual review and one-off controls.

Saved sources: [enterprise](https://vercel.com/enterprise).

#### t7 — Cloud or platform comparison activity involving Netlify, Cloudflare, Webflow Cloud, Kubernetes, or Render

Keywords: Netlify, Cloudflare, Webflow Cloud, Kubernetes, Render, Workers, OpenNext, platform evaluation, vendor comparison, hosting migration, compute architecture, developer experience.

Why it matters (model proposal): Vercel publishes comparison material across runtimes, compute, AI infrastructure, security, pricing, storage, background jobs, and developer experience, indicating competitive displacement conversations are supported.

Message angle (guidance, not account facts): Use a consultative evaluation angle: help the team compare runtime fit, security, AI infrastructure, and developer workflow tradeoffs rather than pitching a rip-and-replace.

Saved sources: [kb/comparisons](https://domains.vercel.com/kb/comparisons).

#### t8 — Design-engineering workflow investment or design-to-production bottleneck

Keywords: design engineer, design systems, frontend platform, preview deployments, preview comments, accessibility audit, feature flags, interaction performance, INP, UX bugs, design-to-production.

Why it matters (model proposal): Vercel’s design-engineering materials emphasize preview deployments, live production-grade previews, preview comments, feature flags, accessibility audits, interaction performance, and rapid rollbacks for safer iteration.

Message angle (guidance, not account facts): Speak to the handoff pain between design and engineering: make every iteration reviewable, testable, and reversible in a production-like environment.

Saved sources: [solutions/design-engineering](https://vercel.com/solutions/design-engineering).

#### t9 — Spend predictability, pricing review, or usage-management concern

Keywords: cloud cost, spend management, pricing review, usage-based pricing, budget alerts, traffic spike, CDN cost, cost optimization, invoice, billing surprise, runaway spend.

Why it matters (model proposal): Vercel highlights spend management, usage dashboards, pricing changes, alerts, Flat Rate CDN, traffic spike protection, and tools to observe, control, and alert on infrastructure spend.

Message angle (guidance, not account facts): Avoid a pure cost-savings pitch; instead, offer a spend-control conversation around predictable scaling, alerting, and keeping teams productive without surprise infrastructure exposure.

Saved sources: [customers/how-sensay-went-from-zero-to-product-in-six-weeks](https://vercel.com/customers/how-sensay-went-from-zero-to-product-in-six-weeks), [docs/pricing](https://vercel.com/docs/pricing), [pricing](https://vercel.com/pricing), [blog/new-pro-pricing-plan](https://vercel.com/blog/new-pro-pricing-plan).

#### t10 — Security, bot mitigation, DDoS, WAF, or edge protection initiatives

Keywords: WAF, bot management, BotID, DDoS, firewall, OWASP, rate limiting, bot protection, deployment protection, security engineer, application security, edge security.

Why it matters (model proposal): Vercel messaging includes WAF, Bot Management, BotID, DDoS mitigation, firewall rules, protected deployments, and customer examples where built-in security features reduce additional services.

Message angle (guidance, not account facts): Position the discussion around consolidating protection closer to the deployment workflow so security controls travel with the app rather than being bolted on later.

Saved sources: [customers/how-sensay-went-from-zero-to-product-in-six-weeks](https://vercel.com/customers/how-sensay-went-from-zero-to-product-in-six-weeks), [kb/comparisons](https://domains.vercel.com/kb/comparisons), [pricing](https://vercel.com/pricing), [enterprise](https://vercel.com/enterprise), [solutions/multi-tenant-saas](https://vercel.com/solutions/multi-tenant-saas).

### Proposed anti-triggers

- **Only personal or non-commercial project usage:** Deprioritize outreach when the detected need is limited to hobby, personal, or non-commercial projects because the seller’s paid and enterprise motions are framed around Pro and Enterprise team requirements.
- **Requirement for guaranteed approval or procurement commitment:** Do not present these triggers as approval to buy or as a confirmed procurement event; treat them only as editable timing proposals that may justify discovery.
- **No evidence of production, team collaboration, governance, scale, or launch pressure:** Hold or nurture when signals show experimentation without production deployment, team collaboration, governance, security, scale, or near-term launch needs; the strongest seller evidence maps to teams shipping, scaling, governing, or securing apps and agents.

## Safety, persistence and verification

- Exclusive one-use directory and durable authorization audit/run record were saved before network access. A failed/interrupted batch cannot be resumed or repeated. The runner checks the durable state as well as its directory.
- **0 Serper queries, 0 seller-page fetches, 0 collector refreshes and 0 contact lookups.** The single separately authorized Apollo robots check is counted explicitly above.
- Child-process Apollo is restored disabled with run/month caps0; OpenAI is false with limit0. The process exited. The persistent `.env` hash is unchanged; absent Apollo switches/caps retain disabled/zero defaults.
- Preservation checks pass for Vercel profile fields/approval/revision (excluding the newly requested pending playbook), the complete Resolve reference workspace and every saved draft. No seller profile or playbook was approved.
- Port3000 remains running with providers disabled. No Prepare demo or account refresh was started.
- Full offline suite: **83 files, 416 passed / 1 intentional skipped test (417 total)**. Seven new fictional-response tests cover one-use guards, robots denial, provider refusal, search limits, paid-usage stop, retry counting and incomplete output. [Full output](GENERAL-PIPELINE-PHASE-2-TESTS.txt).

The Apollo response contract and real lookalike pipeline remain **unverified**. Do not label Phase2 as a successful Apollo launch or spend unused authorization on another attempt. Any later live work requires a new owner instruction.
