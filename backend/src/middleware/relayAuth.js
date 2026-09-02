/**
 * relayAuth.js — Authentication + Rate Limiting for Passkey Relay Endpoints
 *
 * Layer 1 of the 3-layer relay architecture:
 *   1. relayAuth (this file) — auth, rate limiting, idempotency key validation
 *   2. sponsorService — sponsorship policy engine
 *   3. passkeyService — relay executor
 *
 * This middleware:
 *   - Validates session token or API key
 *   - Applies per-user hourly rate limiting (in-memory + DB)
 *   - Validates idempotency key format
 *   - Attaches relay metadata to req for downstream layers
 */

import { getDb } from '../database.js';

// ---------------------------------------------------------------------------
// In-memory rate limiter (fast path, 1-hour sliding window)
// ---------------------------------------------------------------------------
const rateLimitMap = new Map();

// Cleanup stale entries every 10 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitMap) {
    if (now > entry.resetAt) rateLimitMap.delete(key);
  }
}, 600000);

/**
 * Check hourly rate limit for a user.
 * Returns { allowed, remaining, retryAfter? }
 */
function checkHourlyRateLimit(address, limit = 10) {
  const now = Date.now();
  const windowMs = 3600000;
  const entry = rateLimitMap.get(address);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(address, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1 };
  }

  if (entry.count >= limit) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
    return { allowed: false, remaining: 0, retryAfter };
  }

  entry.count++;
  return { allowed: true, remaining: limit - entry.count };
}

// ---------------------------------------------------------------------------
// Auth validation
// ---------------------------------------------------------------------------

/**
 * Validate that the request has a valid session, API key, or relay address.
 *
 * Session-based auth: req.user.address must be set by upstream auth middleware.
 * API key auth: X-Relay-API-Key header matches RELAY_API_KEY env var.
 * Relay address auth: X-Relay-User-Address header carries a valid Stacks principal.
 *
 * For the passkey relay we accept:
 *   1. A valid session (user is authenticated via passkey)
 *   2. A valid relay API key (for trusted server-to-server calls)
 *   3. A self-asserted X-Relay-User-Address (browser passkey flow)
 *
 * Security note: the shared API key was historically hardcoded in the public
 * frontend bundles (cinex-canvas + app), which made it effectively public.
 * The real spend-authorization for these endpoints is enforced ON-CHAIN by the
 * vault contract, not this key:
 *   - stx-transfer requires a P-256 signature matching the vault owner-pubkey.
 *   - propose-recovery / execute-recovery are restricted to the contract's
 *     `admin` principal and the relay always signs with its own fixed key.
 * The API-key path is retained here only for trusted server-to-server callers
 * and is optional; the passkey relay is authenticated by the signed payload it
 * carries, so the address header is a binding facilitator for rate limiting and
 * domain-wallet, not a standing spend credential on its own.
 */
function isValidStacksPrincipal(value) {
  // c32-checked testnet/mainnet Stacks address (e.g. ST... / SP...), 39-41 chars.
  // c32 alphabet = 0-9 + A-Z excluding I, L, O, U.
  return typeof value === 'string' && /^(ST|SP)[0-9A-HJKMNP-TV-Z]{38,40}$/.test(value);
}

function validateAuth(req) {
  // Option 1: Session-based (user authenticated via passkey)
  if (req.user && req.user.address) {
    return { valid: true, address: req.user.address, authMethod: 'session' };
  }

  // Option 2: API key (trusted server-to-server)
  const apiKey = req.headers['x-relay-api-key'];
  const expectedKey = process.env.RELAY_API_KEY;
  if (apiKey && expectedKey && apiKey === expectedKey) {
    // API key calls must include X-Relay-User-Address header
    const userAddress = req.headers['x-relay-user-address'];
    if (!userAddress) {
      return { valid: false, reason: 'API key requires X-Relay-User-Address header' };
    }
    return { valid: true, address: userAddress, authMethod: 'api_key' };
  }

  // Option 3: Relay address (browser passkey flow, no shared secret)
  const relayAddress = req.headers['x-relay-user-address'];
  if (relayAddress && isValidStacksPrincipal(relayAddress)) {
    return { valid: true, address: relayAddress, authMethod: 'relay' };
  }

  return { valid: false, reason: 'Authentication required. Provide a session token, X-Relay-API-Key header, or X-Relay-User-Address header.' };
}

// ---------------------------------------------------------------------------
// Idempotency key validation
// ---------------------------------------------------------------------------

function validateIdempotencyKey(key) {
  if (!key) return { valid: true }; // optional
  // Must be UUID format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
  if (!uuidRegex.test(key)) {
    return { valid: false, reason: 'Idempotency-Key must be a valid UUID' };
  }
  return { valid: true };
}

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------

/**
 * Express middleware for relay endpoint authentication and rate limiting.
 *
 * Attaches to req:
 *   req.relayUserAddress - authenticated user's Stacks address
 *   req.relayAuthMethod - 'session' or 'api_key'
 *   req.relayIdempotencyKey - validated idempotency key (or null)
 *   req.relayRateLimit - rate limit result { remaining, retryAfter? }
 */
export function relayAuthMiddleware(options = {}) {
  const rateLimit = options.rateLimit || 10;

  return async (req, res, next) => {
    try {
      // 1. Authenticate
      const auth = validateAuth(req);
      if (!auth.valid) {
        return res.status(401).json({ error: auth.reason });
      }

      // 2. Rate limit
      const rateResult = checkHourlyRateLimit(auth.address, rateLimit);
      if (!rateResult.allowed) {
        return res.status(429).json({
          error: 'Rate limit exceeded. Try again later.',
          retryAfter: rateResult.retryAfter,
          remaining: 0,
        });
      }

      // 3. Validate idempotency key (if provided)
      const idempotencyKey = req.headers['x-idempotency-key'] || null;
      if (idempotencyKey) {
        const idResult = validateIdempotencyKey(idempotencyKey);
        if (!idResult.valid) {
          return res.status(400).json({ error: idResult.reason });
        }
      }

      // 4. Attach metadata for downstream
      req.relayUserAddress = auth.address;
      req.relayAuthMethod = auth.authMethod;
      req.relayIdempotencyKey = idempotencyKey;
      req.relayRateLimit = { remaining: rateResult.remaining };

      // Set rate limit headers
      res.set('X-RateLimit-Remaining', String(rateResult.remaining));

      next();
    } catch (err) {
      console.error('[relayAuth] Middleware error:', err.message);
      next(err);
    }
  };
}

export { checkHourlyRateLimit, validateAuth, validateIdempotencyKey };
