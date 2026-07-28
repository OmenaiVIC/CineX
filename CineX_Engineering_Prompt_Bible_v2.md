# CineX Engineering Prompt Bible v2

> Converted from PDF to Markdown. Page markers preserved for traceability.

<!-- Page 1 -->

# CineX Engineering Prompt Bible

## Status

Consolidated engineering prompt pack for CineX, built from the PRD, Settlement Architecture, Sprint

Tracker, and the corrected ground truth that:

- USDCx on Stacks is Circle xReserve-backed

- the Stacks-side burn path is not to be modeled as a legacy CCTP V1 TokenMessenger/MessageTransmitter dependency

- Yellow Card is the sole NGN off-ramp in scope

- BOS is the authoritative orchestration and audit layer for outbound creator disbursements

- passkey wallet work must explicitly cover RP ID/origin binding, SIP-018 domain binding, replay protection, recovery, and fee sponsorship Authoritative PRD: CineX_PRD_v3_reviewed.md is the single source of truth for product scope,

Epics, ground truth, and sprint tasks. Every prompt in this Bible must be read alongside the PRD section(s) named in its PRD Reference line. If this Bible and the PRD ever appear to disagree, stop and reconcile against the PRD before writing code.

Reviewer Addendum is binding, not optional context. The PRD's "Reviewer Addendum — Required

Insertions and Clarifications" section contains three insertions that carry the same authority as the numbered PRD body:

1. Settlement Ground Truth (inserted after PRD §1.1) — defines the canonical settlement path: USDCx

escrow on Stacks → Stacks-side burn → xReserve attestation / destination release path → canonical

USDC for Yellow Card off-ramp → NGN payout, explicitly independent of legacy CCTP V1

TokenMessenger/MessageTransmitter.

2. Production Passkey Wallet Requirements (inserted after the wallet/passkey tasks) — RP ID/origin

bindings, SIP-018 structured-signing domains, per-action nonces/replay protection, a documented recovery/lost-device/admin-init model, and a fee sponsorship/relayer policy are release requirements, not post-launch enhancements.

3. Risk / Assumption Note (inserted in the risk/architecture assumptions section) — legacy CCTP V1

deprecation is not a blocker for the Stacks-side USDCx burn path, but the exact xReserve integration surface, destination release path, and Bridge Orchestration Service forwarding assumptions must still be verified.

On the redline-ready change log: the PRD references a companion redline-ready change log for section-by-section replacement instructions. That file is currently unavailable (lost prior to upload). Until it resurfaces, treat the Reviewer Addendum text in the PRD itself as the authoritative, standalone source for the three insertions above — do not wait on or assume the existence of the change log to act on them.

1. How to Use This Bible

Use the Universal System Prompt at the top of every coding task.

<!-- Page 2 -->

Then use the task-specific prompt for the work package being implemented — each task-specific prompt below opens with a PRD Reference line pointing to the exact PRD section(s), Epic, Ground Truth row(s), and (where relevant) Reviewer Addendum insertion that govern that task. Open CineX_PRD_v3_reviewed.md to that reference before writing the prompt output.

Recommended execution order:

1. Architecture lock and protocol verification

2. Contract deployment and environment hardening

3. Backend / Neon / BOS schemas

4. Pillar wallet and passkey security architecture

5. BOS and settlement execution path

6. Frontend Tier 1

7. Pilot disbursement execution

8. Tier 2 features

9. ILP conditional work

10. Documentation and evidence package

2. Universal System Prompt

You are acting as CineX’s CTO, senior blockchain architect, senior full-stack engineer, senior backend engineer, senior security engineer, senior QA lead, senior DevOps engineer, senior technical PM, and

CineX’s Senior Product Designer UI/UX.

Your job is to translate the PRD, reviewed Settlement Architecture, and CineX ground truth into production-grade implementation prompts, code tasks, QA plans, and delivery checklists.

Before starting any task: open CineX_PRD_v3_reviewed.md and read (a) §1.1 Architectural Ground

Truth, (b) the Reviewer Addendum — Required Insertions and Clarifications, and (c) the specific PRD

Reference cited at the top of the task-specific prompt you are running. This Bible operationalizes the

PRD; it does not replace it.

You must think and operate with end-to-end ownership across architecture, backend, smart contracts, frontend, DevOps, QA, and product execution.

For every frontend, dashboard, workflow, modal, and user-facing interaction, you must also think and operate like CineX’s Senior Product Designer UI/UX: reducing cognitive load, removing crypto-native assumptions, preserving user trust, and shaping a seamless Web2/Web3 experience for creatives, backers, gatekeepers, and admins who may be non-crypto-native.* Project context: CineX is a milestone-based financing platform on Stacks. Main product primitives include:

- milestone escrow

<!-- Page 3 -->

- project verification tiers

- passkey-first wallet onboarding

- xReserve-backed USDCx settlement on Stacks

- Yellow Card NGN off-ramp

- Neon PostgreSQL backend

- Vercel-hosted frontend/backend components

- BOS (Bridge Orchestration Service) for outbound creator disbursements Authoritative ground truth for this task:

1. USDCx on Stacks is Circle xReserve-backed.

2. The Stacks-side USDCx burn path must NOT be modeled as a legacy CCTP V1

TokenMessenger/MessageTransmitter dependency.

3. Yellow Card is the sole NGN off-ramp provider in scope.

4. BOS is the authoritative orchestration and audit service for disbursement state transitions.

5. Passkey wallet work must explicitly handle RP ID/origin binding, SIP-018 domain binding, replay

protection, recovery/lost-device handling, and fee sponsorship/relayer behavior.

6. Avoid crypto-native UX language in user-facing outputs unless this task is specifically backend/internal.

7. CineX_PRD_v3_reviewed.md is authoritative for product scope, Epics, and sprint sequencing. The

Reviewer Addendum's three insertions (Settlement Ground Truth, Production Passkey Wallet

Requirements, Risk / Assumption Note) are binding requirements, equivalent in force to the numbered

PRD body — not supplementary notes.

Global engineering rules:

- Do not hand-wave architecture decisions.

- PRD is the single source of truth for scope.

- Reviewed settlement architecture overrides any stale assumptions around USDCx, xReserve,

Yellow Card, BOS, and legacy CCTP framing.

- Never hand-wave security, money movement, retries, timeout handling, or auditability.

- Treat all disbursement and payout paths as financial infrastructure with deterministic states, idempotency, reconciliation, and observability.

- Do not leave TODOs for critical security or settlement behavior.

- Explicitly model happy path, timeout path, retry path, duplicate request path, and partial failure path.

- Prefer deterministic state transitions over implicit behavior.

- If a dependency is unknown, define the exact interface contract and clearly mark the external assumption.

- Never assume Bitmama exists in scope.

- Never assume a legacy CCTP V1 contract dependency for the Stacks-side burn path.

- Use idempotency everywhere money movement is involved.

<!-- Page 4 -->

- Treat all settlement operations as auditable financial events.

- Keep secrets in environment variables only.

- Produce code, tests, migration files, API contracts, schema changes, monitoring, and a definition-of-done checklist.

- Separate sandbox/testnet behavior from production behavior explicitly.

- No production money movement may depend on an ambiguous or manually inferred state.

- Cite the specific PRD section, Epic, or Ground Truth row your output is satisfying wherever a design decision traces back to the PRD.

User-facing experience rules:

- Default to passkey-first, seedless, mobile-first journeys.

- Use plain-English UX copy and progressive disclosure; never require the user to understand blockchain mechanics to complete a primary task.

- Match the CineX visual direction: Inter for UI/body copy, Space Grotesk for headings and high-emphasis labels, dark cinematic surfaces, mint/neon-green primary actions, high-contrast type, generous spacing, and rounded/pill interactive elements.* here is CineX’s demo page: https://cine-x-iota.vercel.app/

- Every prompt for a user-facing feature must define information hierarchy, primary CTA, secondary CTA, empty states, loading states, success states, timeout states, retry states, error states, and manual-review states.

- Every prompt for a user-facing feature must specify accessibility requirements including keyboard flow, visible focus states, readable contrast, screen-reader semantics, and mobile responsiveness at 375px, 768px, and 1024px.

- Every payment, release, or withdrawal flow must feel safe, guided, and transparent, with clear expectation-setting around timing, review, and outcome.

Required output format:

1. Objective

2. Technical assumptions

3. Architecture decisions

4. Files/modules to create or modify

5. Data models / schemas

6. API or contract interfaces

7. Step-by-step implementation plan

8. Failure modes and mitigations

9. Tests to write

10. Definition of done

11. Open questions only if absolutely necessary

<!-- Page 5 -->

### 2b. *UI Copy and Language Guardrails*

*Default user-facing language must be plain English and non-crypto-native.* *Avoid raw protocol terminology in primary journeys.* *Preferred mappings include:*

- * - “digital dollars” instead of “USDCx”*

- * - “held funds” instead of “escrow”*

- * - “release funds” instead of “burn”*

- * - “conversion verified” instead of “attested”*

- * - “send to bank” instead of bridge/protocol path terminology*

- * - “account” or “secure account” instead of wallet-native phrasing where possible* *Where the user needs deeper detail for trust or support, place technical specifics behind an advanced disclosure, receipt view, or admin detail panel rather than in the main flow.* *Visual direction for CineX frontend surfaces:

- use Inter for body/UI text and Space Grotesk for headings, high-emphasis labels, and key numerics; favor dark cinematic surfaces with mint/neon-green primary actions; keep component styling premium, spacious, and minimal; use rounded/pill CTAs, strong contrast, and restrained motion; and balance institutional trust with creator-energy so the product feels both financially serious and culturally current.*

3. Architecture Lock Prompts

### 3.1 xReserve Integration-Surface Lock Prompt

PRD Reference:

- PRD §1.1 Architectural Ground Truth — row "Settlement asset — escrow"

- Reviewer Addendum → Settlement Ground Truth insertion (defines the canonical USDCx escrow

→ burn → xReserve attestation → destination release → Yellow Card → NGN path)

- Reviewer Addendum → Risk / Assumption Note (CCTP V1 is not a blocker; the xReserve integration surface must still be verified) Using the CineX project context, produce an implementation-lock technical brief for the outbound disbursement path.

Goal:

<!-- Page 6 -->

Lock the exact integration surface for:

- Stacks-side USDCx burn trigger

- xReserve attestation / status retrieval path

- destination-side release path

- Yellow Card handoff prerequisites

- audit identifiers propagated across the entire flow Important: Do NOT frame this as “check whether legacy CCTP V1 breaks the Stacks burn path.”

Instead, frame it as:

- define the exact xReserve-linked burn → attestation → destination release path

- define what is verified from Stacks docs vs Circle docs

- define which parts are external assumptions to be abstracted behind a BridgeAdapter

- define exactly what must be true before BOS may initiate Yellow Card payout Deliverables:

- final canonical sequence diagram in text

- explicit state machine

- exact identifiers carried end-to-end (disbursementId, burnTxHash, attestationRef, destinationTxHash, yellowCardPaymentId, ngnPayoutReference)

- decision on whether destination-side release is polled, event-driven, SDK-driven, or hybrid

- list of environment variables

- “build/no-build blockers” reduced only to unresolved external API details, not protocol confusion

Definition of done: A senior engineer can implement BOS without reopening protocol ambiguity around xReserve, burn path, forwarding, or Yellow Card handoff.

### 3.2 BOS State Machine Design Prompt

PRD Reference:

- PRD §1.1 Ground Truth — rows "Grant contract deliverable" and "Contract deployment status"

- Reviewer Addendum → Settlement Ground Truth insertion

- Supports Epic 1+2: Mainnet Deployment + Passkey Wallet (settlement backbone) Design the CineX Bridge Orchestration Service state machine for outbound creator disbursements.

The BOS must cover:

- disbursement intent creation

- Stacks burn initiation

- burn confirmation

- xReserve attestation/status retrieval

- destination-side release tracking

- Yellow Card payout initiation

- Yellow Card payout completion

<!-- Page 7 -->

- terminal success and terminal failure states

- manual-review states where needed Constraints:

- all states must be persisted in Neon

- all transitions must be idempotent

- every monetary step must be replay-safe

- any retry must be safe under duplicate worker execution

- model timeout states separately from hard-failure states

- include SLA timestamps and escalation fields Output:

- enum/state list

- allowed transitions table

- invalid transition rules

- retry policy per state

- DB schema for disbursements + disbursement_audit + external_refs

- pseudocode for transition guard layer

- tests for duplicate execution and stuck-state recovery

4. Smart Contract and Deployment Prompts

### 4.1 Contract Deployment System Prompt

PRD Reference:

- PRD §4 Smart Contract Status — Testnet Complete

- PRD §1.1 Ground Truth — row "Contract deployment status"

- Epic 1+2 (Combined): Mainnet Deployment + Passkey Wallet — Implementation Tasks, Week 1 and Week 3 Build the CineX contract deployment system for all 12 logic contracts and their dependencies on Stacks mainnet.

Requirements:

- determine and encode strict deployment order

- validate trait/address dependencies before each deploy

- fail fast on unresolved dependency addresses

- output explorer-ready deployment report

- support dry-run/devnet mode and mainnet mode

- persist deployment artifacts in JSON and markdown

- include post-deploy verification calls where applicable Deliverables:

- deploy.ts or equivalent deployment entrypoint

<!-- Page 8 -->

- config for devnet/testnet/mainnet

- dependency graph

- deployment artifact format

- rollback / emergency response notes for failed partial deployments

- test plan for deployment order correctness Definition of done: All 12 contracts can be deployed in the correct order with deterministic artifacts and zero manual copy-paste dependency substitution.

### 4.2 `oracle-proxy.clar` DEMO_MODE Prompt

PRD Reference:

- PRD §2.1 Demo & Test Mode — Verification Bypass

- PRD §2.2 Verification Tier Sprint Tasks — Week 1 row

- Epic 1+2 Implementation Tasks — Week 1 (DEMO_MODE oracle-proxy variant) Implement a DEMO_MODE-safe variant of oracle-proxy.clar for CineX.

Objective: Allow demo/test UX where verification-fee calculation resolves to zero, without creating any path that can accidentally be enabled on production mainnet.

Requirements:

- return STX price = 0 only in explicitly demo/test deployments

- no runtime toggle on mainnet

- compile-time or deployment-time guard preferred

- document exactly how frontend detects demo mode

- ensure fee bypass behavior is deterministic and test-covered

- add negative tests proving demo bypass cannot be triggered on production deployment

Output:

- Clarity contract diff or full contract

- tests

- deploy flags/config

- explanation of production safety model

### 4.3 `project-verification-module.clar` Testnet Bypass Prompt

PRD Reference:

- PRD §2.1 Demo & Test Mode — Verification Bypass

- PRD §2.2 Verification Tier Sprint Tasks — Week 4 row (TESTNET_BYPASS_VERIFICATION)

- PRD §2 Creative Verification Tier System (tier caps/fees table) Implement TESTNET_BYPASS_VERIFICATION in project-verification-module.clar for team testing only.

Requirements:

<!-- Page 9 -->

- admin-only path

- unavailable in production deployments

- explicit event emission when invoked

- auditable reason field if possible

- no user path to self-elevate

- maintain verification tier invariants Deliverables:

- contract change

- tests for auth failure and success

- deployment guard strategy

- frontend/backend behavior notes so this path is never surfaced in production UI

### 4.4 Pilot Campaign Parameterization Prompt

PRD Reference:

- Epic 4: Pilot Projects — Implementation Tasks, Week 4 (hard deadline) and Week 6

- PRD §7 Grant Milestone Report Templates — 2C Pilot Project Deliverables Produce the engineering implementation for parameterizing Death of Eternity and Rain into milestone-escrow.clar on mainnet.

Requirements:

- encode campaign identifiers, milestone counts, milestone release conditions, caps, and recipients

- ensure values match written milestone definitions exactly

- validate milestone sequencing and release permissions

- produce admin script or task runner for campaign creation

- emit useful events for downstream indexing

- document post-creation verification steps on Explorer Deliverables:

- campaign parameterization script

- input schema

- contract call sequence

- validation checklist

- tests for invalid milestone structures

5. Backend and Infrastructure Prompts

### 5.1 Neon Migration Prompt

PRD Reference:

<!-- Page 10 -->

- PRD §3 Backend Infrastructure — Migration to Neon (§3.1, §3.2, §3.3)

- PRD §1.1 Ground Truth — row "Backend infrastructure" Execute the CineX backend migration from Render/Supabase-hosted Postgres to Neon PostgreSQL.

Scope:

- pg_dump / restore

- environment variable migration

- connection validation

- @neondatabase/serverless integration

- branch strategy for main/epic environments

- 7-day parallel run plan

- discrepancy detection Requirements:

- zero data loss

- no schema drift

- no application-layer behavior change

- edge-compatible driver configuration

- health checks and connection timeout simulation

- migration report with counts per table before/after Output:

- migration runbook

- scripts/commands

- env contract

- smoke tests

- discrepancy detection queries

- decommission checklist

### 5.2 BOS Schema Prompt

PRD Reference:

- Reviewer Addendum → Settlement Ground Truth insertion

- PRD §1.1 Ground Truth — rows "Settlement asset — escrow" and "Treasury & yield layer"

Create the full Neon schema for CineX settlement orchestration.

Tables required:

- disbursements

- disbursement_audit

- yellow_card_webhook_events

- external_status_snapshots

- manual_review_queue

- relay_wallet_activity

- on_chain_events (if not already present)

<!-- Page 11 -->

Requirements:

- state machine fields

- immutable audit append log

- idempotency keys

- unique constraints on external transaction refs where appropriate

- retry counters

- timestamps for SLA calculation

- indexes for stuck transaction polling

- support for future adapter variants Output:

- SQL migrations

- models if ORM/tooling is used

- index rationale

- example records for a full happy-path disbursement

### 5.3 Monitoring and Alerting Prompt

PRD Reference:

- Reviewer Addendum → Settlement Ground Truth insertion (burn / attestation / destination-release / Yellow Card failure points)

- PRD §1.1 Ground Truth — row "Contract deployment status" Build CineX settlement observability and stuck-transaction alerting.

Requirements:

- 5-minute cron or scheduler

- state-age thresholds by status

- separate alerts for burn timeout, attestation timeout, destination release failure, Yellow Card API failure, webhook timeout

- Slack/email notifier abstraction

- deduplicated alerts

- still-failing reminders without spam

- dashboard-friendly query set Deliverables:

- monitor job implementation

- threshold config

- notifier interface

- sample alert payloads

- runbook for responders

- tests for alert deduplication

<!-- Page 12 -->

6. Pillar Wallet and Passkey Prompts

### 6.1 Pillar Passkey Spike Prompt

PRD Reference:

- Epic 1+2 Implementation Tasks — Week 2 (Pillar Wallet SDK: passkey account creation, login, transaction signing)

- Reviewer Addendum → Production Passkey Wallet Requirements insertion (design toward this target even at spike stage) Run a hard technical feasibility spike for Pillar Wallet on Stacks testnet.

Goal: Prove or disprove that a passkey/WebAuthn-controlled user can:

- create account

- authenticate

- sign a Stacks transaction

- broadcast successfully

- re-authenticate after refresh/session restore Requirements:

- use a real testnet transaction, not a mocked sign

- record exact signing flow and provider behavior

- document where SIP-018 or standard tx signing is used

- capture unsupported behaviors explicitly

- produce a Go/No-Go decision and fallback plan if needed Output:

- reproducible spike repo or branch

- exact test steps

- logs/screenshots/artifacts

- compatibility matrix

- recommendation: Pillar primary / fallback required

### 6.2 Passkey Production Security Prompt

PRD Reference:

- Reviewer Addendum → Production Passkey Wallet Requirements insertion — PRIMARY reference. RP ID/origin bindings, SIP-018, nonces/replay protection, recovery, and fee sponsorship are release requirements, not post-launch enhancements.

- PRD §1.1 Ground Truth — row "Frontend scope — Weeks 1–8" Design the production security model for CineX passkey wallet onboarding.

Must explicitly define:

<!-- Page 13 -->

- RP ID / origin bindings for app.cinex, demo.cinex, local/dev/test environments

- allowed credential registration flows

- session persistence model

- device loss and recovery path

- guardian/admin-init or equivalent fallback if used

- how passkey identity maps to wallet/account ownership

- phishing resistance expectations

- how production and demo credentials are isolated Do not leave this as “SDK handles it.” Deliverables:

- security architecture

- threat model

- environment matrix

- recovery runbook

- tests for origin mismatch and credential misuse

### 6.3 SIP-018 Structured-Signing Prompt

PRD Reference:

- Reviewer Addendum → Production Passkey Wallet Requirements insertion (SIP-018 structured-signing domains and payload rules) Design CineX’s SIP-018 usage for passkey and wallet-authorized actions.

Requirements:

- define domain tuple values: name, version, chain-id

- define which actions use structured signing

- include wallet/account-specific anti-replay binding where appropriate

- define nonce strategy

- define server-side and/or contract-side replay prevention

- specify wallet display expectations for sign prompts

- ensure signatures cannot be replayed across apps, chains, or different CineX wallet instances

Output:

- signing schema

- payload examples

- verification pseudocode

- replay-protection design

- integration notes for Stacks Connect / wallet provider APIs

- test cases

### 6.4 Fee Sponsorship / Relayer Prompt

PRD Reference:

<!-- Page 14 -->

- Reviewer Addendum → Production Passkey Wallet Requirements insertion (fee sponsorship / relayer policy for first-use transactions) Design CineX’s fee sponsorship and relayer model for passkey users.

Requirements:

- first-time users must not need STX before completing initial critical flows

- define which actions are sponsorable

- define abuse limits and quotas

- define who signs what

- define where sponsorship ends and user responsibility begins

- define relay wallet funding and monitoring

- document how relayer actions are audited Output:

- sponsorship policy

- relay architecture

- environment variables

- request signing / verification flow

- anti-abuse controls

- alerting for low balance / failed sponsorship

### 6.5 Pillar SDK Integration Prompt

PRD Reference:

- Epic 1+2 Implementation Tasks — Week 2 (Pillar Wallet SDK integration)

- Reviewer Addendum → Production Passkey Wallet Requirements insertion Implement full Pillar Wallet SDK integration for CineX.

Global status for every Frontend user-facing prompt: *Frontend / UI / UX Overlay — Mandatory for all user-facing prompts* *For any prompt involving onboarding, wallet creation, dashboard views, campaign creation, deposits, withdrawals, milestone submission, milestone voting, gatekeeper review, admin review, profiles, pools, activity feeds, or AI credibility surfaces, include the following constraints:* *1. Start with the user’s job-to-be-done, confidence level, and likely fear/friction point before defining the interface.* *2. Design for non-crypto-native users first; expert users may move faster, but first-time users must still understand the flow.* *3. Do not expose internal protocol jargon in UI copy. Avoid “USDCx,” “burn,” “mint,” “attestation,”

“bridge,” “BOS,” “CCTP,” “gas,” “private key,” “seed phrase,” and “escrow” in user-facing text unless explicitly placed in advanced technical disclosure.* *4. Prefer plain-English substitutes such as “digital dollars,” “held funds,” “release funds,” “convert to

Naira,” “send to bank,” “account security,” and “verification.”*

<!-- Page 15 -->

*5. Use progressive disclosure: show what matters now, reveal technical detail only when needed for trust, support, or audit review.* *6. Require clear visual hierarchy, concise copy, and CTA sequencing that makes the next step obvious.*

*7. Require premium interaction quality: skeleton states, optimistic-but-safe feedback, graceful retries, helpful empty states, and calm failure states.* *8. Require accessibility and responsive behavior as part of definition of done, not as a later polish task.*

*9. Any money-movement flow must show a status timeline and expected completion window where relevant.* *10. Deliverables must include UX rationale, component behavior notes, state coverage, and acceptance criteria, not only code artifacts.* Scope:

- account creation

- login

- session restore

- transaction signing

- logout/reset

- error mapping

- demo-mode coexistence

- fallback path hooks for Leather/Xverse Requirements:

- no seed phrase shown anywhere

- plain-English UX

- instrumented analytics/logging for auth failures

- network detection

- graceful provider-not-ready behavior

- testnet and mainnet environment separation Product Design UI/UX requirements:

- implement passkey account creation, login, session restore, and logout as a consumer-grade onboarding experience that feels closer to premium fintech than a crypto wallet.

The UI must never foreground seed phrases or raw wallet mechanics. The flow must explain security in plain language using biometrics/device-based sign-in wording, show trust-building reassurance copy, and include explicit handling for first-use, returning-user, session-expired, wrong-network, unsupported-device, and recovery-needed states.* Deliverables:

- auth hooks/context

- provider abstraction

<!-- Page 16 -->

- error taxonomy

- session persistence logic

- E2E tests for login and signing

### 6.6 Deposit / Withdraw / Sign Flows Prompt

PRD Reference:

- Epic 1+2 Implementation Tasks — Week 3 (USDCx deposit/withdraw/sign flows against mainnet contracts)

- PRD §1.1 Ground Truth — row "Settlement asset — escrow" Implement CineX wallet financial flows against live Stacks contracts.

Global status for every Frontend user-facing prompt: *Frontend / UI / UX Overlay — Mandatory for all user-facing prompts* *For any prompt involving onboarding, wallet creation, dashboard views, campaign creation, deposits, withdrawals, milestone submission, milestone voting, gatekeeper review, admin review, profiles, pools, activity feeds, or AI credibility surfaces, include the following constraints:* *1. Start with the user’s job-to-be-done, confidence level, and likely fear/friction point before defining the interface.* *2. Design for non-crypto-native users first; expert users may move faster, but first-time users must still understand the flow.* *3. Do not expose internal protocol jargon in UI copy. Avoid “USDCx,” “burn,” “mint,” “attestation,”

“bridge,” “BOS,” “CCTP,” “gas,” “private key,” “seed phrase,” and “escrow” in user-facing text unless explicitly placed in advanced technical disclosure.* *4. Prefer plain-English substitutes such as “digital dollars,” “held funds,” “release funds,” “convert to

Naira,” “send to bank,” “account security,” and “verification.”* *5. Use progressive disclosure: show what matters now, reveal technical detail only when needed for trust, support, or audit review.* *6. Require clear visual hierarchy, concise copy, and CTA sequencing that makes the next step obvious.*

*7. Require premium interaction quality: skeleton states, optimistic-but-safe feedback, graceful retries, helpful empty states, and calm failure states.* *8. Require accessibility and responsive behavior as part of definition of done, not as a later polish task.*

*9. Any money-movement flow must show a status timeline and expected completion window where relevant.* *10. Deliverables must include UX rationale, component behavior notes, state coverage, and acceptance criteria, not only code artifacts.* Scope:

- USDCx deposit flow

- USDCx withdraw/disbursement initiation flow

<!-- Page 17 -->

- generic sign/approve flow where needed

- transaction status tracking

- post-confirmation balance refresh Requirements:

- integrate with live contract addresses

- never use mocked balances in production flow

- protect against duplicate submission

- recover cleanly from wallet cancel, provider disconnect, broadcast failure, and post-broadcast confirmation lag

- expose tx hash and internal correlation IDs for support Product Design UI/UX requirements:

- every deposit, withdrawal, and signing flow must include a clear pre-confirmation step, a visible

“what happens next” explanation, and a post-action progress state that translates protocol events into plain-English milestones.

- For withdrawals and NGN settlement, the UI must state the expected 15–30 minute timeline, reassure the user not to retry duplicate requests, and surface manual-review or timeout states without blameful language.* Deliverables:

- hooks/services

- status reducer/state machine

- UI integration notes

- tests for cancel/retry/duplicate submit

7. BOS and Settlement Execution Prompts

### 7.1 XReserveBridgeAdapter Prompt

PRD Reference:

- Reviewer Addendum → Settlement Ground Truth insertion — PRIMARY reference

- Reviewer Addendum → Risk / Assumption Note (isolate the xReserve integration surface and destination release path behind the adapter boundary) Implement CineX’s default XReserveBridgeAdapter for outbound disbursements.

Objective: Abstract the current Stacks → xReserve-linked destination release path → Yellow Card flow behind a stable interface.

Requirements:

- accept disbursement intent with amount, creator payout target, milestone reference, and correlation IDs

<!-- Page 18 -->

- initiate Stacks-side burn safely

- track attestation or equivalent bridge status

- track destination-side USDC release

- return normalized adapter result for BOS consumption

- never expose adapter-specific complexity to the frontend Important: Do NOT hardcode a legacy CCTP V1 TokenMessenger/MessageTransmitter assumption for the Stacks-side burn path.

Model the adapter around verified xReserve-linked behavior and isolate destination-side forwarding details behind the adapter boundary.

Output:

- interface definition

- adapter implementation skeleton or full implementation

- config/env requirements

- normalized status/result schema

- tests with mocked external dependencies

### 7.2 BOS Step 1–2 Prompt: Stacks Burn + Attestation Polling

PRD Reference:

- Reviewer Addendum → Settlement Ground Truth insertion (Stacks-side burn → xReserve attestation leg) Implement BOS Steps 1–2 for CineX:

1. initiate Stacks-side USDCx burn

2. poll/track xReserve-linked attestation or burn-status completion signal

Requirements:

- idempotency guard before burn

- ensure same disbursement cannot burn twice

- persist burnTxHash immediately

- handle pending, confirmed, reverted, timeout, and duplicate-execution scenarios

- polling interval and max timeout configurable

- full audit rows appended on each state transition

- emit internal event or callback when attestation-ready state is reached Deliverables:

- service module

- retry-safe worker function

- polling strategy

- DB writes

- test coverage for duplicate worker execution, timeout, and late success

<!-- Page 19 -->

### 7.3 BOS Step 3 Prompt: Destination-Side Release

PRD Reference:

- Reviewer Addendum → Settlement Ground Truth insertion (destination release / canonical

USDC leg)

- Reviewer Addendum → Risk / Assumption Note Implement BOS Step 3 for CineX: destination-side canonical USDC release after Stacks-side burn.

This prompt must resolve and encode the chosen relay model:

- Gnosis Safe pass-through or

- explicit controlled relay address or

- alternative verified model Requirements:

- do not leave custody / relay model ambiguous

- document why the chosen pattern is safe and operable

- persist destinationTxHash and destination wallet/address used

- ensure prior failed balances do not contaminate new disbursements

- define exactly when Yellow Card initiation may begin

- include retry and timeout behavior

- include balance verification before and after release

- produce operational checks for whitelisting/authorized sender constraints Important: Treat this as the verified xReserve destination release path for CineX’s chosen model.

Do not describe it as a generic legacy-CCTP V1 mint implementation.

Output:

- implementation

- relay custody decision memo

- preflight validation checklist

- tests for failed release, delayed release, duplicate processing, and stale balance contamination

### 7.4 BOS Step 4 Prompt: Yellow Card Payout Initiation

PRD Reference:

- PRD §1.1 Ground Truth — row "Settlement asset — escrow" (Yellow Card as sole NGN off-ramp)

- Reviewer Addendum → Settlement Ground Truth insertion (canonical USDC → Yellow Card leg)

Implement CineX BOS Step 4: Yellow Card payout initiation.

Requirements:

<!-- Page 20 -->

- use Yellow Card as sole off-ramp

- verify live request schema against current API docs before coding

- use disbursementId as idempotency/sequence key

- persist request and response payload metadata safely

- treat “payment already exists” as idempotent success if identifiers match

- never trigger duplicate payout for the same disbursement

- validate beneficiary/bank payload completeness before request

- isolate API client, request builder, response parser, and policy layer Deliverables:

- yellow-card client module

- request/response models

- idempotency handling

- failure taxonomy

- tests for duplicate requests, schema mismatch, auth failure, transient 5xx, hard reject

### 7.5 BOS Step 5 Prompt: Webhook Verification + Fallback Polling

PRD Reference:

- Reviewer Addendum → Settlement Ground Truth insertion (Yellow Card → NGN payout leg)

Implement CineX BOS Step 5 for Yellow Card completion handling.

Scope:

- HMAC webhook verification

- event deduplication

- payout status transition to COMPLETE or terminal failure

- fallback polling if no webhook arrives within expected window

- audit logging

- user notification trigger integration Requirements:

- store raw webhook payloads

- verify signature before any mutation

- idempotently process repeated webhook deliveries

- support out-of-order webhook events

- polling and webhook paths must converge on one transition guard

- alert if no webhook/poll success within SLA window Deliverables:

- webhook endpoint

- signature verifier

- fallback poll job

- dedupe logic

<!-- Page 21 -->

- tests for invalid signature, duplicate event, late event, mismatch event, and status regression attempt

### 7.6 BOS End-to-End Orchestration Prompt

PRD Reference:

- Reviewer Addendum → Settlement Ground Truth insertion — PRIMARY reference, full path end to end

- PRD §1.1 Ground Truth — row "Grant contract deliverable" Implement the full CineX BOS orchestrator for: Stacks burn → attestation/status → destination release → Yellow Card payout → NGN confirmation.

Requirements:

- event-driven or job-driven orchestration acceptable, but must be restart-safe

- each step resumable from persisted state

- support manual-review queue insertion when invariant broken

- no step may rely on in-memory-only state

- every external call traced with correlation IDs

- produce support-friendly audit timeline

- preserve a clean abstraction so future direct Stacks corridor can replace current adapter

Deliverables:

- orchestrator module

- resume/recovery logic

- manual-review insertion rules

- E2E integration tests

- sample support/admin timeline output

8. SAFE Forwarding Prompt (Supersedes Earlier Draft)

PRD Reference:

- Reviewer Addendum -> Settlement Ground Truth insertion -- PRIMARY reference. This prompt operationalizes the addendum settlement path (USDCx escrow -> burn -> xReserve attestation -> destination release -> Yellow Card -> NGN) with production-grade financial safety controls.

- Reviewer Addendum -> Risk / Assumption Note This prompt replaces the earlier forwarding prompt and adds stronger controls.

Implement the complete CineX outbound settlement forwarding pipeline with production-grade financial safety controls.

Business objective:

<!-- Page 22 -->

When a creator’s milestone is approved and funds are to be disbursed in NGN, CineX must move value from xReserve-backed USDCx on Stacks to a Yellow Card-triggered NGN payout with full auditability, zero double-send risk, zero ambiguous state transitions, and clean recovery from partial failure.

Authoritative constraints:

- Stacks-side USDCx burn is treated as xReserve-native and not as a legacy CCTP V1

TokenMessenger/MessageTransmitter dependency.

- Yellow Card is the sole NGN off-ramp provider.

- BOS is the authoritative orchestrator and audit layer.

- Every step must be resumable from persisted state.

- Every external request must be idempotent or wrapped in an idempotency layer.

- Production payout execution must remain disabled behind an explicit feature flag until sandbox, testnet, and dry-run evidence gates are all passed.

Safety objectives:

1. No double burn.

2. No double destination release accounting.

3. No double payout.

4. No payout against the wrong beneficiary.

5. No payout from an ambiguous or contaminated relay balance.

6. No automatic continuation past a material mismatch.

7. No silent timeout.

8. No production payout without verifiable preflight checks.

Required system behavior:

1. Validate milestone release eligibility and create a disbursement intent.

2. Lock a unique disbursementId and prevent duplicate execution.

3. Create a preflight record containing:

- expected USDCx amount

- expected destination-side USDC amount

- intended beneficiary identifiers

- intended Yellow Card payout payload fingerprint

- relay wallet / custody path chosen for this payout

4. Initiate Stacks-side USDCx burn and persist burnTxHash.

5. Confirm burn success or enter controlled timeout/failure state.

6. Poll or retrieve the verified xReserve-linked attestation/status signal.

7. Track the destination-side canonical USDC release using the chosen relay/custody model.

8. Before any Yellow Card initiation, enforce all payout gates:

- destination-side release confirmed

- expected amount matches observed amount within defined tolerance

<!-- Page 23 -->

- destination funds are attributable to this disbursement only

- no unresolved residue or stale failed balance contaminates the release account

- beneficiary payload passes validation and matches frozen preflight fingerprint

- authorized sender / whitelisting prerequisites are satisfied

9. If any payout gate fails, stop automatic progression and move to MANUAL_REVIEW_REQUIRED.

10. Only after all payout gates pass, initiate Yellow Card payout using disbursementId as the

idempotency/sequence key.

11. Persist Yellow Card request ID, payment ID, and all safe metadata.

12. Verify Yellow Card webhook signature and/or fallback poll until final payout status is known.

13. Persist NGN payout reference and final completion timestamp.

14. Emit a support-friendly audit timeline covering every step.

Required architecture controls:

- Build this behind a BridgeAdapter interface with XReserveBridgeAdapter as the default implementation.

- Separate: a\) orchestration logic, b\) external client integrations, c\) persistence, d\) transition guards, e\) monitoring/alerting, f\) payout preflight policy.

- Define and document the custody/relay model for the destination-side release explicitly. Do not leave Gnosis Safe vs single relay-key ambiguous.

- Add a circuit breaker that can halt new disbursements by environment or payout corridor.

- Add a maximum-per-disbursement cap and configurable daily payout cap for safe rollout.

- Add two-person approval or explicit production enablement controls for the first production releases if the product team wants staged rollout.

- Add monitoring for: burn timeout, attestation timeout, destination release failure, amount mismatch, contaminated relay balance, Yellow Card API failure, webhook timeout, stuck disbursement beyond SLA.

- Add manual-review insertion rules for any invariant break.

<!-- Page 24 -->

- Guarantee duplicate worker execution cannot burn twice or pay out twice.

- Guarantee replayed webhooks cannot mark the wrong disbursement complete.

- Guarantee prior failed destination balances cannot contaminate new payouts.

- Guarantee the system never auto-sweeps unexpected destination-side USDC into a payout.

Data model requirements:

- disbursements table with current status, retry counters, timestamps, refs

- disbursement_audit table append-only

- payout_preflight table or equivalent persisted preflight fields

- yellow_card_webhook_events raw storage

- manual_review_queue

- relay_wallet_activity

- circuit_breaker / feature_flag configuration model Manual-review triggers (must stop automatic payout):

- destination release amount mismatch

- beneficiary data mismatch

- duplicate external reference with inconsistent payload

- stale residue in relay account that cannot be confidently attributed

- unexpected status regression

- missing authorized-sender prerequisite

- webhook signature mismatch after payout initiation

- payout exceeds configured cap

- unresolved timeout after configured retries Testing requirements:

- happy path

- duplicate burn attempt

- burn succeeds but attestation delayed

- attestation succeeds but destination release delayed

- destination release amount mismatch

- contaminated relay balance detected

- beneficiary fingerprint mismatch after preflight

- Yellow Card returns transient error

- Yellow Card “payment already exists” response

- webhook never arrives but fallback poll succeeds

- duplicate webhook delivery

- stuck transaction alert fires

- circuit breaker halts new payouts

- process restart mid-flight resumes correctly Definition of done: A single approved milestone can be disbursed end-to-end from Stacks to NGN with:

- no double-burn

<!-- Page 25 -->

- no double-payout

- no payout from ambiguous funds

- full tx/reference audit trail

- SLA-aware alerting

- user-visible plain-English status progression

- production-safe recovery paths for every partial failure

- automatic stop-and-hold behavior on any material settlement ambiguity

9. Frontend Tier 1 Prompts

### 9.1 DemoModeContext Prompt

PRD Reference:

- PRD §2.1 Demo & Test Mode — Verification Bypass

- Epic 3: Dual-Currency Wallet UI — Tier 1, Implementation Tasks — Week 5, Days 3–4

Implement CineX DemoModeContext and DemoModeBanner.

Global status for every Frontend user-facing prompt: *Frontend / UI / UX Overlay — Mandatory for all user-facing prompts* *For any prompt involving onboarding, wallet creation, dashboard views, campaign creation, deposits, withdrawals, milestone submission, milestone voting, gatekeeper review, admin review, profiles, pools, activity feeds, or AI credibility surfaces, include the following constraints:* *1. Start with the user’s job-to-be-done, confidence level, and likely fear/friction point before defining the interface.* *2. Design for non-crypto-native users first; expert users may move faster, but first-time users must still understand the flow.* *3. Do not expose internal protocol jargon in UI copy. Avoid “USDCx,” “burn,” “mint,” “attestation,”

“bridge,” “BOS,” “CCTP,” “gas,” “private key,” “seed phrase,” and “escrow” in user-facing text unless explicitly placed in advanced technical disclosure.* *4. Prefer plain-English substitutes such as “digital dollars,” “held funds,” “release funds,” “convert to

Naira,” “send to bank,” “account security,” and “verification.”* *5. Use progressive disclosure: show what matters now, reveal technical detail only when needed for trust, support, or audit review.* *6. Require clear visual hierarchy, concise copy, and CTA sequencing that makes the next step obvious.*

*7. Require premium interaction quality: skeleton states, optimistic-but-safe feedback, graceful retries, helpful empty states, and calm failure states.* *8. Require accessibility and responsive behavior as part of definition of done, not as a later polish task.*

*9. Any money-movement flow must show a status timeline and expected completion window where relevant.*

<!-- Page 26 -->

*10. Deliverables must include UX rationale, component behavior notes, state coverage, and acceptance criteria, not only code artifacts.* Requirements:

- no wallet required

- seed realistic mock data

- auto-grant Basic Verified presentation state

- never leak demo behavior into production wallet flow

- banner must clearly indicate demo mode

- support environment-driven enablement

- demo mode must coexist cleanly with live mode in codebase Product Design UI/UX requirements:

- Demo Mode must feel intentional and trustworthy, not like a hidden bypass. Include a clear banner, a short explanation of what is simulated vs live, distinct visual treatment from production mode, and frictionless exploration paths for users who want to understand CineX before creating an account. The experience should preserve trust while reducing anxiety for first-time users.* Deliverables:

- context/provider

- seed data module

- environment gating

- tests for mode isolation

### 9.2 Onboarding Wizard Prompt

PRD Reference:

- Epic 3: Dual-Currency Wallet UI — Tier 1, Implementation Tasks — Week 5, Days 1–2

Implement CineX onboarding wizard with role selection.

Global status for every Frontend user-facing prompt: *Frontend / UI / UX Overlay — Mandatory for all user-facing prompts* *For any prompt involving onboarding, wallet creation, dashboard views, campaign creation, deposits, withdrawals, milestone submission, milestone voting, gatekeeper review, admin review, profiles, pools, activity feeds, or AI credibility surfaces, include the following constraints:* *1. Start with the user’s job-to-be-done, confidence level, and likely fear/friction point before defining the interface.* *2. Design for non-crypto-native users first; expert users may move faster, but first-time users must still understand the flow.*

<!-- Page 27 -->

*3. Do not expose internal protocol jargon in UI copy. Avoid “USDCx,” “burn,” “mint,” “attestation,”

“bridge,” “BOS,” “CCTP,” “gas,” “private key,” “seed phrase,” and “escrow” in user-facing text unless explicitly placed in advanced technical disclosure.* *4. Prefer plain-English substitutes such as “digital dollars,” “held funds,” “release funds,” “convert to

Naira,” “send to bank,” “account security,” and “verification.”* *5. Use progressive disclosure: show what matters now, reveal technical detail only when needed for trust, support, or audit review.* *6. Require clear visual hierarchy, concise copy, and CTA sequencing that makes the next step obvious.*

*7. Require premium interaction quality: skeleton states, optimistic-but-safe feedback, graceful retries, helpful empty states, and calm failure states.* *8. Require accessibility and responsive behavior as part of definition of done, not as a later polish task.*

*9. Any money-movement flow must show a status timeline and expected completion window where relevant.* *10. Deliverables must include UX rationale, component behavior notes, state coverage, and acceptance criteria, not only code artifacts.* Roles:

- Creative

- Backer

- Gatekeeper Requirements:

- ≤ 7 steps to dashboard

- role persistence after refresh

- passkey path if wallet mode

- clean demo-mode path if non-wallet mode

- validation for incomplete flows

- mobile-first layout

- analytics hooks for abandonment points Product Design UI/UX objective:

- design an onboarding wizard that allows a first-time Creative, Backer, or Gatekeeper to understand their role, choose their path, and reach a meaningful first dashboard state in under three minutes without prior crypto knowledge.* *UI/UX requirements:*

- * - Use progressive disclosure with a maximum of 5–7 concise steps.*

- * - Start with role intent, not technical setup.*

- * - Explain why verification exists, what each role can do, and what the next visible reward is.*

- * - Use plain-English microcopy, supportive helper text, and clear progress indicators.*

- * - Prefer “Create your account,” “Secure with your device,” and “Continue to dashboard” over wallet-native language.*

<!-- Page 28 -->

- * - Include back, save, resume, and incomplete-flow recovery states.*

- * - Ensure mobile-first ergonomics, large touch targets, and low-friction data entry.* Output:

- component architecture

- state machine

- tests

- edge cases for refresh, cancel, provider unavailability

### 9.3 Wallet Dashboard Prompt

PRD Reference:

- Epic 3 Implementation Tasks — Week 5, Day 5 (wallet dashboard, passkey login end-to-end)

- Reviewer Addendum → Production Passkey Wallet Requirements insertion Global status for every Frontend user-facing prompt: *Frontend / UI / UX Overlay — Mandatory for all user-facing prompts* *For any prompt involving onboarding, wallet creation, dashboard views, campaign creation, deposits, withdrawals, milestone submission, milestone voting, gatekeeper review, admin review, profiles, pools, activity feeds, or AI credibility surfaces, include the following constraints:* *1. Start with the user’s job-to-be-done, confidence level, and likely fear/friction point before defining the interface.* *2. Design for non-crypto-native users first; expert users may move faster, but first-time users must still understand the flow.* *3. Do not expose internal protocol jargon in UI copy. Avoid “USDCx,” “burn,” “mint,” “attestation,”

“bridge,” “BOS,” “CCTP,” “gas,” “private key,” “seed phrase,” and “escrow” in user-facing text unless explicitly placed in advanced technical disclosure.* *4. Prefer plain-English substitutes such as “digital dollars,” “held funds,” “release funds,” “convert to

Naira,” “send to bank,” “account security,” and “verification.”* *5. Use progressive disclosure: show what matters now, reveal technical detail only when needed for trust, support, or audit review.* *6. Require clear visual hierarchy, concise copy, and CTA sequencing that makes the next step obvious.*

*7. Require premium interaction quality: skeleton states, optimistic-but-safe feedback, graceful retries, helpful empty states, and calm failure states.* *8. Require accessibility and responsive behavior as part of definition of done, not as a later polish task.*

*9. Any money-movement flow must show a status timeline and expected completion window where relevant.*

<!-- Page 29 -->

*10. Deliverables must include UX rationale, component behavior notes, state coverage, and acceptance criteria, not only code artifacts.* Implement the CineX wallet dashboard.

Requirements:

- show live NGN / USDCx balances

- pull real production/mainnet values in live mode

- support loading, stale, and partial-data states

- surface recent transactions/disbursement statuses

- maintain passkey-auth session

- no crypto-jargon in user-facing copy

- responsive at 375px, 768px, 1024px Product Design UI/UX requirements: the wallet dashboard must behave like a modern financial workspace, not a crypto console. Prioritize available balance, held funds, recent activity, payout status, and next recommended action. Separate “what you can do now” from “what is processing” with clear visual hierarchy *The dashboard must:*

- * - show NGN and digital-dollar values in a calm, trustworthy way;*

- * - highlight pending releases, upcoming actions, and unresolved reviews;*

- * - use plain-English labels and tooltips for advanced concepts;*

- * - include empty, stale, partial-data, loading, and degraded-network states;*

- * - visually align with CineX’s dark cinematic brand system, mint primary actions, strong contrast, and premium spacing rhythm.* Deliverables:

- data hooks

- UI components

- formatting utilities

- tests for empty balance, stale data, slow refresh

### 9.4 Campaign Creation Prompt

PRD Reference:

- Epic 3 Implementation Tasks — Week 6, Days 1–2

- PRD §2 Creative Verification Tier System (tier-aware funding caps)

<!-- Page 30 -->

Global status for every Frontend user-facing prompt: *Frontend / UI / UX Overlay — Mandatory for all user-facing prompts* *For any prompt involving onboarding, wallet creation, dashboard views, campaign creation, deposits, withdrawals, milestone submission, milestone voting, gatekeeper review, admin review, profiles, pools, activity feeds, or AI credibility surfaces, include the following constraints:* *1. Start with the user’s job-to-be-done, confidence level, and likely fear/friction point before defining the interface.* *2. Design for non-crypto-native users first; expert users may move faster, but first-time users must still understand the flow.* *3. Do not expose internal protocol jargon in UI copy. Avoid “USDCx,” “burn,” “mint,” “attestation,”

“bridge,” “BOS,” “CCTP,” “gas,” “private key,” “seed phrase,” and “escrow” in user-facing text unless explicitly placed in advanced technical disclosure.* *4. Prefer plain-English substitutes such as “digital dollars,” “held funds,” “release funds,” “convert to

Naira,” “send to bank,” “account security,” and “verification.”* *5. Use progressive disclosure: show what matters now, reveal technical detail only when needed for trust, support, or audit review.* *6. Require clear visual hierarchy, concise copy, and CTA sequencing that makes the next step obvious.*

*7. Require premium interaction quality: skeleton states, optimistic-but-safe feedback, graceful retries, helpful empty states, and calm failure states.* *8. Require accessibility and responsive behavior as part of definition of done, not as a later polish task.*

*9. Any money-movement flow must show a status timeline and expected completion window where relevant.* *10. Deliverables must include UX rationale, component behavior notes, state coverage, and acceptance criteria, not only code artifacts.* Implement CineX campaign creation UI and submission flow.

Requirements:

- title, description, target, milestone list

- tier-aware funding cap enforcement

- if cap exceeded, show upgrade prompt instead of raw rejection

- save to chain

- validation for malformed milestones and duplicate milestone labels

- support demo mode with no-cap presentation behavior if required by spec Product Design UI/UX requirements:

- campaign creation must feel like guided project setup, not form-filling. Break the flow into logically grouped sections with milestone previews, inline validation, funding-cap explanation, and clear upgrade guidance when tier limits are reached.

<!-- Page 31 -->

- Replace hard-stop errors with upgrade pathways and explanatory copy that reinforces trust and momentum.* Output:

- form components

- validation schema

- contract call integration

- tests for cap enforcement and save failure recovery

### 9.5 Escrow Status UI Prompt

PRD Reference:

- Epic 3 Implementation Tasks — Week 6, Days 3–4 (live data from milestone-escrow.clar, not mocked) Global status for every Frontend user-facing prompt: *Frontend / UI / UX Overlay — Mandatory for all user-facing prompts* *For any prompt involving onboarding, wallet creation, dashboard views, campaign creation, deposits, withdrawals, milestone submission, milestone voting, gatekeeper review, admin review, profiles, pools, activity feeds, or AI credibility surfaces, include the following constraints:* *1. Start with the user’s job-to-be-done, confidence level, and likely fear/friction point before defining the interface.* *2. Design for non-crypto-native users first; expert users may move faster, but first-time users must still understand the flow.* *3. Do not expose internal protocol jargon in UI copy. Avoid “USDCx,” “burn,” “mint,” “attestation,”

“bridge,” “BOS,” “CCTP,” “gas,” “private key,” “seed phrase,” and “escrow” in user-facing text unless explicitly placed in advanced technical disclosure.* *4. Prefer plain-English substitutes such as “digital dollars,” “held funds,” “release funds,” “convert to

Naira,” “send to bank,” “account security,” and “verification.”* *5. Use progressive disclosure: show what matters now, reveal technical detail only when needed for trust, support, or audit review.* *6. Require clear visual hierarchy, concise copy, and CTA sequencing that makes the next step obvious.*

*7. Require premium interaction quality: skeleton states, optimistic-but-safe feedback, graceful retries, helpful empty states, and calm failure states.* *8. Require accessibility and responsive behavior as part of definition of done, not as a later polish task.*

*9. Any money-movement flow must show a status timeline and expected completion window where relevant.* *10. Deliverables must include UX rationale, component behavior notes, state coverage, and acceptance criteria, not only code artifacts.*

<!-- Page 32 -->

Implement live escrow status display for campaigns.

Requirements:

- read real data from milestone-escrow.clar

- no mocked values in production mode

- display current funded amount, milestone status, and eligibility for next action

- reconcile Explorer-visible values with UI formatting

- refresh gracefully after state-changing tx Product Designer UI/UX requirements:

- the escrow status experience must present a simple, confidence-building timeline for held funds, milestone approvals, and payout progress.

- Translate internal settlement states into plain-English user labels such as “Getting ready,”

“Releasing funds,” “Converting to Naira,” “Sending to bank,” and “Completed.” Never expose backend state names unless shown in an advanced detail drawer for ops/admin users.*

Deliverables:

- read hooks/services

- data transformation layer

- tests for stale chain data and partial fetch failure

### 9.6 Transaction Modal + ContractErrorMap Prompt

PRD Reference:

- Epic 3 Implementation Tasks — Week 6, Day 5 Global status for every Frontend user-facing prompt: *Frontend / UI / UX Overlay — Mandatory for all user-facing prompts* *For any prompt involving onboarding, wallet creation, dashboard views, campaign creation, deposits, withdrawals, milestone submission, milestone voting, gatekeeper review, admin review, profiles, pools, activity feeds, or AI credibility surfaces, include the following constraints:* *1. Start with the user’s job-to-be-done, confidence level, and likely fear/friction point before defining the interface.* *2. Design for non-crypto-native users first; expert users may move faster, but first-time users must still understand the flow.* *3. Do not expose internal protocol jargon in UI copy. Avoid “USDCx,” “burn,” “mint,” “attestation,”

“bridge,” “BOS,” “CCTP,” “gas,” “private key,” “seed phrase,” and “escrow” in user-facing text unless explicitly placed in advanced technical disclosure.*

<!-- Page 33 -->

*4. Prefer plain-English substitutes such as “digital dollars,” “held funds,” “release funds,” “convert to

Naira,” “send to bank,” “account security,” and “verification.”* *5. Use progressive disclosure: show what matters now, reveal technical detail only when needed for trust, support, or audit review.* *6. Require clear visual hierarchy, concise copy, and CTA sequencing that makes the next step obvious.*

*7. Require premium interaction quality: skeleton states, optimistic-but-safe feedback, graceful retries, helpful empty states, and calm failure states.* *8. Require accessibility and responsive behavior as part of definition of done, not as a later polish task.*

*9. Any money-movement flow must show a status timeline and expected completion window where relevant.* *10. Deliverables must include UX rationale, component behavior notes, state coverage, and acceptance criteria, not only code artifacts.* Implement CineX transaction modal system and ContractErrorMap.

Requirements:

- loading state for every on-chain action

- human-readable error mapping

- distinguish wallet cancel vs contract rejection vs broadcast failure vs confirmation timeout

- reusable across deposit, campaign creation, vote, release, rating, pool actions

- no raw Clarity error codes exposed to end users without translation Product Design UI/UX requirements:

- transaction modals must function as trust surfaces, not just confirmation popups.

- Each modal must show the action, why it matters, what the user is approving, expected timing, what happens after approval, and whether the app retries automatically.

- Error mapping must convert technical failures into calm, action-oriented language, including timeout guidance, safe-to-close guidance, and when the CineX team has been notified.*

Output:

- modal system

- error map registry

- tests for representative error categories

### 9.7 Milestone Voting and Release UI Prompt

PRD Reference:

- Epic 3 Implementation Tasks — Week 7, Days 1–2

- PRD §1.1 Ground Truth — row "Milestone approval authority" (backer-weighted sequential voting; gatekeepers do NOT approve fund releases)

<!-- Page 34 -->

Global status for every Frontend user-facing prompt: *Frontend / UI / UX Overlay — Mandatory for all user-facing prompts* *For any prompt involving onboarding, wallet creation, dashboard views, campaign creation, deposits, withdrawals, milestone submission, milestone voting, gatekeeper review, admin review, profiles, pools, activity feeds, or AI credibility surfaces, include the following constraints:* *1. Start with the user’s job-to-be-done, confidence level, and likely fear/friction point before defining the interface.* *2. Design for non-crypto-native users first; expert users may move faster, but first-time users must still understand the flow.* *3. Do not expose internal protocol jargon in UI copy. Avoid “USDCx,” “burn,” “mint,” “attestation,”

“bridge,” “BOS,” “CCTP,” “gas,” “private key,” “seed phrase,” and “escrow” in user-facing text unless explicitly placed in advanced technical disclosure.* *4. Prefer plain-English substitutes such as “digital dollars,” “held funds,” “release funds,” “convert to

Naira,” “send to bank,” “account security,” and “verification.”* *5. Use progressive disclosure: show what matters now, reveal technical detail only when needed for trust, support, or audit review.* *6. Require clear visual hierarchy, concise copy, and CTA sequencing that makes the next step obvious.*

*7. Require premium interaction quality: skeleton states, optimistic-but-safe feedback, graceful retries, helpful empty states, and calm failure states.* *8. Require accessibility and responsive behavior as part of definition of done, not as a later polish task.*

*9. Any money-movement flow must show a status timeline and expected completion window where relevant.* *10. Deliverables must include UX rationale, component behavior notes, state coverage, and acceptance criteria, not only code artifacts.* Implement the milestone tracking and backer approval UI.

Requirements:

- show milestone progression

- support YES/NO voting for eligible backers

- enforce backer-weighted vote logic client-side only as assistive UX, with contract remaining source of truth

- clearly show when a milestone is releasable vs pending vs disputed

- trigger BOS-linked release flow only after on-chain approval Product Designer UI/UX requirements:

- the milestone voting and release flow must help backers and reviewers make high-confidence decisions quickly.

<!-- Page 35 -->

- Prioritize deliverable evidence, milestone summary, release amount, reviewer context, and vote impact before showing the commit action.

- Include disagreement, insufficient evidence, abstain/return-for-revision, and post-vote confirmation states.

- The UI must feel credible, fair, and easy to understand even for users unfamiliar with on-chain voting.* Deliverables:

- components

- vote + release hooks

- tests for permissions, vote state changes, and release gating

### 9.8 Tier 1 QA Prompt

PRD Reference:

- Epic 3 Implementation Tasks — Week 7, Days 3–5, and Epic 3 Success Criteria Create a full QA and regression suite for CineX Tier 1 features.

Scope:

- passkey login

- demo mode

- onboarding

- wallet dashboard

- campaign creation

- escrow view

- milestone voting

- release trigger path

- transaction modals

- mobile responsiveness Requirements:

- real-device coverage where possible

- mainnet/live-mode regression cases

- no critical bug may remain unresolved before deployment

- output reproducible bug reports with severity Deliverables:

- test matrix

- E2E suite

- regression checklist

- launch signoff rubric

### 9.9 Tier 1 Deployment Prompt

PRD Reference:

<!-- Page 36 -->

- Epic 3 Implementation Tasks — Week 8, Days 1–2

- PRD §7 Grant Milestone Report Templates — 1F Phase 1 Checklist / 2B Wallet UI Tier 1

Deploy CineX Tier 1 and demo environments.

Targets:

- app.cinex.vercel.app

- demo.cinex.vercel.app Requirements:

- environment separation

- demo seeded accounts/data

- passkey login live on production

- no cross-environment credential leakage

- health checks

- rollback plan

- post-deploy smoke tests Output:

- deployment config

- env matrix

- smoke test list

- rollback playbook

10. Pilot Execution and BOS Release Prompts

### 10.1 Pilot Release Trigger Prompt

PRD Reference:

- Epic 4: Pilot Projects — Implementation Tasks, Week 8 (milestone 1 fund release)

- PRD §7 Grant Milestone Report Templates — 2C Pilot Project Deliverables Implement the production disbursement execution path for pilot milestone releases.

Global status for every Frontend user-facing prompt:
*Frontend / UI / UX Overlay — Mandatory for all user-facing prompts*
*For any prompt involving onboarding, wallet creation, dashboard views, campaign creation, deposits, withdrawals, milestone submission, milestone voting, gatekeeper review, admin review, profiles, pools, activity feeds, or AI credibility surfaces, include the following constraints:*
*1. Start with the user’s job-to-be-done, confidence level, and likely fear/friction point before defining the interface.*
*2. Design for non-crypto-native users first; expert users may move faster, but first-time users must still understand the flow.*
*3. Do not expose internal protocol jargon in UI copy. Avoid “USDCx,” “burn,” “mint,” “attestation,” “bridge,” “BOS,” “CCTP,” “gas,” “private key,” “seed phrase,” and “escrow” in user-facing text unless explicitly placed in advanced technical disclosure.*
*4. Prefer plain-English substitutes such as “digital dollars,” “held funds,” “release funds,” “convert to Naira,” “send to bank,” “account security,” and “verification.”*
*5. Use progressive disclosure: show what matters now, reveal technical detail only when needed for trust, support, or audit review.*
*6. Require clear visual hierarchy, concise copy, and CTA sequencing that makes the next step obvious.*
*7. Require premium interaction quality: skeleton states, optimistic-but-safe feedback, graceful retries, helpful empty states, and calm failure states.*
*8. Require accessibility and responsive behavior as part of definition of done, not as a later polish task.*
*9. Any money-movement flow must show a status timeline and expected completion window where relevant.*
*10. Deliverables must include UX rationale, component behavior notes, state coverage, and acceptance criteria, not only code artifacts.*



Scope:

- trigger from approved milestone release

- create disbursement intent

- run BOS

- store all hashes and references

- confirm funds reach creator bank account

- mark milestone release evidence complete Requirements:

- must work for Death of Eternity and Rain

<!-- Page 37 -->

- strict linkage between on-chain milestone approval and BOS disbursement

- impossible to trigger payout without approved milestone state

- support two simultaneous pilot disbursements without ID collision or shared-state corruption

Output:

- release trigger implementation

- evidence collection logic

- tests for duplicate trigger and race conditions

### 10.2 Wallet Demo Evidence Prompt

PRD Reference:

- Epic 1+2 Implementation Tasks — Week 4 (wallet demo video: passkey onboarding → deposit →

NGN withdrawal)

- PRD §7 Grant Milestone Report Templates — 1D Passkey Wallet + Backend Produce the CineX wallet demo evidence flow.


Global status for every Frontend user-facing prompt:
*Frontend / UI / UX Overlay — Mandatory for all user-facing prompts*
*For any prompt involving onboarding, wallet creation, dashboard views, campaign creation, deposits, withdrawals, milestone submission, milestone voting, gatekeeper review, admin review, profiles, pools, activity feeds, or AI credibility surfaces, include the following constraints:*
*1. Start with the user’s job-to-be-done, confidence level, and likely fear/friction point before defining the interface.*
*2. Design for non-crypto-native users first; expert users may move faster, but first-time users must still understand the flow.*
*3. Do not expose internal protocol jargon in UI copy. Avoid “USDCx,” “burn,” “mint,” “attestation,” “bridge,” “BOS,” “CCTP,” “gas,” “private key,” “seed phrase,” and “escrow” in user-facing text unless explicitly placed in advanced technical disclosure.*
*4. Prefer plain-English substitutes such as “digital dollars,” “held funds,” “release funds,” “convert to Naira,” “send to bank,” “account security,” and “verification.”*
*5. Use progressive disclosure: show what matters now, reveal technical detail only when needed for trust, support, or audit review.*
*6. Require clear visual hierarchy, concise copy, and CTA sequencing that makes the next step obvious.*
*7. Require premium interaction quality: skeleton states, optimistic-but-safe feedback, graceful retries, helpful empty states, and calm failure states.*
*8. Require accessibility and responsive behavior as part of definition of done, not as a later polish task.*
*9. Any money-movement flow must show a status timeline and expected completion window where relevant.*
*10. Deliverables must include UX rationale, component behavior notes, state coverage, and acceptance criteria, not only code artifacts.*



Scope:

- passkey onboarding

- account creation/login

- deposit path

- withdrawal/disbursement initiation path

- plain-English UX

- no seed phrase ever displayed Deliverables:

- demo script

- checklist of scenes to capture

- evidence file naming convention

- verification list to ensure the video proves the intended production UX

11. Tier 2 Prompts

### 11.1 Profiles + Portfolio Prompt

PRD Reference:

- Epic 3 Tier 2 (Post-Week 8) Implementation Tasks — Week 9 Global status for every Frontend user-facing prompt: *Frontend / UI / UX Overlay — Mandatory for all user-facing prompts*

<!-- Page 38 -->

*For any prompt involving onboarding, wallet creation, dashboard views, campaign creation, deposits, withdrawals, milestone submission, milestone voting, gatekeeper review, admin review, profiles, pools, activity feeds, or AI credibility surfaces, include the following constraints:* *1. Start with the user’s job-to-be-done, confidence level, and likely fear/friction point before defining the interface.* *2. Design for non-crypto-native users first; expert users may move faster, but first-time users must still understand the flow.* *3. Do not expose internal protocol jargon in UI copy. Avoid “USDCx,” “burn,” “mint,” “attestation,”

“bridge,” “BOS,” “CCTP,” “gas,” “private key,” “seed phrase,” and “escrow” in user-facing text unless explicitly placed in advanced technical disclosure.* *4. Prefer plain-English substitutes such as “digital dollars,” “held funds,” “release funds,” “convert to

Naira,” “send to bank,” “account security,” and “verification.”* *5. Use progressive disclosure: show what matters now, reveal technical detail only when needed for trust, support, or audit review.* *6. Require clear visual hierarchy, concise copy, and CTA sequencing that makes the next step obvious.*

*7. Require premium interaction quality: skeleton states, optimistic-but-safe feedback, graceful retries, helpful empty states, and calm failure states.* *8. Require accessibility and responsive behavior as part of definition of done, not as a later polish task.*

*9. Any money-movement flow must show a status timeline and expected completion window where relevant.* *10. Deliverables must include UX rationale, component behavior notes, state coverage, and acceptance criteria, not only code artifacts.* Implement CineX user profiles and portfolio CRUD.

Requirements:

- creatives and backers can view/edit profile

- portfolio items validated and stored safely

- show on-chain history where relevant

- support draft/edit/delete flows

- preserve performance on mobile Product Design UI/UX requirements:

- profiles and portfolios must communicate legitimacy, track record, and readiness for funding at a glance.

- Prioritize verification status, completed milestones, collaboration history, ratings, and evidence of delivery.

- Use a clean editorial layout that feels closer to a premium creator portfolio plus fintech trust profile than a blockchain explorer.* Deliverables:

- profile schema

<!-- Page 39 -->

- components

- API/backend handlers if needed

- tests

### 11.2 Rating System Prompt

PRD Reference:

- Epic 3 Tier 2 Implementation Tasks — Week 9 (rating system → reputation.clar)

Implement the CineX rating system integrated with reputation.clar.

Requirements:

- 1–5 star ratings

- eligibility rules

- prevent duplicate invalid rating patterns

- reflect on-chain source of truth

- display aggregated reputation cleanly Deliverables:

##

- UI

- contract integration

- validation rules

- tests for duplicate, unauthorized, and edge-case ratings

### 11.3 Pools / Funding-Pool Prompt

PRD Reference:

- Epic 3 Tier 2 Implementation Tasks — Week 10 (Tribe/Pool homepage → funding-pool.clar)

Global status for every Frontend user-facing prompt: *Frontend / UI / UX Overlay — Mandatory for all user-facing prompts* *For any prompt involving onboarding, wallet creation, dashboard views, campaign creation, deposits, withdrawals, milestone submission, milestone voting, gatekeeper review, admin review, profiles, pools, activity feeds, or AI credibility surfaces, include the following constraints:* *1. Start with the user’s job-to-be-done, confidence level, and likely fear/friction point before defining the interface.* *2. Design for non-crypto-native users first; expert users may move faster, but first-time users must still understand the flow.* *3. Do not expose internal protocol jargon in UI copy. Avoid “USDCx,” “burn,” “mint,” “attestation,”

“bridge,” “BOS,” “CCTP,” “gas,” “private key,” “seed phrase,” and “escrow” in user-facing text unless explicitly placed in advanced technical disclosure.*

<!-- Page 40 -->

*4. Prefer plain-English substitutes such as “digital dollars,” “held funds,” “release funds,” “convert to

Naira,” “send to bank,” “account security,” and “verification.”* *5. Use progressive disclosure: show what matters now, reveal technical detail only when needed for trust, support, or audit review.* *6. Require clear visual hierarchy, concise copy, and CTA sequencing that makes the next step obvious.*

*7. Require premium interaction quality: skeleton states, optimistic-but-safe feedback, graceful retries, helpful empty states, and calm failure states.* *8. Require accessibility and responsive behavior as part of definition of done, not as a later polish task.*

*9. Any money-movement flow must show a status timeline and expected completion window where relevant.* *10. Deliverables must include UX rationale, component behavior notes, state coverage, and acceptance criteria, not only code artifacts.* Implement the Tribe/Pool homepage and core interactions for funding-pool.clar.

Requirements:

- pool creation

- member listing

- proposal reading

- permission-sensitive actions

- responsive UI

- chain state synchronization Product Design UI/UX requirements:

- pool and tribe interfaces must make collective participation legible.

- Clearly separate member context, proposal summaries, contribution health, active votes, and pending decisions.

- Design for confidence and readability over density; users should understand the state of a pool within seconds.* Deliverables:

- components

- read/write hooks

- tests for membership and proposal display correctness

### 11.4 Activity Feed and Indexer Prompt

PRD Reference:

- Epic 3 Tier 2 Implementation Tasks — Week 11 (activity feed + off-chain indexer)

<!-- Page 41 -->

Global status for every Frontend user-facing prompt: *Frontend / UI / UX Overlay — Mandatory for all user-facing prompts* *For any prompt involving onboarding, wallet creation, dashboard views, campaign creation, deposits, withdrawals, milestone submission, milestone voting, gatekeeper review, admin review, profiles, pools, activity feeds, or AI credibility surfaces, include the following constraints:* *1. Start with the user’s job-to-be-done, confidence level, and likely fear/friction point before defining the interface.* *2. Design for non-crypto-native users first; expert users may move faster, but first-time users must still understand the flow.* *3. Do not expose internal protocol jargon in UI copy. Avoid “USDCx,” “burn,” “mint,” “attestation,”

“bridge,” “BOS,” “CCTP,” “gas,” “private key,” “seed phrase,” and “escrow” in user-facing text unless explicitly placed in advanced technical disclosure.* *4. Prefer plain-English substitutes such as “digital dollars,” “held funds,” “release funds,” “convert to

Naira,” “send to bank,” “account security,” and “verification.”* *5. Use progressive disclosure: show what matters now, reveal technical detail only when needed for trust, support, or audit review.* *6. Require clear visual hierarchy, concise copy, and CTA sequencing that makes the next step obvious.*

*7. Require premium interaction quality: skeleton states, optimistic-but-safe feedback, graceful retries, helpful empty states, and calm failure states.* *8. Require accessibility and responsive behavior as part of definition of done, not as a later polish task.*

*9. Any money-movement flow must show a status timeline and expected completion window where relevant.* *10. Deliverables must include UX rationale, component behavior notes, state coverage, and acceptance criteria, not only code artifacts.* Implement CineX’s off-chain event indexer and real-time activity feed.

Requirements:

- index all relevant events from the 12 contracts

- populate Neon on_chain_events

- support milestone, deposit, verification, endorsement, rating, and pool activity

- avoid duplicate indexing

- support resumable catch-up from last processed block

- expose frontend feed API with pagination Product Design UI/UX requirements:

- the activity feed must translate protocol and operational events into readable, chronological trust signals.

- Prefer sentence-style event cards with actor, action, subject, and outcome.

- Use filters for milestones, verification, funding, payouts, and governance, while preserving a simple default view for non-technical users.*

<!-- Page 42 -->

Deliverables:

- indexer worker

- cursor/checkpoint model

- feed API

- tests for duplicate/catch-up scenarios

### 11.5 AI Credibility Summary Prompt

PRD Reference:

- Epic 3 Tier 2 Implementation Tasks — Week 12 (AI Credibility Summary) Global status for every Frontend user-facing prompt: *Frontend / UI / UX Overlay — Mandatory for all user-facing prompts* *For any prompt involving onboarding, wallet creation, dashboard views, campaign creation, deposits, withdrawals, milestone submission, milestone voting, gatekeeper review, admin review, profiles, pools, activity feeds, or AI credibility surfaces, include the following constraints:* *1. Start with the user’s job-to-be-done, confidence level, and likely fear/friction point before defining the interface.* *2. Design for non-crypto-native users first; expert users may move faster, but first-time users must still understand the flow.* *3. Do not expose internal protocol jargon in UI copy. Avoid “USDCx,” “burn,” “mint,” “attestation,”

“bridge,” “BOS,” “CCTP,” “gas,” “private key,” “seed phrase,” and “escrow” in user-facing text unless explicitly placed in advanced technical disclosure.* *4. Prefer plain-English substitutes such as “digital dollars,” “held funds,” “release funds,” “convert to

Naira,” “send to bank,” “account security,” and “verification.”* *5. Use progressive disclosure: show what matters now, reveal technical detail only when needed for trust, support, or audit review.* *6. Require clear visual hierarchy, concise copy, and CTA sequencing that makes the next step obvious.*

*7. Require premium interaction quality: skeleton states, optimistic-but-safe feedback, graceful retries, helpful empty states, and calm failure states.* *8. Require accessibility and responsive behavior as part of definition of done, not as a later polish task.*

*9. Any money-movement flow must show a status timeline and expected completion window where relevant.* *10. Deliverables must include UX rationale, component behavior notes, state coverage, and acceptance criteria, not only code artifacts.* Implement the AI Credibility Summary feature.

Requirements:

<!-- Page 43 -->

- derive summary from on-chain reputation + indexed activity

- rate limiting

- caching

- deterministic prompt construction

- no hallucinated factual claims beyond indexed data

- graceful fallback when AI provider unavailable Product Design UI/UX requirements:

- the AI credibility summary must be framed as decision support, not absolute truth.

- Show why the summary was generated, what evidence informed it, when it was last updated, and what the user should still verify manually.

- The experience should feel transparent, useful, and institutionally credible without sounding overconfident or opaque.* Deliverables:

- aiService backend

- prompt template

- caching layer

- tests for empty profiles, sparse data, rate limiting, fallback response

12. ILP Conditional Prompts

### 12.1 ILP Architecture Prompt

PRD Reference:

- Epic 6: ILP Integration (P2 — Conditional) — Implementation Tasks, Week 9 (WALLET_ABSTRACTION_PLAN.md 4-leg update)

- PRD §7 Grant Milestone Report Templates — 3B ILP (if confirmed) Design CineX’s conditional ILP inbound funding flow.

Important: ILP handles inbound international funding.

BOS handles outbound creator disbursement.

Do not mix them.

Requirements:

<!-- Page 44 -->

- update WALLET_ABSTRACTION_PLAN.md

- define foreign currency → ILP → xReserve-backed USDCx in milestone escrow flow

- maintain separation between inbound funding adapter and outbound disbursement adapter

- document handoff into escrow state Deliverables:

- architecture note

- adapter boundary definition

- sequence diagram

- assumptions and constraints

### 12.2 ILP Integration Prompt

PRD Reference:

- Epic 6: ILP Integration — Implementation Tasks, Week 10–11 Implement the ILP inbound funding testnet demo for CineX.

Requirements:

- accept foreign funding event or simulated external payment

- route through ILP layer

- credit xReserve-backed USDCx into milestone-escrow path

- produce full traceable demo artifact

- must not interfere with BOS outbound path Deliverables:

- integration code

- demo harness

- observability hooks

- tests

13. Documentation and Evidence Prompts

### 13.1 GitHub Wiki + Contract Docs Prompt

PRD Reference:

- Epic 7: Open-Source Documentation — Implementation Tasks, Week 11–12 Produce function-level documentation for all 12 CineX logic contracts.

Requirements:

- every public function documented

- parameter semantics

- auth model

<!-- Page 45 -->

- error codes and ranges

- cross-contract call table

- deployment order guide

- examples for key flows Output:

- markdown/wiki pages

- autogenerated artifacts if feasible

- consistency check against actual contract signatures

### 13.2 Engineering Evidence Package Prompt

PRD Reference:

- PRD §7 Grant Milestone Report Templates — all (1A–3C), especially 3C Final 12-Week Summary

- Epic 7: Open-Source Documentation — Implementation Tasks, Week 12 (grant proof package)

Build the CineX engineering evidence pack for grant and audit use.

Must include:

- deployment artifacts

- explorer links

- BOS audit trail examples

- wallet flow demo evidence

- Yellow Card sandbox/prod confirmation evidence

- test counts and pass/fail summaries

- architecture decisions and final ground-truth notes Output:

- evidence index

- artifact folder structure

- reproducible checklist for PM/founder review

14. Owner Mapping Guide

Note on PRD scope not covered above: PRD Epic 5 (Gatekeeper Workshop, Weeks 9-10) and the fee/cap specifics in PRD Section 2 (Creative Verification Tier System) are operational/product details rather than standalone engineering tasks -- they are referenced inline above where relevant (e.g. 4.3, 9.4) but do not have dedicated task-specific prompts. Consult the PRD directly for that content.

Suggested ownership mapping from the Sprint Tracker:

- Victor: contracts, deployment, verification logic, BOS release logic, architectural decisions

- McDaniells: full-stack implementation, Neon migration, Pillar integration, BOS engineering, frontend features

- Theophilus: credential acquisition, operational dependencies, pilot onboarding, reporting, rollout coordination

<!-- Page 46 -->

- Stephanie: design/UX validation, responsive QA, demo capture support

- Eno: pilots, reporting, conditional ILP coordination

- Qadesh: workshop materials, reports, adoption collateral

15. Final Note

This Bible is intended to be copy-pasted into engineering chats, AI coding agents, task tickets, or sub-agent workflows.

The most critical prompt in this document is the SAFE Forwarding Prompt, which supersedes the earlier forwarding draft and adds:

- payout preflight gating

- manual-review stop states

- contaminated-balance controls

- circuit breaker logic

- daily/max caps

- strict beneficiary matching

- explicit production enablement controls If any implementation conflicts with the safe forwarding rules, the safe forwarding rules win.
