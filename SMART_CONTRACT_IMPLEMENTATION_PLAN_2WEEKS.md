# CineX Smart Contract Implementation Plan — 2-Week Sprint

> **Scope:** 9 smart contracts (7 new + 2 retained originals) + 2-of-3 multi-sig contract + trait definitions
> **Target:** Stacks testnet (mainnet-ready audit phase)
> **Team:** 1 senior Clarity engineer (80h), 1 peer reviewer (20h)
> **Total estimated effort:** ~100 person-hours

---

## 1. Architecture Decisions

### 1.1 Immutable Contracts (No Proxy)

All contracts are deployed once and are immutable. No forwarding proxy. Migration = deploy new contract + script-transfer residual assets + update frontend. Traits are for compile-time interface enforcement and modular DI, not upgradeability.

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

A `timelock.clar` contract enforces a block-based delay (2880 blocks ≈ 24 hours on Stacks at ~30s/block) for queued administrative transactions before execution. This prevents a compromised single multi-sig key from immediately executing a malicious admin action.

**Design:**
- `queue-transaction (recipient, function-name, args, eta)` — only callable by multi-sig (checks `is-approved`). Stores `{recipient, function-name, args, eta (block-height), executed, cancelled}`.
- `execute-transaction (tx-id)` — anyone can call after `eta` block-height has passed. Calls the target contract with the stored function and args.
- `cancel-transaction (tx-id)` — multi-sig only. Marks transaction as cancelled.

**Critical actions subject to timelock (2880-block delay):**

| Action | Contract | Rationale |
|--------|----------|-----------|
| `add-asset` | asset-registry | Adding a malicious asset could drain escrow |
| `remove-asset` | asset-registry | Removing a legitimate asset breaks live campaigns |
| `set-price-oracle` | oracle-proxy | Changing price source enables manipulation |
| Fee parameter changes | milestone-escrow | Changing withdrawal fee affects all users |
| `update-price` (above threshold) | oracle-proxy | Large price deviations need review |
| Strategy address change | yield-escrow / bitflow-strategy | Redirecting funds to malicious contract |

**Emergency bypass:** Functions on the `emergency-module-trait` (`emergency-withdraw`, `set-pause-state`) are NOT routed through timelock.

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
| `yield-escrow-trait` | `deposit-to-yield-escrow`, `withdraw-from-yield-escrow`, `claim-backer-yield`, `distribute-platform-yield` | milestone-escrow (routing) |
| `milestone-verification` | (no trait — standalone; referenced by yield-escrow for bonus check) | yield-escrow |
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
| `milestone-escrow` | u5400-u5423 | New |
| **`yield-escrow`** | **u5500-u5518** | **v2: 70/20/10 split, creator bonus, forfeiture** |
| **`bitflow-strategy`** | **u5600-u5607** | **Updated to actual range** |
| **`milestone-verification`** | **u5600-u5620** | **Backer-weighted voting (not 80% checker)** |
| **`funding-pool`** | **u5700-u5731** | **Updated to avoid u5600 conflict** |

---

## 2. Weekly Breakdown

### Week 1 — Foundation, Registry, Oracle, Reputation, Verification, Milestone Escrow

---

#### Day 1 — Multi-Sig + Timelock + Asset Registry (8h)

*(Unchanged from plan — multi-sig, timelock, asset-registry all correct)*

---

#### Day 2 — Oracle Proxy + Reputation + Project Verification Begins (8h)

*(Unchanged from plan)*

---

#### Day 3 — Project Verification Module (complete) + Tests (8h)

*(Unchanged from plan)*

---

#### Day 4 — Milestone Escrow: data structures + create-campaign (8h)

**Important correction:** Milestone approval is **backer-gated, sequential** — NOT creator self-approval as originally written. Creator cannot approve their own milestone (`ERR-CREATOR-CANNOT-APPROVE`). Each milestone requires the previous milestone to be approved first.

---

#### Day 5 — Milestone Escrow: deposit, approve, release + tests (8h)

**Task 5.2: `submit-milestone-proof` + `approve-milestone` (2.5h)**
- [x] `submit-milestone-proof (campaign-id, milestone-index, proof-hash)` — checks:
  - Campaign is "active"
  - Milestone index is within range
  - Milestone is not already approved or released
  - Proof-hash is valid (32-byte buff)
  - Only campaign creator can submit
  - Updates milestone's `proof-hash`, emits event
- [x] `approve-milestone (campaign-id, milestone-index)` — checks:
  - Milestone has a proof-hash
  - Milestone is not already approved/released
  - **Creator CANNOT approve (backer-gated)**
  - **Only contributors with deposit record may approve**
  - **Sequential: milestone n requires milestone n-1 approved**
  - Sets `approved = true`, `approved-by = tx-sender`, emits event

---

### Week 2 — Yield Escrow, Milestone Verification, Funding Pool, Integration Tests, Deployment

---

#### Day 6 — Yield Escrow: Core Accounting + Trait (8h) ✅

**CRITICAL UPDATE:** Yield split changed from original plan:

| Aspect | Original Plan | Actual Implementation |
|--------|---------------|----------------------|
| Split ratio | 30% CineX / 70% users | **70% backers / 20% platform / 10% creator bonus** |
| Creator bonus | Not mentioned | Conditional on milestone performance (via milestone-verification) |
| Forfeited bonus | Not mentioned | Redisbursed: 70% to backers, 30% to platform |
| Contract version | v1 | **v2** |

**Key design decisions:**
- On `deposit-to-yield-escrow`, calls `crowdfunding-module::get-total-raised-funds` to snapshot total raised at time of deposit
- `withdraw-from-yield-escrow` sends STX **directly to campaign creator**, not back to milestone-escrow
- `claim-backer-yield` calls `crowdfunding-module::get-campaign-contributions` to compute backer's proportional share
- `claim-creator-bonus` calls `milestone-verification::is-bonus-forfeited` to check eligibility

---

#### Day 7 — Yield Escrow: Bitflow Integration (8h) ✅

Note: `bitflow-strategy` error range is u5600-u5607, not u5500 range.

---

#### Day 8 — Milestone Verification: Backer-Weighted Voting + Bonus (6h) ✅

**CRITICAL UPDATE:** Completely redesigned from original plan:

| Aspect | Original Plan | Actual Implementation |
|--------|---------------|----------------------|
| Purpose | Simple bonus eligibility checker (80% threshold) | **Full backer-weighted voting system** |
| Who sets milestones | **Admin** (timelock) | **Campaign creator** (gated via milestone-escrow) |
| How milestones pass | 80% completed | **>50% weighted YES of total campaign contributions** |
| Missed milestones | Not tracked | **3 missed → bonus forfeited** |
| Resubmission buffer | Not applicable | **~5 days (86400 blocks)** |
| Called by | milestone-escrow on release | **Standalone** — yield-escrow checks `is-bonus-forfeited` |
| Error range | u5530-u5539 | **u5600-u5620** |
| Dependencies | milestone-escrow only | **crowdfunding-module + milestone-escrow** |

**Flow:**
1. Creator creates campaign in `milestone-escrow`
2. Creator calls `create-milestones` in this contract with deadline list (validated against milestone-escrow)
3. Creator calls `submit-milestone` within each deadline
4. Backers call `endorse-milestone` (YES/NO, weight = contribution amount)
5. Anyone calls `finalize-milestone` after deadline passes
6. If ≥3 milestones missed, bonus forfeited
7. `yield-escrow` reads `is-bonus-forfeited` when creator claims 10% bonus

---

#### Day 9 — Funding Pool: Core Logic (8h) ✅

*(26 tests passing)*

---

#### Day 10 — Funding Pool: Proposals, Voting, Execution (8h) ✅

*(28 tests passing — note: error range is u5700-u5731, not u5600-u5650)*

---

#### Day 11 — Integration Tests, Deployment Prep, Documentation (8h)

**Task 11.1: End-to-end integration tests (4h)**

**Flow A: Campaign lifecycle (backer approval path)**
1. Deploy all contracts
2. Register creator via `project-verification-module`
3. Admin verifies creator (via timelock queue → execute)
4. Creator creates campaign via `milestone-escrow` (3 milestones)
5. Investor deposits funds
6. Creator submits proof for milestone 0
7. **Backer approves milestone 0 (not creator self-approve)**
8. Release milestone 0 → verify 5% fee, creator gets remainder
9. Verify milestone 1 cannot be approved before milestone 0

**Flow B: Yield on idle escrow (70/20/10 split)**
1. Investor deposits to milestone-escrow
2. Excess capital routed to yield-escrow
3. Yield accrues (mock Bitflow)
4. Backer claims yield → verify 70% share
5. Creator claims bonus → verify 10% share (or forfeiture if milestones missed)
6. Platform sweeps 20% share

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
6. Test `cancel-transaction`
7. Test emergency bypass (multi-sig calls `emergency-remove-asset` immediately)

**Flow F: Multi-sig signer rotation**
1. Two signers propose + confirm replacing one signer
2. Execute → verify old signer cannot propose, new signer can

**Flow G: Milestone verification + creator bonus eligibility**
1. Creator creates campaign, sets milestones via `milestone-verification::create-milestones`
2. Some milestones endorsed, some missed
3. Check `is-bonus-forfeited`
4. If ≥3 missed, bonus forfeited → yield-escrow redistributes to backers

**Task 11.2: Deployment plan finalization (2h)**
- [x] Determine deployment order (see Section 4)
- [ ] Write deployment scripts (Clarinet devnet + testnet via `clarinet deploy`)
- [x] Configure `Clarinet.toml` with all contracts and dependencies
- [ ] Prepare `.env` with signer addresses, asset contract principals

**Task 11.3: Documentation + handoff (2h)**
- [ ] Inline README per contract with function-level docs
- [ ] Integration hooks table (Section 5 below)
- [ ] Risk analysis summary (Section 3 below)

---

## 3. Risk Analysis & Mitigations

### 3.1 Oracle Failure (oracle-proxy)

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Stale price | Under/over-charging fees | Medium | `get-stx-price-with-fallback`: if `last-updated > 144 blocks` (~24h), return error. Frontend warns. |
| Manipulated price | Fee calculation attacks | Low | Multi-sig pushes price; timelock delays large price changes for 24h review. |
| Oracle contract paused | Fees cannot be computed | Low | Admin can set fallback hardcoded price (via timelock for non-emergency, multi-sig direct for emergency). |

### 3.2 DeFi Protocol Risk (yield-escrow / Bitflow)

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Bitflow pool hack | Loss of deposited capital | Low (Bitflow audited) | Limit % of TVL deployed to any single pool. Admin can emergency-withdraw all funds (bypasses timelock). |
| Impermanent loss | Yield may be negative | Medium | Yield-escrow only deploys to stable-stable or STX-stable pools initially. Document IL risk. |
| Bitflow contract upgrade | Interface incompatibility | Low | `bitflow-strategy` is a separate contract. Changing strategy address is subject to timelock. |
| Yield calculation error | Wrong split amounts | Medium | Extensive tests with known-yield scenarios. Block-based accrual, not oracle-dependent. |

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
| Timelock contract bug | Queued transactions stuck | Low | Simple contract (~80 lines). Emergency bypass via multi-sig direct call exists on all target contracts. |

### 3.5 Milestone Verification — New Risks

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Creator sets unrealistic deadlines | All milestones missed → forfeited bonus | Medium | Backers review before funding; market forces reasonable deadlines |
| Backer apathy (no one votes) | Milestones never endorsed | Medium | Any caller can `finalize-milestone` after deadline — defaults to NO if >50% threshold not met |
| Creator loses access to account | Cannot submit milestones | Low | Emergency admin can call `set-pause-state` + `emergency-withdraw` if needed |

### 3.6 Upgrade & Migration Risk (Immutable Contracts)

Bug discovered post-deploy → deploy v2 + emergency withdraw from v1 + users re-deposit.

---

## 4. Deployment Plan

### 4.1 Deployment Order

Contracts deployed in dependency order:

```
  1. cinex-multisig              (no deps)
  2. timelock                    (dep: cinex-multisig)
  3. asset-registry              (dep: cinex-multisig, timelock)
  4. oracle-proxy                (dep: cinex-multisig, timelock)
  5. reputation                  (dep: cinex-multisig, project-verification-module)
  6. crowdfunding-module         (pre-existing — needed by milestone-verification and yield-escrow)
  7. project-verification-module (dep: cinex-multisig, timelock)
  8. milestone-escrow            (dep: asset-registry, oracle-proxy, project-verification-module, timelock)
  9. milestone-verification      (dep: crowdfunding-module, milestone-escrow, timelock)
 10. yield-escrow                (dep: milestone-escrow, bitflow-strategy, milestone-verification, crowdfunding-module, timelock)
 11. bitflow-strategy            (dep: Bitflow router address, timelock)
 12. funding-pool                (dep: reputation, project-verification-module, milestone-escrow)
```

### 4.2 Testnet vs Mainnet

| Phase | Network | Purpose | Duration |
|-------|---------|---------|----------|
| Dev | Clarinet devnet | Local development, unit tests | Week 1-2 |
| Staging | Stacks testnet | Integration tests, community review | Week 3-4 (post-plan) |
| Production | Stacks mainnet | Live deployment | Week 5+ (post-plan) |

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

[contracts.crowdfunding-module]
path = "contracts/crowdfunding-module.clar"

[contracts.milestone-escrow]
path = "contracts/milestone-escrow.clar"
depends_on = ["asset-registry", "oracle-proxy", "project-verification-module", "cinex-multisig", "timelock"]

[contracts.milestone-verification]
path = "contracts/milestone-verification.clar"
depends_on = ["crowdfunding-module", "milestone-escrow", "cinex-multisig", "timelock"]

[contracts.yield-escrow]
path = "contracts/yield-escrow.clar"
depends_on = ["milestone-escrow", "milestone-verification", "crowdfunding-module", "bitflow-strategy", "cinex-multisig", "timelock"]

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
| `milestone-verification` | `crowdfunding-module` | `get-campaign-contributions` | `endorse-milestone` | Get backer's contribution weight |
| `milestone-verification` | `crowdfunding-module` | `get-total-raised-funds` | `finalize-milestone` | Get total raised for YES/NO threshold |
| `milestone-verification` | `milestone-escrow` | `get-campaign` | `create-milestones` | Validate caller is campaign creator |
| `yield-escrow` | `crowdfunding-module` | `get-total-raised-funds` | `deposit-to-yield-escrow` | Snapshot total raised at deposit time |
| `yield-escrow` | `crowdfunding-module` | `get-campaign-contributions` | `claim-backer-yield` | Get backer's contribution for proportional yield |
| `yield-escrow` | `milestone-verification` | `is-bonus-forfeited` | `claim-creator-bonus` | Check creator bonus eligibility |
| `yield-escrow` | `bitflow-strategy` | `deposit`, `withdraw`, `get-pool-balance`, `get-exchange-rate` | Various | Deploy/withdraw capital, compute yield |
| `funding-pool` | `reputation` | `get-reputation-score` | `create-pool`, `join-pool` | Check min-reputation requirement |
| `funding-pool` | `project-verification-module` | `is-creator-currently-verified` | `create-pool` | Ensure pool creator is verified |
| `funding-pool` | `milestone-escrow` | `deposit` | `execute-allocation` | Allocate pool capital to campaign escrow |
| `funding-pool` | `milestone-escrow` | `get-campaign` | `propose-allocation` | Validate campaign exists and is active |
| All contracts | `cinex-multisig` | `is-approved` | Emergency admin functions | Bypass timelock for emergencies |

### 5.2 Integration with Existing Hub (`CineX-project.clar`)

The existing `CineX-project` hub contract retains references to:
- `crowdfunding-module` (unchanged — used by milestone-verification and yield-escrow)
- `film-verification-module` (deprecated — `project-verification-module` is the replacement)

The hub does NOT need modification for the new contracts; they reference `crowdfunding-module` and `milestone-escrow` directly by their deployer names.

### 5.3 Timelock Integration Pattern

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

```
{ event: "deposit", campaign-id: uint, contributor: principal, amount: uint, asset: principal, block-height: uint }
{ event: "milestone-approved", campaign-id: uint, milestone-index: uint, approved-by: principal, block-height: uint }
{ event: "pool-created", pool-id: uint, creator: principal, name: string, target: uint, block-height: uint }
{ event: "yield-claimed", campaign-id: uint, user-share: uint, platform-share: uint, block-height: uint }
{ event: "milestone-finalized", campaign-id: uint, milestone-index: uint, endorsed: bool, block-height: uint }
```

---

## 6. Testing Strategy

### 6.1 Unit Tests

| Contract | Test Cases |
|----------|-----------|
| `cinex-multisig` | 14: propose → confirm → execute; signer rotation; reject non-signer; boundary |
| `timelock` | 10: queue → delay → execute; cancel; non-multisig reject; double-execute |
| `asset-registry` | 10: add → is-supported; remove; timelock admin; emergency bypass |
| `oracle-proxy` | 8: set → update → get; stale price; timelock + emergency paths |
| `reputation` | 10: rate → score; duplicate reject; self-rating reject; invalid rating |
| `project-verification-module` | 17: register → verify → timelock; emergency bypass; multi-vertical; backward compat |
| `milestone-escrow` | 26: full flow; multi-asset; 5% fee; partial deposit; backer-gated approval; sequential approval |
| `yield-escrow` | 18: 70/20/10 split; backer claim; creator bonus; forfeiture; strategy integration |
| `milestone-verification` | 12: creator-set milestones; submit → endorse → finalize; forfeiture; bonus check |
| `bitflow-strategy` | 20: mock deposit → withdraw → collect-yield; LP accounting; timelock admin |
| `funding-pool` | 28: create → join → contribute → propose → vote → execute; edge cases |

**Total: ~173 test cases**

### 6.2 Integration Tests

See Day 11 Task 11.1 for the 7 integration flows (A through G).

### 6.3 Pre-Merge Checklist

- [x] All unit tests pass (`npx vitest run`)
- [ ] No Clarity warnings (unused variables, unchecked returns)
- [x] Integration test for the contract's primary flow passes
- [x] All `unwrap!` calls have corresponding `asserts!` guards
- [x] `print` events emitted for all state-changing operations
- [x] Admin routing correct: non-emergency → timelock, emergency → multi-sig
- [x] Module traits implemented where applicable

---

## 7. Summary Timeline (Gantt)

| Day | Focus | Contracts | Deliverables |
|-----|-------|-----------|-------------|
| 1 | Admin Infrastructure | `cinex-multisig`, `timelock`, `asset-registry` | 3 contracts, unit tests |
| 2 | Oracle + Reputation + Verification start | `oracle-proxy`, `reputation`, `project-verification-module` (start) | 2 contracts + partial 3rd |
| 3 | Verification complete | `project-verification-module` (finish + tests) | V module done, Week 1 infra complete |
| 4 | Milestone start | `milestone-escrow` (data model, creation, backer-gated approval) | Milestone data model, creation flow |
| 5 | Milestone core + tests | `milestone-escrow` (deposit, approve, release, sequential approval, tests) | Milestone complete |
| 6 | Yield core (v2) | `yield-escrow` (70/20/10 split, creator bonus, forfeiture) | 1 contract, unit tests |
| 7 | Yield Bitflow | `bitflow-strategy`, yield integration | Yield system complete |
| 8 | Milestone Verification | `milestone-verification` (backer-weighted voting, forfeiture, bonus) | 1 contract, unit tests |
| 9 | Pool core | `funding-pool` (create, join, contribute) | 1 contract, unit tests |
| 10 | Pool governance | `funding-pool` (propose, vote, execute) | Pool system complete |
| 11 | Ship | E2E integration tests (7 flows), deployment scripts, docs | All contracts ready for testnet |

---

## 8. Files (26 source + 11 test = 37 files)

```
contracts/ (20 .clar files)
├── cinex-multisig.clar                        # 2-of-3 admin
├── timelock.clar                              # 2880-block delay
├── timelock-trait.clar                        # trait
├── asset-registry.clar                        # asset whitelist
├── asset-registry-trait.clar                  # trait
├── oracle-proxy.clar                          # STX/USD feed
├── oracle-proxy-trait.clar                    # trait
├── reputation.clar                            # peer ratings
├── reputation-trait.clar                      # trait
├── project-verification-module.clar           # multi-vertical verification
├── project-verification-module-trait.clar     # trait
├── crowdfunding-module.clar                   # pre-existing, retained
├── milestone-escrow.clar                      # multi-asset milestone escrow
├── milestone-escrow-trait.clar                # trait
├── milestone-verification.clar                # backer-weighted voting + bonus
├── yield-escrow.clar                          # v2: 70/20/10 split
├── yield-escrow-trait.clar                    # trait
├── bitflow-strategy.clar                      # Bitflow wrapper
├── bitflow-strategy-trait.clar                # trait
├── mock-strategy.clar                         # test mock
├── funding-pool.clar                          # passive capital pools
├── funding-pool-trait.clar                    # trait

tests/ (11 .ts files)
├── tests/cinex-multisig.test.ts               # 14 tests
├── tests/timelock.test.ts                     # 10 tests
├── tests/asset-registry.test.ts               # 10 tests
├── tests/oracle-proxy.test.ts                 # 8 tests
├── tests/reputation.test.ts                   # 10 tests
├── tests/project-verification-module.test.ts  # 17 tests
├── tests/milestone-escrow.test.ts             # 26 tests
├── tests/yield-escrow.test.ts                 # 18 tests
├── tests/bitflow-strategy.test.ts             # 20 tests
├── tests/funding-pool.test.ts                 # 28 tests
├── tests/integration.test.ts                  # (planned — Day 11)
```

---

*End of plan (corrected).*
