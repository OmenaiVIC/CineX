# CineX Deployment Guide

## Prerequisites

| Tool | Version | Purpose |
|------|---------|---------|
| Node.js | 20+ | Frontend build + backend runtime |
| npm | 10+ | Package management |
| Clarinet | 2.8+ | Smart contract deployment |
| Git | 2.x | Version control |

## Architecture & Deployment Targets

```
┌─────────────────────────┐    ┌──────────────────────────────┐
│   Vercel / Netlify      │    │   Railway / Render            │
│   frontend-v2-legacy/   │    │   backend/                    │
│   https://cinex.ng      │    │   https://api.cinex.ng        │
│   SPA (catch-all)       │    │   Express + SQLite            │
└──────────┬──────────────┘    └───────────────┬──────────────┘
           │                                    │
           │   ┌──────────────────────────────┐ │
           └───┤   Stacks Blockchain          ├─┘
               │   testnet / mainnet          │
               │   Clarity smart contracts    │
               └──────────────────────────────┘
```

## Smart Contract Deployment Order

Contracts depend on each other via traits. Deploy in this order:

### Layer 1: Base / Libraries
```
1. base-module          → Shared constants, error codes
2. admin-module         → Platform admin roles + pausability
```

### Layer 2: Oracle + Reputation + Verification
```
3. oracle-module        → Price feed interface
4. reputation-module    → Agent/filmmaker reputation
5. project-verification → Filmmaker identity verification
```

### Layer 3: Campaign
```
6. campaign-module      → Crowdfunding lifecycle (renamed from crowdfunding-module)
```

### Layer 4: Escrow
```
7. milestone-escrow     → Milestone-based STX deposit & release
8. yield-escrow         → Yield generation from escrowed funds
9. escrow-module        → Base escrow functionality
```

### Layer 5: Milestone Verification
```
10. milestone-verification → Endorser sign-off on milestones
```

### Layer 6: Strategy
```
11. bitflow-strategy    → AMM liquidity provision
```

### Layer 7: Funding Pool
```
12. funding-pool        → Pooled funding rounds
```

### Layer 8: Co-EP (Rotating Funding)
```
13. Co-EP-rotating-fundings → Rotating pool mechanics
```

### Layer 9: Main Hub
```
14. CineX-project       → Project registry + main hub
```

### Deploy Command
```bash
# Deploy all contracts to testnet
clarinet deploy --testnet

# Deploy a single contract
clarinet contract deploy <contract-name> --testnet
```

### Verify Deployment
```bash
clarinet check          # No warnings
clarinet requirements   # Verify dependencies resolve
```

## Frontend Build & Deploy

### 1. Configure Environment

```bash
cd frontend-v2-legacy

# For production deployment
cp .env.production .env
# Edit .env with deployed contract addresses and API URLs
```

### 2. Build

```bash
npm ci                 # Clean install (respects lockfile)
npm run build          # Outputs to dist/
```

### 3. Deploy to Vercel

**Option A: Vercel CLI**
```bash
npm i -g vercel
vercel --prod
```

**Option B: Git-based (recommended)**
1. Push to GitHub `main` branch
2. Connect repo in Vercel dashboard
3. Set root directory: `frontend-v2-legacy`
4. Build command: `npm run build`
5. Output directory: `dist`
6. Add environment variables from `.env.production`

### 4. Deploy to Netlify (Alternative)

1. Connect repo in Netlify dashboard
2. Base directory: `frontend-v2-legacy`
3. Build command: `npm run build`
4. Publish directory: `dist`
5. Add SPA redirect rule:
   ```
   /*    /index.html   200
   ```

## Backend Deploy (Railway / Render)

### 1. Prepare

```bash
cd backend
npm ci
```

### 2. Deploy to Railway

```bash
railway up
```
Or connect the `backend/` directory via Railway dashboard:
- Start command: `node --experimental-sqlite src/index.js`
- Expose port: `3001`

### 3. Deploy to Render

- Type: Web Service
- Build command: `npm ci`
- Start command: `node --experimental-sqlite src/index.js`
- Health check path: `/health`

## Environment Variables

### Frontend (`frontend-v2-legacy/.env`)

| Variable | Dev | Staging | Production |
|----------|-----|---------|------------|
| `VITE_NETWORK` | `testnet` | `testnet` | `mainnet` |
| `VITE_STACKS_API_URL` | `https://api.testnet.hiro.so` | `https://api.testnet.hiro.so` | `https://api.mainnet.hiro.so` |
| `VITE_BACKEND_URL` | `http://localhost:3003` | `https://api.staging.cinex.ng` | `https://api.cinex.ng` |
| `VITE_USE_MOCK_DATA` | `true` | `false` | `false` |
| `VITE_DEMO_MODE` | `false` | `false` | `false` |

Contract address vars must be filled at deploy time after `clarinet deploy`:
- `VITE_CROWDFUNDING_CONTRACT_ADDRESS`
- `VITE_MILESTONE_ESCROW_CONTRACT_ADDRESS`
- `VITE_MILESTONE_VERIFICATION_CONTRACT_ADDRESS`
- (and all others listed in `.env.production`)

### Backend (`backend/`)

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3001` | HTTP server port |
| `NODE_ENV` | `development` | Environment mode |

## Verifying a Deployment

```bash
# Frontend
curl https://cinex.ng/health

# Backend
curl https://api.cinex.ng/health
# Expected: {"status":"ok","timestamp":...}

# Wallet API smoke test
curl https://api.cinex.ng/api/wallets/rates/all
# Expected: {"ngnUsd":{...},"usdBtc":{...},"spread":0.0075}
```

## Rollback

```bash
# Frontend (Vercel)
vercel rollback

# Backend (Railway)
railway rollback

# Smart contracts
clarinet deploy --testnet --reinstall
```
