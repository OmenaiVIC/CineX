import { BOS_STATES, TERMINAL_STATES, ACTIVE_STATES } from './types.js';

export function createPipelineWorker(ctx) {
  const { db, logger, config } = ctx;
  const { createDisbursementService } = ctx;
  const ds = createDisbursementService(ctx);

  let intervalId = null;
  let running = false;
  let stats = {
    ticks: 0,
    advanced: 0,
    failed: 0,
    skipped: 0,
    startedAt: null,
  };

  async function processTick() {
    if (running) {
      logger.warn('[bos:pipeline] Previous tick still running, skipping');
      return { skipped: true };
    }

    running = true;
    const tickStart = Date.now();
    const results = { advanced: 0, failed: 0, skipped: 0, ids: [] };

    try {
      const statuses = [...ACTIVE_STATES];
      const placeholders = statuses.map((_, i) => `$${i + 1}`);
      const params = [...statuses, config.pipelineBatchSize || 50];

      const rows = await db.all(
        `SELECT * FROM disbursements
         WHERE status IN (${placeholders.join(', ')})
         ORDER BY updated_at ASC
         LIMIT $${statuses.length + 1}`,
        params
      );

      if (rows.length === 0) {
        results.skipped = 0;
        return results;
      }

      for (const disbursement of rows) {
        try {
          const updated = await ds.advanceDisbursement(disbursement.id);
          if (updated && !TERMINAL_STATES.has(updated.status)) {
            results.advanced++;
          } else {
            results.skipped++;
          }
          results.ids.push(disbursement.id);
        } catch (err) {
          logger.error(`[bos:pipeline] Error advancing ${disbursement.id}: ${err.message}`);
          results.failed++;
        }
      }
    } catch (err) {
      logger.error(`[bos:pipeline] Tick error: ${err.message}`);
      results.failed++;
    } finally {
      running = false;
      stats.ticks++;
      stats.advanced += results.advanced;
      stats.failed += results.failed;
      stats.skipped += results.skipped;

      const duration = Date.now() - tickStart;
      logger.info(
        `[bos:pipeline] Tick ${stats.ticks}: advanced=${results.advanced} failed=${results.failed} skipped=${results.skipped} (${duration}ms)`
      );
    }

    return results;
  }

  function start() {
    if (intervalId) {
      logger.warn('[bos:pipeline] Already running');
      return;
    }

    stats.startedAt = new Date().toISOString();
    const interval = config.pipelineIntervalMs || 30_000;
    logger.info(`[bos:pipeline] Starting — interval ${interval}ms`);

    processTick().catch(err => logger.error(`[bos:pipeline] Initial tick failed: ${err.message}`));
    intervalId = setInterval(() => {
      processTick().catch(err => logger.error(`[bos:pipeline] Tick failed: ${err.message}`));
    }, interval);
  }

  function stop() {
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
      logger.info('[bos:pipeline] Stopped');
    }
  }

  function getStats() {
    return { ...stats, running, pid: process.pid };
  }

  return { start, stop, processTick, getStats };
}
