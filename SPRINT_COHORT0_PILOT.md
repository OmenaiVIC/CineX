# Sprint: Cohort 0 Pilot — Backend Wallet Agent + Demo

## Goal
Ship a testnet-only live demo with 4 pilot projects (Rain, Death of Eternity, PrePARE VR, Northern Travels) that runs real on-chain transactions while keeping blockchain invisible to end users.

## Architecture

```
User clicks [Fund] in demo.html
        │
        ▼
  POST /api/demo/contribute  ← Express route
        │
        ▼
  contractService.js
    ├─ Pick correct key (wallet[1]=creator, wallet[3]=backer)
    ├─ Build Clarity call via @stacks/transactions
    ├─ Sign + broadcast to testnet
    └─ Return { tx_hash, explorer_url, status: "broadcast" }
        │
        ▼
  demo.html polls GET /api/demo/status/:tx_hash
        │
        ▼
  ✅ confirmed with explorer link
```

## Contract Addresses (Testnet)

All at deployer `ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM`:

| Contract | Address |
|----------|---------|
| campaign-module-2 | ..campaign-module-2 |
| milestone-escrow | ..milestone-escrow |
| milestone-escrow-trait | ..milestone-escrow-trait |
| project-verification-module | ..project-verification-module |
| oracle-proxy | ..oracle-proxy |

## Key Management

`TESTNET_MNEMONIC` env var (from `settings/Testnet.toml`). Derived at startup:

```
wallet[0] = deployer  → ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM  (not used by demo)
wallet[1] = creator   → ST1NX...  (create-campaign, submit-milestone-proof)
wallet[3] = backer    → ST1PJ...  (contribute-to-campaign, approve-milestone, release)
```

## API Routes (all under `/api/demo/`)

### `GET /api/demo/campaigns`
Returns the 4 pilot campaigns with state from chain:

```json
[
  {
    "id": 1,
    "title": "Rain",
    "goal": 200000000,
    "raised": 0,
    "milestones": [
      { "index": 0, "name": "Pre-production", "amount": 50000000, "approved": false, "released": false },
      { "index": 1, "name": "Production", "amount": 50000000, "approved": false, "released": false },
      { "index": 2, "name": "Post-production", "amount": 100000000, "approved": false, "released": false }
    ],
    "status": "funding"
  }
]
```

### `POST /api/demo/contribute`
Body: `{ campaignId, amountUstx }`  
Returns: `{ status: "broadcast", tx_hash, explorer_url }`

### `POST /api/demo/submit-proof`
Body: `{ campaignId, milestoneIndex }`  
Returns: `{ status: "broadcast", tx_hash, explorer_url }`

### `POST /api/demo/approve`
Body: `{ campaignId, milestoneIndex }`  
Returns: `{ status: "broadcast", tx_hash, explorer_url }`

### `POST /api/demo/release`
Body: `{ campaignId, milestoneIndex }`  
Returns: `{ status: "broadcast", tx_hash, explorer_url }`

### `GET /api/demo/status/:txHash`
Returns: `{ status: "pending" | "confirmed" | "failed", tx_hash, block_height?, explorer_url, error? }`

## Campaign Creation Script

Run once: `npx tsx scripts/create-demo-campaigns.ts`

Creates 4 campaigns across both contracts. Uses the testnet mnemonic to derive keys. Skips if campaigns already exist (idempotent).

## Demo Flow

1. Visitor opens demo.html → `GET /api/demo/campaigns` → 4 cards render
2. Admin clicks **Fund** → `POST /api/demo/contribute` → polls status → ✅
3. Admin clicks **Submit Proof M1** → `POST /api/demo/submit-proof` → ✅
4. Admin clicks **Approve M1** → `POST /api/demo/approve` → ✅
5. Admin clicks **Release M1** → `POST /api/demo/release` → ✅ funds released
6. Repeat for M2, M3

## Cold Start Mitigation

Cron-job.org pings `https://cinex-backend-zo1r.onrender.com/health` every 5 minutes. Also: backend exposes `GET /warmup` that pre-fetches campaign state on startup.

## Deployment Checklist

- [ ] Add `TESTNET_MNEMONIC` env var to Render dashboard
- [ ] Deploy backend to Render
- [ ] Run `npx tsx scripts/create-demo-campaigns.ts` locally
- [ ] Hit `/health` manually before demo starts
- [ ] Verify `GET /api/demo/campaigns` returns 4 campaigns
- [ ] Deploy `demo.html` to Vercel (add to frontend/)
- [ ] Full dry run: Fund → Submit Proof → Approve → Release

## Files Changed/Created

| File | Action |
|------|--------|
| `backend/package.json` | Add `@stacks/transactions`, `@stacks/network-v6`, `@stacks/wallet-sdk` |
| `backend/src/services/contractService.js` | Create — key derivation, tx building, status polling |
| `backend/src/routes/demo.js` | Create — 6 demo API endpoints |
| `backend/src/index.js` | Update — register demo router + warmup |
| `scripts/create-demo-campaigns.ts` | Create — one-time campaign creation |
| `frontend/demo.html` | Create — demo UI with 4 project cards |

## Edge Cases

| Issue | Mitigation |
|-------|------------|
| Nonce conflicts | Separate keys per role (creator ≠ backer) |
| Testnet STX faucet limits | Pre-fund backer with ~500 STX from deployer |
| Campaign ID mismatch | Script creates escrow first with fixed ID, then CM with dummy advancement |
| Oracle price needed | Set via `emergency-set-price(250)` before any escrow ops |
| Double-click fund | Contract rejects duplicate; API returns descriptive error |
| Render cold start | Cron-job.org + manual warmup before demo |
| Tx never confirms | Status endpoint polls Hiro API; returns timeout after 2 min |
