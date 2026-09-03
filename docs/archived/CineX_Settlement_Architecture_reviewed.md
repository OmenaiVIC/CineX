# CineX Settlement Architecture reviewed

> Converted from PDF to Markdown. Page markers preserved for traceability.

<!-- Page 1 -->

# Reviewer Addendum — Settlement Architecture

Reviewed Copy Notice: This PDF preserves the original Settlement Architecture document intact and prepends reviewer addendum pages. Use the companion redline-ready change log for exact replacement text.

Grounding facts: (1) Stacks USDCx uses Circle xReserve and the Stacks-side burn path is not dependent on legacy CCTP V1 TokenMessenger/MessageTransmitter; (2) Yellow Card is the sole NGN off-ramp; (3) Arkadiko references are normalized to Circle xReserve references in companion documents.

Validated architecture elements: xReserve-backed USDCx on Stacks, BOS as first-class orchestration service, Yellow Card handoff, 30-minute SLA framing, swappable bridge-adapter design, and audit logging across every settlement hop.

<!-- Page 2 -->

# Page-Level Replacement Guidance

Page 2 / 8 / 12 / 13 / 28: replace legacy-CCTP blocker framing with an integration-lock framing. Recommended replacement: “The Stacks-side USDCx burn path is treated as an xReserve- native path and not as a legacy CCTP V1 TokenMessenger/MessageTransmitter dependency.

Engineering must still verify the exact xReserve attestation / destination release path and any downstream forwarding assumptions before finalizing BOS integration.” Page 27: replace “Do not integrate Bitmama — Yellow Card is the primary off-ramp” with “Do not integrate Bitmama — Yellow Card is the sole off-ramp in scope for this sprint.” Page 32 step notes: replace hardcoded V1/V2 URL language with xReserve-compatible attestation /

SDK wording and prohibit hardcoding a legacy-CCTP assumption into BOS.

<!-- Page 3 -->

# Open Decisions and Companion Files

Open engineering decision to keep visible: the Ethereum custody / relay model remains unresolved. Decide and document Gnosis Safe pass-through vs alternate explicit relay pattern before production rollout.

BOS assumption to retain: burn orchestration, attestation or SDK polling, destination release tracking, Yellow Card handoff, webhook verification, retries, monitoring, and full audit logging remain BOS responsibilities.

For exact section-by-section replacement text across the PRD, architecture PDF, and Sprint

Tracker, see CineX_Redline_Ready_Change_Log.docx /.md in this package.

<!-- Page 4 -->

# CineX — CTO Settlement

# Architecture Assessment &

# Engineering Prompts

## USDCx → NGN Flow, Bridge Orchestration

## Service, and Complete Technical Sprint

## Prompts

# Part 1: Settlement Architecture —

# Definitive CTO Assessment

## 1.1 What the Research Actually Shows

### Before any recommendation, here are the verified

### facts as of July 2026:

### On USDCx and Circle infrastructure:

### USDCx launched on Stacks mainnet December 17–

### 18, 2025 via Circle xReserve. It is a SIP-010 token, 1:1

### USDC-backed, connected directly to Circle Gateway

### and CCTP — not a third-party bridge. At launch, the

### Stacks↔Ethereum corridor was live and documented.

### Circle's Bridge Kit SDK for developer integration was

<!-- Page 5 -->

### available from Q1 2026. Additional CCTP-compatible

### networks beyond Ethereum were on the Q1 2026

### roadmap.

### On CCTP V1 vs V2 — a critical timing conflict:

### CCTP V1 (Legacy) phase-out commences July 31,

### 2026 — during your grant sprint. The xReserve/USDCx

### burn flow documented in Stacks docs uses the

### xReserve attestation service, which is distinct from

### CCTP V1/V2 but sits in the same Circle infrastructure.

### You must verify with Stacks/Circle whether the

### xReserve burn path is affected by the CCTP V1

### deprecation before building against it. This is a

### blocking question, not a detail.

### On Yellow Card:

### Yellow Card has a direct Circle partnership enabling

### real-time USDC→NGN payouts. Yellow Card explicitly

supports cryptoCurrency: USDC, cryptoNetwork:

### ETH as a settlement input for NGN offramp. Stacks is

### not among Yellow Card's supported networks. This is

### confirmed and not changing imminently.

### On the multi-hop latency:

### Standard xReserve bridge (Stacks→Ethereum): ~15

### minutes per documented attestation wait. Yellow

### Card settlement after receiving USDC on Ethereum:

### near-instant to same-day depending on NGN corridor.

### Total end-to-end: 15–30 minutes for Standard path.

<!-- Page 6 -->

## 1.2 Assessment of Your Proposed Approach

### Your proposed flow:

On-chain revenue event (Stacks) → USDCx burn on Stacks (usdcx-v1 contract, xReserve attestation) → USDC minted on Ethereum → Yellow Card Payments API (USDC/ETH →

## NGN)

→ Bank transfer / mobile money → Audit log: all tx hashes recorded back to CineX ledger

### Verdict: The flow is technically correct and is the only

### non-experimental path available today. Do not

### discard it. Adopt it with three important

### modifications.

## 1.3 What to Keep, What to Modify, What to Add

### KEEP:

### The 3-leg architecture (Stacks → Ethereum →

### Yellow Card) as the canonical settlement path

### The audit logging requirement — every hop

### produces a tx hash that must be recorded

### The SLA-based framing instead of "instant

### settlement" — this is legally and operationally

### correct

<!-- Page 7 -->

### The bridge-as-first-class-engineering-component

### principle — this is exactly right

### MODIFY:

### Modification 1 — The Ethereum leg is NOT a "custody

### boundary" risk, it is a Circle-operated relay.

### Your framing described "funds briefly existing as

### USDC on Ethereum" as a trust/custody risk. This

### overstates the risk. The xReserve burn → Ethereum

### mint flow does not involve a third-party custodian — it

### is Circle's own infrastructure. The USDC on Ethereum

### is canonical Circle-issued USDC, the same asset

### Yellow Card already processes. The risk is latency and

### gas cost, not custody. Correct this framing in all

### documents.

### Modification 2 — Build against Circle's Bridge Kit

### SDK, not raw contract calls.

### The Stacks documentation shows a raw

depositToRemote / burn approach. Circle's Bridge

### Kit SDK (available Q1 2026) abstracts this into a clean

### API with built-in retry and attestation polling. Use

### Bridge Kit as the integration surface. This reduces

### your bridge-orchestration service to state

### management and webhook handling, not raw contract

### interaction.

### Modification 3 — Set the disbursement SLA at 30

### minutes, not "instant."

### The 15-minute xReserve attestation wait is

<!-- Page 8 -->

### documented and non-negotiable on the Standard

### path. Yellow Card's NGN settlement adds 5–10

### minutes. Your SLA must be: "Funds released on

### Stacks → NGN in bank account within 30 minutes."

### This is stated explicitly to users, not hidden. For the

### gatekeeper workshop and pilot projects, this is not a

### problem — a filmmaker waiting 30 minutes for

### ₦200,000 is not in distress.

### ADD:

### Addition 1 — The Bridge Orchestration Service (BOS):

### a first-class backend microservice

### This is the most important technical addition to the

### architecture. The BOS is a Node.js service that owns

### the entire Stacks→Ethereum→Yellow Card flow. It

### must be built as if it handles real money — because it

### does. Architecture:

CineX Backend → BOS (bridge-orchestration-service) ├── Step 1: Record disbursement intent in Neon (status: PENDING) ├── Step 2: Call usdcx-v1.burn() on Stacks │ ├── Success: record Stacks burn tx hash → status: BURNED │ └── Failure: exponential backoff retry × 3 → status: BURN_FAILED → alert ├── Step 3: Poll Circle xReserve attestation service

<!-- Page 9 -->

│ ├── Attestation received: status: ATTESTED │ └── Timeout (>20 min): status: ATTESTATION_TIMEOUT → alert + manual review ├── Step 4: Submit USDC mint on Ethereum (or wait for auto-mint) │ ├── Success: record Ethereum mint tx hash → status: ETH_RECEIVED │ └── Failure: status: ETH_MINT_FAILED → alert ├── Step 5: Call Yellow Card Payments API (USDC→NGN) │ ├── Success: record Yellow Card payment ID → status:

## OFFRAMP_INITIATED

│ └── Failure: exponential backoff retry × 3 → status: OFFRAMP_FAILED → alert ├── Step 6: Poll Yellow Card webhook for NGN confirmation │ ├── Confirmed: record NGN payout reference → status: COMPLETE │ └── Timeout (>60 min): status: PAYOUT_TIMEOUT → alert + manual review └── Audit trail: all 6 steps + tx hashes written to disbursement_audit table in Neon

### Addition 2 — Time-bounded monitoring and

### automatic escalation

### Every step has a maximum allowed time window. If

<!-- Page 10 -->

### exceeded: automatic Slack/email alert to Victor +

### Theophilus + the creative's contact. No step is a black

### box. A disbursement that fails at Step 2 (burn) is a

### Stacks network issue. A disbursement that fails at

### Step 4 (Ethereum mint) is a Circle attestation issue. A

### disbursement that fails at Step 5 (Yellow Card) is a

### Yellow Card API issue. Each failure mode has a

### different recovery action and a different person

### responsible.

### Addition 3 — A non-custodial hot wallet for the

### Ethereum relay leg

### The Ethereum mint recipient address must be a

### CineX-controlled Ethereum address. This is where

### USDC lands after the xReserve bridge before Yellow

### Card receives it. This address must be:

### A non-custodial wallet controlled by the 2-of-3

### multi-sig equivalent on Ethereum (a Gnosis Safe)

### Monitored by the BOS for incoming USDC

### Authorized as a Yellow Card API sender

### Emptied on every disbursement — never used as a

### treasury

### Addition 4 — User-facing disbursement status screen

### The 30-minute wait is acceptable only if the user sees

### what's happening. The UI must show a live status

### screen: "Stacks release confirmed → Converting to

### NGN → Sending to your bank." Polling the BOS status

<!-- Page 11 -->

### endpoint every 30 seconds. Not a spinner. A real

### status trail.

## 1.4 The CCTP V1 Deprecation Risk — Action

## Required Immediately

### CCTP V1 phase-out begins July 31, 2026 — which is

### Week 5 of your grant sprint. Before building the BOS,

### Victor must answer one question:

### Does the xReserve burn path on Stacks use CCTP V1

### contracts?

### If yes: the burn flow may stop working on July 31,

### 2026, mid-sprint. You need to either:

### (a) Build against CCTP V2 from the start if Stacks

### has integrated it, or

### (b) Get written confirmation from the Stacks team

### that xReserve is not affected by the CCTP V1

### deprecation

### This is a blocking question for Week 1. Victor opens a

### GitHub issue on the Stacks repo and asks the

### question directly. Do not build the BOS without this

### answer.

<!-- Page 12 -->

## 1.5 The "Seamless for Non-Crypto Users"

## Principle — How to Achieve It

### The creative's experience must be:

1. Complete milestone work

2. Gatekeeper (backer) approves milestone

3. Creative taps "Withdraw to Bank"

4. Sees status screen: "Transfer in progress — 15–

### 30 minutes"

5. Gets a push notification: "₦XXX,XXX has been

### sent to your account"

6. Done

### The creative never sees: burn, attestation, Ethereum,

### USDC, gas, bridge, xReserve. None of it. The BOS

### hides all of this. The UI translates all BOS statuses to

### plain English.

## 1.6 Future State: When Yellow Card Supports

## USDCx Directly on Stacks

### When Yellow Card eventually adds a native

### Stacks/USDCx corridor (Circle is actively expanding

### CCTP network support), the BOS architecture allows a

### clean upgrade:

### Replace Steps 2–4 (burn + attestation + ETH

### mint) with a direct Yellow Card Stacks corridor

<!-- Page 13 -->

### call

### Steps 1, 5, 6 remain unchanged

### The audit trail format remains unchanged

### Users see no difference

### This is why the BOS must be built as a service with a

### swappable bridge adapter, not as inline code. Design

### for the upgrade from Day 1.

## 1.7 Summary Recommendation Table

Your

## CTO

Question Proposal Recommendation Yes — only non- Use the Stacks→ETH→Yellow Yes experimental Card flow? path. Keep.

Yes — build BOS Treat bridge as first- Yes as dedicated class component? microservice.

No — it's a Circle Call it a "custody relay, not third- Yes boundary" risk? party custody.

Reframe.

No — use Circle Build directly against Yes usdcx-v1 contract?

Bridge Kit SDK.

<!-- Page 14 -->

Your

## CTO

Question Proposal Recommendation Lower risk.

No — 30-minute Promise instant SLA, stated Pending settlement? explicitly to users.

No — abstract Show users the completely. Plain- Unclear bridge internals?

English status screen only.

Yes — required.

Build audit log per Yes Every tx hash hop? linked in Neon.

Blocking Verify CCTP V1 question for No deprecation impact?

Week 1. Do not skip.

Yes — swappable Design for future bridge adapter Stacks corridor No pattern from Day upgrade?

1.

<!-- Page 15 -->

# Part 2: Institutional-Grade

# Engineering Prompts by Epic

## PRE-SPRINT ZERO PROMPT: CCTP V1

## DEPRECATION VERIFICATION

## CONTEXT:

You are a senior Clarity engineer and blockchain integration architect.

CineX uses USDCx (contract: SP120SBRBQJ00MCWS7TM5R8WJNTTKD5K0HFRC2CNE.u sdcx) on Stacks mainnet. The NGN disbursement flow requires burning USDCx on Stacks and receiving USDC on Ethereum via the xReserve attestation service.

Circle has announced CCTP V1 phase-out commencing July 31, 2026.

## TASK:

Before any bridge integration code is written, answer the following questions definitively with source documentation:

1. Does the usdcx-v1 contract's burn

function use CCTP V1 contracts (specifically: TokenMessenger and MessageTransmitter) or does it use

<!-- Page 16 -->

Circle xReserve's own attestation service independently of CCTP V1?

2. If xReserve uses CCTP V1 contracts: what

is the migration path to CCTP V2, and has Stacks published a migration guide?

3. If xReserve is independent of the CCTP

V1 deprecation: provide the documentation reference confirming this.

4. What is the current state of Circle

Bridge Kit SDK support for Stacks?

Reference: docs.stacks.co/learn/bridging/usdcx

5. Is there a testnet environment available

for the Stacks→Ethereum xReserve bridge that can be used during the grant sprint?

## OUTPUT FORMAT:

A written technical brief with:

- - A definitive YES/NO answer to whether the CCTP V1 deprecation affects the CineX disbursement flow

- - The exact contract addresses and function signatures to use

- - The recommended SDK/library for integration (Bridge Kit vs raw contract)

- - A go/no-go recommendation for Week 1 BOS development

<!-- Page 17 -->

Do not write any code. Do not make assumptions. Reference only official Circle and Stacks documentation.

## EPIC 1+2 COMBINED — SPRINT 1 PROMPT:

## DEPLOYMENT SCRIPTS + MAINNET DELIVERY

## CONTEXT ANCHOR:

All 19 CineX Clarity smart contracts are deployed and passing tests on Stacks testnet. This sprint writes the production deployment scripts, adds DEMO_MODE infrastructure, and executes mainnet deployment in the correct contract dependency order.

DO NOT rewrite or modify any existing contract logic unless a bug bounty finding requires it. DO NOT introduce new contracts.

CONTRACT DEPENDENCY ORDER (strict — violating this causes deployment failure):

1. cinex-multisig.clar

2. timelock.clar (depends: cinex-multisig)

3. asset-registry.clar (depends: timelock,

cinex-multisig)

4. oracle-proxy.clar (depends: cinex-

multisig)

5. reputation.clar (depends: cinex-

multisig, project-verification-module —

<!-- Page 18 -->

circular: deploy with placeholder, update post-deploy)

6. crowdfunding-module.clar (pre-existing,

verify deployment only)

7. project-verification-module.clar ★

HEADLINE (depends: cinex-multisig, timelock)

8. milestone-escrow.clar ★ HEADLINE

(depends: cinex-multisig, timelock, project-verification-module, crowdfunding- module)

9. milestone-verification.clar (depends:

milestone-escrow, crowdfunding-module)

10. yield-escrow.clar (depends: milestone-

escrow, milestone-verification, cinex- multisig)

11. bitflow-strategy.clar (depends: yield-

escrow, cinex-multisig)

12. funding-pool.clar (depends: reputation,

milestone-escrow, cinex-multisig)

## TASK 1A — DEPLOYMENT SCRIPTS:

Write a Clarinet deployment script (deploy.ts or deploy.sh) that:

- - Deploys all 19 contracts in the exact order above

- - After each contract deploy, calls Stacks Explorer API to verify the contract is live before proceeding to the next

- - On any deployment failure, halts immediately and logs the exact error and which contract failed — does NOT continue and does NOT attempt rollback

<!-- Page 19 -->

- - Records the deployed contract address of each contract to a deployment-manifest.json file after each successful deploy

- - Accepts a NETWORK flag: testnet | mainnet (testnet is the default; mainnet requires an explicit --network=mainnet flag AND an interactive confirmation prompt before any mainnet transaction)

- - Uses the Stacks.js library and reads the deployer private key from environment variable STACKS_DEPLOYER_KEY — never hardcodes keys NON-GOALS for Task 1A:

- - Do not write contract logic

- - Do not write migration scripts

- - Do not write test files — existing tests are already passing DEFINITION OF DONE for Task 1A: [ ] Script deploys all 19 contracts in correct order on testnet with no errors [ ] Script halts on failure and logs the failing contract name [ ] deployment-manifest.json written with all 19 addresses [ ] Stacks Explorer verification call confirms each contract after deploy [ ] Script requires explicit -- network=mainnet + confirmation for mainnet

## TASK 1B — DEMO_MODE ORACLE PROXY:

The current oracle-proxy.clar returns real

<!-- Page 20 -->

STX/USD price from admin feed.

Add a deployment variant for devnet/testnet that:

- - Returns STX price = 0 when DEMO_MODE=true is set at deploy time

- - When STX price = 0, the pay-verification- fee function in project-verification-module.clar computes fee = 0 STX

- - When fee = 0 STX, treat it as a no-op and auto-grant Basic Verified status to the calling principal

- - This bypass must be IMPOSSIBLE to trigger on mainnet — enforce via a deploy-time constant, not a runtime flag TECHNICAL CONSTRAINTS for Task 1B:

- - Use Clarity's (define-constant DEMO_MODE ...) — not a data-var

- - The mainnet deploy MUST NOT include the DEMO_MODE=true constant

- - Add a (asserts! (is-eq DEMO_MODE false)

## ERR_DEMO_MODE_ON_MAINNET)

guard to the pay-verification-fee function that fails loudly if somehow triggered on mainnet DEFINITION OF DONE for Task 1B: [ ] DEMO_MODE constant present in testnet oracle-proxy deploy [ ] DEMO_MODE absent from mainnet oracle- proxy deploy [ ] Basic Verified auto-granted on testnet

<!-- Page 21 -->

when DEMO_MODE=true [ ] pay-verification-fee returns ERR_DEMO_MODE_ON_MAINNET on mainnet if somehow called with DEMO_MODE=true

## TASK 1C — TESTNET BYPASS ADMIN FUNCTION:

Add a Clarity function to project- verification-module.clar:

- - (define-public (admin-grant-basic- verified (principal principal)))

- - Only callable by the cinex-multisig contract principal

- - Sets the verification tier of the given principal to BASIC without requiring fee payment

- - Emits a (print {event: "admin-grant- basic-verified", principal: principal}) event

- - ONLY deployed on testnet — not included in mainnet deploy DEFINITION OF DONE for Task 1C: [ ] Function exists in testnet project- verification-module [ ] Function is NOT in mainnet deploy (build system enforces this) [ ] Function is only callable by cinex- multisig principal [ ] Print event emitted on successful call [ ] Unit test: non-multisig call returns

## ERR_UNAUTHORIZED

## GLOBAL NON-GOALS FOR EPIC 1+2 CONTRACT

## SPRINT:

<!-- Page 22 -->

- - Do not modify milestone-escrow.clar business logic

- - Do not modify milestone-verification.clar voting weights

- - Do not modify yield-escrow.clar split ratios

- - Do not add new contracts

- - Do not change error code ranges (ranges are finalized and documented)

- - Do not introduce any upgradeable proxy pattern — contracts are immutable

## EPIC 1+2 — SPRINT 2 PROMPT: NEON

## MIGRATION

## CONTEXT ANCHOR:

CineX backend runs Node.js on Render with PostgreSQL on Render's managed Postgres. The existing schema is in backend/src/database.js and backend/src/migrations/. This sprint migrates the database to Neon (serverless PostgreSQL) with zero data loss and zero application code changes.

## TASK:

1. Create a Neon project named "cinex-

production"

2. Create three branches: main, epic1-

contracts, epic2-wallet

3. Execute: pg_dump from Render Postgres →

<!-- Page 23 -->

pg_restore to Neon main branch

4. Update the following environment

variables across all environments:

- - Vercel project: DATABASE_URL

- - Local .env files: DATABASE_URL

- - Render backend service: DATABASE_URL The connection string format for Neon is: postgresql://[user]: [password]@[host]/[dbname]?sslmode=require

5. Add the @neondatabase/serverless npm

package and configure it as the connection driver for all serverless/edge functions (if any exist in the codebase). Standard pg driver continues to be used for the Node.js server process.

6. Add a Neon connection pool

configuration:

- - Use Neon's built-in PgBouncer pooler (pooled connection string)

- - Set max pool size = 10

- - Add a health check endpoint GET /health that returns database connection status — returns 200 if connected, 503 if not

7. Run a 7-day parallel operation: both

Render Postgres and Neon active.

After 7 days with zero discrepancies, decommission Render Postgres.

<!-- Page 24 -->

## TECHNICAL CONSTRAINTS:

- - Zero application code changes outside of connection string configuration

- - If any ORM (Prisma, Drizzle, Knex, TypeORM, or raw pg) is currently in use, identify it first and use its native Neon adapter if available

- - Do not migrate Supabase auth state — CineX uses Pillar Wallet for auth, not Supabase Auth. Supabase is only used for database storage.

- - All existing migrations in backend/src/migrations/ must run successfully against Neon without modification

## DEFINITION OF DONE:

[ ] pg_dump → pg_restore completed with zero errors [ ] Row counts match between Render Postgres and Neon for all tables [ ] Backend connects to Neon. GET /health returns 200.

[ ] No application code changed except

## DATABASE_URL

[ ] 7-day parallel run with zero discrepancies logged [ ] Render Postgres and Supabase marked for decommission

## NON-GOALS:

- - Do not migrate to a different ORM

- - Do not change the schema

- - Do not add new tables — that belongs to

<!-- Page 25 -->

the feature sprint that needs them

- - Do not enable Supabase features (auth, storage, realtime) — replace Supabase entirely, do not extend it

## EPIC 1+2 — SPRINT 3 PROMPT: PILLAR

## WALLET + PASSKEY INTEGRATION

## CONTEXT ANCHOR:

CineX frontend is React + TypeScript + Vite hosted on Vercel.

The backend is Node.js + PostgreSQL (Neon) on Render.

All 19 Clarity contracts are deployed on Stacks testnet.

This sprint integrates Pillar Wallet for seedless passkey login and builds the deposit/withdraw/sign transaction flows.

## CRITICAL CONSTRAINT — NON-CRYPTO-NATIVE

## USERS:

Every string visible to the user must be in plain English. No exception.

The following words and phrases are PROHIBITED in any user-facing string: "seed phrase", "private key", "wallet address", "principal", "Clarity", "Stacks", "Bitcoin Layer 2", "gas", "STX", "USDCx" (use "digital dollars"), "burn", "mint", "attestation", "escrow"

<!-- Page 26 -->

(use "held funds"), "smart contract"

## TASK A — PILLAR WALLET SDK INTEGRATION:

Integrate Pillar Wallet SDK into the CineX frontend:

1. Account Creation:

- - User taps "Create Account"

- - Pillar SDK initiates WebAuthn credential creation

- - On success: Pillar creates a smart wallet associated with the WebAuthn credential, returns a wallet address

- - CineX backend stores: {userId, pillarWalletAddress, createdAt}

- - User sees: "Your account is ready" (not "Wallet created")

- - No seed phrase shown at any point — if the Pillar SDK shows one by default, suppress it entirely

2. Login:

- - User taps "Sign In"

- - WebAuthn prompt appears (device biometric or PIN)

- - On success: Pillar SDK returns session + wallet address

- - CineX fetches user profile from backend using wallet address as key

- - If this is the first login after workshop: redirect to onboarding wizard

3. Transaction Signing (Stacks contract

<!-- Page 27 -->

calls):

- - User triggers an action (e.g., "Submit Milestone Proof")

- - CineX prepares the Stacks transaction (Stacks.js)

- - Pillar SDK signs the transaction using the WebAuthn credential

- - Signed transaction broadcast to Stacks network via Hiro API

- - UI shows loading state: "Submitting..." (not "Broadcasting transaction")

- - On confirmation: success toast in plain English

- - On failure: plain English error from ContractErrorMap.ts

## TECHNICAL CONSTRAINTS:

- - Use Pillar Wallet SDK — do not use Leather or Xverse as primary (they are fallbacks for power users only)

- - WebAuthn credential must be associated with a Stacks principal that can sign Stacks.js transactions

- - Session management: store session state in React context + localStorage (localStorage is acceptable here — this is auth state, not contract state)

- - Never store the Stacks private key in localStorage, sessionStorage, or any browser storage TASK B — DEPOSIT FLOW (Backer USDCx → CineX Escrow):

<!-- Page 28 -->

Build the deposit flow for backers:

1. Backer taps "Back This Project"

2. Input field: "How much would you like to

contribute?" (USD)

3. Show computed USDCx equivalent (call

oracle-proxy.clar::get-stx-price for current rate, but display in USD — user never sees USDCx amount)

4. Confirm screen: "You are contributing

$XXX to [Campaign Name]"

5. Pillar SDK signs the USDCx transfer to

milestone-escrow.clar

6. Loading state: "Securing your

contribution..." (30s timeout with retry)

7. Success: "Your $XXX is secured. You'll

be notified when milestones are ready for review."

8. Failure states (from

ContractErrorMap.ts):

- - ERR_INSUFFICIENT_BALANCE: "You don't have enough funds. Please add funds to your account first."

- - ERR_CAMPAIGN_NOT_ACTIVE: "This campaign is no longer accepting contributions."

- - Network timeout: "The network is slow. We'll retry automatically. Please don't close this screen."

## TASK C — YELLOW CARD NGN WITHDRAWAL FLOW

## (OFF-RAMP):

Build the withdrawal flow for creatives (milestone funds to NGN):

<!-- Page 29 -->

1. Creative taps "Withdraw Funds" on a

completed milestone

2. Show: "₦X,XXX,XXX available for this

milestone" (fetch amount from milestone- escrow.clar, convert via Astrum API rate)

3. Input: bank account details (if not

saved) OR show saved account

4. Confirm screen: "Send ₦X,XXX,XXX to

[Bank] account ending XXXX?

This usually takes 15–30 minutes."

5. Creative taps "Confirm"

6. CineX backend initiates the Bridge

Orchestration Service (BOS) [NOTE: BOS is built in a separate sprint — for now, use a stub that calls Yellow Card sandbox API directly with mocked Ethereum USDC]

7. Show disbursement status screen (see

## TASK D)

## IMPORTANT — DO NOT BUILD THE ACTUAL BRIDGE

## IN THIS SPRINT.

The bridge (Stacks→Ethereum→Yellow Card) is built in the BOS sprint.

This sprint builds the UI flow with a Yellow Card sandbox stub.

The stub simulates a successful Yellow Card payment response after a 5-second delay and returns a mock payment

## ID.

## DEFINITION OF DONE:

<!-- Page 30 -->

[ ] Passkey account creation works — no seed phrase shown [ ] Passkey login works — biometric/PIN prompt appears [ ] Stacks contract call signed via Pillar SDK and broadcast successfully [ ] Deposit flow completes end-to-end on testnet [ ] Withdrawal flow triggers Yellow Card sandbox stub [ ] All user-facing strings pass the PROHIBITED WORDS check above [ ] ContractErrorMap.ts handles all error cases with plain English messages [ ] Loading states present for all async operations [ ] Session survives page refresh (localStorage auth state)

## NON-GOALS:

- - Do not build the actual Stacks→Ethereum bridge — that's the BOS sprint

- - Do not build Leather/Xverse fallback — that's a post-grant feature

- - Do not build the admin wallet management

## UI

- - Do not integrate Bitmama — Yellow Card is the primary off-ramp

## EPIC 2 SPRINT — BRIDGE ORCHESTRATION

## SERVICE (BOS)

<!-- Page 31 -->

## CONTEXT ANCHOR:

CineX backend is Node.js on Render, database is Neon PostgreSQL.

The Pillar wallet integration is complete.

Yellow Card API credentials are confirmed. The CCTP V1 deprecation question has been answered (prerequisite: confirm this before starting).

This sprint builds the Bridge Orchestration Service — the backend microservice that owns the entire USDCx→Ethereum→NGN settlement path.

This is the most critical piece of infrastructure CineX will build.

Treat it as if every bug means a creative doesn't get paid.

## ARCHITECTURE:

The BOS is a standalone Node.js module within the CineX backend.

It is NOT a separate microservice deployment — it runs in the same Render process but is architecturally isolated:

- - /backend/src/bos/index.ts — BOS entry point

- - /backend/src/bos/steps/ — one file per settlement step

- - /backend/src/bos/adapters/ — swappable bridge adapters

- - /backend/src/bos/monitor.ts — status

<!-- Page 32 -->

polling and timeout alerts DATABASE SCHEMA (add to Neon via migration): ```sql CREATE TABLE disbursements ( id UUID PRIMARY KEY DEFAULT gen_random_uuid(), campaign_id TEXT NOT NULL, milestone_index INTEGER NOT NULL, creative_principal TEXT NOT NULL, creative_bank_account_id TEXT NOT NULL, amount_usdcx NUMERIC(20,6) NOT NULL, amount_ngn NUMERIC(20,2), status TEXT NOT NULL DEFAULT 'PENDING',

## -- PENDING → BURN_INITIATED → BURNED →

## ATTESTED → ETH_RECEIVED →

## -- OFFRAMP_INITIATED → NGN_CONFIRMED →

## COMPLETE

-- Or: BURN_FAILED | ATTESTATION_TIMEOUT

## | ETH_MINT_FAILED |

## -- OFFRAMP_FAILED | PAYOUT_TIMEOUT

stacks_burn_tx_hash TEXT, stacks_burn_block INTEGER, ethereum_mint_tx_hash TEXT, ethereum_recipient_address TEXT, yellow_card_payment_id TEXT, yellow_card_reference TEXT, ngn_payout_reference TEXT, error_message TEXT, retry_count INTEGER DEFAULT 0, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW(), completed_at TIMESTAMPTZ,

<!-- Page 33 -->

sla_deadline TIMESTAMPTZ -- set to NOW() + 30 minutes on creation ); CREATE INDEX idx_disbursements_status ON disbursements(status); CREATE INDEX idx_disbursements_campaign ON disbursements(campaign_id, milestone_index);

## CREATE UNIQUE INDEX

idx_disbursements_unique ON disbursements(campaign_id, milestone_index); -- One disbursement per campaign milestone — idempotency key

### STEP 1 — STACKS BURN:

### File: /backend/src/bos/steps/step1-stacks-burn.ts

// Inputs: disbursementId, usdcxAmount (in microUSDCx, 6 decimals), // ethereumRecipientAddress (Gnosis Safe address) // Process: // 1. Load disbursement record from Neon — assert status === 'PENDING' // 2. Encode ethereumRecipientAddress as bytes32 (left-pad with 11 zero bytes // + version byte + 20-byte hash160, as per Stacks bridging docs) // 3. Call usdcx-v1::burn(amount, ethereumDomain=1, nativeRecipient=bytes32) // using Stacks.js with the CineX

<!-- Page 34 -->

relay wallet private key // (from env: STACKS_RELAY_WALLET_KEY — never hardcode) // 4. On success: update disbursement status → BURN_INITIATED, // record stacks_burn_tx_hash // 5. Poll Stacks API until transaction is confirmed (max 10 min): // GET /extended/v1/tx/{txHash} — check tx_status === 'success' // 6. On confirmed: update status → BURNED, record stacks_burn_block // 7. On failure or 10-min timeout: // - increment retry_count // - if retry_count < 3: schedule retry with 2^retry_count minute delay // - if retry_count >= 3: set status → BURN_FAILED, trigger alert

## // CRITICAL:

// - Check for idempotency before calling burn: if a BURN_INITIATED // record exists for this campaign_id + milestone_index, do NOT // initiate a second burn — poll the existing tx hash instead // - Never burn twice for the same milestone

### STEP 2 — ATTESTATION POLLING:

### File: /backend/src/bos/steps/step2-attestation-poll.ts

// Inputs: disbursementId, stacksBurnTxHash, stacksBurnBlock

<!-- Page 35 -->

// Process: // 1. Poll Circle xReserve attestation service: // GET https://iris- api.circle.com/v1/attestations/{burnTxHash} // (or Bridge Kit SDK equivalent — use SDK if available) // 2. Poll every 30 seconds for up to 20 minutes // 3. On attestation received: update status → ATTESTED // Record attestation bytes in disbursement record (attestation_bytes column) // 4. On 20-minute timeout: set status → ATTESTATION_TIMEOUT, trigger alert // Note: The attestation service URL may differ from CCTP V1 to V2.

// Verify the correct URL with Stacks documentation before hardcoding.

### STEP 3 — ETHEREUM MINT:

### File: /backend/src/bos/steps/step3-ethereum-mint.ts

// Inputs: disbursementId, attestationBytes // Process: // 1. Submit attestation to Ethereum xReserve/CCTP contract to trigger // USDC mint to the CineX Gnosis Safe address // (or await auto-mint if xReserve handles this automatically) // 2. Use viem (preferred) or ethers.js

<!-- Page 36 -->

to submit the mint tx on Ethereum // ETH relay wallet key from env:

## ETH_RELAY_WALLET_KEY

// 3. On mint confirmed: update status →

## ETH_RECEIVED,

// record ethereum_mint_tx_hash // 4. On failure: retry × 3 with exponential backoff // If all retries fail: status → ETH_MINT_FAILED, trigger alert

## // CRITICAL:

// - Verify Gnosis Safe address has no USDC balance from a failed prior // attempt before initiating Yellow Card in Step 4 // - The Gnosis Safe address must be whitelisted as a Yellow Card API sender

### STEP 4 — YELLOW CARD OFFRAMP:

### File: /backend/src/bos/steps/step4-yellow-card.ts

// Inputs: disbursementId, usdcAmountOnEthereum, creativeBankAccountId // Process: // 1. Call Yellow Card Payments API: // POST /business/payments // { // "sequenceId": disbursementId, // idempotency key // "type": "payout", // "amount": usdcAmount, // "currency": "USDC", // "cryptoNetwork": "ETH",

<!-- Page 37 -->

// "destinationType": "bank", // "destination": { creativeBankAccountDetails }, // "reason": "Creative milestone payment — CineX" // } // 2. On 200 response: update status →

## OFFRAMP_INITIATED,

// record yellow_card_payment_id // 3. On 4xx response: do NOT retry (likely bad request) → OFFRAMP_FAILED + alert // 4. On 5xx response: retry × 3 with exponential backoff → OFFRAMP_FAILED + alert

## // CRITICAL:

// - Use disbursementId as sequenceId — Yellow Card uses this for idempotency // - If Yellow Card returns "payment already exists" for this sequenceId, // treat it as success and fetch the existing payment status // - Never call Yellow Card twice with the same sequenceId

### STEP 5 — NGN CONFIRMATION (WEBHOOK):

### File: /backend/src/bos/steps/step5-ngn-confirm.ts

// Yellow Card sends a webhook when NGN payout is confirmed // Webhook endpoint: POST /api/bos/yellow- card-webhook // Process:

<!-- Page 38 -->

// 1. Verify webhook signature using Yellow Card's HMAC key // (from env:

## YELLOW_CARD_WEBHOOK_SECRET)

// 2. On event type "payment.completed": // - Find disbursement by yellow_card_payment_id // - Update status → COMPLETE // - Record ngn_payout_reference, completed_at // - Trigger push notification to creative: "₦XXX,XXX has arrived in your account" // 3. On event type "payment.failed": // - Update status → PAYOUT_TIMEOUT // - Trigger alert to ops team // 4. Fallback polling: if no webhook received within 60 min of

## OFFRAMP_INITIATED,

// poll GET /business/payments/{yellow_card_payment_id} every 5 min // Until status === "completed" or 90 min total timeout

### MONITORING AND ALERTING:

### File: /backend/src/bos/monitor.ts

// Run on a cron schedule every 5 minutes // Alert conditions (send to Slack webhook + email): // - Any disbursement in BURN_INITIATED for > 10 minutes

<!-- Page 39 -->

// - Any disbursement in ATTESTED for > 20 minutes // - Any disbursement in ETH_RECEIVED for > 10 minutes // - Any disbursement in OFFRAMP_INITIATED for > 60 minutes // - Any disbursement past its sla_deadline without COMPLETE status // - Any disbursement in *_FAILED or *_TIMEOUT status (immediate alert) // Alert message must include: // - disbursementId // - campaignId + milestoneIndex // - creativeId // - Amount in USDCx and estimated NGN // - Current status and time in current status // - All tx hashes recorded so far

### BRIDGE ADAPTER PATTERN (for future Yellow Card

### Stacks corridor):

### File: /backend/src/bos/adapters/bridge-

### adapter.interface.ts

interface BridgeAdapter { // Returns the Ethereum USDC amount after bridging bridge(params: { usdcxAmount: number; stacksBurnTxHash?: string; // optional — some future adapters may not need burn ethereumRecipient: string; }): Promise<{ ethereumMintTxHash: string;

<!-- Page 40 -->

usdcAmountOnEth: number }>; } // Current implementation: class XReserveBridgeAdapter implements BridgeAdapter {... } // Future implementation (when Yellow Card supports Stacks directly): class DirectStacksYellowCardAdapter implements BridgeAdapter { // Steps 1-3 (burn + attestation + ETH mint) replaced by direct API call // Steps 4-5 (Yellow Card + NGN confirmation) unchanged }

### USER-FACING STATUS SCREEN:

### The frontend must poll GET /api/bos/disbursement-

### status/{disbursementId}

### every 30 seconds and display plain-English status:

PENDING → "Getting ready..." BURN_INITIATED → "Releasing your funds from the project account..." BURNED → "Funds released.

Converting to Naira..." ATTESTED → "Conversion verified.

Sending to Yellow Card..." ETH_RECEIVED → "Almost there. Sending to your bank..." OFFRAMP_INITIATED → "Payment sent. Your bank will receive it shortly."

<!-- Page 41 -->

COMPLETE → "₦XXX,XXX has been sent to your [Bank] account. ✓" *_FAILED → "Something went wrong.

Our team has been notified and will resolve this within 2 hours." *_TIMEOUT → "This is taking longer than expected. Our team has been notified. Please don't submit another request."

### DEFINITION OF DONE:

### [ ] Disbursements table created in Neon with all

### columns and indexes

### [ ] Step 1 (Stacks burn) functional on testnet —

### idempotency verified

### [ ] Step 2 (attestation polling) functional — polling loop

### + timeout

### [ ] Step 3 (Ethereum mint) functional on Sepolia

### testnet

### [ ] Step 4 (Yellow Card sandbox) functional —

### idempotency via sequenceId

### [ ] Step 5 (webhook handler) functional — HMAC

### signature verified

### [ ] Monitor cron running every 5 minutes — alert fires

### on stuck disbursement

### [ ] Bridge adapter interface implemented —

### XReserveBridgeAdapter is default

### [ ] Status screen polling endpoint returns correct plain-

### English status

<!-- Page 42 -->

### [ ] End-to-end test: testnet USDCx → Sepolia USDC →

### Yellow Card sandbox → mock NGN

### NON-GOALS:

### Do not build mainnet BOS until testnet is fully

### verified

### Do not build the admin dashboard for manual

### intervention (post-grant)

### Do not add support for multiple currencies beyond

### USDCx → NGN

### Do not build the ILP adapter (that is Epic 6,

### conditional)

---

## ### EPIC 3 TIER 1 — FRONTEND SPRINT PROMPT:

## WALLET UI

### CONTEXT ANCHOR:

### Phase 0 frontend infrastructure is committed to

### feature/pivot-infrastructure.

### This includes: ContractErrorMap.ts (120+ error

### codes), transactionRetry.ts,

### LoadingSkeleton.tsx, NetworkDowntimeBanner.tsx,

### BonusEligibilityBadge.tsx,

### ErrorBoundary, and the landing page at cine-x-

### iota.vercel.app.

<!-- Page 43 -->

### Pillar Wallet passkey login is integrated. Backend

### connects to Neon.

### All Clarity contracts are on Stacks mainnet.

### This sprint builds the Tier 1 wallet UI — the grant

### deliverable frontend.

### Tier 2 features (profiles, pools, activity feed, AI

### summary) are NOT in scope.

### WEEK 5 PRIORITY — DEMO MODE FIRST,

### EVERYTHING ELSE SECOND:

### Demo mode must ship by end of Week 5 Day 3. It is

### required for the

### Week 10 Jos gatekeeper workshop. If it doesn't ship,

### 10+ workshop

### participants cannot onboard. This is a hard deadline.

### DEMO MODE IMPLEMENTATION:

### File: /src/contexts/DemoModeContext.tsx

// DemoModeContext provides: // - isDemoMode: boolean (true when VITE_USE_MOCK_DATA=true OR when user // selects "Explore without account" on the landing page) // - demoUser: { role: 'creative' | 'backer' | 'gatekeeper', name: string, // usdcxBalance: 5000, ngnBalance: 4500000, verificationTier: 'BASIC' } // - demoContracts: mock implementations of all contract read functions // that return realistic seed data

<!-- Page 44 -->

// Rules: // - Demo mode never writes to any contract or database // - Demo mode never calls Pillar Wallet

## SDK

// - ALL contract calls are mocked — no real Stacks network calls // - Demo user always has BASIC Verified status (no fee prompt shown) // - Demo campaigns: 2 pre-seeded campaigns (Death of Eternity, Rain) // with realistic milestone data and escrow balances

### DEMO SEED DATA:

### Pre-seed the following in DemoModeContext:

const DEMO_CAMPAIGNS = [ { id: "demo-campaign-001", title: "Death of Eternity", creative: "Achor Yusuf", totalTarget: 9000, currentEscrow: 9000, milestones: [ { index: 0, description: "Screenplay & Storyboards", amount: 2250, status: "APPROVED", releaseDate: "2026-07-15" }, { index: 1, description: "Pre- production & Casting", amount: 2250, status: "PENDING_APPROVAL", proofUrl: "https://..." },

<!-- Page 45 -->

{ index: 2, description: "Principal Photography", amount: 2250, status: "NOT_STARTED" }, { index: 3, description: "Post- production & Delivery", amount: 2250, status: "NOT_STARTED" }, ], backerCount: 3, verificationTier: "BASIC", }, //... Rain campaign ]

### ONBOARDING WIZARD:

### File: /src/pages/OnboardingWizard.tsx

### Steps (max 7 total):

1. "What brings you to CineX?" → [I want funding for

### my project] [I want to fund projects] [I represent a

### creative guild]

2. Role-specific: Creative → "Tell us about your

### project" | Backer → "What kind of projects interest

### you?" | Gatekeeper → "Which organisation do you

### represent?"

3. "Create your account" → Passkey creation (Pillar

### SDK) OR "Explore first" → Demo mode

4. Role-specific profile completion (2 fields max)

5. "You're in!" → redirect to role-appropriate

### dashboard

<!-- Page 46 -->

### Rules:

### Never more than 7 steps

### Back button on every step

### Progress indicator (1 of 7)

### "Explore first" option visible on Step 3 — always

### No blockchain terminology in any label or

### placeholder

### WALLET DASHBOARD:

### File: /src/pages/WalletDashboard.tsx

### Layout:

### Top: Greeting + NGN balance (large) + USD

### equivalent (small, secondary)

### Middle: Quick actions: "Add Funds" | "Withdraw" |

### "View Campaigns"

### Bottom: Recent activity (last 3 transactions, plain

### English descriptions)

### Data sources:

### NGN balance: Neon backend (off-chain ledger)

### USD equivalent: Astrum API rate × NGN balance

### Recent activity: GET /api/user/transactions

### (backend endpoint)

### USDCx balance: call milestone-escrow.clar::get-

### user-escrow-balance

<!-- Page 47 -->

### (read-only, no gas) — display as "Funds in escrow:

### $X"

### Rules:

### If any data fails to load: show LoadingSkeleton,

### not blank/error

### Balance refreshes every 60 seconds (not on every

### render)

### In demo mode: show DEMO_CAMPAIGNS

### balances

### CAMPAIGN CREATION:

### File: /src/pages/CreateCampaign.tsx

### Fields:

1. Project title (text, max 100 chars)

2. Project type (film | music | game | fashion | other)

3. Description (textarea, max 500 chars)

4. Funding goal ($) — with tier cap enforcement:

### If user is UNVERIFIED: max $1,000. Show

### inline note:

### "Your current limit is $1,000. Upgrade to raise

### more."

### If BASIC: max $10,000

### If STANDARD: no limit

5. Milestones (minimum 2, maximum 8):

### Each: description + amount ($)

<!-- Page 48 -->

### Sum of milestone amounts must equal

### funding goal

### Validation fires inline, not on submit

### Submission:

1. Frontend validates all fields

2. Call backend: POST /api/campaigns (backend

### stores off-chain metadata)

3. Backend calls project-verification-

### module.clar::create-campaign

4. Show "Creating your campaign..." loading state

5. On success: redirect to campaign detail page

6. On failure: show ContractErrorMap.ts message

### NON-GOALS FOR EPIC 3 TIER 1:

### Do not build user profiles, portfolio, rating, or

### reputation displays

### Do not build pool/tribe pages

### Do not build activity feed

### Do not build AI credibility summary

### Do not build admin dashboard

### Do not build notification settings

### Do not add Leather/Xverse wallet fallback

### Do not integrate ILP — that is Epic 6

### DEFINITION OF DONE:

### [ ] Demo mode live at demo.cinex.vercel.app — no

<!-- Page 49 -->

### wallet, no blockchain calls

### [ ] Onboarding wizard completes in ≤7 steps

### [ ] Wallet dashboard shows real mainnet balances

### (non-demo)

### [ ] Campaign creation submits to project-verification-

### module.clar on mainnet

### [ ] Tier cap enforcement: >$1,000 input as Unverified

### shows upgrade prompt

### [ ] Escrow status display: live data from milestone-

### escrow.clar (not mocked)

### [ ] Fund release flow: backer approval vote functional

### on mainnet

### [ ] Mobile responsive: 375px / 768px / 1024px verified

### [ ] All user-facing strings pass the PROHIBITED

### WORDS check

### [ ] LoadingSkeleton shown on all data-loading states

---

## ### EPIC 3 TIER 2 — FRONTEND SPRINT PROMPT:

## PROFILES, POOLS, ACTIVITY FEED, AI SUMMARY

### CONTEXT ANCHOR:

### Tier 1 is complete and live at app.cinex.vercel.app.

### Demo mode is live at demo.cinex.vercel.app.

### This sprint ships Tier 2: the social-reputation layer of

### CineX.

### These features use the contracts already deployed on

<!-- Page 50 -->

### mainnet:

### reputation.clar (profiles, ratings), funding-pool.clar

### (pools).

### These features are NOT grant deliverables. Build them

### correctly,

### not quickly. Quality over speed.

### TASK A — USER PROFILES:

### Files: /src/pages/ProfilePage.tsx,

### /src/pages/EditProfilePage.tsx,

### /src/components/PortfolioCard.tsx

### Profile data model:

### on-chain (from reputation.clar): verificationTier,

### reputationScore,

### endorsementCount, completedMilestoneCount,

### ratingAverage

### off-chain (Neon): displayName, bio,

### portfolioItems, socialLinks,

### profileImageUrl, bankAccountDetails (encrypted,

### backend only)

### ProfilePage layout:

### Header: avatar + name + verification tier badge +

### reputation score

### Section: "Past Projects" — portfolio cards showing

### completed campaigns

<!-- Page 51 -->

### Section: "Endorsements" — list of on-chain

### gatekeeper endorsements

### (read from reputation.clar::get-endorsements)

### Section: "Reviews" — ratings received (from

### reputation.clar::get-ratings)

### Rules:

### Reputation score and endorsements are read

### directly from mainnet contracts

### Portfolio items and bio are editable off-chain (PUT

### /api/user/profile)

### Bank account details are NEVER shown in the UI

### after initial setup —

### only show last 4 digits of account number

### Verification tier badge: "Unverified" (grey) | "Basic"

### (blue) | "Standard" (gold)

### TASK B — RATING SYSTEM:

### Files: /src/pages/RateUserPage.tsx,

### /src/components/StarRating.tsx,

### /src/components/RatingForm.tsx

### Rules:

### Only a backer who has funded a creative's

### campaign can rate that creative

### Only a creative can rate a backer they've worked

### with

### Ratings: 1–5 stars + optional 200-char text review

<!-- Page 52 -->

### On-chain storage: call reputation.clar::submit-

### rating(principal, score, commentHash)

### The comment text is stored off-chain (Neon). The

### hash is stored on-chain.

### This means the comment is verifiable (hash

### matches) but not permanently

### on-chain (gas efficient).

### Anti-gaming: one rating per direction per

### campaign

### TASK C — TRIBE/POOL HOMEPAGE:

### Files: /src/pages/PoolsPage.tsx,

### /src/components/PoolCard.tsx,

### /src/components/ProposalCard.tsx

### Pool actions (all via funding-pool.clar):

### Create pool: requires reputation score ≥ 50

### (enforced on-chain)

### Join pool: requires gatekeeper endorsement

### (enforced on-chain)

### Contribute: same flow as campaign backing (Pillar

### SDK sign)

### Propose allocation: form → funding-

### pool.clar::propose-allocation

### Vote: YES/NO buttons → funding-pool.clar::vote-

### on-proposal

### Execute allocation: only after vote passes →

### funding-pool.clar::execute-allocation

<!-- Page 53 -->

### User-facing names:

### "Pool" → "Creative Fund"

### "Propose allocation" → "Nominate a project for

### funding"

### "Vote" → "Vote on this nomination"

### "Reputation score" → "Trust score" (still show the

### number, just rename it)

### TASK D — ACTIVITY FEED:

### Files: /src/pages/ActivityFeedPage.tsx,

### /backend/src/indexer/event-indexer.ts

### The indexer subscribes to Stacks blockchain events

### from all 19 contracts

### and writes them to an events table in Neon:

CREATE TABLE on_chain_events ( id UUID PRIMARY KEY DEFAULT gen_random_uuid(), contract TEXT NOT NULL, event_type TEXT NOT NULL, principal TEXT, campaign_id TEXT, milestone_index INTEGER, amount NUMERIC(20,6), tx_hash TEXT NOT NULL, block_height INTEGER NOT NULL, created_at TIMESTAMPTZ DEFAULT NOW() );

<!-- Page 54 -->

### Event types to index:

### milestone-escrow: campaign-created, backer-

### deposited, milestone-released

### milestone-verification: vote-submitted, milestone-

### approved

### reputation: rating-submitted, endorsement-added

### funding-pool: pool-created, member-joined,

### proposal-created, allocation-executed

### Feed display rules:

### Global feed: all events, newest first

### User feed: events involving the logged-in user's

### principal

### Campaign feed: events for a specific campaign

### Plain English descriptions: "Achor Yusuf

### submitted proof for Milestone 2"

### (not "milestone-verification::vote-submitted event

### emitted")

### TASK E — AI CREDIBILITY SUMMARY:

### Files: /src/components/AICredibilityModal.tsx,

### /backend/src/services/aiService.ts

### This feature calls the Claude API (claude-sonnet-4-6

### model) to generate

### a 2-3 sentence plain-English summary of a creative's

### on-chain track record.

### Backend:

<!-- Page 55 -->

// POST /api/ai/credibility-summary // Input: { principalId: string } // 1. Fetch on-chain data: completedMilestones, ratingAverage, // endorsementCount, campaignCount, totalFunded (from contract reads) // 2. Call Claude API with system prompt: // "You are a concise, factual financial analyst writing for // non-crypto-native investors in Nigeria's creative economy.

// Summarise the creative's track record in 2-3 sentences using // only the data provided. Do not invent claims. Do not use // blockchain terminology." // 3. Cache result in Neon for 24 hours (avoid repeated API calls) // 4. Rate limit: max 10 summaries per user per day

### Frontend: AI summary appears as a collapsible

### section on ProfilePage.

### Label: "Track Record Summary" — not "AI Summary"

### (non-technical users

### don't know or care that it's AI-generated).

### DEFINITION OF DONE:

### [ ] ProfilePage shows on-chain reputation data (not

### mocked)

### [ ] Rating submission calls reputation.clar on mainnet

### — hash verified

<!-- Page 56 -->

### [ ] Pool creation/joining/contributing functional on

### mainnet

### [ ] Event indexer running — events table populated

### from mainnet events

### [ ] Activity feed showing real events (not demo data)

### on app.cinex.vercel.app

### [ ] AI summary generates from real on-chain data —

### cached, rate-limited

### [ ] All Tier 2 features work in demo mode with seeded

### data

### [ ] All user-facing strings pass the PROHIBITED

### WORDS check

### NON-GOALS FOR TIER 2:

### Do not build admin tools

### Do not build bulk export or reporting

### Do not build email notifications (push

### notifications only, post-grant)

### Do not build referral system

### Do not build subscription payments

---

## ### EPIC 6 — ILP INTEGRATION SPRINT PROMPT

## (CONDITIONAL)

<!-- Page 57 -->

### CONTEXT ANCHOR:

### This sprint only begins after written confirmation of

### the Interledger

### Open Payments Accelerator grant. If that confirmation

### has not arrived,

### stop reading this prompt and close it.

### CineX has a working BOS (Bridge Orchestration

### Service) with

### XReserveBridgeAdapter as the default. ILP will be

### implemented as a

### second BridgeAdapter that handles the international

### inbound leg —

### NOT the Stacks→Ethereum→NGN disbursement leg.

### ARCHITECTURE CLARIFICATION:

### ILP handles INBOUND funding from international

### backers.

### The BOS handles OUTBOUND disbursement to

### Nigerian creatives.

### These are separate flows. Do not conflate them.

### ILP flow (inbound):

### International Backer (any currency, any network)

### → ILP Open Payments (routing)

### → USDC on Ethereum (ILP delivers here)

### → [CineX receives USDC on Ethereum]

### → Circle Bridge Kit: USDC Ethereum → USDCx Stacks

### → milestone-escrow.clar::deposit (USDCx on Stacks)

<!-- Page 58 -->

### BOS flow (outbound): unchanged from existing

### implementation.

### TASK A — WALLET_ABSTRACTION_PLAN.md

### UPDATE:

### Before writing any code, update

### WALLET_ABSTRACTION_PLAN.md to show

### the full 4-leg architecture diagram. ILP and Yellow

### Card are two

### entirely separate legs serving opposite directions.

### Commit this to main.

### TASK B — ILP INBOUND PAYMENT RECEIVER:

### File: /backend/src/ilp/payment-receiver.ts

### Using the Interledger Open Payments SDK:

1. Create a payment pointer for CineX:

### $cinex.io/campaigns/{campaignId}

2. When an incoming payment is received via ILP:

### Verify the payment amount

### Record in Neon: {ilp_payment_id, campaign_id,

### usdc_amount, source_currency,

### source_amount, received_at}

### Trigger the USDC→USDCx bridge

### (Ethereum→Stacks) via Circle Bridge Kit

### On USDCx received on Stacks: call milestone-

### escrow.clar::deposit

<!-- Page 59 -->

3. Webhook endpoint: POST /api/ilp/incoming-

### payment-webhook

4. Idempotency: use ilp_payment_id as the unique

### key — never process twice

### TECHNICAL CONSTRAINTS:

### Use Interledger Open Payments SDK official npm

### package

### Do not build a custom ILP node — use the Open

### Payments HTTP API

### The Ethereum→Stacks bridge direction (inbound)

### is different from the

### Stacks→Ethereum direction (outbound) — they

### use different contract functions

### (deposit vs burn). Do not share code between

### inbound and outbound bridge paths.

### All amounts in the ILP layer are denominated in

### USD cents (integer)

### to avoid floating point issues

### DEFINITION OF DONE:

### [ ] WALLET_ABSTRACTION_PLAN.md updated with 4-

### leg flow diagram — committed

### [ ] Payment pointer created and resolvable

### [ ] Incoming ILP payment received in testnet → USDC

### lands in CineX Ethereum address

### [ ] USDC → USDCx bridge (Ethereum→Stacks)

### completes → USDCx in milestone-escrow

<!-- Page 60 -->

### [ ] End-to-end test documented with testnet

### transaction hashes

### [ ] ILP integration documented on GitHub

### NON-GOALS:

### Do not modify the BOS outbound flow — it is

### separate from ILP

### Do not add ILP to the user-facing UI in this sprint

### (post-grant feature)

### Do not support non-USDC ILP payment types in v1

--- ## Part 3: Settlement Architecture — Summary for PRD v3.1 The following paragraphs should be added to PRD v3.0 Section 6 (Technical Architecture): ### Settlement Architecture (Section 6.2) CineX's NGN disbursement path is a three- leg, audited settlement flow: **Leg 1 — On-chain release (Stacks):** When a milestone is approved by backers, milestone-escrow.clar releases USDCx to the creative's principal. This is fully on- chain and the primary trust event.

<!-- Page 61 -->

Settlement for the purposes of the CineX audit trail is considered complete at this point.

**Leg 2 — Bridge (Stacks → Ethereum):** To reach Yellow Card's NGN offramp, USDCx must cross to Ethereum via Circle's xReserve protocol (USDCx burn on Stacks → USDC mint on Ethereum). This uses Circle's own attestation service — not a third-party bridge. The Bridge Orchestration Service (BOS) manages this leg with retry logic, timeout alerts, and full audit logging.

Latency: approximately 15 minutes on the Standard attestation path.

**Leg 3 — Offramp (Ethereum USDC → NGN):** Yellow Card Payments API receives USDC on Ethereum and delivers NGN to the creative's bank account or mobile money. Yellow Card and Circle have a direct partnership for Nigeria. Latency: approximately 5–15 minutes. Combined SLA: 30 minutes from approval to NGN in account.

**User experience:** The creative sees only a "Transfer in progress" status screen with plain-English progress updates. No blockchain terminology is shown. The 30- minute SLA is stated explicitly at the point of withdrawal initiation.

**Future upgrade path:** When Yellow Card or an equivalent offramp supports a native

<!-- Page 62 -->

Stacks/USDCx corridor, the BOS's bridge adapter pattern allows Leg 2 to be bypassed entirely. This reduces latency to under 5 minutes and eliminates the Ethereum gas cost. The BOS architecture is designed for this upgrade without requiring changes to Legs 1 or 3.

--- *CTO Assessment authored July 2026 — Victor Omenai (Technical Founder) / Engineering Review*
