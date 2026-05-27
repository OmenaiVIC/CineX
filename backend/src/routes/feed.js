import { Router } from 'express';
import { getDb } from '../database.js';

const router = Router();

router.get('/global', async (req, res, next) => {
  try {
    const db = await getDb();
    const offset = parseInt(req.query.offset) || 0;
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const type = req.query.type;
    const since = req.query.since ? parseInt(req.query.since) : 0;

    let events;
    if (type) {
      events = await db.all('SELECT * FROM feed_events WHERE created_at > $1 AND event_type = $2 ORDER BY created_at DESC LIMIT $3 OFFSET $4', [since, type, limit, offset]);
    } else {
      events = await db.all('SELECT * FROM feed_events WHERE created_at > $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3', [since, limit, offset]);
    }
    const totalRow = await db.get('SELECT COUNT(*) as count FROM feed_events');
    db.release();
    res.json({ events, pagination: { offset, limit, total: totalRow?.count || 0 } });
  } catch (err) { next(err); }
});

router.get('/pool/:poolId', async (req, res, next) => {
  try {
    const db = await getDb();
    const offset = parseInt(req.query.offset) || 0;
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const since = req.query.since ? parseInt(req.query.since) : 0;
    const events = await db.all('SELECT * FROM feed_events WHERE pool_id = $1 AND created_at > $2 ORDER BY created_at DESC LIMIT $3 OFFSET $4', [req.params.poolId, since, limit, offset]);
    const totalRow = await db.get('SELECT COUNT(*) as count FROM feed_events WHERE pool_id = $1', [req.params.poolId]);
    db.release();
    res.json({ events, pagination: { offset, limit, total: totalRow?.count || 0 } });
  } catch (err) { next(err); }
});

router.get('/user/:address', async (req, res, next) => {
  try {
    const db = await getDb();
    const offset = parseInt(req.query.offset) || 0;
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const since = req.query.since ? parseInt(req.query.since) : 0;
    const events = await db.all('SELECT * FROM feed_events WHERE actor = $1 AND created_at > $2 ORDER BY created_at DESC LIMIT $3 OFFSET $4', [req.params.address, since, limit, offset]);
    const totalRow = await db.get('SELECT COUNT(*) as count FROM feed_events WHERE actor = $1', [req.params.address]);
    db.release();
    res.json({ events, pagination: { offset, limit, total: totalRow?.count || 0 } });
  } catch (err) { next(err); }
});

router.post('/event', async (req, res, next) => {
  try {
    const db = await getDb();
    const { event_type, event_data, actor, pool_id, campaign_id, block_height, tx_id } = req.body;
    if (!event_type) { db.release(); return res.status(400).json({ error: 'event_type is required' }); }
    const result = await db.run(`
      INSERT INTO feed_events (event_type, event_data, actor, pool_id, campaign_id, block_height, tx_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [event_type, event_data || '{}', actor || null, pool_id || null, campaign_id || null, block_height || null, tx_id || null]);
    db.release();
    res.status(201).json(result.rows[0] || { id: result.lastInsertRowid });
  } catch (err) { next(err); }
});

export default router;
