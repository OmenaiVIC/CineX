/**
 * BOS Yellow Card Bridge Adapter — REST client for Yellow Card NGN payout API
 *
 * Implements the adapter interface consumed by transitionGuards.js and transitionActions.js.
 *
 * Auth: YcHmacV1 scheme — HMAC-SHA256 signature over (timestamp + apiKey + bodyHash)
 *       using YELLOW_CARD_SECRET_KEY. Not Bearer tokens.
 *
 * Endpoints: Base URL is /business (NOT /v1).
 *   Sandbox: https://sandbox-api.yellowcard.io/business
 *   Production: https://api.yellowcard.io/business
 */

const YELLOW_CARD_API_URL = process.env.YELLOW_CARD_API_URL || 'https://api.yellowcard.io/business';
const YELLOW_CARD_API_KEY = process.env.YELLOW_CARD_API_KEY || '';
const YELLOW_CARD_SECRET_KEY = process.env.YELLOW_CARD_SECRET_KEY || '';
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
 * Compute YcHmacV1 signature for Yellow Card API request.
 *
 * Signature = HMAC-SHA256(secret, timestamp + apiKey + bodyHash)
 * bodyHash  = SHA-256 hex of request body (empty string for GET/DELETE)
 * timestamp = ISO-8601 UTC, e.g. "2026-07-23T12:00:00Z"
 *
 * @param {string} method — HTTP method
 * @param {string|null} body — raw JSON body string (null for GET)
 * @param {string} secret — YELLOW_CARD_SECRET_KEY
 * @param {string} apiKey — YELLOW_CARD_API_KEY
 * @returns {{ authorization: string, timestamp: string }}
 */
function _computeAuth(method, body, secret = YELLOW_CARD_SECRET_KEY, apiKey = YELLOW_CARD_API_KEY) {
  if (!secret || !apiKey) {
    return { authorization: '', timestamp: '' };
  }
  const crypto = require('crypto');
  const timestamp = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
  const bodyHash = (body && method !== 'GET' && method !== 'DELETE')
    ? crypto.createHash('sha256').update(body).digest('hex')
    : '';
  const message = timestamp + apiKey + bodyHash;
  const signature = crypto.createHmac('sha256', secret).update(message).digest('hex');
  const authValue = `YcHmacV1 ${JSON.stringify({ timestamp, apiKey, bodyHash, signature })}`;
  return { authorization: authValue, timestamp };
}

/**
 * Build common fetch options for Yellow Card API calls
 */
function _headers(method, body, extra = {}) {
  const { authorization } = _computeAuth(method, body);
  return {
    'Content-Type': 'application/json',
    ...(authorization ? { 'Authorization': authorization } : {}),
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
 * POST /business/payments — initiate NGN payout
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
  const body = JSON.stringify({
    amount: String(amount),
    currency: currency || 'NGN',
    recipientType: recipient_type || 'bank_account',
    recipient: recipient || {},
    callbackUrl: callback_url || '',
  });
  const url = `${YELLOW_CARD_API_URL}/payments`;
  const resp = await _fetch(url, {
    method: 'POST',
    headers: _headers('POST', body, { 'X-Idempotency-Key': idempotency_key || '' }),
    body,
  });

  if (!resp.ok) {
    const text = await resp.text();
    const err = new Error(`Yellow Card payout failed (${resp.status}): ${text.substring(0, 200)}`);
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
 * GET /business/payments/{paymentId} — poll payout status
 *
 * @param {string} payoutId — Yellow Card payment ID
 * @returns {Promise<{ status: string, payout_data?: Object }>}
 *   status: 'pending' | 'completed' | 'failed'
 */
export async function getPayoutStatus(payoutId) {
  const url = `${YELLOW_CARD_API_URL}/payments/${payoutId}`;
  const resp = await _fetch(url, {
    method: 'GET',
    headers: _headers('GET', null),
  });

  if (!resp.ok) {
    const text = await resp.text();
    const err = new Error(`Yellow Card status query failed (${resp.status}): ${text.substring(0, 200)}`);
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
      headers: _headers('GET', null),
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
