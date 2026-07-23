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
const YELLOW_CARD_ENV = process.env.YELLOW_CARD_ENV || 'production'; // 'sandbox' | 'production'
const YELLOW_CARD_WEBHOOK_SECRET = process.env.YELLOW_CARD_WEBHOOK_SECRET || '';

/**
 * Error taxonomy for Yellow Card API errors.
 * transient: network timeout, 5xx, rate limit — safe to retry
 * permanent: 4xx (except 429), invalid request — do NOT retry
 * unknown: unexpected error shape
 */
export function classifyError(error) {
  if (error && error.name === 'AbortError') return 'transient';
  if (error && error.name === 'TypeError' && error.message?.includes('fetch')) return 'transient';
  const status = error?.status || error?.statusCode;
  if (status) {
    if (status === 429) return 'transient';
    if (status >= 500) return 'transient';
    if (status >= 400 && status < 500) return 'permanent';
  }
  return 'unknown';
}

/**
 * Build common fetch options for Yellow Card API calls
 */
function _headers(extra = {}) {
  return {
    'Content-Type': 'application/json',
    ...(YELLOW_CARD_API_KEY ? { 'Authorization': `Bearer ${YELLOW_CARD_API_KEY}` } : {}),
    ...(YELLOW_CARD_ENV === 'sandbox' ? { 'X-Environment': 'sandbox' } : {}),
    ...extra,
  };
}

/**
 * Execute a fetch with timeout and error classification
 */
async function _fetch(url, options = {}, { timeoutMs = 10000 } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const resp = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(timer);
    return resp;
  } catch (err) {
    clearTimeout(timer);
    const classified = classifyError(err);
    err._classification = classified;
    throw err;
  }
}

/**
 * Compute HMAC-SHA256 signature for webhook payload verification
 *
 * @param {string|Buffer} payload — raw request body
 * @param {string} secret — webhook signing secret
 * @returns {string} hex-encoded HMAC signature
 */
export function signWebhook(payload, secret = YELLOW_CARD_WEBHOOK_SECRET) {
  if (!secret) return '';
  const crypto = require('crypto');
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(typeof payload === 'string' ? payload : JSON.stringify(payload));
  return hmac.digest('hex');
}

/**
 * Verify a webhook signature against the expected HMAC
 *
 * @param {string|Buffer} payload — raw request body
 * @param {string} signature — signature from webhook header (may include 'sha256=' prefix)
 * @param {string} secret — webhook signing secret
 * @returns {boolean} true if signature is valid
 */
export function verifyWebhookSignature(payload, signature, secret = YELLOW_CARD_WEBHOOK_SECRET) {
  if (!secret || !signature) return false;
  const expected = signWebhook(payload, secret);
  const cleanSig = signature.replace('sha256=', '');
  if (typeof crypto !== 'undefined' && crypto.timingSafeEqual) {
    return crypto.timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(cleanSig, 'hex'));
  }
  return expected === cleanSig;
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
  const resp = await _fetch(url, {
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
    const err = new Error(`Yellow Card payout failed (${resp.status}): ${body.substring(0, 200)}`);
    err.status = resp.status;
    err._classification = classifyError(err);
    throw err;
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
  const resp = await _fetch(url, {
    method: 'GET',
    headers: _headers(),
  });

  if (!resp.ok) {
    const body = await resp.text();
    const err = new Error(`Yellow Card status query failed (${resp.status}): ${body.substring(0, 200)}`);
    err.status = resp.status;
    err._classification = classifyError(err);
    throw err;
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
    const resp = await _fetch(`${YELLOW_CARD_API_URL}/health`, {
      method: 'GET',
      headers: _headers(),
    }, { timeoutMs: 5000 });
    return { healthy: resp.ok, latencyMs: Date.now() - start };
  } catch (err) {
    return { healthy: false, latencyMs: Date.now() - start, error: err.message };
  }
}

export default {
  initiatePayout,
  getPayoutStatus,
  healthCheck,
  signWebhook,
  verifyWebhookSignature,
  classifyError,
};
