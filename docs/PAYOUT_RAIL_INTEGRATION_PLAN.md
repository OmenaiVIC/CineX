\# Payout Rail Integration Plan — CineX



> Status: Planning document. Not a sprint deliverable. No code changes described here have been made.

> Purpose: define how CineX will consume Payout Rail as its payout orchestration layer, replacing the internal BOS.

> Dependency: Payout Rail must complete Milestone 2 of its Stacks Endowment grant (target: December 12, 2026) before integration work begins.



\---



\## Why this plan exists



CineX contains an internal payout orchestration subsystem — the Bridge Orchestration Service (BOS). That subsystem has since been extracted, corrected, hardened, and documented as an independent open-source project: \*\*Payout Rail\*\* (https://github.com/OmenaiVIC/payout-rail).



Payout Rail is materially more capable than CineX's current BOS:



| Capability | CineX's BOS | Payout Rail |

|---|---|---|

| Evidence chain | Partial (3 of 6 recorders used) | Complete (canonical transition records + 6 recorders) |

| Reconciliation | Burn scan only, inert in practice | Five deterministic detection modes |

| Settlement receipts | None | Full receipt generator with explicit gap detection |

| Public API | Internal routes | Versioned v1 API with fail-closed bearer auth |

| Idempotency | Timestamp-based (non-deterministic) | Deterministic SHA-256 |

| Concurrency safety | None | Compare-and-swap guard on state transitions |

| Yellow Card authentication | Incorrect scheme (legacy JSON envelope) | Corrected to `YcHmacV1` per documented API |

| Tests | No BOS-specific suite | 189 tests, 0 failures |

| Documentation | Minimal | Complete: README, ARCHITECTURE, INTEGRATION, PROVIDER\_ADAPTERS, SECURITY, DEVELOPMENT |



CineX is currently running an older, weaker version of the same system. Every sprint on Payout Rail has improved code that CineX still depends on.



This document defines how CineX will transition to consuming Payout Rail as an external service.



\---



\## The integration boundary



The boundary is defined in Payout Rail's `docs/extraction-plan/REPOSITORY\_BOUNDARY.md`. It is an explicit, versioned interface. CineX calls into Payout Rail; Payout Rail never calls back into CineX tables directly.



| Boundary | Direction | Contract |

|---|---|---|

| Disbursement request | CineX → Payout Rail | `POST /api/v1/disbursements` with `source\_reference` + `source\_application` (replaces the bare `campaign\_id`) plus `amount`, `beneficiary`, idempotency key |

| Eligibility | Payout Rail → CineX-provided implementation | `isRecipientEligible(recipientRef, context: {corridor, amount}) → {eligible, reason?}` |

| Callbacks | Payout Rail → CineX-registered webhook URL | Delivery of state transitions |

| Webhooks | Yellow Card → Payout Rail | Payout Rail handles provider webhooks directly |

| Chain | Payout Rail → Stacks | Payout Rail owns the burn, attestation, and observation flow |

| Monitoring data | Payout Rail → its own tables | CineX never reads Payout Rail's tables directly |



\*\*Key principle:\*\* CineX becomes an integrator of Payout Rail, exactly like any other Stacks application. CineX is not special. There are no bidirectional imports and no shared database.



\---



\## What CineX will need to change



\### 1. Escrow release flow



\*\*Current:\*\* CineX's `routes/escrow.js` calls `initiateDisbursement` on the internal BOS on milestone release success. This is a dual-write pattern: the campaign and escrow tables are updated, and the disbursement is created in the BOS tables.



\*\*After integration:\*\* The escrow release flow calls `POST /api/v1/disbursements` on Payout Rail with:

\- `source\_reference` = the CineX milestone identifier

\- `source\_application` = `"cinex"`

\- `amount` and currency

\- `recipient` (bank account details, passed through — Payout Rail never stores these in plain form)

\- An idempotency key derived from the milestone release event



\*\*Expected change size:\*\* One function call replaced with one HTTP call. The escrow release logic itself is unchanged.



\### 2. Recipient eligibility



\*\*Current:\*\* CineX's `payoutGates.whitelistPrerequisite` reads CineX's own `profiles` table to check whether the recipient is verified.



\*\*After integration:\*\* CineX provides a `RecipientRegistry` implementation to Payout Rail. The implementation is a small HTTP endpoint or a shared module that Payout Rail calls during preflight. It reads `profiles.verified` and returns `{eligible: true/false, reason?}`.



\*\*Expected change size:\*\* One new endpoint (`GET /internal/recipient-eligibility`) or one shared module, plus a configuration entry in Payout Rail.



\### 3. Webhook receiver



\*\*Current:\*\* CineX does not receive payout state transitions from the internal BOS. The BOS updates its own tables and CineX's activity feed reads them.



\*\*After integration:\*\* CineX registers a webhook URL with Payout Rail. Payout Rail sends state transition events (attestation confirmed, release observed, payout submitted, settled, manual review). CineX's webhook handler updates the activity feed and any campaign-side state.



\*\*Expected change size:\*\* One new route (`POST /api/webhooks/payout-rail`) plus a small handler.



\### 4. Activity feed



\*\*Current:\*\* CineX's `indexerWorker` reads BOS tables directly to populate the activity feed.



\*\*After integration:\*\* The activity feed is populated from webhook events. The `indexerWorker` no longer reads BOS tables. The feed reads from CineX's own event log, which is populated by the webhook handler.



\*\*Expected change size:\*\* The `indexerWorker` loses its BOS-table read path. The feed logic itself is unchanged.



\### 5. Data migration



\*\*Current:\*\* CineX's BOS tables (`disbursements`, `disbursement\_audit`, `external\_refs`, etc.) contain the current payout state.



\*\*After integration:\*\* These tables are no longer written to. Two options for migration:



\*\*Option A (recommended):\*\* Disbursements that are already in a terminal state (`settled`, `failed`, `cancelled`) stay in CineX's tables for historical reference. Disbursements in non-terminal states at integration time are either:

\- Migrated to Payout Rail's tables through a one-time export/import, or

\- Explicitly marked "abandoned at migration" and reported in a migration log



\*\*Option B:\*\* Start fresh. Any in-flight disbursements at integration time are resolved manually on the old BOS before cutover.



\*\*Expected change size:\*\* One migration script (either way), plus a data reconciliation report.



\### 6. Deprecation of the internal BOS



\*\*After integration:\*\* CineX's `backend/src/services/bos/` folder is marked deprecated. It stays in the repo (for historical reference and rollback safety) but is no longer imported by any active code path.



\*\*Expected change size:\*\* Comment change in each file, plus a `DEPRECATED.md` note in the folder.



\---



\## What CineX does NOT need to change



\- The Clarity contracts

\- The escrow state machine on-chain

\- The user-facing campaign flow

\- The `profiles` table

\- The activity feed's presentation layer

\- Any frontend code



CineX's on-chain and user-facing behavior is unchanged. Only the payout orchestration backend changes.



\---



\## The cutover plan



Integration is not a single moment. It is a phased migration:



\### Phase 1 — Preparation (before Milestone 2 completes)



\- Payout Rail completes Milestone 2 with sandbox-verified Yellow Card integration

\- CineX's `RecipientRegistry` implementation is written and tested locally

\- CineX's webhook handler is written and tested locally

\- The data migration script is written and tested against a copy of CineX's database



\### Phase 2 — Parallel run (after Milestone 2)



\- CineX continues using its internal BOS for production payouts

\- CineX also sends mirrored requests to Payout Rail in "shadow mode" (Payout Rail processes the payout but does not deliver it)

\- Compare outcomes: do both systems reach the same terminal state? Do the evidence records match?

\- Address any discrepancies



\*\*Duration:\*\* 1–2 weeks



\### Phase 3 — Cutover



\- CineX's escrow release flow switches to Payout Rail as the primary

\- The internal BOS is set to read-only (writes are rejected; it becomes a historical record)

\- CineX's activity feed switches to webhook-driven

\- The data migration script is run for any non-terminal disbursements

\- A cutover report is produced



\### Phase 4 — Deprecation (post-cutover)



\- The internal BOS is marked deprecated

\- The old routes and workers are removed or disabled

\- The old tables are archived

\- Documentation is updated



\---



\## Risks



| Risk | Likelihood | Impact | Mitigation |

|---|---|---|---|

| In-flight disbursements are stranded at cutover | Medium | High | Run the data migration script; document any stranded disbursements in the cutover report |

| Payout Rail has a defect discovered after cutover | Medium | High | Parallel run phase catches defects before cutover; rollback path exists (re-enable the internal BOS) |

| CineX's `RecipientRegistry` returns different eligibility than the internal BOS did | Low | Medium | Test the registry against the same data in Phase 1 |

| Webhook delivery fails | Low | Medium | CineX's webhook handler is idempotent; Payout Rail's reconciliation layer detects missing events |

| CineX's activity feed is empty for a period during cutover | Medium | Low | Announce the cutover window; backfill from the migration script |

| Payout Rail is still prototype software | High | High | Integration happens after Milestone 2, when Payout Rail has sandbox evidence |



\---



\## What this integration enables



After integration:



\- \*\*CineX no longer maintains payout infrastructure.\*\* It calls Payout Rail like any other Stacks application.

\- \*\*CineX benefits from every Payout Rail improvement automatically.\*\* No forked code, no version drift.

\- \*\*CineX's audit trail is now complete.\*\* Every payout has a canonical evidence record and a settlement receipt.

\- \*\*CineX can operate multi-corridor payouts\*\* (NGN today, KES/ZAR tomorrow) by registering additional corridor configurations in Payout Rail, not by changing CineX.

\- \*\*CineX becomes the first real integrator of Payout Rail.\*\* That is evidence for Payout Rail's grant milestones: "at least one external Stacks application has integrated."



CineX is not just a consumer. It is proof that the infrastructure is adoptable.



\---



\## When this work happens



\*\*Not now.\*\* Payout Rail is in prototype status. Integrating a prototype into CineX means CineX inherits the prototype's unverified external behavior.



\*\*After Milestone 2 of Payout Rail's Stacks Endowment grant\*\* (target: December 12, 2026), when Payout Rail has:

\- Testnet evidence for the Stacks burn

\- Yellow Card sandbox validation

\- A settlement receipt from a real sandbox run



At that point, this plan becomes a well-scoped sprint. It is estimated at 2–4 weeks of work, spread across CineX's escrow flow, a new webhook handler, a registry implementation, and a migration script.



\---



\## Related documents



\- Payout Rail repository: https://github.com/OmenaiVIC/payout-rail

\- Payout Rail's integration guide: `docs/INTEGRATION.md` (in the Payout Rail repo)

\- Payout Rail's repository boundary: `docs/extraction-plan/REPOSITORY\_BOUNDARY.md` (in the Payout Rail repo)

\- Payout Rail's v1 API: documented in `docs/INTEGRATION.md`

\- This plan supersedes any prior assumption that CineX's internal BOS will be maintained independently.

