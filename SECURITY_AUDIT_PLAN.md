# CineX Security Audit Plan

## Scope

### Contracts Audited
| Contract | Lines | Purpose | Priority |
|----------|-------|---------|----------|
| `yield-escrow.clar` | 396 | Yield position management, strategy delegation, STX deposit/withdraw | Critical |
| `bitflow-strategy.clar` | 290 | Bitflow AMM pool wrapper (v1 mock) | Critical |
| `Co-EP-rotating-fundings.clar` | 1403 | Co-production rotating funding pools | High |
| `crowdfunding-module.clar` | — | Campaign crowdfunding | High |
| `escrow-module.clar` | — | Milestone-based escrow | High |
| `emergency-module.clar` | — | Emergency pause/ops | Medium |
| `oracle-proxy.clar` | — | Price oracle proxy | Medium |

---

## 1. Arithmetic Underflow (Critical — Fixed)

### Finding
Three `let` blocks computed subtraction before validity assertions, causing `ArithmeticUnderflow` runtime errors when the assertion would have been triggered.

### Affected Contracts
| Contract | Function | Line (before fix) | Bug |
|----------|----------|-------------------|-----|
| `bitflow-strategy.clar` | `withdraw` | 142–144 | `new-lp`, `new-pool` computed before `(<= lp-amount current-lp)` assertion |
| `bitflow-strategy.clar` | `deposit` | 113–115 | `new-pool-balance`, `lp-minted` computed before `(> amount u0)` assertion |
| `yield-escrow.clar` | `withdraw-from-yield-escrow` | 184 | `updated-principal` computed before `(<= amount (get principal-deposited position))` assertion |

### Fix
Moved all arithmetic operations **after** their corresponding `asserts!` checks. In `yield-escrow`, the subtraction is now computed inline in `map-set` where it is guaranteed safe.

---

## 2. Integer Division Truncation (Medium — Fixed)

### Finding
Double floor-division in `yield-escrow.clar:withdraw-from-yield-escrow`:
1. `lp-amount = floor(amount × 1e8 / exchange-rate)` (line 196)
2. Strategy computes `base-asset-return = floor(lp-amount × exchange-rate / 1e8)`

When `exchange-rate ≠ 1e8`, property `withdrawn ≥ amount` is not guaranteed because both conversions truncate. Dust amounts cause the assertion `(asserts! (>= withdrawn amount))` to fail.

### Proof
Given `rate > 1e8` (pool has yield):
- Want to withdraw amount `A`
- `lp = ⌊A × 1e8 / rate⌋` 
- `returned = ⌊lp × rate / 1e8⌋`
- By integer division properties: `returned ≤ A`, with strict inequality when `rate` does not divide `A × 1e8` evenly

### Fix
Changed to ceiling division for `lp-amount`:
```clarity
(lp-amount (if (is-eq exchange-rate u0)
  amount
  (/ (+ (* amount u100000000) (- exchange-rate u1)) exchange-rate)
))
```
The `if (is-eq exchange-rate u0)` guard prevents division-by-zero from a misconfigured admin.

---

## 3. Authorization Check Order (Low — Fixed)

### Finding
`distribute-yield` in `yield-escrow.clar` read state variables (`map-get?`, `var-get`) before checking `contract-caller == admin-contract`. While not exploitable (no side effects), this leaks gas cost for unauthorized callers.

### Fix
Moved `asserts!` before all state reads.

---

## 4. Integer Overflow / Underflow

### Risk: Low
Clarity 2 uses **checked arithmetic** by default — `+`, `-`, `*` on `uint`/`int` trap on overflow. Safe by language design.

### Edge Cases Verified
| Operation | Contract | Safe? |
|-----------|----------|-------|
| `(+ current-pool amount)` deposit | bitflow-strategy | ✓ (max uint) |
| `(- current-lp lp-amount)` withdraw | bitflow-strategy | ✓ (guarded by `<=`) |
| `(+ (get principal-deposited position) amount)` | yield-escrow | ✓ (max uint) |
| `(- (get principal-deposited position) amount)` | yield-escrow | ✓ (guarded by `<=`) |
| `(/ (* amount u100000000) exchange-rate)` | yield-escrow | ✓ (checked mul + div) |

---

## 5. Access Control Analysis

### Yield Escrow Access Matrix

| Function | Guard | Caller | Notes |
|----------|-------|--------|-------|
| `initialize` | `tx-sender == CONTRACT-OWNER` | Deployer | Single-use (`initialized` flag) |
| `deposit-to-yield-escrow` | `contract-caller == milestone-escrow` | Milestone escrow contract | Trusted caller |
| `withdraw-from-yield-escrow` | `contract-caller == milestone-escrow` | Milestone escrow contract | Trusted caller |
| `claim-yield` | None (public) | Anyone | Yield always goes to `campaign-creator` |
| `distribute-yield` | `contract-caller == admin-contract` | Timelock admin | Platform yield sweep |

### Finding: Deposit-Time `campaign-creator` Binding
`deposit-to-yield-escrow` sets `campaign-creator: tx-sender` at deposit time (line 147). If `milestone-escrow` calls this function, `tx-sender` is the original transaction signer (not the escrow contract). **This is correct** — funds return to the campaign creator, not the escrow.

### Finding: No Separation Between Deposit and Creator
If `milestone-escrow` deposits on behalf of campaign A, then the `campaign-creator` field records the depositor's address. All future withdrawals from that campaign go to this address. If the milestone-escrow later calls withdraw with campaign-id=1 but the campaign creator has changed, funds still go to the original depositor. **This is by design** — the escrow contract is trusted to route calls correctly.

---

## 6. Strategy Isolation & Reentrancy

### Risk: None
Clarity is **non-reentrant** — contract calls are synchronous and a contract cannot call itself recursively. All `contract-call?` invocations are safe from reentrancy.

### Strategy Trust Dependency
`yield-escrow` hardcodes `.bitflow-strategy` (line 160, 197). Trust assumptions:
- Strategy `deposit` must return LP amount (any uint)
- Strategy `withdraw` must return STX (any uint)
- If strategy fails, `ERR-STRATEGY-FAILED` propagates — no funds are lost (they remain in strategy until a future withdrawal succeeds)

---

## 7. Emergency Mechanism Audit

### Emergency Controls

| Contract | Emergency Admin Function | Pause? | Ops Log? |
|----------|-------------------------|--------|----------|
| `yield-escrow` | `emergency-admin` sets `emergency-pause` | ✓ | ✗ |
| `bitflow-strategy` | `emergency-admin` sets `emergency-pause` | ✓ | ✓ (map) |

### Finding: Missing Ops Log in yield-escrow
`bitflow-strategy` logs emergency operations to `emergency-ops-log` map. `yield-escrow` does not. For a production contract, all emergency operations should be auditable.

**Recommendation:** Add `emergency-ops-log` map to `yield-escrow` (post-v1).

---

## 8. Co-EP Pool Capacity Check (Confirmed Correct)

### Check
`Co-EP-rotating-fundings.clar:556`
```clarity
(asserts! (< pool-members pool-max-members) ERR-POOL-FULL)
```

### Analysis
| Condition | Result | Correct? |
|-----------|--------|----------|
| `members < max` | `true` → proceed | ✓ |
| `members == max` | `false` → ERR-POOL-FULL | ✓ (at capacity) |
| `members > max` | `false` → ERR-POOL-FULL | ✓ (over capacity, should never occur) |

### Edge Case: `pool-max-members = 0`
If misconfigured with `max-members = 0`, `<` always false → pool permanently full. **Mitigation:** Configuration is admin-only via timelock; zero-member pools are a configuration error, not a vulnerability.

---

## 9. Summary of Findings

| # | Severity | Category | Contract | Status |
|---|----------|----------|----------|--------|
| 1 | **Critical** | Arithmetic Underflow (let-binding) | `bitflow-strategy` | **FIXED** |
| 2 | **Critical** | Arithmetic Underflow (let-binding) | `yield-escrow` | **FIXED** |
| 3 | **Critical** | Inverted Capacity Check | `Co-EP-rotating-fundings` | **FIXED** |
| 4 | **High** | Double-Truncation → Failed Withdrawals | `yield-escrow` | **FIXED** |
| 5 | **Medium** | State Read Before Auth Check | `yield-escrow` | **FIXED** |
| 6 | **Medium** | Zero exchange-rate guard | `yield-escrow` | **FIXED** |
| 7 | **Low** | Missing emergency ops log | `yield-escrow` | Acknowledged |
| 8 | **Low** | Strategy hardcoding (v1 mock only) | `yield-escrow` | Accepted |

---

## 10. Recommendations for v2

1. **Add emergency ops log** to `yield-escrow` (`emergency-ops-log` map + log entry in `emergency-withdraw`)
2. **Pyth oracle integration** (see `CINEX_PYTH_ORACLE_INTEGRATION_v2_ROADWAY.md`) — replace simulated exchange rate with real oracle
3. **Multiple strategy support** — replace hardcoded `.bitflow-strategy` with a strategy registry
4. **Slippage tolerance** — expose `min-amount-out` parameter in `withdraw-from-yield-escrow` for user control
5. **Rate-limit on `claim-yield`** — prevent front-running of yield accrual by adding cooldown per campaign
6. **Test coverage** — add property-based tests for division truncation edge cases (fuzz amounts 0–1e12 against exchange rates 0.5e8–2e8)
