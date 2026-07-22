/**
 * BOS xReserve Bridge Adapter — REST client for xReserve attestation API
 *
 * Implements the adapter interface consumed by transitionGuards.js and transitionActions.js.
 *
 * EXTERNAL ASSUMPTIONS (locked in xreserve-integration-surface-lock.md §11):
 *   Q1: Exact xReserve API endpoints, auth mechanism, response shapes — to be verified.
 *   Q4: Webhook support — poll-only for MVP.
 *
 * All endpoints below are placeholders matching the surface lock §6.2.
 * Real endpoints drop in when xReserve docs are available.
 */

const XRESERVE_API_URL = process.env.XRESERVE_API_URL || 'https://api.xreserve.com/v1';
const XRESERVE_API_KEY = process.env.XRESERVE_API_KEY || '';

/**
 * Build common fetch options for xReserve API calls
 */
function _headers(extra = {}) {
  return {
    'Content-Type': 'application/json',
    ...(XRESERVE_API_KEY ? { 'Authorization': `Bearer ${XRESERVE_API_KEY}` } : {}),
    ...extra,
  };
}

/**
 * POST /v1/burns — request attestation for a Stacks burn tx
 *
 * @param {Object} params
 * @param {string} params.tx_id         — Stacks burn tx hash
 * @param {string} params.token_contract — USDCx contract principal
 * @param {number} params.amount_sats    — amount in base units
 * @returns {Promise<{ attestation_id: string, status: string }>}
 */
export async function requestAttestation({ tx_id, token_contract, amount_sats }) {
  const url = `${XRESERVE_API_URL}/burns`;
  const resp = await fetch(url, {
    method: 'POST',
    headers: _headers(),
    body: JSON.stringify({
      asset: 'USDCx',
      amount: String(amount_sats),
      burnTxHash: tx_id,
      tokenContract: token_contract,
    }),
  });

  if (!resp.ok) {
    const body = await resp.text();
    throw new Error(`xReserve attestation request failed (${resp.status}): ${body.substring(0, 200)}`);
  }

  const data = await resp.json();
  return {
    attestation_id: data.attestationId || data.attestation_id,
    status: data.status || 'pending',
  };
}

/**
 * GET /v1/burns/{burnTxHash}/attestation — poll attestation status
 *
 * @param {string} attestationId — the attestation reference ID
 * @returns {Promise<{ status: string, attestation_data?: Object }>}
 *   status: 'pending' | 'confirmed' | 'failed'
 */
export async function getAttestationStatus(attestationId) {
  const url = `${XRESERVE_API_URL}/attestations/${attestationId}`;
  const resp = await fetch(url, {
    method: 'GET',
    headers: _headers(),
  });

  if (!resp.ok) {
    const body = await resp.text();
    throw new Error(`xReserve attestation status failed (${resp.status}): ${body.substring(0, 200)}`);
  }

  const data = await resp.json();
  return {
    status: data.status || 'pending',
    attestation_data: data,
  };
}

/**
 * POST /v1/attestations/{attestationRef}/release — request destination release
 *
 * @param {Object} params
 * @param {string} params.attestation_id
 * @param {string} params.recipient_btc   — BTC address for release
 * @param {number} params.amount_sats
 * @param {string} params.idempotencyKey
 * @returns {Promise<{ release_id: string, status: string }>}
 */
export async function releaseDestination({ attestation_id, recipient_btc, amount_sats, idempotencyKey }) {
  const url = `${XRESERVE_API_URL}/attestations/${attestation_id}/release`;
  const resp = await fetch(url, {
    method: 'POST',
    headers: _headers({ 'X-Idempotency-Key': idempotencyKey || '' }),
    body: JSON.stringify({
      recipientBtc: recipient_btc,
      amount: String(amount_sats),
    }),
  });

  if (!resp.ok) {
    const body = await resp.text();
    throw new Error(`xReserve release request failed (${resp.status}): ${body.substring(0, 200)}`);
  }

  const data = await resp.json();
  return {
    release_id: data.releaseId || data.release_id,
    status: data.status || 'pending',
  };
}

/**
 * GET /v1/releases/{releaseId} — poll destination release status
 *
 * @param {string} releaseId
 * @returns {Promise<{ status: string, release_data?: Object }>}
 *   status: 'pending' | 'confirmed' | 'failed'
 */
export async function getReleaseStatus(releaseId) {
  const url = `${XRESERVE_API_URL}/releases/${releaseId}`;
  const resp = await fetch(url, {
    method: 'GET',
    headers: _headers(),
  });

  if (!resp.ok) {
    const body = await resp.text();
    throw new Error(`xReserve release status failed (${resp.status}): ${body.substring(0, 200)}`);
  }

  const data = await resp.json();
  return {
    status: data.status || 'pending',
    release_data: data,
  };
}

/**
 * Health check — verify xReserve API is reachable
 * @returns {Promise<{ healthy: boolean, latencyMs?: number, error?: string }>}
 */
export async function healthCheck() {
  const start = Date.now();
  try {
    const resp = await fetch(`${XRESERVE_API_URL}/health`, {
      method: 'GET',
      headers: _headers(),
      signal: AbortSignal.timeout(5000),
    });
    return { healthy: resp.ok, latencyMs: Date.now() - start };
  } catch (err) {
    return { healthy: false, latencyMs: Date.now() - start, error: err.message };
  }
}

export default {
  requestAttestation,
  getAttestationStatus,
  releaseDestination,
  getReleaseStatus,
  healthCheck,
};
