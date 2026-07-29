import { BOS_STATES, TERMINAL_STATES } from './types.js';

const POLL_TARGETS = {
  [BOS_STATES.BURN_SUBMITTED]: { adapter: 'stacks', method: 'getTransactionStatus', idField: 'external_tx_id' },
  [BOS_STATES.ATTESTATION_REQUESTED]: { adapter: 'xreserve', method: 'getAttestationStatus', idField: 'attestation_id' },
  [BOS_STATES.DESTINATION_RELEASE_SUBMITTED]: { adapter: 'xreserve', method: 'getReleaseStatus', idField: 'release_id' },
  [BOS_STATES.YELLOWCARD_PAYOUT_SUBMITTED]: { adapter: 'yellowcard', method: 'getPayoutStatus', idField: 'payout_id' },
};

const MAX_RETRIES = 25;

export function pollTarget(state) {
  return POLL_TARGETS[state] || null;
}

export function isEligible(disbursement) {
  if (TERMINAL_STATES.has(disbursement.status)) return false;
  if (disbursement.manual_review_at) return false;
  if ((disbursement.retry_count || 0) >= MAX_RETRIES) return false;
  return true;
}

export function mapExternalStatus(externalStatus, currentState) {
  const s = (externalStatus || '').toLowerCase();

  if (['success', 'completed', 'confirmed', 'successful'].includes(s)) {
    return { action: 'advance' };
  }

  if (['failed', 'rejected', 'expired', 'cancelled'].includes(s)) {
    return { action: 'fail', reason: `${currentState}_${s}` };
  }

  if (currentState === 'burn_submitted' && s === 'pending') {
    return { action: 'retry' };
  }

  return { action: 'retry', reason: `status_${s}` };
}

export function createFallbackPoller(ctx) {
  const { db, logger, config, adapters, pipelineWorker } = ctx;
  let intervalId = null;
  let running = false;
  let pollCount = 0;

  async function pollOnce() {
    if (running) return { skipped: true };
    running = true;

    try {
      const rows = await db.query(
        `SELECT * FROM disbursements
         WHERE status NOT IN ('settled', 'failed', 'cancelled')
           AND manual_review_at IS NULL
           AND (retry_count < $1 OR retry_count IS NULL)
         ORDER BY updated_at ASC
         LIMIT 20`,
        [MAX_RETRIES]
      );

      const disbursements = rows.rows || rows;
      const results = { polled: 0, advanced: 0, failed: 0 };

      for (const d of disbursements) {
        if (!isEligible(d)) continue;

        const target = pollTarget(d.status);
        if (!target) continue;

        const idValue = d[target.idField];
        if (!idValue) continue;

        try {
          const adapter = adapters[target.adapter];
          if (!adapter || !adapter[target.method]) continue;

          const status = await adapter[target.method](idValue);
          const mapped = mapExternalStatus(status?.status || status?.tx_status || '', d.status);

          if (mapped.action === 'advance') {
            results.polled++;
            if (pipelineWorker?.advanceDisbursement) {
              await pipelineWorker.advanceDisbursement(d.id);
              results.advanced++;
            }
          } else if (mapped.action === 'fail') {
            results.polled++;
            if (pipelineWorker?.advanceDisbursement) {
              await pipelineWorker.advanceDisbursement(d.id);
              results.failed++;
            }
          }
        } catch (err) {
          logger.warn(`[bos:poller] Poll error ${d.id}: ${err.message}`);
        }
      }

      pollCount++;
      return results;
    } finally {
      running = false;
    }
  }

  function start() {
    if (intervalId) return;
    const interval = config.fallbackPollerIntervalMs || 300_000;
    logger.info(`[bos:poller] Starting — interval ${interval}ms`);
    pollOnce().catch(() => {});
    intervalId = setInterval(() => pollOnce().catch(() => {}), interval);
  }

  function stop() {
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
      logger.info('[bos:poller] Stopped');
    }
  }

  function getStats() {
    return { running, pollCount };
  }

  return { start, stop, pollOnce, getStats };
}
