import { describe, it, expect, vi, beforeEach } from 'vitest';
import { runAllGates, amountTolerance, attributableFunds, beneficiaryPayload, whitelistPrerequisite } from '../src/services/bos/payoutGates.js';
import { CircuitBreaker } from '../src/services/bos/circuitBreaker.js';
import { TwoPersonApproval } from '../src/services/bos/twoPersonApproval.js';
import { runPreflight } from '../src/services/bos/preflight.js';
import { DisbursementState } from '../src/services/bos/types.js';

function mockCtx(overrides = {}) {
  const dbStore = {
    payout_gates: [],
    two_person_approvals: [],
    circuit_breaker_state: [{ id: 1, state: 'closed', failure_count: 0, last_failure_at: null, last_success_at: null, tripped_at: null, trip_reason: null }],
    disbursements: [],
    profiles: [],
  };

  const db = {
    get: vi.fn(async (sql, params = []) => {
      if (sql.includes('circuit_breaker_state') && sql.includes('SELECT')) {
        return dbStore.circuit_breaker_state[0] || null;
      }
      if (sql.includes('payout_gates') && sql.includes('COUNT')) {
        const matching = dbStore.payout_gates.filter(r => {
          if (sql.includes('half_open_probe')) return r.gate_name === 'circuit_breaker_half_open_probe';
          return true;
        });
        return { cnt: matching.length };
      }
      if (sql.includes('two_person_approvals') && sql.includes('COUNT')) {
        const matching = dbStore.two_person_approvals.filter(r =>
          r.disbursement_id === params[0]
        );
        return { cnt: matching.length };
      }
      if (sql.includes('two_person_approvals') && sql.includes('SELECT id')) {
        return dbStore.two_person_approvals.find(r =>
          r.disbursement_id === params[0] && r.approver_address === params[1]
        ) || null;
      }
      if (sql.includes('two_person_approvals') && sql.includes('MIN')) {
        const matching = dbStore.two_person_approvals.filter(r =>
          r.disbursement_id === params[0]
        );
        if (matching.length === 0) return null;
        return { earliest: matching[0].approved_at };
      }
      if (sql.includes('disbursements') && sql.includes('campaign_id') && sql.includes('id !=')) {
        const row = dbStore.disbursements.find(d =>
          d.campaign_id === params[0] && d.id !== params[1]
        ) || null;
        if (row && sql.includes('expected_amount')) {
          return { expected_amount: row.amount_usd };
        }
        return row;
      }
      if (sql.includes('COALESCE(SUM(amount_usdcx)') && sql.includes('status NOT IN')) {
        const matching = dbStore.disbursements.filter(d =>
          d.campaign_id === params[0] && !['failed', 'cancelled', 'manual_review'].includes(d.status)
        );
        const total = matching.reduce((sum, d) => sum + Number(d.amount_usdcx || 0), 0);
        return { total_disbursed: total };
      }
      if (sql.includes('COALESCE(SUM(amount_usdcx)') && !sql.includes('status NOT IN')) {
        const matching = dbStore.disbursements.filter(d => d.campaign_id === params[0]);
        const total = matching.reduce((sum, d) => sum + Number(d.amount_usdcx || 0), 0);
        return { total_funded: total };
      }
      if (sql.includes('profiles') && sql.includes('WHERE address')) {
        return dbStore.profiles.find(p => p.address === params[0]) || null;
      }
      if (sql.includes('exchange_rates')) {
        return { updated_at: new Date().toISOString() };
      }
      return null;
    }),
    run: vi.fn(async (sql, params = []) => {
      if (sql.includes('INSERT INTO payout_gates')) {
        dbStore.payout_gates.push({ disbursement_id: params[0], gate_name: params[1], passed: params[2] });
      }
      if (sql.includes('INSERT INTO two_person_approvals')) {
        const exists = dbStore.two_person_approvals.find(r =>
          r.disbursement_id === params[0] && r.approver_address === params[1]
        );
        if (!exists) {
          dbStore.two_person_approvals.push({
            disbursement_id: params[0],
            approver_address: params[1],
            approved_at: new Date().toISOString(),
          });
        }
      }
      if (sql.includes('UPDATE circuit_breaker_state')) {
        const row = dbStore.circuit_breaker_state[0];
        if (sql.includes("SET state = 'open'")) {
          row.state = 'open';
          row.tripped_at = new Date().toISOString();
          row.trip_reason = params[1] || 'failure_threshold_exceeded';
          row.failure_count = params[0] || row.failure_count;
        } else if (sql.includes("SET state = 'closed'") && sql.includes('failure_count = 0')) {
          row.state = 'closed';
          row.failure_count = 0;
          row.tripped_at = null;
          row.trip_reason = null;
        } else if (sql.includes("SET state = 'half_open'")) {
          row.state = 'half_open';
        } else {
          row.failure_count = params[0] || row.failure_count;
          row.last_failure_at = new Date().toISOString();
        }
      }
      if (sql.includes('INSERT INTO circuit_breaker_state')) {
        dbStore.circuit_breaker_state[0] = { id: 1, state: 'closed', failure_count: 0, last_failure_at: null, last_success_at: null, tripped_at: null, trip_reason: null };
      }
      return { changes: 1, rows: [] };
    }),
    all: vi.fn(async () => []),
  };

  return {
    getDb: () => db,
    getLogger: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() }),
    emitEvent: vi.fn(async () => {}),
    adapters: {},
    _db: db,
    _dbStore: dbStore,
    ...overrides,
  };
}

function mkDisbursement(overrides = {}) {
  return {
    id: 'disp-001',
    campaign_id: 'camp-001',
    amount_usdcx: 1000000,
    amount_usd: 100,
    creator_address: 'ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG',
    status: DisbursementState.DISBURSEMENT_INITIATED,
    ...overrides,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// amountTolerance
// ═══════════════════════════════════════════════════════════════════════════

describe('amountTolerance', () => {
  it('passes when amount_usd matches milestone amount', async () => {
    const ctx = mockCtx();
    ctx._dbStore.disbursements = [
      { id: 'other', campaign_id: 'camp-001', amount_usd: 100 },
    ];
    const d = mkDisbursement({ amount_usd: 100 });
    const result = await amountTolerance(d, ctx);
    expect(result.ok).toBe(true);
  });

  it('fails when amount_usd is zero', async () => {
    const ctx = mockCtx();
    const d = mkDisbursement({ amount_usd: 0 });
    const result = await amountTolerance(d, ctx);
    expect(result.ok).toBe(false);
    expect(result.error_code).toBe('u8241');
  });

  it('fails when deviation exceeds 2%', async () => {
    const ctx = mockCtx();
    ctx._dbStore.disbursements = [
      { id: 'other', campaign_id: 'camp-001', amount_usd: 100 },
    ];
    const d = mkDisbursement({ amount_usd: 105 });
    const result = await amountTolerance(d, ctx);
    expect(result.ok).toBe(false);
    expect(result.error_code).toBe('u8242');
  });

  it('passes when deviation is within 2%', async () => {
    const ctx = mockCtx();
    ctx._dbStore.disbursements = [
      { id: 'other', campaign_id: 'camp-001', amount_usd: 100 },
    ];
    const d = mkDisbursement({ amount_usd: 101.5 });
    const result = await amountTolerance(d, ctx);
    expect(result.ok).toBe(true);
  });

  it('passes with warning when no milestone found', async () => {
    const ctx = mockCtx();
    ctx._dbStore.disbursements = [];
    const d = mkDisbursement();
    const result = await amountTolerance(d, ctx);
    expect(result.ok).toBe(true);
    expect(result.warning).toBe('no_milestone_amount_found');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// attributableFunds
// ═══════════════════════════════════════════════════════════════════════════

describe('attributableFunds', () => {
  it('passes when escrow balance matches disbursement', async () => {
    const ctx = mockCtx();
    ctx._dbStore.disbursements = [
      { id: 'other', campaign_id: 'camp-001', amount_usdcx: 1000000, status: 'settled' },
    ];
    const d = mkDisbursement({ amount_usdcx: 1000000 });
    const result = await attributableFunds(d, ctx);
    expect(result.ok).toBe(true);
  });

  it('fails when escrow balance insufficient', async () => {
    const ctx = mockCtx();
    ctx._dbStore.disbursements = [
      { id: 'other', campaign_id: 'camp-001', amount_usdcx: 500000, status: 'settled' },
    ];
    const d = mkDisbursement({ amount_usdcx: 1000000 });
    const result = await attributableFunds(d, ctx);
    expect(result.ok).toBe(false);
    expect(result.error_code).toBe('u8243');
  });

  it('fails when campaign not found in escrow', async () => {
    const ctx = mockCtx();
    ctx._dbStore.disbursements = [];
    const d = mkDisbursement();
    const result = await attributableFunds(d, ctx);
    expect(result.ok).toBe(false);
    expect(result.error_code).toBe('u8244');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// beneficiaryPayload
// ═══════════════════════════════════════════════════════════════════════════

describe('beneficiaryPayload', () => {
  it('passes with valid address and amount', () => {
    const ctx = mockCtx();
    const d = mkDisbursement();
    const result = beneficiaryPayload(d, ctx);
    expect(result.ok).toBe(true);
  });

  it('fails when creator_address is empty', () => {
    const ctx = mockCtx();
    const d = mkDisbursement({ creator_address: '' });
    const result = beneficiaryPayload(d, ctx);
    expect(result.ok).toBe(false);
    expect(result.error_code).toBe('u8246');
  });

  it('fails when creator_address is invalid format', () => {
    const ctx = mockCtx();
    const d = mkDisbursement({ creator_address: 'NOT_A_STACKS_ADDRESS' });
    const result = beneficiaryPayload(d, ctx);
    expect(result.ok).toBe(false);
    expect(result.error_code).toBe('u8246');
  });

  it('fails when amount_usdcx is zero', () => {
    const ctx = mockCtx();
    const d = mkDisbursement({ amount_usdcx: 0 });
    const result = beneficiaryPayload(d, ctx);
    expect(result.ok).toBe(false);
    expect(result.error_code).toBe('u8247');
  });

  it('fails when campaign_id is null', () => {
    const ctx = mockCtx();
    const d = mkDisbursement({ campaign_id: null });
    const result = beneficiaryPayload(d, ctx);
    expect(result.ok).toBe(false);
    expect(result.error_code).toBe('u8248');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// whitelistPrerequisite
// ═══════════════════════════════════════════════════════════════════════════

describe('whitelistPrerequisite', () => {
  it('passes when creator is verified and not expired', async () => {
    const ctx = mockCtx();
    ctx._dbStore.profiles = [
      { address: 'ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG', verified: true, verification_expires_at: null },
    ];
    const d = mkDisbursement();
    const result = await whitelistPrerequisite(d, ctx);
    expect(result.ok).toBe(true);
  });

  it('fails when creator not found', async () => {
    const ctx = mockCtx();
    ctx._dbStore.profiles = [];
    const d = mkDisbursement();
    const result = await whitelistPrerequisite(d, ctx);
    expect(result.ok).toBe(false);
    expect(result.error_code).toBe('u8249');
  });

  it('fails when creator not verified', async () => {
    const ctx = mockCtx();
    ctx._dbStore.profiles = [
      { address: 'ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG', verified: false },
    ];
    const d = mkDisbursement();
    const result = await whitelistPrerequisite(d, ctx);
    expect(result.ok).toBe(false);
    expect(result.error_code).toBe('u8249');
  });

  it('fails when verification expired', async () => {
    const ctx = mockCtx();
    ctx._dbStore.profiles = [
      { address: 'ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG', verified: true, verification_expires_at: '2020-01-01T00:00:00Z' },
    ];
    const d = mkDisbursement();
    const result = await whitelistPrerequisite(d, ctx);
    expect(result.ok).toBe(false);
    expect(result.error_code).toBe('u824A');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// runAllGates
// ═══════════════════════════════════════════════════════════════════════════

describe('runAllGates', () => {
  it('passes all gates for a valid disbursement', async () => {
    const ctx = mockCtx();
    ctx._dbStore.disbursements = [
      { id: 'other', campaign_id: 'camp-001', amount_usdcx: 1000000, amount_usd: 100, status: 'settled' },
    ];
    ctx._dbStore.profiles = [
      { address: 'ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG', verified: true, verification_expires_at: null },
    ];
    const d = mkDisbursement();
    const result = await runAllGates(d, ctx);
    expect(result.ok).toBe(true);
    expect(result.gate_results).toHaveLength(4);
    expect(result.gate_results.every(r => r.ok)).toBe(true);
  });

  it('stops at first failing gate', async () => {
    const ctx = mockCtx();
    ctx._dbStore.disbursements = [];
    const d = mkDisbursement();
    const result = await runAllGates(d, ctx);
    expect(result.ok).toBe(false);
    expect(result.gate_results.length).toBeLessThanOrEqual(4);
    const firstFailed = result.gate_results.findIndex(r => !r.ok);
    expect(firstFailed).toBeGreaterThanOrEqual(0);
    result.gate_results.slice(firstFailed + 1).forEach(r => {
      expect(r.ok).toBe(true);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// CircuitBreaker
// ═══════════════════════════════════════════════════════════════════════════

describe('CircuitBreaker', () => {
  it('returns closed state by default', async () => {
    const ctx = mockCtx();
    const cb = new CircuitBreaker();
    const state = await cb.getState(ctx);
    expect(state.state).toBe('closed');
    expect(state.failure_count).toBe(0);
  });

  it('stays closed below threshold', async () => {
    const ctx = mockCtx();
    const cb = new CircuitBreaker({ failureThreshold: 3 });
    await cb.recordFailure(ctx, 'test1');
    await cb.recordFailure(ctx, 'test2');
    const state = await cb.getState(ctx);
    expect(state.state).toBe('closed');
    expect(state.failure_count).toBe(2);
  });

  it('trips to open at threshold', async () => {
    const ctx = mockCtx();
    const cb = new CircuitBreaker({ failureThreshold: 3 });
    await cb.recordFailure(ctx, 'test1');
    await cb.recordFailure(ctx, 'test2');
    await cb.recordFailure(ctx, 'test3');
    const state = await cb.getState(ctx);
    expect(state.state).toBe('open');
    expect(state.failure_count).toBe(3);
  });

  it('check() rejects when open', async () => {
    const ctx = mockCtx();
    const cb = new CircuitBreaker({ failureThreshold: 1, cooldownMs: 60000 });
    await cb.recordFailure(ctx, 'trip');
    const result = await cb.check(mkDisbursement(), ctx);
    expect(result.ok).toBe(false);
    expect(result.error_code).toBe('u8250');
  });

  it('transitions to half_open after cooldown', async () => {
    const ctx = mockCtx();
    const cb = new CircuitBreaker({ failureThreshold: 1, cooldownMs: 100 });
    await cb.recordFailure(ctx, 'trip');
    ctx._dbStore.circuit_breaker_state[0].tripped_at = new Date(Date.now() - 200).toISOString();
    const result = await cb.check(mkDisbursement(), ctx);
    expect(result.ok).toBe(true);
    expect(result.details.circuit_state).toBe('half_open');
  });

  it('check() allows through in half_open', async () => {
    const ctx = mockCtx();
    ctx._dbStore.circuit_breaker_state[0].state = 'half_open';
    ctx._dbStore.circuit_breaker_state[0].tripped_at = new Date().toISOString();
    const cb = new CircuitBreaker({ halfOpenMax: 3 });
    const result = await cb.check(mkDisbursement(), ctx);
    expect(result.ok).toBe(true);
  });

  it('recordSuccess in half_open closes the breaker', async () => {
    const ctx = mockCtx();
    ctx._dbStore.circuit_breaker_state[0].state = 'half_open';
    const cb = new CircuitBreaker();
    const result = await cb.recordSuccess(ctx);
    expect(result.state).toBe('closed');
    expect(result.failure_count).toBe(0);
  });

  it('trip() manually opens the breaker', async () => {
    const ctx = mockCtx();
    const cb = new CircuitBreaker();
    await cb.trip(ctx, 'manual_override');
    const state = await cb.getState(ctx);
    expect(state.state).toBe('open');
  });

  it('reset() closes the breaker from any state', async () => {
    const ctx = mockCtx();
    ctx._dbStore.circuit_breaker_state[0].state = 'open';
    const cb = new CircuitBreaker();
    await cb.reset(ctx);
    const state = await cb.getState(ctx);
    expect(state.state).toBe('closed');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// TwoPersonApproval
// ═══════════════════════════════════════════════════════════════════════════

describe('TwoPersonApproval', () => {
  it('not required below threshold', async () => {
    const ctx = mockCtx();
    const tp = new TwoPersonApproval({ amountThresholdUsd: 1000 });
    const d = mkDisbursement({ amount_usd: 500 });
    const required = await tp.isRequired(d, ctx);
    expect(required).toBe(false);
  });

  it('required at or above threshold', async () => {
    const ctx = mockCtx();
    const tp = new TwoPersonApproval({ amountThresholdUsd: 1000 });
    const d = mkDisbursement({ amount_usd: 1000 });
    const required = await tp.isRequired(d, ctx);
    expect(required).toBe(true);
  });

  it('check() returns ok when not required', async () => {
    const ctx = mockCtx();
    const tp = new TwoPersonApproval({ amountThresholdUsd: 1000 });
    const d = mkDisbursement({ amount_usd: 500 });
    const result = await tp.check(d, ctx);
    expect(result.ok).toBe(true);
    expect(result.details.two_person_required).toBe(false);
  });

  it('check() fails when only 1 approval', async () => {
    const ctx = mockCtx();
    ctx._dbStore.two_person_approvals = [
      { disbursement_id: 'disp-001', approver_address: 'ST1 approver' },
    ];
    const tp = new TwoPersonApproval({ amountThresholdUsd: 1000 });
    const d = mkDisbursement({ amount_usd: 1500 });
    const result = await tp.check(d, ctx);
    expect(result.ok).toBe(false);
    expect(result.error_code).toBe('u8251');
  });

  it('check() passes with 2 approvals', async () => {
    const ctx = mockCtx();
    ctx._dbStore.two_person_approvals = [
      { disbursement_id: 'disp-001', approver_address: 'ST1 approver1', approved_at: new Date().toISOString() },
      { disbursement_id: 'disp-001', approver_address: 'ST1 approver2', approved_at: new Date().toISOString() },
    ];
    const tp = new TwoPersonApproval({ amountThresholdUsd: 1000, approvalWindowMs: 86400000 });
    const d = mkDisbursement({ amount_usd: 1500 });
    const result = await tp.check(d, ctx);
    expect(result.ok).toBe(true);
  });

  it('check() fails when window expired', async () => {
    const ctx = mockCtx();
    ctx._dbStore.two_person_approvals = [
      { disbursement_id: 'disp-001', approver_address: 'ST1 approver1', approved_at: new Date(Date.now() - 200000).toISOString() },
      { disbursement_id: 'disp-001', approver_address: 'ST1 approver2', approved_at: new Date(Date.now() - 100000).toISOString() },
    ];
    const tp = new TwoPersonApproval({ amountThresholdUsd: 1000, approvalWindowMs: 50000 });
    const d = mkDisbursement({ amount_usd: 1500 });
    const result = await tp.check(d, ctx);
    expect(result.ok).toBe(false);
    expect(result.error_code).toBe('u8251');
    expect(result.reason).toContain('expired');
  });

  it('approve() records and checks quorum', async () => {
    const ctx = mockCtx();
    const tp = new TwoPersonApproval({ amountThresholdUsd: 1000 });
    const r1 = await tp.approve('disp-001', 'ST1 approver1', ctx);
    expect(r1.approved).toBe(false);
    expect(r1.approvals_received).toBe(1);

    const r2 = await tp.approve('disp-001', 'ST1 approver2', ctx);
    expect(r2.approved).toBe(true);
    expect(r2.approvals_received).toBe(2);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// runPreflight (orchestrator)
// ═══════════════════════════════════════════════════════════════════════════

describe('runPreflight', () => {
  it('passes all gates for valid disbursement', async () => {
    const ctx = mockCtx();
    ctx._dbStore.disbursements = [
      { id: 'other', campaign_id: 'camp-001', amount_usdcx: 1000000, amount_usd: 100, status: 'settled' },
    ];
    ctx._dbStore.profiles = [
      { address: 'ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG', verified: true, verification_expires_at: null },
    ];
    const d = mkDisbursement();
    const result = await runPreflight(d, ctx);
    expect(result.ok).toBe(true);
    expect(result.gate_results.length).toBeGreaterThanOrEqual(4);
  });

  it('fails when circuit breaker is open', async () => {
    const ctx = mockCtx();
    ctx._dbStore.circuit_breaker_state[0].state = 'open';
    ctx._dbStore.circuit_breaker_state[0].tripped_at = new Date().toISOString();
    const d = mkDisbursement();
    const result = await runPreflight(d, ctx);
    expect(result.ok).toBe(false);
    expect(result.action).toBe('MANUAL_REVIEW_REQUIRED');
    expect(result.gate_results[0].gate).toBe('circuit_breaker');
  });

  it('fails when payout gate fails', async () => {
    const ctx = mockCtx();
    ctx._dbStore.disbursements = [];
    ctx._dbStore.circuit_breaker_state[0].state = 'closed';
    const d = mkDisbursement();
    const result = await runPreflight(d, ctx);
    expect(result.ok).toBe(false);
    expect(result.action).toBe('MANUAL_REVIEW_REQUIRED');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// State machine integration
// ═══════════════════════════════════════════════════════════════════════════

describe('State machine transitions', () => {
  it('DISBURSEMENT_INITIATED → PREFLIGHT_CHECK transition exists', async () => {
    const { getValidNextStates } = await import('../src/services/bos/stateMachine.js');
    const next = getValidNextStates(DisbursementState.DISBURSEMENT_INITIATED);
    expect(next.some(s => s.to === DisbursementState.PREFLIGHT_CHECK)).toBe(true);
  });

  it('PREFLIGHT_CHECK → BURN_SUBMITTED transition exists', async () => {
    const { getValidNextStates } = await import('../src/services/bos/stateMachine.js');
    const next = getValidNextStates(DisbursementState.PREFLIGHT_CHECK);
    expect(next.some(s => s.to === DisbursementState.BURN_SUBMITTED)).toBe(true);
  });

  it('PREFLIGHT_CHECK → MANUAL_REVIEW transition exists', async () => {
    const { getValidNextStates } = await import('../src/services/bos/stateMachine.js');
    const next = getValidNextStates(DisbursementState.PREFLIGHT_CHECK);
    expect(next.some(s => s.to === DisbursementState.MANUAL_REVIEW)).toBe(true);
  });

  it('PREFLIGHT_CHECK → FAILED transition exists', async () => {
    const { getValidNextStates } = await import('../src/services/bos/stateMachine.js');
    const next = getValidNextStates(DisbursementState.PREFLIGHT_CHECK);
    expect(next.some(s => s.to === DisbursementState.FAILED)).toBe(true);
  });

  it('has all required preflight transitions (26+ total)', async () => {
    const { getAllTransitions } = await import('../src/services/bos/stateMachine.js');
    const all = getAllTransitions();
    expect(all.length).toBeGreaterThanOrEqual(26);
    const keys = all.map(t => `${t.from}→${t.to}`);
    expect(keys).toContain('disbursement_initiated→preflight_check');
    expect(keys).toContain('preflight_check→burn_submitted');
    expect(keys).toContain('preflight_check→manual_review');
    expect(keys).toContain('preflight_check→failed');
  });
});
