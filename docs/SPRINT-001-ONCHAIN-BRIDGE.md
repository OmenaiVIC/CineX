# Sprint 001: On-Chain Bridge — Admin, Funding Pool & Read-Only

**Goal:** Bridge all smart contract admin functions, fix the funding pool currency mismatch, and surface remaining read-only data to the live site.

**Duration:** Single sprint (parallel tracks)

---

## Phases

### Phase 1 — Admin Panel (3-4h)
Bridge ~20 admin/emergency contract functions spanning 9 contracts into a full admin dashboard.

| Layer | What | Files |
|---|---|---|
| **Backend Wrappers** | Add ~20 wrapper functions in contractService.js | `backend/src/services/contractService.js` |
| **Middleware** | `requireAdmin` — checks user `role === 'admin'` | `backend/src/middleware/auth.js` (amend) |
| **Routes** | New `admin.js` — all admin ops under `POST /api/admin/:area/:action` | `backend/src/routes/admin.js` |
| **Frontend Page** | `AdminDashboard` with tabs: System, Contracts, Verification, Pools, Oracle | `app/src/pages/AdminDashboard.tsx` |
| **Frontend Nav** | Add admin link, visible only for `role: 'admin'` | `app/src/components/layout/Navbar.tsx` |
| **Frontend Router** | Add `/admin` route | `app/src/App.tsx` |

**Admin functions to bridge:**

| Contract | Functions |
|---|---|
| `funding-pool` | `set-contract-addresses`, `set-pause-state`, `emergency-withdraw`, `emergency-close-pool`, `emergency-refund-member` |
| `campaign-module-2` | `set-verification-contract`, `set-escrow-contract`, `set-pause-state`, `emergency-withdraw` |
| `milestone-escrow` | `set-fee-parameters`, `set-verification-contract`, `set-pause-state`, `emergency-withdraw` |
| `milestone-verification` | `set-milestone-escrow`, `set-pause-state`, `emergency-withdraw` |
| `yield-escrow` | `distribute-platform-yield`, `set-strategy`, `set-milestone-escrow`, `set-milestone-verification`, `set-pause-state`, `emergency-withdraw` |
| `project-verification-module` | `emergency-revoke-verification`, `set-contract-admin`, `set-pause-state`, `emergency-withdraw` |
| `project-verification-module-v2` | `emergency-verify-creator` (v2), `emergency-revoke-verification`, `set-pause-state`, `emergency-withdraw` |
| `oracle-proxy` | `set-price-oracle`, `update-price`, `emergency-set-price` |
| `reputation` | `set-verification-gate` |

### Phase 2 — Funding Pool Dual-Currency (2-3h)
Fix the NGN/STX mismatch by bridging the oracle-proxy contract and adding a conversion layer.

| Step | What | Files |
|---|---|---|
| **Oracle Bridge** | Add `updatePrice`, `getStxPrice`, `getStxPriceWithFallback` wrappers | `contractService.js`, `admin.js` |
| **Conversion Layer** | `utils/currency.js` — STX↔NGN using oracle price + hardcoded NGN/USD | `backend/src/utils/currency.js` |
| **Pool Routes Fix** | Convert NGN ↔ uSTX in pool create/join/contribute routes | `backend/src/routes/pools.js` |
| **Pool UI** | Show both ₦ and STX amounts, add NGN input with STX equivalent | `app/src/pages/PoolCreatePage.tsx`, `PoolDetailPage.tsx` |

### Phase 3 — Read-Only + Read-Miss (1-2h)
Surface remaining on-chain data in the frontend.

| Task | What | Files |
|---|---|---|
| **Reputation Score** | Expose `get-reputation-score` on profile page chain panel | `contractService.js`, `profiles.js`, `ProfilePage.tsx` |
| **Pool Chain Data** | Surface `get-proposal-vote`, `get-member` results | `pools.js`, `PoolDetailPage.tsx` |
| **Claim Route** | Add `POST /api/campaigns/:id/claim` for `claim-campaign-funds` | `campaigns.js`, `contractService.js` |

---

## Key Decisions

| Decision | Choice |
|---|---|
| **Pool currency** | Dual-currency (₦ + STX). Users see ₦, backend converts via oracle-proxy. |
| **Admin auth** | `role: 'admin'` on the `users` table, checked via `requireAdmin` middleware. |
| **Execution order** | Admin → Pools → Read-Only |

## Dependencies

- `oracle-proxy` must be initialized on-chain with a price before Phase 2 works
- Admin wrappers use `_wallets.creator.privateKey` (same as existing pool/campaign wrappers)
- Frontend admin nav link hidden behind `user.role === 'admin'` check
