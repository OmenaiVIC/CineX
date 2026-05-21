# CineX Pyth Oracle Integration — v2 Roadmap

> **Audience:** Senior management, investors, technical partners
> **Status:** Planned (post 2-week sprint)
> **Related docs:**
>   - [`SMART_CONTRACT_IMPLEMENTATION_PLAN_2WEEKS.md`](SMART_CONTRACT_IMPLEMENTATION_PLAN_2WEEKS.md) — §2.1 Task 2.1 (oracle-proxy design), §3.1 (v1 risk analysis)
>   - [`FRONTEND_AI_IMPLEMENTATION_PLAN_2WEEKS.md`](FRONTEND_AI_IMPLEMENTATION_PLAN_2WEEKS.md) — §8 Post-Sprint: Pyth/Hermes Frontend Integration

---

## 1. Executive Summary

The CineX protocol's STX price feed (used for USD-pegged verification fees) is currently served by a **multi-sig push oracle** — the 2-of-3 governance council pushes price updates on-chain. This is the right model for v1 (launch speed, no external dependency, no liquidation risk). For v2, we upgrade to **Pyth Network**, a pull-based oracle maintained by Stacks Labs, to decentralise the price source while preserving the circuit-breaker emergency override.

The proxy pattern was designed for this upgrade: no consumer contract needs to change.

---

## 2. Current State: v1 Multi-Sig Oracle

### 2.1 What Exists

| Component | Detail |
|-----------|--------|
| Contract | `oracle-proxy.clar` (148 lines) |
| Trait | `oracle-proxy-trait.clar` — `get-stx-price`, `get-stx-price-with-fallback` |
| Price source | Multi-sig signers push via `update-price` (timelock path) or `emergency-set-price` (emergency path) |
| Staleness guard | `STALE-THRESHOLD = 144` blocks (~24h) |
| Upgrade point | `set-price-oracle(oracle-addr)` — exists, doc-commented as placeholder, currently no-op |

See `SMART_CONTRACT_IMPLEMENTATION_PLAN_2WEEKS.md` §2.1 Task 2.1 for the implementation details and §3.1 for risk analysis.

### 2.2 Why Multi-Sig Was the Right Call for v1

1. **No liquidation risk.** CineX is a milestone-based financing platform, not a lending protocol. Stale or manipulated prices cause fee miscalculation, not cascading liquidations. The timelock (24h delay on large price changes) is sufficient defence.

2. **External oracle overhead is unjustified in v1.** Pyth's pull model requires every transaction needing a fresh price to first fetch a VAA (Verified Action Approval) from the Hermes API, then submit it as an 8192-byte buffer on-chain — costing ~1 µSTX per `verify-and-update-price-feeds` call. DIA is simpler but still introduces an external dependency with its own upgrade schedule.

3. **Leverages existing governance.** CineX already deploys a 2-of-3 multi-sig for all admin operations. Using it as the price authority reuses infrastructure we already trust and audit.

4. **Proxy pattern isolates consumers.** The trait interface (`get-stx-price`, `get-stx-price-with-fallback`) means no contract that reads the price ever needs to know whether the source is multi-sig, Pyth, or DIA. The upgrade is invisible to consumers.

---

## 3. Target State: v2 Pyth Integration

### 3.1 Why Pyth Over DIA

| Factor | Pyth | DIA |
|--------|------|-----|
| Model | Pull (VAA submitted per tx) | Push (price always on-chain) |
| STX/USD feed | ✅ `0xec7a775f...5c17` | ✅ `"STX/USD"` |
| Maintenance | Stacks Labs (first-party) | DIA (third-party) |
| Freshness | Sub-second via Wormhole | Depends on DIA push frequency |
| On-chain cost | ~1 µSTX per `verify-and-update` | Zero |
| Frontend effort | HermesClient SDK | None |

Pyth is preferred because Stacks Labs maintains the bridge directly — it tracks the Stacks network's upgrade cycle. DIA, while simpler, introduces a third-party dependency with different governance.

### 3.2 Contract Architecture Changes

```
v1 (current):                              v2 (target):

Multi-sig ──push──► oracle-proxy           Pyth Hermes ──VAA──► oracle-proxy
                      │                                              │
                      │ get-stx-price                                │ get-stx-price
                      ▼                                              ▼
                 milestone-escrow                               milestone-escrow
                 (no change)                                    (no change)
```

**Changes to `oracle-proxy.clar`:**
- Implement `set-price-oracle` to store a Pyth oracle contract address
- Add public function `update-from-pyth(vaa-bytes (buff 8192))` that:
  1. Calls `pyth-oracle-v4::verify-and-update-price-feeds` with the VAA
  2. Calls `pyth-oracle-v4::get-price` with the STX/USD feed ID
  3. Stores the result in `price` and sets `last-updated = block-height`
- Add `[[project.requirements]]` for Pyth contracts in `Clarinet.toml`

**Preserved from v1:**
- `emergency-set-price` — multi-sig can override a corrupted Pyth feed immediately (circuit breaker)
- `get-stx-price` / `get-stx-price-with-fallback` — unchanged trait, zero consumer changes
- Staleness threshold (144 blocks) — unchanged

### 3.3 Frontend Architecture Changes

**New: `src/services/pythService.ts`**
- Wraps `@pythnetwork/hermes-client` to fetch latest VAA for STX/USD feed
- Method: `fetchVaa(): Promise<{ vaaHex: string, price: number }>`
- When `VITE_USE_MOCK_DATA=true`, returns a canned VAA hex string (pre-encoded mock price)

**Modified: `src/hooks/useTransaction.ts`**
- Accepts optional VAA bytes parameter
- When present, calls `oracle-proxy::update-from-pyth` before the transaction that needs the price

**Dependency:** `npm install @pythnetwork/hermes-client`

See `FRONTEND_AI_IMPLEMENTATION_PLAN_2WEEKS.md` §8 for the detailed implementation plan.

---

## 4. Timeline & Resourcing

| Phase | Work | Estimated Effort | Dependencies |
|-------|------|------------------|-------------|
| v1 Launch | Multi-sig oracle (current) | ✅ Complete | — |
| v2 Contract | Implement `update-from-pyth` + tests | 6h (dev) + 3h (tests) | 2-week sprint complete, Pyth mainnet contracts confirmed |
| v2 Frontend | `pythService.ts` + `usePythPrice.ts` + Hermes integration | 8h (dev) + 3h (tests) | v2 contract deployed to testnet |
| v2 Integration | End-to-end test: Hermes → VAA → contract → price read | 4h | Both v2 contract and frontend complete |
| **Total** | | **24h** | |

### Blockers

- Pyth STX/USD feed must be confirmed available on mainnet (currently live: `0xec7a...5c17`)
- `pyth-oracle-v4` contract address must be verified for the deploy epoch used by CineX contracts
- HermesClient rate limits (free tier: 5 req/s) — sufficient for CineX v2 volume

---

## 5. Risk & Decision Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-05-19 | v1: multi-sig push oracle | Launch speed, no external dependency, no liquidation risk |
| 2026-05-19 | v2: Pyth over DIA | First-party Stacks Labs bridge, sub-second freshness via Wormhole |
| 2026-05-19 | Proxy pattern with circuit breaker | `set-price-oracle` placeholder + `emergency-set-price` preserve upgrade path and safety |
| TBD | v2 contract work begins | Post 2-week sprint, after core contracts reach testnet |

---

*End of roadmap.*
