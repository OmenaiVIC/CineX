# CineX Smart Contract Implementation Plan — 2-Week Sprint

> **Scope:** 8 smart contracts (7 original + timelock) + 2-of-3 multi-sig contract + trait definitions
> **Target:** Stacks testnet (mainnet-ready audit phase)
> **Team:** 1 senior Clarity engineer (80h), 1 peer reviewer (20h)
> **Total estimated effort:** ~100 person-hours

---

## 1. Architecture Decisions

### 1.1 Immutable Contracts (No Proxy)

All 8 contracts are deployed once and are immutable. No forwarding proxy. Migration = deploy new contract + script-transfer residual assets + update frontend. Traits are for compile-time interface enforcement and modular DI, not upgradeability.

### 1.2 2-of-3 Multi-Sig Admin

A lightweight **2-of-3 multi-sig** contract (`cinex-multisig.clar`) serves as sole admin authority for all contracts. Admin-gated functions check `(contract-call? .cinex-multisig is-approved tx-sender)`.

**Design:**
- `propose-transaction (recipient, function-name, args)` — any signer
- `confirm-transaction (tx-id)` — second signer
- `execute-transaction (tx-id)` — auto-executes after 2-of-3 threshold reached

**Key Holders (pre-seed stage):**
1. **Victor** — founder, CineX core team
2. **Co-founder** — CineX technical lead
3. **Trusted advisor / legal counsel** — independent third party

**Upgrade path:** This 2-of-3 configuration is for the pre-seed stage. Future upgrades can increase the threshold (e.g., to 3-of-3) or replace signers with a multi-sig DAO governed by a CineX governance token. The multi-sig contract supports signer rotation via a 2-of-3 vote to replace any single signer.

**Admin operations gated by multi-sig:**
- `add-asset` / `remove-asset` in asset-registry
- `set-price-oracle` / `update-price` in oracle-proxy
- `verify-project` in project-verification-module
- Fee parameter changes in milestone-escrow
- Strategy updates in yield-escrow / bitflow-strategy
- Any future parameter or configuration change

**Multi-sig functions that require timelock (see §1.5):**
- `add-asset` / `remove-asset`
- Fee parameter changes
- Strategy address changes
- Non-emergency pause toggling

**Multi-sig functions that bypass timelock (emergency only):**
- `emergency-withdraw` (any module)
- `set-pause-state` during active exploit
- Signer rotation votes

### 1.3 Timelock Contract

A `timelock.clar` contract enforces a block-based delay (2880 blocks ≈ 24 hours on Stacks at ~30s/block) for queued administrative transactions before execution. This prevents a compromised single multi-sig key from immediately executing a malicious admin action — signers and users have a 24-hour window to detect and respond.

**Design:**
- `queue-transaction (recipient, function-name, args, eta)` — only callable by multi-sig (checks `is-approved`). Stores `{recipient, function-name, args, eta (block-height), executed, cancelled}`.
- `execute-transaction (tx-id)` — anyone can call after `eta` block-height has passed. Calls the target contract with the stored function and args.
- `cancel-transaction (tx-id)` — multi-sig only. Marks transaction as cancelled. (2-of-3 can cancel a malicious queue before execution.)

**Critical actions subject to timelock (2880-block delay):**

| Action | Contract | Rationale |
|--------|----------|-----------|
| `add-asset` | asset-registry | Adding a malicious asset could drain escrow |
| `remove-asset` | asset-registry | Removing a legitimate asset breaks live campaigns |
| `set-price-oracle` | oracle-proxy | Changing price source enables manipulation |
| Fee parameter changes | milestone-escrow | Changing withdrawal fee affects all users |
| `update-price` (above threshold) | oracle-proxy | Large price deviations need review |
| Strategy address change | yield-escrow / bitflow-strategy | Redirecting funds to malicious contract |

**Emergency bypass:** Functions on the `emergency-module-trait` (`emergency-withdraw`, `set-pause-state`) are NOT routed through timelock. The multi-sig can call them directly via `execute-transaction` with `eta = block-height` (zero delay) or via a separate emergency-only multi-sig path.

**Integration with multi-sig:**
```
Multi-sig proposes → Timelock queues (sets eta = current-block + 2880) → After delay, anyone executes
Emergency: Multi-sig proposes → Execute immediately (skips timelock, calls target directly)
```

Target contracts store a `timelock-contract` principal variable. For sensitive admin functions, they check `(is-eq tx-sender (var-get timelock-contract))` instead of checking multi-sig directly. For emergency functions, they check multi-sig directly.

### 1.4 Trait Architecture

| Trait | Purpose | Used By |
|-------|---------|---------|
| `asset-registry-trait` | `is-supported (principal) -> bool` | milestone-escrow, yield-escrow |
| `oracle-proxy-trait` | `get-stx-price () -> uint` | milestone-escrow (fee calc) |
| `reputation-trait` | `get-reputation-score (principal) -> uint` | funding-pool |
| `project-verification-trait` | Extends old `film-verification-trait` with multi-vertical | funding-pool, milestone-escrow |
| `milestone-escrow-trait` | `create-campaign`, `deposit`, `submit-proof`, `approve`, `release` | funding-pool, yield-escrow |
| `yield-escrow-trait` | `deposit-to-yield`, `withdraw-from-yield`, `claim-yield`, `distribute-yield` | funding-pool |
| `funding-pool-trait` | `create-pool`, `join-pool`, `propose-allocation`, `vote`, `execute` | hub (CineX-project) |

Existing traits (`module-base-trait`, `emergency-module-trait`) kept and implemented by all replacement modules.

### 1.5 Error Code Allocation

| Contract | Range | Notes |
|----------|-------|-------|
| `cinex-multisig` | u8000-u8010 | New |
| `timelock` | u8100-u8110 | New |
| `asset-registry` | u5000-u5009 | New |
| `oracle-proxy` | u5100-u5109 | New |
| `reputation` | u5200-u5219 | New |
| `project-verification-module` | u1000-u1015 | Retains old range for backward compat |
| `milestone-escrow` | u5400-u5420 | New |
| `yield-escrow` | u5500-u5520 | New |
| `funding-pool` | u5600-u5650 | New (replaces Co-EP's u400 range) |

---

## 2. Weekly Breakdown

### Week 1 — Foundation, Registry, Oracle, Reputation, Verification, Milestone Escrow

---

#### Day 1 — Multi-Sig + Timelock + Asset Registry (8h)

**Task 1.1: `cinex-multisig.clar` — 2-of-3 admin (3h dev + 1h tests)**
- [ ] Define `signers` list (fixed 3 principals: Victor, co-founder, advisor), `threshold = u2`
- [ ] Maps: `transactions` (uint => {recipient, function-name, args, confirmations, executed, proposer})
- [ ] Vars: `next-tx-id` (uint)
- [ ] Public: `propose-transaction` — any signer
- [ ] Public: `confirm-transaction` — second signer increments confirmations
- [ ] Public: `execute-transaction` — checks `confirmations >= threshold`, calls target via `contract-call`, marks executed. On success, routes through timelock if the target function requires delay; otherwise executes immediately (emergency path).
- [ ] Public: `replace-signer (old-signer, new-signer)` — requires 2-of-3 confirmation
- [ ] Read-only: `is-approved (principal) -> bool` — true if caller is a signer
- [ ] Events: `print` on propose, confirm, execute, replace-signer
- [ ] Unit tests: propose → confirm → execute flow, reject double-execute, reject non-signer propose, signer rotation
- **Estimated:** 3h (dev) + 1h (tests)

**Task 1.2: `timelock.clar` + `timelock-trait.clar` (2h dev + 0.5h tests)**
- [ ] Constants: `TIMELOCK-DELAY = u2880` (blocks ≈ 24 hours)
- [ ] Maps: `queued-transactions` (uint => {recipient, function-name, args, eta, executed, cancelled, queued-at})
- [ ] Vars: `next-queue-id` (uint), `multisig-contract` (principal)
- [ ] Public: `queue-transaction (recipient, function-name, args)` — only callable by `multisig-contract` (via `is-approved`). Sets `eta = block-height + TIMELOCK-DELAY`. Emits `TransactionQueued`.
- [ ] Public: `execute-transaction (queue-id)` — anyone can call. Checks: not executed, not cancelled, `block-height >= eta`. Calls target contract with stored args via `contract-call`. Marks executed. Emits `TransactionExecuted`.
- [ ] Public: `cancel-transaction (queue-id)` — only multi-sig. Marks cancelled. Emits `TransactionCancelled`.
- [ ] Read-only: `get-queued-transaction (queue-id)` — returns full tuple or none
- [ ] Unit tests: queue → cannot execute before delay → execute after delay → reject double-execute; queue → cancel; non-multisig cannot queue
- **Estimated:** 2h (dev) + 0.5h (tests)

**Task 1.3: `asset-registry.clar` + `asset-registry-trait.clar` (1.5h dev + 0.5h tests)**
- [ ] Trait: `(define-trait asset-registry-trait ((is-supported (principal) (response bool uint))))`
- [ ] Data: `supported-assets` (map principal => {name (string-ascii 32), decimals uint, active bool})
- [ ] Vars: `admin-contract` (principal — set to timelock address) for non-emergency admin; `emergency-admin` (principal — set to multi-sig) for emergency removal
- [ ] Admin-guarded (timelock): `add-asset` — checks `tx-sender` is `admin-contract`
- [ ] Admin-guarded (timelock): `remove-asset` — sets `active = false` (soft delete)
- [ ] Emergency (multi-sig only): `emergency-remove-asset` — immediate removal, bypasses timelock
- [ ] Read-only: `is-supported`, `get-all-supported-assets`
- [ ] Seed config: STX, sBTC, USDCx contract principals set during `initialize`
- **Estimated:** 1.5h (dev) + 0.5h (tests)

---

#### Day 2 — Oracle Proxy + Reputation + Project Verification Begins (8h)

**Task 2.1: `oracle-proxy.clar` + `oracle-proxy-trait.clar` (2h dev + 1h tests)**
- [ ] Trait: `(define-trait oracle-proxy-trait ((get-stx-price () (response uint uint))))`
- [ ] Vars: `price` (uint, cents), `last-updated` (uint, block-height), `price-oracle` (principal), `admin-contract` (principal — timelock), `emergency-admin` (principal — multi-sig)
- [ ] Admin-guarded (timelock): `set-price-oracle` — sets the external oracle address
- [ ] (Timelock for non-emergency): `update-price` — multi-sig pushes price
- [ ] Emergency (multi-sig): `emergency-set-price` — immediate override
- [ ] Read-only: `get-stx-price` — returns stored `price`
- [ ] Initial approach: multi-sig pushes price periodically. Price is in cents (100 = $1.00).
- [ ] Fallback: `get-stx-price-with-fallback` — if `last-updated > STALE-THRESHOLD` (144 blocks), return error
- **Estimated:** 2h (dev) + 1h (tests)

> **v2 upgrade path:** The `set-price-oracle` function in `oracle-proxy.clar` is a designed placeholder for Pyth Network integration. When implemented, it will accept Pyth VAAs and cache the verified price. See `CINEX_PYTH_ORACLE_INTEGRATION_v2_ROADMAP.md` for the full roadmap.

**Task 2.2: `reputation.clar` + `reputation-trait.clar` (3h dev + 1h tests)**
- [ ] Trait: `rate-user`, `get-reputation-score`, `get-ratings-for-user`
- [ ] Data: `ratings` (map {rater, target, campaign-id} => {rating uint 1-5, comment-hash (optional (buff 32)), timestamp uint})
- [ ] Data: `reputation-scores` (map principal => {total-ratings uint, total-score uint}) — cached aggregate
- [ ] Public: `rate-user` — checks:
  - Rater ≠ target (self-rating not allowed)
  - No existing entry for (rater, target, campaign-id) — prevents duplicate
  - Rating must be 1-5
  - Comment-hash is optional buff 32
  - Updates `reputation-scores` map: increments total-ratings, adds rating to total-score
- [ ] Read-only: `get-reputation-score` — returns `(total-score * 100) / (total-ratings * 5)` = percentage (0-100)
- [ ] Read-only: `get-ratings-for-user` — returns list of recent ratings (pagination via offset/limit)
- [ ] Sybil mitigation: only verified users (via `project-verification-module`) can rate
- **Estimated:** 3h (dev) + 1h (tests)

**Task 2.3: `project-verification-module.clar` — refactor start (1h)**
- [ ] Begin refactor from `film-verification-module.clar` (722 lines). Continue on Day 3.
- **Estimated:** 1h (scoping + file creation)

---

#### Day 3 — Project Verification Module (complete) + Tests (8h)

**Task 3.1: `project-verification-module.clar` — refactor completion (3h dev + 1h tests)**
- [ ] Rename all `filmmaker` identifiers to `creator` (e.g., `creator-identities` instead of `filmmaker-identities`)
- [ ] Add `project-vertical` field to registration: `(string-ascii 20)` — `"film" | "music" | "gaming" | "immersive-media" | "other"`
- [ ] Keep `register-creator` (was `register-filmmaker-id`), `add-portfolio`, `verify-project`
- [ ] Endorsements remain optional (not required for verification)
- [ ] Implement `module-base-trait` and `emergency-module-trait` (as existing pattern)
- [ ] Maintain backward compatibility: re-export `is-filmmaker-currently-verified` as alias for `is-creator-currently-verified`
- [ ] Vars: `admin-contract` (principal — timelock for non-emergency verify), `emergency-admin` (principal — multi-sig for emergency ops)
- [ ] Timelock path: `verify-project` requires timelock queue
- [ ] Emergency path: multi-sig can directly call `emergency-verify-project` or `emergency-revoke-verification` bypassing timelock
- **Estimated:** 3h (dev) + 1h (tests)

**Task 3.2: Project Verification regression + backward compat tests (4h)**
- [ ] Test all old functions still work (regression suite)
- [ ] Test new `project-vertical` field
- [ ] Test timelock admin verification flow
- [ ] Test emergency bypass (multi-sig direct call)
- [ ] Verify `project-verification-trait` is compatible with old `film-verification-trait` callers
- **Estimated:** 4h

---

#### Day 4 — Milestone Escrow: data structures + create-campaign (8h)

**Task 4.1: `milestone-escrow.clar` — data structures (1h)**
- [ ] Trait: `milestone-escrow-trait`
- [ ] Data structures:
  ```
  campaigns: map uint => {
    project-id uint,
    creator principal,
    asset principal,              // supported asset from asset-registry
    total-goal uint,
    total-deposited uint,
    milestones (list 10 {
      name (string-ascii 64),
      amount uint,
      approved bool,
      released bool,
      proof-hash (optional (buff 32)),
      approved-by (optional principal),
      milestone-index uint
    }),
    status (string-ascii 20),     // "active" | "completed" | "cancelled"
    created-at uint,
    deadline uint
  }
  ```
  ```
  campaign-contributors: map {campaign-id uint, contributor principal} => {
    total-contributed uint,
    contributed-at uint
  }
  campaign-id-counter: uint
  ```
- **Estimated:** 1h

**Task 4.2: `create-campaign` (3h dev + 1h tests)**
- [ ] Constants: `MIN-GOAL = u1000000000` ($1000 in smallest unit), `MAX-MILESTONES = u10`, `WITHDRAWAL-FEE-PERCENT = u500` (5%), `VERIFICATION-FEE = u5` (5 STX → USD-pegged via oracle)
- [ ] Vars: `asset-registry` (principal), `oracle-proxy` (principal), `verification-module` (principal), `admin-contract` (principal — timelock), `fee-recipient` (principal — treasury)
- [ ] `create-campaign` — checks:
  - Creator is verified via `project-verification-module::is-creator-currently-verified`
  - `asset` is supported via `asset-registry::is-supported`
  - `total-goal >= MIN-GOAL`
  - Milestones list is non-empty, amounts sum to `total-goal`
  - Duration includes deadline block height
  - Payment of verification fee (in STX, USD-pegged via oracle)
  - Creates campaign entry, sets status to "active"
  - Emits `print` event: `{event: "campaign-created", campaign-id, creator, asset, total-goal}`
- **Estimated:** 3h (dev) + 1h (tests)

**Task 4.3: Fee parameter change flow via timelock (1h)**
- [ ] `set-fee-parameters (new-withdrawal-fee, new-verification-fee)` — only callable by `admin-contract` (timelock). Changes are subject to 24h delay.
- **Estimated:** 1h

---

#### Day 5 — Milestone Escrow: deposit, approve, release + tests (8h)

**Task 5.1: `deposit` function (2.5h)**
- [ ] `deposit (campaign-id, amount)` — checks:
  - Campaign exists and is "active"
  - Asset is the campaign's `asset`
  - Amount > 0
  - Transfers from contributor to contract (`stx-transfer?` or `ftp-token?` for sBTC/USDCx)
  - Updates `total-deposited` and `campaign-contributors`
  - Emits `print` event
- [ ] Handle multi-asset: `match` on asset principal to determine transfer method
- **Estimated:** 2h (dev) + 0.5h (tests)

**Task 5.2: `submit-milestone-proof` + `approve-milestone` (2.5h)**
- [ ] `submit-milestone-proof (campaign-id, milestone-index, proof-hash)` — checks:
  - Campaign is "active"
  - Milestone index is within range
  - Milestone is not already approved or released
  - Proof-hash is valid (32-byte buff)
  - Only campaign creator can submit
  - Updates milestone's `proof-hash`, emits event
- [ ] `approve-milestone (campaign-id, milestone-index)` — checks:
  - Milestone has a proof-hash
  - Milestone is not already approved/released
  - **v1 design:** Creator approves their own proof (trusted model). Future: backer voting.
  - Sets `approved = true`, `approved-by = tx-sender`, emits event
- **Estimated:** 2h (dev) + 0.5h (tests)

**Task 5.3: `release-milestone-funds` + edge cases (3h)**
- [ ] `release-milestone-funds (campaign-id, milestone-index)` — checks:
  - Milestone is approved but not released
  - `total-deposited >= milestone.amount` (enough funds)
  - Calculates 5% withdrawal fee: `fee = milestone.amount * WITHDRAWAL-FEE-PERCENT / 10000`
  - Transfers `milestone.amount - fee` to campaign creator, `fee` to `fee-recipient`
  - Decrements `total-deposited`, marks milestone released
  - If all milestones released, campaign status = "completed"
  - Emits event
- [ ] Edge cases: partial deposits, deadline enforcement, cancellation + refund, multi-asset withdrawal dispatch
- **Estimated:** 2h (dev) + 1h (tests)

---

### Week 2 — Yield Escrow, Funding Pool, Integration Tests, Deployment

---

#### Day 6 — Yield Escrow: core accounting + trait (8h)

**Task 6.1: `yield-escrow.clar` — data structures + `deposit-to-yield-escrow` (4h)**
- [ ] Trait: `yield-escrow-trait`
- [ ] Data:
  ```
  yield-positions: map campaign-id => {
    principal-deposited uint,
    yield-earned uint,
    yield-claimed uint,
    strategy (optional principal),
    last-yield-accrual uint,
    asset principal
  }
  platform-yield-accumulated: uint
  ```
- [ ] Constants: `YIELD-SPLIT-BASIS-POINTS = u3000` (30% CineX, 70% users)
- [ ] Vars: `admin-contract` (principal — timelock), `emergency-admin` (principal — multi-sig)
- [ ] Public: `deposit-to-yield-escrow (campaign-id, amount, strategy)` — checks:
  - Campaign exists and asset is supported
  - Amount > 0
  - Transfers asset from caller to this contract
  - Updates `principal-deposited`
  - If strategy provided, calls strategy contract to deploy capital
  - Emits event
- **Estimated:** 3h (dev) + 1h (tests)

**Task 6.2: `withdraw-from-yield-escrow` + `claim-yield` (4h)**
- [ ] `withdraw-from-yield-escrow (campaign-id, amount)` — checks:
  - Amount <= principal-deposited
  - If strategy active, withdraw from strategy first (return LP to base asset)
  - Send amount back, decrement principal-deposited, emit event
- [ ] `claim-yield (campaign-id)` — checks:
  - `yield-earned - yield-claimed > 0`
  - Calculates: `cinex-share = claimable * 3000 / 10000`, `user-share = claimable - cinex-share`
  - Sends `user-share` to campaign creator, accumulates `cinex-share`
  - Updates `yield-claimed`, emits event
- [ ] `distribute-yield (campaign-id)` — admin sweep of platform accumulation to treasury (subject to timelock for large amounts)
- **Estimated:** 3h (dev) + 1h (tests)

---

#### Day 7 — Yield Escrow: Bitflow Integration (8h)

**Task 7.1: Bitflow interface research (2h)**
- [ ] Define `bitflow-strategy-trait`: `deposit (amount) -> (response uint)`, `withdraw (lp-amount) -> (response uint)`, `get-exchange-rate () -> (response uint)`, `get-pool-balance () -> (response uint)`
- **Estimated:** 2h

**Task 7.2: `bitflow-strategy.clar` — concrete Bitflow wrapper (4h)**
- [ ] Implements `bitflow-strategy-trait`
- [ ] Stores: `bitflow-router` (principal), `pool-id` (uint), `asset` (principal)
- [ ] `deposit` — calls Bitflow router, returns LP tokens
- [ ] `withdraw` — calls Bitflow router, returns base asset
- [ ] `get-exchange-rate`, `get-pool-balance` — query Bitflow pool
- [ ] Vars: `admin-contract` (principal — timelock for router/pool changes), `emergency-admin` (principal — multi-sig for emergency withdraw)
- [ ] Timelock: changing Bitflow router or pool-id requires 24h delay
- **Estimated:** 3h (dev) + 1h (tests)

**Task 7.3: Yield integration (2h)**
- [ ] Wire yield-escrow to call strategy via trait
- [ ] Integration tests: deposit → yield accrues → claim → verify 30/70 split
- **Estimated:** 2h

---

#### Day 8 — Funding Pool: Core Logic (8h)

**Task 8.1: `funding-pool.clar` — data structures + `create-pool` (4h)**
- [ ] Trait: `funding-pool-trait`
- [ ] Data:
  ```
  pools: map uint => {
    name (string-ascii 64),
    creator principal,
    target-amount uint,
    min-contribution uint,
    min-reputation uint,
    duration uint,
    created-at uint,
    total-committed uint,
    status (string-ascii 20),
    governance-type (string-ascii 10),
    member-count uint
  }
  pool-members: map {pool-id uint, member principal} => {
    committed-amount uint,
    contributed-amount uint,
    joined-at uint,
    is-active bool
  }
  pool-id-counter: uint
  ```
- [ ] Constants: `MIN-REPUTATION-DEFAULT = u50`, `MAX-POOL-DURATION = u86400`
- [ ] Public: `create-pool` — checks:
  - Creator is verified (via `project-verification-module`)
  - Creator's reputation >= min-reputation (via `reputation::get-reputation-score`)
  - `target-amount > 0`
  - Creates pool entry, status = "open", emits event
- **Estimated:** 3h (dev) + 1h (tests)

**Task 8.2: `join-pool` + `contribute` (4h)**
- [ ] `join-pool (pool-id, amount)` — checks:
  - Pool exists and is "open"
  - `amount >= pool.min-contribution`
  - Caller's reputation >= pool.min-reputation
  - Caller is verified, not already a member
  - Adds member with `committed-amount = amount`, emits event
- [ ] `contribute (pool-id, amount)` — checks:
  - Caller is a pool member
  - `amount <= member.committed-amount - member.contributed-amount`
  - Transfers STX from member to this contract
  - Updates `contributed-amount` and `total-committed`
  - If `total-committed >= target-amount`, auto-close pool, emits event
- **Estimated:** 3h (dev) + 1h (tests)

---

#### Day 9 — Funding Pool: Proposals, Voting, Execution (8h)

**Task 9.1: `propose-allocation` + `vote` (4h)**
- [ ] Data:
  ```
  proposals: map uint => {
    pool-id uint,
    campaign-id uint,
    amount uint,
    proposer principal,
    status (string-ascii 15),      // "active" | "executed" | "rejected"
    votes-for uint,
    votes-against uint,
    created-at uint,
    deadline uint,
    total-voting-power uint
  }
  proposal-votes: map {proposal-id uint, voter principal} => {
    approve bool,
    voting-power uint,
    voted-at uint
  }
  ```
- [ ] `propose-allocation (pool-id, campaign-id, amount)` — checks:
  - Pool status is "open" or "closed"
  - Caller is a member
  - Amount <= pool's remaining unallocated capital
  - Campaign exists and active (via `milestone-escrow::get-campaign`)
  - Creates proposal, status = "active", emits event
- [ ] `vote (proposal-id, approve)` — checks:
  - Proposal is "active"
  - Voter is a pool member, hasn't already voted
  - Voting power = member's committed-amount (weighted)
  - Records vote, updates votes-for/votes-against
  - If quorum reached (>50% of total-voting-power), marks pass/fail, emits event
- **Estimated:** 3h (dev) + 1h (tests)

**Task 9.2: `execute-allocation` + edge cases (4h)**
- [ ] `execute-allocation (proposal-id)` — checks:
  - Proposal is ready (votes-for > votes-against AND votes-for > 50% of total-voting-power)
  - Not already executed
  - Calls `milestone-escrow::deposit (campaign-id, amount)` as the pool contract
  - Decrements pool's available allocation
  - Marks proposal executed, emits event
- [ ] No mandatory receipt: capital never forced onto members
- [ ] Edge cases: pool expiry auto-close, refund of unallocated contributions
- **Estimated:** 3h (dev) + 1h (tests)

---

#### Day 10 — Integration Tests, Deployment Prep, Documentation (8h)

**Task 10.1: End-to-end integration tests (4h)**

**Flow A: Verified creator raises funds**
1. Deploy all contracts
2. Register creator via `project-verification-module`
3. Admin verifies creator (via timelock queue → execute)
4. Creator creates campaign via `milestone-escrow` (3 milestones)
5. Investor deposits funds
6. Creator submits proof → approves → releases
7. Verify fee deduction (5%)

**Flow B: Yield on idle escrow**
1. Investor deposits to milestone-escrow
2. Excess capital routed to yield-escrow
3. Yield accrues (mock Bitflow)
4. Claim yield → verify 30/70 split

**Flow C: Passive funding pool**
1. Verified user creates pool (reputation check)
2. Other verified users join + contribute
3. Proposal to allocate to a campaign
4. Vote passes → execute allocation → capital reaches milestone-escrow
5. Milestone released → funds go to creator

**Flow D: Multi-asset support**
1. Campaign denominated in sBTC
2. Deposit sBTC (mock SIP-010)
3. Verify `asset-registry::is-supported` gates deposit
4. Release milestone in sBTC

**Flow E: Timelock admin operations**
1. Multi-sig proposes `add-asset` to timelock
2. Timelock queues with eta = current + 2880
3. Attempt execute before delay → rejected
4. Advance blocks past eta → execute succeeds
5. Verify asset is now supported
6. Test `cancel-transaction` — queue, cancel, verify cannot execute
7. Test emergency bypass (multi-sig calls `emergency-remove-asset` immediately)

**Flow F: Multi-sig signer rotation**
1. Two signers propose + confirm replacing one signer
2. Execute → verify old signer cannot propose, new signer can

- **Estimated:** 4h

**Task 10.2: Deployment plan finalization (2h)**
- [ ] Determine deployment order (see Section 4)
- [ ] Write deployment scripts (Clarinet devnet + testnet via `clarinet deploy`)
- [ ] Configure `Clarinet.toml` with all new contracts and dependencies
- [ ] Prepare `.env` with 2-of-3 multi-sig signer addresses, asset contract principals (sBTC, STX, USDCx mock addresses for testnet)
- **Estimated:** 2h

**Task 10.3: Documentation + handoff (2h)**
- [ ] Inline README per contract with function-level docs
- [ ] Integration hooks table (Section 5 below)
- [ ] Risk analysis summary (Section 3 below)
- **Estimated:** 2h

---

## 3. Risk Analysis & Mitigations

### 3.1 Oracle Failure (oracle-proxy)

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Stale price | Under/over-charging fees | Medium | `get-stx-price-with-fallback`: if `last-updated > 144 blocks` (~24h), return error. Frontend warns. |
| Manipulated price | Fee calculation attacks | Low | Multi-sig pushes price; timelock delays large price changes for 24h review. |
| Oracle contract paused | Fees cannot be computed | Low | Admin can set fallback hardcoded price (via timelock for non-emergency, multi-sig direct for emergency). |

**v1 decision:** Multi-sig push model (not Pyth/Alex pull). Simpler, auditable, no external dependency. Team pushes price daily. Timelock prevents single-signer price manipulation. → See `CINEX_PYTH_ORACLE_INTEGRATION_v2_ROADMAP.md` for the strategic rationale and v2 Pyth upgrade plan.

### 3.2 DeFi Protocol Risk (yield-escrow / Bitflow)

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Bitflow pool hack | Loss of deposited capital | Low (Bitflow audited) | Limit % of TVL deployed to any single pool. Admin can emergency-withdraw all funds (bypasses timelock). |
| Impermanent loss | Yield may be negative | Medium | Yield-escrow only deploys to stable-stable or STX-stable pools initially. Document IL risk. |
| Bitflow contract upgrade | Interface incompatibility | Low | `bitflow-strategy` is a separate contract. Changing strategy address is subject to timelock. |
| Yield calculation error | Wrong split amounts | Medium | Extensive tests with known-yield scenarios. Block-based accrual, not oracle-dependent. |

**v1 yield model:** "Simple accrual" — yield calculated as `(strategy-balance - principal-deposited)` when `claim-yield` is called. No compounding tracking in v1.

### 3.3 Reputation Sybil Attacks

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Fake accounts inflate ratings | Low-quality creators get funded | High (on-chain) | Only KYC'd verified users (via `project-verification-module`) can rate. One rating per (rater, target, campaign-id). |
| Reciprocal rating rings | Artificially high scores | Medium | Weight ratings by rater's own reputation (future v2). v1: off-chain monitoring. |
| No-rating scenario | New creators cannot start | Medium | Default reputation score of 50 (50%). Pools can set `min-reputation = 0`. |

### 3.4 Multi-Sig + Timelock Risks

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Single signer key compromised | Can queue malicious timelock tx | Low | 2-of-3 threshold required to propose + confirm. Single key cannot execute alone. |
| Two signers collude | Can execute any admin action | Low (pre-seed) | 24h timelock gives users and third signer window to detect and cancel. |
| Timelock front-running | Attacker sees queued tx, frontruns with exploit | Low | Timelock executes via `contract-call` — atomic. Target contract checks `tx-sender` equals timelock address. |
| Third signer unavailable | 2-of-3 still operational | Low | Only 2 signers needed. Third is backup/oversight. |
| All signers unavailable | Admin operations blocked | Very Low | Pre-seed stage: seed keys with hardware wallets + geographically distributed. Future: DAO governance. |
| Timelock contract bug | Queued transactions stuck | Low | Simple contract (~80 lines). Emergency bypass via multi-sig direct call exists on all target contracts. |

**Timelock bypass policy:**
- `emergency-withdraw` (all modules) — direct multi-sig, no delay
- `set-pause-state` during active exploit — direct multi-sig, no delay
- `emergency-remove-asset` (asset-registry) — direct multi-sig, no delay
- `emergency-set-price` (oracle-proxy) — direct multi-sig, no delay
- `emergency-revoke-verification` (project-verification) — direct multi-sig, no delay
- All other parameter/config changes — timelock required

### 3.5 Upgrade & Migration Risk (Immutable Contracts)

Bug discovered post-deploy → deploy v2 + emergency withdraw from v1 + users re-deposit. Cost ~1-2 weeks engineering + deployment gas. Data migration for `milestone-escrow` and `funding-pool`:

1. Deploy v2 contracts
2. Admin calls `emergency-withdraw` on v1 (returns funds to owners)
3. Owners re-deposit in v2
4. Frontend updates contract addresses (only hub address hardcoded)

---

## 4. Deployment Plan

### 4.1 Deployment Order

Contracts deployed in dependency order. Timelock is inserted between multi-sig and asset-registry so that all subsequent contracts are configured to route admin functions through timelock from day one.

```
 1. cinex-multisig              (no deps)            — sets 3 signers, threshold=2
 2. timelock                    (dep: cinex-multisig) — multisig-contract var set to #1
 3. asset-registry              (dep: cinex-multisig, timelock) — admin-contract = timelock, emergency-admin = multisig
 4. oracle-proxy                (dep: cinex-multisig, timelock) — admin-contract = timelock, emergency-admin = multisig
 5. reputation                  (dep: cinex-multisig, project-verification-module)
 6. project-verification-module (dep: cinex-multisig, timelock) — admin-contract = timelock, emergency-admin = multisig
 7. milestone-escrow            (dep: asset-registry, oracle-proxy, project-verification-module, timelock)
 8. yield-escrow                (dep: milestone-escrow, bitflow-strategy, timelock)
 9. bitflow-strategy            (dep: Bitflow router address, timelock)
10. funding-pool                (dep: reputation, project-verification-module, milestone-escrow)
```

Each contract's `initialize` function sets its admin references (`admin-contract → timelock`, `emergency-admin → cinex-multisig`).

### 4.2 Testnet vs Mainnet

| Phase | Network | Purpose | Duration |
|-------|---------|---------|----------|
| Dev | Clarinet devnet | Local development, unit tests | Week 1-2 |
| Staging | Stacks testnet | Integration tests, community review | Week 3-4 (post-plan) |
| Production | Stacks mainnet | Live deployment | Week 5+ (post-plan) |

**Testnet configuration:**
- sBTC: mock SIP-010 token (`mock-sbtc.clar`)
- USDCx: mock SIP-010 token (`mock-usdc.clar`)
- Bitflow: testnet Bitflow router address (TBD)
- 2-of-3 multi-sig signers: 3 test wallets (simulating Victor, co-founder, advisor)

### 4.3 Clarinet.toml Configuration

```toml
[contracts.cinex-multisig]
path = "contracts/cinex-multisig.clar"

[contracts.timelock]
path = "contracts/timelock.clar"
depends_on = ["cinex-multisig"]

[contracts.asset-registry]
path = "contracts/asset-registry.clar"
depends_on = ["cinex-multisig", "timelock"]

[contracts.oracle-proxy]
path = "contracts/oracle-proxy.clar"
depends_on = ["cinex-multisig", "timelock"]

[contracts.reputation]
path = "contracts/reputation.clar"
depends_on = ["cinex-multisig", "project-verification-module"]

[contracts.project-verification-module]
path = "contracts/project-verification-module.clar"
depends_on = ["cinex-multisig", "timelock"]

[contracts.milestone-escrow]
path = "contracts/milestone-escrow.clar"
depends_on = ["asset-registry", "oracle-proxy", "project-verification-module", "cinex-multisig", "timelock"]

[contracts.yield-escrow]
path = "contracts/yield-escrow.clar"
depends_on = ["milestone-escrow", "bitflow-strategy", "cinex-multisig", "timelock"]

[contracts.bitflow-strategy]
path = "contracts/bitflow-strategy.clar"
depends_on = ["cinex-multisig", "timelock"]

[contracts.funding-pool]
path = "contracts/funding-pool.clar"
depends_on = ["reputation", "project-verification-module", "milestone-escrow", "cinex-multisig"]
```

---

## 5. Integration Hooks

### 5.1 Cross-Contract Call Table

| Caller Contract | Called Contract | Function | When | Purpose |
|----------------|----------------|----------|------|---------|
| `timelock` | `cinex-multisig` | `is-approved` | `queue-transaction` | Verify caller is a multi-sig signer |
| Target contracts | `timelock` | (via `tx-sender` check) | All non-emergency admin | Only timelock can call certain admin functions |
| `milestone-escrow` | `asset-registry` | `is-supported` | `create-campaign` | Validate asset is whitelisted |
| `milestone-escrow` | `oracle-proxy` | `get-stx-price` | `create-campaign` | Compute USD-pegged verification fee in STX |
| `milestone-escrow` | `project-verification-module` | `is-creator-currently-verified` | `create-campaign` | Ensure only verified creators can launch campaigns |
| `yield-escrow` | `bitflow-strategy` | `deposit` | `deposit-to-yield-escrow` | Deploy capital to Bitflow pool |
| `yield-escrow` | `bitflow-strategy` | `withdraw` | `withdraw-from-yield-escrow` | Withdraw capital from Bitflow pool |
| `yield-escrow` | `bitflow-strategy` | `get-exchange-rate` | `claim-yield` | Calculate accrued yield |
| `funding-pool` | `reputation` | `get-reputation-score` | `create-pool`, `join-pool` | Check min-reputation requirement |
| `funding-pool` | `project-verification-module` | `is-creator-currently-verified` | `create-pool` | Ensure pool creator is verified |
| `funding-pool` | `milestone-escrow` | `deposit` | `execute-allocation` | Allocate pool capital to campaign escrow |
| `funding-pool` | `milestone-escrow` | `get-campaign` | `propose-allocation` | Validate campaign exists and is active |
| All contracts | `cinex-multisig` | `is-approved` | Emergency admin functions | Bypass timelock for emergencies |

### 5.2 Hub Integration (`CineX-project.clar`)

The existing `CineX-project` hub contract must be updated to:
1. Replace `Co-EP-rotating-fundings` reference with `funding-pool` address
2. Replace `film-verification-module` reference with `project-verification-module` address (backward compatible via re-exported trait)
3. Add new integration functions: `create-pool-via-hub`, `allocate-via-hub`
4. No change needed for escrow — `milestone-escrow` replaces `escrow-module` at the interface level (new trait)

**Backward compatibility plan:**
- Keep old `film-verification-module` deployed alongside `project-verification-module` during transition
- Hub points to new module; old module is deprecated in frontend
- After verification, old module can be frozen via emergency pause (bypasses timelock)

### 5.3 Timelock Integration Pattern

For any admin-gated function that requires timelock, the flow is:

```
Multi-sig (2-of-3):
  1. Signer A: propose-transaction(timelock, "queue-transaction", [target, func, args])
  2. Signer B: confirm-transaction(tx-id)
  3. Anyone: execute-transaction(tx-id)
     → calls timelock::queue-transaction(target, func, args)
     → timelock sets eta = block-height + 2880

After 24h delay:
  4. Anyone: timelock::execute-transaction(queue-id)
     → timelock calls target::func(args)
     → target checks tx-sender == timelock address → executes

Emergency bypass:
  1. Signer A: propose-transaction(target, "emergency-func", [args])
  2. Signer B: confirm-transaction(tx-id)
  3. Anyone: execute-transaction(tx-id)
     → directly calls target::emergency-func(args)
     → target checks tx-sender == multi-sig address → bypasses timelock
```

### 5.4 Event Hooks (Off-Chain Indexer)

Each contract emits `print` events for off-chain consumption:

```
{ event: "deposit", campaign-id: uint, contributor: principal, amount: uint, asset: principal, block-height: uint }
{ event: "milestone-approved", campaign-id: uint, milestone-index: uint, approved-by: principal, block-height: uint }
{ event: "pool-created", pool-id: uint, creator: principal, name: string, target: uint, block-height: uint }
{ event: "yield-claimed", campaign-id: uint, user-share: uint, platform-share: uint, block-height: uint }
{ event: "transaction-queued", queue-id: uint, recipient: principal, function-name: string, eta: uint, block-height: uint }
{ event: "transaction-executed", queue-id: uint, recipient: principal, function-name: string, block-height: uint }
{ event: "transaction-cancelled", queue-id: uint, cancelled-by: principal, block-height: uint }
```

These events feed an off-chain activity feed (e.g., Postgres + Hasura or custom indexer).

---

## 6. Testing Strategy

### 6.1 Unit Tests (Clarinet `tests/`)

| Contract | Minimum Test Cases |
|----------|-------------------|
| `cinex-multisig` | 14: propose → confirm → execute; signer rotation; reject non-signer; reject double-execute; threshold check; boundary |
| `timelock` | 10: queue → cannot execute before delay → execute after delay; cancel; non-multisig cannot queue; double-execute reject; multiple queued transactions |
| `asset-registry` | 10: add → is-supported; remove → not-supported; timelock-only admin; emergency bypass (multi-sig direct); reject non-admin; duplicate add |
| `oracle-proxy` | 8: set → update → get; stale price rejection; timelock admin path; emergency bypass path |
| `reputation` | 10: rate → score; duplicate reject; self-rating reject; invalid rating reject; multiple raters |
| `project-verification-module` | 17: register creator; add portfolio; verify via timelock; emergency verify/revoke bypass; multi-vertical; backward-compat alias |
| `milestone-escrow` | 22: full flow; multi-asset; fee calculation; partial deposit; refund; deadline; timelock admin for fee parameters |
| `yield-escrow` | 14: deposit → withdraw; yield claim → 30/70 split; strategy integration; underflow protection; timelock admin for strategy change |
| `bitflow-strategy` | 10: mocked deposit → withdraw → exchange-rate; LP accounting; timelock admin for router/pool change |
| `funding-pool` | 18: create → join → contribute → propose → vote → execute; reputation gate; quorum math; refund; expiry |

**Total: ~123 test cases** (14 more than original due to timelock)

### 6.2 Integration Tests

See Day 10 Task 10.1 for the 6 integration flows (A through F). Each integration test:
- Deploys all contracts via `clarinet devnet` or `clarinet test --chain`
- Uses `vm.contract-call` and `vm.transaction` to simulate full cross-contract flows
- Flow E specifically tests the complete timelock lifecycle: propose → queue → wait → execute, plus cancel and emergency bypass

### 6.3 Test Infrastructure

- **Mock tokens:** `mock-sbtc.clar` and `mock-usdc.clar` implementing SIP-010 trait for multi-asset testing
- **Mock Bitflow:** `mock-bitflow-strategy.clar` — fixed yield rate (e.g., 1% per block) for deterministic testing
- **Mock oracle:** `mock-oracle.clar` — returns fixed price for STX/USD
- **Mock multi-sig:** a `test-multisig.clar` that uses a single principal for test simplicity (allows `is-approved` to return true for a test deployer)

### 6.4 Pre-Merge Checklist

Before any contract is considered "done":
- [ ] All unit tests pass (`clarinet test`)
- [ ] No Clarity warnings (unused variables, unchecked returns)
- [ ] Integration test for the contract's primary flow passes
- [ ] All `unwrap!` calls have corresponding `asserts!` guards
- [ ] `print` events are emitted for all state-changing operations
- [ ] Admin routing is correct: non-emergency → timelock check, emergency → multi-sig check
- [ ] Module traits (`module-base-trait`, `emergency-module-trait`) are implemented if replacing a module

---

## 7. Summary Timeline (Gantt)

| Day | Focus | Contracts | Deliverables |
|-----|-------|-----------|-------------|
| 1 | Admin Infrastructure | `cinex-multisig` (2-of-3), `timelock`, `asset-registry` | 3 contracts, unit tests |
| 2 | Oracle + Reputation + Verification start | `oracle-proxy`, `reputation`, `project-verification-module` (start) | 2 contracts + partial 3rd, unit tests |
| 3 | Verification complete | `project-verification-module` (finish + tests) | V module done, all Week 1 infra complete |
| 4 | Milestone start | `milestone-escrow` (data model, create-campaign, fee params via timelock) | Milestone data model, creation flow |
| 5 | Milestone core + tests | `milestone-escrow` (deposit, approve, release, edge cases, tests) | Milestone complete |
| 6 | Yield core | `yield-escrow` (accounting, deposit, withdraw, claim) | 1 contract, unit tests |
| 7 | Yield Bitflow | `bitflow-strategy`, yield integration | Yield system complete |
| 8 | Pool core | `funding-pool` (create, join, contribute) | 1 contract, unit tests |
| 9 | Pool governance | `funding-pool` (propose, vote, execute) | Pool system complete |
| 10 | Ship | E2E integration tests (6 flows), deployment scripts, docs | All 10 contracts ready for testnet |

---

## 8. Files to Create (31 total)

```
contracts/ (20 .clar files)
├── cinex-multisig.clar                           # NEW — 2-of-3 admin
├── timelock.clar                                 # NEW — 2880-block delay for admin ops
├── timelock-trait.clar                           # NEW — trait for queue/execute/cancel
├── asset-registry.clar                           # NEW — asset whitelist
├── asset-registry-trait.clar                     # NEW — trait
├── oracle-proxy.clar                             # NEW — STX/USD feed
├── oracle-proxy-trait.clar                       # NEW — trait
├── reputation.clar                               # NEW — peer ratings
├── reputation-trait.clar                         # NEW — trait
├── project-verification-module.clar              # NEW — replaces film-verification-module.clar
├── project-verification-module-trait.clar        # NEW — extends film-verification-trait
├── milestone-escrow.clar                         # NEW — multi-asset milestone escrow
├── milestone-escrow-trait.clar                   # NEW — trait
├── yield-escrow.clar                             # NEW — yield-bearing escrow
├── yield-escrow-trait.clar                       # NEW — trait
├── bitflow-strategy.clar                         # NEW — Bitflow integration
├── bitflow-strategy-trait.clar                   # NEW — trait
├── funding-pool.clar                             # NEW — passive capital pools
├── funding-pool-trait.clar                       # NEW — trait
├── mock-sbtc.clar                                # NEW — SIP-010 test token
├── mock-usdc.clar                                # NEW — SIP-010 test token
├── mock-bitflow-strategy.clar                    # NEW — test mock
├── mock-oracle.clar                              # NEW — test mock

tests/ (11 .clar files)
├── cinex-multisig_test.clar
├── timelock_test.clar                            # NEW
├── asset-registry_test.clar
├── oracle-proxy_test.clar
├── reputation_test.clar
├── project-verification-module_test.clar
├── milestone-escrow_test.clar
├── yield-escrow_test.clar
├── bitflow-strategy_test.clar
├── funding-pool_test.clar
├── integration_test.clar                         # 6 end-to-end flows
```

**Total: 31 files** (20 source + 11 test)

---

*End of plan.*
