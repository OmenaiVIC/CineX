# AGENTS.md — CineX Project Conventions

## Architecture

- **19 logic contracts** (plus 13 trait/interface contracts, 32 total Clarinet entries) across 9 layers: Admin, Oracle/Reputation/Verification, Campaign, Escrow, Yield, Strategy, Milestone Verification, Funding Pool, Base.
- **campaign-module** (renamed from crowdfunding-module) manages campaign lifecycle (create, contribute, claim).
- **milestone-escrow** holds deposited STX and manages milestone-based release. Uses **separate campaign ID space** from campaign-module.
  - Both must have a campaign with the same numeric ID for cross-contract flows.
- **milestone-verification** handles endorser sign-off on milestones.

## Key Trait Methods (backward-compat wrappers)

`milestone-escrow-trait.clar` includes:
- `get-campaign-balance` — returns `(ok uint)` from escrow's campaign map
- `deposit-to-campaign` — delegates to `deposit()` (validates campaign exists)
- `withdraw-from-campaign` — sends STX via `as-contract` to creator (NO `total-deposited` decrement)
- `collect-campaign-fee` — sends STX via `as-contract` to platform collector (NO campaign existence check)

`project-verification-module-trait.clar` includes:
- `get-filmmaker-identity` — backward-compat entry point

## Return Conventions

- **campaign-module** `get-campaign` returns `(ok (tuple ...))` — no optional wrapper.
- **milestone-escrow** `get-campaign` returns `(ok (optional (tuple ...)))` — wrapped in optional.
- Double-unwrap in `milestone-verification.clar`: `match (ok (some ...))` pattern handles both layers.

## Error Codes

- campaign-module: u300–u322
- milestone-escrow: u5400–u5423
- milestone-verification: u5600–u5618
- funding-pool: u5700–u5722

## Deployment

- All `depends_on` in `Clarinet.toml` must be complete for correct ordering.
- Devnet backend runs on port **3001**.
- Run `clarinet check` before any test run.

## Activity Feed Indexer (§11.4)

- **Worker:** `backend/src/services/indexerWorker.js` — polls Hiro API for contract events
- **Contracts indexed:** campaign-module-2, milestone-escrow, milestone-verification, reputation, funding-pool, project-verification-module, oracle-proxy
- **Dedup:** `feed_events` table has `UNIQUE INDEX (tx_id, event_type) WHERE tx_id IS NOT NULL`
- **Cursor:** `feed_index_cursor` table stores `last_block_height` per contract for resumable catch-up
- **Config:** `INDEXER_POLL_INTERVAL_MS` (default 60s), `INDEXER_BATCH_SIZE` (default 50)
- **Wired:** `backend/src/index.js` starts indexer on boot, stops on SIGTERM

## Rating Validation Rules (§11.2)

- **Self-rating prevention:** `raterAddress === targetAddress` → 400
- **Duplicate prevention:** `UNIQUE(rater_address, target_address, project_id)` → 409
- **Eligibility:** Rater must have contributed to a campaign where target is creator → 403
- **Location:** `backend/src/routes/profiles.js` POST `/:address/ratings`

## ILP Architecture (§12.1-12.2)

- **Status:** P2 — Conditional on grant confirmation
- **Doc:** `docs/ILP_ARCHITECTURE.md` — full architecture, schema, endpoints, sequence diagrams
- **Tables:** `ilp_transfers` (transfer tracking), `ilp_cursor` (resumable indexing)
- **Depends on:** xReserve adapter (exists), BOS pipeline (exists), Yellow Card (exists)
- **Missing:** ILP Connector component, demo harness

## On-Chain Bridge (Backend Proxy Pattern)

The backend uses `CREATOR_KEY` and `BACKER_KEY` env var private keys to broadcast smart contract txs as a proxy for Web2 users. All mutation endpoints follow a **dual-write** pattern: write to SQLite first, then broadcast on-chain (wrapped in try/catch — chain failure never blocks the Web2 flow).

### contractService Functions (31 exports)

| Area | Functions | On-Chain Call |
|---|---|---|
| **Wallet/Keys** | `init`, `getNetwork`, `getState`, `testBroadcast`, `getTxStatus` | — |
| **Campaign** | `createCampaignInEscrow`, `createCampaignInModule`, `contribute`, `getCampaignFromEscrow`, `getCampaignFromModule`, `getTotalRaised` | `milestone-escrow.create-campaign`, `campaign-module-2.create-campaign`, `campaign-module-2.contribute-to-campaign` |
| **Escrow** | `depositToEscrow`, `getEscrowCampaign`, `getEscrowBalance`, `getMilestoneState` | `milestone-escrow.deposit`, `milestone-escrow.get-campaign` |
| **Milestone** | `submitProof`, `approve`, `release`, `createMilestones`, `submitMilestone`, `endorseMilestone`, `finalizeMilestone` | `milestone-escrow.submit-milestone-proof`/`approve-milestone`/`release-milestone-funds`, `milestone-verification.create-milestones`/`submit-milestone`/`endorse-milestone`/`finalize-milestone` |
| **Verification** | `emergencyVerifyCreator`, `isCreatorCurrentlyVerified`, `getCreatorFundingCap`, `getCreatorIdentity` | `project-verification-module.emergency-verify-creator`/`is-creator-currently-verified`/`get-verification-funding-cap`/`get-creator-identity` |
| **Portfolio** | `addPortfolio`, `getPortfolio` | `project-verification-module.add-portfolio`/`get-portfolio` |
| **Reputation** | `rateUser`, `getAverageRating` | `reputation.rate-user`/`get-average-rating` |

### Read-Only Calls

Use `readOnlyCall()` not `readContract()` — the latter is undefined.
Pattern: `await readOnlyCall(contractName, functionName, [args...])`

### Wired Backend Routes

- `POST /api/campaigns` → DB insert + `createCampaignInModule`
- `POST /api/campaigns/:id/contribute` → DB insert + `contribute`
- `GET /api/campaigns/:id/chain-state` → chain reads (escrow + module)
- `POST /api/profiles/:address/portfolio` → DB insert + `addPortfolio`
- `POST /api/profiles/:address/ratings` → DB insert + `rateUser`
- `POST /api/milestones` → DB insert + `createMilestones`
- `PUT /api/milestones/:id/status` (→active) → DB update + `submitMilestone`
- `PUT /api/milestones/:id/status` (→completed) → DB update + `finalizeMilestone`
- `POST /api/milestones/:id/vote` → DB insert + `endorseMilestone`

## Deployment

- **Vercel (Frontend)**: `cine-x` project. Root `vercel.json` sets `rootDirectory: "app"`. Deployed at `https://cine-x-iota.vercel.app`.
- **Vercel (Backend)**: `cine-x-api` project (separate for team isolation). Express app with `builds` config in `backend/vercel.json`. Deployed at `https://cine-x-api.vercel.app`. Uses `@vercel/node` runtime, lazy init pattern with `initPromise` middleware.
- **Neon PostgreSQL**: Primary production database. `DATABASE_URL` → `ep-late-band-zarvw2jh-pooler.neon.tech`. Serverless driver (`NEON_DRIVER=serverless`). Auto-detected via `VERCEL=1` env var.

## Chain Config

- **Single source of truth**: `backend/src/config/chain.js` — exports `USDCX_CONTRACT`, `HIRO_API_URL`, `STACKS_NETWORK`, `DEPLOYER_ADDRESS`, `V2_DEPLOYER_ADDRESS`, `EXPLORER_URL`, `networkInstance`, `txVersion`
- All 7 backend files that touch chain config import from this module (no hardcoded addresses/URLs)
- `STACKS_NETWORK` env var: `"mainnet"` (default) or `"testnet"` — controls both network instance and USDCx contract address
- `BASE_URL` env var: backend public URL for x402/relay callbacks (default: `http://localhost:3001`)
- Devnet backend runs on port **3001**.

## Environment Variables (Vercel `cine-x-api`)

| Variable | Status | Notes |
|---|---|---|
| `DATABASE_URL` | ✅ Set | Neon PostgreSQL connection string |
| `NEON_DRIVER` | ✅ Set | `serverless` |
| `STACKS_NETWORK` | ✅ Set | `mainnet` |
| `CREATOR_KEY` | ✅ Set | Testnet key for proxy tx signing |
| `BACKER_KEY` | ✅ Set | Testnet key for proxy tx signing |
| `RELAY_ADDRESS` | ✅ Set | Relay wallet address |
| `RELAY_API_KEY` | ✅ Set | Server-to-server auth |
| `ADMIN_BOOTSTRAP_KEY` | ✅ Set | Admin bootstrap secret |
| `BASE_URL` | ✅ Set | `https://cine-x-api.vercel.app` |
| `SMTP_USER` | ❌ Dead | Not configured on Vercel |
| `SMTP_PASS` | ❌ Dead | Not configured on Vercel |
| `SMTP_HOST` | ❌ Dead | Not configured on Vercel |
| `SMTP_PORT` | ❌ Dead | Not configured on Vercel |
| `CORS_ORIGIN` | ❌ Dead | Not configured on Vercel |

## Testing

- **Vitest** with `@hirosystems/clarinet-sdk` (contracts) and `jsdom` + `@testing-library` (frontend).
- **322 contract tests** across 14 files: `tests/funding-pool.test.ts` (28), `tests/integration.test.ts` (22), `tests/pilot-campaign-parameterization.test.ts` (32), plus 11 individual contract test files.
- **232 backend tests** across 12 files: 53 BOS pipeline/adapter tests (`bosWorkers.test.js`), relay/sponsor tests, API route tests, 9 AI tests (`ai.test.js`).
- **41 frontend tests** across 4 files: OnboardingWizard, CampaignCreationForm, EscrowStatus, MilestoneVoting. (`DemoScenarioPage.test.tsx` was removed during the cinex-canvas reconciliation.)
- `integration.test.ts` has 5 flows: create+contribute → milestone-escrow wrappers → milestone-verification lifecycle → claim → edge cases.
- `createLinkedCampaigns()` helper creates campaign in both `milestone-escrow` (user-specified id) and `campaign-module` (auto-incremented).
- Rendezvous fuzzing: `node scripts/run-rv-for-all.js` runs property tests on all contracts; requires `.tests.clar` stubs in `contracts/`.
- Frontend test setup: `app/vitest.config.js` (jsdom, globals, `@` alias), `app/src/setupTests.js` (jest-dom matchers, localStorage/scrollTo mocks).

## Rendezvous

- Manifest: `.rendezvous/manifest.toml` — lists 27 contract targets.
- Stubs auto-generated by `node scripts/move-and-create-tests.js --create-stubs`.
- Run: `node scripts/run-rv-for-all.js` (uses `--runs=1` default).

## Common Gotchas

- `tx-sender` vs `contract-caller` — campaign-module uses `is-valid-module tx-sender` which blocks `CONTRACT-OWNER` (deployer).
- Block-height dependent fields (`expires-at`, `last-activity-at`) — use dedicated getter fns in tests, not full-tuple match.
- `as-contract stx-transfer?` succeeds when contract has balance even for fake campaign IDs.

## BOS (Bridge Orchestration Service)

- **PRD §1.1 Ground Truth**: "Settlement asset — escrow"
- **Settlement Ground Truth**: Canonical burn → xReserve attestation → release → Yellow Card → NGN
- **BOS schema**: 10 tables in `backend/src/migrations/006_bos_schema.sql`
- **Core tables**: `disbursements` (UUID PK, idempotency_key UNIQUE), `disbursement_audit` (append-only), `external_refs` (mutable identifiers), `external_status_snapshots` (immutable status history)
- **Integration tables**: `yellow_card_webhook_events`, `manual_review_queue`, `relay_wallet_activity`, `on_chain_events`, `exchange_rates`, `config_snapshots`
- **State machine**: 14 states (including `PREFLIGHT_CHECK`), 28+ transitions; WS-A adds `payout_gates`, `two_person_approvals`, `circuit_breaker_state` tables
- **Idempotency**: `disbursements.idempotency_key` UNIQUE constraint; every handler must be idempotent under duplicate worker execution
- **Adapter pattern**: BOS state machine design doc §5.1–5.3; adapters: `stacks-burn`, `xreserve-attestation`, `yellow-card-ngn`
- **Error codes**: init u8201–u8209; burn u8210–u8218; attestation u8220–u8228; payout u8230–u8238; generic u8290–u8299
- **Monitoring**: Prometheus metrics, Grafana dashboards, PagerDuty alerts, reaper workers
- **Secrets**: `YELLOW_CARD_API_KEY`, `YELLOW_CARD_SECRET_KEY`, `YELLOW_CARD_ENV`, `YELLOW_CARD_WEBHOOK_SECRET`, `XRESERVE_API_URL`, `XRESERVE_API_KEY`, `XRESERVE_ENV`, `BOS_STATE_SIGNING_KEY`, `BOS_TX_SIGNING_KEY`, `NEON_DATABASE_URL`, `NEON_BOS_BRANCH` — **none configured on Vercel yet** (API credentials not obtained)

## Fee Sponsorship / Relay Architecture

- **PRD Reviewer Addendum**: "fee sponsorship / relayer policy for first-use transactions" — release requirement
- **3-layer relay architecture**: relayAuth (auth + rate limit) → sponsorService (policy engine) → passkeyService (executor)
- **Sponsorship policy**: stx-transfer ✅, onboard ✅, recovery ✅ — CineX pays all gas (CAC)
- **Anti-abuse controls**: 10 req/hr per user (in-memory), 20 transfers/day per user (DB), 10 STX max per transfer, relay min balance 50 STX, circuit breaker toggle
- **DB schema**: 3 tables in `008_relay_sponsorship.sql` — `relay_transfers` (audit log), `relay_quotas` (daily counters), `relay_config` (key-value config)
- **Environment vars**: `RELAY_ADDRESS`, `RELAY_API_KEY` (optional server-to-server auth)
- **Monitoring**: `relayMonitor.js` runs every 5min, checks balance/volume/failure rate, alerts to `bos_alerts`
- **Idempotency**: `X-Idempotency-Key` header (UUID) → cached result on duplicate
- **Auth options**: Session-based (req.user.address) or API key (X-Relay-API-Key + X-Relay-User-Address)
- **Key files**: `backend/src/services/sponsorService.js`, `backend/src/middleware/relayAuth.js`, `backend/src/services/relayMonitor.js`
- **Tests**: 98 passing across 10 test files (relayAuth, sponsorService, relayMonitor, passkeyService, passkeyRoutes, bosWorkers [53], api routes)

## Brand

- App icon: `https://drive.google.com/file/d/1Y_Zu9nltx6mPxlqsBObGM3Ikw9YrbLXz/view`
- DeFi logo: `https://drive.google.com/file/d/1BqNdw4Veddit0hWauS20bUBXbWWwot6v/view`
- Social banner: `https://drive.google.com/file/d/1lwAbgwtyy5hMfAyxdLt1hpdJ7A5yUSe0/view`

## Session Context (2026-07-16 → 2026-07-17)

### Done This Session
- **Neon Migration §3.1, §3.2, §3.3 — COMPLETE**: `.env` with Neon connection string, `database.pg.js` with Neon serverless driver auto-detection, `dotenv` + `@neondatabase/serverless` + `ws` dependencies, `scripts/neon-migrate.js` (pg_dump/restore), `scripts/neon-smoke-test.js` (8-point validation), `scripts/neon-discrepancy-check.js` (drift detection), `docs/NEON_MIGRATION.md` (runbook + decommission checklist)
- **Backend verified on Neon**: `✅ PostgreSQL connected (neon-serverless driver)`, 3 profiles seeded, all migrations applied
- **BOS Schema — 10 tables created**: `006_bos_schema.sql` with disbursements, disbursement_audit, external_refs, external_status_snapshots, yellow_card_webhook_events, manual_review_queue, relay_wallet_activity, on_chain_events, exchange_rates, config_snapshots
- **database.pg.js updated**: Added `006_bos_schema.sql` to migration list
- **AGENTS.md updated**: Added BOS section, fixed stale test count (222→322)
- **Pillar Passkey Spike — COMPLETE**:
  - Spike document: `docs/spikes/pillar-passkey-spike.md` (Go/No-Go, architecture decisions, scaffold structure)
  - Path A scaffold: `spike-pillar/` — 27/27 tests pass
  - Real P-256 crypto via `@noble/curves/nist.js` (no SDK needed — `@clarity-webauthn/sdk` doesn't exist)
  - Clarity contracts: `clarity-webauthn.clar` (204 lines, P-256 verifier) + `cinex-smart-vault.clar` (~100 lines, minimal vault)
  - `clarinet check` passes (0 errors, 2 warnings)
  - **TESTNET DEPLOYED (2026-07-17)**:
    - `clarity-webauthn` → `ST29JKDEFRY0RYMGF97FZC9PZWJ4H4VBSQFFERNXX.clarity-webauthn` ✅
    - `cinex-smart-vault` → `ST29JKDEFRY0RYMGF97FZC9PZWJ4H4VBSQFFERNXX.cinex-smart-vault` (orphaned, wrong owner) ⚠️
    - `cinex-smart-vault-v2` → `ST29JKDEFRY0RYMGF97FZC9PZWJ4H4VBSQFFERNXX.cinex-smart-vault-v2` (correct owner) ✅
    - Account: `ST29JKDEFRY0RYMGF97FZC9PZWJ4H4VBSQFFERNXX` (~498 STX remaining)
    - Onboard completed: block 4044712 ✅
    - **E2E P-256 signed transfer CONFIRMED**: block 4044722 ✅
      - P-256 keypair → WebAuthn data construction → P-256 signature → on-chain verify-assertion `(ok true)` → vault.stx-transfer 1 STX → confirmed
      - Script: `scripts/e2e-transfer.mjs`
    - Deploy scripts: `deploy-testnet.mjs`, `deploy-vault.mjs`, `onboard-user.mjs`, `e2e-transfer.mjs`
    - Key findings: auth flag was always correct (0x04 Standard); prior "0x80 bug" was misreading version byte
    - Key finding: `@stacks/transactions` v6.17.0 works, v7.5.0 is broken for deployment
    - Key finding: Hiro API returns txid as raw string, not `{txid}` object
    - Key finding: `principalStandard()` doesn't exist — use `principalCV()`
    - Key finding: `decodeAddress()` doesn't exist — use `createAddress()` or `cvToHex`
    - Key finding: `stx-transfer?` returns `(err u2)` when sender == recipient
  - Deploy script: `pillar-deploy.ts` (contract deploy + onboard via Hiro API)
  - Address derivation: `pillar-address.ts` (pure computation)
  - Clarinet 3.21.1 installed (was 3.8.1)
  - Key finding: hybrid approach (P-256 + secp256k1) is impossible — different curves
  - Key finding: P-256 keys are auth factors only, NOT used for address derivation
  - Key finding: user address = Vault contract address (`ST{deployer}.cinex-smart-vault-{user-id}`)
  - Path B scaffold: `spike-stacks-connect/` (stub-only, requires browser extensions)
  - Updated: `WALLET_ABSTRACTION_PLAN.md` with spike doc reference

### Done This Session (2026-07-18)
- **Vault v3 security fix COMPLETE:** `owner-pubkey` data-var added, stored in `onboard`, validated in `stx-transfer`; deployed at block 4045558
- **CineX relay backend COMPLETE:** `passkeyService.js` (6 functions), `passkey.js` routes, mounted in `index.js`
- **E2E script updated for v3:** `e2e-transfer.mjs` rewritten for separate P-256 owner + secp256k1 relay keypairs
- **VAULT v3 E2E PROVEN ON TESTNET:**
  - Onboard: block 4045569 ✅
  - stx-transfer: block 4045570 ✅
  - Owner pubkey stored + validated: ✅
  - P-256 signed transfer with separate keypairs: ✅

### Done This Session (2026-07-18 cont.)
- **Vault v4 E2E PROVEN ON TESTNET:**
  - Deploy: block 4046942 ✅
  - Onboard: block 4046944 ✅
  - SIP-018 signed transfer: block 4046945 ✅
  - All scripts updated for v4 (e2e-transfer.mjs, deploy-vault.mjs, onboard-user.mjs, passkeyService.js)
- **Fee Sponsorship / Relay — COMPLETE:**
  - DB migration `008_relay_sponsorship.sql`: relay_transfers, relay_quotas, relay_config (3 tables)
  - `sponsorService.js`: Policy engine with daily quotas, balance checks, circuit breaker, idempotency
  - `relayAuth.js`: Auth middleware (session or API key) + per-user hourly rate limiting
  - `relayMonitor.js`: Balance monitoring, volume tracking, failure rate alerts → bos_alerts
  - `passkeyService.js` updated: Integrates sponsorship tracking, logs to relay_transfers
  - `passkey.js` routes updated: 3-layer middleware chain (auth → sponsorship → relay)
  - `index.js` updated: Relay monitor startup on RELAY_ADDRESS set
  - `.env.example` updated: RELAY_ADDRESS, RELAY_API_KEY
  - 63 backend tests passing across 5 test files
- **Neon Migration — VERIFIED COMPLETE:**
  - Backend starts, connects to Neon (neon-serverless driver), applies 7 migrations, seeds 3 profiles ✅
  - `docs/NEON_MIGRATION.md` rewritten as "Migration Complete" record (Render decommissioned, Supabase never operational)
- **Render/Supabase Dependency Cleanup — 11 FILES UPDATED:**
  - `README.md`: Removed dead `render.yaml` link, updated deployment table (Backend → Vercel, Database → Neon)
  - `AGENTS.md`: Updated deployment section (Render → Vercel experimentalServices, added Neon PostgreSQL)
  - `CINEX_DEMO_V1_ROADMAP.md`: Marked Render URL as SUSPENDED
  - `DEPLOYMENT_1DAY_WORKPLAN`: Updated backend deploy target (Railway/Render → Vercel)
  - `.github/workflows/deploy.yml`: Replaced Render deploy hook with Vercel backend deploy
  - `app/public/litepaper.html`: Updated Layer 4 description (SQLite → Neon, Render → Vercel)
  - `frontend/litepaper.html`: Same update
  - `frontend/index.html`: Updated roadmap description
  - `FRONTEND_AI_IMPLEMENTATION_PLAN_2WEEKS.md`: Marked as HISTORICAL with infrastructure note
- **BOS monitor bug found:** `column "updated_at" does not exist` — schema mismatch in BOS monitoring query (separate fix needed)
- **Backend deployed to Vercel — COMPLETE:**
  - Separate project `cine-x-api` deployed at `https://cine-x-api.vercel.app`
  - `builds` config in `backend/vercel.json` with `@vercel/node` runtime
  - `index.js` restructured: `export default app`, eager init with `initPromise` middleware
  - Multer uses `/tmp` on Vercel (read-only filesystem elsewhere)
  - Neon auto-detected via `VERCEL=1` env var
  - DB seeded: 3 profiles returned from `/api/profiles` ✅
  - `VITE_API_BACKEND` env var set on frontend project → `https://cine-x-api.vercel.app/api`
  - Frontend `api.ts` fallback URL updated from Render to Vercel

### Done This Session (2026-07-21)
- **Vercel env vars set with real testnet keys:**
  - Generated testnet keypair for relay: CREATOR=`ST3CAYVEF4T5REN8DXXVD2RNVXDXVGQAG3RPX2SB4`, BACKER=`ST3MW8XN0A69B5TGRMNDSEVC75ABFRGGGY0D5KXXF`
  - Funded both addresses via Hiro faucet (`/extended/v1/faucets/stx` — note: plural "faucets")
  - Set CREATOR_KEY, BACKER_KEY, RELAY_ADDRESS, RELAY_API_KEY on Vercel `cine-x-api` project
- **Migration 008 verified on Neon** — relay_transfers, relay_quotas, relay_config tables already exist
- **Backend redeployed to Vercel** — `vercel --prod` from `backend/` directory
- **All endpoints verified:**
  - `GET /health` → `{"status":"ok"}` ✅
  - `GET /api/passkey/health` → `{"status":"healthy","balanceStx":500,"address":"ST3CAYVEF4T5REN8DXXVD2RNVXDXVGQAG3RPX2SB4"}` ✅
  - `GET /api/profiles` → 3 profiles from Neon ✅
- **Phase 3: Frontend passkey integration — COMPLETE:**
  - `app/public/passkey-test.html` — standalone test page (632 lines): P-256 keypair management, SIP-018 challenge computation via `@stacks/transactions` CDN, WebAuthn-compatible signing, relay transfer with 6-step progress UI
  - `app/src/services/passkeyService.ts` — browser-side passkey operations: keypair mgmt, SIP-018 computation (Web Crypto SHA-256), P-256 signing, relay backend communication
  - `app/src/contexts/PasskeyContext.tsx` — React context for passkey state (initPasskey, resetPasskey, transfer, checkHealth, checkQuota)
  - `app/src/app/App.tsx` — PasskeyProvider wired into provider hierarchy
  - `app/package.json` — `@noble/curves` v2.2.0 added as dependency
  - Vite build passes (0 errors from new files)
- **Vercel Root Directory** — `cine-x-api` project has Root Directory = `.` (repo root), needs manual fix to `backend` in dashboard. Backend works via explicit `builds` config in `backend/vercel.json`.

### Done This Session (2026-07-22)
- **E2E RELAY TEST PROVEN ON TESTNET:**
  - Deploy clarity-webauthn + vault (fresh per-run, unique name `cv-{pubkey}`) ✅
  - Onboard vault with P-256 key ✅
  - SIP-018 challenge + P-256 sign + local verify ✅
  - Relay backend broadcast via `POST /api/passkey/transfer` ✅
  - **On-chain confirmation in block 4048423** ✅
  - TX: `0xeb08e57a719ff38703a1a4520afd1845c9f6ef87f9a5d4a57e417f0a24313d33`
  - Script: `app/scripts/e2e-relay-test.mjs` (self-contained: deploy → onboard → sign → relay → confirm)
- **Key findings from E2E debugging:**
  - `ST000000000000000000000040000000` has invalid c32 checksum in `@stacks/transactions` v6 — cannot use `standardPrincipalCV` for native token contract
  - Vault's `stx-transfer` uses `tx-sender` as source, NOT vault balance — no funding step needed
  - `principalCV` fails on contract principals — use `contractPrincipalCV(addr, name)` instead
  - Clarity boolean `true` = `0x04` (not `0x03` which is `err`)
  - Hiro API call-read URL format: `/v2/contracts/call-read/{addr}/{name}/{fn}` (slash-separated, not dot)
  - Fresh vault per test run avoids `ERR_UNAUTHORISED` from re-onboarding already-initialized vaults

### Done This Session (2026-07-22 cont.)
- **6.6 Deposit/Withdraw/Sign Flows — COMPLETE (frontend hooks + UI):**
  - `app/src/services/tokenService.ts` — SIP-010 balance, STX balance, tx status polling via Hiro API
  - `app/src/hooks/useTransaction.ts` — 6-state lifecycle (idle → building → signing → broadcasting → confirming → confirmed|failed|cancelled), localStorage persistence, Hiro tx polling (3s interval, 90s timeout)
  - `app/src/hooks/useBalance.ts` — Unified on-chain STX + USDCx + backend NGN/USD balance
  - `app/src/hooks/useIdempotencyKey.ts` — UUID-based duplicate submission prevention (10min expiry)
  - `app/src/hooks/useDeposit.ts` — Deposit flow via backend escrow endpoint
  - `app/src/hooks/useWithdraw.ts` — Withdraw flow via backend escrow endpoint
  - `app/src/components/wallet/TxStatusTimeline.tsx` — Visual status timeline for money-movement flows (5 steps with check/spinner/error/skip states)
  - `app/src/components/common/TransactionModal.tsx` — Upgraded with `lifecycleState` prop and TxStatusTimeline integration; backward-compatible with legacy 4-state mode
  - `app/src/components/wallet/WalletBalance.tsx` — Now shows on-chain STX + USDCx balances alongside backend NGN/USD book balance
  - `app/src/components/wallet/FundWalletModal.tsx` — Added "Digital $" tab (USDCx) with passkey-signed on-chain deposit
  - `app/src/components/wallet/SendMoneyForm.tsx` — Added "Digital $" tab (USDCx) with passkey-signed on-chain send
  - `app/src/components/wallet/CurrencyConverter.tsx` — Added USDCx to currency list
  - `app/src/config/contractAddresses.ts` — Added `usdcx` and `asset_registry` contract keys
  - `app/src/utils/network.ts` — Added `usdcx` and `asset_registry` env var mappings
  - `app/src/types/index.ts` — Added `TxLifecycleState`, `PendingTx`, `DepositParams`, `WithdrawParams`
  - **USDCx contract addresses**: Testnet `ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.usdcx`, Mainnet `SP120SBRBQJ00MCWS7TM5R8WJNTTKD5K0HFRC2CNE.usdcx`
  - **Escrow USDCx support confirmed**: `milestone-escrow.clar` has `deposit-token` (SIP-010) + `release-milestone-funds-token`; `deposit-to-campaign` is STX-only (backward-compat alias)
  - **Funding pool is STX-only** — no USDCx support
  - Vite build passes (0 errors); 523/523 previously passing tests still pass

### Done This Session (2026-07-227.1 XReserveBridgeAdapter)
- **7.1 XReserveBridgeAdapter — COMPLETE:**
  - `backend/src/services/bos/xreserveAdapter.js` — REST client for xReserve attestation API: `requestAttestation()`, `getAttestationStatus()`, `releaseDestination()`, `getReleaseStatus()`, `healthCheck()`; endpoints are placeholders per xreserve-integration-surface-lock §6.2 (Q1 external assumption)
  - `backend/src/services/bos/bridgeAdapterFactory.js` — Factory: `getXReserveAdapter()`, `getStacksAdapter(contractService)`, `getYellowCardAdapter()` (stub for 7.3); `BRIDGE_ADAPTER_ENV=xreserve|mock`
  - `backend/src/services/contractService.js` — Added `getTransactionStatus()` alias (maps to `getTxStatus`), `burnUsdcx({ amount, memo, idempotencyKey })` for SIP-010 USDCx burn; exports updated (88 total)
  - `backend/src/migrations/006_bos_schema.sql` — Fixed `external_refs` schema: columns now `external_system`, `identifier_type`, `identifier_value`, `metadata` (JSONB) with unique index on `(disbursement_id, external_system, identifier_type)`; added missing columns to `disbursements`: `external_tx_id`, `amount_usd`, `creator_btc_address`, `ngn_recipient`, `metadata`, `last_error`, `max_retries`, `settled_at`, `failed_at`, `cancelled_at`, `manual_review_at`
  - `backend/src/index.js` — Wired real adapters via `bridgeAdapterFactory`: `stacks` → `getStacksAdapter(contractService)`, `xreserve` → `getXReserveAdapter()`, `yellowcard` → `getYellowCardAdapter()`; replaced empty stubs
  - All 6 BOS modules load successfully; `bosWorkers.test.js` — 35 tests pass
  - **Key fix**: `transitionGuards.js` calls `ctx.adapters.stacks.getTransactionStatus()` but `contractService` exported `getTxStatus` — added `getTransactionStatus` alias
  - **Key fix**: `transitionActions.js` uses `external_system`/`identifier_type`/`identifier_value`/`metadata` columns on `external_refs` but schema had `ref_type`/`ref_value`/`is_primary` — aligned schema to code

### Done This Session (2026-07-227.2 Pipeline Worker)
- **7.2 BOS Step 1–2 — Pipeline Worker — COMPLETE:**
  - `backend/src/services/bos/pipelineWorker.js` — Core BOS heartbeat: scans all non-terminal, non-manual-review disbursements on 30s interval; advances each by ONE step per tick via `advanceDisbursement()`; idempotent; individual failures don't block batch; emits audit events; configurable `BOS_PIPELINE_INTERVAL_MS` and `BOS_PIPELINE_BATCH_SIZE` env vars
  - `backend/src/index.js` — Pipeline worker wired: `import('./services/bos/pipelineWorker.js')` → `init(bosCtx)` → `start()` alongside existing stuckReaper + reconciliationWorker
  - `backend/src/routes/bosMonitoring.js` — Added `GET /api/bos/monitoring/workers` (pipeline + stuckReaper + reconciliation stats), `POST /api/bos/monitoring/workers/pipeline/run` (manual trigger)
  - Pipeline worker handles the full 10-step lifecycle: `disbursement_initiated → burn_submitted → burn_confirmed → attestation_requested → attestation_confirmed → destination_release_submitted → destination_release_confirmed → yellowcard_payout_submitted → yellowcard_payout_confirmed → settled`
  - All BOS modules load; `bosWorkers.test.js` — 35 tests pass

### Done This Session (2026-07-227.3 Destination-Side Release)
- **7.3 Destination-Side Release — COMPLETE:**
  - Fixed `backend/src/services/bos/monitoring/monitorJob.js` line 172: `'attestation_received'` → `'attestation_confirmed'` (correct state name from types.js — monitoring check was silently never firing)
  - Added 9 destination-release transition tests to `tests/bosWorkers.test.js`: `isDestinationReleased` (happy/pending/error), `attestationConfirmedForRelease` guard, `destinationReleasedForPayout` guard, `executeTransition` for `attestation_confirmed → destination_release_submitted` and `destination_release_submitted → destination_release_confirmed`, `destination_release_submitted → failed` (retry budget)
  - All 44 tests pass (35 original + 9 new)
  - Commit `519c407` pushed to main

### Done This Session (2026-07-227.4 Yellow Card Payout Initiation)
- **7.4 Yellow Card Payout — COMPLETE:**
  - Created `backend/src/services/bos/yellowcardAdapter.js` — REST client: `initiatePayout()`, `getPayoutStatus()`, `healthCheck()`; env-gated via `YELLOW_CARD_API_URL` + `YELLOW_CARD_API_KEY`; normalizes `successful` → `completed` status
  - Updated `backend/src/services/bos/bridgeAdapterFactory.js` — `getYellowCardAdapter()` now returns real adapter (was throw-only stub)
  - Created `backend/src/routes/webhooks.js` — `POST /yellowcard` → `handleYellowCardWebhook()`, `POST /yellowcard/test` (non-production only)
  - Mounted in `backend/src/index.js` at `/api/bos/webhooks`
  - Fixed `backend/src/migrations/006_bos_schema.sql` — added `updated_at TIMESTAMP DEFAULT NOW()` to `exchange_rates` table (monitoring was querying non-existent column)
  - Fixed `backend/src/services/bos/monitoring/monitorJob.js` line 272: `'payout_submitted'` → `'yellowcard_payout_submitted'` (checkWebhookTimeouts was silently never firing)
  - Fixed `backend/src/services/bos/transitionActions.js` lines 162-166: `usd_to_ngn` → `rate` (SQL column name mismatch in `submitYellowCardPayout`)
  - Added `seedExchangeRate()` logic in `disbursementService.init()` — seeds default USDCx/NGN rate (env `DEFAULT_USDCX_NGN_RATE`, default 1650) when table is empty
  - Added 9 tests to `tests/bosWorkers.test.js`: adapter wiring (2), exchange rate seed (2), webhook route (1), webhook handler (4)
  - All 53 tests pass (44 + 9 new)
  - Commit `83bdb04` pushed to main

### Done This Session (2026-07-23)
- **Full Refactor — Sector-Agnostic Demo + Chain Config Fix + Vercel Env Vars — COMPLETE:**
- **A.1–A.3 DONE — Type rename `VerifiedFilmmaker` → `VerifiedCreator`**: `types/index.ts`, `DemoStorage.ts`, `demoState.ts`, `mockContractService.ts`, `mockSeedData.ts`, `verificationService.ts`
- **A.4 DONE — Category dedup**: Added `DEFAULT_MILESTONES` + `CATEGORIES`/`CATEGORY_VALUES` constants in `app/src/constants/categories.ts`; updated 8 files to import shared constants
- **A.5 DONE — OnboardingWizard film-specific strings**: Updated 3 hardcoded strings; test updated
- **A.6 DONE — DemoStepCampaign + DemoStepVerify**: Milestones generic (Planning/Development/Delivery); vertical defaults to `'other'`; uses `CATEGORIES`
- **A.7 DONE — DemoScenarioPage**: Multi-sector mock campaigns (music + gaming); test passes (9/9)
- **A.8 DONE — Seed data fully diversified**: `mockSeedData.ts` (12 campaigns across 5 sectors); `DemoStorage.ts` (3 campaigns: film, music, visual-art); all old categories eliminated
- **A.9 DONE — Tests verified**: 50/50 frontend pass; Vite build clean
- **B1 DONE — Chain config module**: `backend/src/config/chain.js` — exports `USDCX_CONTRACT`, `HIRO_API_URL`, `STACKS_NETWORK`, `DEPLOYER_ADDRESS`, `V2_DEPLOYER_ADDRESS`, `EXPLORER_URL`, `networkInstance`, `txVersion`
- **B2 DONE — Chain config wired**: All 7 backend production files import from `chain.js` (no hardcoded addresses/URLs)
- **B3 DONE — BASE_URL default**: Fixed in `transitionActions.js`
- **B5 DONE — .env.example updated**: Added `STACKS_NETWORK`, `BASE_URL`
- **B6 DONE — Vercel env vars set**: 14 vars confirmed (4 dead: SMTP_HOST, SMTP_PORT, SMTP_PASS, CORS_ORIGIN)
- **Backend tests verified**: 133/133 previously passing tests still pass after chain config refactor
- **WS-B frontend components CREATED**: OnboardingWizard.tsx, CampaignCreationForm.tsx, EscrowStatus.tsx, MilestoneVoting.tsx, DemoScenarioPage.tsx
- **WS-C (§7 BOS E2E Orchestration) — COMPLETE**: webhookVerifier.js, fallbackPoller.js, auditTimeline.js, evidenceCollector.js, migration 010; 35/35 tests pass

### Done This Session (2026-07-28 — §11.5 AI Credibility Summary — Option A ✅)
- **ai.js Postgres fix**: `INSERT OR REPLACE` → `INSERT ... ON CONFLICT` (was silently overwriting on unique key violation instead of upserting). Added `AbortController` timeout (15s), extracted `upsertSummary()` helper and `SUMMARY_DISCLAIMER` constant.
- **OPENAI_API_KEY**: Added to `.env.example` with documentation; optional — missing key triggers fallback path ("post-launch" message + portfolio count).
- **AICredibilityModal.tsx**: Extracted from ProfilePage inline markup to `app/src/components/common/AICredibilityModal.tsx`. Has loading skeleton (pulsing 3 bars), error + retry button, empty state, and `disclaimer` footer. Takes `isOpen`, `credibility`, `loading`, `error`, `onRefresh`, `onClose` props.
- **ProfilePage.tsx**: Refactored — uses `credibilityLoading` + `credibilityError` state vars; `handleOpenCredibility` auto-loads on first open; `handleRefreshCredibility` sets error state on failure; inline modal replaced with `<AICredibilityModal>` component.
- **Backend tests (ai.test.js)**: 9 tests across the full lifecycle — missing address (400), rate limit exhaustion (429), profile not found (404), cache hit (200 + no db query), fallback without API key (200 + cached), OpenAI success (200 + gpt-4), OpenAI error (500), AbortController timeout (504), empty portfolio (200). Uses Express + `http` request simulation with mocked `database.js` and `global.fetch`.
- **Test results**: 232/232 backend ✅ (12 files, was 223), 50/50 frontend ✅, Vite build clean.
- **Evidence docs updated**: `docs/evidence/index.md` — §11.5 marked ✅, LOC counts updated, ai.test.js added to test list, date bumped.

### Done This Session (2026-07-29 — §11.3 ActivityFeed + §11.4 Indexer fix + §11.5 On-chain AI)
- **§11.4 #1 — CRITICAL indexer wrapper bug fixed**: `src/index.js` passed `{ query: ... }` to `startIndexer()`, but indexer calls `db.get()`, `db.run()`, `db.all()` — indexer was completely non-functional in production. Fixed with a factory wrapper exposing `.get()`, `.run()`, `.all()` — each acquires a fresh connection per call.
- **§11.4 #2 — contractService on-chain reputation reads**: `getScoreData()` added and exported from `contractService.js` — calls `reputation.get-score-data` read-only function returning `{total-ratings, total-score}`.
- **§11.5 #1 — On-chain reputation in GPT prompt**: `ai.js` now imports `contractService`, fetches `getAverageRating` + `getScoreData` on each `/summary` request, appends on-chain data to the prompt body.
- **§11.3 #1 — ActivityFeed component**: `app/src/components/common/ActivityFeed.tsx` built and wired into `HomePage.tsx` as a new "Platform Activity" section replacing the previous placeholder text. Shows 10 events with type icons, summaries, and relative timestamps. Uses the existing `useFeed` hook and `feedService`.
- **HomePage.tsx**: Updated tech preview text from "Coming in the next sprint" to "Now live" for AI credibility + activity feed.
- **docs/evidence/index.md**: §11.4 evidence updated to include ActivityFeed.tsx; §11.5 evidence updated for on-chain reputation fetch; ActivityFeed.tsx added to Key Files Reference.
- **Test results**: 232/232 backend ✅, 50/50 frontend ✅, Vite build clean.

### Key URLs
- Backend: `https://cine-x-api.vercel.app` (Vercel, separate project `cine-x-api`)
- Frontend: `https://cine-x-iota.vercel.app`
- Passkey Test Page: `https://cine-x-iota.vercel.app/passkey-test.html`
- Neon Dashboard: `https://console.neon.tech`
- Explorer: `https://explorer.hiro.so/txid/{txid}?chain=testnet`
- Hiro API: `https://api.testnet.hiro.so`
- Relay Wallet: `ST3CAYVEF4T5REN8DXXVD2RNVXDXVGQAG3RPX2SB4` (CREATOR, funded ~500 STX)
- Relay API Key: ~~`***REMOVED***`~~ retired (2026-09) — client bundle no longer sends it; server-to-server may set `RELAY_API_KEY` env only, never in source.
- Testnet Deployer: `ST29JKDEFRY0RYMGF97FZC9PZWJ4H4VBSQFFERNXX` (~498 STX, vault contracts)
