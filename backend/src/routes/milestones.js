import { Router } from 'express';
import { getDb } from '../database.js';

const router = Router();

router.get('/campaign/:campaignId', async (req, res, next) => {
  try {
    const db = await getDb();
    const milestones = await db.all('SELECT * FROM milestones WHERE campaign_id = $1 ORDER BY id ASC', [req.params.campaignId]);
    const parsed = milestones.map(m => ({ ...m, deliverables: tryParseJson(m.deliverables, []) }));
    db.release();
    res.json(parsed);
  } catch (err) { next(err); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const db = await getDb();
    const milestone = await db.get('SELECT * FROM milestones WHERE id = $1', [req.params.id]);
    if (!milestone) { db.release(); return res.status(404).json({ error: 'Milestone not found' }); }
    milestone.deliverables = tryParseJson(milestone.deliverables, []);
    db.release();
    res.json(milestone);
  } catch (err) { next(err); }
});

router.post('/', async (req, res, next) => {
  try {
    const db = await getDb();
    const { campaign_id, title, description, funding_required, deadline, deliverables } = req.body;
    if (!campaign_id || !title || !funding_required) { db.release(); return res.status(400).json({ error: 'campaign_id, title, and funding_required required' }); }
    const now = Math.floor(Date.now() / 1000);
    const result = await db.run(`
      INSERT INTO milestones (campaign_id, title, description, funding_required, deadline, status, deliverables, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, 'pending', $6, $7, $7)
    `, [campaign_id, title, description || '', funding_required, deadline || null, JSON.stringify(deliverables || []), now]);
    db.release();
    res.status(201).json(result.rows[0] || { id: result.lastInsertRowid });
  } catch (err) { next(err); }
});

router.put('/:id/status', async (req, res, next) => {
  try {
    const db = await getDb();
    const { status } = req.body;
    if (!status || !['pending', 'active', 'completed', 'failed'].includes(status)) {
      db.release(); return res.status(400).json({ error: 'Valid status required (pending, active, completed, failed)' });
    }
    const now = Math.floor(Date.now() / 1000);
    const updates = { status, updated_at: now };
    if (status === 'completed') updates.completed_at = now;
    const setClauses = Object.keys(updates).map((k, i) => `${k} = $${i + 1}`).join(', ');
    const values = Object.values(updates);
    values.push(req.params.id);
    const result = await db.run(`UPDATE milestones SET ${setClauses} WHERE id = $${values.length}`, values);
    if (result.changes === 0) { db.release(); return res.status(404).json({ error: 'Milestone not found' }); }
    const updated = await db.get('SELECT * FROM milestones WHERE id = $1', [req.params.id]);
    if (updated) updated.deliverables = tryParseJson(updated.deliverables, []);
    db.release();
    res.json(updated);
  } catch (err) { next(err); }
});

router.get('/campaign/:campaignId/progress', async (req, res, next) => {
  try {
    const db = await getDb();
    const all = await db.get('SELECT COUNT(*) as total FROM milestones WHERE campaign_id = $1', [req.params.campaignId]);
    const completed = await db.get("SELECT COUNT(*) as completed FROM milestones WHERE campaign_id = $1 AND status = 'completed'", [req.params.campaignId]);
    const total = all?.total || 0;
    const done = completed?.completed || 0;
    db.release();
    res.json({ completed: done, total, percent: total > 0 ? Math.round((done / total) * 100) : 0 });
  } catch (err) { next(err); }
});

function tryParseJson(val, def) {
  if (!val) return def;
  try { return JSON.parse(val); } catch { return def; }
}

export default router;
