# CineX

![Tests](https://img.shields.io/github/actions/workflow/status/OmenaiVIC/CineX/deploy.yml?label=CI%20tests)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

Open-source milestone-based project financing for Africa's creative economy, built on Stacks/Clarity.

CineX is an open-source project owned and maintained by **Victor Omenai**. This repository contains the current implementation / reference code.

---

## ⚠️ Project Status — Read First

CineX is a **prototype / reference implementation**. Please read the following so you can assess the project accurately:

- **Networks:** Smart contracts are deployed on the **Stacks testnet** (and exercised locally). The product is **not** in production on Stacks mainnet.
- **Demo / test mode:** The frontend ships a demo and mock-data mode (`VITE_USE_MOCK_DATA`, `VITE_DATA_MODE`) for exploration without real funds. Demo figures and simulated campaigns are **not** real adoption, users, revenue, or traction.
- **Audits:** Engineering review has been performed on the contracts. The project is **not independently audited** by a third party.
- **Bitcoin-native mechanisms (roadmap):** CineX is exploring whether milestone-based conditional settlement can be represented with **Bitcoin-native mechanisms** — DLCs, oracle-based milestone attestations, BTC/USD determination, and Lightning as an optional payout rail. This is a **planned research direction**, not yet implemented or funded, and is distinct from the Stacks/Clarity prototype in this repository. Nothing in this repo should be read as an implemented Bitcoin-native architecture.

This README intentionally distinguishes prototype / research / aspiration from shipped functionality.

---

## What CineX Does

CineX is building a financial pipeline for Africa's creative industry — filmmakers, musicians, game creators, and digital artists. Total project funding is split into **milestone steps**. Capital is held in escrow and only released as work is delivered and verified, which gives backers more confidence and gives creators a verifiable track record.

The reference workflow in this repository:

1. **Verify** — a creator registers their identity and project vertical on-chain.
2. **Create a campaign** — the creator defines milestones and a funding goal in the milestone-escrow contract.
3. **Backers fund escrow** — contributors fund the campaign; STX is held by the contract, not by the creator.
4. **Submit proof of work** — a creator completes a milestone and submits proof on-chain.
5. **Endorse & release** — a designated endorser (gatekeeper / backer representative) verifies the submission. On approval, the milestone amount is released from escrow to the creator.

Dual-currency wallet tooling (local currency and global currency) and a backend tracker (activity feed, exchange-rate management, credibility summaries) are part of the product architecture.

---

## Technical Status

- **Contracts:** **19 deployable logic contracts** (admin, oracle, reputation/verification, campaign, escrow, yield, strategy, milestone verification, funding pool, and base layers), with **13 trait/interface contracts** — **32 total** Clarity files in the Clarinet configuration.
- **Network:** deployed to Stacks **testnet**. See `deployments/artifacts/testnet/contract-addresses.json`.
- **Bridge Orchestration Service (BOS):** a backend orchestration service for milestone-based disbursement state transitions is included in this repository. A separately-published, standalone open-source BOS (`stacks-payout-bos`) is maintained for builders who want to reuse the state machine and adapter pattern on their own stacks.

### Tests

- **322 contract tests** across 14 test files.
- **235 backend tests** across 12 test files.
- **41 frontend tests** across 4 test files.
- CI runs `clarinet check` plus the contract, backend, and frontend test suites before every deploy.

---

## Adoption & Traction — What Is and Isn't Claimed

There is **no claimed live adoption, production deployment, or independently validated traction** in this repository. To be transparent:

- **Community discovery:** CineX has run informal discovery conversations with creative-industry community members (surveys and feedback sessions). These are **not** customers, paying users, or endorsements.
- **Any "$1M+ pipeline" figure** is a **conjecture/aspiration** based on those conversations, not a validated or committed figure.
- **Pilot projects** (e.g., Rain, Death of Eternity, PrePARE VR, Northern Travels) are **planned** works being explored for structured milestone financing. They are **not** active funded deployments.
- **PCICS** (Plateau Creative Industries Cooperative Society, Jos, Nigeria): CineX is in ongoing community engagement with PCICS, a creative-industry cooperative. The relationship reflects shared interest in creator financing and is in an **early formation stage**; CineX looks forward to formalizing collaboration as the platform moves toward launch.

---

## Funding & Partnerships (for the record)

- **Past, non-current:** CineX has received **non-dilutive grants from earlier programs**. These supported **previous work and cohorts** and are **not** funding for the current pivot.
- **Program affiliation:** Victor Omenai was an **inaugural cohort member of the Stacks Foundry Validate Program (May–June 2026)**, a completed cohort participation. This does not imply ongoing backing, endorsement, or funding.
- **Bitcoin-native research:** not funded and separate from the existing prototype. Any Bitcoin-native plan is research only and confers no funding, backing, or endorsement.
- **Vendors vs. partners:** Any external services referenced (e.g., Yellow Card, xReserve) are **service providers / technical dependencies**, not institutional partners or endorsers.

---

## Business Model (Proposed — Not Current Revenue)

The following are **planned / proposed** revenue streams that CineX aims to explore. They are **not current revenue**. Any implementation would be subject to the actual product, users, and regulatory environment:

- A proposed share of yield earned while capital sits in escrow.
- A proposed currency-exchange processing margin.
- A proposed project escrow fee on cleared milestones.
- Proposed institutional analytics reports and investor membership access.
- Proposed slippage / bonus redistribution mechanics.

---

## Security

- An **internal engineering security review** was performed on the Clarity contracts. Findings were addressed in the current test suite (see `SECURITY_AUDIT_PLAN.md`).
- The contracts are **not independently audited** by a third party.
- Because this is a prototype, treat all contracts as **experimental** — do not trust them with real funds on mainnet.

---

## How to Set Up and Test Locally

### Prerequisites

- **Clarinet** (the Stacks smart-contract simulator / tooling).
- **Node.js** and a local database configuration.

### 1. Download the project

```bash
git clone https://github.com/OmenaiVIC/CineX
cd CineX
npm install
```

### 2. Run the contract tests

```bash
clarinet check
npm test
```

### 3. Run the frontend in demo/mock mode

To evaluate the UI dashboard locally without connecting to real blockchain nodes or spending real gas, use the mock simulator:

```bash
VITE_USE_MOCK_DATA=true npm run dev
```

---

## Open Source

CineX is **free, open-source software** published under the **MIT License** (see [LICENSE](./LICENSE)).

Note: Open-source status is a statement about licensing and code availability. It **does not** mean the software is production-ready, secure, audited, or endorsed.

---

## Learn More

- **Live demo (deployed frontend):** https://cine-x-iota.vercel.app — a hosted demo of the presentation frontend. It runs in demo/mock mode and does **not** represent real usage, users, or traction (see the status section above).
- [Public Roadmap](./docs/ROADMAP.md) — current direction, architecture diagram, and backlog.
- [Security Policy](./SECURITY.md) — how to report a vulnerability.
- [Code of Conduct](./CODE_OF_CONDUCT.md) — community standards.
- [Backend & Smart Contract Architecture](./BACKEND_README.md) — module system, contract relationships, deployment.
- [Wallet Abstraction Plan](./WALLET_ABSTRACTION_PLAN.md) — how the dual-currency wallet abstraction works.

---

## License & Ownership

- Copyright (c) 2026 Victor Omenai
- Licensed under the [MIT License](./LICENSE).

_Disclaimer: This repository and documentation are for informational, educational, and research purposes only and do not constitute an offer, investment solicitation, or financial advice._
