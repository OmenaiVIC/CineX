/**
 * sponsorService.js — CineX Fee Sponsorship Policy Engine
 *
 * PRD Reviewer Addendum: "fee sponsorship / relayer policy for first-use transactions"
 *
 * Determines whether a passkey relay transfer is sponsored by CineX
 * or rejected (user must fund their own gas). Every decision is logged
 * to relay_transfers for audit.
 *
 * Sponsorship policy:
 *   - stx-transfer: CineX pays (gasless UX for passkey users)
 *   - onboard: CineX pays (first-use CAC)
 *   - recovery: CineX pays (support-initiated)
 *   - Amount must be <= max_single_transfer_stx
 *   - User daily quota must not be exceeded
 *   - Relay wallet balance must be above safety threshold
 *   - Circuit breaker must be off
 */

import { getDb } from '../database.js';
import { HIRO_API_URL } from '../config/chain.js';

// ---------------------------------------------------------------------------
// Config cache (loaded from relay_config table, refreshed every 60s)
// ---------------------------------------------------------------------------
let _configCache = null;
let _configLoadedAt = 0;
const CONFIG_TTL_MS = 60000;

async function loadConfig(db) {
  const now = Date.now();
  if (_configCache && (now - _configLoadedAt) < CONFIG_TTL_MS) return _configCache;
  const rows = await db.all('SELECT key, value FROM relay_config');
  _configCache = {};
  for (const row of rows) _configCache[row.key] = row.value;
  _configLoadedAt = now;
  return _configCache;
}

/**
 * Clear config cache (for testing only).
 */
export function clearConfigCache() {
  _configCache = null;
  _configLoadedAt = 0;
}

// ---------------------------------------------------------------------------
// Core sponsorship check
// ---------------------------------------------------------------------------

/**
 * Check whether a relay transfer should be sponsored.
 *
 * @param {Object} params
 * @param {string} params.userAddress - The passkey user's Stacks address
 * @param {string} params.actionType - 'stx-transfer' | 'onboard' | 'recovery'
 * @param {number} params.amountMicrostx - Amount in micro-STX
 * @param {string} [params.idempotencyKey] - Client-provided idempotency key
 * @param {string} [params.requestIp] - Request origin IP
 * @param {string} [params.userAgent] - Request user-agent
 * @returns {Promise<{decision: string, reason: string|null, transferId: string|null}>}
 */
export async function checkSponsorship({
  userAddress, actionType, amountMicrostx,
  idempotencyKey, requestIp, userAgent,
}) {
  const db = await getDb();
  try {
    // 1. Idempotency check
    if (idempotencyKey) {
      const existing = await db.get(
        'SELECT id, status, tx_hash, rejection_reason FROM relay_transfers WHERE idempotency_key = $1',
        [idempotencyKey]
      );
      if (existing) {
        return {
          decision: existing.status === 'confirmed' ? 'sponsored' : 'rejected',
          reason: existing.rejection_reason || 'idempotency_collision',
          transferId: existing.id,
          txHash: existing.tx_hash,
          cached: true,
        };
      }
    }

    const config = await loadConfig(db);
    const reasons = [];

    // 2. Circuit breaker
    if (config.circuit_breaker === 'true') {
      reasons.push('circuit_breaker');
    }

    // 3. Action type check
    const sponsorableActions = (config.sponsorable_actions || 'stx-transfer,onboard,recovery').split(',');
    if (!sponsorableActions.includes(actionType)) {
      reasons.push('action_not_sponsored');
    }

    // 4. Amount limit
    const maxSingle = parseFloat(config.max_single_transfer_stx || '10') * 1e6;
    if (amountMicrostx > maxSingle) {
      reasons.push('amount_too_high');
    }

    // 5. Daily quota check
    const dailyCap = parseInt(config.daily_cap || '20', 10);
    const today = new Date().toISOString().slice(0, 10);
    const quota = await db.get(
      'SELECT transfer_count FROM relay_quotas WHERE user_address = $1 AND transfer_date = $2',
      [userAddress, today]
    );
    const currentCount = quota ? quota.transfer_count : 0;
    if (currentCount >= dailyCap) {
      reasons.push('quota_exceeded');
    }

    // 6. Relay wallet balance check
    const minBalance = parseFloat(config.min_balance_stx || '50') * 1e6;
    const relayAddress = process.env.RELAY_ADDRESS || '';
    if (relayAddress) {
      try {
        const resp = await fetch(`${HIRO_API_URL}/v2/accounts/${relayAddress}?proof=0`);
        const acct = await resp.json();
        const balance = Number(BigInt(acct.balance));
        if (balance < minBalance) {
          reasons.push('balance_low');
        }
      } catch {
        // If we can't check balance, don't block — but log warning
        console.warn('[sponsorService] Could not check relay wallet balance');
      }
    }

    // Decision
    const decision = reasons.length === 0 ? 'sponsored' : 'rejected';
    const reason = reasons.length > 0 ? reasons[0] : null;

    // Log to relay_transfers
    const insertResult = await db.run(
      `INSERT INTO relay_transfers
        (user_address, vault_address, recipient, amount_microstx, auth_id,
         status, rejection_reason, sponsorship_decision, idempotency_key,
         request_ip, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING id`,
      [
        userAddress,
        '', // vault_address set later by passkeyService
        '', // recipient set later
        amountMicrostx,
        0,  // auth_id set later
        decision === 'sponsored' ? 'sponsored' : 'rejected',
        reason,
        decision,
        idempotencyKey || null,
        requestIp || null,
        userAgent || null,
      ]
    );
    const transferId = insertResult.rows?.[0]?.id || null;

    return { decision, reason, transferId };
  } finally {
    db.release();
  }
}

// ---------------------------------------------------------------------------
// Quota tracking
// ---------------------------------------------------------------------------

/**
 * Increment the daily transfer count for a user after successful broadcast.
 */
export async function recordTransfer({ userAddress, amountMicrostx, gasCostStx, txHash, transferId }) {
  const db = await getDb();
  try {
    const today = new Date().toISOString().slice(0, 10);

    // Upsert daily quota
    await db.run(
      `INSERT INTO relay_quotas (user_address, transfer_date, transfer_count, total_gas_stx, total_amount_stx)
       VALUES ($1, $2, 1, $3, $4)
       ON CONFLICT (user_address, transfer_date) DO UPDATE SET
         transfer_count = relay_quotas.transfer_count + 1,
         total_gas_stx = relay_quotas.total_gas_stx + $3,
         total_amount_stx = relay_quotas.total_amount_stx + $4`,
      [userAddress, today, gasCostStx || 0, amountMicrostx || 0]
    );

    // Update relay_transfers record
    if (transferId) {
      await db.run(
        `UPDATE relay_transfers SET
           status = 'broadcast',
           tx_hash = $1,
           gas_cost_stx = $2
         WHERE id = $3`,
        [txHash, gasCostStx || 0, transferId]
      );
    }
  } finally {
    db.release();
  }
}

/**
 * Mark a transfer as confirmed.
 */
export async function confirmTransfer({ transferId, txHash }) {
  const db = await getDb();
  try {
    await db.run(
      `UPDATE relay_transfers SET status = 'confirmed', tx_hash = $1, completed_at = NOW() WHERE id = $2`,
      [txHash, transferId]
    );
  } finally {
    db.release();
  }
}

/**
 * Mark a transfer as failed.
 */
export async function failTransfer({ transferId, reason }) {
  const db = await getDb();
  try {
    await db.run(
      `UPDATE relay_transfers SET status = 'failed', rejection_reason = $1, completed_at = NOW() WHERE id = $2`,
      [reason, transferId]
    );
  } finally {
    db.release();
  }
}

// ---------------------------------------------------------------------------
// Admin: config management
// ---------------------------------------------------------------------------

/**
 * Get all relay config values.
 */
export async function getConfig() {
  const db = await getDb();
  try {
    const rows = await db.all('SELECT key, value, description, updated_at FROM relay_config ORDER BY key');
    return rows;
  } finally {
    db.release();
  }
}

/**
 * Update a relay config value.
 */
export async function setConfig(key, value) {
  const db = await getDb();
  try {
    await db.run(
      `UPDATE relay_config SET value = $1, updated_at = NOW() WHERE key = $2`,
      [value, key]
    );
    _configCache = null; // invalidate cache
  } finally {
    db.release();
  }
}

/**
 * Get quota status for a user.
 */
export async function getUserQuota(userAddress) {
  const db = await getDb();
  try {
    const today = new Date().toISOString().slice(0, 10);
    const config = await loadConfig(db);
    const quota = await db.get(
      'SELECT transfer_count, total_gas_stx, total_amount_stx FROM relay_quotas WHERE user_address = $1 AND transfer_date = $2',
      [userAddress, today]
    );
    return {
      userAddress,
      date: today,
      used: quota ? quota.transfer_count : 0,
      limit: parseInt(config.daily_cap || '20', 10),
      remaining: Math.max(0, (parseInt(config.daily_cap || '20', 10)) - (quota ? quota.transfer_count : 0)),
      totalGasStx: quota ? parseFloat(quota.total_gas_stx) : 0,
      totalAmountStx: quota ? parseInt(quota.total_amount_stx) : 0,
    };
  } finally {
    db.release();
  }
}
