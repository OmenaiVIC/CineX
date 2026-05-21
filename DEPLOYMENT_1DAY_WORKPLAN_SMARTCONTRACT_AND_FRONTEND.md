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
- Regenerated `.tests.clar` files for surviving contracts (see Section 2.4)

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
| `deployments/default.testnet-plan.yaml` | Update contract name references |

### 1.4 Refactor `campaign-module` to Use New Traits

- [ ] Replace `escrow-module-trait` import → `milestone-escrow-trait`
- [ ] Replace `film-verification-module-trait` import → `project-verification-module-trait` (use `is-creator-currently-verified` instead of `is-filmmaker-currently-verified`)
- [ ] Rename internal variables: `campaign-creator` for `campaign-filmmaker`, etc.

### 1.5 Delete Old Traits (After Refactor)

- [ ] `contracts/film-verification-module-trait.clar` — no longer referenced
- [ ] `contracts/escrow-module-trait.clar` — no longer referenced

### 1.6 Update Clarinet.toml & Deployment Plan

- [ ] Remove all deleted contracts from `[[contracts]]` sections
- [ ] Update `campaign-module` name and dependencies
- [ ] Update deployment order (section 5 of implementation plan)
- [ ] Regenerate `deployments/default.testnet-plan.yaml` via `clarinet deployment generate --testnet`

**Exit criteria**: `clarinet check` passes with zero errors. All 9 core + renamed contracts compile.

---

## Phase 2: Smart Contract Day 11 — E2E Integration Tests (4-5 hrs)

### 2.1 Create `tests/integration.test.ts`

Write 7 integration flows in a single vitest file using simnet fixtures:

| Flow | Description | Key Assertions |
|------|-------------|----------------|
| **Flow 1** | Happy path: create campaign → fund → set milestones → vote approve → yield distribute (70/20/10) | Backers get 70%, platform 20%, creator 10% bonus |
| **Flow 2** | Partial milestones + forfeiture: 0 of 3 milestones approved (3 missed), bonus forfeits | For 100 STX yield: backers 77, platform 23, creator 0 |
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

**Flow 2 edge cases** (partial milestones + forfeiture):
- 2 of 3 milestones approved (1 missed) → bonus **NOT** forfeited (requires ≥3 missed per `MAX-MISSED u3`)
- 0 of 3 approved (3 missed) → `bonus-forfeited: true`, `forfeited-at` set, backers get 77% / platform 23%
- Forfeited bonus amount is zero (no yield earned) → 0 distributed, no revert
- Creator tries `claim-creator-bonus` after forfeiture → returns `(ok u0)`, marks as claimed+forfeited
- Backers claim yield after forfeiture → `compute-backer-entitlement` includes redistributed bonus automatically (70% of forfeited 10%)
- Platform sweep after forfeiture → `compute-platform-entitlement` includes 30% of forfeited bonus

**Flow 3 edge cases**:
- Tie vote (50/50) → rejected (requires >50% weighted YES)
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

### 2.4 Rendezvous Fuzzing Tests

After deleting legacy `.tests.clar` files in Phase 1, regenerate and populate fuzzing stubs for the 9 surviving contracts:

- [ ] Run `node scripts/move-and-create-tests.js --create-stubs` to regenerate stubs
- [ ] Update `.rendezvous/manifest.toml` — replace old contract refs with surviving contracts
- [ ] Populate each `.tests.clar` with fuzzing scenarios:

| Contract | Fuzzing Scenarios |
|----------|-------------------|
| `campaign-module` | Random backer counts (1–50), varying fund amounts (10–100K STX), milestone vote permutations, refund edge cases |
| `yield-escrow` | Random yield amounts (0–10K), forfeited/not-forfeited states, backer contribution ratios (1–99%), multiple campaigns in parallel |
| `milestone-verification` | Random voter turnout (0–100%), tied votes (50/50 boundary), deadline edge cases, resubmission buffer, MAX_MISSED boundary (2 vs 3) |
| `milestone-escrow` | Campaign creation with 0–10 milestones, sequential approval bypass attempts, fee boundary (0–2500 bps), funding cap enforcement |
| `funding-pool` | Join/withdraw timing attacks, pool target over/under, proportional distribution math, early-withdrawal penalty |
| `bitflow-strategy` | Swap amounts near LP balance, slippage extremes (0.1%–50%), LP token price fluctuations, empty pool edge |
| `emergency-module` | Multi-sig threshold (1-of-3, 2-of-3, 3-of-3), non-admin calls, pause/unpause state transitions, emergency withdraw during active operations |
| `timelock` | Queue/skip timing, unauthorized queue, duplicate proposals, expiry boundary |
| `oracle-proxy` | Price feed boundaries (0, max uint), stale price detection, unauthorized update source |

- [ ] Run: `npm run rv-all` → all fuzzing tests pass at ≥100 runs per contract
- [ ] Fix any fuzzing-discovered edge cases in contract logic

**Exit criteria**: `npm run rv-all` completes with zero failures across all 9 contracts.

---

## Phase 3: Design Unification — Brand Colors + Landing Page (2.5 hrs)

### 3.1 Brand Color Audit

The landing page (`index.html` — root, not React) uses a professional dark-green palette.
The React app (`frontend-v2-legacy`) uses fluorescent lime `#ccff00`.
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

### 3.1b Color System — New Accent Architecture

The current codebase has **3 competing brand colors** (`#4ade80` landing page / `#ccff00` v2 buttons / `#FFBF00` logo+topbar). Adopt a unified triad:

| Token | Hex | Role | Usage |
|-------|-----|------|-------|
| `--color-primary` | `#4ade80` | Fintech green (trust/verification) | Primary buttons, links, active states |
| `--color-neon` | `#00e5ff` | Cypherpunk cyan (blockchain/DeFi) | "Connect Wallet" CTAs, blockchain badges, loading animations |
| `--color-warm` | `#f59e0b` | African gold (community/warmth) | Trust signals, achievement markers, secondary accents |
| `--color-bg` | `#050505` | Deep black | Body background |

- [ ] `src/index.css` — add `--color-neon: #00e5ff` and `--color-warm: #f59e0b` in `:root`
- [ ] `src/index.css` — deprecate `--color-yellow-*` scale (replace all usages with `--color-warm`)
- [ ] `src/index.css` — replace `--color-topbar: #FFBF00` → `--color-topbar: var(--color-warm)`
- [ ] Audit all inline `#FFBF00`, `#fbbf24`, `bg-yellow-*` references → replace with `--color-warm` or `--color-primary`
- [ ] Landing page (`index.html`): add `--color-neon` and `--color-warm` CSS vars (already has the rest ✓)

### 3.1c Logo Asset Audit

The current `logo.svg` is a yellow `#FFBF00` wordmark (163×40px) with no standalone icon mark.
The user's new app icon (Google Drive) must replace this.

- [ ] Download new CineX app icon from Google Drive link 1 → convert to clean SVG + PNG (1x, 2x)
- [ ] Replace `public/images/logo.svg` with new SVG (icon + wordmark lockup)
- [ ] Replace `public/images/logo.png` with new PNG fallback
- [ ] Create `public/images/icon.svg` (icon-only variant, no wordmark — for wallet button, loading spinner, Stacks auth)
- [ ] Generate multi-size favicon set: `public/favicon.ico` (32×32), `public/favicon-96.png`, `public/apple-touch-icon.png`
- [ ] Create `public/images/logo-dark.svg` (icon + reversed wordmark for footer on dark bg)
- [ ] Delete old `logo-dark.png` / `logo-dark.svg` variants (replace with new icon set)
- [ ] Also download the CineX DeFi dashboards logo (Drive link 2) and social media banner (Drive link 3) — save to `public/images/brand/` for reference

### 3.1d Logo Placement Audit

- [ ] Landing page `index.html` — replace `.logo-mark` text "CineX" with `<img src="/images/logo.svg" alt="CineX" class="h-8 w-auto">`
- [ ] `src/components/layout/header.jsx` — update `<img src="/images/logo.png">` → new SVG, add icon-only variant for mobile collapsed state
- [ ] `src/components/layout/footer.jsx` — update to `logo-dark.svg`
- [ ] `src/contexts/StacksAuthContext.jsx` — update wallet app icon to `icon.svg`
- [ ] `src/components/common/header.jsx` (deprecated) — update if kept, or remove entirely
- [ ] `frontend-v1/frontend-integration/` — update `Header.tsx` and `Home.tsx` logo imports from `hands-together-logo.svg` to `icon.svg`
- [ ] Verify all 4 pages (hero, about, investor, footer) in landing page show the new icon consistently

### 3.1e Button System Refactor

The current `Button` component (`src/components/ui/button.jsx`) has 3 variants using `#ccff00`. Only 2 feature files import it — 215+ raw `<button>` elements exist.

- [ ] `src/components/ui/button.jsx` — update `"primary"` variant bg from `bg-green-400` (#ccff00) → `bg-[#4ade80]`
- [ ] `src/components/ui/button.jsx` — add 4th variant `"neon"` (cyan `#00e5ff` for blockchain actions like Connect Wallet, Sign Transaction):
      ```js
      neon: 'px-8 py-4 tracking-tighter bg-[#00e5ff] hover:bg-[#00c4e0] active:bg-[#00a3ba] text-black font-bold rounded-full shadow-[0_0_20px_rgba(0,229,255,0.2)] hover:shadow-[0_0_35px_rgba(0,229,255,0.35)] focus:ring-[#00e5ff]'
      ```
- [ ] `src/components/ui/button.jsx` — update `"outline"` variant from `border-white` → `border-[rgba(74,222,128,0.3)] text-[#4ade80] hover:bg-[#4ade80] hover:text-black`
- [ ] `src/components/ui/button.jsx` — add green glow shadow to primary variant
- [ ] Replace all raw `<button>` elements with shared `Button` component across feature files:
  - [ ] `features/home/components/` — hero CTAs
  - [ ] `features/auth/` — sign in/up buttons (already uses Button ✓)
  - [ ] `features/waitlist/` — submit button
  - [ ] `features/contact/` — send message (already uses Button ✓)
  - [ ] `features/campaign/` — create campaign, fund
  - [ ] `components/layout/header.jsx` — wallet connect
  - [ ] All inline `bg-yellow-400`, `#FFBF00` buttons → map to `variant="primary"` or `variant="warm"`
- [ ] Add mapping for warm/CTA buttons: `bg-[#f59e0b] text-black` → export as `variant="warm"` if frequently used

### 3.1f Cypherpunk UI Refinements

Blend "neon cypherpunk blockchain" with "minimalist fintech soothing" — dark spacious layouts with subtle neon glow accents, not in-your-face neon.

- [ ] **Grid backdrop**: Add subtle dot-grid overlay to body (not landing page — it already has the spotlight gradient):
      ```css
      body::before {
        content: '';
        position: fixed;
        inset: 0;
        background-image: radial-gradient(circle at 1px 1px, rgba(74,222,128,0.04) 1px, transparent 0);
        background-size: 40px 40px;
        pointer-events: none;
        z-index: 0;
      }
      ```
- [ ] **Glass morphism**: Ensure all cards use: `background: var(--glass-bg)`, `backdrop-filter: blur(14px)`, `border: 1px solid var(--glass-border)`, `box-shadow: var(--glow)`
- [ ] **Focus states**: Add green glow to all interactive focus rings: `box-shadow: 0 0 0 3px rgba(74,222,128,0.2)`
- [ ] **Neon sparingly**: Use `--color-neon` only for blockchain-specific actions (Connect Wallet, Sign, Transaction status) — not for generic UI
- [ ] **Warm accents**: Use `--color-warm (#f59e0b)` for trust signals, achievement badges, community stats — the "African fintech soul"
- [ ] **Spacing**: Ensure generous whitespace between sections (section padding: 5rem 0), cards (gap: 1.5rem), and text (line-height: 1.6)
- [ ] **Transitions**: All interactive elements → `transition: all 0.2s ease; hover: scale(1.02)`
- [ ] **Consistent border radius**: Cards = 28px, buttons = 60px (pill), inputs = 12px

### 3.2 Font Unification

| Usage | Landing Page | React App | Recommendation |
|-------|-------------|-----------|---------------|
| Body | Inter | Poppins | **Change to Inter** — fintech standard (Stripe, Linear, Vercel) |
| Headings | Inter | Clash Grotesk / Playfair Display | **Keep Clash Grotesk** for headings — modern geometric fits cypherpunk. Drop Playfair Display. |

- [ ] `src/index.css` — Set `font-family: 'Inter', system-ui, sans-serif` on body (currently `'poppins', sans-serif`)
- [ ] Remove Playfair Display link from `frontend-v2-legacy/index.html`
- [ ] Keep Clash Grotesk as heading font in `.font-heading` class
- [ ] Landing page (`index.html`) — already uses Inter everywhere ✓

### 3.3 Frontend-V2 `index.html` Cleanup

- [ ] Title already fixed: "CineX — Fintech Infrastructure for African Creative IP" ✅
- [ ] Add meta description matching landing page
- [ ] Add Google Fonts preconnect for Inter (already has Playfair Display — replace with Inter)
- [ ] Verify favicon renders correctly at `/favicon.png` (will be updated in 3.1c)

### 3.4 Landing Page (`index.html`) Updates

- [ ] Review for any remaining film-only language (line 443: "Film, music, gaming, and immersive media" → keep as-is, already expanded)
- [ ] Change Q3 roadmap item: "filmmaker identity" → "creator identity" (line 686)
- [ ] **Footer message**: Replace line 736:
      ```
      "Legacy platform is being upgraded — we will keep you updated."
      →
      "Built on Bitcoin. Secured by Stacks. New financing rails for African Creative IP assets."
      ```

**Exit criteria**: Landing page and React app share identical brand colors. Fonts unified. New logo appears on all pages. Buttons use fintech-appropriate variants. Cypherpunk backdrop visible.

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
- [ ] Add design system reference (brand colors, fonts, logo)

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
- [ ] Run Rendezvous fuzzing: `npm run rv-all`
- [ ] Run `clarinet check` — no warnings
- [ ] Start backend → test all wallet endpoints with curl
- [ ] Production build: `npm run build` (frontend)
- [ ] Verify landing page (`index.html`) renders correctly — new logo, updated footer
- [ ] Visual check: all pages use consistent `#4ade80` green, `#050505` background, glass cards
- [ ] Stage, commit, push all changes
- [ ] Merge PR #12 into `main`

---

## Appendix A: Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Integration test uncovers cross-contract bug | Medium | High | Fix immediately, re-run all tests |
| `crowdfunding-module` rename breaks imports | High | High | **Read every reference first.** `clarinet check` catches all. |
| Rendezvous fuzzing discovers edge-case bug | Medium | Medium | Fix before deploy; fuzzing is safety net, not blocker |
| Astrum API down during rate test | Low | Low | Falls back to admin rate (₦1,400/$) |
| Brand color change makes some UI unreadable | Medium | Medium | Visual review of every component after CSS update |
| Vite build error | Low | Medium | Check missing imports, error log |
| Backend SQLite migration conflict | Low | Medium | `migrateSchema()` uses `PRAGMA table_info` — safe |
| Stacks testnet congestion | Medium | Low | `clarinet deploy` may queue; wait or retry |
| Logo replacement misses some references | Medium | Low | Grep for all `<img src="/images/logo` and update systematically |

---

## Appendix B: Contract State After Cleanup

### Keep (9 core + traits)

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
| `yield-escrow` | 70/20/10 yield distribution (forfeited bonus 70/30 backer/platform) |
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

### Delete (10 legacy + 17 test stubs)

| Delete | Why |
|--------|-----|
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
| 17 `.tests.clar` files | Auto-generated stubs, all referencing deleted contracts |

---

## Appendix C: Brand Design Reference

### Color Token Reference

```css
/* Primary palette */
--color-bg: #050505;              /* Deep black */
--color-primary: #4ade80;         /* Fintech green - buttons, links, active */
--color-primary-dark: #22c55e;    /* Hover */
--color-primary-deeper: #16a34a;  /* Active/pressed */

/* Accent palette */
--color-neon: #00e5ff;            /* Cypherpunk cyan - blockchain actions */
--color-warm: #f59e0b;            /* African gold - trust signals, badges */

/* Glass effects */
--glass-bg: rgba(10, 10, 10, 0.72);
--glass-border: rgba(74, 222, 128, 0.12);
--glow: 0 0 40px rgba(74, 222, 128, 0.08);
--neon-glow: 0 0 25px rgba(0, 229, 255, 0.15);

/* Typography */
--font-body: 'Inter', system-ui, sans-serif;
--font-heading: 'Clash Grotesk', ui-sans-serif, system-ui, sans-serif;
```

### Button Variant Reference

| Variant | Use Case | Visual |
|---------|----------|--------|
| `primary` | Primary CTAs (Join, Submit, Fund) | Green `#4ade80` bg, black text, green glow |
| `neon` | Blockchain actions (Connect Wallet, Sign) | Cyan `#00e5ff` bg, black text, cyan glow |
| `outline` | Secondary actions (Learn More, Cancel) | Transparent bg, green border + text |
| `ghost` | Tertiary actions (Edit, View Details) | Transparent, white → green on hover |
| `warm` | Community/social (Join Waitlist, Share) | Amber `#f59e0b` bg, black text |

---

*End of deployment workplan.*
