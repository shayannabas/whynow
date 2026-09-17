# WhyNow

Build only the approved stage of the WhyNow v4 implementation plan. Node 22, CommonJS, built-in HTTP; no application framework. Stage 2 is in progress, not complete. See docs/STAGE-2-STATUS.md for the current acceptance checklist; do not advance to Stage 3 while Stage 2 acceptance is pending.

Owner decision: prepare OpenAI first using the friend's GPT-4o mini/direct HTTP setup, but KEEP PAID CALLS OFF (reconfirmed). No billing, live test or spending cap is approved. The client is implemented offline in scripts/llm.cjs; no onboarding route calls it yet. Serper remains disabled. Maintain docs/BUILD-CHECKLIST.md as work is verified and keep it available beside the app. Main onboarding asks only for a company name, with Vercel as the first intended real test. Show “Research not configured” and no generated facts while providers are disabled. Manual website/profile entry is a secondary fallback. Never ask for API keys in chat.

Every seller has an isolated workspace. Only public company data can be shared. Never invent companies, contacts, evidence or metrics. Claims need receipts; ungrounded claims remain inferred. Public collection must respect robots and access controls. Retain disqualifications. Human approval gates profiles and output. Demo is the default and has no send path. Secrets belong in environment variables.

Persist one versioned JSON document atomically with fsync, rename and a last-good backup. Use workspace helpers. Tests must never call live providers. Run tests and browser checks before claiming completion; keep docs/TRACEABILITY.md current. Add only dependencies allowed by the plan when needed. Do not deploy before Stage 10.
