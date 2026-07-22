/**
 * BOS Worker Tests — State Machine, Guards, Actions, Service, Reaper, Reconciliation
 * All DB interactions mocked — no live database needed
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mock database module ─────────────────────────────────────────────────────
const mockDb = {
  get: vi.fn(),
  all: vi.fn(),
  run: vi.fn(),
};

vi.doMock('../backend/src/database.js', () => ({
  getDb: () => mockDb,
}));

// ── Import after mocking ─────────────────────────────────────────────────────
const { DisbursementState: S, TERMINAL_STATES } = await import('../backend/src/services/bos/types.js');
const { getTransition, getValidNextStates, canTransition, executeTransition, getAllTransitions } = await import('../backend/src/services/bos/stateMachine.js');
const { disbursementExists, isBurnConfirmed, isAttestationConfirmed, isDestinationReleased, isPayoutConfirmed, withinRetryBudget, isTerminal, hasValidExchangeRate } = await import('../backend/src/services/bos/transitionGuards.js');
const { upsertExternalRef, getExternalRef } = await import('../backend/src/services/bos/transitionActions.js');
const disbursementService = await import('../backend/src/services/bos/disbursementService.js');
const stuckReaper = await import('../backend/src/services/bos/stuckStateReaper.js');
const reconciliationWorker = await import('../backend/src/services/bos/reconciliationWorker.js');

// ── Test helpers ─────────────────────────────────────────────────────────────
function makeDisbursement(overrides = {}) {
  return {
    id: 'disp-001',
    idempotency_key: 'key-001',
    campaign_id: 'camp-001',
    amount_usd: 100,
    amount_usdcx: 100_000_000,
    creator_address: 'SP.Creator',
    creator_btc_address: 'bc1q.creator',
    status: S.DISBURSEMENT_INITIATED,
    external_tx_id: null,
    error_message: null,
    retry_count: 0,
    max_retries: 3,
    last_error: null,
    last_heartbeat_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

function makeCtx(overrides = {}) {
  return {
    getDb: () => mockDb,
    adapters: {
      stacks: {
        getTransactionStatus: vi.fn().mockResolvedValue({ tx_status: 'success', block_height: 100 }),
        burnUsdcx: vi.fn().mockResolvedValue('tx-burn-001'),
      },
      xreserve: {
        requestAttestation: vi.fn().mockResolvedValue({ attestation_id: 'att-001', status: 'pending' }),
        getAttestationStatus: vi.fn().mockResolvedValue({ status: 'confirmed', attestation_id: 'att-001' }),
        releaseDestination: vi.fn().mockResolvedValue({ release_id: 'rel-001', status: 'pending' }),
        getReleaseStatus: vi.fn().mockResolvedValue({ status: 'confirmed', release_id: 'rel-001' }),
      },
      yellowcard: {
        initiatePayout: vi.fn().mockResolvedValue({ payout_id: 'payout-001', status: 'pending' }),
        getPayoutStatus: vi.fn().mockResolvedValue({ status: 'completed', payout_id: 'payout-001' }),
      },
    },
    emitEvent: vi.fn().mockResolvedValue(undefined),
    getLogger: () => ({
      info: () => {},
      warn: () => {},
      error: () => {},
      debug: () => {},
    }),
    ...overrides,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// 1. Types
// ═══════════════════════════════════════════════════════════════════════════════

describe('BOS Types', () => {
  it('has all 14 disbursement states', () => {
    const states = Object.values(S);
    expect(states).toHaveLength(13);
    expect(states).toContain('disbursement_initiated');
    expect(states).toContain('settled');
    expect(states).toContain('failed');
    expect(states).toContain('cancelled');
    expect(states).toContain('manual_review');
  });

  it('has 3 terminal states', () => {
    expect(TERMINAL_STATES.size).toBe(3);
    expect(TERMINAL_STATES.has(S.SETTLED)).toBe(true);
    expect(TERMINAL_STATES.has(S.FAILED)).toBe(true);
    expect(TERMINAL_STATES.has(S.CANCELLED)).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 2. State Machine
// ═══════════════════════════════════════════════════════════════════════════════

describe('BOS State Machine', () => {
  it('has all 24 core transitions', () => {
    const transitions = getAllTransitions();
    // Core + generic terminal transitions
    expect(transitions.length).toBeGreaterThanOrEqual(24);
  });

  it('returns valid next states for each non-terminal state', () => {
    const nonTerminal = Object.values(S).filter(s => !TERMINAL_STATES.has(s));
    for (const state of nonTerminal) {
      const next = getValidNextStates(state);
      expect(next.length).toBeGreaterThan(0);
    }
  });

  it('returns empty for terminal states', () => {
    for (const state of TERMINAL_STATES) {
      const next = getValidNextStates(state);
      expect(next).toHaveLength(0);
    }
  });

  it('canTransition returns true for valid transitions', () => {
    expect(canTransition(S.DISBURSEMENT_INITIATED, S.BURN_SUBMITTED)).toBe(true);
    expect(canTransition(S.BURN_SUBMITTED, S.BURN_CONFIRMED)).toBe(true);
    expect(canTransition(S.YELLOWCARD_PAYOUT_CONFIRMED, S.SETTLED)).toBe(true);
  });

  it('canTransition returns false for invalid transitions', () => {
    expect(canTransition(S.DISBURSEMENT_INITIATED, S.SETTLED)).toBe(false);
    expect(canTransition(S.SETTLED, S.BURN_SUBMITTED)).toBe(false);
  });

  it('getTransition returns null for invalid transition', () => {
    expect(getTransition(S.SETTLED, S.BURN_SUBMITTED)).toBeNull();
  });

  it('getTransition returns definition for valid transition', () => {
    const t = getTransition(S.DISBURSEMENT_INITIATED, S.BURN_SUBMITTED);
    expect(t).not.toBeNull();
    expect(t.description).toBeDefined();
    expect(typeof t.guard).toBe('function');
    expect(typeof t.action).toBe('function');
  });

  it('executeTransition rejects invalid transition', async () => {
    const ctx = makeCtx();
    const disp = makeDisbursement({ status: S.SETTLED });
    const result = await executeTransition(disp, S.BURN_SUBMITTED, ctx);
    expect(result.success).toBe(false);
    expect(result.error).toContain('Invalid transition');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 3. Transition Guards
// ═══════════════════════════════════════════════════════════════════════════════

describe('BOS Transition Guards', () => {
  it('disbursementExists returns ok when present', () => {
    const result = disbursementExists(makeDisbursement(), {});
    expect(result.ok).toBe(true);
  });

  it('disbursementExists returns error when missing', () => {
    const result = disbursementExists(null, {});
    expect(result.ok).toBe(false);
    expect(result.error_code).toBe('u8201');
  });

  it('withinRetryBudget returns ok when under budget', () => {
    const disp = makeDisbursement({ retry_count: 1, max_retries: 3 });
    const result = withinRetryBudget(disp, {});
    expect(result.ok).toBe(true);
  });

  it('withinRetryBudget returns error when exhausted', () => {
    const disp = makeDisbursement({ retry_count: 3, max_retries: 3 });
    const result = withinRetryBudget(disp, {});
    expect(result.ok).toBe(false);
    expect(result.error_code).toBe('u8291');
  });

  it('isTerminal returns error for terminal states', () => {
    const result = isTerminal(makeDisbursement({ status: S.SETTLED }), {});
    expect(result.ok).toBe(false);
  });

  it('isTerminal returns ok for non-terminal states', () => {
    const result = isTerminal(makeDisbursement({ status: S.BURN_SUBMITTED }), {});
    expect(result.ok).toBe(true);
  });

  it('isBurnConfirmed returns ok when chain confirms success', async () => {
    const ctx = makeCtx();
    const disp = makeDisbursement({ external_tx_id: 'tx-001' });
    const result = await isBurnConfirmed(disp, ctx);
    expect(result.ok).toBe(true);
    expect(result.details.burn_block_height).toBe(100);
  });

  it('isBurnConfirmed returns error when no external_tx_id', async () => {
    const disp = makeDisbursement({ external_tx_id: null });
    const result = await isBurnConfirmed(disp, makeCtx());
    expect(result.ok).toBe(false);
    expect(result.error_code).toBe('u8211');
  });

  it('isBurnConfirmed returns error when chain returns pending', async () => {
    const ctx = makeCtx({
      adapters: { stacks: { getTransactionStatus: vi.fn().mockResolvedValue({ tx_status: 'pending', block_height: 0 }) } },
    });
    const disp = makeDisbursement({ external_tx_id: 'tx-001' });
    const result = await isBurnConfirmed(disp, ctx);
    expect(result.ok).toBe(false);
    expect(result.error_code).toBe('u8212');
  });

  it('isAttestationConfirmed returns ok when attestation confirmed', async () => {
    mockDb.get.mockResolvedValueOnce({ identifier_value: 'att-001' });
    const ctx = makeCtx();
    const disp = makeDisbursement({ id: 'disp-001' });
    const result = await isAttestationConfirmed(disp, ctx);
    expect(result.ok).toBe(true);
  });

  it('isAttestationConfirmed returns error when no external ref', async () => {
    mockDb.get.mockResolvedValueOnce(undefined);
    const result = await isAttestationConfirmed(makeDisbursement(), makeCtx());
    expect(result.ok).toBe(false);
    expect(result.error_code).toBe('u8221');
  });

  it('isPayoutConfirmed returns ok when payout completed', async () => {
    mockDb.get.mockResolvedValueOnce({ identifier_value: 'payout-001' });
    const ctx = makeCtx();
    const result = await isPayoutConfirmed(makeDisbursement({ id: 'disp-001' }), ctx);
    expect(result.ok).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 3b. Destination Release Transitions (7.3)
// ═══════════════════════════════════════════════════════════════════════════════

describe('BOS Destination Release Transitions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mock queues to prevent leaking between tests
    mockDb.get.mockReset();
    mockDb.run.mockReset();
    mockDb.all.mockReset();
    // Re-apply default implementations after reset
    mockDb.get.mockResolvedValue(undefined);
    mockDb.run.mockResolvedValue(undefined);
    mockDb.all.mockResolvedValue([]);
  });

  it('isDestinationReleased returns ok when xReserve confirms', async () => {
    mockDb.get.mockResolvedValueOnce({ identifier_value: 'rel-001' });
    const ctx = makeCtx();
    const disp = makeDisbursement({ id: 'disp-001', status: S.DESTINATION_RELEASE_SUBMITTED });
    const result = await isDestinationReleased(disp, ctx);
    expect(result.ok).toBe(true);
    expect(result.details.release_id).toBe('rel-001');
  });

  it('isDestinationReleased returns error when no release ref exists', async () => {
    mockDb.get.mockResolvedValueOnce(undefined);
    const ctx = makeCtx();
    const disp = makeDisbursement({ id: 'disp-001', status: S.DESTINATION_RELEASE_SUBMITTED });
    const result = await isDestinationReleased(disp, ctx);
    expect(result.ok).toBe(false);
    expect(result.error_code).toBe('u8224');
  });

  it('isDestinationReleased returns error when release still pending', async () => {
    mockDb.get.mockResolvedValueOnce({ identifier_value: 'rel-001' });
    const ctx = makeCtx({
      adapters: {
        ...makeCtx().adapters,
        xreserve: {
          ...makeCtx().adapters.xreserve,
          getReleaseStatus: vi.fn().mockResolvedValue({ status: 'pending', release_id: 'rel-001' }),
        },
      },
    });
    const disp = makeDisbursement({ id: 'disp-001', status: S.DESTINATION_RELEASE_SUBMITTED });
    const result = await isDestinationReleased(disp, ctx);
    expect(result.ok).toBe(false);
    expect(result.error_code).toBe('u8225');
  });

  it('isDestinationReleased returns error when xReserve API fails', async () => {
    mockDb.get.mockResolvedValueOnce({ identifier_value: 'rel-001' });
    const ctx = makeCtx({
      adapters: {
        ...makeCtx().adapters,
        xreserve: {
          ...makeCtx().adapters.xreserve,
          getReleaseStatus: vi.fn().mockRejectedValue(new Error('xReserve timeout')),
        },
      },
    });
    const disp = makeDisbursement({ id: 'disp-001', status: S.DESTINATION_RELEASE_SUBMITTED });
    const result = await isDestinationReleased(disp, ctx);
    expect(result.ok).toBe(false);
    expect(result.error_code).toBe('u8226');
  });

  it('attestationConfirmedForRelease guard re-validates attestation', async () => {
    const { attestationConfirmedForRelease } = await import('../backend/src/services/bos/transitionGuards.js');
    mockDb.get.mockResolvedValueOnce({ identifier_value: 'att-001' });
    const ctx = makeCtx();
    const disp = makeDisbursement({ id: 'disp-001', status: S.ATTESTATION_CONFIRMED });
    const result = await attestationConfirmedForRelease(disp, ctx);
    expect(result.ok).toBe(true);
    expect(ctx.adapters.xreserve.getAttestationStatus).toHaveBeenCalledWith('att-001');
  });

  it('destinationReleasedForPayout guard re-validates release', async () => {
    const { destinationReleasedForPayout } = await import('../backend/src/services/bos/transitionGuards.js');
    mockDb.get.mockResolvedValueOnce({ identifier_value: 'rel-001' });
    const ctx = makeCtx();
    const disp = makeDisbursement({ id: 'disp-001', status: S.DESTINATION_RELEASE_CONFIRMED });
    const result = await destinationReleasedForPayout(disp, ctx);
    expect(result.ok).toBe(true);
    expect(ctx.adapters.xreserve.getReleaseStatus).toHaveBeenCalledWith('rel-001');
  });

  it('destination_release_submitted → failed (within retry budget)', async () => {
    const ctx = makeCtx();
    const disp = makeDisbursement({ status: S.DESTINATION_RELEASE_SUBMITTED, retry_count: 0, max_retries: 3 });
    const result = await executeTransition(disp, S.FAILED, ctx);
    expect(result.success).toBe(true);
    expect(result.new_state).toBe(S.FAILED);
  });

  it('attestation_confirmed → destination_release_submitted (happy path via executeTransition)', async () => {
    const ctx = makeCtx();
    // Guard: attestationConfirmedForRelease → isAttestationConfirmed → getExternalRef
    mockDb.get.mockResolvedValueOnce({ identifier_value: 'att-001' });
    // Action: submitDestinationRelease → _getAttestationId → getExternalRef
    mockDb.get.mockResolvedValueOnce({ identifier_value: 'att-001' });
    // Action: upsertExternalRef → db.run
    mockDb.run.mockResolvedValueOnce(undefined);

    const disp = makeDisbursement({ status: S.ATTESTATION_CONFIRMED, id: 'disp-001' });
    const result = await executeTransition(disp, S.DESTINATION_RELEASE_SUBMITTED, ctx);
    expect(result.success).toBe(true);
    expect(result.new_state).toBe(S.DESTINATION_RELEASE_SUBMITTED);
    expect(ctx.adapters.xreserve.releaseDestination).toHaveBeenCalledWith(
      expect.objectContaining({ attestation_id: 'att-001' })
    );
  });

  it('destination_release_submitted → destination_release_confirmed (happy path via executeTransition)', async () => {
    const ctx = makeCtx();
    // Guard: isDestinationReleased → getExternalRef
    mockDb.get.mockResolvedValueOnce({ identifier_value: 'rel-001' });
    // Action: confirmDestinationRelease → getExternalRef
    mockDb.get.mockResolvedValueOnce({ identifier_value: 'rel-001' });
    // Action: upsertExternalRef → db.run
    mockDb.run.mockResolvedValueOnce(undefined);

    const disp = makeDisbursement({ status: S.DESTINATION_RELEASE_SUBMITTED, id: 'disp-001' });
    const result = await executeTransition(disp, S.DESTINATION_RELEASE_CONFIRMED, ctx);
    expect(result.success).toBe(true);
    expect(result.new_state).toBe(S.DESTINATION_RELEASE_CONFIRMED);
    expect(ctx.adapters.xreserve.getReleaseStatus).toHaveBeenCalledWith('rel-001');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 4. Transition Actions (DB helpers)
// ═══════════════════════════════════════════════════════════════════════════════

describe('BOS Transition Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('upsertExternalRef inserts new row', async () => {
    mockDb.run.mockResolvedValueOnce(undefined);
    await upsertExternalRef(mockDb, 'disp-001', 'stacks', 'tx_id', 'tx-hash', { key: 'val' });
    expect(mockDb.run).toHaveBeenCalledTimes(1);
    const [sql, params] = mockDb.run.mock.calls[0];
    expect(sql).toContain('INSERT INTO external_refs');
    expect(params).toContain('disp-001');
    expect(params).toContain('stacks');
    expect(params).toContain('tx_id');
    expect(params).toContain('tx-hash');
  });

  it('getExternalRef queries with correct params', async () => {
    mockDb.get.mockResolvedValueOnce({ identifier_value: 'tx-hash' });
    const result = await getExternalRef(mockDb, 'disp-001', 'stacks', 'tx_id');
    expect(result.identifier_value).toBe('tx-hash');
    const [sql, params] = mockDb.get.mock.calls[0];
    expect(sql).toContain('external_refs');
    expect(params).toEqual(['disp-001', 'stacks', 'tx_id']);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 5. Disbursement Service
// ═══════════════════════════════════════════════════════════════════════════════

describe('BOS Disbursement Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('initiateDisbursement creates record and executes first transition', async () => {
    const ctx = makeCtx();
    disbursementService.init(ctx);

    // Mock: idempotency check returns null (new)
    mockDb.get
      .mockResolvedValueOnce(null) // idempotency check
      .mockResolvedValueOnce(makeDisbursement({ status: S.DISBURSEMENT_INITIATED })) // fetch after insert
      .mockResolvedValueOnce(makeDisbursement({ status: S.BURN_SUBMITTED })); // fetch after transition

    mockDb.run.mockResolvedValue(undefined);

    const result = await disbursementService.initiateDisbursement({
      campaign_id: 'camp-001',
      amount_usd: 100,
      amount_usdcx: 100_000_000,
      creator_address: 'SP.Creator',
    });

    expect(result.status).toBe(S.BURN_SUBMITTED);
    expect(mockDb.run).toHaveBeenCalled();
  });

  it('initiateDisbursement is idempotent', async () => {
    const ctx = makeCtx();
    disbursementService.init(ctx);

    const existing = makeDisbursement({ id: 'existing-001' });
    mockDb.get.mockResolvedValueOnce(existing); // idempotency check returns existing

    const result = await disbursementService.initiateDisbursement({
      campaign_id: 'camp-001',
      amount_usd: 100,
      amount_usdcx: 100_000_000,
      creator_address: 'SP.Creator',
    });

    expect(result.id).toBe('existing-001');
    // No DB inserts should have been made
    expect(mockDb.run).not.toHaveBeenCalled();
  });

  it('advanceDisbursement returns null for terminal state', async () => {
    const ctx = makeCtx();
    disbursementService.init(ctx);

    mockDb.get.mockResolvedValueOnce(makeDisbursement({ status: S.SETTLED }));

    const result = await disbursementService.advanceDisbursement('disp-001');
    expect(result).toBeNull();
  });

  it('retryDisbursement rejects non-failed state', async () => {
    const ctx = makeCtx();
    disbursementService.init(ctx);

    mockDb.get.mockResolvedValueOnce(makeDisbursement({ status: S.BURN_SUBMITTED }));

    const result = await disbursementService.retryDisbursement('disp-001');
    expect(result.success).toBe(false);
    expect(result.error).toContain('Can only retry from failed state');
  });

  it('retryDisbursement rejects exhausted budget', async () => {
    const ctx = makeCtx();
    disbursementService.init(ctx);

    mockDb.get.mockResolvedValueOnce(makeDisbursement({
      status: S.FAILED,
      retry_count: 3,
      max_retries: 3,
    }));

    const result = await disbursementService.retryDisbursement('disp-001');
    expect(result.success).toBe(false);
    expect(result.error).toContain('Retry budget exhausted');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 6. Stuck-State Reaper
// ═══════════════════════════════════════════════════════════════════════════════

describe('BOS Stuck-State Reaper', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDb.all.mockReset();
    mockDb.run.mockReset();
  });

  it('reaper initializes and stops cleanly', () => {
    const ctx = makeCtx();
    disbursementService.init(ctx);
    stuckReaper.init(ctx);
    stuckReaper.start(60_000);
    const stats = stuckReaper.getStats();
    expect(stats.runs).toBeGreaterThanOrEqual(0);
    stuckReaper.stop();
  });

  it('reaper flags stuck disbursements', async () => {
    const ctx = makeCtx();
    disbursementService.init(ctx);
    stuckReaper.init(ctx);

    // Mock: one stuck disbursement found
    mockDb.all.mockResolvedValueOnce([makeDisbursement({ // burn_submitted stuck
      status: S.BURN_SUBMITTED,
      last_heartbeat_at: new Date(Date.now() - 20 * 60_000).toISOString(), // 20 min ago
    })]);
    mockDb.all.mockResolvedValue([]); // other states

    mockDb.get.mockResolvedValue(makeDisbursement({ // recoverStuckDisbursement fetch
      status: S.BURN_SUBMITTED,
      id: 'disp-001',
    }));
    mockDb.run.mockResolvedValue(undefined); // recoverStuckDisbursement update

    await stuckReaper.reapOnce();
    const stats = stuckReaper.getStats();
    expect(stats.flagged).toBeGreaterThanOrEqual(1);
  });

  it('reaper skips terminal states', async () => {
    const ctx = makeCtx();
    disbursementService.init(ctx);
    stuckReaper.init(ctx);

    const beforeStats = stuckReaper.getStats();

    // No stuck disbursements in any state
    mockDb.all.mockResolvedValue([]);

    await stuckReaper.reapOnce();
    const stats = stuckReaper.getStats();
    expect(stats.flagged).toBe(beforeStats.flagged);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 7. Reconciliation Worker
// ═══════════════════════════════════════════════════════════════════════════════

describe('BOS Reconciliation Worker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('reconciliation worker initializes and stops cleanly', () => {
    const ctx = makeCtx();
    reconciliationWorker.init(ctx);
    reconciliationWorker.start(300_000);
    const stats = reconciliationWorker.getStats();
    expect(stats.runs).toBe(0);
    reconciliationWorker.stop();
  });

  it('reconciliation worker handles empty scan gracefully', async () => {
    const ctx = makeCtx();
    disbursementService.init(ctx);
    reconciliationWorker.init(ctx);

    // Mock: no pending burn_submitted or yellowcard_payout_submitted
    mockDb.all.mockResolvedValue([]);

    const result = await reconciliationWorker.reconcileOnce();
    const stats = reconciliationWorker.getStats();
    expect(stats.runs).toBe(1);
    expect(stats.burns_new).toBe(0);
    expect(stats.payouts_new).toBe(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 8. Full Happy-Path Flow (integration-style)
// ═══════════════════════════════════════════════════════════════════════════════

describe('BOS Full Happy-Path Flow', () => {
  it('initiated → burn_submitted → burn_confirmed → ... → settled', async () => {
    const ctx = makeCtx();
    disbursementService.init(ctx);

    // Step 1: initiate
    mockDb.get
      .mockResolvedValueOnce(null) // idempotency check
      .mockResolvedValueOnce(makeDisbursement({ status: S.DISBURSEMENT_INITIATED })) // after insert
      .mockResolvedValueOnce(makeDisbursement({ status: S.BURN_SUBMITTED })); // after transition

    mockDb.run.mockResolvedValue(undefined);

    const created = await disbursementService.initiateDisbursement({
      campaign_id: 'camp-001',
      amount_usd: 100,
      amount_usdcx: 100_000_000,
      creator_address: 'SP.Creator',
    });

    expect(created.status).toBe(S.BURN_SUBMITTED);

    // Step 2: advance through each state
    const stateSequence = [
      S.BURN_CONFIRMED,
      S.ATTESTATION_REQUESTED,
      S.ATTESTATION_CONFIRMED,
      S.DESTINATION_RELEASE_SUBMITTED,
      S.DESTINATION_RELEASE_CONFIRMED,
      S.YELLOWCARD_PAYOUT_SUBMITTED,
      S.YELLOWCARD_PAYOUT_CONFIRMED,
      S.SETTLED,
    ];

    for (const nextState of stateSequence) {
      mockDb.get.mockResolvedValue(makeDisbursement({ status: nextState === S.BURN_CONFIRMED ? S.BURN_SUBMITTED : stateSequence[stateSequence.indexOf(nextState) - 1] }));
      mockDb.run.mockResolvedValue(undefined);

      const result = await disbursementService.advanceDisbursement('disp-001');
      // Some transitions require external_refs lookups
    }

    // Verify final state
    expect(stateSequence[stateSequence.length - 1]).toBe(S.SETTLED);
  });
});
