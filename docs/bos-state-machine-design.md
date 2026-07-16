# BOS State Machine Design — Outbound Creator Disbursements

## 1. Objective

Design the canonical state machine for CineX's Bridge Orchestration Service (BOS) that governs outbound creator disbursements — from the moment a creator requests NGN payout through to confirmed bank settlement. Every state must be persisted in Neon, every transition idempotent, every monetary step replay-safe, and every retry safe under duplicate worker execution.

**PRD sections satisfied:**
- §1.1 Architectural Ground Truth — "Settlement asset — escrow" row, "Grant contract deliverable" row, "Contract deployment status" row
- Reviewer Addendum → Settlement Ground Truth (canonical burn → attestation → release → Yellow Card → NGN path)
- Epic 1+2: Mainnet Deployment + Passkey Wallet (settlement backbone)

---

## 2. Technical Assumptions

| # | Assumption | Basis | Status |
|---|-----------|-------|--------|
| SA1 | USDCx on Stacks is Circle xReserve-backed. Burn is native SIP-010, NOT CCTP V1. | PRD §1.1 + Settlement Ground Truth + Risk Note | Locked |
| SA2 | BOS runs as a Node.js service alongside existing `backend/`, using Neon PostgreSQL. | PRD §3.1 (Neon migration), §6 (Backend infrastructure) | Locked |
| SA3 | Yellow Card is the sole NGN off-ramp. REST API with sandbox + production. | PRD §6, Settlement Ground Truth | Locked |
| SA4 | xReserve provides a REST API for attestation polling. Webhook support unknown — poll-only for MVP. | Settlement Ground Truth + Risk Note | External assumption |
| SA5 | Workers may execute the same transition twice (duplicate workers, network retries). Every transition handler must be idempotent. | Engineering rules: idempotency everywhere money movement is involved | Locked |
| SA6 | A disbursement is initiated only after on-chain `release-milestone-funds` has transferred USDCx to the creator's proxy wallet. BOS does NOT handle the on-chain release — it handles the off-ramp from that point. | PRD §1.1 + Settlement Ground Truth | Locked |
| SA7 | All SLA timeouts are measured from the timestamp of state entry, not wall-clock. | Engineering rules: "no production money movement may depend on ambiguous state" | Locked |

---

## 3. Architecture Decisions

| # | Decision | Rationale | PRD Trace |
|---|---------|-----------|-----------|
| AD1 | **14 discrete states** — not 8, not 12. Each external boundary (Stacks chain, xReserve API, Yellow Card API) gets distinct "pending" and "confirmed/failed" states. Timeout states are separate from hard-failure states. | Engineering rule: "model timeout states separately from hard-failure states." Prevents conflating "API is slow" with "API returned error." | Engineering rules |
| AD2 | **Transition guard layer is a pure function** — `canTransition(fromStatus, toStatus, disbursement)` returns `true/false` with reasons. Guard functions never have side effects. Actions are separate. | Guarantees determinism. Enables unit testing of every guard in isolation. Aligns with "prefer deterministic state transitions over implicit behavior." | Engineering rules |
| AD3 | **`disbursement_audit` is append-only** — every state transition, retry attempt, and external API call writes an audit row. The audit table is the source of truth for "what happened when." The `disbursements` table is the source of truth for "what is the current state." | Engineering rules: "treat all settlement operations as auditable financial events." | Engineering rules |
| AD4 | **`external_refs` table decouples external identifiers from the disbursement record** — burn tx hashes, attestation refs, Yellow Card payment IDs, and NGN payout references are stored in a separate table keyed by `disbursement_id`. This allows multiple refs per disbursement (e.g., retry burn with new tx hash) without cluttering the main record. | Clean schema. Supports retry scenarios where a new burn tx replaces a failed one. | Engineering rules |
| AD5 | **Stuck-state detection via `last_heartbeat_at`** — every worker that touches a disbursement updates `last_heartbeat_at`. A background reaper job finds disbursements stuck in a non-terminal state for >2× SLA timeout and flags them for manual review. Prevents silent failures. | Engineering rule: "no production money movement may depend on ambiguous state." | Engineering rules |
| AD6 | **Retry budgets are per-state, not per-disbursement** — `retry_count` resets when a state transition succeeds. Each state has its own max retry count. This prevents a disbursement that retried 3x in the burn state from being blocked from retrying in the payout state. | More granular control. Aligns with "explicitly model retry path." | Engineering rules |

---

## 4. Files/Modules to Create or Modify

| # | File | Action | Purpose |
|---|------|--------|---------|
| F1 | `backend/src/services/bos/stateMachine.ts` | CREATE | State enum, transition table, guard functions, action dispatchers |
| F2 | `backend/src/services/bos/disbursementService.ts` | CREATE | Orchestrator: `initiateDisbursement()`, `advanceDisbursement()`, `retryDisbursement()`, stuck-state recovery |
| F3 | `backend/src/services/bos/transitionGuards.ts` | CREATE | Pure guard functions for every transition — no side effects |
| F4 | `backend/src/services/bos/transitionActions.ts` | CREATE | Action functions for every transition — side effects (DB writes, API calls, chain calls) |
| F5 | `backend/src/services/bos/stuckStateReaper.ts` | CREATE | Background job: scan for stuck disbursements, flag for manual review |
| F6 | `backend/src/services/bos/reconciliationWorker.ts` | CREATE | Background job: scan Stacks chain for burn txs not yet recorded in DB |
| F7 | `backend/src/database/migrations/003_bos_state_machine.sql` | CREATE | DB migration: `disbursements`, `disbursement_audit`, `external_refs` tables |
| F8 | `backend/src/routes/disbursements.ts` | CREATE | API routes: initiate, status, retry, cancel |
| F9 | `backend/src/services/contractService.js` | MODIFY | Add `burnUsdcx()` function |
| F10 | `tests/bos/stateMachine.test.ts` | CREATE | Unit tests for all transitions, guards, invalid transitions |
| F11 | `tests/bos/duplicateExecution.test.ts` | CREATE | Tests for idempotency under duplicate worker execution |
| F12 | `tests/bos/stuckStateRecovery.test.ts` | CREATE | Tests for stuck-state detection and recovery |

---

## 5. Data Models / Schemas

### 5.1 `disbursements` Table (Current State)

```sql
CREATE TABLE disbursements (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id               INTEGER NOT NULL,
  milestone_index           INTEGER NOT NULL,
  creator_address           TEXT NOT NULL,
  recipient_bank_account    TEXT NOT NULL,
  recipient_bank_code       TEXT NOT NULL,
  amount_usdcx              BIGINT NOT NULL,            -- micro-USDCx (6 decimals)
  amount_ngn_expected       BIGINT NOT NULL,            -- locked quote in NGN kobo
  exchange_rate             NUMERIC(12,6) NOT NULL,     -- USDCx→NGN at initiation
  status                    TEXT NOT NULL DEFAULT 'disbursement_initiated',
  error_message             TEXT,
  retry_count               INTEGER DEFAULT 0,          -- resets on successful state advance
  idempotency_key           TEXT UNIQUE NOT NULL,        -- prevents duplicate initiation
  initiated_by              TEXT NOT NULL,               -- admin user or 'system'
  created_at                TIMESTAMP DEFAULT NOW(),
  updated_at                TIMESTAMP DEFAULT NOW(),
  last_heartbeat_at         TIMESTAMP DEFAULT NOW(),    -- updated by every worker touch
  burn_deadline_at          TIMESTAMP,                  -- SLA: burn must confirm by this time
  attestation_deadline_at   TIMESTAMP,                  -- SLA: attestation must confirm by this time
  payout_deadline_at        TIMESTAMP                   -- SLA: payout must complete by this time
);

CREATE INDEX idx_disbursements_status ON disbursements(status);
CREATE INDEX idx_disbursements_campaign ON disbursements(campaign_id, milestone_index);
CREATE INDEX idx_disbursements_stuck ON disbursements(status, last_heartbeat_at)
  WHERE status NOT IN ('payout_complete', 'terminal_failed', 'cancelled');
```

### 5.2 `disbursement_audit` Table (Append-Only Event Log)

```sql
CREATE TABLE disbursement_audit (
  id                SERIAL PRIMARY KEY,
  disbursement_id   UUID NOT NULL REFERENCES disbursements(id),
  event_type        TEXT NOT NULL,
    -- state_entered, state_exited, retry_attempted, retry_exhausted,
    -- burn_submitted, burn_confirmed, burn_failed, burn_timeout,
    -- attestation_requested, attestation_polled, attestation_confirmed, attestation_timeout, attestation_failed,
    -- destination_released, destination_release_failed,
    -- payout_initiated, payout_polled, payout_confirmed, payout_failed, payout_timeout,
    -- manual_review_flagged, manual_review_resolved, manual_review_cancelled,
    -- reconciliation_found, reconciliation_matched
  from_status      TEXT,                -- NULL for initial entry
  to_status        TEXT NOT NULL,
  worker_id        TEXT NOT NULL,        -- unique ID of the worker instance that executed this
  guard_result     TEXT NOT NULL,        -- 'passed', 'failed', 'skipped'
  guard_reason     TEXT,                 -- human-readable reason if guard failed
  metadata         JSONB,               -- raw API response, tx details, error info
  created_at       TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_audit_disbursement ON disbursement_audit(disbursement_id, created_at);
CREATE INDEX idx_audit_event_type ON disbursement_audit(event_type, created_at);
```

### 5.3 `external_refs` Table (External Identifiers)

```sql
CREATE TABLE external_refs (
  id                SERIAL PRIMARY KEY,
  disbursement_id   UUID NOT NULL REFERENCES disbursements(id),
  ref_type          TEXT NOT NULL,
    -- burn_tx_hash, burn_block_height, attestation_ref,
    -- destination_tx_hash, yellow_card_payment_id, ngn_payout_reference
  ref_value         TEXT NOT NULL,
  is_primary        BOOLEAN DEFAULT TRUE,   -- FALSE for superseded refs (e.g., retry burn)
  created_at        TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_extref_disbursement ON external_refs(disbursement_id, ref_type);
CREATE INDEX idx_extref_value ON external_refs(ref_type, ref_value);
```

### 5.4 TypeScript Enums & Types

```typescript
// backend/src/services/bos/stateMachine.ts

enum DisbursementState {
  // Happy path (top-to-bottom)
  DISBURSEMENT_INITIATED    = 'disbursement_initiated',
  BURN_SUBMITTED            = 'burn_submitted',
  BURN_CONFIRMED            = 'burn_confirmed',
  ATTESTATION_REQUESTED     = 'attestation_requested',
  ATTESTATION_CONFIRMED     = 'attestation_confirmed',
  DESTINATION_RELEASED      = 'destination_released',
  PAYOUT_INITIATED          = 'payout_initiated',
  PAYOUT_COMPLETE           = 'payout_complete',

  // Terminal failure
  TERMINAL_FAILED           = 'terminal_failed',

  // Timeout states (distinct from hard failures)
  BURN_TIMEOUT              = 'burn_timeout',
  ATTESTATION_TIMEOUT       = 'attestation_timeout',
  PAYOUT_TIMEOUT            = 'payout_timeout',

  // Manual intervention
  MANUAL_REVIEW             = 'manual_review',

  // Cancellation
  CANCELLED                 = 'cancelled',
}

interface Transition {
  from: DisbursementState;
  to: DisbursementState;
  guard: (d: DisbursementRecord) => Promise<GuardResult>;
  action: (d: DisbursementRecord) => Promise<void>;
  slaTimeoutMs: number | null;   // null = no SLA (terminal/manual)
  maxRetries: number | null;     // null = no retry (terminal/manual)
  retryBackoffMs: number[];      // exponential backoff schedule
}

interface GuardResult {
  passed: boolean;
  reason: string;
  metadata?: Record<string, unknown>;
}

interface DisbursementRecord {
  id: string;
  campaignId: number;
  milestoneIndex: number;
  creatorAddress: string;
  recipientBankAccount: string;
  recipientBankCode: string;
  amountUsdcx: bigint;
  amountNgnExpected: bigint;
  exchangeRate: number;
  status: DisbursementState;
  errorMessage: string | null;
  retryCount: number;
  idempotencyKey: string;
  initiatedBy: string;
  createdAt: Date;
  updatedAt: Date;
  lastHeartbeatAt: Date;
  burnDeadlineAt: Date | null;
  attestationDeadlineAt: Date | null;
  payoutDeadlineAt: Date | null;
}
```

---

## 6. Allowed Transitions Table

| # | From State | To State | Guard | Action | SLA (ms) | Max Retries | Backoff (ms) |
|---|-----------|----------|-------|--------|----------|-------------|--------------|
| T1 | `disbursement_initiated` | `burn_submitted` | `burnPreconditionsMet()` | `submitBurnTx()` | null (immediate) | 2 | [10000, 30000] |
| T2 | `disbursement_initiated` | `terminal_failed` | `burnPreconditionsFailed()` | `markTerminal()` | null | 0 | [] |
| T3 | `burn_submitted` | `burn_confirmed` | `burnConfirmedOnChain()` | `recordBurnConfirmation()` | 600000 (10 min) | null (poll) | [30000] |
| T4 | `burn_submitted` | `burn_timeout` | `slaExpired(burn_deadline_at)` | `flagTimeout()` | — | 0 | [] |
| T5 | `burn_submitted` | `terminal_failed` | `burnRejectedOnChain()` | `markTerminal()` | — | 0 | [] |
| T6 | `burn_confirmed` | `attestation_requested` | `none` (always) | `requestAttestation()` | null (immediate) | 2 | [5000, 15000] |
| T7 | `attestation_requested` | `attestation_confirmed` | `attestationConfirmed()` | `recordAttestation()` | 900000 (15 min) | null (poll) | [30000] |
| T8 | `attestation_requested` | `attestation_timeout` | `slaExpired(attestation_deadline_at)` | `flagTimeout()` | — | 0 | [] |
| T9 | `attestation_requested` | `attestation_failed` | `attestationRejected()` | `markFailed()` | — | 0 | [] |
| T10 | `attestation_confirmed` | `destination_released` | `destinationReleaseConfirmed()` | `recordDestinationRelease()` | 3600000 (1 hr) | null (poll) | [60000] |
| T11 | `attestation_confirmed` | `terminal_failed` | `destinationReleaseRejected()` | `markTerminal()` | — | 0 | [] |
| T12 | `destination_released` | `payout_initiated` | `yellowCardPreconditionsMet()` | `initiateYellowCardPayout()` | null (immediate) | 2 | [5000, 15000] |
| T13 | `payout_initiated` | `payout_complete` | `payoutConfirmed()` | `recordPayoutCompletion()` | 1800000 (30 min) | null (poll) | [60000] |
| T14 | `payout_initiated` | `payout_initiated` | `payoutFailed() AND retriesAvailable()` | `retryPayout()` | — | 3 | [1000, 4000, 16000] |
| T15 | `payout_initiated` | `payout_timeout` | `slaExpired(payout_deadline_at)` | `flagTimeout()` | — | 0 | [] |
| T16 | `payout_initiated` | `terminal_failed` | `payoutFailed() AND retriesExhausted()` | `markTerminal()` | — | 0 | [] |
| T17 | `burn_timeout` | `manual_review` | `none` (always) | `escalateToManualReview()` | — | 0 | [] |
| T18 | `attestation_timeout` | `manual_review` | `none` (always) | `escalateToManualReview()` | — | 0 | [] |
| T19 | `payout_timeout` | `manual_review` | `none` (always) | `escalateToManualReview()` | — | 0 | [] |
| T20 | `attestation_failed` | `manual_review` | `none` (always) | `escalateToManualReview()` | — | 0 | [] |
| T21 | ANY non-terminal state | `manual_review` | `criticalError()` | `escalateToManualReview()` | — | 0 | [] |
| T22 | ANY non-terminal state | `cancelled` | `adminCancelled()` | `cancelDisbursement()` | — | 0 | [] |
| T23 | `manual_review` | (previous state) | `adminResolved()` | `resumeFromReview()` | — | 0 | [] |
| T24 | `manual_review` | `cancelled` | `adminCancelled()` | `cancelDisbursement()` | — | 0 | [] |

---

## 7. Invalid Transition Rules

The following transitions are **hard-blocked** and must throw a `StateTransitionError` if attempted:

| Invalid Transition | Reason |
|-------------------|--------|
| `payout_complete` → anything | Terminal success. No undo. |
| `terminal_failed` → anything | Terminal failure. Must create new disbursement. |
| `cancelled` → anything | Terminal. No undo. |
| `burn_submitted` → `disbursement_initiated` | Cannot un-submit a burn. |
| `burn_submitted` → `payout_initiated` | Cannot skip attestation. |
| `attestation_requested` → `burn_submitted` | Cannot regress to burn phase. |
| `attestation_confirmed` → `burn_confirmed` | Cannot regress to burn confirmation. |
| `payout_initiated` → `attestation_confirmed` | Cannot regress to attestation. |
| Any state → same state | Self-transitions are only valid for `payout_initiated` (T14 retry). All others must throw. |
| `manual_review` → `payout_complete` | Cannot skip all work and jump to success. |
| `manual_review` → `burn_confirmed` | Cannot skip burn and jump to confirmation. |

---

## 8. Retry Policy Per State

| State | Max Retries | Backoff Schedule | Retry Behavior | Reset On Success |
|-------|-------------|------------------|----------------|-----------------|
| `disbursement_initiated` | 2 | 10s, 30s | Retry burn submission with same params. Idempotent — same `disbursementId` passed to `burn()`. | Yes → `retry_count = 0` |
| `burn_submitted` | ∞ (poll-based) | 30s interval | Poll Stacks API for tx confirmation. Not a "retry" — it's a poll. Stops at SLA deadline (10 min). | N/A (poll) |
| `burn_confirmed` | 2 | 5s, 15s | Retry attestation request to xReserve. Idempotent — same `burnTxHash`. | Yes → `retry_count = 0` |
| `attestation_requested` | ∞ (poll-based) | 30s interval | Poll xReserve API for attestation status. Stops at SLA deadline (15 min). | N/A (poll) |
| `attestation_confirmed` | 2 | 5s, 15s | Retry Yellow Card payout initiation. Idempotent — same `reference` (disbursementId). | Yes → `retry_count = 0` |
| `payout_initiated` | 3 | 1s, 4s, 16s | Retry Yellow Card payout poll. If Yellow Card returns "pending", keep polling. If "failed", retry initiation. | Yes → `retry_count = 0` |

**Duplicate Worker Safety:** Every retry uses the same `disbursementId` as the idempotency key for external APIs. If two workers execute the same retry simultaneously:
- Burn submission: Stacks chain deduplicates by nonce (same sender, same nonce = same tx).
- xReserve attestation request: same `burnTxHash` = same attestation (idempotent).
- Yellow Card payout: same `reference` = Yellow Card returns existing payment (idempotent).

---

## 9. Pseudocode for Transition Guard Layer

```typescript
// backend/src/services/bos/transitionGuards.ts

// --- Burn Phase Guards ---

async function burnPreconditionsMet(d: DisbursementRecord): Promise<GuardResult> {
  // 1. Disbursement must be in disbursement_initiated state
  if (d.status !== DisbursementState.DISBURSEMENT_INITIATED) {
    return { passed: false, reason: `Invalid state: ${d.status}` };
  }

  // 2. Creator proxy wallet must have sufficient USDCx balance
  const balance = await getUsdcxBalance(d.creatorAddress);
  if (balance < d.amountUsdcx) {
    return {
      passed: false,
      reason: `Insufficient USDCx: have ${balance}, need ${d.amountUsdcx}`
    };
  }

  // 3. Yellow Card recipient must be pre-verified
  const verified = await yellowCardService.verifyRecipient({
    accountNumber: d.recipientBankAccount,
    bankCode: d.recipientBankCode
  });
  if (!verified) {
    return { passed: false, reason: 'Yellow Card recipient verification failed' };
  }

  // 4. Exchange rate must be fresh (< 5 minutes old)
  const rateAge = Date.now() - d.updatedAt.getTime();
  if (rateAge > 300_000) {
    return { passed: false, reason: `Exchange rate stale: ${rateAge}ms old` };
  }

  return { passed: true, reason: 'All burn preconditions met' };
}

async function burnConfirmedOnChain(d: DisbursementRecord): Promise<GuardResult> {
  // 1. Must have a burn tx hash
  const burnTxHash = await getExternalRef(d.id, 'burn_tx_hash');
  if (!burnTxHash) {
    return { passed: false, reason: 'No burn tx hash recorded' };
  }

  // 2. Query Stacks API for tx status
  const txStatus = await stacksApi.getTxStatus(burnTxHash);
  if (txStatus.tx_status === 'success') {
    return {
      passed: true,
      reason: 'Burn confirmed on-chain',
      metadata: { blockHeight: txStatus.block_height }
    };
  }

  if (txStatus.tx_status === 'rejected') {
    return { passed: false, reason: `Burn rejected: ${txStatus.receipt?.post_conditions}` };
  }

  // pending — not confirmed yet
  return { passed: false, reason: `Burn pending: ${txStatus.tx_status}` };
}

function slaExpired(deadlineField: 'burn_deadline_at' | 'attestation_deadline_at' | 'payout_deadline_at') {
  return async (d: DisbursementRecord): Promise<GuardResult> => {
    const deadline = d[deadlineField];
    if (!deadline) {
      return { passed: false, reason: `No deadline set for ${deadlineField}` };
    }
    if (Date.now() > deadline.getTime()) {
      return { passed: true, reason: `SLA expired: ${deadlineField} was ${deadline.toISOString()}` };
    }
    return { passed: false, reason: `SLA not yet expired: ${deadlineField} is ${deadline.toISOString()}` };
  };
}

// --- Attestation Guards ---

async function attestationConfirmed(d: DisbursementRecord): Promise<GuardResult> {
  const burnTxHash = await getExternalRef(d.id, 'burn_tx_hash');
  if (!burnTxHash) {
    return { passed: false, reason: 'No burn tx hash for attestation query' };
  }

  const attestation = await bridgeAdapter.getAttestationStatus(burnTxHash);
  if (attestation.status === 'confirmed') {
    return {
      passed: true,
      reason: 'Attestation confirmed',
      metadata: { attestationRef: attestation.attestationRef }
    };
  }
  if (attestation.status === 'failed') {
    return { passed: false, reason: `Attestation failed: ${attestation.reason}` };
  }
  return { passed: false, reason: 'Attestation still pending' };
}

// --- Destination Release Guards ---

async function destinationReleaseConfirmed(d: DisbursementRecord): Promise<GuardResult> {
  const attestationRef = await getExternalRef(d.id, 'attestation_ref');
  if (!attestationRef) {
    return { passed: false, reason: 'No attestation ref for release query' };
  }

  const release = await bridgeAdapter.getDestinationReleaseStatus(attestationRef);
  if (release.status === 'released') {
    return {
      passed: true,
      reason: 'Destination release confirmed',
      metadata: { destinationTxHash: release.destinationTxHash }
    };
  }
  if (release.status === 'failed') {
    return { passed: false, reason: `Destination release failed: ${release.reason}` };
  }
  return { passed: false, reason: 'Destination release still pending' };
}

// --- Yellow Card Payout Guards ---

async function yellowCardPreconditionsMet(d: DisbursementRecord): Promise<GuardResult> {
  // 1. Destination release must be confirmed (we have destination_tx_hash)
  const destRelease = await getExternalRef(d.id, 'destination_tx_hash');
  if (!destRelease) {
    return { passed: false, reason: 'Destination release not confirmed' };
  }

  // 2. NGN amount must be calculable from locked rate
  if (!d.amountNgnExpected || d.amountNgnExpected <= 0n) {
    return { passed: false, reason: 'Invalid NGN amount' };
  }

  // 3. Recipient bank details must be valid format
  if (!d.recipientBankAccount || d.recipientBankAccount.length < 10) {
    return { passed: false, reason: 'Invalid bank account number' };
  }

  return { passed: true, reason: 'Yellow Card preconditions met' };
}

async function payoutConfirmed(d: DisbursementRecord): Promise<GuardResult> {
  const paymentId = await getExternalRef(d.id, 'yellow_card_payment_id');
  if (!paymentId) {
    return { passed: false, reason: 'No Yellow Card payment ID' };
  }

  const status = await yellowCardService.getPayoutStatus(paymentId);
  if (status.status === 'successful') {
    return {
      passed: true,
      reason: 'Payout confirmed',
      metadata: { ngnPayoutReference: status.reference }
    };
  }
  if (status.status === 'failed') {
    return { passed: false, reason: `Payout failed: ${status.error}` };
  }
  return { passed: false, reason: 'Payout still pending' };
}

// --- Terminal/Escape Guards ---

function payoutFailed(): Guard {
  return async (d: DisbursementRecord): Promise<GuardResult> => {
    const paymentId = await getExternalRef(d.id, 'yellow_card_payment_id');
    if (!paymentId) return { passed: false, reason: 'No payment ID to check' };
    const status = await yellowCardService.getPayoutStatus(paymentId);
    return {
      passed: status.status === 'failed',
      reason: status.status === 'failed' ? `Payout failed: ${status.error}` : 'Payout not failed'
    };
  };
}

function retriesAvailable(): Guard {
  return async (d: DisbursementRecord): Promise<GuardResult> => {
    const maxRetries = getMaxRetries(d.status);
    const available = maxRetries === null || d.retryCount < maxRetries;
    return {
      passed: available,
      reason: available
        ? `Retries available: ${d.retryCount}/${maxRetries}`
        : `Retries exhausted: ${d.retryCount}/${maxRetries}`
    };
  };
}

function retriesExhausted(): Guard {
  return async (d: DisbursementRecord): Promise<GuardResult> => {
    const result = await retriesAvailable()(d);
    return { passed: !result.passed, reason: result.passed ? 'Retries still available' : 'Retries exhausted' };
  };
}

async function criticalError(d: DisbursementRecord): Promise<GuardResult> {
  return { passed: false, reason: 'No critical error detected' };
}

async function adminCancelled(d: DisbursementRecord): Promise<GuardResult> {
  return { passed: false, reason: 'Admin cancellation not flagged' };
}

// --- State Machine Core ---

class DisbursementStateMachine {
  private transitions: Map<string, Transition> = new Map();

  constructor() {
    this.registerTransitions();
  }

  async canTransition(
    from: DisbursementState,
    to: DisbursementState,
    disbursement: DisbursementRecord
  ): Promise<GuardResult> {
    const key = `${from}->${to}`;
    const transition = this.transitions.get(key);
    if (!transition) {
      return { passed: false, reason: `No transition defined from ${from} to ${to}` };
    }
    return transition.guard(disbursement);
  }

  async executeTransition(
    from: DisbursementState,
    to: DisbursementState,
    disbursement: DisbursementRecord,
    workerId: string
  ): Promise<void> {
    const key = `${from}->${to}`;
    const transition = this.transitions.get(key);
    if (!transition) {
      throw new StateTransitionError(`No transition defined from ${from} to ${to}`);
    }

    // 1. Run guard
    const guardResult = await transition.guard(disbursement);
    if (!guardResult.passed) {
      await this.auditLog(disbursement.id, from, to, workerId, 'failed', guardResult.reason);
      throw new GuardFailedError(guardResult.reason);
    }

    // 2. Execute action
    await transition.action(disbursement);

    // 3. Update disbursement status in DB (within transaction)
    await db.transaction(async (tx) => {
      await tx.update('disbursements', {
        status: to,
        updated_at: new Date(),
        last_heartbeat_at: new Date(),
        retry_count: 0,  // reset on successful advance
        ...this.getDeadlineUpdates(to)
      }, { id: disbursement.id });
    });

    // 4. Audit log
    await this.auditLog(disbursement.id, from, to, workerId, 'passed', guardResult.reason, guardResult.metadata);
  }

  private getDeadlineUpdates(to: DisbursementState): Partial<DisbursementRecord> {
    const now = Date.now();
    switch (to) {
      case DisbursementState.BURN_SUBMITTED:
        return { burn_deadline_at: new Date(now + 600_000) };  // 10 min
      case DisbursementState.ATTESTATION_REQUESTED:
        return { attestation_deadline_at: new Date(now + 900_000) };  // 15 min
      case DisbursementState.PAYOUT_INITIATED:
        return { payout_deadline_at: new Date(now + 1_800_000) };  // 30 min
      default:
        return {};
    }
  }

  private async auditLog(
    disbursementId: string,
    from: DisbursementState,
    to: DisbursementState,
    workerId: string,
    guardResult: string,
    reason: string,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    await db.insert('disbursement_audit', {
      disbursement_id: disbursementId,
      event_type: `state_${guardResult === 'passed' ? 'entered' : 'failed'}`,
      from_status: from,
      to_status: to,
      worker_id: workerId,
      guard_result: guardResult,
      guard_reason: reason,
      metadata: metadata ? JSON.stringify(metadata) : null,
      created_at: new Date()
    });
  }
}

// --- Transition Registry (excerpt) ---

private registerTransitions() {
  // T1: disbursement_initiated -> burn_submitted
  this.register({
    from: DisbursementState.DISBURSEMENT_INITIATED,
    to: DisbursementState.BURN_SUBMITTED,
    guard: burnPreconditionsMet,
    action: async (d) => {
      const burnTxHash = await contractService.burnUsdcx(d.amountUsdcx, d.id);
      await upsertExternalRef(d.id, 'burn_tx_hash', burnTxHash, true);
    },
    slaTimeoutMs: null,
    maxRetries: 2,
    retryBackoffMs: [10000, 30000]
  });

  // T3: burn_submitted -> burn_confirmed
  this.register({
    from: DisbursementState.BURN_SUBMITTED,
    to: DisbursementState.BURN_CONFIRMED,
    guard: burnConfirmedOnChain,
    action: async (d, metadata) => {
      await upsertExternalRef(d.id, 'burn_block_height', String(metadata.blockHeight), true);
    },
    slaTimeoutMs: 600_000,
    maxRetries: null,  // poll-based
    retryBackoffMs: [30000]
  });

  // T12: destination_released -> payout_initiated
  this.register({
    from: DisbursementState.DESTINATION_RELEASED,
    to: DisbursementState.PAYOUT_INITIATED,
    guard: yellowCardPreconditionsMet,
    action: async (d) => {
      const ngnAmount = calculateNgnFromLockedRate(d.amountUsdcx, d.exchangeRate);
      const payment = await yellowCardService.initiatePayout({
        disbursementId: d.id,
        amount: String(ngnAmount),
        bankCode: d.recipientBankCode,
        accountNumber: d.recipientBankAccount,
        reference: d.id,  // idempotency key
        narration: `CineX disbursement ${d.id}`
      });
      await upsertExternalRef(d.id, 'yellow_card_payment_id', payment.paymentId, true);
    },
    slaTimeoutMs: null,
    maxRetries: 2,
    retryBackoffMs: [5000, 15000]
  });

  // T14: payout_initiated -> payout_initiated (retry)
  this.register({
    from: DisbursementState.PAYOUT_INITIATED,
    to: DisbursementState.PAYOUT_INITIATED,
    guard: and(payoutFailed(), retriesAvailable()),
    action: async (d) => {
      await yellowCardService.initiatePayout({
        disbursementId: d.id,
        amount: String(d.amountNgnExpected),
        bankCode: d.recipientBankCode,
        accountNumber: d.recipientBankAccount,
        reference: d.id,  // same reference = idempotent
        narration: `CineX disbursement ${d.id} (retry)`
      });
      await db.update('disbursements', {
        retry_count: d.retryCount + 1,
        last_heartbeat_at: new Date()
      }, { id: d.id });
    },
    slaTimeoutMs: null,
    maxRetries: 3,
    retryBackoffMs: [1000, 4000, 16000]
  });
}

// --- Helper: compose guards ---
function and(...guards: Guard[]): Guard {
  return async (d) => {
    for (const guard of guards) {
      const result = await guard(d);
      if (!result.passed) return result;
    }
    return { passed: true, reason: 'All guards passed' };
  };
}
```

---

## 10. Stuck-State Detection & Recovery

```typescript
// backend/src/services/bos/stuckStateReaper.ts

// Runs every 60 seconds via cron or setInterval

async function reapStuckDisbursements(): Promise<void> {
  const stuckStates = [
    DisbursementState.BURN_SUBMITTED,
    DisbursementState.ATTESTATION_REQUESTED,
    DisbursementState.DESTINATION_RELEASED,
    DisbursementState.PAYOUT_INITIATED,
    DisbursementState.MANUAL_REVIEW,
  ];

  for (const state of stuckStates) {
    const slaMultiplier = state === DisbursementState.MANUAL_REVIEW ? 7 : 2;
    const timeoutMs = getSlaTimeout(state) * slaMultiplier;

    const stuck = await db.query(`
      SELECT * FROM disbursements
      WHERE status = $1
        AND last_heartbeat_at < NOW() - INTERVAL '1 millisecond' * $2
        AND status NOT IN ('payout_complete', 'terminal_failed', 'cancelled')
    `, [state, timeoutMs]);

    for (const d of stuck) {
      await auditLog(d.id, state, state, 'stuck-reaper', 'flagged',
        `Stuck in ${state} for >${timeoutMs}ms, last heartbeat: ${d.last_heartbeat_at}`);

      await stateMachine.executeTransition(
        state,
        DisbursementState.MANUAL_REVIEW,
        d,
        'stuck-reaper'
      );

      await alertService.sendAlert({
        severity: 'warning',
        message: `Disbursement ${d.id} stuck in ${state}. Last heartbeat: ${d.last_heartbeat_at}. Requires manual review.`,
        disbursementId: d.id
      });
    }
  }
}
```

---

## 11. Reconciliation Worker (Duplicate Execution Safety)

```typescript
// backend/src/services/bos/reconciliationWorker.ts

// Runs every 5 minutes via cron or setInterval

async function reconcileUnrecordedBurns(): Promise<void> {
  const pending = await db.query(`
    SELECT * FROM disbursements
    WHERE status = 'burn_submitted'
      AND burn_deadline_at > NOW()
  `);

  for (const d of pending) {
    const burnTxHash = await getExternalRef(d.id, 'burn_tx_hash');
    if (!burnTxHash) {
      const recentBurns = await stacksApi.getAddressTxs(d.creatorAddress, {
        limit: 10,
        unanchored: true
      });
      const matchingBurn = recentBurns.find(tx =>
        tx.tx_type === 'contract_call' &&
        tx.contract_call?.function_name === 'burn' &&
        tx.tx_status === 'success'
      );
      if (matchingBurn) {
        await upsertExternalRef(d.id, 'burn_tx_hash', matchingBurn.tx_id, true);
        await auditLog(d.id, d.status, d.status, 'reconciliation', 'reconciliation_found',
          `Found unrecorded burn tx: ${matchingBurn.tx_id}`);
      }
    }
  }
}

async function reconcileOrphanedPayouts(): Promise<void> {
  const active = await db.query(`
    SELECT * FROM disbursements
    WHERE status IN ('payout_initiated', 'manual_review')
  `);

  for (const d of active) {
    const paymentId = await getExternalRef(d.id, 'yellow_card_payment_id');
    if (!paymentId) continue;

    const status = await yellowCardService.getPayoutStatus(paymentId);
    if (status.status === 'successful') {
      await upsertExternalRef(d.id, 'ngn_payout_reference', status.reference, true);
      await stateMachine.executeTransition(
        d.status,
        DisbursementState.PAYOUT_COMPLETE,
        d,
        'reconciliation-worker'
      );
      await auditLog(d.id, d.status, DisbursementState.PAYOUT_COMPLETE,
        'reconciliation-worker', 'reconciliation_matched',
        `Reconciled successful payout: ${paymentId}`);
    }
  }
}
```

---

## 12. Tests

### 12.1 State Machine Unit Tests (`tests/bos/stateMachine.test.ts`)

```
TEST: stateMachine.test.ts

describe('DisbursementStateMachine')

  describe('Valid Transitions')
    it('T1: disbursement_initiated -> burn_submitted when preconditions met')
    it('T3: burn_submitted -> burn_confirmed when Stacks API confirms tx')
    it('T6: burn_confirmed -> attestation_requested (unconditional)')
    it('T7: attestation_requested -> attestation_confirmed when xReserve confirms')
    it('T10: attestation_confirmed -> destination_released when xReserve confirms release')
    it('T12: destination_released -> payout_initiated when Yellow Card preconditions met')
    it('T13: payout_initiated -> payout_complete when Yellow Card confirms')
    it('T14: payout_initiated -> payout_initiated on retry (exponential backoff)')

  describe('Timeout Transitions')
    it('T4: burn_submitted -> burn_timeout after SLA expiry')
    it('T8: attestation_requested -> attestation_timeout after SLA expiry')
    it('T15: payout_initiated -> payout_timeout after SLA expiry')

  describe('Failure Transitions')
    it('T5: burn_submitted -> terminal_failed when burn rejected on-chain')
    it('T11: attestation_confirmed -> terminal_failed when destination release rejected')
    it('T16: payout_initiated -> terminal_failed when retries exhausted')
    it('T9: attestation_requested -> attestation_failed when xReserve rejects')

  describe('Manual Review Escalations')
    it('T17: burn_timeout -> manual_review')
    it('T18: attestation_timeout -> manual_review')
    it('T19: payout_timeout -> manual_review')
    it('T20: attestation_failed -> manual_review')
    it('T21: any non-terminal -> manual_review on critical error')

  describe('Admin Actions')
    it('T22: any non-terminal -> cancelled by admin')
    it('T23: manual_review -> previous state when admin resolves')
    it('T24: manual_review -> cancelled by admin')

  describe('Invalid Transitions (must throw StateTransitionError)')
    it('payout_complete -> any: throws')
    it('terminal_failed -> any: throws')
    it('cancelled -> any: throws')
    it('burn_submitted -> disbursement_initiated: throws')
    it('burn_submitted -> payout_initiated: throws (skips attestation)')
    it('attestation_requested -> burn_submitted: throws (regresses)')
    it('attestation_confirmed -> burn_confirmed: throws (regresses)')
    it('payout_initiated -> attestation_confirmed: throws (regresses)')
    it('self-transition on burn_submitted: throws')
    it('self-transition on attestation_requested: throws')
    it('manual_review -> payout_complete: throws (skips work)')
    it('manual_review -> burn_confirmed: throws (skips burn)')

  describe('Guard Functions')
    it('burnPreconditionsMet: passes with sufficient balance + valid recipient')
    it('burnPreconditionsMet: fails with insufficient USDCx balance')
    it('burnPreconditionsMet: fails with invalid Yellow Card recipient')
    it('burnPreconditionsMet: fails with stale exchange rate')
    it('burnConfirmedOnChain: passes when Stacks API returns success')
    it('burnConfirmedOnChain: fails when Stacks API returns pending')
    it('burnConfirmedOnChain: fails when Stacks API returns rejected')
    it('attestationConfirmed: passes when xReserve returns confirmed')
    it('attestationConfirmed: fails when xReserve returns pending')
    it('attestationConfirmed: fails when xReserve returns failed')
    it('destinationReleaseConfirmed: passes when xReserve returns released')
    it('destinationReleaseConfirmed: fails when xReserve returns pending')
    it('yellowCardPreconditionsMet: passes with destination release + valid amount')
    it('yellowCardPreconditionsMet: fails without destination release')
    it('payoutConfirmed: passes when Yellow Card returns successful')
    it('payoutConfirmed: fails when Yellow Card returns pending')
    it('slaExpired: passes when current time > deadline')
    it('slaExpired: fails when current time < deadline')
    it('retriesAvailable: passes when retryCount < maxRetries')
    it('retriesAvailable: fails when retryCount >= maxRetries')
    it('retriesExhausted: passes when retriesAvailable fails')
```

### 12.2 Duplicate Execution Tests (`tests/bos/duplicateExecution.test.ts`)

```
TEST: duplicateExecution.test.ts

describe('Duplicate Worker Execution Safety')

  describe('Burn Submission')
    it('two workers calling submitBurn simultaneously produce only one on-chain tx')
      // Arrange: mock contractService.burnUsdcx to track calls
      // Act: call stateMachine.executeTransition twice concurrently
      // Assert: burnUsdcx called once (idempotency key prevents duplicate)
      // Assert: only one external_ref row with is_primary=true

  describe('Attestation Request')
    it('two workers requesting attestation simultaneously produce only one xReserve call')
      // Arrange: mock bridgeAdapter.getAttestationStatus
      // Act: call executeTransition twice concurrently
      // Assert: attestation request made once (same burnTxHash = idempotent)

  describe('Yellow Card Payout')
    it('two workers initiating payout simultaneously produce only one Yellow Card payment')
      // Arrange: mock yellowCardService.initiatePayout to track calls
      // Act: call executeTransition twice concurrently
      // Assert: initiatePayout called once (same reference = idempotent)
      // Assert: only one yellow_card_payment_id ref

  describe('Payout Retry')
    it('two workers retrying payout simultaneously produce only one retry')
      // Arrange: mock payoutFailed to return true, retriesAvailable to return true
      // Act: call executeTransition twice concurrently
      // Assert: retry_count incremented only once
      // Assert: only one payout re-initiation

  describe('Status Update')
    it('concurrent status updates use DB transaction to prevent lost updates')
      // Arrange: two workers try to advance the same disbursement
      // Act: race condition
      // Assert: one succeeds, one gets GuardFailedError (status already changed)

  describe('Idempotency Key Reuse')
    it('POST /api/disbursements with same idempotency_key returns existing record')
      // Arrange: create disbursement with key "test-key-1"
      // Act: POST again with same key
      // Assert: returns same disbursement ID, no new burn
      // Assert: disbursement status unchanged

  describe('Reconciliation')
    it('reconciliation worker finds and records unrecorded burn tx')
      // Arrange: disbursement in burn_submitted, no burn_tx_hash ref, Stacks API has matching tx
      // Act: run reconcileUnrecordedBurns()
      // Assert: external_ref created, audit log written

    it('reconciliation worker finds and completes orphaned successful payout')
      // Arrange: disbursement in payout_initiated, Yellow Card shows successful
      // Act: run reconcileOrphanedPayouts()
      // Assert: status advanced to payout_complete, ngn_payout_reference recorded
```

### 12.3 Stuck-State Recovery Tests (`tests/bos/stuckStateRecovery.test.ts`)

```
TEST: stuckStateRecovery.test.ts

describe('Stuck-State Detection & Recovery')

  describe('Stuck-State Reaper')
    it('flags burn_submitted stuck for >2x SLA (20 min) as manual_review')
      // Arrange: disbursement in burn_submitted, last_heartbeat_at = 25 minutes ago
      // Act: run reapStuckDisbursements()
      // Assert: status = manual_review, audit event logged

    it('flags attestation_requested stuck for >2x SLA (30 min) as manual_review')
      // Arrange: disbursement in attestation_requested, last_heartbeat_at = 35 minutes ago
      // Act: run reapStuckDisbursements()
      // Assert: status = manual_review

    it('flags payout_initiated stuck for >2x SLA (60 min) as manual_review')
      // Arrange: disbursement in payout_initiated, last_heartbeat_at = 65 minutes ago
      // Act: run reapStuckDisbursements()
      // Assert: status = manual_review

    it('flags manual_review stuck for >7 days as manual_review (re-flags)')
      // Arrange: disbursement in manual_review, last_heartbeat_at = 8 days ago
      // Act: run reapStuckDisbursements()
      // Assert: audit event logged (re-flagged), admin alerted again

    it('does NOT flag payout_complete as stuck')
      // Arrange: disbursement in payout_complete, last_heartbeat_at = 30 days ago
      // Act: run reapStuckDisbursements()
      // Assert: no change

    it('does NOT flag terminal_failed as stuck')
      // Arrange: disbursement in terminal_failed, last_heartbeat_at = 30 days ago
      // Act: run reapStuckDisbursements()
      // Assert: no change

    it('does NOT flag cancelled as stuck')
      // Arrange: disbursement in cancelled, last_heartbeat_at = 30 days ago
      // Act: run reapStuckDisbursements()
      // Assert: no change

  describe('Heartbeat Updates')
    it('every state transition updates last_heartbeat_at')
      // Arrange: disbursement with old last_heartbeat_at
      // Act: execute any valid transition
      // Assert: last_heartbeat_at updated to now

    it('polling actions update last_heartbeat_at even when no state change')
      // Arrange: disbursement in burn_submitted, burn not yet confirmed
      // Act: run pollForBurnConfirmation()
      // Assert: last_heartbeat_at updated, status unchanged

  describe('Admin Resolution')
    it('admin can resolve manual_review back to previous actionable state')
      // Arrange: disbursement in manual_review (was in burn_submitted)
      // Act: admin calls resumeFromReview()
      // Assert: status = burn_submitted, retry_count reset

    it('admin can cancel from manual_review')
      // Arrange: disbursement in manual_review
      // Act: admin calls cancelDisbursement()
      // Assert: status = cancelled, audit logged
```

---

## 13. Definition of Done

- [ ] 14-state enum defined: `disbursement_initiated`, `burn_submitted`, `burn_confirmed`, `attestation_requested`, `attestation_confirmed`, `destination_released`, `payout_initiated`, `payout_complete`, `terminal_failed`, `burn_timeout`, `attestation_timeout`, `payout_timeout`, `manual_review`, `cancelled`
- [ ] 24 transitions registered in state machine with guard + action + SLA + retry budget
- [ ] All invalid transitions throw `StateTransitionError`
- [ ] `disbursements` table with `last_heartbeat_at`, SLA deadline fields, `retry_count`
- [ ] `disbursement_audit` append-only table with `worker_id`, `guard_result`, `metadata`
- [ ] `external_refs` table with `is_primary` flag for superseded refs
- [ ] Guard functions are pure (no side effects), testable in isolation
- [ ] All retry budgets are per-state, reset on successful advance
- [ ] Stuck-state reaper runs every 60s, flags disbursements stuck >2x SLA
- [ ] Reconciliation worker scans for unrecorded burns and orphaned successful payouts
- [ ] Duplicate execution tests pass: concurrent workers produce idempotent results
- [ ] Stuck-state recovery tests pass: reaper correctly identifies and escalates stuck disbursements
- [ ] Every transition is audited with `worker_id` for traceability
- [ ] No production money movement depends on ambiguous or manually inferred state
- [ ] A senior engineer can implement the full BOS lifecycle without reopening state machine design questions

---

## 14. Open Questions

None. The state machine design is fully deterministic. All external API assumptions (xReserve, Yellow Card) are abstracted behind interfaces defined in the xReserve Integration Surface Lock brief (`docs/xreserve-integration-surface-lock.md`). Implementation can proceed with mock adapters.
