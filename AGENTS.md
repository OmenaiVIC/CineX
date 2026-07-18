# AGENTS.md — CineX Project Conventions

## Architecture

- **27 contracts** across 9 layers: Admin, Oracle/Reputation/Verification, Campaign, Escrow, Yield, Strategy, Milestone Verification, Funding Pool, Base.
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

- **Vercel**: Root `vercel.json` sets `rootDirectory: "app"`. SPA rewrites in `app/vercel.json`. Backend via `experimentalServices.backend`.
- **Neon PostgreSQL**: Primary production database. `DATABASE_URL` → `ep-late-band-zarvw2jh-pooler.neon.tech`. Serverless driver (`NEON_DRIVER=serverless`).
- **Environment vars**: `CREATOR_KEY`, `BACKER_KEY`, `DATABASE_URL`, `SMTP_USER`, `SMTP_PASS`, `ADMIN_BOOTSTRAP_KEY`.

## Testing

- **Vitest** with `@hirosystems/clarinet-sdk`.
- **322 tests** across 14 files: `tests/funding-pool.test.ts` (28), `tests/integration.test.ts` (22), `tests/pilot-campaign-parameterization.test.ts` (32), plus 11 individual contract test files.
- `integration.test.ts` has 5 flows: create+contribute → milestone-escrow wrappers → milestone-verification lifecycle → claim → edge cases.
- `createLinkedCampaigns()` helper creates campaign in both `milestone-escrow` (user-specified id) and `campaign-module` (auto-incremented).
- Rendezvous fuzzing: `node scripts/run-rv-for-all.js` runs property tests on all contracts; requires `.tests.clar` stubs in `contracts/`.

## Rendezvous

- Manifest: `.rendezvous/manifest.toml` — lists all 27 contracts.
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
- **State machine**: 13 states (disbursement_initiated → settled/failed/cancelled), 24 transitions
- **Idempotency**: `disbursements.idempotency_key` UNIQUE constraint; every handler must be idempotent under duplicate worker execution
- **Adapter pattern**: BOS state machine design doc §5.1–5.3; adapters: `stacks-burn`, `xreserve-attestation`, `yellow-card-ngn`
- **Error codes**: init u8201–u8209; burn u8210–u8218; attestation u8220–u8228; payout u8230–u8238; generic u8290–u8299
- **Monitoring**: Prometheus metrics, Grafana dashboards, PagerDuty alerts, reaper workers
- **Secrets**: `YELLOW_CARD_API_KEY`, `YELLOW_CARD_SECRET_KEY`, `YELLOW_CARD_ENV`, `YELLOW_CARD_WEBHOOK_SECRET`, `XRESERVE_ATTESTATION_API_URL`, `BOS_STATE_SIGNING_KEY`, `BOS_TX_SIGNING_KEY`, `NEON_DATABASE_URL`, `NEON_BOS_BRANCH`

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

### Next Steps
1. **Deploy backend to Vercel** — Set `DATABASE_URL` + `NEON_DRIVER=serverless` in Vercel env, deploy via `experimentalServices.backend`
2. **Update frontend API URL** — Change `api.ts` from `cinex-backend-zo1r.onrender.com/api` to Vercel backend URL
3. **Phase 3: Frontend passkey integration** — standalone HTML test page (RP ID = localhost), then `AuthContext.tsx`
4. **Phase 4: Full E2E with backend relay** — `POST /api/passkey/transfer` → `passkeyService.js` → on-chain
5. **BOS worker implementation** — `backend/src/services/bosService.js` (state machine, adapters, workers)
6. **Fix BOS monitor bug** — `updated_at` column missing in BOS tables

### Key URLs
- Backend: Render (SUSPENDED) → migrating to Vercel experimentalServices
- Frontend: `https://cine-x-iota.vercel.app`
- Neon Dashboard: `https://console.neon.tech`
- Explorer: `https://explorer.hiro.so/txid/{txid}?chain=testnet`
- Hiro API: `https://api.testnet.hiro.so`
