# CineX — Fintech Infrastructure for African Creative IP

**Milestone-based financing on Bitcoin. $600K pre-seed at $5M post-money.**

CineX is a full-stack Web3 platform that connects African filmmakers with global capital through Stacks smart contracts. The platform manages the full lifecycle of creative financing: campaign creation, milestone-based escrow, verification, yield strategies, and dual-currency (NGN+USD) wallet operations.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend (Vite + React)                │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────────┐  │
│  │ Campaign │ │ Wallet   │ │ Dashboard│ │ Creator    │  │
│  │ Pages    │ │ UI       │ │ Views    │ │ Profiles   │  │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └──────┬─────┘  │
│       │             │            │               │        │
│  ┌────▼─────────────▼────────────▼───────────────▼─────┐  │
│  │           Service Layer (Wallet UI + API Client)     │  │
│  └─────────────────────┬───────────────────────────────┘  │
├────────────────────────┼──────────────────────────────────┤
│              Backend (Express + SQLite)                    │
│  ┌──────────┐ ┌────────┐ ┌────────┐ ┌────────────────┐   │
│  │ Wallets  │ │ Rates  │ │ Users  │ │ Content (Feed) │   │
│  │ API      │ │ (FX)   │ │ API    │ │ API            │   │
│  └──────────┘ └────────┘ └────────┘ └────────────────┘   │
├────────────────────────┼──────────────────────────────────┤
│           Stacks Blockchain (Clarity Smart Contracts)     │
│  27 contracts across 9 layers: Admin, Oracle/Reputation,  │
│  Campaign, Escrow, Yield, Strategy, Milestone, Pool, Base │
└──────────────────────────────────────────────────────────┘
```

## Design System

| Token | Value | Usage |
|-------|-------|-------|
| `--color-green` | `#4ade80` | Primary accent, buttons, links |
| `--color-neon` | `#00e5ff` | Secondary accent, highlights |
| `--color-warm` | `#f59e0b` | Tertiary, warnings, topbar |
| `--color-body-bg` | `#050505` | Page background |
| `--color-card-bg` | `#0a0a0a` | Card surfaces |
| `--glass-bg` | `rgba(255,255,255,0.03)` | Glassmorphism panels |
| Font | Inter (400/500/600/700/800) | Body + headings |

## Smart Contracts

The platform uses **27 contracts** organized across 9 layers. Key contracts:

| Layer | Contract | Purpose |
|-------|----------|---------|
| Campaign | `campaign-module` | Crowdfunding lifecycle (create, contribute, claim) |
| Escrow | `milestone-escrow` | Milestone-based STX release |
| Verification | `milestone-verification` | Endorser sign-off on milestones |
| Yield | `yield-escrow` | Yield generation from escrowed funds |
| Strategy | `bitflow-strategy` | AMM liquidity provision strategy |
| Pool | `funding-pool` | Pooled funding rounds |
| Base | `base-module` | Shared constants and utilities |
| Oracle | `oracle-module` | Price feed integration |
| Admin | `admin-module` | Platform governance |

See `docs/INTEGRATION_SUMMARY.md` for the full contract-to-frontend mapping.

## Getting Started

```bash
# Prerequisites: Node 20+, Clarinet 2.8+

# Clone and install dependencies
git clone <repo-url>
cd frontend-v2-legacy
npm install

# Start development
npm run dev          # Frontend at http://localhost:5173

# In a separate terminal, start the backend
cd backend
npm install
node --experimental-sqlite src/index.js  # API at http://localhost:3003

# Build for production
npm run build        # Output in dist/
npm run preview      # Preview production build
```

## Environment Variables

Copy `.env` to `.env.production` for deployment builds. Key vars:

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_NETWORK` | `testnet` | Stacks network (testnet/mainnet) |
| `VITE_STACKS_API_URL` | `https://api.testnet.hiro.so` | Stacks node API |
| `VITE_BACKEND_URL` | `http://localhost:3003` | Off-chain backend API |
| `VITE_USE_MOCK_DATA` | `true` | Use mock data (false in prod) |
| `VITE_DEMO_MODE` | `false` | Demo mode features |

## Testing

```bash
# Backend (Clarity contracts)
clarinet check
npx vitest run                       # All contract tests
node scripts/run-rv-for-all.js       # Rendezvous fuzzing

# Frontend (Vitest)
npm test
```
