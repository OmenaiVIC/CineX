# xReserve Integration-Surface Lock — Implementation-Lock Technical Brief

## 1. Objective

Define the exact integration surface for CineX's outbound creator disbursement path: from Stacks-side USDCx burn trigger, through xReserve attestation, to destination release and Yellow Card NGN payout. Lock the canonical sequence, state machine, identifiers, polling strategy, and environment variables so a senior engineer can implement BOS without reopening protocol ambiguity.

**PRD sections satisfied:**
- §1.1 Architectural Ground Truth — "Settlement asset — escrow" row (USDCx = Circle xReserve on Stacks)
- Reviewer Addendum → Settlement Ground Truth (canonical burn → attestation → release → Yellow Card → NGN path)
- Reviewer Addendum → Risk / Assumption Note (CCTP V1 not a blocker; xReserve surface must be verified)

---

## 2. Technical Assumptions

| # | Assumption | Basis | Status |
|---|-----------|-------|--------|
| A1 | USDCx is a SIP-010 token on Stacks, backed by Circle xReserve reserves | PRD §1.1 ground truth | Verified (PRD) |
| A2 | Stacks-side USDCx burn is a native SIP-010 `burn` or `send-to-burn-address` call — NOT a CCTP V1 `TokenMessenger.initiateBurn` call | Reviewer Addendum Settlement Ground Truth + Risk Note | Locked (PRD) |
| A3 | xReserve provides a destination-chain attestation API (REST or SDK) that maps burn tx hashes to destination USDC release events | External assumption — interface to be defined | **BLOCKER: External API contract needed** |
| A4 | Yellow Card provides a REST API for NGN bank transfers, with sandbox and production environments | PRD §2.2, §Epic 1+2 tasks | Verified (PRD: "Confirm Yellow Card sandbox access" — Week 2) |
| A5 | BOS is a backend service (Node.js/Express, same stack as existing `backend/`) that orchestrates the full disbursement lifecycle | PRD review addendum | Locked (PRD) |
| A6 | The on-chain `release-milestone-funds` function in `milestone-escrow.clar` transfers USDCx (not STX) to the creator when the campaign asset is USDCx | PRD §1.1 + existing contract logic | Verified: `contracts/milestone-escrow.clar:355-405` uses `asset-transfer?` with the campaign's registered asset |
| A7 | The backend proxy wallet (`CREATOR_KEY` / `BACKER_KEY` pattern) will also hold the creator's USDCx balance for disbursement | Existing pattern in `backend/src/services/contractService.js` | Locked |
| A8 | Yellow Card recipient must be a Nigerian bank account with valid account number and bank code | Yellow Card API standard | External assumption |

---

## 3. Architecture Decisions

| # | Decision | Rationale | PRD Trace |
|---|---------|-----------|-----------|
| D1 | **BridgeAdapter interface pattern** — BOS defines a `BridgeAdapter` interface with `burn()`, `getAttestationStatus()`, `getDestinationReleaseStatus()` methods. The xReserve adapter is the first concrete implementation. | Abstracts external dependency behind a clean interface; allows future providers without BOS rewrite. Aligns with engineering rule: "define exact interface contract, clearly mark external assumption." | Settlement Ground Truth + Risk Note |
| D2 | **Destination-side release is hybrid: poll + event** — BOS polls xReserve attestation API every 30s for 15 min (happy path), then falls back to webhook subscription if xReserve supports it. Timeout = 15 min = manual escalation. | Deterministic. No dependency on webhook infrastructure for MVP. Webhook is optional acceleration. Aligns with "explicitly model happy path, timeout path, retry path." | Engineering rules |
| D3 | **Idempotency via `disbursementId`** — Every disbursement gets a UUID v4 `disbursementId` generated at initiation. This ID is the idempotency key for all downstream calls (burn, attestation poll, Yellow Card payout). Prevents duplicate money movement. | Engineering rule: "use idempotency everywhere money movement is involved." | Engineering rules |
| D4 | **Dual-write: DB-first, chain-second** — BOS writes disbursement record to Neon DB (status: `initiated`) before broadcasting the burn tx. Chain failure does not block the DB record. Follows existing dual-write pattern in `contractService.js`. | Existing pattern. Chain failure is non-blocking. | Existing codebase pattern |
| D5 | **Yellow Card payout is synchronous with retry** — BOS calls Yellow Card API to initiate NGN transfer after attestation confirms. Retry up to 3x with exponential backoff. After 3 failures, status = `payout_failed` and alert is triggered. | Money movement must be auditable. Synchronous call provides immediate confirmation or failure. | Engineering rules: "treat all settlement operations as auditable financial events" |
| D6 | **No production money movement depends on ambiguous state** — BOS must verify all preconditions before each state transition. If any precondition is unclear, the disbursement is held in `pending_review` status for manual resolution. | Engineering rule. | Engineering rules |
| D7 | **Sandbox vs production separation** — Yellow Card sandbox key, xReserve sandbox/testnet endpoint, and Stacks testnet are used in non-production. Production env vars are separate and explicitly marked. | Engineering rule: "separate sandbox/testnet behavior from production behavior explicitly." | Engineering rules |
| D8 | **USDCx burn on Stacks uses the xReserve burn function** — The exact mechanism is: call the USDCx contract's `burn` function (SIP-010 standard) with the amount. The burn tx hash becomes the attestation reference. This is NOT a CCTP `initiateBurn` call. | Reviewer Addendum: "not treated as dependent on legacy CCTP V1 TokenMessenger/MessageTransmitter." | Settlement Ground Truth |

---

## 4. Files/Modules to Create or Modify

| # | File | Action | Purpose |
|---|------|--------|---------|
| F1 | `backend/src/services/bos/disbursementTypes.ts` | CREATE | Type definitions: `Disbursement`, `DisbursementStatus`, `AttestationStatus`, `BridgeAdapter` interface, `YellowCardPayoutRequest`, `YellowCardPayoutResponse` |
| F2 | `backend/src/services/bos/bridgeAdapterFactory.ts` | CREATE | Factory that returns the correct `BridgeAdapter` implementation based on env (`xreserve` for now, `cctp-v2` stub for future) |
| F3 | `backend/src/services/bos/xreserveAdapter.ts` | CREATE | xReserve `BridgeAdapter` implementation: `burn()`, `getAttestationStatus()`, `getDestinationReleaseStatus()` |
| F4 | `backend/src/services/bos/yellowCardService.ts` | CREATE | Yellow Card API client: `initiatePayout()`, `getPayoutStatus()`, `verifyRecipient()` |
| F5 | `backend/src/services/bos/disbursementService.ts` | CREATE | Core BOS orchestrator: state machine, idempotency, DB writes, chain calls, attestation polling, Yellow Card handoff |
| F6 | `backend/src/services/bos/disbursementStateMachine.ts` | CREATE | Explicit state machine with guard functions for each transition |
| F7 | `backend/src/routes/disbursements.ts` | CREATE | API routes: `POST /api/disbursements`, `GET /api/disbursements/:id`, `GET /api/disbursements/:id/status` |
| F8 | `backend/src/database/migrations/002_disbursements.sql` | CREATE | DB migration: `disbursements` table, `disbursement_events` audit log table |
| F9 | `backend/src/database.js` | MODIFY | Add `disbursements` and `disbursement_events` table creation (or reference migration) |
| F10 | `backend/src/services/contractService.js` | MODIFY | Add `burnUsdcx()` function that calls the USDCx SIP-010 `burn` function on-chain |
| F11 | `backend/.env.example` | CREATE | Document all required environment variables including new BOS vars |

---

## 5. Data Models / Schemas

### 5.1 `disbursements` Table

```sql
CREATE TABLE disbursements (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id           INTEGER NOT NULL,
  milestone_index       INTEGER NOT NULL,
  creator_address       TEXT NOT NULL,
  recipient_bank_account TEXT NOT NULL,
  recipient_bank_code   TEXT NOT NULL,
  amount_usdcx          BIGINT NOT NULL,          -- in USDCx base units (6 decimals)
  amount_ngn_expected   BIGINT NOT NULL,          -- locked quote in NGN kobo
  exchange_rate         NUMERIC(12,6) NOT NULL,   -- USDCx -> NGN rate at initiation
  status                TEXT NOT NULL DEFAULT 'initiated',
    -- initiated -> burn_submitted -> burn_confirmed -> attestation_pending
    --   -> attestation_confirmed -> payout_initiated -> payout_complete
    -- OR any state -> payout_failed / manual_review
  burn_tx_hash          TEXT,                     -- Stacks tx hash of USDCx burn
  burn_block_height     INTEGER,                  -- block height when burn confirmed
  attestation_ref       TEXT,                     -- xReserve attestation reference
  destination_tx_hash   TEXT,                     -- Yellow Card transfer reference
  yellow_card_payment_id TEXT,                    -- Yellow Card payment ID
  ngn_payout_reference  TEXT,                     -- final NGN payout reference (bank tx ref)
  error_message         TEXT,                     -- last error if failed
  retry_count           INTEGER DEFAULT 0,
  initiated_at          TIMESTAMP DEFAULT NOW(),
  burn_submitted_at     TIMESTAMP,
  burn_confirmed_at     TIMESTAMP,
  attestation_requested_at TIMESTAMP,
  attestation_confirmed_at  TIMESTAMP,
  payout_initiated_at   TIMESTAMP,
  payout_completed_at   TIMESTAMP,
  created_by            TEXT,                     -- admin or system user who initiated
  idempotency_key       TEXT UNIQUE NOT NULL       -- prevents duplicate disbursements
);

CREATE INDEX idx_disbursements_status ON disbursements(status);
CREATE INDEX idx_disbursements_campaign ON disbursements(campaign_id, milestone_index);
CREATE INDEX idx_disbursements_burn_hash ON disbursements(burn_tx_hash);
```

### 5.2 `disbursement_events` Audit Log

```sql
CREATE TABLE disbursement_events (
  id              SERIAL PRIMARY KEY,
  disbursement_id UUID NOT NULL REFERENCES disbursements(id),
  event_type      TEXT NOT NULL,
    -- burn_submitted, burn_confirmed, burn_failed,
    -- attestation_requested, attestation_polled, attestation_confirmed, attestation_timeout,
    -- payout_initiated, payout_complete, payout_failed,
    -- manual_review_flagged, manual_review_resolved
  from_status     TEXT NOT NULL,
  to_status       TEXT NOT NULL,
  metadata        JSONB,                  -- raw API response, tx details, etc.
  created_at      TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_disbursement_events_lookup ON disbursement_events(disbursement_id, created_at);
```

### 5.3 Key TypeScript Types

```typescript
// backend/src/services/bos/disbursementTypes.ts

type DisbursementStatus =
  | 'initiated'
  | 'burn_submitted'
  | 'burn_confirmed'
  | 'attestation_pending'
  | 'attestation_confirmed'
  | 'payout_initiated'
  | 'payout_complete'
  | 'payout_failed'
  | 'manual_review';

interface BridgeAdapter {
  /** Submit USDCx burn on Stacks. Returns burn tx hash. */
  burn(params: { amount: string; disbursementId: string }): Promise<{ burnTxHash: string }>;

  /** Poll xReserve attestation status by burn tx hash. */
  getAttestationStatus(burnTxHash: string): Promise<AttestationStatus>;

  /** Get destination chain release status by attestation ref. */
  getDestinationReleaseStatus(attestationRef: string): Promise<DestinationReleaseStatus>;
}

type AttestationStatus =
  | { status: 'pending' }
  | { status: 'confirmed'; attestationRef: string }
  | { status: 'failed'; reason: string };

type DestinationReleaseStatus =
  | { status: 'pending' }
  | { status: 'released'; destinationTxHash: string }
  | { status: 'failed'; reason: string };

interface YellowCardPayoutRequest {
  disbursementId: string;
  amount: string;        // NGN amount in kobo
  bankCode: string;
  accountNumber: string;
  reference: string;     // idempotency key for Yellow Card
  narration: string;
}

interface YellowCardPayoutResponse {
  paymentId: string;
  status: 'pending' | 'successful' | 'failed';
  reference: string;
}
```

---

## 6. API / Contract Interfaces

### 6.1 BOS Internal API (Backend Routes)

| Method | Endpoint | Body | Response | Purpose |
|--------|----------|------|----------|---------|
| `POST` | `/api/disbursements` | `{ campaignId, milestoneIndex, creatorAddress, recipientBankAccount, recipientBankCode, amountUsdcx }` | `{ id, status, burnTxHash? }` | Initiate a new disbursement. Idempotent via `idempotency_key` header. |
| `GET` | `/api/disbursements/:id` | — | Full disbursement record with status history | Get disbursement details |
| `GET` | `/api/disbursements/:id/status` | — | `{ status, burnTxHash, attestationRef, destinationTxHash, yellowCardPaymentId, ngnPayoutReference }` | Lightweight status poll for frontend |
| `POST` | `/api/disbursements/:id/retry` | — | `{ status }` | Retry a failed disbursement from current state |

### 6.2 xReserve Adapter Interface (External API Assumptions)

> **EXTERNAL ASSUMPTION — needs verification against xReserve docs:**

```
POST /v1/burns
  Body: { asset: "USDCx", amount: "1000000", burnTxHash: "0x..." }
  Response: { attestationId: "xres-att-...", status: "pending" }

GET /v1/burns/{burnTxHash}/attestation
  Response: { status: "confirmed" | "pending" | "failed", attestationRef: "xres-att-..." }

GET /v1/attestations/{attestationRef}/release
  Response: { status: "released" | "pending" | "failed", destinationTxHash: "0x..." }
```

> **This interface is a PLACEHOLDER.** The exact endpoints, auth mechanism, and response shapes must be verified against xReserve documentation. This is the only remaining external assumption.

### 6.3 Yellow Card API Interface (External API Assumptions)

> **EXTERNAL ASSUMPTION — needs verification against Yellow Card docs:**

```
POST /v1/payments
  Body: { amount, currency: "NGN", bankCode, accountNumber, reference, narration }
  Response: { paymentId, status: "pending" }

GET /v1/payments/{paymentId}
  Response: { status: "successful" | "pending" | "failed", reference }
```

### 6.4 On-Chain: USDCx Burn Call

```clarity
;; SIP-010 burn — called via contractService.burnUsdcx()
;; Exact function name depends on xReserve's USDCx contract on Stacks
;; Assumed pattern:
(contract-call? .usdcx burn amount)
;; where amount is in micro-USDCx (6 decimals)
```

> **EXTERNAL ASSUMPTION:** The exact USDCx contract principal and `burn` function signature on Stacks mainnet must be verified. The SIP-010 standard defines `burn`, but xReserve may have additional parameters or a different contract wrapper.

---

## 7. Step-by-Step Implementation Plan

### Phase 1: Type Definitions & State Machine (Day 1)

| Step | Action | Files |
|------|--------|-------|
| 1.1 | Define all TypeScript types: `Disbursement`, `DisbursementStatus`, `BridgeAdapter`, `AttestationStatus`, `DestinationReleaseStatus`, `YellowCardPayoutRequest/Response` | `disbursementTypes.ts` |
| 1.2 | Implement explicit state machine with guard functions. Each transition has: `fromStatus`, `toStatus`, `guard()` (precondition check), `action()` (side effect) | `disbursementStateMachine.ts` |
| 1.3 | Define state machine transitions table (see §7.1 below) | `disbursementStateMachine.ts` |

### Phase 2: Database Migration (Day 1)

| Step | Action | Files |
|------|--------|-------|
| 2.1 | Write migration SQL for `disbursements` and `disbursement_events` tables | `002_disbursements.sql` |
| 2.2 | Add table creation to database initialization (or migration runner) | `database.js` or migration runner |

### Phase 3: BridgeAdapter Implementations (Days 2–3)

| Step | Action | Files |
|------|--------|-------|
| 3.1 | Implement `xreserveAdapter.ts`: `burn()` calls on-chain USDCx burn, `getAttestationStatus()` polls xReserve API, `getDestinationReleaseStatus()` polls xReserve release API | `xreserveAdapter.ts` |
| 3.2 | Implement `bridgeAdapterFactory.ts`: returns correct adapter based on `BRIDGE_ADAPTER_ENV` env var | `bridgeAdapterFactory.ts` |
| 3.3 | Implement `yellowCardService.ts`: `initiatePayout()`, `getPayoutStatus()`, `verifyRecipient()` | `yellowCardService.ts` |

### Phase 4: Core BOS Orchestrator (Days 3–4)

| Step | Action | Files |
|------|--------|-------|
| 4.1 | Implement `disbursementService.ts`: `initiateDisbursement()` — validates preconditions, writes DB record (status: `initiated`), calls `burn()`, updates status to `burn_submitted` | `disbursementService.ts` |
| 4.2 | Implement `pollAttestation()` — polls xReserve every 30s, max 30 retries (15 min), updates status to `attestation_confirmed` on success, `manual_review` on timeout | `disbursementService.ts` |
| 4.3 | Implement `initiateYellowCardPayout()` — after attestation confirmed, calls Yellow Card API, retries 3x with exponential backoff, updates status to `payout_complete` or `payout_failed` | `disbursementService.ts` |
| 4.4 | Implement `handlePartialFailure()` — at any state, if chain/API call fails: log event, update `error_message`, increment `retry_count`, set status to `manual_review` if retries exhausted | `disbursementService.ts` |
| 4.5 | Implement `retryDisbursement()` — picks up from current state, re-executes the current state's action | `disbursementService.ts` |

### Phase 5: API Routes (Day 4)

| Step | Action | Files |
|------|--------|-------|
| 5.1 | Implement `POST /api/disbursements` with idempotency key validation | `disbursements.ts` |
| 5.2 | Implement `GET /api/disbursements/:id` and `GET /api/disbursements/:id/status` | `disbursements.ts` |
| 5.3 | Implement `POST /api/disbursements/:id/retry` | `disbursements.ts` |

### Phase 6: ContractService Extension (Day 4)

| Step | Action | Files |
|------|--------|-------|
| 6.1 | Add `burnUsdcx(amount)` function to `contractService.js` — broadcasts USDCx burn tx using `CREATOR_KEY` | `contractService.js` |

### Phase 7: Environment & Config (Day 5)

| Step | Action | Files |
|------|--------|-------|
| 7.1 | Create `.env.example` with all BOS environment variables | `.env.example` |
| 7.2 | Add sandbox/production separation logic (env-gated endpoints) | All service files |

---

### 7.1 State Machine — Full Transition Table

```
STATE TRANSITIONS:

initiated ──[guard: burnPreconditionsMet()]──> burn_submitted
    action: burnUsdcx(), write burn_tx_hash to DB

burn_submitted ──[guard: burnConfirmedOnChain()]──> burn_confirmed
    action: poll Stacks API for tx confirmation, write burn_block_height

burn_submitted ──[guard: burnTimeout()]──> manual_review
    action: log event, set error_message

burn_confirmed ──[guard: none]──> attestation_pending
    action: requestAttestationFromXReserve(), write attestation_ref

attestation_pending ──[guard: attestationConfirmed()]──> attestation_confirmed
    action: poll xReserve API, write attestation_confirmed_at

attestation_pending ──[guard: attestationTimeout()]──> manual_review
    action: log event, set error_message

attestation_confirmed ──[guard: yellowCardPreconditionsMet()]──> payout_initiated
    action: yellowCardService.initiatePayout(), write yellow_card_payment_id

payout_initiated ──[guard: payoutSuccessful()]──> payout_complete
    action: poll Yellow Card API, write ngn_payout_reference, payout_completed_at

payout_initiated ──[guard: payoutFailed() AND retriesExhausted()]──> manual_review
    action: log event, set error_message

payout_initiated ──[guard: payoutFailed() AND retriesAvailable()]──> payout_initiated
    action: retry payout (exponential backoff, max 3x)

ANY_STATE ──[guard: criticalError()]──> manual_review
    action: log event, set error_message, alert admin
```

---

## 8. Failure Modes and Mitigations

| # | Failure Mode | Path | Mitigation |
|---|-------------|------|------------|
| F1 | **Burn tx rejected by Stacks network** | `initiated → burn_submitted` fails | Retry broadcast 2x with 10s delay. If still fails, status = `manual_review`. DB record preserved. Idempotency key prevents duplicate initiation. |
| F2 | **Burn tx confirmed on Stacks but xReserve attestation never arrives** | `attestation_pending → manual_review` after 15 min timeout | Polling stops after 30 retries. Status = `manual_review`. Admin alert triggered. Manual resolution: verify xReserve status, potentially re-initiate. |
| F3 | **xReserve attestation confirms but Yellow Card payout fails** | `payout_initiated → payout_initiated` (retry) or `→ manual_review` | 3 retries with exponential backoff (1s, 4s, 16s). After 3 failures, `manual_review`. Admin can manually retry or cancel. |
| F4 | **Duplicate disbursement request (network retry, user double-click)** | Same `idempotency_key` submitted twice | DB unique constraint on `idempotency_key`. Second request returns existing disbursement record, no new burn. |
| F5 | **Partial failure: burn confirmed, DB write fails** | Burn tx is on-chain but DB record is incomplete | Stacks tx hash is the source of truth. On restart, BOS scans for unrecorded burn txs in the mempool/recent blocks and reconciles. (Implementation: background reconciliation job.) |
| F6 | **Yellow Card returns "successful" but NGN not received by creator** | Disbursement shows `payout_complete` but creator disputes | `ngn_payout_reference` is the bank transfer reference. Creator can use this to trace with their bank. BOS logs full Yellow Card response in `disbursement_events.metadata`. |
| F7 | **xReserve API is down** | Attestation polling fails repeatedly | Each failed poll logs an event. After 30 consecutive failures (15 min), status = `manual_review`. BOS does NOT assume xReserve is permanently down — manual resolution required. |
| F8 | **USDCx contract on Stacks has different burn function signature** | `burnUsdcx()` call fails at contract level | External assumption (A2). BridgeAdapter interface abstracts this. If signature differs, only `xreserveAdapter.ts` needs update. No BOS core changes. |
| F9 | **Exchange rate drifts between disbursement initiation and Yellow Card payout** | Amount in NGN differs from quoted amount | Rate is locked at initiation (`exchange_rate` field). Yellow Card payout uses the locked rate. BOS calculates `amount_ngn_expected` at initiation and passes it to Yellow Card. If rate changes, the difference is absorbed by the platform (pre-locked quote). |
| F10 | **Manual review disbursements accumulate** | Stuck disbursements in `manual_review` | Admin dashboard (future) shows all `manual_review` disbursements. Each has full event log. Admin can: retry, cancel (with audit trail), or resolve manually. |

---

## 9. Tests to Write

| # | Test Category | Test Cases | File |
|---|--------------|------------|------|
| T1 | **State Machine Unit Tests** | All valid transitions (8 happy paths). All invalid transitions (e.g., `payout_complete → burn_submitted` should throw). Guard function unit tests. | `tests/bos/disbursementStateMachine.test.ts` |
| T2 | **Disbursement Service Unit Tests** | `initiateDisbursement()` — happy path, duplicate idempotency key, burn precondition failure. `pollAttestation()` — timeout, confirmed, API error. `initiateYellowCardPayout()` — success, retry exhaustion. Mock all external adapters. | `tests/bos/disbursementService.test.ts` |
| T3 | **xReserve Adapter Unit Tests** | `burn()` — success, network rejection, timeout. `getAttestationStatus()` — pending, confirmed, failed, API down. `getDestinationReleaseStatus()` — released, pending, failed. Mock HTTP calls. | `tests/bos/xreserveAdapter.test.ts` |
| T4 | **Yellow Card Service Unit Tests** | `initiatePayout()` — success, invalid account, API error. `getPayoutStatus()` — successful, pending, failed. Retry logic. Mock HTTP calls. | `tests/bos/yellowCardService.test.ts` |
| T5 | **API Route Integration Tests** | `POST /api/disbursements` — happy path, missing fields, duplicate. `GET /api/disbursements/:id` — found, not found. `GET /api/disbursements/:id/status` — all statuses. `POST /api/disbursements/:id/retry` — retryable, not retryable. | `tests/bos/disbursementRoutes.test.ts` |
| T6 | **Database Migration Tests** | Migration runs cleanly. Migration is idempotent. Schema matches expected DDL. Constraint violations caught (duplicate idempotency key). | `tests/bos/migration.test.ts` |
| T7 | **End-to-End Flow Tests** | Full happy path: initiate → burn → attestation → payout → complete. Full timeout path: initiate → burn → attestation timeout → manual_review. Full retry path: payout fails → retry → success. Duplicate request path. | `tests/bos/e2eDisbursement.test.ts` |
| T8 | **Sandbox/Production Separation Tests** | Env-gated: sandbox uses testnet burn + Yellow Card sandbox. Production uses mainnet burn + Yellow Card production. Verify no sandbox calls leak into production. | `tests/bos/envSeparation.test.ts` |

---

## 10. Definition of Done

- [ ] `disbursementTypes.ts` defines all types: `Disbursement`, `DisbursementStatus` (9 states), `BridgeAdapter` interface, `AttestationStatus`, `DestinationReleaseStatus`, `YellowCardPayoutRequest/Response`
- [ ] `disbursementStateMachine.ts` implements all 8+ transitions with guard functions and action functions. No implicit state changes.
- [ ] `002_disbursements.sql` migration creates `disbursements` and `disbursement_events` tables with all indexes
- [ ] `xreserveAdapter.ts` implements `BridgeAdapter` with `burn()`, `getAttestationStatus()`, `getDestinationReleaseStatus()`. External API assumptions are documented in comments with exact unknowns marked.
- [ ] `yellowCardService.ts` implements `initiatePayout()`, `getPayoutStatus()`, `verifyRecipient()` with retry logic
- [ ] `disbursementService.ts` orchestrates full lifecycle: initiate → burn → attestation poll → Yellow Card payout. Idempotency enforced. All 5 failure paths (happy, timeout, retry, duplicate, partial failure) are implemented.
- [ ] `contractService.js` has `burnUsdcx()` function that broadcasts USDCx burn tx on Stacks
- [ ] `disbursements.ts` routes implement `POST /api/disbursements`, `GET /api/disbursements/:id`, `GET /api/disbursements/:id/status`, `POST /api/disbursements/:id/retry`
- [ ] `.env.example` documents all BOS environment variables with descriptions and default values
- [ ] Sandbox/production separation: all external API calls are env-gated. No sandbox endpoints are reachable in production.
- [ ] All 8 test categories pass (T1–T8)
- [ ] No TODOs remain for critical security or settlement behavior
- [ ] Every state transition is logged to `disbursement_events` audit table
- [ ] A senior engineer can implement BOS end-to-end without reopening protocol ambiguity around xReserve, burn path, forwarding, or Yellow Card handoff

---

## 11. Open Questions

These are the **only** unresolved external assumptions — not protocol confusion, not architecture ambiguity:

| # | Question | Impact | Who Can Resolve |
|---|---------|--------|-----------------|
| Q1 | What are the exact xReserve API endpoints, auth mechanism (API key? OAuth?), and response shapes for burn attestation and destination release? | Blocks `xreserveAdapter.ts` implementation details. BridgeAdapter interface is locked regardless. | Theophilus (Week 2: "Request Pillar Wallet credentials. Confirm Yellow Card sandbox access.") + xReserve docs |
| Q2 | What is the exact USDCx contract principal on Stacks mainnet and its `burn` function signature? | Blocks `burnUsdcx()` in `contractService.js`. May require parameter adjustments. | Victor (mainnet deploy Week 3) + Stacks Explorer |
| Q3 | What are the exact Yellow Card API endpoints, auth mechanism, and response shapes for NGN bank transfers? | Blocks `yellowCardService.ts` implementation details. Interface is locked regardless. | Theophilus (Week 2: "Confirm Yellow Card sandbox access.") + Yellow Card docs |
| Q4 | Does xReserve support webhooks for attestation confirmation, or is polling the only option? | Affects D2 (hybrid poll+event). If webhooks are supported, BOS can subscribe. If not, poll-only. | xReserve docs |
| Q5 | What is the exact fee structure for xReserve attestation and Yellow Card payout? | Affects `amount_ngn_expected` calculation and platform margin. | Yellow Card + xReserve pricing pages |

> **None of these are protocol confusion or architecture ambiguity.** All five are external API documentation lookups. The BridgeAdapter interface abstracts all of them. Implementation can proceed with mock adapters while these are resolved.

---

## Canonical Sequence Diagram (Text)

```
CREATOR                BOS                    STAKES CHAIN           xRESERVE              YELLOW CARD           NGN BANK
  |                     |                         |                     |                     |                    |
  |-- initiate disbursement -->                    |                     |                     |                    |
  |   (amount, bank acct) |                        |                     |                     |                    |
  |                     |-- write DB (initiated) ->|                     |                     |                    |
  |                     |-- burn USDCx ----------->|                     |                     |                    |
  |                     |   (SIP-010 burn call)    |                     |                     |                    |
  |                     |<-- burnTxHash -----------|                     |                     |                    |
  |                     |-- update DB (burn_submitted, burnTxHash)      |                     |                    |
  |                     |                         |                     |                     |                    |
  |                     |-- poll Stacks API ------>| (tx confirmation)   |                     |                    |
  |                     |<-- tx confirmed ---------| (burn_block_height) |                     |                    |
  |                     |-- update DB (burn_confirmed)                  |                     |                    |
  |                     |                         |                     |                     |                    |
  |                     |-- request attestation ----------------------->|                     |                    |
  |                     |<-- attestationRef -------| (xres-att-...)     |                     |                    |
  |                     |-- update DB (attestation_pending, attestationRef)                   |                    |
  |                     |                         |                     |                     |                    |
  |                     |-- poll attestation status ------------------>|                     |                    |
  |                     |<-- confirmed -------------| (destinationTxHash)|                    |                    |
  |                     |-- update DB (attestation_confirmed)           |                     |                    |
  |                     |                         |                     |                     |                    |
  |                     |-- initiate NGN payout ------------------------------------------->|                    |
  |                     |   (amount NGN, bank code, account, reference)                      |                    |
  |                     |<-- yellowCardPaymentId -------------------------------------------|                    |
  |                     |-- update DB (payout_initiated, yellowCardPaymentId)                 |                    |
  |                     |                         |                     |                     |                    |
  |                     |-- poll payout status ------------------------------------------->|                    |
  |                     |<-- successful --------------------------------------------------|                    |
  |                     |<-- ngnPayoutReference (bank tx ref) --------------------------------|                   |
  |                     |-- update DB (payout_complete, ngnPayoutReference)                   |                    |
  |<-- disbursement complete --|                    |                     |                     |                    |
```

---

## End-to-End Identifiers

These identifiers are propagated across the entire flow and must be stored in the `disbursements` table:

| Identifier | Generated At | Stored In | Propagated To | Format |
|-----------|-------------|-----------|---------------|--------|
| `disbursementId` | Disbursement initiation (BOS) | `disbursements.id` (UUID PK) | All downstream calls as idempotency key | UUID v4 |
| `burnTxHash` | Stacks chain (on-chain tx) | `disbursements.burn_tx_hash` | xReserve attestation poll | hex string (Stacks tx ID) |
| `burnBlockHeight` | Stacks chain (confirmation) | `disbursements.burn_block_height` | Audit trail | integer |
| `attestationRef` | xReserve API response | `disbursements.attestation_ref` | xReserve release poll | string (e.g., `xres-att-...`) |
| `destinationTxHash` | xReserve release response | `disbursements.destination_tx_hash` | Audit trail | hex string (destination chain tx) |
| `yellowCardPaymentId` | Yellow Card API response | `disbursements.yellow_card_payment_id` | Yellow Card status poll | string |
| `ngnPayoutReference` | Yellow Card API response (final) | `disbursements.ngn_payout_reference` | Creator bank trace, audit trail | string (bank tx reference) |

---

## Environment Variables

| Variable | Required | Description | Default | Sandbox | Production |
|----------|----------|-------------|---------|---------|------------|
| `BRIDGE_ADAPTER_ENV` | YES | Adapter to use: `xreserve` | `xreserve` | `xreserve` | `xreserve` |
| `XRESERVE_API_URL` | YES | xReserve API base URL | — | `https://sandbox.xreserve.com/v1` | `https://api.xreserve.com/v1` |
| `XRESERVE_API_KEY` | YES | xReserve API authentication key | — | sandbox key | production key |
| `YELLOW_CARD_API_URL` | YES | Yellow Card API base URL | — | `https://sandbox.yellowcard.io/v1` | `https://api.yellowcard.io/v1` |
| `YELLOW_CARD_API_KEY` | YES | Yellow Card API authentication key | — | sandbox key | production key |
| `USDCX_CONTRACT_ADDRESS` | YES | USDCx SIP-010 contract principal on Stacks | — | testnet principal | mainnet principal |
| `STACKS_API_URL` | YES | Stacks blockchain API for tx confirmation polling | `https://api.testnet.hiro.so` | testnet URL | mainnet URL |
| `BOS_POLL_INTERVAL_MS` | NO | Attestation polling interval | `30000` (30s) | `30000` | `30000` |
| `BOS_POLL_MAX_RETRIES` | NO | Max attestation poll attempts before timeout | `30` (15 min) | `30` | `30` |
| `BOS_PAYOUT_MAX_RETRIES` | NO | Max Yellow Card payout retry attempts | `3` | `3` | `3` |
| `BOS_PAYOUT_BACKOFF_BASE_MS` | NO | Exponential backoff base for payout retries | `1000` (1s) | `1000` | `1000` |
| `CREATOR_KEY` | YES | Stacks private key for creator proxy wallet (existing) | — | testnet key | mainnet key |
| `DATABASE_URL` | YES | Neon PostgreSQL connection string (existing) | — | sandbox DB | production DB |

---

## Build/No-Build Blockers

| # | Blocker | Type | Can Build Without? |
|---|---------|------|--------------------|
| B1 | xReserve API docs (endpoints, auth, response shapes) | External API docs | **YES** — BridgeAdapter interface is locked. Mock adapter implements interface. Real adapter drops in when docs available. |
| B2 | USDCx contract principal on Stacks mainnet | On-chain deployment | **YES** — Use testnet principal during dev. `USDCX_CONTRACT_ADDRESS` env var swaps at deploy. |
| B3 | Yellow Card API docs (endpoints, auth, response shapes) | External API docs | **YES** — Mock Yellow Card service implements locked interface. Real service drops in when docs available. |
| B4 | xReserve webhook support (if hybrid approach desired) | External capability | **YES** — Poll-only works for MVP. Webhook is optimization, not requirement. |

> **No protocol confusion blockers.** All 4 blockers are external API documentation lookups, not architecture or protocol design issues. The BridgeAdapter pattern ensures BOS can be fully implemented and tested with mock adapters today.
