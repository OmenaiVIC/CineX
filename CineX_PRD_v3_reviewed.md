Proc# CineX

## Product Requirements Document

Milestone-Based Financing Platform — Stacks Endowment Grant Edition

Version 3.0 | July 2026 | Confidential

| **Attribute**   | **Detail**                                                                  |
|-----------------|-----------------------------------------------------------------------------|
| Company         | CineX / MediaFinTech                                                        |
| Grant Body      | Stacks Endowment                                                            |
| Sprint Duration | 12 Weeks (July–September 2026)                                              |
| Grant Stage     | Build Milestone                                                             |
| Pre-Seed Round  | $600,000 at $5M post-money                                                |
| Smart Contracts | All deployed to Stacks testnet pre-sprint. Mainnet deploy = grant delivery. |
| Document Status | Final v3.0 — Reconciled against all GitHub implementation plans             |

## 1. Executive Summary

CineX is a Bitcoin-secured, milestone-based financing platform for Africa's creative economy. All 12 Clarity smart contracts have been deployed and tested on Stacks testnet. The 12-week Stacks Endowment sprint is therefore an acceleration milestone — moving from testnet to mainnet, completing the wallet and UI layer, and executing two funded pilot projects — not a greenfield build.

This PRD v3.0 is the single source of truth. It supersedes PRD v2.0 and reconciles all GitHub implementation plans, correcting sequencing for the testnet-complete reality.

### 1.1 Architectural Ground Truth

> These decisions are canonical across all CineX documents. Any document contradicting these is outdated.

| **Decision**                 | **Answer**                                                                                               | **Implication**                                                                           |
|------------------------------|----------------------------------------------------------------------------------------------------------|-------------------------------------------------------------------------------------------|
| Settlement asset — escrow    | USDCx (Circle xReserve on Stacks)                                                                        | Stablecoin. No BTC volatility for creatives during production.                            |
| Treasury & yield layer       | sBTC (Bitcoin-pegged Stacks asset)                                                                       | Platform treasury + Bitflow yield in sBTC. Supports Stacks sBTC narrative.                |
| Milestone approval authority | Backers only — backer-weighted sequential voting (milestone-verification.clar)                           | Gatekeepers endorse creative profiles only. They do NOT approve fund releases.            |
| Grant contract deliverable   | 2 headline contracts on mainnet (milestone-escrow + project-verification-module)                         | 12 total logic files deployed. Grant report leads with 2 user-facing contracts.           |
| Contract deployment status   | All 12 contracts + 10 trait files deployed and tested on Stacks testnet                                  | Epic 1 mainnet sprint = deploy scripts + bug bounty + mainnet deploy. Not rebuild.        |
| Frontend scope — Weeks 1–8   | Tier 1: wallet dashboard, passkey login, campaign creation, escrow status, milestone tracking, demo mode | Tier 2 (profiles, pools, AI summary, activity feed) ships Weeks 9–12.                     |
| Backend infrastructure       | Neon (serverless PostgreSQL) replacing Render + Supabase                                                 | Scale-to-zero free tier. Never expires. Vercel-native. Ideal for low-burn pre-seed stage. |
| Verification tiers           | Unverified (≤$1,000 cap), Basic ($25 fee, ≤$10,000), Standard ($75 fee, unlimited)                   | Demo/test mode bypasses all verification fees to enable frictionless UI testing.          |

## 2. Creative Verification Tier System

The project-verification-module.clar implements a three-tier verification system that gates campaign funding caps. This is a core monetisation and trust mechanism — not just a KYC feature.

| **Tier**          | **Who**                                              | **Funding Cap**              | **Fee**                  | **On-Chain Action**                   | **How Verified**                                                               |
|-------------------|------------------------------------------------------|------------------------------|--------------------------|---------------------------------------|--------------------------------------------------------------------------------|
| Unverified        | Any registered creative                              | ≤$1,000 equivalent in USDCx | None                     | create-profile tx, no additional call | Self-registration only. No gatekeeper required.                                |
| Basic Verified    | Creative + gatekeeper endorsement + basic fee        | ≤$10,000 equivalent         | $25 (or STX equivalent) | pay-verification-fee(BASIC)           | Multi-sig admin queues verify-project(BASIC) via timelock after fee confirmed. |
| Standard Verified | Full KYC/KYB + gatekeeper endorsement + standard fee | Unlimited                    | $75 (or STX equivalent) | pay-verification-fee(STANDARD)        | Multi-sig admin queues verify-project(STANDARD) via timelock after docs + fee. |

### 2.1 Demo & Test Mode — Verification Bypass

> CRITICAL FOR TESTING: The verification fee and cap system must be bypassed in demo mode and local testnet environments, or no one will be able to test the UI without paying real fees. The following mechanism must be implemented before Week 5.

Implementation: The oracle-proxy.clar returns STX price = 0 in DEMO_MODE. When the fee in STX is 0, the pay-verification-fee function treats it as a no-op and grants Basic Verified status automatically. This means:

- In demo mode (VITE_USE_MOCK_DATA=true or DEMO_CONTRACT_ADDR environment variable set), all users auto-elevate to Basic Verified on profile creation.

- The $1,000 unverified cap does not appear in the demo UI — campaigns are created with no cap warning.

- For the Jos gatekeeper workshop (Week 10), all participant accounts are pre-seeded with Basic Verified status via the demo mode flag.

- For real testnet testing by the team, a TESTNET_BYPASS_VERIFICATION=true env var calls an admin function to grant Basic status without STX fee payment.

- This bypass is ONLY available when the contract is deployed with a specific dev-mode flag at deployment time. It is not possible to trigger on mainnet.

### 2.2 Verification Tier Sprint Tasks

| **When**         | **Task**                                                                      | **Owner**  | **Acceptance Criterion**                                         |
|------------------|-------------------------------------------------------------------------------|------------|------------------------------------------------------------------|
| Week 1           | Add DEMO_MODE oracle-proxy variant that returns price=0 for fee calculation   | Victor     | demo deploy shows $0 fee, Basic status auto-granted             |
| Week 4           | Add TESTNET_BYPASS_VERIFICATION admin function to project-verification-module | Victor     | Team can grant Basic Verified on testnet without STX             |
| Week 5           | Frontend: hide verification fee UI when VITE_USE_MOCK_DATA=true               | McDaniells | No fee prompt shown in demo mode                                 |
| Week 5           | Frontend: show verification tier badge on campaign creation page              | Stephanie  | Badge shows Unverified / Basic / Standard with funding cap       |
| Week 6           | Frontend: gate campaign funding target input by tier cap                      | McDaniells | Entering >$1,000 as Unverified shows upgrade prompt, not error |
| Week 8 (mainnet) | Set real fee amounts in oracle-proxy via admin (timelock)                     | Victor     | $25/$75 fee correctly computed in STX on mainnet               |

## 3. Backend Infrastructure — Migration to Neon

### 3.1 Decision: Neon over Render + Supabase

With limited runway and the pre-seed raise in progress, the backend must run free-tier indefinitely without service interruption. The comparison:

| **Provider**          | **Free Tier**                                                               | **Key Risk**                                                                        | **Verdict**         |
|-----------------------|-----------------------------------------------------------------------------|-------------------------------------------------------------------------------------|---------------------|
| Render (current)      | 90-day trial, then paid                                                     | No always-free tier after trial. Services spin down after 15 min idle on free.      | REPLACE             |
| Supabase (current)    | 500MB, pauses after 7 days idle                                             | Database pauses break the app silently. Auth/storage bundled but unused complexity. | REPLACE             |
| Neon (recommended)    | 0.5GB storage, 100 CU-hr/month. Never expires. Never pauses. Scale-to-zero. | Cold start ~500ms on first query after idle. Negligible for CineX traffic patterns. | ADOPT               |
| Railway (alternative) | 30-day trial, then $5/mo hobby                                             | Has a cost floor. Better if/when funded.                                            | Post-funding option |

### 3.2 Why Neon is the Right Choice Now

- Never-expiring free tier: 0.5GB storage + 100 compute-hours/month. At CineX's pre-launch traffic (team + 10 pilot users + workshop participants), you will use fewer than 20 CU-hours/month. Free indefinitely.

- Scale-to-zero = $0 when idle: Unlike Render (spins down app, not DB) or Supabase (pauses DB after 7 days), Neon's compute simply sleeps when not queried and wakes in ~500ms. For an app with intermittent traffic this is free compute.

- Vercel-native: CineX frontend is on Vercel. Neon is Vercel Postgres natively — same dashboard, one-click connection, no separate vendor relationship.

- Standard PostgreSQL: The existing backend/src/database.js schema migrates with pg_dump → pg_restore. No rewrite. No ORM change. Connection string swap only.

- Branching for free: 10 branches per project on free tier. One branch per epic sprint. Victor and McDaniells can work on different branches without stepping on each other.

### 3.3 Migration Sprint Tasks

| **When**      | **Task**                                                                               | **Owner**  | **Acceptance Criterion**                                |
|---------------|----------------------------------------------------------------------------------------|------------|---------------------------------------------------------|
| Week 1, Day 1 | Create Neon project, provision database, obtain connection string                      | Theophilus | Neon console accessible, DATABASE_URL available         |
| Week 1, Day 2 | pg_dump existing Render Postgres → pg_restore to Neon                                  | McDaniells | All existing tables, indexes, and data verified in Neon |
| Week 1, Day 2 | Update all environment variables (Vercel, local .env) to point to Neon                 | McDaniells | Backend connects to Neon with zero code changes         |
| Week 1, Day 3 | Add Neon-specific connection pooling config (@neondatabase/serverless driver for edge) | McDaniells | No connection timeout errors under simulated load       |
| Week 1, Day 3 | Decommission Render Postgres and Supabase after 1-week parallel run                    | Theophilus | Zero data loss confirmed. Old services cancelled.       |
| Week 2        | Create sprint branches in Neon: main / epic1-contracts / epic2-wallet                  | McDaniells | Each epic can test against isolated DB branch           |

## 4. Smart Contract Status — Testnet Complete

> All 12 logic contracts and 10 trait files have been deployed to Stacks testnet and unit-tested. Epic 1 of the grant sprint is therefore NOT a build sprint — it is a mainnet delivery sprint. The work is: deployment scripts, Zero Authority bug bounty, and mainnet deploy of the 2 headline contracts.

| **Contract**                       | **Files**                | **Tests**  | **Testnet Status** | **Mainnet Action**                   |
|------------------------------------|--------------------------|------------|--------------------|--------------------------------------|
| cinex-multisig.clar                | 1 .clar                  | 14 passing | ✅ Deployed        | Include in mainnet deploy batch      |
| timelock.clar                      | 1 .clar + 1 trait        | 10 passing | ✅ Deployed        | Include in mainnet deploy batch      |
| asset-registry.clar                | 1 .clar + 1 trait        | 10 passing | ✅ Deployed        | Include in mainnet deploy batch      |
| oracle-proxy.clar                  | 1 .clar + 1 trait        | 8 passing  | ✅ Deployed        | Include + add DEMO_MODE variant      |
| reputation.clar                    | 1 .clar + 1 trait        | 10 passing | ✅ Deployed        | Include in mainnet deploy batch      |
| crowdfunding-module.clar           | 1 .clar (pre-existing)   | N/A        | ✅ Deployed        | Retain, no change                    |
| project-verification-module.clar ★ | 1 .clar + 1 trait        | 17 passing | ✅ Deployed        | ★ HEADLINE — mainnet deploy Week 3–4 |
| milestone-escrow.clar ★            | 1 .clar + 1 trait        | 26 passing | ✅ Deployed        | ★ HEADLINE — mainnet deploy Week 3–4 |
| milestone-verification.clar        | 1 .clar                  | 12 passing | ✅ Deployed        | Include in mainnet deploy batch      |
| yield-escrow.clar                  | 1 .clar + 1 trait        | 18 passing | ✅ Deployed        | Include in mainnet deploy batch      |
| bitflow-strategy.clar              | 1 .clar + 1 trait + mock | 20 passing | ✅ Deployed        | Include in mainnet deploy batch      |
| funding-pool.clar                  | 1 .clar + 1 trait        | 28 passing | ✅ Deployed        | Include in mainnet deploy batch      |

Total: 22 .clar source files, 11 test files, ~173 unit test cases passing. 7 integration flows (A–G) passing on testnet.

## 5. Functional Requirements by Epic

> Since all contracts are testnet-complete, Epics 1 & 2 are combined into a single accelerated Phase 1 (Weeks 1–4). Victor drives mainnet delivery. McDaniells drives Neon migration + wallet integration in parallel. Phase 1 delivers both headline contracts on mainnet AND passkey wallet — ahead of the original schedule.

### Epic 1+2 (Combined): Mainnet Deployment + Passkey Wallet [P0 — Foundation | Weeks 1–4 (Accelerated: contracts testnet-complete)]

All 12 contracts already testnet-deployed. Phase 1 sprint = bug bounty → mainnet deploy → wallet integration. Victor and McDaniells run in parallel from Day 1. Epic 2 (Passkey Wallet) begins Week 2 concurrently, not sequentially.

#### Implementation Tasks

| **When** | **Task**                                                                          | **Owner**              |
|----------|-----------------------------------------------------------------------------------|------------------------|
| Week 1   | Write deployment scripts for all 12 contracts in correct dependency order         | Victor                 |
| Week 1   | Add DEMO_MODE oracle-proxy variant for verification bypass                        | Victor                 |
| Week 1   | Neon migration: pg_dump → pg_restore → env var update → parallel run              | McDaniells             |
| Week 2   | Request Pillar Wallet credentials. Confirm Yellow Card sandbox access.            | Theophilus             |
| Week 2   | Launch Zero Authority bug bounty — minimum 5 reviewers, scope published           | Victor + Theophilus    |
| Week 2   | Integrate Pillar Wallet SDK: passkey account creation, login, transaction signing | McDaniells             |
| Week 3   | Deploy all 12 contracts to Stacks mainnet in dependency order                     | Victor                 |
| Week 3   | Build USDCx deposit/withdraw/sign flows against mainnet contracts                 | McDaniells             |
| Week 3   | Integrate Yellow Card: USDCx → NGN conversion sandbox                             | McDaniells             |
| Week 4   | Resolve all critical/high bug bounty findings                                     | Victor                 |
| Week 4   | Record wallet demo video: passkey onboarding → deposit → NGN withdrawal           | Stephanie + McDaniells |
| Week 4   | Onboard 5 PCICS creatives to passkey wallet on mainnet                            | Theophilus             |
| Week 4   | Phase 1 grant report to Stacks Endowment                                          | Theophilus             |

#### Success Criteria

- Both headline contracts (milestone-escrow + project-verification-module) live on Stacks mainnet, verifiable on Stacks Explorer

- All 12 logic contracts publicly verifiable on mainnet

- Zero Authority bug bounty complete, no unresolved critical findings

- Wallet demo video published — full passkey onboarding flow, no seed phrase visible

- 5 PCICS creatives onboarded to passkey wallet

- DEMO_MODE verification bypass functional on testnet

- Neon database live, Render/Supabase decommissioned

### Epic 3: Dual-Currency Wallet UI — Tier 1 (Grant Deliverable) [P1 — Pilot Onboarding | Weeks 5–8]

The grant-critical frontend. Tier 1 only. Demo mode must ship Week 5, not Week 8, because it is required for the Week 10 Jos gatekeeper workshop. Tier 2 features (profiles, rating, pools, AI summary, activity feed) ship Weeks 9–12.

#### Implementation Tasks

| **When**         | **Task**                                                                             | **Owner**              |
|------------------|--------------------------------------------------------------------------------------|------------------------|
| Week 5, Days 1–2 | Onboarding wizard: role selection (Creative/Backer/Gatekeeper), RoleGuard, tour      | McDaniells             |
| Week 5, Days 3–4 | Demo mode (DemoModeContext, DemoModeBanner, seed data). MUST ship this week.         | McDaniells             |
| Week 5, Day 5    | Wallet dashboard: NGN/USDCx balance display. Passkey login end-to-end.               | McDaniells             |
| Week 5           | Mobile responsive pass: 375px / 768px / 1024px — all breakpoints                     | Stephanie              |
| Week 6, Days 1–2 | Campaign creation form: title, description, target, milestone list (tier-aware cap)  | McDaniells             |
| Week 6, Days 3–4 | Escrow status display: live data from milestone-escrow.clar (not mocked)             | McDaniells             |
| Week 6, Day 5    | Transaction modal (useTransaction hook). Loading states for all on-chain calls.      | McDaniells             |
| Week 7, Days 1–2 | Milestone tracking UI. Fund release flow for backer approval. ContractErrorMap live. | McDaniells             |
| Week 7, Days 3–5 | End-to-end testing. Bug fixes. Accessibility pass.                                   | McDaniells + Stephanie |
| Week 8, Day 1    | Deploy Tier 1 to production (app.cinex.vercel.app)                                   | McDaniells             |
| Week 8, Day 2    | Deploy demo version (demo.cinex.vercel.app) with pre-seeded Basic Verified accounts  | McDaniells             |

#### Success Criteria

- Wallet dashboard live on production with real NGN/USDCx balance display

- Demo mode live at demo.cinex.vercel.app — no wallet required, Basic Verified auto-granted

- Campaign creation functional with verification tier cap awareness

- Escrow status display showing live data from mainnet contracts (not mocked)

- At least 2 test campaigns created end-to-end by pilot users

- Mobile responsive at 375/768/1024px — verified on real devices

### Epic 4: Pilot Projects [P1 | Weeks 6–8 (preparation Week 4)]

Two real pilot films funded on mainnet with milestone 1 released. Milestone structures must be finalised in writing with producers by end of Week 4 — this is a hard dependency for the contract parameterisation in Week 6.

#### Implementation Tasks

| **When**               | **Task**                                                                                                                  | **Owner**        |
|------------------------|---------------------------------------------------------------------------------------------------------------------------|------------------|
| Week 4 (HARD DEADLINE) | Finalise milestone structures for Death of Eternity (Achor Yusuf) and Rain (Ogochukwu Umeadi) in writing. Commit to repo. | Theophilus       |
| Week 6                 | Parameterise both campaigns in milestone-escrow.clar on mainnet with agreed milestone structures                          | Victor           |
| Week 7                 | Onboard Death of Eternity + Rain campaigns via live UI. Fund escrow up to ₦600K each.                                     | Eno + Theophilus |
| Week 8                 | Track milestone 1 deliverable submissions. Trigger backer approval vote.                                                  | Theophilus       |
| Week 8                 | Release milestone 1 funds on mainnet for both campaigns. Record transaction hashes.                                       | Victor           |

#### Success Criteria

- Both campaigns live on mainnet with escrow funded to ₦600,000 equivalent

- Milestone 1 verified and funds released on-chain for both pilots

- Transaction hashes for both milestone releases recorded in grant report

### Epic 3 Tier 2: Dual-Currency Wallet UI — Tier 2 (Post-Week 8) [P1 — Product Vision | Weeks 9–12 (post-grant milestone)]

The features that transform CineX from a grant deliverable into a full social-reputation-financing platform. These are real product requirements — not padding — but none block the grant milestone or the Jos workshop. They ship concurrently with the gatekeeper workshop and ILP sprint.

#### Implementation Tasks

| **When** | **Task**                                                                                    | **Owner**              |
|----------|---------------------------------------------------------------------------------------------|------------------------|
| Week 9   | User profiles: profile page, edit modal, portfolio CRUD (Creative/Backer/Gatekeeper views)  | McDaniells + Stephanie |
| Week 9   | Rating system: RateUserPage, StarRating component, RatingForm → reputation.clar integration | McDaniells             |
| Week 10  | Tribe/Pool homepage: PoolPage, MemberList, ProposalCard, VoteButton → funding-pool.clar     | McDaniells             |
| Week 10  | Creator Dashboard and Backer Dashboard with role-specific widgets                           | Stephanie + McDaniells |
| Week 11  | Activity feed + off-chain indexer: event hooks from Section 5.4 of smart contract plan      | McDaniells             |
| Week 11  | Network detection + wallet switching (Leather/Xverse fallback from Pillar)                  | McDaniells             |
| Week 12  | AI Credibility Summary: modal, aiService backend, Claude/OpenAI API integration             | McDaniells             |

#### Success Criteria

- User profiles live with portfolio and reputation score display

- Rating system functional — users can rate via reputation.clar

- Tribe/Pool pages live — funding-pool.clar readable from frontend

- Activity feed indexing on-chain events from all 12 contracts

- AI Credibility Summary functional (requires API key provisioned)

### Epic 5: Gatekeeper Workshop [P1 | Weeks 9–10]

Physical workshop in Jos. Demo mode must be live (Week 5 deliverable) before planning this event. All 10+ participants onboard via demo mode — no testnet STX required.

#### Implementation Tasks

| **When** | **Task**                                                                                | **Owner**           |
|----------|-----------------------------------------------------------------------------------------|---------------------|
| Week 9   | Book Jos venue. Confirm 10+ PCICS attendees. Prepare incentive distribution plan.       | Theophilus          |
| Week 9   | Produce workshop slide deck + printed one-page quick-reference guide.                   | Qadesh              |
| Week 10  | Host workshop. Onboard 10+ creatives. Submit on-chain endorsements via reputation.clar. | Theophilus + Victor |
| Week 10  | Distribute micro-incentives to 3 additional creatives.                                  | Theophilus          |
| Week 11  | Publish workshop report (blog/GitHub): attendee count, profiles created, feedback.      | Qadesh              |

#### Success Criteria

- 10+ PCICS creatives attend workshop with accounts created

- On-chain endorsements submitted by PCICS gatekeepers

- Workshop report published as replicable gatekeeper onboarding playbook

### Epic 6: ILP Integration (P2 — Conditional) [P2 | Weeks 9–11 (grant confirmation required)]

ILP is the international routing layer sitting upstream of Yellow Card. Architecture: International Backer (any currency) → ILP Open Payments → USDCx (Stacks) → milestone-escrow.clar → Yellow Card → NGN. ILP and Yellow Card are two distinct legs — not interchangeable. WALLET_ABSTRACTION_PLAN.md must be updated to show this 4-leg flow before any integration begins.

#### Implementation Tasks

| **When**   | **Task**                                                                                  | **Owner**  |
|------------|-------------------------------------------------------------------------------------------|------------|
| Week 9     | Confirm Interledger Open Payments Accelerator grant in writing. If not confirmed: stop.   | Eno        |
| Week 9     | Update WALLET_ABSTRACTION_PLAN.md with 4-leg ILP architecture diagram.                    | McDaniells |
| Week 10–11 | Integrate ILP Open Payments API. Build testnet demo: international send → USDCx → escrow. | McDaniells |
| Week 11    | Publish ILP integration documentation to GitHub.                                          | McDaniells |

#### Success Criteria

- Grant confirmation received in writing

- ILP testnet payout demo: foreign currency → ILP → USDCx lands in milestone-escrow.clar

- ILP + Yellow Card documented as distinct legs in WALLET_ABSTRACTION_PLAN.md

- Technical docs published

### Epic 7: Open-Source Documentation [P2 | Weeks 11–12]

Apache 2.0. Satisfies Stacks Endowment open-source requirement and enables ecosystem replication.

#### Implementation Tasks

| **When** | **Task**                                                                                        | **Owner**        |
|----------|-------------------------------------------------------------------------------------------------|------------------|
| Week 11  | GitHub wiki: function-level docs for all 12 logic contracts + error code table                  | McDaniells       |
| Week 12  | Per-contract README: integration hooks, example calls, deployment notes                         | McDaniells       |
| Week 12  | Publish cross-contract call table (Section 5.1 of SMART_CONTRACT_IMPLEMENTATION_PLAN_2WEEKS.md) | McDaniells       |
| Week 12  | Compile Week 12 grant proof package: all success metrics with on-chain evidence                 | Eno + Theophilus |

#### Success Criteria

- GitHub wiki live and discoverable

- All contract READMEs published

- Grant proof package submitted

## 6. Technical Architecture

| **Layer**          | **Component**                                                                                            | **Notes**                                                                                          |
|--------------------|----------------------------------------------------------------------------------------------------------|----------------------------------------------------------------------------------------------------|
| Blockchain         | Stacks mainnet. 22 .clar files (12 logic + 10 traits). All testnet-complete.                             | Immutable contracts. No proxy/upgrade. Migration = new deploy + emergency withdraw.                |
| Escrow Currency    | USDCx (Circle xReserve on Stacks)                                                                        | Stablecoin. No BTC volatility for creatives. All milestone amounts denominated in USDCx.           |
| Treasury/Yield     | sBTC (Bitcoin-pegged)                                                                                    | Platform treasury + Bitflow yield in sBTC. Supports Stacks sBTC narrative for grant.               |
| Admin Governance   | 2-of-3 multi-sig + 2880-block timelock                                                                   | Victor, co-founder, trusted advisor. Emergency bypass available on all contracts.                  |
| Oracle (v1)        | Multi-sig push via oracle-proxy.clar                                                                     | Admin-pushed STX/USD. DEMO_MODE variant returns price=0 for free verification testing.             |
| Oracle (v2)        | Pyth pull oracle (post-grant)                                                                            | Proxy pattern: no consumer contract changes needed for upgrade.                                    |
| Frontend           | React + TypeScript + Vite (Vercel)                                                                       | Mobile-first. Phase 0 infra committed. Mock-first (VITE_USE_MOCK_DATA) with contract swap.         |
| Database           | Neon (serverless PostgreSQL)                                                                             | Replacing Render + Supabase. Free tier never expires. Scale-to-zero. Vercel-native.                |
| Wallet             | Pillar Wallet (WebAuthn/passkey). Leather/Xverse fallback.                                               | No seed phrase. WebAuthn standard. Demo mode for non-wallet users.                                 |
| On/Off-Ramp        | Yellow Card (NGN last-mile)                                                                              | ILP = international routing layer (upstream). Yellow Card = NGN delivery (last leg). Not the same. |
| Verification Tiers | project-verification-module.clar: Unverified (≤$1K) / Basic ($25, ≤$10K) / Standard ($75, unlimited) | DEMO_MODE auto-grants Basic Verified. Testnet bypass admin function available.                     |
| Monitoring         | Stacks Explorer, Vercel Analytics, Neon console, off-chain event indexer                                 | Event hooks emitted by all state-changing contract functions (Section 5.4 of contract plan).       |

### 6.1 On-Chain vs Off-Chain Transparency

On-chain (publicly verifiable on Stacks Explorer):

- Milestone escrow balances and release events (milestone-escrow.clar)

- Backer approval votes and voter principals (milestone-verification.clar)

- Gatekeeper endorsement letters (reputation.clar)

- Creative verification status and tier (project-verification-module.clar)

- All admin actions (timelock.clar queue — publicly visible)

Off-chain (Neon PostgreSQL — not publicly verifiable):

- NGN and USD wallet balances (naira_balance, usd_balance — off-chain IOUs backed by sBTC)

- Exchange rate snapshots and locked quote records

- User session state and profile metadata

- Off-ramp transaction records with Yellow Card

- Activity feed index (mirrors on-chain events for fast UI querying)

## 7. Grant Milestone Report Templates

Three templates — one per phase. Fill in actual evidence at submission time. [FILL IN] placeholders mark required evidence fields.

### Milestone Report 1 — Foundation Phase (Weeks 1–4)

### 1A. Report Header

| **Field**        | **Value**                           |
|------------------|-------------------------------------|
| Grant Recipient  | CineX / MediaFinTech                |
| Grant Program    | Stacks Endowment — Build Milestone  |
| Reporting Period | Weeks 1–4 (July 2026)               |
| Submitted By     | Theophilus Adelekun — Operations PM |
| Date Submitted   | [DATE]                            |
| Status           | [ ] Draft [ ] Final             |

### 1B. Headline Deliverable: 2 Core Contracts on Stacks Mainnet

| **Contract**                     | **Mainnet Address** | **Stacks Explorer Link** | **Status**     |
|----------------------------------|---------------------|--------------------------|----------------|
| milestone-escrow.clar            | [FILL IN]         | [FILL IN]              | [ ] Deployed |
| project-verification-module.clar | [FILL IN]         | [FILL IN]              | [ ] Deployed |

### 1C. Full Architecture Deployed (All 12 Contracts + Infrastructure)

> All 12 contracts were deployed to Stacks testnet prior to the grant sprint. Mainnet deploy is the grant milestone. Report all 12 addresses as evidence of over-delivery.

| **Contract**                | **Mainnet Address** | **Unit Tests** | **Role**                |
|-----------------------------|---------------------|----------------|-------------------------|
| cinex-multisig.clar         | [FILL IN]         | 14 / 14        | Admin governance        |
| timelock.clar               | [FILL IN]         | 10 / 10        | 2880-block delay        |
| asset-registry.clar         | [FILL IN]         | 10 / 10        | Asset whitelist         |
| oracle-proxy.clar           | [FILL IN]         | 8 / 8          | STX/USD price feed      |
| reputation.clar             | [FILL IN]         | 10 / 10        | Gatekeeper endorsements |
| crowdfunding-module.clar    | [FILL IN]         | N/A            | Pre-existing — retained |
| milestone-verification.clar | [FILL IN]         | 12 / 12        | Backer-weighted voting  |
| yield-escrow.clar           | [FILL IN]         | 18 / 18        | 70/20/10 yield split    |
| bitflow-strategy.clar       | [FILL IN]         | 20 / 20        | Bitflow wrapper         |
| funding-pool.clar           | [FILL IN]         | 28 / 28        | Passive capital pools   |

### 1D. Passkey Wallet + Backend

| **Deliverable**                                 | **Evidence**                              | **Status**     |
|-------------------------------------------------|-------------------------------------------|----------------|
| Wallet demo video published                     | [VIDEO LINK]                            | [ ] Complete |
| 5 PCICS creatives onboarded                     | Profile screenshots / on-chain principals | [ ] Complete |
| USDCx deposit functional on mainnet             | Mainnet tx hash                           | [ ] Complete |
| NGN withdrawal functional                       | Yellow Card sandbox confirmation          | [ ] Complete |
| No seed phrase in any user flow                 | Demo video timestamp reference            | [ ] Verified |
| Neon database live, old services decommissioned | Neon console screenshot                   | [ ] Complete |
| DEMO_MODE verification bypass tested            | Screen recording                          | [ ] Verified |

### 1E. Bug Bounty Summary

| **Item**          | **Detail**                              |
|-------------------|-----------------------------------------|
| Program           | Zero Authority                          |
| Review Period     | [DATES]                               |
| Reviewers         | [NUMBER] (min 5)                      |
| Critical Findings | [NUMBER] — [all resolved / pending] |
| Report Published  | [LINK]                                |

### 1F. Phase 1 Checklist

- 2 headline contracts on Stacks mainnet: [ ] YES [ ] NO

- All 12 contracts publicly verifiable on Stacks Explorer: [ ] YES [ ] NO

- Bug bounty complete, no unresolved critical findings: [ ] YES [ ] NO

- ~173 unit tests passing: [ ] YES [ ] NO Actual: [NUMBER]

- 7 integration flows (A–G) passing on testnet: [ ] YES [ ] NO

- Wallet demo video published: [ ] YES [ ] NO [LINK]

- 5 PCICS creatives onboarded to passkey wallet: [ ] YES [ ] NO Actual: [NUMBER]

- Neon database live: [ ] YES [ ] NO

- DEMO_MODE bypass functional: [ ] YES [ ] NO

### Milestone Report 2 — Pilot Onboarding Phase (Weeks 5–8)

### 2A. Report Header

| **Field**        | **Value**               |
|------------------|-------------------------|
| Reporting Period | Weeks 5–8 (August 2026) |
| Submitted By     | Eno Peters — Senior PM  |
| Date             | [DATE]                |

### 2B. Wallet UI Tier 1

| **Feature**                                   | **Evidence**                     | **Status**     |
|-----------------------------------------------|----------------------------------|----------------|
| Wallet dashboard live (app.cinex.vercel.app)  | [URL]                          | [ ] Live     |
| Demo mode live (demo.cinex.vercel.app)        | [URL]                          | [ ] Live     |
| Passkey login end-to-end                      | Screen recording                 | [ ] Verified |
| Campaign creation with tier-aware cap         | On-chain campaign IDs            | [ ] Verified |
| Escrow status (live mainnet data, not mocked) | Screenshot showing real balance  | [ ] Verified |
| Mobile responsive 375/768/1024px              | Screenshots at all 3 breakpoints | [ ] Verified |
| 2+ test campaigns created by pilot users      | On-chain campaign IDs            | [ ] Verified |
| Verification tier badge visible in UI         | Screenshot                       | [ ] Verified |

### 2C. Pilot Project Deliverables

| **Project**                     | **Campaign ID** | **Funded (USDCx)** | **Milestone 1 Released?** | **Tx Hash** |
|---------------------------------|-----------------|--------------------|---------------------------|-------------|
| Death of Eternity (Achor Yusuf) | [FILL IN]     | [AMOUNT]         | [ ] YES [ ] NO        | [FILL IN] |
| Rain (Ogochukwu Umeadi)         | [FILL IN]     | [AMOUNT]         | [ ] YES [ ] NO        | [FILL IN] |

### 2D. Phase 2 Checklist

- Wallet UI live on production: [ ] YES [ ] NO [URL]

- Demo mode live for non-wallet users: [ ] YES [ ] NO [URL]

- 2 pilot campaigns funded on mainnet: [ ] YES [ ] NO

- Milestone 1 funds released — Death of Eternity: [ ] YES [ ] NO [TX HASH]

- Milestone 1 funds released — Rain: [ ] YES [ ] NO [TX HASH]

- 5+ profiles/campaigns created (cumulative): [ ] YES [ ] NO Actual: [NUMBER]

### Milestone Report 3 — Community Validation Phase (Weeks 9–12)

### 3A. Gatekeeper Workshop

| **Metric**                                    | **Target**             | **Actual** | **Evidence**                |
|-----------------------------------------------|------------------------|------------|-----------------------------|
| Workshop attendees                            | 10+                    | [NUMBER] | Attendance register / photo |
| Accounts created                              | 10+                    | [NUMBER] | On-chain principals         |
| On-chain endorsements submitted               | By PCICS gatekeepers   | [NUMBER] | Explorer links              |
| Micro-incentives distributed                  | 3 additional creatives | [NUMBER] | Tx records                  |
| Workshop report published                     | Blog/GitHub            | [LINK]   | URL                         |
| Tier 2 features shipped (profiles, pools etc) | Yes                    | [Y/N]    | App URL                     |

### 3B. ILP (if confirmed)

| **Deliverable**                                 | **Evidence**         | **Status**                |
|-------------------------------------------------|----------------------|---------------------------|
| Grant confirmation received                     | [LETTER/EMAIL]     | [ ] Confirmed [ ] N/A |
| ILP testnet demo functional                     | [VIDEO/SCREENSHOT] | [ ] Complete [ ] N/A  |
| WALLET_ABSTRACTION_PLAN.md updated (4-leg flow) | [GITHUB LINK]      | [ ] Updated [ ] N/A   |
| ILP docs published                              | [GITHUB LINK]      | [ ] Complete [ ] N/A  |

### 3C. Final 12-Week Summary

| **KPI**                       | **Target**     | **Achieved** | **Evidence**   |
|-------------------------------|----------------|--------------|----------------|
| Headline contracts on mainnet | 2              | [NUMBER]   | Explorer links |
| Total contracts deployed      | 12 logic files | [NUMBER]   | Explorer links |
| Unit tests passing            | ~173           | [NUMBER]   | CI report      |
| Pilot campaigns funded        | 2              | [NUMBER]   | Campaign IDs   |
| Milestones funded on mainnet  | ≥2             | [NUMBER]   | Tx hashes      |
| Creative profiles/campaigns   | 10+            | [NUMBER]   | On-chain list  |
| Gatekeeper workshop attendees | 10+            | [NUMBER]   | Register       |
| Social media followers        | 50+            | [NUMBER]   | Screenshots    |
| Passkey wallet demo video     | 1              | [LINK]     | URL            |
| Open-source docs live         | GitHub wiki    | [LINK]     | URL            |
| Neon migration complete       | Yes            | [Y/N]      | Neon console   |
| Tier 2 UI features live       | Yes            | [Y/N]      | App URL        |

> Document prepared by Victor Omenai (Technical Founder) + Eno Peters (Senior PM) + Theophilus Adelekun (Operations PM) | CineX / MediaFinTech | PRD Version 3.0 — July 2026 | For Stacks Endowment Grant Reporting

## Reviewer Addendum — Required Insertions and Clarifications

This reviewed copy preserves the original PRD body with high-confidence text corrections applied where straightforward, and appends the required new language below. Use the companion redline-ready change log for section-by-section replacement instructions.

### Settlement Ground Truth (insert after 1.1 Architectural Ground Truth)

USDCx on Stacks is treated throughout CineX as a Circle xReserve-backed SIP-010 token native to Stacks. For outbound creator disbursements, the canonical settlement path is: USDCx escrow on Stacks → Stacks-side burn → xReserve attestation / destination release path → canonical USDC for Yellow Card off-ramp → NGN payout. For the purposes of this sprint, the Stacks-side burn path is not treated as dependent on legacy CCTP V1 TokenMessenger/MessageTransmitter.

### Production Passkey Wallet Requirements (insert after wallet requirements / passkey tasks)

Before mainnet launch, the passkey wallet implementation must define and test: approved RP ID / origin bindings for production and demo domains; SIP-018 structured-signing domains and payload rules; per-action nonces and replay protection; a documented recovery / lost-device / admin-init model; and a fee sponsorship / relayer policy for first-use transactions. These controls are release requirements, not post-launch enhancements.

### Risk / Assumption Note (insert in risk or architecture assumptions section)

Legacy CCTP V1 deprecation is not treated as a blocker for the Stacks-side USDCx burn path. Engineering must still verify the exact xReserve integration surface, destination release path, and any downstream forwarding assumptions used by the Bridge Orchestration Service. Any CCTP-related validation in this sprint is limited to downstream forwarding / destination-chain handling where applicable.
