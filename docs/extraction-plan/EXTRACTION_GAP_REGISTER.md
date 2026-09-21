# EXTRACTION_GAP_REGISTER — open issues discovered while mapping the extraction

Status: Discovery & mapping. Date: 2026-09-20.
Classification: P0 (blocks safe extraction) / P1 (blocks core payout functionality) / P2 (important, non-blocking) / P3 (later improvement). Priority is for the extraction work — resolving does not imply modifying CineX (≤A/B/C).

## P0 — blocks safe extraction

- **G-1. Stacks burn/status surface lives inside the `contractService.js` monolith (86 exports), and `bridgeAdapterFactory` receives the whole service.** 84 exports — including all creative-financing entrypoints that write CineX tables — must not cross the seam. Required: a narrow `StacksAdapter` interface (`burnUsdcx`, `getTransactionStatus`) with Rail-owned keys/config, proven by Rail tests against a fixture before any copy depends on it.
- **G-2. `payoutGates.whitelistPrerequisite` reads the CineX `profiles` table.** If the file is copied as-is, the new repo is coupled to CineX's profile model. Required: `RecipientRegistry` interface; CineX keeps the `profiles` read under its own implementation. Verify which gates actually call it and the exact verified-flag semantics.
- **G-3. `evidenceCollector` (and auditTimeline/fallbackPoller) call `db.query()` (pg-style), which the shared `database.js` wrapper does not expose (get/all/run only) — and `evidenceCollector` is live-wired via `transitionActions`.** **Payout Rail uses `get/all/run` from day one; it never calls `db.query()`.** CineX behavior is unchanged — **do not fix CineX**; any runtime defect is CineX's to own, and Payout Rail's copy is written to the `get/all/run` API from the start.
- **G-13. Relay/sponsorship taxonomy (migration 008 + `sponsorService`, `passkeyService`, `relayMonitor`, fee-sponsorship)** — **CineX-owned; not moved.** Migration 008 and the relay/sponsorship/passkey layer stay in CineX; they are out of Payout Rail scope. Any future move is a separate, explicit product decision. Do not copy `008_relay_sponsorship.sql` or the relay services across the seam.

## P1 — blocks core payout functionality

- **G-4. `config/chain.js` is imported at module-load time by `transitionActions.js` and `xreserveAdapter.js`.** Must become config-injected (the `ctx` pattern used elsewhere). Env contract: `STACKS_NETWORK`, `USDCX_CONTRACT`, `HIRO_API_URL`, `DEPLOYER_ADDRESS`, `networkInstance`, `txVersion`, `EXPLORER_URL`.
- **G-5. `bosMonitoring.js` `/cron/indexer` hits `indexerWorker.js` (CineX).** The endpoint stays in CineX, dropped from Payout Rail. Verify no other BOS route imports CineX services.
- **G-6. Disbursement `campaign_id INTEGER NOT NULL` is a semantic FK into CineX campaign ID space, load-bearing in summary/aggregate queries.** Needed: `source_reference` + `source_application` migration in Rail, parity tests for summary/aggregates, idempotency preserved under the new reference.
- **G-7. `stacks-payout-bos/` (repo root) is a stale, near-identical scaffold (v0.1.0) with its own migrations/tests.** Two sources of truth is a finding-hazard. Retire it in CineX only after asserting the canonical copy and recording the diff; do not move it. Requires evidence of divergence before any cleanup.
- **G-8. Webhook receiver/verification is split: `webhookVerifier.js` (HMAC primitives) is test-exercised, while the live `webhooks.js` route does its own inline checks.** Confirm dead-vs-live, keep both capabilities in Rail's webhook module, delete nothing until Sprint 0 verification.
- **G-9. Yellow Card / xReserve adapters are placeholders-to-live-surface.** xReserve endpoints per xreserve-integration-surface-lock §6.2 are Q1 external assumptions; Yellow Card has no live credentials/evidence. Rail ships both adapters labeled UNVERIFIED and runs `BRIDGE_ADAPTER_ENV=mock` until credentials exist and an end-to-end pass is proven.

## P2 — important, non-blocking

- **G-10. Hardcoded CineX defaults in env handling**: `BASE_URL` default `https://cine-x-api.vercel.app` (`transitionActions` webhook callbacks), `DEFAULT_USDCX_NGN_RATE` default 1650 (likely stale vs real rate, seeds when table empty). Rail requires these from env with no CineX-identifying defaults; rate stays fresh via the exchange-rates table seeding path.
- **G-11. Module-style split**: 3 CJS/pg-style helpers vs. 22 ESM modules. Normalize to one convention in the move (Sprint 0), behavioral parity evidenced by tests.
- **G-12. `pipelineWorker` shutdown** doesn't clear its interval (start/stop symmetry); `monitorJob`, `stuckStateReaper`, `reconciliationWorker` also need explicit lifecycle in the Rail runner. Record as steering item; do not modify CineX's copy as a precondition.
- **G-14. ILP (P2-conditional, §12.1–12.2, `docs/ILP_ARCHITECTURE.md`)** requires xReserve adapter (exists), BOS pipeline (exists), Yellow Card (exists) + missing connector. P2-conditional on grant confirmation; out of this body of work. Later improvement, not an extraction blocker.
- **G-15. Monitoring/doc staleness**: dead SMTP env vars (SMTP_USER/PASS/HOST/PORT), reports of prime scheduled-route gaps. Confirm which env vars Rail actually needs (`CRON_SECRET`, `YELLOW_CARD_*`, `XRESERVE_*`, `BOS_*`, `PAYOUT_API_BASE_URL`) and list them in Rail `.env.example`.

## P3 — later improvement

- **G-16. Two-person payout approvals have no dashboard UI** — JSON/human-approval via `manual_review_queue` exists; a first-class approve/deny UI is post-critical-path.
- **G-17. Multi-corridor abstraction** beyond NGN (STX-burn → xReserve-attestation → Yellow Card release): the state machine is corridor-agnostic; new corridors are new adapter sets (design documented, exercise later).
- **G-18. Frontend/monitoring dashboard** for disbursements (currently curl/cron-oriented). Not required for the extraction; later product surface.

## Rollup — what the extraction phase must NOT do

- Modify any CineX repo file beyond A/B/C-class changes in an implementation phase.
- Commit, push, or create the new repo, `.envs`, or CI in this discovery phase.
- Claim live integration with xReserve/YC without credentials.
- Copy secrets, CineX URLs, or deployment config across the seam.

## Unresolved decision list (needs input before Sprint 0)

| ID | Decision | Options |
|---|---|---|
| D-1 | Working name of the new repo | `payout-rail` (proposed) |
| D-2 | `stacks-payout-bos/` disposition | retire in CineX after evidence (default) |
| D-3 | Relay/sponsorship (008) scope | CineX-owned, not moved (default) |
| D-4 | Indexing approach in Payout Rail | new BOS-only indexer (default) vs. reuse shared capture |