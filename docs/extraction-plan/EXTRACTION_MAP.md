# EXTRACTION_MAP — CineX → Payout Rail (BOS)

Status: Discovery & mapping phase (Prompt 0A). Discovery only — no structural changes made.
Date: 2026-09-20. Source of truth: the inspected repository, not prior documentation.

## 1. Source & Destination

| | |
|---|---|
| CineX source location | Repo root `C:\Users\CineX-main` (branch `main`, clean working tree). Protected source product. |
| BOS source location | `backend/src/services/bos/` (25 files: 20 core + 5 `monitoring/`) + wiring in `index.js`; routes `webhooks.js` + `bosMonitoring.js`; ingestion hook in `routes/escrow.js`; BOS-used surface in `services/contractService.js`; shared `config/chain.js`; migrations `006_bos_schema.sql`, `007_bos_monitoring.sql`, `009_payout_gates.sql`, `010_bos_e2e.sql`. |
| Destination | New repo `payout-rail` (working name). Not created yet — this phase maps only. Fresh repo; git history is not carried over, provenance documented via an `ATTRIBUTION.md`/`EXTRACTION_ORIGIN.md` referencing the CineX commit. |
| Parallel copy | `stacks-payout-bos/` at repo root (`@degents/stacks-payout-bos`, v0.1.0) is an earlier scaffold of the same module. Canonical source = `backend/src/services/bos/`. |

## 2. Extracted components (target of the move)

Core orchestration core:
- `bos/types.js` — 14-state `DisbursementState` enum (`disbursement_initiated`, `preflight_check`, `burn_submitted`, `burn_confirmed`, `attestation_requested`, `attestation_confirmed`, `destination_release_submitted`, `destination_release_confirmed`, `yellowcard_payout_submitted`, `yellowcard_payout_confirmed`, `settled`, `failed`, `cancelled`, `manual_review`); `TERMINAL_STATES` = settled/failed/cancelled; `FAILED_STATES` = failed/manual_review.
- `bos/stateMachine.js` — transition table + `executeTransition` (guard → action → audit).
- `bos/transitionGuards.js` — 11 pure, side-effect-free transition predicates.
- `bos/transitionActions.js` — 14 idempotent side-effect actions (burn, attest, release, payout, settle). **Needs de-coupling**: currently imports `config/chain.js` (`USDCX_CONTRACT`) — becomes config-injected.
- `bos/disbursementService.js` — public orchestrator: `initiateDisbursement`, `advanceDisbursement`, retry/recover, get/list/summary, `handleYellowCardWebhook`. Already `ctx`-injected.
- `bos/pipelineWorker.js` — 30s heartbeat, one step per tick per disbursement.
- `bos/stuckStateReaper.js` — 60s SLA escalation → `manual_review`.
- `bos/reconciliationWorker.js` — 5min burn/payout reconciliation.
- `bos/preflight.js` — SAFE-forwarding gate-stack runner.
- `bos/circuitBreaker.js` — global kill-switch (closed/open/half-open).
- `bos/twoPersonApproval.js` — 2-of-N human approval for high-value payouts.
- `bos/payoutGates.js` — financial safety gates. **Needs de-coupling**: `whitelistPrerequisite` reads CineX `profiles` table (verified/whitelisted state) → replace with a generic recipient-eligibility registry interface.
- `bos/evidenceCollector.js` — immutable evidence artifacts. **Needs de-coupling**: calls `db.query()` (pg-style) that the shared DB wrapper lacks (get/all/run only); live-wired via `transitionActions` — latent runtime incompatibility in CineX.
- `bos/auditTimeline.js` — human-readable disbursement timeline. CJS → ESM; normalize DB access.
- `bos/fallbackPoller.js` — webhook-failure fallback polling. CJS → ESM; confirm plumbing in Sprint 0.
- `bos/webhookVerifier.js` — HMAC verification primitives (currently exercised by tests only; live routes use `express.json` + direct checks — verify dead-vs-live before moving).
- `bos/bridgeAdapterFactory.js` — adapter DI factory keyed on `BRIDGE_ADAPTER_ENV` (xreserve|mock).
- `bos/xreserveAdapter.js` — xReserve attestation/release REST client. **Needs de-coupling**: imports `config/chain.js` → config object.
- `bos/yellowcardAdapter.js` — Yellow Card /business REST client + YcHmacV1 signing.

Monitoring layer (`bos/monitoring/`):
- `thresholdConfig.js`, `notifier.js` (nodemailer — dead SMTP vars in prod), `alertDeduplicator.js`, `dashboardQueries.js`, `monitorJob.js` — SLA/alert/dashboard infra. Deduplicator + queries + monitorJob import `database.js` (`getDb`) — **needs de-coupling**: injected db.

API surface:
- `routes/webhooks.js` — Yellow Card webhook receiver (`POST /yellowcard`, `POST /yellowcard/test` 403 in prod) → `handleYellowCardWebhook`.
- `routes/bosMonitoring.js` — `/api/bos/monitoring` (Bearer `CRON_SECRET`); endpoints `/health`, `/pipeline`, `/active`, `/alerts`, `/alerts/stats`, `/alerts/:id/acknowledge`, `/disbursement/:id/timeline`, `/manual-review`, `/run`, `/workers`, `/workers/pipeline/run`, `/cron/pipeline`. **Needs de-coupling**: `/cron/indexer` → indexer stays in CineX, route dropped from Payout Rail.

Data layer:
- Migrations `006_bos_schema.sql` (disbursements, disbursement_audit, external_refs, external_status_snapshots, yellow_card_webhook_events, manual_review_queue, relay_wallet_activity, on_chain_events, exchange_rates, config_snapshots), `007_bos_monitoring.sql` (bos_alerts + alerting tables), `009_payout_gates.sql` (gate/approval tables), `010_bos_e2e.sql` (disbursement_evidence + ALTERs). Renumbered `001..004` in Payout Rail.
- `contractService.burnUsdcx` + `getTransactionStatus` — narrowed into a standalone **StacksAdapter** interface (own key management/config), so the rail runs without `contractService.js`.
- `config/chain.js` carved out: `USDCX_CONTRACT`, `HIRO_API_URL`, `DEPLOYER_ADDRESS`, `STACKS_NETWORK`, `networkInstance`, `txVersion`, `EXPLORER_URL` → Payout Rail config module. File itself stays in CineX (6 consumers).

## 3. Retained components (stay in CineX — do NOT move)

- `contractService.js` whole file + the other 84 exports (campaign/escrow/milestone/verification/pool/yield/reputation/{createCampaign,contribute,deposit,submitProof,approve,release,emergencyVerify,...}).
- Routes: `admin, ai, auth, campaigns, contact, demo, deploy, feed, milestones, pools, profiles, userSettings, verification, wallets, yield` + core `index.js` glue + `escrow.js` ingestion hook (payout rail integration point stays; CineX keeps the trigger).
- Services: `indexerWorker` (feed cursor, §11.4), `ai`, `emailService`, `walletService`, `rateService`, `passkeyService`, `sponsorService`, `relayMonitor`.
- Migrations `001–005` and `008_relay_sponsorship.sql` (relay is CineX-owned, not moved — G-13).
- Entire `app/` frontend (no `/api/bos/*` consumption), `contracts/` Clarity, `spike-pillar/`, demo scripts, `.env*`, all secrets (CREATOR_KEY, BACKER_KEY, RELAY_API_KEY, etc.).
- `config/chain.js`, `services/database.js` as CineX files.

## 4. CineX dependencies (of the extracted code)

| Dependency | Where it appears | Disposition |
|---|---|---|
| `contractService.js` monolith (86 exports) | `bridgeAdapterFactory.getStacksAdapter(contractService)` — **param injection**, not import | B — narrow to `burnUsdcx` + `getTransactionStatus` → standalone StacksAdapter |
| `config/chain.js` | `transitionActions.js`, `xreserveAdapter.js` (import-time) | B — carve chain config into own module; file stays for CineX |
| `database.js` (`getDb`) | `monitoring/alertDeduplicator`, `dashboardQueries`, `monitorJob` | B — inject db; no import at module load |
| `database.js` wrappers (`query` pg-style) | `evidenceCollector`, `auditTimeline`, `fallbackPoller` | B — normalize to `get/all/run`; note latent runtime incompatibility |
| `profiles` table | `payoutGates.whitelistPrerequisite` (verified flag) | B — replace with generic recipient-eligibility registry interface |
| `indexerWorker.js` | `bosMonitoring.js` `/cron/indexer` | C — keep in CineX; drop route from Payout Rail |
| `routes/escrow.js` → `initiateDisbursement` | `release-milestone` success path (dual-write) | C — stays as CineX ingestion point; Payout Rail exposes its own public API for callers |
| Disbursement `campaign_id INTEGER NOT NULL` | semantic FK to CineX campaign ID space (no SQL FK) | B — make generic `source_reference` + `source_application`; document mapping |
| Env `BASE_URL` default `https://cine-x-api.vercel.app` | `transitionActions` webhook callbacks | B — config required, no CineX hardcoded default |

## 5. Dependencies removed

None at extraction time. CineX is preserved verbatim; every dependency above is either retained or replaced by an interface. No file, table, endpoint, or script is deleted during extraction phase.

## 6. Dependencies replaced

| Dependency | Replaced with |
|---|---|
| `contractService.{burnUsdcx,getTransactionStatus}` | `StacksAdapter` (own key mgmt + chain config; SIP-010 burn + tx polling) |
| `config/chain.js` (BOS-use subset) | Payout Rail `chainConfig.js` (same names/envs, sourced from env) |
| `database.js` import (monitoring) | injected `db` handle at worker/monitor init |
| `db.query()` (helpers) | `get/all/run` API; wrap SqliteCompat for portability |
| `profiles` whitelist read | `RecipientRegistry` interface (verified flag input) |
| `campaign_id` | generic `source_reference` + `source_application`; migration 010 already partially genericizes evidence refs |
| `BASE_URL` default | explicit `PAYOUT_API_BASE_URL` with no CineX default |

## 7. Files / modules moved

The `bos/` subtree (25 files), `routes/webhooks.js`, `routes/bosMonitoring.js` (minus `/cron/indexer`), migrations 006/007/009/010, and the two function carve-outs (§4) — copied into the new repo with attribution. **`ATTRIBUTION.md` is a required output of the extraction** containing: CineX repo URL, source commit SHA, extraction date, and license status. Git history is **not** carried over; see also `EXTRACTION_ORIGIN.md` for granular provenance.

## 8. Files / modules intentionally not moved

`contractService.js`, `config/chain.js`, `database.js`, `indexerWorker.js`, `routes/escrow.js`, full `routes/` dir (incl. `ai`, `profiles`, `campaigns`, `milestones`, `pools`, `verification`, `feed`, `wallets`, `yield`, `admin`), `services/*` other than the 25 `bos/` files, migrations 001–005 + 008, all of `app/`, all of `contracts/`, `stacks-payout-bos/` (retired in CineX, not moved — Gap G-7), demo scripts, CI workflows (recreated for the new repo), `scripts/` (CineX-specific runners).

## 9. Known risks

1. **Live-wired DB-broken helper**: `evidenceCollector` is called from `transitionActions` in the production path and uses `db.query()` the shared wrapper does not provide — evidence writes may already be failing at runtime in CineX. Verify before extraction, do not copy the defect.
2. **Unverified provider surface**: xReserve endpoints are placeholders (xreserve-integration-surface-lock §6.2, Q1 external assumption); Yellow Card has no live credentials/evidence. Payout Rail ships adapter surfaces labeled UNVERIFIED, `BRIDGE_ADAPTER_ENV=mock` only.
3. **Secret hygiene**: `CREATOR_KEY`/`BACKER_KEY`/`RELAY_API_KEY`/admin bootstrap are CineX secrets; new repo gets its own key set + docs, never copies CineX secrets.
4. **Semantic ID coupling**: `disbursements.campaign_id` is load-bearing in summary/aggregate queries; genericizing will change query signatures — needs dedicated schema migration + tests in Payout Rail.
5. **Dual module conventions**: the 3 CJS/pg-style helpers vs 22 ESM modules; normalize as part of the move (Sprint 0), keep behavioral parity.
6. **`stacks-payout-bos/` stale duplicate** creates a second source of truth; retire it in CineX only after assertions on the canonical copy (G-7).
7. **`webhookVerifier.js` may be superseded** by direct route checks — confirm dead-vs-live before copying; do not delete, just classify.

## 10. Extraction assumptions

- Extraction is **copy-based, non-destructive**: CineX remains fully functional before, during, and after. Sprint implementations are A/B/C-class only.
- BOS state machine (14 states, ~24 transitions) is the correct orchestration core to reuse as-is.
- `ctx`-injection already used by `disbursementService`/work- workers is the target pattern for all remaining import-time couplings (§4, §6).
- New repo is open-source, independent, and CI-verifiable without any CineX artifacts.
- `indexerWorker` and the activity feed stay in CineX; Payout Rail gets its own contract-event capture (only BOS contracts), decided in Sprint 0 balancing §1.2/double-indexing.
- Relay/sponsorship (migration 008 + `sponsorService`/`passkeyService`/`relayMonitor`) is CineX-owned and not moved; out of Payout Rail scope. No reclassification without an explicit product decision (G-13).
- ILP remains P2-conditional and out of this body of work (§12, G-14).