# CineX Deployment 1-Day Workplan — Smart Contract + Frontend

> **Target**: Deploy all 9 smart contracts to testnet + frontend to staging
> **Estimated**: 10–14 hours (one full work day)
> **Prerequisites**: All code written and committed on `feature/pivot-infrastructure`

---

## Phase 0: Preparation (30 min)

- [ ] Pull latest `feature/pivot-infrastructure`
- [ ] Run `clarinet check` on all 20+ `.clar` files — fix any compilation errors
- [ ] Run `npx vitest run tests/funding-pool.test.ts` — ensure baseline passes
- [ ] Confirm backend starts: `cd backend; npm start` → `/health` returns ok
- [ ] Confirm wallet endpoints: `/api/wallets/rates/all` returns rates

**Exit criteria**: All contracts compile, all existing tests pass, backend healthy.

---

## Phase 1: Smart Contract Day 11 — E2E Integration Tests (3-4 hrs)

### 1.1 Create `tests/integration.test.ts`

Write 7 integration flows in a single vitest file using simnet fixtures:

| Flow | Description | Key Assertions |
|------|-------------|----------------|
| **Flow 1** | Happy path: create campaign → fund → set milestones → vote approve → yield distribute (70/20/10) | Backers get 70%, platform 20%, creator 10% bonus |
| **Flow 2** | Partial milestones + forfeiture: 2 of 3 milestones approved, bonus forfeits | Bonus redistributes 70% to backers, 30% to platform |
| **Flow 3** | Backer-weighted milestone rejection: fails >50% vote, no yield released | Escrow stays locked, no distribution |
| **Flow 4** | Yield escrow: multiple campaigns, correct split per campaign | Each campaign's escrow calculated independently |
| **Flow 5** | Funding pool: join → fund → close → distribute | Pool members get proportional returns |
| **Flow 6** | Bitflow strategy: deposit LP tokens → swap → withdraw | LP position opened and closed |
| **Flow 7** | Edge cases: expired campaign refund, multi-sig emergency withdraw, unauthorized access | Refunds work, emergency bypasses timelock, non-admin rejected |

### 1.2 Edge Cases Per Flow

**Flow 1 edge cases**:
- Campaign below minimum funding → refund, not yield
- Creator tries to self-approve milestone → rejected (backer-gated)
- Backer votes after deadline → vote not counted

**Flow 3 edge cases**:
- Tie vote (50/50) → rejected (requires >50%)
- Backer with 0 contribution tries to vote → rejected
- Double vote → second vote ignored

**Flow 4 edge cases**:
- Empty escrow (no yield earned) → withdraw returns 0
- Dust amounts (< 1 uSTX) → not distributed, stays in contract

**Flow 5 edge cases**:
- Join after pool closes → rejected
- Withdraw before pool closes → penalized
- Pool target not met → refund

**Flow 6 edge cases**:
- Swap amount exceeds LP balance → partial fill
- Slippage too high → transaction reverts

**Flow 7 edge cases**:
- Expired campaign: backer refund, creator gets nothing
- Emergency: multi-sig 2-of-3 threshold, timelock bypass
- Unauthorized: non-admin calls admin function → error u0

### 1.3 Debug + Fix

- Run integration tests: `npx vitest run tests/integration.test.ts`
- Fix any runtime errors uncovered by cross-contract calls
- Common issues: incorrect trait imports, missing `contract-call?` permissions, wrong principal in `asserts!`

**Exit criteria**: All 7 flows pass with all edge cases asserted.

---

## Phase 2: Frontend Day 11 — Full Integration (2 hrs)

### 2.1 Wallet Abstraction UI Components

Create these components in `frontend-v2-legacy/src/components/wallet/`:

| Component | Purpose |
|-----------|---------|
| `WalletBalance.tsx` | Shows balance in preferred currency, equivalent in other currency, sBTC backing |
| `FundWalletModal.tsx` | Deposit modal — NGN bank transfer details or USD Stripe form |
| `SendMoneyForm.tsx` | Send form — amount + currency + recipient search; auto-detects recipient's preferred currency, shows conversion preview |
| `CurrencyConverter.tsx` | Convert NGN ↔ USD with rate quote + 60s countdown + confirm |
| `TransactionHistory.tsx` | Paginated transaction list; filter by type (deposit/send/swap) and date range |

### 2.2 Integration Test: Frontend ↔ Backend

- [ ] Start backend: `cd backend; npm start`
- [ ] Start frontend: `cd frontend-v2-legacy; npm run dev`
- [ ] Test: create wallet → get balance → get rates → get quote → execute conversion
- [ ] Test: send NGN → confirm deposit → check balance updated
- [ ] Test: cross-currency send → verify auto-conversion

**Exit criteria**: All 5 wallet components render with live backend data.

---

## Phase 3: Frontend Day 12 — Build + Deploy Config (1.5 hrs)

### 3.1 Environment Configuration

Create `.env.production`:

```env
VITE_USE_MOCK_DATA=false
VITE_API_URL=https://api.cinex.ng
VITE_STACKS_API_URL=https://stacks-node-api.testnet.stacks.co
VITE_NETWORK=testnet
```

### 3.2 Build Optimization

- [ ] Configure Vite build: code splitting, tree shaking, asset hashing
- [ ] Add build scripts to `package.json`: `npm run build`, `npm run preview`
- [ ] Verify production build: `npm run build` completes without errors
- [ ] Test preview server: `npm run preview` loads all routes

### 3.3 Deployment Target

| Target | URL | Method |
|--------|-----|--------|
| Frontend (staging) | `staging.cinex.ng` | Vercel / Netlify: connect GitHub repo, set env vars, auto-deploy from `main` |
| Backend (staging) | `api.cinex.ng` | Railway / Render: Node.js app, SQLite storage |
| Smart contracts | testnet | `clarinet deploy --testnet` |

**Exit criteria**: Build succeeds, preview server works, deployment targets configured.

---

## Phase 4: Documentation (1.5 hrs)

### 4.1 Update `README.md`

```markdown
# CineX — Decentralized Creative Crowdfunding

## Architecture
9 smart contracts on Stacks + Node.js backend + React/Vite frontend

## Smart Contracts (testnet)
| Contract | Purpose |
|----------|---------|
| cinex-multisig | 2-of-3 admin |
| ... | ... (full table) |

## Wallet Abstraction
Users never see blockchain. NGN + USD wallets backed by sBTC.
Parallel market rate via Astrum API (free). 0.75% platform spread.

## Quick Start
### Backend
cd backend && npm install && npm start

### Frontend
cd frontend-v2-legacy && npm install && npm run dev

### Smart Contracts
clarinet check && clarinet test && clarinet deploy --testnet

## Environment Variables
| Variable | Default | Purpose |
|----------|---------|---------|
| VITE_USE_MOCK_DATA | true | Toggle mock/API mode |
| VITE_API_URL | http://localhost:3001 | Backend URL |
| PORT | 3001 | Backend port |
```

### 4.2 Create `DEPLOYMENT.md`

- Prerequisites (Node 20+, Clarinet 2.8+)
- Smart contract deployment order (per implementation plan Section 5)
- Frontend build + deploy to Vercel
- Backend deploy to Railway
- Environment variables per environment

### 4.3 Verify Documentation

- [ ] README.md instructions produce a working local setup
- [ ] DEPLOYMENT.md instructions successfully deploy

**Exit criteria**: New developer goes from `git clone` to running app in 10 minutes.

---

## Phase 5: Final Verification + PR Merge (30 min)

- [ ] Run full test suite: `npx vitest run` (all contract tests + integration)
- [ ] Run `clarinet check` — no warnings
- [ ] Start backend → test all wallet endpoints with curl
- [ ] Production build: `npm run build` (frontend)
- [ ] Stage, commit, push all changes
- [ ] Merge PR #12 into `main`

---

## Appendix: Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Integration test uncovers cross-contract bug | Medium | High | Fix immediately, re-run all tests |
| Astrum API down during rate test | Low | Low | Falls back to admin rate (₦1,400/$) |
| Vite build error | Low | Medium | Check missing imports, error log |
| Backend SQLite migration conflict | Low | Medium | `migrateSchema()` uses `PRAGMA table_info` — safe |
| Stacks testnet congestion | Medium | Low | `clarinet deploy` may queue; wait or retry |

---

*End of deployment workplan.*
