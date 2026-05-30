import { Router } from 'express';
import { getDb } from '../database.js';
import contractService from '../services/contractService.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.get('/creator/:address', async (req, res, next) => {
  try {
    const db = await getDb();
    const milestones = await db.all(`
      SELECT m.* FROM milestones m
      INNER JOIN campaigns c ON c.id = m.campaign_id
      WHERE c.creator = $1
      ORDER BY m.created_at DESC
    `, [req.params.address]);
    const parsed = milestones.map(m => ({ ...m, deliverables: tryParseJson(m.deliverables, []) }));
    db.release();
    res.json(parsed);
  } catch (err) { next(err); }
});

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

router.post('/', requireAuth, async (req, res, next) => {
  try {
    const db = await getDb();
    const { campaign_id, title, description, funding_required, deadline, deliverables } = req.body;
    if (!campaign_id || !title || !funding_required) { db.release(); return res.status(400).json({ error: 'campaign_id, title, and funding_required required' }); }
    const now = Math.floor(Date.now() / 1000);
    const result = await db.run(`
      INSERT INTO milestones (campaign_id, title, description, funding_required, deadline, status, deliverables, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, 'pending', $6, $7, $7)
    `, [campaign_id, title, description || '', funding_required, deadline || null, JSON.stringify(deliverables || []), now]);
    let chainResult = null;
    try {
      chainResult = await contractService.createMilestones(Number(campaign_id), [deadline ? Math.ceil((deadline - now) / 600) : 100]);
      console.log(`[milestones] Chain milestones created: ${chainResult.explorer_url}`);
    } catch (chainErr) {
      console.warn(`[milestones] Chain milestone creation failed (DB succeeded): ${chainErr.message}`);
    }
    db.release();
    res.status(201).json({ ...(result.rows[0] || { id: result.lastInsertRowid }), chain: chainResult });
  } catch (err) { next(err); }
});

router.put('/:id/status', requireAuth, async (req, res, next) => {
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
    let chainResult = null;
    try {
      if (status === 'active') {
        chainResult = await contractService.submitMilestone(updated.campaign_id, updated.id - 1);
        console.log(`[milestones] Chain submit: ${chainResult.explorer_url}`);
      } else if (status === 'completed') {
        chainResult = await contractService.finalizeMilestone(updated.campaign_id, updated.id - 1);
        console.log(`[milestones] Chain finalize: ${chainResult.explorer_url}`);
      }
    } catch (chainErr) {
      console.warn(`[milestones] Chain status update failed (DB succeeded): ${chainErr.message}`);
    }
    db.release();
    res.json({ ...updated, chain: chainResult });
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

router.post('/:id/vote', requireAuth, async (req, res, next) => {
  try {
    const db = await getDb();
    const { voterAddress, approved, contributionWeight } = req.body;
    if (!voterAddress || approved === undefined) { db.release(); return res.status(400).json({ error: 'voterAddress and approved required' }); }

    const milestone = await db.get('SELECT * FROM milestones WHERE id = $1', [req.params.id]);
    if (!milestone) { db.release(); return res.status(404).json({ error: 'Milestone not found' }); }
    if (milestone.status !== 'active') { db.release(); return res.status(400).json({ error: 'Milestone is not active' }); }

    const weight = contributionWeight || 0;
    const now = Math.floor(Date.now() / 1000);

    await db.run(`INSERT INTO milestone_votes (milestone_id, voter_address, contribution_weight, approved, created_at)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (milestone_id, voter_address) DO UPDATE SET approved = $4, contribution_weight = $3, created_at = $5`,
      [req.params.id, voterAddress, weight, approved ? 1 : 0, now]);

    const totalContributions = await db.get(
      'SELECT COALESCE(SUM(CAST(amount AS INTEGER)), 0) as total FROM contributions WHERE campaign_id = $1',
      [milestone.campaign_id]
    );
    const voteResult = await db.get(
      'SELECT COALESCE(SUM(contribution_weight), 0) as total_yes FROM milestone_votes WHERE milestone_id = $1 AND approved = 1',
      [req.params.id]
    );
    const adminVote = approved ? weight : 0;
    const totalYes = (voteResult?.total_yes || 0);
    const grandTotal = (totalContributions?.total || 1);
    const thresholdMet = (totalYes / grandTotal) > 0.5;

    if (thresholdMet) {
      const updates = { status: 'completed', updated_at: now, completed_at: now };
      const setClauses = Object.keys(updates).map((k, i) => `${k} = $${i + 1}`).join(', ');
      const values = Object.values(updates);
      values.push(req.params.id);
      await db.run(`UPDATE milestones SET ${setClauses} WHERE id = $${values.length}`, values);
    }

    let chainResult = null;
    try {
      chainResult = await contractService.endorseMilestone(milestone.campaign_id, milestone.id - 1, approved);
      console.log(`[milestones] Chain endorse: ${chainResult.explorer_url}`);
    } catch (chainErr) {
      console.warn(`[milestones] Chain endorse failed (DB succeeded): ${chainErr.message}`);
    }
    db.release();
    res.json({ voted: true, thresholdMet, totalYes, grandTotal, autoCompleted: thresholdMet, chain: chainResult });
  } catch (err) { next(err); }
});

router.get('/:id/votes', async (req, res, next) => {
  try {
    const db = await getDb();
    const milestone = await db.get('SELECT * FROM milestones WHERE id = $1', [req.params.id]);
    if (!milestone) { db.release(); return res.status(404).json({ error: 'Milestone not found' }); }
    const votes = await db.all('SELECT * FROM milestone_votes WHERE milestone_id = $1 ORDER BY created_at DESC', [req.params.id]);
    const totalContributions = await db.get(
      'SELECT COALESCE(SUM(CAST(amount AS INTEGER)), 0) as total FROM contributions WHERE campaign_id = $1',
      [milestone.campaign_id]
    );
    const totalYes = votes.filter(v => v.approved).reduce((s, v) => s + v.contribution_weight, 0);
    const grandTotal = totalContributions?.total || 1;
    db.release();
    res.json({
      votes,
      result: {
        totalYes,
        grandTotal,
        percent: Math.round((totalYes / grandTotal) * 100),
        passed: (totalYes / grandTotal) > 0.5,
      },
    });
  } catch (err) { next(err); }
});

function tryParseJson(val, def) {
  if (!val) return def;
  try { return JSON.parse(val); } catch { return def; }
}

export default router;
