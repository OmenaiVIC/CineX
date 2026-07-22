import { Router } from 'express';
import monitorJob from '../services/bos/monitoring/monitorJob.js';
import dashboardQueries from '../services/bos/monitoring/dashboardQueries.js';
import { acknowledgeAlert, getUnacknowledgedAlerts, getAlertStats } from '../services/bos/monitoring/alertDeduplicator.js';
import * as pipelineWorker from '../services/bos/pipelineWorker.js';
import * as stuckReaper from '../services/bos/stuckStateReaper.js';
import * as reconciliationWorker from '../services/bos/reconciliationWorker.js';

const router = Router();

/**
 * GET /api/bos/monitoring/health
 * Monitor job health check
 */
router.get('/health', (req, res) => {
  res.json({ status: 'ok', monitor: monitorJob.getStatus() });
});

/**
 * GET /api/bos/monitoring/pipeline
 * Pipeline summary — counts by status, total volume, success rate
 */
router.get('/pipeline', async (req, res) => {
  try {
    const summary = await dashboardQueries.getPipelineSummary();
    res.json(summary);
  } catch (err) {
    console.error('[bos:monitoring] Pipeline query failed:', err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/bos/monitoring/active
 * Active disbursements — in-flight, not terminal
 */
router.get('/active', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 50, 200);
    const offset = parseInt(req.query.offset) || 0;
    const result = await dashboardQueries.getActiveDisbursements({ limit, offset });
    res.json(result);
  } catch (err) {
    console.error('[bos:monitoring] Active query failed:', err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/bos/monitoring/alerts
 * Recent unacknowledged alerts
 */
router.get('/alerts', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 50, 200);
    const offset = parseInt(req.query.offset) || 0;
    const alertType = req.query.type || null;
    const result = await dashboardQueries.getRecentAlerts({ limit, offset, alertType });
    res.json(result);
  } catch (err) {
    console.error('[bos:monitoring] Alerts query failed:', err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/bos/monitoring/alerts/stats
 * Alert statistics by type and severity
 */
router.get('/alerts/stats', async (req, res) => {
  try {
    const sinceMs = req.query.since ? parseInt(req.query.since) : null;
    const stats = await dashboardQueries.getAlertStats({ sinceMs });
    res.json(stats);
  } catch (err) {
    console.error('[bos:monitoring] Alert stats query failed:', err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/bos/monitoring/alerts/:id/acknowledge
 * Acknowledge a specific alert
 */
router.post('/alerts/:id/acknowledge', async (req, res) => {
  try {
    const alertId = parseInt(req.params.id);
    if (isNaN(alertId)) return res.status(400).json({ error: 'Invalid alert ID' });
    await acknowledgeAlert(alertId);
    res.json({ acknowledged: true });
  } catch (err) {
    console.error('[bos:monitoring] Acknowledge failed:', err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/bos/monitoring/disbursement/:id/timeline
 * Full lifecycle timeline of a single disbursement
 */
router.get('/disbursement/:id/timeline', async (req, res) => {
  try {
    const { id } = req.params;
    const timeline = await dashboardQueries.getDisbursementTimeline(id);
    if (!timeline.disbursement) return res.status(404).json({ error: 'Disbursement not found' });
    res.json(timeline);
  } catch (err) {
    console.error('[bos:monitoring] Timeline query failed:', err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/bos/monitoring/manual-review
 * Manual review queue
 */
router.get('/manual-review', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 50, 200);
    const offset = parseInt(req.query.offset) || 0;
    const result = await dashboardQueries.getManualReviewQueue({ limit, offset });
    res.json(result);
  } catch (err) {
    console.error('[bos:monitoring] Manual review query failed:', err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/bos/monitoring/run
 * Manually trigger a monitor check run
 */
router.post('/run', async (req, res) => {
  try {
    const result = await monitorJob.runChecks();
    res.json(result);
  } catch (err) {
    console.error('[bos:monitoring] Manual run failed:', err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/bos/monitoring/workers
 * Pipeline, stuck-reaper, and reconciliation worker stats
 */
router.get('/workers', (req, res) => {
  res.json({
    pipeline: pipelineWorker.getStats(),
    stuckReaper: stuckReaper.getStats ? stuckReaper.getStats() : { status: 'no stats' },
    reconciliation: reconciliationWorker.getStats ? reconciliationWorker.getStats() : { status: 'no stats' },
  });
});

/**
 * POST /api/bos/monitoring/workers/pipeline/run
 * Manually trigger a single pipeline tick
 */
router.post('/workers/pipeline/run', async (req, res) => {
  try {
    await pipelineWorker.runOnce();
    res.json({ ok: true, stats: pipelineWorker.getStats() });
  } catch (err) {
    console.error('[bos:monitoring] Pipeline run failed:', err.message);
    res.status(500).json({ error: err.message });
  }
});

export default router;
