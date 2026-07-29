import { getThresholds } from './thresholdConfig.js';
import { createAlertDeduplicator } from './alertDeduplicator.js';
import { createNotifier } from './notifier.js';

const ACTIVE_STATES = ['burn_submitted', 'burn_confirmed', 'attestation_requested', 'attestation_confirmed',
  'destination_release_submitted', 'destination_release_confirmed',
  'yellowcard_payout_submitted', 'yellowcard_payout_confirmed'];

export function createMonitorJob(ctx) {
  const { db, logger, config, adapters } = ctx;
  const thresholds = getThresholds(config);
  const dedup = createAlertDeduplicator(ctx);
  const notifier = createNotifier(ctx, { minSeverity: 'warn' });

  let intervalId = null;
  let running = false;
  let checkCount = 0;

  async function checkBurnConfirmations() {
    const rows = await db.query(
      `SELECT id, external_tx_id FROM disbursements
       WHERE status = 'burn_submitted'
         AND external_tx_id IS NOT NULL
         AND updated_at < NOW() - interval '10 minutes'`
    );
    const disbursements = rows.rows || [];

    for (const d of disbursements) {
      try {
        const status = await adapters.stacks.getTransactionStatus(d.external_tx_id);
        if (status?.status === 'success' && (status.confirmations || 0) >= thresholds.burnConfirmations.min) {
          notifier.notify({
            type: 'burn_confirmed',
            severity: 'info',
            message: `Burn confirmed for disbursement ${d.id}`,
            metadata: { txid: d.external_tx_id, confirmations: status.confirmations },
          });
        }
      } catch (err) {
        logger.warn(`[bos:monitor] Burn check error ${d.id}: ${err.message}`);
      }
    }
  }

  async function checkWebhookTimeouts() {
    const rows = await db.query(
      `SELECT id, status, updated_at FROM disbursements
       WHERE status = ANY($1::text[])
         AND manual_review_at IS NULL
         AND updated_at < NOW() - ($2 || ' minutes')::interval`,
      [ACTIVE_STATES, thresholds.stuckTime.maxMinutes]
    );
    const disbursements = rows.rows || [];

    for (const d of disbursements) {
      const minutesStuck = Math.round(
        (Date.now() - new Date(d.updated_at).getTime()) / 60000
      );

      dedup.shouldSend({
        type: 'stuck_disbursement',
        severity: 'warn',
        message: `Disbursement ${d.id} stuck in ${d.status} for ${minutesStuck}m`,
      });

      notifier.notify({
        type: 'stuck_disbursement',
        severity: 'warn',
        message: `Disbursement ${d.id} stuck in ${d.status}`,
        metadata: { disbursementId: d.id, status: d.status, minutesStuck },
      });
    }
  }

  async function checkBalance() {
    try {
      const addr = config.relayAddress;
      if (!addr) return;

      const balance = await adapters.stacks.getStxBalance?.(addr);
      if (balance && balance < thresholds.balance.minStx) {
        notifier.notify({
          type: 'low_balance',
          severity: 'warn',
          message: `Relay wallet balance low: ${balance / 1_000_000} STX`,
          metadata: { address: addr, balanceStx: balance },
        });
      }
    } catch (err) {
      logger.warn(`[bos:monitor] Balance check error: ${err.message}`);
    }
  }

  async function checkFailureRate() {
    const rows = await db.query(
      `SELECT status, COUNT(*)::int AS count FROM disbursements
       WHERE updated_at > NOW() - interval '24 hours'
       GROUP BY status`
    );
    const stats = rows.rows || [];
    const total = stats.reduce((s, r) => s + r.count, 0);
    if (total === 0) return;

    const failed = stats.find(r => r.status === 'failed');
    const failedCount = failed?.count || 0;
    const rate = (failedCount / total) * 100;

    if (rate > thresholds.failureRate.maxPercent) {
      notifier.notify({
        type: 'high_failure_rate',
        severity: 'error',
        message: `Failure rate ${rate.toFixed(1)}% exceeds ${thresholds.failureRate.maxPercent}% threshold`,
        metadata: { rate, threshold: thresholds.failureRate.maxPercent, total, failed: failedCount },
      });
    }
  }

  async function checkOnce() {
    if (running) return { skipped: true };
    running = true;
    try {
      await Promise.allSettled([
        checkBurnConfirmations(),
        checkWebhookTimeouts(),
        checkBalance(),
        checkFailureRate(),
      ]);
      checkCount++;
      return { ok: true };
    } finally {
      running = false;
    }
  }

  function start() {
    if (intervalId) return;
    const interval = config.monitorIntervalMs || 300_000;
    logger.info(`[bos:monitor] Starting — interval ${interval}ms`);
    checkOnce().catch(() => {});
    intervalId = setInterval(() => checkOnce().catch(() => {}), interval);
  }

  function stop() {
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
      logger.info('[bos:monitor] Stopped');
    }
  }

  function getStats() {
    return { running, checkCount };
  }

  return { start, stop, checkOnce, getStats };
}
