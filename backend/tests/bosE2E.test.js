import { describe, it, expect, vi, beforeEach } from 'vitest';
import { verifyHmac, verifyWebhook } from '../src/services/bos/webhookVerifier.js';
import { createFallbackPoller, pollTarget, mapExternalStatus, isEligible } from '../src/services/bos/fallbackPoller.js';
import { buildTimeline, formatTimelineText, STATE_LABELS } from '../src/services/bos/auditTimeline.js';
import { EVIDENCE_TYPES, recordEvidence, recordApiResponse, recordTxHash, recordGateResult, getEvidence } from '../src/services/bos/evidenceCollector.js';

// ─── webhookVerifier ───────────────────────────────────────────

describe('webhookVerifier', () => {
  it('verifies a valid HMAC-SHA256 signature', () => {
    const crypto = require('crypto');
    const secret = 'test-secret-key';
    const payload = JSON.stringify({ event: 'test' });
    const signature = crypto.createHmac('sha256', secret).update(payload).digest('hex');

    const result = verifyHmac(payload, signature, secret);
    expect(result).toBe(true);
  });

  it('rejects an invalid signature', () => {
    const result = verifyHmac('payload', '0000000000000000000000000000000000000000000000000000000000000000', 'secret');
    expect(result).toBe(false);
  });

  it('rejects when signature is missing', () => {
    const result = verifyHmac('payload', '', 'secret');
    expect(result).toBe(false);
  });

  it('rejects when secret is missing', () => {
    const result = verifyHmac('payload', 'sig', '');
    expect(result).toBe(false);
  });

  it('supports sha256= prefix', () => {
    const crypto = require('crypto');
    const secret = 'key';
    const payload = 'data';
    const sig = crypto.createHmac('sha256', secret).update(payload).digest('hex');

    expect(verifyHmac(payload, `sha256=${sig}`, secret)).toBe(true);
  });

  it('verifyXReserveWebhook passes with no secret configured', () => {
    const result = verifyWebhook('xreserve', '{}', {});
    expect(result.valid).toBe(true);
    expect(result.reason).toBe('no_secret_configured');
  });

  it('verifyYellowCardWebhook returns missing_signature when secret is set', () => {
    process.env.YELLOW_CARD_WEBHOOK_SECRET = 'yc-secret';
    const result = verifyWebhook('yellowcard', '{}', {});
    delete process.env.YELLOW_CARD_WEBHOOK_SECRET;
    expect(result.valid).toBe(false);
    expect(result.reason).toBe('missing_signature');
  });

  it('verifyWebhook returns error for unknown source', () => {
    const result = verifyWebhook('unknown', '{}', {});
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('unknown_source');
  });
});

// ─── fallbackPoller ────────────────────────────────────────────

describe('fallbackPoller', () => {
  it('returns correct poll target for burn_submitted', () => {
    const t = pollTarget('burn_submitted');
    expect(t).toEqual({ adapter: 'stacks', method: 'getTransactionStatus', idField: 'external_tx_id' });
  });

  it('returns correct poll target for attestation_requested', () => {
    const t = pollTarget('attestation_requested');
    expect(t).toEqual({ adapter: 'xreserve', method: 'getAttestationStatus', idField: 'attestation_id' });
  });

  it('returns correct poll target for destination_release_submitted', () => {
    const t = pollTarget('destination_release_submitted');
    expect(t).toEqual({ adapter: 'xreserve', method: 'getReleaseStatus', idField: 'release_id' });
  });

  it('returns correct poll target for yellowcard_payout_submitted', () => {
    const t = pollTarget('yellowcard_payout_submitted');
    expect(t).toEqual({ adapter: 'yellowcard', method: 'getPayoutStatus', idField: 'payout_id' });
  });

  it('returns null for settled state', () => {
    expect(pollTarget('settled')).toBeNull();
  });

  it('returns null for failed state', () => {
    expect(pollTarget('failed')).toBeNull();
  });

  it('maps burn_confirmed to advance', () => {
    const r = mapExternalStatus('confirmed', 'burn_submitted');
    expect(r.action).toBe('advance');
  });

  it('maps burn_failed to fail', () => {
    const r = mapExternalStatus('failed', 'burn_submitted');
    expect(r.action).toBe('fail');
    expect(r.reason).toBe('burn_failed');
  });

  it('maps pending to retry', () => {
    const r = mapExternalStatus('pending', 'burn_submitted');
    expect(r.action).toBe('retry');
  });

  it('maps attestation confirmed to advance', () => {
    expect(mapExternalStatus('completed', 'attestation_requested').action).toBe('advance');
  });

  it('maps payout successful to advance', () => {
    expect(mapExternalStatus('successful', 'yellowcard_payout_submitted').action).toBe('advance');
  });

  it('isEligible rejects settled', () => {
    expect(isEligible({ status: 'settled' })).toBe(false);
  });

  it('isEligible rejects manual review', () => {
    expect(isEligible({ status: 'burn_submitted', manual_review_at: '2026-01-01' })).toBe(false);
  });

  it('isEligible rejects if retry count exceeded', () => {
    expect(isEligible({ status: 'burn_submitted', retry_count: 30 })).toBe(false);
  });

  it('isEligible accepts eligible disbursement', () => {
    expect(isEligible({ status: 'burn_submitted', retry_count: 5 })).toBe(true);
  });

  it('createFallbackPoller starts and stops', async () => {
    const mockDb = { query: vi.fn(async () => ({ rows: [] })) };
    const mockAdapters = { stacks: {}, xreserve: {}, yellowcard: {} };
    const mockPipeline = { advanceDisbursement: vi.fn() };
    const mockLogger = { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() };

    const poller = createFallbackPoller({ db: mockDb, adapters: mockAdapters, pipelineWorker: mockPipeline, logger: mockLogger });
    poller.start();
    // Wait for immediate pollOnce
    await new Promise(r => setTimeout(r, 50));
    expect(mockDb.query).toHaveBeenCalled();
    poller.stop();
  });
});

// ─── auditTimeline ─────────────────────────────────────────────

describe('auditTimeline', () => {
  function mockDb(rows) {
    return {
      query: vi.fn(async (sql) => {
        if (sql.includes('disbursement_audit')) return { rows: rows.audit || [] };
        if (sql.includes('external_status_snapshots')) return { rows: rows.snapshots || [] };
        if (sql.includes('disbursement_evidence')) return { rows: rows.evidence || [] };
        return { rows: [] };
      }),
    };
  }

  it('builds timeline from audit events', async () => {
    const db = mockDb({
      audit: [
        { from_state: null, to_state: 'disbursement_initiated', reason: null, metadata: null, created_at: '2026-01-01T00:00:00Z' },
        { from_state: 'disbursement_initiated', to_state: 'burn_submitted', reason: null, metadata: null, created_at: '2026-01-01T00:01:00Z' },
      ],
      snapshots: [],
      evidence: [],
    });

    const { timeline, summary } = await buildTimeline({ db, disbursementId: 'd1' });
    expect(timeline).toHaveLength(2);
    expect(timeline[0].label).toBe('Disbursement created');
    expect(timeline[1].label).toBe('Digital currency sent for burning');
    expect(summary.currentState).toBe('burn_submitted');
    expect(summary.totalEvents).toBe(2);
    expect(summary.settled).toBe(false);
  });

  it('marks settled disbursement correctly', async () => {
    const db = mockDb({
      audit: [
        { from_state: null, to_state: 'disbursement_initiated', reason: null, metadata: null, created_at: '2026-01-01T00:00:00Z' },
        { from_state: 'disbursement_initiated', to_state: 'settled', reason: null, metadata: null, created_at: '2026-01-01T01:00:00Z' },
      ],
    });

    const { summary } = await buildTimeline({ db, disbursementId: 'd2' });
    expect(summary.settled).toBe(true);
    expect(summary.failed).toBe(false);
  });

  it('attaches matching snapshots to timeline entries', async () => {
    const db = mockDb({
      audit: [
        { from_state: 'burn_submitted', to_state: 'burn_confirmed', reason: null, metadata: null, created_at: '2026-01-01T00:05:00Z' },
      ],
      snapshots: [
        { external_system: 'stacks', status: 'confirmed', raw_response: {}, created_at: '2026-01-01T00:05:05Z' },
      ],
    });

    const { timeline } = await buildTimeline({ db, disbursementId: 'd3' });
    expect(timeline[0].externalStatuses).toBeDefined();
    expect(timeline[0].externalStatuses[0].system).toBe('stacks');
  });

  it('formatTimelineText produces readable output', () => {
    const timeline = [
      { icon: '📋', label: 'Disbursement created', timestamp: '2026-01-01T00:00:00Z' },
      { icon: '🔥', label: 'Digital currency sent for burning', timestamp: '2026-01-01T00:01:00Z', externalStatuses: [{ system: 'stacks', status: 'confirmed' }] },
    ];
    const text = formatTimelineText(timeline);
    expect(text).toContain('📋');
    expect(text).toContain('Disbursement created');
    expect(text).toContain('stacks:confirmed');
  });

  it('has all 14 state labels defined', () => {
    const expected = [
      'disbursement_initiated', 'preflight_check', 'manual_review_required',
      'burn_submitted', 'burn_confirmed', 'attestation_requested', 'attestation_confirmed',
      'destination_release_submitted', 'destination_release_confirmed',
      'yellowcard_payout_submitted', 'yellowcard_payout_confirmed',
      'settled', 'failed', 'cancelled',
    ];
    for (const s of expected) {
      expect(STATE_LABELS[s]).toBeDefined();
      expect(STATE_LABELS[s].label).toBeTruthy();
      expect(STATE_LABELS[s].icon).toBeTruthy();
      expect(STATE_LABELS[s].category).toBeTruthy();
    }
  });
});

// ─── evidenceCollector ─────────────────────────────────────────

describe('evidenceCollector', () => {
  function mockDb() {
    return {
      query: vi.fn(async () => ({})),
    };
  }

  it('records evidence with generated id', async () => {
    const db = mockDb();
    const { id } = await recordEvidence({
      db,
      disbursementId: 'd1',
      evidenceType: EVIDENCE_TYPES.GATE_RESULT,
      evidenceData: { gateName: 'amountTolerance', passed: true },
      recordedBy: 'worker',
    });
    expect(id).toMatch(/^ev-/);
    expect(db.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO disbursement_evidence'),
      expect.arrayContaining(['d1', 'gate_result', expect.any(String), 'worker'])
    );
  });

  it('recordApiResponse stores adapter/method/response', async () => {
    const db = mockDb();
    const { id } = await recordApiResponse({
      db,
      disbursementId: 'd2',
      adapter: 'xreserve',
      method: 'getAttestationStatus',
      response: { status: 'confirmed' },
    });
    expect(id).toMatch(/^ev-/);
    const dataStr = db.query.mock.calls[0][1][3];
    const data = JSON.parse(dataStr);
    expect(data.adapter).toBe('xreserve');
    expect(data.response.status).toBe('confirmed');
  });

  it('recordTxHash stores chain and hash', async () => {
    const db = mockDb();
    await recordTxHash({
      db,
      disbursementId: 'd3',
      chain: 'stacks',
      txHash: '0xabc123',
    });
    const data = JSON.parse(db.query.mock.calls[0][1][3]);
    expect(data.chain).toBe('stacks');
    expect(data.txHash).toBe('0xabc123');
  });

  it('recordGateResult stores gate details', async () => {
    const db = mockDb();
    await recordGateResult({
      db,
      disbursementId: 'd4',
      gateName: 'beneficiaryPayload',
      passed: false,
      reason: 'Missing beneficiary info',
    });
    const data = JSON.parse(db.query.mock.calls[0][1][3]);
    expect(data.gateName).toBe('beneficiaryPayload');
    expect(data.passed).toBe(false);
  });

  it('getEvidence parses JSON and returns structured data', async () => {
    const db = {
      query: vi.fn(async () => ({
        rows: [
          {
            id: 'ev-1',
            evidence_type: 'tx_hash',
            evidence_data: '{"chain":"stacks","txHash":"0xabc"}',
            recorded_by: 'worker',
            created_at: '2026-01-01T00:00:00Z',
          },
        ],
      })),
    };
    const evidence = await getEvidence({ db, disbursementId: 'd5' });
    expect(evidence).toHaveLength(1);
    expect(evidence[0].type).toBe('tx_hash');
    expect(evidence[0].data.txHash).toBe('0xabc');
  });

  it('EVIDENCE_TYPES has all expected types', () => {
    expect(Object.keys(EVIDENCE_TYPES)).toHaveLength(6);
    expect(EVIDENCE_TYPES.API_RESPONSE).toBe('api_response');
    expect(EVIDENCE_TYPES.TX_HASH).toBe('tx_hash');
    expect(EVIDENCE_TYPES.WEBHOOK_PAYLOAD).toBe('webhook_payload');
    expect(EVIDENCE_TYPES.MANUAL_NOTE).toBe('manual_note');
    expect(EVIDENCE_TYPES.GATE_RESULT).toBe('gate_result');
    expect(EVIDENCE_TYPES.POLL_RESULT).toBe('poll_result');
  });
});
