# CineX Milestone-Based Financing Platform – Product Requirements Document (PRD)

## 1\. Executive Summary

CineX is a Bitcoin-secured, milestone-based financing platform purpose-built for Africa's creative economy. By leveraging Stacks (Bitcoin Layer 2), native USDCx stablecoin, and passkey-based wallets, CineX enables creatives to raise, receive, and manage funds transparently through verifiable project milestones. The platform aims to solve the critical “missing middle” financing gap, enabling creative entrepreneurs to access cross-border, stablecoin-settled capital while delivering accountability for funders. This PRD is aligned with deliverables for the pending Stacks Endowment grant, UK Creative Fund, Interledger Open Payments Accelerator, covering core releases and future integrations.

---

## 2\. Problem Statement

* African creatives face a $100k–$500k “missing middle” financing gap; local banks reject 95%+ of creative loan applications due to inability to collateralize IP and lack of verifiable, progressive disbursement systems.
* Informal funding is typically lump-sum, opaque, and misaligned with creative production workflows, fueling inefficiency and mistrust between creators and investors.
* No existing platform delivers milestone-based, stablecoin-settled, cross-border creative financing with on-chain transparency, especially within the Stacks (Bitcoin L2) ecosystem.

---

## 3\. Target Audience & User Personas

### Primary: Creative

* Nigerian filmmaker, musician, game developer, or fashion designer.
* Non-crypto-native, new to digital assets and wallets.
* Needs transparent, staged funding release and simple onboarding.

### Secondary: Backer/Investor

* Individual, institutional investor, or philanthropic capital provider.
* Needs escrow visibility, milestone accountability, and optional yield on idle funds.

### Tertiary: Gatekeeper

* Guild leader, cooperative head (e.g., PCICS).
* Vets/endorses projects and milestones, onboards cohorts, manages community reputation.

---

## 4\. User Stories & Acceptance Criteria

### Creative

1. As a creative, I want to create a profile and define a project with milestones so I can attract funding.
  * **Acceptance:** Profile and campaign forms must collect required fields for onboarding and campaign/milestone specification. User can save, edit, and submit for review.
2. As a creative, I want to receive funds in stages as I complete each milestone so I do not mismanage lump sums.
  * **Acceptance:** Funds can only be withdrawn after milestone completion is verified by a gatekeeper.

### Backer

3. As a backer, I want to deposit USDCx into escrow and view real-time milestone progress so I know my funds are being used appropriately.
  * **Acceptance:** UI must display escrow balances and milestone status for each campaign. Backers can approve or reject milestones after reviewing proof of work.
4. As a backer, I want my idle escrow capital to earn yield so my money doesn't lose value while waiting.
  * **Acceptance:** Idle escrow funds can be optionally staked or lent (placeholder for v1; treasury management APIs or DeFi integration required in roadmap).

### Gatekeeper

5. As a gatekeeper, I want to vouch for creatives by adding endorsement letters about their profile and portfolio so my community members can build reputation and attract funding.
  1. **Acceptance:** Gatekeepers, who are creatives themselves, can submit endorsement letters (name, letter, URL) for registered creatives. These endorsements are stored on-chain and contribute to the creative's reputation score.

### Non-crypto User access funding.

6. As a non-crypto user, I want to log in with a passkey (no seed phrase) so I do not need to understand crypto wallets.
  * **Acceptance:** Users can create and access accounts using Pillar Wallet with WebAuthn/passkey login.

---

## 5\. Functional Requirements (by Epic)

### Epic 1: Mainnet Deployment (P0 – Foundation)

* Deploy `milestone-escrow.clar` and `project-verification-module.clar` to Stacks mainnet.
* Run Zero Authority bug bounty for open review and fixes.
* Update platform demo to use mainnet contract endpoints.
* **Success Criteria:** 2 core Clarity contracts live on mainnet, public verification via Stacks Explorer.

### Epic 2: Passkey Wallet (P0 – Foundation)

* Integrate Pillar Wallet for seedless, passkey-based login (WebAuthn standard).
* Enable creatives to create platform accounts and access basic wallet features (deposit, withdraw, sign transactions) with no seed phrase.
* Support USDCx deposits (stablecoin on Stacks) and NGN withdrawals via Yellow Card/Bitmama integration. CineX can call it to convert USDCx (on Stacks) to NGN and send it to a creator's bank account or mobile money.
* **Success Criteria:** Wallet demo video, 5 PCICS creatives complete onboarding and profile creation.

### Epic 3: Dual-Currency Wallet UI (P1 – Pilot Onboarding)

* Build mobile-first wallet dashboard (NGN/USDCx balance, on-ramp interface).
* Allow campaign creation, milestone tracking, and escrow status display.
* Show all relevant information concisely for non-technical users.
* **Success Criteria:** Wallet UI live (testnet), 2 campaigns created by pilot users.

### Epic 4: Pilot Projects (P1 – Community Validation)

* Onboard 2 pilot projects (Death of Eternity & Rain).
* Fund pre-production (storyboards, outlines, concept art) up to ₦600,000 each.
* Track milestone completion on-chain; release funds to creatives after CineX admin verification of milestone deliverables
* **Success Criteria:** Pre-production assets uploaded, milestones marked complete, funding released on mainnet.

### Epic 5: Gatekeeper Workshop (P1 – Community Validation)

* Organize physical/virtual onboarding workshop for 10+ PCICS creatives (Jos).
* Support campaign/profile creation walkthrough; distribute micro-incentives to 3 additional participating creatives.
* Publish workshop report and onboarding summary.
* **Success Criteria:** 10+ creatives onboarded with accounts/profiles, workshop materials shared.

### Epic 6: Interledger Protocol Open Payments Integration (P2 – Grant Dependent)

* Integrate Interledger Open Payments protocol standards for cross-border funding (USDCx → NGN).
* Allow international backers to send USDCx funds to Nigerian creatives’ campaigns at near-zero cost, regardless of which network or currency the backer uses.
* **Success Criteria:** ILP/Open Payments payout demo (testnet/prototype) and documentation.

**In CineX:** ILP is the **international "nerve system"** – it enables a global backer to send USDC to a Nigerian creator, regardless of which network or currency the backer uses.

Yellow Card is the **"last mile" delivery** – it takes the USDC that arrived via ILP and delivers NGN to the creator's wallet.

### Epic 7: Open-Source Documentation (P2 – Scale)

* Publish technical/usage documentation in GitHub wiki under Apache 2.0.
* **Success Criteria:** GitHub wiki live and discoverable, updated as new features launch.

---

## 6\. Non-Functional Requirements

* **Security:** Smart contracts fully tested, open community bug bounty (Zero Authority), external light audit.
* **Performance:** Mobile wallet UI loads in <3 seconds; contract interactions complete <5 seconds.
* **Scalability:** 100 projects/campaigns at launch, architected for 1,000+ over 12–24 months.
* **Usability:** First-time non-crypto users can onboard/start a campaign within 5 minutes.
* **Availability:** 99.9% uptime for mainnet contracts.
* **Compliance:** KYB/KYC processes for institutional backers (in-app or via partner integrations).

---

## 7\. Technical Architecture

| Layer | Component |
| --- | --- |
| Blockchain | Stacks mainnet, Clarity contracts (immutable) |
| Frontend | React + TypeScript + Vite (Vercel hosting) |
| Backend | Node.js + PostgreSQL (Render/Supabase) |
| Wallet | Pillar Wallet (WebAuthn/passkey), Leather/Xverse |
| On-Ramp/Off-Ramp | Yellow Card or Bitmama, third-party fiat integrators |
| Payments | USDCx on Stacks, sBTC, (future: ILP/Open Payments) |
| Monitoring | Stacks Explorer, Vercel Analytics |

Architectural highlights:

* Smart contracts are immutable after mainnet deployment (no custodial risk).
* Frontend is mobile-first with minimal cognitive load, designed for rural and urban users.
* Core wallet achieves seedless login (Pillar) and is extendable via Web3 providers for advanced capital sources.
* On/Off-ramp integrations abstract Web3/crypto complexity.
* Monitoring via explorer and analytics; open-source docs ensure replicability.

---

## 8\. Milestones & Timeline (Stacks Endowment, 12 Weeks)

| Phase | Weeks | Deliverables/Sprints | Success Criteria |
| --- | --- | --- | --- |
| Foundation | 1–4 | Mainnet deployment, passkey wallet demo, team ops | Core contracts verified; wallet video |
| Pilot Onboarding | 5–8 | Wallet UI, 5+ profiles, 2 pilot campaigns onboarded | Wallet UI live, pilot campaigns |
| Community Validation | 9–12 | Pilot milestones delivered, gatekeeper workshop, docs | Milestones complete, docs, 10 onboard |

> **Stacks Endowment Milestone Payouts:**
>
> * M1 (Weeks 1–4): 20%
> * M2 (Weeks 5–8): 30%
> * M3 (Weeks 9–12): 50%

For ILP/Open Payments and UK Creative Fund deliverables, placeholder sprints will be detailed after grant confirmation, focused on standards integration and mid-career placement programs.

---

## 9\. Success Metrics

* 2 pilot campaigns executed on mainnet, with verifiable pre-production deliverables.
* At least 10 creative profiles/campaigns created (workshop, pilot, community).
* 5 PCICS creatives completed passkey wallet setup.
* Working passkey wallet (demo video, sign-in/out, USDCx deposit/withdrawal).
* 50+ total social media followers across Twitter, Telegram, WhatsApp.

---

## 10\. Risks & Mitigations

| Risk | Mitigation |
| --- | --- |
| Mainnet bugs (Clarity contracts) | Testnet buffer, phased deployment |
| Pillar Wallet integration delays | Early request sent, fallback to open-sourced |
| Gatekeeper drop-off, low engagement | Signed MOU, incentives, ongoing training |
| Complexity of UI for non-crypto users | Simple 3-step onboarding, clear tutorials |
| NGN on/off-ramp downtime/regulation | Redundant providers, explore P2P as fallback |

---

## 11\. Glossary

| Term | Definition |
| --- | --- |
| Clarity | Smart contract language for Stacks, optimized for security and auditability |
| USDCx | USDC stablecoin deployed on Stacks by Arkadiko |
| sBTC | Bitcoin bridged (pegged) to Stacks ecosystem |
| ILP | Interledger Protocol, global-standard protocol for cross-border payments |
| Open Payments | Open API standard for interoperable payments (ILP Foundation) |
| PCICS | Plateau Creatives Co-operative Society, anchor gatekeeper for pilots |
| Pillar Wallet | Smart wallet with passkey/WebAuthn login for non-crypto users |

---

## Appendix: Acceptance Criteria Table

| User Story # | Acceptance Criteria |
| --- | --- |
| 1 | User must be able to create/edit profile, campaign, milestones, and submit for review |
| 2 | Disbursement available only when milestone is verified by gatekeeper |
| 3 | Backer sees up-to-date escrow/milestone progression on campaign UI |
| 4 | Idle escrow yield (placeholder, to be specified) |
| 5 | Gatekeeper dashboard enables approval/rejection/endorsement of milestones |
| 6 | Passkey (Pillar) onboarding, seedless-login video and user tests |

---

## References

1. [CineX Product Plan](https://docs.google.com/document/d/1oj8MOxLs4GMt0uO8tdjZxWjnESAne6Jqm8RMl_b1dh8/edit)
2. [Market/Thesis](https://docs.google.com/document/d/1QTzAbrbhqhlCTI3zyAn5VtCB6pywB5tMU42vx4TDINY/edit)
3. [CineX GitHub](https://github.com/mediafintech/CineX)
4. [CineX Demo](https://cine-x-iota.vercel.app/#demo)
5. [Stacks Endowment program](https://www.stacks.org/endowment)
6. [Pillar Wallet](http://pillarwallet.xyz/)

--- 