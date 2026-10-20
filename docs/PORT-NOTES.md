# WhyNow SignalScout port notes

Updated October 20, 2026.

SignalScout by Isa Iqbal is the read-only behavioral reference for port mode. WhyNow keeps its own workspace model, atomic JSON persistence, receipts, human approval and send-free Demo mode. The reference repository and its environment/secrets are never modified or copied.

## Current status

No module has been ported. Stage 2.5 is paused, its extractor remains available as a future improvement, and Phase A is waiting for owner approval.

## Required note for every ported module

Each future module entry must explain:

1. **What it does** — the user-visible job in plain English.
2. **How it decides** — inputs, rules, precedence, evidence and output.
3. **What changed from SignalScout** — especially how Resolve constants became active-workspace configuration and how WhyNow's receipts, isolation and approval gates were preserved.

Do not add a completion entry until the module's offline tests pass.
