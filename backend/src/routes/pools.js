import { Router } from 'express';
import { getDb } from '../database.js';

const router = Router();

router.get('/', (req, res) => {
  const db = getDb();
  const offset = parseInt(req.query.offset) || 0;
  const limit = Math.min(parseInt(req.query.limit) || 20, 100);
  const category = req.query.category;
  const status = req.query.status;
  const search = req.query.search;

  let sql = 'SELECT * FROM pools WHERE 1=1';
  const params = [];

  if (category) {
    sql += ' AND category = ?';
    params.push(category);
  }
  if (status) {
    sql += ' AND status = ?';
    params.push(status);
  }
  if (search) {
    sql += ' AND (name LIKE ? OR description LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }

  const countSql = sql.replace('SELECT *', 'SELECT COUNT(*) as count');
  const total = db.prepare(countSql).get(...params).count;

  sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);

  const pools = db.prepare(sql).all(...params);

  const enriched = pools.map((p) => {
    const memberCount = db.prepare('SELECT COUNT(*) as count FROM pool_members WHERE pool_id = ?').get(p.id).count;
    return { ...p, current_members: memberCount };
  });

  res.json({ pools: enriched, pagination: { offset, limit, total } });
});

router.get('/:id', (req, res) => {
  const db = getDb();
  const pool = db.prepare('SELECT * FROM pools WHERE id = ?').get(req.params.id);
  if (!pool) {
    return res.status(404).json({ error: 'Pool not found' });
  }
  const members = db.prepare('SELECT * FROM pool_members WHERE pool_id = ? ORDER BY joined_at ASC').all(pool.id);
  res.json({ pool, members });
});

router.post('/', (req, res) => {
  const db = getDb();
  const { name, description, creator, target_amount, min_commitment, max_members, deadline, category, return_rate } = req.body;
  if (!name || !creator || !target_amount) {
    return res.status(400).json({ error: 'name, creator, and target_amount are required' });
  }
  const result = db.prepare(`
    INSERT INTO pools (name, description, creator, target_amount, current_amount, min_commitment, max_members, deadline, category, status, return_rate)
    VALUES (?, ?, ?, ?, 0, ?, ?, ?, ?, 'open', ?)
  `).run(name, description || '', creator, target_amount, min_commitment || '0', max_members || 10, deadline || 0, category || 'short-film', return_rate || null);
  const created = db.prepare('SELECT * FROM pools WHERE id = ?').get(Number(result.lastInsertRowid));
  db.prepare(`
    INSERT INTO feed_events (event_type, event_data, actor, pool_id)
    VALUES ('pool_formed', ?, ?, ?)
  `).run(JSON.stringify({ summary: `New pool '${name}' has been formed.` }), creator, created.id);
  res.status(201).json(created);
});

router.post('/:id/join', (req, res) => {
  const db = getDb();
  const { address, amount } = req.body;
  if (!address || !amount) {
    return res.status(400).json({ error: 'address and amount are required' });
  }
  const pool = db.prepare('SELECT * FROM pools WHERE id = ?').get(req.params.id);
  if (!pool) return res.status(404).json({ error: 'Pool not found' });
  if (pool.status !== 'open') return res.status(400).json({ error: 'Pool is not open for joining' });

  const existing = db.prepare('SELECT * FROM pool_members WHERE pool_id = ? AND address = ?').get(pool.id, address);
  if (existing) return res.status(409).json({ error: 'Already a member' });

  const result = db.prepare(`
    INSERT INTO pool_members (pool_id, address, committed, role)
    VALUES (?, ?, ?, 'member')
  `).run(pool.id, address, amount);

  db.prepare('UPDATE pools SET current_amount = current_amount + ? WHERE id = ?').run(amount, pool.id);

  const created = db.prepare('SELECT * FROM pool_members WHERE id = ?').get(Number(result.lastInsertRowid));
  res.status(201).json(created);
});

router.get('/:id/members', (req, res) => {
  const db = getDb();
  const members = db.prepare('SELECT * FROM pool_members WHERE pool_id = ? ORDER BY joined_at ASC').all(req.params.id);
  res.json(members);
});

export default router;
