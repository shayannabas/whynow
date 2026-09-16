# WhyNow

Build only the approved stage of the WhyNow v4 implementation plan. Node 22, CommonJS, built-in HTTP; no application framework. Stage 2 is being initiated. Remote CI passed for Stages 0–1; browser verification remains pending.

Owner decision: keep AI disabled. Do not enable AI or add API providers until the owner explicitly chooses them. Start with user-supplied company websites. Never ask for API keys in chat.

Every seller has an isolated workspace. Only public company data can be shared. Never invent companies, contacts, evidence or metrics. Claims need receipts; ungrounded claims remain inferred. Public collection must respect robots and access controls. Retain disqualifications. Human approval gates profiles and output. Demo is the default and has no send path. Secrets belong in environment variables.

Persist one versioned JSON document atomically with fsync, rename and a last-good backup. Use workspace helpers. Tests must never call live providers. Run tests and browser checks before claiming completion; keep docs/TRACEABILITY.md current. Add only dependencies allowed by the plan when needed. Do not deploy before Stage 10.
