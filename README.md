# CineX — Africa's Creative Economy Financing Infrastructure

CineX is the invisible financial rail that makes African creative work investable, verifiable, and bankable.

We connect Africa's creators — filmmakers, musicians, game developers, fashion designers, sports entertainers, and immersive media artists — with people who want to back them. Every transaction is secured by Bitcoin smart contracts on the Stacks blockchain, but you don't need to know any of that to use it.

## The Problem

Africa's creative economy is worth over $5 billion. But creatives can't access financing because there's no system to:
- Verify that a creative is who they say they are
- Release funds only when promised work is actually delivered
- Give backers confidence their money is safe

## The CineX Solution

**Milestone-based financing.** Funds are released in stages, not all at once. Each stage is verified before the next payment goes through. If the work isn't done, the money stays put. Backers get returns when projects succeed.

### What Makes CineX Different

- **No middlemen.** Creatives and backers deal directly. No bank, no platform taking huge cuts.
- **Money is safe.** Funds are locked in smart contracts on the Bitcoin network. No one — not even CineX — can touch them without meeting the agreed conditions.
- **Works in Naira and Dollars.** Backers can fund in USD. Creatives receive in NGN or USD. The conversion happens automatically.
- **For every creative sector.** Film, music, gaming, fashion, sports, XR/VR/AR — if you create it, CineX can finance it.

## How It Works (Simple Version)

1. A creative creates a campaign, sets milestones, and tells their story
2. Backers pledge money — funds are held securely
3. As the creative hits each milestone, backers vote to confirm
4. Verified milestones release the next tranche of funds
5. When the project completes, backers earn returns from the project's success

## Who Is This For?

| Role | What You Get |
|------|-------------|
| **Creatives** | Access to funding without collateral, bank accounts, or credit history. You prove yourself through your work. |
| **Backers** | Invest in African creativity with real accountability. Your money releases in stages, not upfront. |
| **Creative industries** | Film, music, gaming, fashion, sports entertainment, immersive media (XR/VR/AR), and every other form of creative work. |

## Quick Start (For Developers)

### Backend
```
cd backend
npm install
npm start
```

### Frontend
```
cd frontend-v2-legacy
npm install
npm run dev
```

### Smart Contracts
```
clarinet check
clarinet test
```

## Tech Stack (For The Curious)

| Layer | Technology | What It Does |
|-------|-----------|--------------|
| **Blockchain** | Stacks (Bitcoin L2) | Secures every financial transaction on Bitcoin |
| **Smart Contracts** | Clarity language | 9+ contracts handling funding, escrow, verification, yield |
| **Backend** | Node.js + SQLite | Wallet abstraction, rate service, user management |
| **Frontend** | React + TypeScript + Vite | User interface — never exposes blockchain complexity |
| **Wallet** | NGN / USD | Users see familiar currencies, not crypto |

## Project Status

**All 29 smart contracts deployed on Stacks testnet. Frontend live at https://cine-x-main.vercel.app**

**Completed:**
- 29 Clarity smart contracts across 9 layers fully developed, tested, and deployed
- Dual-currency wallet system (NGN + USD) backed by Bitcoin smart contracts
- Milestone verification system with backer voting
- Yield distribution (70% backers / 20% platform / 10% creator bonus)
- Funding pools for collaborative projects
- Emergency systems and admin controls
- 50 unit/integration tests pass
- Frontend deployed to Vercel (testnet)

**In Progress:**
- Backend deployment to Render (node.js + SQLite)
- Production mainnet launch

## Core Smart Contracts (Overview)

| Layer | Contracts | What It Does |
|-------|-----------|-------------|
| **Campaign** | `campaign-module` / `campaign-module-2` | Create campaigns, accept funds, manage milestones |
| **Milestone Escrow** | `milestone-escrow` | Hold funds securely and release in stages |
| **Milestone Verification** | `milestone-verification` / `milestone-verification-2` | Endorser-weighted verification to confirm milestones |
| **Yield Escrow** | `yield-escrow` | Generate and distribute returns (70/20/10 split) |
| **Funding Pool** | `funding-pool` | Pooled funding for collaborative projects |
| **Strategy** | `bitflow-strategy` / `mock-strategy` | DeFi yield strategy for deployed capital |
| **Admin** | `cinex-multisig` / `timelock` / `emergency-module` | 2-of-3 admin control + timelocked actions |
| **Oracle/Reputation** | `oracle-proxy` / `reputation` / `project-verification-module` | Verify creator identity and track reputation |
| **Module Base** | `module-base` / `module-base-trait` | Reusable module framework for all contracts |

## Learn More

- **[Frontend Guide](./frontend-v2-legacy/README.md)** — Setup and development
- **[Backend Guide](./BACKEND_README.md)** — API and database
- **[Wallet Abstraction Plan](./WALLET_ABSTRACTION_PLAN.md)** — How dual-currency works
- **[Deployment Workplan](./DEPLOYMENT_1DAY_WORKPLAN_SMARTCONTRACT_AND_FRONTEND.md)** — Path to testnet
- **[Deployment Config](./render.yaml)** — Render blueprint for backend

## Deployment

| Component | URL | Status |
|-----------|-----|--------|
| Frontend | https://cine-x-main.vercel.app | ✅ Live (testnet) |
| Backend | Render (set up via `render.yaml`) | 🔧 Configured, deploy via Render dashboard |
| Contracts | ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM | ✅ 29/29 deployed on testnet |

## Contributing

Contributions are welcome — especially from African developers, creatives, and anyone who wants to build financing infrastructure for the creative economy.
