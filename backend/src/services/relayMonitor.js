/**
 * relayMonitor.js — Relay Wallet Balance Monitoring + Alerting
 *
 * Monitors the passkey relay wallet STX balance and triggers alerts
 * when balance drops below configured thresholds.
 *
 * Alert severity levels:
 *   - warning: balance < min_balance_stx (default 50 STX)
 *   - critical: balance < critical_balance_stx (default 10 STX)
 *
 * Also monitors:
 *   - Hourly sponsorship volume vs quota cap
 *   - Transfer failure rate
 *   - Circuit breaker status
 */

import { getDb } from '../database.js';

const HIRO_API = 'https://api.testnet.hiro.so';

// ---------------------------------------------------------------------------
// Balance check
// ---------------------------------------------------------------------------

/**
 * Get the current STX balance of the relay wallet.
 * @returns {Promise<{balance: number, balanceStx: number, address: string}>}
 */
export async function getRelayBalance() {
  const address = process.env.RELAY_ADDRESS;
  if (!address) throw new Error('RELAY_ADDRESS env var not set');

  const resp = await fetch(`${HIRO_API}/v2/accounts/${address}?proof=0`);
  if (!resp.ok) throw new Error(`Hiro API ${resp.status}`);
  const data = await resp.json();
  const balance = Number(BigInt(data.balance));
  return { balance, balanceStx: balance / 1e6, address };
}

/**
 * Check relay wallet balance against thresholds.
 * @returns {Promise<{status: string, balance: number, balanceStx: number, alerts: Array}>}
 */
export async function checkRelayBalance() {
  const { balance, balanceStx, address } = await getRelayBalance();
  const db = await getDb();
  try {
    const configRows = await db.all('SELECT key, value FROM relay_config');
    const config = {};
    for (const row of configRows) config[row.key] = row.value;

    const minBalance = parseFloat(config.min_balance_stx || '50') * 1e6;
    const criticalBalance = parseFloat(config.critical_balance_stx || '10') * 1e6;
    const circuitBreaker = config.circuit_breaker === 'true';

    const alerts = [];

    if (circuitBreaker) {
      alerts.push({
        severity: 'critical',
        type: 'circuit_breaker_active',
        message: 'Circuit breaker is active. All sponsored transfers are halted.',
      });
    }

    if (balance < criticalBalance) {
      alerts.push({
        severity: 'critical',
        type: 'relay_balance_critical',
        message: `Relay wallet balance is critically low: ${balanceStx.toFixed(4)} STX (threshold: ${criticalBalance / 1e6} STX)`,
      });
    } else if (balance < minBalance) {
      alerts.push({
        severity: 'warning',
        type: 'relay_balance_low',
        message: `Relay wallet balance is low: ${balanceStx.toFixed(4)} STX (minimum: ${minBalance / 1e6} STX)`,
      });
    }

    // Check hourly volume
    const hourlyLimit = parseInt(config.hourly_rate_limit || '10', 10);
    const recentCount = await db.get(
      `SELECT COUNT(*) as cnt FROM relay_transfers
       WHERE status IN ('broadcast', 'confirmed')
         AND created_at > NOW() - INTERVAL '1 hour'`
    );
    const hourlyUsed = recentCount ? parseInt(recentCount.cnt) : 0;
    if (hourlyUsed >= hourlyLimit * 0.8) {
      alerts.push({
        severity: 'warning',
        type: 'high_hourly_volume',
        message: `Hourly relay volume at ${hourlyUsed}/${hourlyLimit} (${Math.round(hourlyUsed / hourlyLimit * 100)}%)`,
      });
    }

    // Check failure rate (last hour)
    const failCount = await db.get(
      `SELECT COUNT(*) as cnt FROM relay_transfers
       WHERE status = 'failed' AND created_at > NOW() - INTERVAL '1 hour'`
    );
    const totalRecent = await db.get(
      `SELECT COUNT(*) as cnt FROM relay_transfers
       WHERE created_at > NOW() - INTERVAL '1 hour'`
    );
    const failures = failCount ? parseInt(failCount.cnt) : 0;
    const total = totalRecent ? parseInt(totalRecent.cnt) : 1;
    if (failures / total > 0.05 && total >= 5) {
      alerts.push({
        severity: 'warning',
        type: 'high_failure_rate',
        message: `Transfer failure rate: ${failures}/${total} (${Math.round(failures / total * 100)}%) in the last hour`,
      });
    }

    let status = 'healthy';
    if (alerts.some(a => a.severity === 'critical')) status = 'critical';
    else if (alerts.some(a => a.severity === 'warning')) status = 'degraded';

    return { status, balance, balanceStx, address, alerts };
  } finally {
    db.release();
  }
}

// ---------------------------------------------------------------------------
// Alert persistence
// ---------------------------------------------------------------------------

/**
 * Persist an alert to the bos_alerts table (from 007_bos_monitoring.sql).
 */
export async function persistAlert({ alertKey, alertType, severity, details }) {
  const db = await getDb();
  try {
    // Check if unacknowledged alert with same key already exists
    const existing = await db.get(
      `SELECT id FROM bos_alerts WHERE alert_key = $1 AND acknowledged = false`,
      [alertKey]
    );
    if (existing) return; // dedup — don't spam

    await db.run(
      `INSERT INTO bos_alerts (alert_key, alert_type, severity, details)
       VALUES ($1, $2, $3, $4)`,
      [alertKey, alertType, severity, JSON.stringify(details)]
    );
  } finally {
    db.release();
  }
}

// ---------------------------------------------------------------------------
// Periodic monitoring (call from cron or setInterval)
// ---------------------------------------------------------------------------

/**
 * Run a full relay health check. Designed to be called every 5 minutes.
 * Checks balance, volume, failure rate, and persists alerts.
 */
export async function runHealthCheck() {
  console.log('[relayMonitor] Running health check...');
  try {
    const result = await checkRelayBalance();
    for (const alert of result.alerts) {
      await persistAlert({
        alertKey: `relay_${alert.type}`,
        alertType: alert.type,
        severity: alert.severity,
        details: { message: alert.message, balance: result.balanceStx, address: result.address },
      });
    }
    if (result.alerts.length === 0) {
      console.log(`[relayMonitor] Healthy — ${result.balanceStx.toFixed(4)} STX`);
    } else {
      for (const alert of result.alerts) {
        console.warn(`[relayMonitor] [${alert.severity.toUpperCase()}] ${alert.message}`);
      }
    }
    return result;
  } catch (err) {
    console.error('[relayMonitor] Health check failed:', err.message);
    return { status: 'error', alerts: [{ severity: 'critical', type: 'monitor_failure', message: err.message }] };
  }
}

/**
 * Start periodic monitoring. Call once at server startup.
 */
export function startMonitoring(intervalMs = 300000) {
  // Run immediately, then on interval
  runHealthCheck();
  const timer = setInterval(runHealthCheck, intervalMs);
  return () => clearInterval(timer);
}
