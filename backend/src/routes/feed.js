import { Router } from 'express';
import { getDb } from '../database.js';

const router = Router();

router.get('/global', (req, res) => {
  const db = getDb();
  const offset = parseInt(req.query.offset) || 0;
  const limit = Math.min(parseInt(req.query.limit) || 20, 100);
  const type = req.query.type;
  const since = req.query.since ? parseInt(req.query.since) : 0;

  let sql = 'SELECT * FROM feed_events WHERE created_at > ?';
  const params = [since];

  if (type) {
    sql += ' AND event_type = ?';
    params.push(type);
  }

  sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);

  const events = db.prepare(sql).all(...params);
  const total = db.prepare('SELECT COUNT(*) as count FROM feed_events').get().count;

  res.json({ events, pagination: { offset, limit, total } });
});

router.get('/pool/:poolId', (req, res) => {
  const db = getDb();
  const offset = parseInt(req.query.offset) || 0;
  const limit = Math.min(parseInt(req.query.limit) || 20, 100);
  const since = req.query.since ? parseInt(req.query.since) : 0;

  const events = db.prepare(
    'SELECT * FROM feed_events WHERE pool_id = ? AND created_at > ? ORDER BY created_at DESC LIMIT ? OFFSET ?'
  ).all(req.params.poolId, since, limit, offset);

  const total = db.prepare('SELECT COUNT(*) as count FROM feed_events WHERE pool_id = ?').get(req.params.poolId).count;

  res.json({ events, pagination: { offset, limit, total } });
});

router.get('/user/:address', (req, res) => {
  const db = getDb();
  const offset = parseInt(req.query.offset) || 0;
  const limit = Math.min(parseInt(req.query.limit) || 20, 100);
  const since = req.query.since ? parseInt(req.query.since) : 0;

  const events = db.prepare(
    'SELECT * FROM feed_events WHERE actor = ? AND created_at > ? ORDER BY created_at DESC LIMIT ? OFFSET ?'
  ).all(req.params.address, since, limit, offset);

  const total = db.prepare('SELECT COUNT(*) as count FROM feed_events WHERE actor = ?').get(req.params.address).count;

  res.json({ events, pagination: { offset, limit, total } });
});

router.post('/event', (req, res) => {
  const db = getDb();
  const { event_type, event_data, actor, pool_id, campaign_id, block_height, tx_id } = req.body;
  if (!event_type) {
    return res.status(400).json({ error: 'event_type is required' });
  }
  const result = db.prepare(`
    INSERT INTO feed_events (event_type, event_data, actor, pool_id, campaign_id, block_height, tx_id)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(event_type, event_data || '{}', actor || null, pool_id || null, campaign_id || null, block_height || null, tx_id || null);
  const created = db.prepare('SELECT * FROM feed_events WHERE id = ?').get(Number(result.lastInsertRowid));
  res.status(201).json(created);
});

export default router;
