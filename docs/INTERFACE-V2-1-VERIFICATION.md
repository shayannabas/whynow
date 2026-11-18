# Interface v2.1 verification

November 17, 2026. The local server is on port 3000 with providers disabled. Pump remains the active workspace with seller revision 4 and playbook v6 approved.

| Part | Result |
| --- | --- |
| 1. Contact paths | Results shows Ready when a saved persona has a usable LinkedIn link. Search path links are built from the matched ICP roles, with workspace roles or a company people search when no roles are available. The same capped background job handles automatic Act now and Top prospects lookups after discovery and selected Results rows. Apollo master and persona switches, positive limits and saved approvals gate each job. |
| 2. Results | Search fits on one row. Filter groups and selected chips are visible, including live exclusion counts. Tier and Killed status are separate. |
| 3. Priority leads | Lead cards show trigger age. The account opens on one Fit score with confidence and a Why now card with date, source and receipt. Status and refresh controls sit in Actions. |
| 4. ICP Studio | Each ICP shows a targeting summary, matched-account count, compact editor and a read-only query preview. |
| 5. Personas | Settings stores the sender's first name with Shayan as the default. Persona cards show buyer role, matched ICP and an inline validator-passing draft with Copy and receipts. |
| 6. Guided pipeline | The eight-step guide separates owner review of seller, ICPs and playbook. Discovery uses the background coordinator. Scoring and tier summaries read the saved results, and Open dashboard opens Results. Replay reads a saved run and anchors trigger freshness to the run finish. |
| 7. Progress | The persistent header shows current stage and overall percentage. The panel reads persisted counts, available limits, skips, errors and elapsed time. It distinguishes OpenAI reservations from actual cost. Historical details are shown when retained. |
| 8. Pump wording | Six proposals are visible in Messaging, all pending owner review. Approval is a separate, revision-guarded action. Create Act now templates uses the saved approved wording and the existing validators. |
| 9. Pump Apollo preflight | Blocked before any request. Ramp is the top Act now account, but its matched ICP is pending. No scope or credit allowance was consumed. |

## Pump messaging review

Pump's [Messaging proof points](http://127.0.0.1:3000/onboarding/profile#messaging-proof) show a verbatim product sentence from the saved pricing page plus five receipt-backed customer headlines.

| Proposed wording | Receipt |
| --- | --- |
| Your team gets savings, visibility, security, and operational support for free. | [Pricing](http://127.0.0.1:3000/sources/3061e6f2fd398ac9bbc0c1eb) |
| SalesForge Cuts 10% Off Its AWS Bill on Autopilot | [SalesForge case study](http://127.0.0.1:3000/sources/0f35d8ead8e254e85c63a56b) |
| Zil Money Cuts 15–20% of Its AWS Bill with Pump Save | [Zil Money case study](http://127.0.0.1:3000/sources/2c0c9a83c11dcfad0a95a896) |
| beehiiv Saves $15K+/Month on AWS with Pump Save | [beehiiv case study](http://127.0.0.1:3000/sources/3cdf235c406becabab28f321) |
| Terra Saves Nearly $30K on AWS in Months with Pump Save | [Terra case study](http://127.0.0.1:3000/sources/686dd941dc8d8edf778b28cf) |
| Whalesync Saves $13K and Cuts Compute Costs 62% with Pump | [Whalesync case study](http://127.0.0.1:3000/sources/c6f18f9f24a2c3310f3d6f28) |

Ramp and Conveo still have zero templates. Their first retry waits for owner approval of the proposed product wording and any customer proofs. No seller or playbook form was submitted.

## Apollo preflight

Pump has five derived ICPs and zero approved. The runtime returned the approval-gate error before requests could be reserved. Usage is zero calls, zero accounts with saved personas, zero personas per account and zero provider errors. The existing one-use authorization remains unspent. Begin with one Ramp people-search call only after verifying its saved ICP approval and current queue status. Continue within the owner's original bounds only if the result is usable and zero credits are confirmed.

## Verification

The full offline suite passed across 95 files with 475 tests passed and one existing skip. GitHub Actions passed the implementation head `17016fb`. Desktop QA at 1440 × 1000 used an isolated fictional workspace with provider networking blocked. It verified filter chips and disabled selected lookup, trigger age and Actions, edit disclosure and query preview, sender Settings, role drafts and clipboard, all eight guide screens, the ICP review transition, Replay and the expanded progress panel. The 13 screenshots are local under `.internal/interface-v21/`.
