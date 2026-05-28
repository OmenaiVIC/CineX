import { Router } from 'express';
import { getDb } from '../database.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.get('/', async (req, res, next) => {
  try {
    const db = await getDb();
    const offset = parseInt(req.query.offset) || 0;
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const { category, status, search } = req.query;

    let where = 'WHERE 1=1';
    const params = [];
    if (category) { where += ' AND category = $' + (params.length + 1); params.push(category); }
    if (status) { where += ' AND status = $' + (params.length + 1); params.push(status); }
    if (search) { where += ' AND (name LIKE $' + (params.length + 1) + ' OR description LIKE $' + (params.length + 2) + ')'; params.push(`%${search}%`, `%${search}%`); }

    const totalRow = await db.get('SELECT COUNT(*) as count FROM pools ' + where, params);
    const total = totalRow?.count || 0;

    params.push(limit, offset);
    const pools = await db.all('SELECT * FROM pools ' + where + ' ORDER BY created_at DESC LIMIT $' + (params.length - 1) + ' OFFSET $' + params.length, params);

    const enriched = [];
    for (const p of pools) {
      const mc = await db.get('SELECT COUNT(*) as count FROM pool_members WHERE pool_id = $1', [p.id]);
      enriched.push({ ...p, current_members: mc?.count || 0 });
    }
    db.release();
    res.json({ pools: enriched, pagination: { offset, limit, total } });
  } catch (err) { next(err); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const db = await getDb();
    const pool = await db.get('SELECT * FROM pools WHERE id = $1', [req.params.id]);
    if (!pool) { db.release(); return res.status(404).json({ error: 'Pool not found' }); }
    const members = await db.all('SELECT * FROM pool_members WHERE pool_id = $1 ORDER BY joined_at ASC', [pool.id]);
    db.release();
    res.json({ pool, members });
  } catch (err) { next(err); }
});

router.post('/', requireAuth, async (req, res, next) => {
  try {
    const db = await getDb();
    const { name, description, creator, target_amount, min_commitment, max_members, deadline, category, return_rate } = req.body;
    if (!name || !creator || !target_amount) { db.release(); return res.status(400).json({ error: 'name, creator, and target_amount are required' }); }
    const result = await db.run(`
      INSERT INTO pools (name, description, creator, target_amount, current_amount, min_commitment, max_members, deadline, category, status, return_rate)
      VALUES ($1, $2, $3, $4, 0, $5, $6, $7, $8, 'open', $9)
    `, [name, description || '', creator, target_amount, min_commitment || '0', max_members || 10, deadline || 0, category || 'short-film', return_rate || null]);
    const created = result.rows[0];
    if (created) {
      await db.run(`INSERT INTO feed_events (event_type, event_data, actor, pool_id) VALUES ($1, $2, $3, $4)`,
        ['pool_formed', JSON.stringify({ summary: `New pool '${name}' has been formed.` }), creator, created.id]);
    }
    db.release();
    res.status(201).json(created || { id: result.lastInsertRowid });
  } catch (err) { next(err); }
});

router.post('/:id/join', requireAuth, async (req, res, next) => {
  try {
    const db = await getDb();
    const { address, amount } = req.body;
    if (!address || !amount) { db.release(); return res.status(400).json({ error: 'address and amount are required' }); }
    const pool = await db.get('SELECT * FROM pools WHERE id = $1', [req.params.id]);
    if (!pool) { db.release(); return res.status(404).json({ error: 'Pool not found' }); }
    if (pool.status !== 'open') { db.release(); return res.status(400).json({ error: 'Pool is not open for joining' }); }
    const existing = await db.get('SELECT * FROM pool_members WHERE pool_id = $1 AND address = $2', [pool.id, address]);
    if (existing) { db.release(); return res.status(409).json({ error: 'Already a member' }); }
    const result = await db.run('INSERT INTO pool_members (pool_id, address, committed, role) VALUES ($1, $2, $3, $4)', [pool.id, address, amount, 'member']);
    await db.run('UPDATE pools SET current_amount = CAST(CAST(current_amount AS INTEGER) + CAST($1 AS INTEGER) AS TEXT) WHERE id = $2', [amount.toString(), pool.id]);
    db.release();
    res.status(201).json(result.rows[0] || { id: result.lastInsertRowid });
  } catch (err) { next(err); }
});

router.get('/:id/members', async (req, res, next) => {
  try {
    const db = await getDb();
    const members = await db.all('SELECT * FROM pool_members WHERE pool_id = $1 ORDER BY joined_at ASC', [req.params.id]);
    db.release();
    res.json(members);
  } catch (err) { next(err); }
});

export default router;
