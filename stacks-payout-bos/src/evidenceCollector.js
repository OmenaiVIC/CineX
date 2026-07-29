let evidenceCounter = 0;

export const EVIDENCE_TYPES = Object.freeze({
  API_RESPONSE: 'api_response',
  TX_HASH: 'tx_hash',
  WEBHOOK_PAYLOAD: 'webhook_payload',
  MANUAL_NOTE: 'manual_note',
  GATE_RESULT: 'gate_result',
  POLL_RESULT: 'poll_result',
});

function generateEvidenceId() {
  evidenceCounter++;
  return `ev-${Date.now()}-${evidenceCounter}`;
}

export async function recordEvidence({ db, disbursementId, evidenceType, evidenceData, recordedBy }) {
  const id = generateEvidenceId();
  const now = new Date().toISOString();

  await db.query(
    `INSERT INTO disbursement_evidence (id, disbursement_id, evidence_type, evidence_data, recorded_by, created_at)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [id, disbursementId, evidenceType, JSON.stringify(evidenceData), recordedBy || 'system', now]
  );

  return { id, type: evidenceType, data: evidenceData, createdAt: now };
}

export async function recordApiResponse({ db, disbursementId, adapter, method, response }) {
  return await recordEvidence({
    db,
    disbursementId,
    evidenceType: EVIDENCE_TYPES.API_RESPONSE,
    evidenceData: { adapter, method, response, timestamp: new Date().toISOString() },
    recordedBy: 'worker',
  });
}

export async function recordTxHash({ db, disbursementId, chain, txHash }) {
  return await recordEvidence({
    db,
    disbursementId,
    evidenceType: EVIDENCE_TYPES.TX_HASH,
    evidenceData: { chain, txHash, timestamp: new Date().toISOString() },
    recordedBy: 'worker',
  });
}

export async function recordWebhookPayload({ db, disbursementId, source, payload }) {
  return await recordEvidence({
    db,
    disbursementId,
    evidenceType: EVIDENCE_TYPES.WEBHOOK_PAYLOAD,
    evidenceData: { source, payload, timestamp: new Date().toISOString() },
    recordedBy: 'webhook',
  });
}

export async function recordGateResult({ db, disbursementId, gateName, passed, reason }) {
  return await recordEvidence({
    db,
    disbursementId,
    evidenceType: EVIDENCE_TYPES.GATE_RESULT,
    evidenceData: { gateName, passed, reason: reason || null, timestamp: new Date().toISOString() },
    recordedBy: 'worker',
  });
}

export async function getEvidence({ db, disbursementId }) {
  const result = await db.query(
    'SELECT * FROM disbursement_evidence WHERE disbursement_id = $1 ORDER BY created_at ASC',
    [disbursementId]
  );

  return (result.rows || []).map(row => ({
    id: row.id,
    type: row.evidence_type,
    data: typeof row.evidence_data === 'string' ? JSON.parse(row.evidence_data) : (row.evidence_data || {}),
    recordedBy: row.recorded_by,
    createdAt: row.created_at,
  }));
}

export default {
  EVIDENCE_TYPES,
  recordEvidence,
  recordApiResponse,
  recordTxHash,
  recordWebhookPayload,
  recordGateResult,
  getEvidence,
};
