import { TERMINAL_STATES, BOS_STATES } from './types.js';

export function createReconciliationWorker(ctx) {
  const { db, logger, config } = ctx;

  let intervalId = null;
  let running = false;
  let stats = { runs: 0, discrepanciesFound: 0, resolved: 0 };

  async function runReconciliation() {
    if (running) {
      logger.warn('[bos:reconciliation] Previous run still in progress');
      return { skipped: true };
    }

    running = true;
    const results = { discrepancies: [], resolved: [], checked: 0 };

    try {
      const rows = await db.all(
        `SELECT d.*, COUNT(da.id) AS audit_count
         FROM disbursements d
         LEFT JOIN disbursement_audit da ON da.disbursement_id = d.id
         WHERE d.status NOT IN ('settled', 'failed', 'cancelled')
         GROUP BY d.id
         ORDER BY d.updated_at ASC`
      );

      results.checked = rows.length;

      for (const row of rows) {
        const discrepancy = await checkDiscrepancy(row);
        if (discrepancy) {
          results.discrepancies.push(discrepancy);
          await recordDiscrepancy(row.id, discrepancy);
          stats.discrepanciesFound++;
        }
      }
    } catch (err) {
      logger.error(`[bos:reconciliation] Run error: ${err.message}`);
    } finally {
      running = false;
      stats.runs++;
    }

    return results;
  }

  async function checkDiscrepancy(disbursement) {
    const now = Date.now();
    const updatedAt = new Date(disbursement.updated_at).getTime();

    if (disbursement.burn_deadline_at && disbursement.status === BOS_STATES.BURN_SUBMITTED) {
      const deadline = new Date(disbursement.burn_deadline_at).getTime();
      if (now > deadline) {
        return { type: 'burn_deadline_exceeded', detail: `Exceeded burn deadline: ${disbursement.burn_deadline_at}` };
      }
    }

    if (disbursement.attestation_deadline_at &&
        [BOS_STATES.BURN_CONFIRMED, BOS_STATES.ATTESTATION_REQUESTED].includes(disbursement.status)) {
      const deadline = new Date(disbursement.attestation_deadline_at).getTime();
      if (now > deadline) {
        return { type: 'attestation_deadline_exceeded', detail: `Exceeded attestation deadline: ${disbursement.attestation_deadline_at}` };
      }
    }

    if (disbursement.payout_deadline_at && disbursement.status !== BOS_STATES.SETTLED) {
      const deadline = new Date(disbursement.payout_deadline_at).getTime();
      if (now > deadline) {
        return { type: 'payout_deadline_exceeded', detail: `Exceeded payout deadline: ${disbursement.payout_deadline_at}` };
      }
    }

    return null;
  }

  async function recordDiscrepancy(disbursementId, discrepancy) {
    try {
      await db.query(
        `INSERT INTO manual_review_queue (disbursement_id, reason, severity)
         VALUES ($1, $2, $3)
         ON CONFLICT DO NOTHING`,
        [disbursementId, `Reconciliation: ${discrepancy.type} — ${discrepancy.detail}`, 'high']
      );
    } catch (err) {
      logger.warn(`[bos:reconciliation] Failed to record discrepancy: ${err.message}`);
    }
  }

  function start() {
    if (intervalId) {
      logger.warn('[bos:reconciliation] Already running');
      return;
    }

    const interval = config.reconciliationIntervalMs || 3_600_000;
    logger.info(`[bos:reconciliation] Starting — interval ${interval}ms`);

    runReconciliation().catch(err => logger.error(`[bos:reconciliation] Initial run failed: ${err.message}`));
    intervalId = setInterval(() => {
      runReconciliation().catch(err => logger.error(`[bos:reconciliation] Run failed: ${err.message}`));
    }, interval);
  }

  function stop() {
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
      logger.info('[bos:reconciliation] Stopped');
    }
  }

  function getStats() {
    return { ...stats, running };
  }

  return { start, stop, runReconciliation, getStats };
}
