# CineX — Funding Engine & Project Delivery System for Africa's Creative Economy

A financial setup for African creative projects. It handles secure digital safes, project payouts released step-by-step, two-currency smart wallets, and a business model that makes African creative work reliable and safe to fund.

---

## 📋 Simple Overview

CineX is building the financial pipeline for Africa's creative industry. We connect verified African creators (filmmakers, musicians, game creators, and digital artists) with global funders.

Our system ensures safety by splitting total project funding into milestone steps. Capital is held securely and only moves forward when work is delivered. We use simplified digital wallets that hide all technical blockchain complexity, letting users transact easily in local currency (Naira) and global currency (US Dollars).

Africa's creative industry is worth over $5 billion, yet it is almost entirely locked out of traditional banking. Creators cannot get loans because there is no system to verify their identity, check their track record, or give funders peace of mind that their money is safe. Existing setups are either donation-based (where creators are not held accountable) or require massive property collateral that most creators do not have.

CineX fixes this by creating a reliable, work-based funding setup.

- **34** Industry Hub Leaders Vouched for Us
- **$1M+** Worth of Projects Waiting in Line
- **70/20/10** Earnings Split (Funder / CineX / Creator Bonus)
- **$200B** Total Global Creative Funding Market
- **29** Digital Rulesets Deployed Live
- **50** Quality Check Tests Passed Successfully

---

## 🏗️ Technical Architecture & Internal Logic Connections

CineX is built like a digital fortress using **29 distinct rulesets (smart contracts) organized into 9 separate layers** of safety. All code is permanently locked on the test network, meaning it can never be secretly altered or tampered with.

### How the Core Rulesets Talk to Each Other:

Our setup is designed to be highly secure. Instead of having one massive program do everything, we split the jobs across specialized modules that work as a team:

- **The Master Controller (milestone-escrow):** This acts as the main engine room. It keeps track of funding campaigns, stores work proof submissions, and locks capital in digital safes. It is the core hub that coordinates everything.
- **The Price Checker (oracle-proxy):** The Master Controller cannot see real-world exchange rates on its own. It dials into this Price Checker module to find out exactly how much a US Dollar is worth in local tokens. This module also has a temporary "Demo Mode" switch so we can safely train local creators in Jos without using real money.
- **The Productivity Engine (bitflow-strategy):** While a filmmaker is busy shooting their first scene, their funding capital sits idle. To stop inflation from eating that money, the Master Controller automatically hands the funds to this engine to earn automated market returns. When work is approved, this module splits the returns safely: 70% goes back to the funder as a reward, 20% keeps CineX running, and 10% is paid to the creator as a bonus for good work. If a creator fails to deliver three times, they forfeit their bonus, and it is automatically split between the funder and the platform.

### The Multi-Layer Pipeline:

- **The Smart Wallets:** Every user gets a simplified profile dashboard showing three balances (Naira, Dollars, and fraction-Bitcoin). The system automatically tracks prices and converts funds with a tiny 0.75% platform fee. Users never see long crypto code addresses, never sign weird technical messages, and never pay network gas fees—the backend handles all background operations invisibly.
- **The Interface:** A fast landing page built using clean, universal code templates that run smoothly on basic mobile devices without demanding heavy computing power.
- **The Backend Tracker:** A centralized database helper that constantly indexes activity feeds, manages automatic currency rates, and generates easy-to-read text summaries of user credibility.

---

## ⚡ The Seamless Money Routing Pipeline (Bridge Orchestration)

To remove cross-border payment barriers, CineX runs an automated money-routing service on the backend that handles the entire pipeline within a strict **30-minute delivery guarantee**.

- **The Unbreakable Pathway:** When a payout is triggered, the digital dollars are burned out of circulation on the secondary network and simultaneously minted on the main network using native validation systems. This pathway bypasses old, outdated technology protocols, protecting our users from global system shut-downs or service interruptions.
- **The Local Naira Off-Ramp:** Once the digital funds land on the main ledger, our system routes them directly through an institutional partnership payment gateway. This translates digital states into instant Naira bank deposits or mobile money payouts directly to the creator's Nigerian bank account. The creator simply taps "Withdraw to Bank" and watches the status bar update in plain English without ever knowing a blockchain was involved.

---

## 🔒 Security, Safety Audits & Risk Control

CineX underwent a top-to-bottom security audit across its entire codebase. 7 flaws were found and completely patched. There are zero unaddressed vulnerabilities left in the system.

- **Anti-Exploit Protection:** We fixed 3 critical mathematical bugs that could have caused transaction errors under heavy load, ensuring funds can never be locked up or withdrawn incorrectly.
- **Precision Safety Adjustments:** We updated our payout division code to prevent tiny rounding errors from blocking successful withdrawals.
- **The 24-Hour Wait Lock:** For absolute safety, all major system updates require a mandatory 24-hour waiting period. This gives our independent oversight keys plenty of time to inspect, spot, and cancel any unauthorized or unusual proposals before they settle.

---

## 📊 Business Model — How the Platform Sustains Itself

CineX runs a highly scalable model with six healthy, transparent revenue paths:

1.  **Market Yield Split (20% share):** We keep a minority share of the automatic returns generated while capital sits safely in digital safes waiting for project steps to finish.
2.  **Currency Exchange Spread (0.75%):** A tiny processing margin charged when moving funds automatically between local Naira and global Dollars.
3.  **Project Escrow Fee (5%):** A standard platform fee deducted only when a project step is successfully cleared and paid out to the creator.
4.  **Institutional Reports ($5,000/year):** Detailed data dashboards sold to impact funds, development finance institutions, and film boards who want verified investment analytics in Africa.
5.  **Lead Investor Membership ($2,000/year):** An annual pass for major funders who want priority access to highly vetted creative teams and early-stage project flows.
6.  **Slippage Penalties:** If a creator continuously fails to deliver their milestones, their bonus fund is closed and redistributed to protect backer capital.

---

## 🚀 Go-to-Market & Active Pilot Projects

In Africa, people adopt new platforms based on community trust networks. CineX does not spend money buying internet ads. Instead, we onboard trusted community leaders, guild heads, and studio founders. One single leader endorsement unlocks their entire trusted network of creators at zero marketing cost to us.

We are actively launching within the next 60 days across four foundational pilot projects in Nigeria:

- **Rain (Drama Series Development):** An episodic series detailing life and relationships in modern Lagos, serving as our first milestone rollout.
- **Death of Eternity (Narrative Feature Film):** A thought-provoking movie checking full-lifecycle step payouts.
- **PrePARE VR (Immersive Digital Simulation):** A modern virtual reality training simulation built to prepare everyday users for real-world emergency response.
- **Northern Travels (Documentary Series):** A cinematic travel show capturing the historical landscapes and diverse cultures of Northern Nigeria.

---

## 🛠️ How to Set Up and Test the Code Locally

### Prerequisites for Tech Reviewers

- Install **Clarinet** (the standardized simulator tool used to check smart contract logic).
- Ensure your computer has **Node.js** and a local database configuration ready.

### 1. Download the Project Directory

Run this command in your computer's terminal to copy our codebase:

```bash
git clone https://github.com/mediaCineX/CineX
cd CineX
npm install
```

### 2. Run the 50 Quality Verification Tests

Run our complete automated testing routine to ensure all mathematical parameters and safety checks pass perfectly:

```bash
clarinet test
```

### 3. Spin Up the Local Training Simulator

To evaluate the user interface dashboard on your computer screen without connecting to real blockchain nodes or using real gas fees, turn on the mock simulator flag:

```bash
VITE_USE_MOCK_DATA=true npm run dev
```

---

## 📜 Our Long-Term Open Source Goal

CineX is completely free, open-source software built for the public good. Our 12-month design pathway is focused on moving all cross-chain payment routes entirely onto native, trustless foundations. We are actively researching modern fraud-proof systems and automated digital escrow mechanics to process all conditional creator payouts directly on the base layer of Bitcoin, completely removing external platform dependencies.

---

## Learn More

- **[Backend & Smart Contract Architecture](./BACKEND_README.md)** — Module system, contract relationships, deployment
- **[Wallet Abstraction Plan](./WALLET_ABSTRACTION_PLAN.md)** — How dual-currency wallets work behind the scenes

---

_Disclaimer: This repository and documentation are for informational and educational purposes only and do not constitute an offer or financial solicitation._
