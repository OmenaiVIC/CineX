# CineX Deployment 1-Day Workplan — Smart Contract + Frontend

> **Target**: Deploy all smart contracts to testnet + frontend to staging
> **Estimated**: 10–14 hours (one full work day)
> **Prerequisites**: All code written and committed on `feature/pivot-infrastructure`

---

## Phase 0: Preparation (30 min)

- [ ] Pull latest `feature/pivot-infrastructure`
- [ ] Run `clarinet check` on all .clar files — fix any compilation errors
- [ ] Run `npx vitest run tests/funding-pool.test.ts` — ensure baseline passes
- [ ] Confirm backend starts: `cd backend; npm start` → `/health` returns ok
- [ ] Confirm wallet endpoints: `/api/wallets/rates/all` returns rates

**Exit criteria**: All contracts compile, all existing tests pass, backend healthy.

---

## Phase 1: Contract Cleanup — Remove Legacy, Rename Crowdfunding (2 hrs)

### 1.1 Delete 10 Legacy Contracts

Remove these files (old film-only era, superseded by new contracts):

| File | Replaced By |
|------|-------------|
| `contracts/film-verification-module.clar` | `project-verification-module.clar` |
| `contracts/film-verification-dummy.clar` | (test helper — no longer needed) |
| `contracts/escrow-module.clar` | `milestone-escrow.clar` |
| `contracts/rewards-module.clar` | `yield-escrow.clar` (70/20/10 split) |
| `contracts/rewards-module-trait.clar` | — |
| `contracts/rewards-nft-trait.clar` | — |
| `contracts/CineX-rewards-sip09.clar` | — |
| `contracts/Co-EP-rotating-fundings.clar` | `funding-pool.clar` |
| `contracts/CineX-project.clar` | Modular architecture — no hub needed |
| `contracts/verification-mgt-extension.clar` | — |

### 1.2 Delete 17 Auto-Generated `.tests.clar` Stubs

All `.tests.clar` files that are empty or reference deleted contracts. Keep only:
- `tests/funding-pool.test.ts` (existing vitest suite)
- `tests/integration.test.ts` (to be created in Phase 2)

### 1.3 Rename `crowdfunding-module` → `campaign-module`

**⚠️ SAFETY: Read all cross-references first before renaming.**

Search every `.clar` file and `Clarinet.toml` for references to `crowdfunding-module`:

| What to Update | Files Affected |
|----------------|---------------|
| File rename | `contracts/crowdfunding-module.clar` → `campaign-module.clar` |
| File rename | `contracts/crowdfunding-module-traits.clar` → `campaign-module-traits.clar` |
| Contract name inside source | `crowdfunding-module` → `campaign-module` in both .clar files |
| Clarinet.toml | Update `name`, `depends_on`, and path references |
| `funding-pool.clar` | Update any `contract-call?` referencing old name |
| `milestone-escrow.clar` | Update any references |
| `milestone-verification.clar` | Update any references |
| `yield-escrow.clar` | Update any references |

### 1.4 Refactor `campaign-module` to Use New Traits

- [ ] Replace `escrow-module-trait` import → `milestone-escrow-trait`
- [ ] Replace `film-verification-module-trait` import → `project-verification-module-trait` (use `is-creator-currently-verified` instead of `is-filmmaker-currently-verified`)
- [ ] Rename internal variables: `campaign-creator` for `campaign-filmmaker`, etc.

### 1.5 Delete Old Traits (After Refactor)

- [ ] `contracts/film-verification-module-trait.clar` — no longer referenced
- [ ] `contracts/escrow-module-trait.clar` — no longer referenced

### 1.6 Update Clarinet.toml

- [ ] Remove all deleted contracts from `[[contracts]]` sections
- [ ] Update `campaign-module` name and dependencies
- [ ] Update deployment order (section 5 of implementation plan)

**Exit criteria**: `clarinet check` passes with zero errors. All 9 core + renamed contracts compile.

---

## Phase 2: Smart Contract Day 11 — E2E Integration Tests (3-4 hrs)

### 2.1 Create `tests/integration.test.ts`

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

### 2.2 Edge Cases Per Flow

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

### 2.3 Debug + Fix

- Run integration tests: `npx vitest run tests/integration.test.ts`
- Fix any runtime errors uncovered by cross-contract calls
- Common issues: incorrect trait imports, missing `contract-call?` permissions, wrong principal in `asserts!`

**Exit criteria**: All 7 flows pass with all edge cases asserted.

---

## Phase 3: Design Unification — Brand Colors + Landing Page (1.5 hrs)

### 3.1 Brand Color Audit

The landing page (`index.html` — root, not React) uses a professional dark-green palette.
The React app (`frontend-v2-legacy`) uses a fluorescent lime `#ccff00`.
**These must be unified.**

| Token | Landing Page (Keep) | React App (Change) |
|-------|---------------------|--------------------|
| Background | `#050505` black | `#0e0f11` → change to `#050505` |
| Primary green | `#4ade80` | `#ccff00` → change to `#4ade80` |
| Green dark | `#22c55e` | `#b2e600` → change to `#22c55e` |
| Green deeper | `#16a34a` | `#8ab800` → change to `#16a34a` |
| Glass effect | `rgba(10,10,10,0.72)` | Missing → add to design system |
| Green glow | `0 0 40px rgba(74,222,128,0.08)` | Missing → add to design system |

**Files to update in `frontend-v2-legacy`:**
- [ ] `src/index.css` — Replace `--color-green-*` values with landing page palette. Keep the full green scale (50–900) but shift all values to use `#4ade80` as `--color-green-400`.
- [ ] Add glass effect variables: `--glass-bg`, `--glass-border`, `--glow`
- [ ] Set `--color-body-bg` to `#050505` (match landing page)
- [ ] Verify all components still look correct after color shift

### 3.2 Font Unification

| Usage | Landing Page | React App | Recommendation |
|-------|-------------|-----------|---------------|
| Body | Inter | Clash Grotesk | **Keep Inter** for body text everywhere. It's the fintech standard (Stripe, Linear, Vercel). |
| Headings | Inter | Playfair Display (serif) | **Drop Playfair Display** — serif doesn't fit fintech. Use Clash Grotesk for headings only, or just use Inter everywhere. |

- [ ] `src/index.css` — Set `font-family` to `'Inter', system-ui, sans-serif`
- [ ] Remove Playfair Display link from `index.html`
- [ ] Keep Clash Grotesk as optional heading font (loaded via fontshare)

### 3.3 Frontend-V2 `index.html` Cleanup

- [ ] Title already fixed: "CineX — Fintech Infrastructure for African Creative IP" ✅
- [ ] Add meta description matching landing page
- [ ] Add Google Fonts preconnect for Inter (already has Playfair Display — replace or keep both)
- [ ] Verify favicon renders correctly at `/favicon.png`

### 3.4 Landing Page (`index.html`) Updates

- [ ] Review for any remaining film-only language (currently well-positioned as multi-vertical)
- [ ] Change Q3 roadmap item: "filmmaker identity" → "creator identity" (line 686)
- [ ] Change footer: "film, music, gaming, and immersive media" → "film, music, gaming, fashion, sports entertainment, and immersive media" (expand to full spectrum)

**Exit criteria**: Landing page and React app share identical brand colors. Fonts are unified. Both index.html files have correct meta tags.

---

## Phase 4: Frontend Day 11 — Wallet UI Components (2 hrs)

### 4.1 Wallet Abstraction UI Components

Create these components in `frontend-v2-legacy/src/components/wallet/`:

| Component | Purpose |
|-----------|---------|
| `WalletBalance.tsx` | Shows balance in preferred currency, equivalent in other currency, sBTC backing |
| `FundWalletModal.tsx` | Deposit modal — NGN bank transfer details or USD Stripe form |
| `SendMoneyForm.tsx` | Send form — amount + currency + recipient search; auto-detects recipient's preferred currency, shows conversion preview |
| `CurrencyConverter.tsx` | Convert NGN ↔ USD with rate quote + 60s countdown + confirm |
| `TransactionHistory.tsx` | Paginated transaction list; filter by type (deposit/send/swap) and date range |

### 4.2 Integration Test: Frontend ↔ Backend

- [ ] Start backend: `cd backend; npm start`
- [ ] Start frontend: `cd frontend-v2-legacy; npm run dev`
- [ ] Test: create wallet → get balance → get rates → get quote → execute conversion
- [ ] Test: send NGN → confirm deposit → check balance updated
- [ ] Test: cross-currency send → verify auto-conversion

**Exit criteria**: All 5 wallet components render with live backend data, using unified brand colors.

---

## Phase 5: Frontend Day 12 — Build + Deploy Config (1.5 hrs)

### 5.1 Environment Configuration

Create `.env.production`:

```env
VITE_USE_MOCK_DATA=false
VITE_API_URL=https://api.cinex.ng
VITE_STACKS_API_URL=https://stacks-node-api.testnet.stacks.co
VITE_NETWORK=testnet
```

### 5.2 Build Optimization

- [ ] Configure Vite build: code splitting, tree shaking, asset hashing
- [ ] Add build scripts to `package.json`: `npm run build`, `npm run preview`
- [ ] Verify production build: `npm run build` completes without errors
- [ ] Test preview server: `npm run preview` loads all routes

### 5.3 Deployment Target

| Target | URL | Method |
|--------|-----|--------|
| Frontend (staging) | `staging.cinex.ng` | Vercel / Netlify: connect GitHub repo, set env vars, auto-deploy from `main` |
| Backend (staging) | `api.cinex.ng` | Railway / Render: Node.js app, SQLite storage |
| Smart contracts | testnet | `clarinet deploy --testnet` |

**Exit criteria**: Build succeeds, preview server works, deployment targets configured.

---

## Phase 6: Documentation (1.5 hrs)

### 6.1 Verify `README.md`

- [ ] Already rewritten with new positioning ✅
- [ ] Update contract table if any contracts were renamed (campaign-module vs crowdfunding-module)
- [ ] Add design system reference (brand colors, fonts)

### 6.2 Create `DEPLOYMENT.md`

- Prerequisites (Node 20+, Clarinet 2.8+)
- Smart contract deployment order (per implementation plan Section 5, updated for renamed contracts)
- Frontend build + deploy to Vercel
- Backend deploy to Railway
- Environment variables per environment

### 6.3 Verify Documentation

- [ ] README.md instructions produce a working local setup
- [ ] DEPLOYMENT.md instructions successfully deploy

**Exit criteria**: New developer goes from `git clone` to running app in 10 minutes.

---

## Phase 7: Final Verification + PR Merge (30 min)

- [ ] Run full test suite: `npx vitest run` (all contract tests + integration)
- [ ] Run `clarinet check` — no warnings
- [ ] Start backend → test all wallet endpoints with curl
- [ ] Production build: `npm run build` (frontend)
- [ ] Verify landing page (`index.html`) renders correctly
- [ ] Stage, commit, push all changes
- [ ] Merge PR #12 into `main`

---

## Appendix: Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Integration test uncovers cross-contract bug | Medium | High | Fix immediately, re-run all tests |
| `crowdfunding-module` rename breaks imports | High | High | **Read every reference first.** `clarinet check` catches all. |
| Astrum API down during rate test | Low | Low | Falls back to admin rate (₦1,400/$) |
| Brand color change makes some UI unreadable | Medium | Medium | Visual review of every component after CSS update |
| Vite build error | Low | Medium | Check missing imports, error log |
| Backend SQLite migration conflict | Low | Medium | `migrateSchema()` uses `PRAGMA table_info` — safe |
| Stacks testnet congestion | Medium | Low | `clarinet deploy` may queue; wait or retry |

---

## Contract State After Cleanup

### Kept (9 core + traits)

| Contract | Role |
|----------|------|
| `campaign-module` (renamed from crowdfunding-module) | Campaign creation and fund management |
| `campaign-module-traits` (renamed) | Trait |
| `milestone-escrow` | Milestone-gated escrow |
| `milestone-escrow-trait` | Trait |
| `milestone-verification` | Backer-weighted voting |
| `project-verification-module` | Multi-vertical creator verification |
| `project-verification-module-trait` | Trait |
| `funding-pool` | Pooled/collaborative funding |
| `funding-pool-trait` | Trait |
| `yield-escrow` | 70/20/10 yield distribution |
| `yield-escrow-trait` | Trait |
| `bitflow-strategy` | DeFi yield strategy |
| `bitflow-strategy-trait` | Trait |
| `cinex-multisig` | 2-of-3 admin |
| `timelock` | Admin action delay |
| `timelock-trait` | Trait |
| `oracle-proxy` | STX/USD price feed |
| `oracle-proxy-trait` | Trait |
| `asset-registry` | Token whitelist |
| `asset-registry-trait` | Trait |
| `reputation` | Peer-to-peer ratings |
| `reputation-trait` | Trait |
| `module-base` | Base module reference |
| `module-base-trait` | Trait |
| `emergency-module` | Emergency controls |
| `emergency-module-trait` | Trait |
| `mock-strategy` | Test helper |

### Deleted (10 legacy + 17 test stubs)

| Deleted | Why |
|---------|-----|
| `film-verification-module` | Replaced by `project-verification-module` |
| `film-verification-dummy` | Test helper for deleted contract |
| `escrow-module` | Replaced by `milestone-escrow` |
| `rewards-module` | Rewards now via yield-escrow split |
| `rewards-module-trait` | — |
| `rewards-nft-trait` | — |
| `CineX-rewards-sip09` | — |
| `Co-EP-rotating-fundings` | Superseded by `funding-pool` |
| `CineX-project` | Old hub — modular architecture |
| `verification-mgt-extension` | Extension of deleted film-verification |
| `film-verification-module-trait` | No longer referenced after refactor |
| `escrow-module-trait` | No longer referenced after refactor |
| 17 `.tests.clar` files | Auto-generated stubs, all empty |

---

*End of deployment workplan.*
