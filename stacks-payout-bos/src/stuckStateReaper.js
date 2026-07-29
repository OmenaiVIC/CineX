import { ACTIVE_STATES, BOS_STATES, ERROR_CODES } from './types.js';

const STATE_TIMEOUTS_MS = {
  [BOS_STATES.DISBURSEMENT_INITIATED]: 600_000,
  [BOS_STATES.PREFLIGHT_CHECK]: 600_000,
  [BOS_STATES.BURN_SUBMITTED]: 600_000,
  [BOS_STATES.BURN_CONFIRMED]: 900_000,
  [BOS_STATES.ATTESTATION_REQUESTED]: 900_000,
  [BOS_STATES.ATTESTATION_CONFIRMED]: 3_600_000,
  [BOS_STATES.DESTINATION_RELEASE_SUBMITTED]: 3_600_000,
  [BOS_STATES.DESTINATION_RELEASE_CONFIRMED]: 3_600_000,
  [BOS_STATES.YELLOWCARD_PAYOUT_SUBMITTED]: 1_800_000,
  [BOS_STATES.YELLOWCARD_PAYOUT_CONFIRMED]: 1_800_000,
  [BOS_STATES.MANUAL_REVIEW_REQUIRED]: 21_600_000,
};

export function createStuckStateReaper(ctx) {
  const { db, logger, config } = ctx;

  let intervalId = null;
  let running = false;
  let stats = { runs: 0, reaped: 0, errors: 0 };

  async function reap() {
    if (running) {
      logger.warn('[bos:reaper] Previous run still in progress');
      return { skipped: true };
    }

    running = true;
    const results = { reaped: [], errors: [] };

    try {
      const activeList = [...ACTIVE_STATES];
      const placeholders = activeList.map((_, i) => `$${i + 1}`);
      const params = [...activeList];

      const rows = await db.all(
        `SELECT * FROM disbursements
         WHERE status IN (${placeholders.join(', ')})
         ORDER BY updated_at ASC`,
        params
      );

      const now = Date.now();

      for (const row of rows) {
        const timeout = STATE_TIMEOUTS_MS[row.status] || 600_000;
        const updatedAt = new Date(row.updated_at).getTime();
        const msInState = now - updatedAt;

        if (msInState > timeout) {
          try {
            await db.query(
              `UPDATE disbursements
               SET status = $1, last_error = $2, failed_at = NOW(), updated_at = NOW()
               WHERE id = $3 AND status = $4`,
              [BOS_STATES.FAILED, `${ERROR_CODES.TIMEOUT}: Stuck in ${row.status} for ${Math.round(msInState / 1000)}s`, row.id, row.status]
            );

            await db.query(
              `INSERT INTO disbursement_audit
               (disbursement_id, event_type, from_status, to_status, worker_id, guard_result, guard_reason)
               VALUES ($1, 'state_transition', $2, $3, 'reaper', 'fail', $4)`,
              [row.id, row.status, BOS_STATES.FAILED, `Stuck in ${row.status} for ${Math.round(msInState / 60000)} minutes`]
            );

            results.reaped.push(row.id);
            logger.warn(`[bos:reaper] Reaped ${row.id}: ${row.status} -> failed (${Math.round(msInState / 60000)} min stuck)`);
          } catch (err) {
            logger.error(`[bos:reaper] Error reaping ${row.id}: ${err.message}`);
            results.errors.push(row.id);
          }
        }
      }
    } catch (err) {
      logger.error(`[bos:reaper] Query error: ${err.message}`);
      results.errors.push('query_error');
    } finally {
      running = false;
      stats.runs++;
      stats.reaped += results.reaped.length;
      stats.errors += results.errors.length;
    }

    return results;
  }

  function start() {
    if (intervalId) {
      logger.warn('[bos:reaper] Already running');
      return;
    }

    const interval = config.stuckReaperIntervalMs || 120_000;
    logger.info(`[bos:reaper] Starting — interval ${interval}ms`);

    reap().catch(err => logger.error(`[bos:reaper] Initial reap failed: ${err.message}`));
    intervalId = setInterval(() => {
      reap().catch(err => logger.error(`[bos:reaper] Reap failed: ${err.message}`));
    }, interval);
  }

  function stop() {
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
      logger.info('[bos:reaper] Stopped');
    }
  }

  function getStats() {
    return { ...stats, running };
  }

  return { start, stop, reap, getStats };
}
