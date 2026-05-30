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

- **Vercel**: Root `vercel.json` sets `rootDirectory: "app"`. SPA rewrites in `app/vercel.json`.
- **Render**: Connected to GitHub repo; auto-deploys on push to `main`.
- **Environment vars**: `CREATOR_KEY`, `BACKER_KEY`, `DATABASE_URL`, `SMTP_USER`, `SMTP_PASS`.

## Testing

- **Vitest** with `@hirosystems/clarinet-sdk`.
- **227 tests** across 11 files: `tests/funding-pool.test.ts` (28), `tests/integration.test.ts` (22), plus 9 individual contract test files.
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

## Brand

- App icon: `https://drive.google.com/file/d/1Y_Zu9nltx6mPxlqsBObGM3Ikw9YrbLXz/view`
- DeFi logo: `https://drive.google.com/file/d/1BqNdw4Veddit0hWauS20bUBXbWWwot6v/view`
- Social banner: `https://drive.google.com/file/d/1lwAbgwtyy5hMfAyxdLt1hpdJ7A5yUSe0/view`

## Session Context (2026-05-30)

### Done This Session
- **v2 contract deployed** on testnet at `STK0ASFJK4DJG8G8YY556X7H9E1FWABCDWEBGQ12.project-verification-module-v2` (nonce 4) — confirmed via `get-module-name` = `"project-verification-module-v2"`
- **6 bug-fix commits** pushed to `main`: portfolio thumbnail (camelCase/snake_case), campaign duration (blocks, clamped 4320–8640), pool UI (localStorage), Quick Register v2 fallback, init() lenient, ensureNonce trusts chain, deployContract fee scaling
- **`requireAuth` added** to `POST /api/deploy/contract`
- **Sitemap** corrected at `docs/CONTRACT_FUNCTION_SITEMAP.md` — v2 deployment status updated
- **Vercel deployment fixed** — fresh build deployed from `app/` directory; JS bundle hash changed `index-BFItlxEo.js` → `index-D_UcI-rU.js`
- **Root `vercel.json` fixed** — removed invalid `rootDirectory: "app"` property (conflicted with `.vercel/project.json` `rootDirectory: null`)

### Verified
- `clarinet check` passes (30 contracts, 0 errors)
- 227 tests pass across 11 test files
- Backend alive on Render — `GET /api/profiles` returns 12 profiles
- Wallet debug: `creator` = `STK0ASFJK4DJG8G8YY556X7H9E1FWABCDWEBGQ12`, nonces healthy
- `module-base` and `project-verification-module-v2` both deployed and responding
- Frontend deployed at `https://cine-x-iota.vercel.app` — latest bundle confirmed
- `VITE_API_BACKEND` env var set in Vercel cloud (encrypted, set 3 days ago)
- `vercel --prod` from root no longer blocked

### Next Steps
1. **Test Quick Register end-to-end** via frontend login → `POST /api/verification/proxy-register`
2. **Check frontend console** — open `https://cine-x-iota.vercel.app`, verify no JS errors, all API calls succeed
3. **Render deploy hook** — configure in Render dashboard for CI/CD
4. **Redeploy all 29 old contracts** under new deployer (cleanup sprint, deferred)

### Key URLs
- Backend: `https://cinex-backend-zo1r.onrender.com`
- Frontend: `https://cine-x-iota.vercel.app`
- Explorer: `https://explorer.hiro.so/txid/{txid}?chain=testnet`
- Hiro API: `https://api.testnet.hiro.so`
