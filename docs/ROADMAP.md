# CineX Roadmap

CineX is an open-source, milestone-based project financing platform for Africa's creative economy (film, music, games, digital art), built on Stacks/Clarity.

This roadmap reflects **current direction**. CineX is a **prototype / reference implementation** — see the [README status section](../README.md#-project-status--read-first) for what is shipped versus aspirational.

---

## Current State (Shipped)

- **32 Clarity contracts** (19 deployable logic + 13 trait/interface), deployed and exercised on the **Stacks testnet** and local simnet.
- **Milestone escrow** workflow: verify creator → create campaign → backers fund escrow → submit proof → endorse & release.
- **Bridge Orchestration Service (BOS)**: backend state-machine for milestone-based disbursement transitions (burn → attestation → destination release → payout).
- **Backend**: 235+ tests, Neon PostgreSQL, activity feed indexer, on-chain-bridge proxy pattern, AI credibility summaries, relay/fee-sponsorship stack.
- **Frontend**: `app` (demo/mock mode + live-mode wiring) and `cinex-canvas` (presentation frontend).
- **Wallet tooling**: dual-currency (local + global) abstraction, STX/USDCx handling, passkey/relay on-chain signing.

---

## Architecture (reference)

```mermaid
flowchart LR
  subgraph Frontend
    A[app / cinex-canvas]
  end
  subgraph Backend
    B[Express API]
    C[BOS pipeline worker]
    D[Activity-feed indexer]
    E[Relay / fee sponsorship]
  end
  subgraph Chain
    F[Stacks testnet<br/>milestone-escrow, campaign-module,<br/>milestone-verification, funding-pool,<br/>reputation, project-verification, oracle-proxy]
  end
  subgraph External
    G[Hiro API]
    H[xReserve (attestation)]
    I[Yellow Card (payout)]
  end
  A --> B
  B --> C
  B --> E
  D --> G
  G --> F
  C --> H
  C --> I
  C --> F
  B --> F
```

---

## Direction & Backlog

The following are **planned research / development directions**. They are not yet implemented or funded.

### Near term
- **Coinless / first-use onboarding** — continue hardening the relay + passkey fee-sponsorship path so new users can onboard and transact without pre-funding gas.
- **Audit readiness** — pursue an **independent third-party security audit** of the Clarity contracts before any mainnet use.
- **Product consolidation** — converge the two frontend shells (`app` and `cinex-canvas`) into one canonical product surface.

### Research (explicitly not yet implemented)
- **Bitcoin-native milestone settlement** — DLCs, oracle-based milestone attestations, BTC/USD determination, and Lightning as an optional payout rail. This is a **planned research direction**, distinct from the shipped Stacks/Clarity prototype.

### Community / growth
- **Formalize community engagement** (e.g., PCICS cooperative relationship) as the platform moves toward launch.
- **Public testnet pilot programs** with documented creators once the contracts are audit-ready.

---

## Principles

- **Truthful status**: shipped ≠ aspiration. The repo always distinguishes the prototype/research from real adoption, usage, or revenue.
- **Open source by default**: MIT-licensed; a standalone BOS (`stacks-payout-bos`) is maintained for reuse.
- **Not ready for mainnet funds**: contracts are experimental until independently audited.
