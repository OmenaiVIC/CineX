/**
 * BOS Yellow Card Bridge Adapter — REST client for Yellow Card NGN payout API
 *
 * Implements the adapter interface consumed by transitionGuards.js and transitionActions.js.
 *
 * EXTERNAL ASSUMPTIONS (locked in xreserve-integration-surface-lock.md §6.3):
 *   Q3: Exact Yellow Card API endpoints, auth mechanism, response shapes — to be verified.
 *   Yellow Card provides REST API for NGN bank transfers with sandbox and production environments.
 *
 * Endpoints below match the surface lock §6.3 placeholder contract.
 * Real endpoints drop in when Yellow Card docs are available.
 */

const YELLOW_CARD_API_URL = process.env.YELLOW_CARD_API_URL || 'https://api.yellowcard.io/v1';
const YELLOW_CARD_API_KEY = process.env.YELLOW_CARD_API_KEY || '';

/**
 * Build common fetch options for Yellow Card API calls
 */
function _headers(extra = {}) {
  return {
    'Content-Type': 'application/json',
    ...(YELLOW_CARD_API_KEY ? { 'Authorization': `Bearer ${YELLOW_CARD_API_KEY}` } : {}),
    ...extra,
  };
}

/**
 * POST /v1/payments — initiate NGN payout
 *
 * @param {Object} params
 * @param {string} params.idempotency_key   — unique key to prevent duplicate payouts
 * @param {number|string} params.amount     — amount in NGN kobo (or smallest unit)
 * @param {string} params.recipient_type    — 'bank_account' | 'mobile_money'
 * @param {Object} params.recipient         — recipient details (bankCode, accountNumber, etc.)
 * @param {string} params.currency          — 'NGN'
 * @param {string} [params.callback_url]    — webhook URL for status updates
 * @returns {Promise<{ payout_id: string, status: string }>}
 */
export async function initiatePayout({ idempotency_key, amount, recipient_type, recipient, currency, callback_url }) {
  const url = `${YELLOW_CARD_API_URL}/payments`;
  const resp = await fetch(url, {
    method: 'POST',
    headers: _headers({ 'X-Idempotency-Key': idempotency_key || '' }),
    body: JSON.stringify({
      amount: String(amount),
      currency: currency || 'NGN',
      recipientType: recipient_type || 'bank_account',
      recipient: recipient || {},
      callbackUrl: callback_url || '',
    }),
  });

  if (!resp.ok) {
    const body = await resp.text();
    throw new Error(`Yellow Card payout failed (${resp.status}): ${body.substring(0, 200)}`);
  }

  const data = await resp.json();
  return {
    payout_id: data.paymentId || data.payout_id || data.id,
    status: data.status || 'pending',
  };
}

/**
 * GET /v1/payments/{paymentId} — poll payout status
 *
 * @param {string} payoutId — Yellow Card payment ID
 * @returns {Promise<{ status: string, payout_data?: Object }>}
 *   status: 'pending' | 'completed' | 'failed'
 */
export async function getPayoutStatus(payoutId) {
  const url = `${YELLOW_CARD_API_URL}/payments/${payoutId}`;
  const resp = await fetch(url, {
    method: 'GET',
    headers: _headers(),
  });

  if (!resp.ok) {
    const body = await resp.text();
    throw new Error(`Yellow Card status query failed (${resp.status}): ${body.substring(0, 200)}`);
  }

  const data = await resp.json();
  // Normalize status: Yellow Card may use 'successful' instead of 'completed'
  let status = data.status || 'pending';
  if (status === 'successful') status = 'completed';

  return {
    status,
    payout_data: data,
  };
}

/**
 * Health check — verify Yellow Card API is reachable
 * @returns {Promise<{ healthy: boolean, latencyMs?: number, error?: string }>}
 */
export async function healthCheck() {
  const start = Date.now();
  try {
    const resp = await fetch(`${YELLOW_CARD_API_URL}/health`, {
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
  initiatePayout,
  getPayoutStatus,
  healthCheck,
};
