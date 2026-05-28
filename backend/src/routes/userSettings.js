import { Router } from 'express';
import { getDb } from '../database.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.get('/:address', async (req, res, next) => {
  try {
    const db = await getDb();
    const settings = await db.get('SELECT * FROM user_settings WHERE address = $1', [req.params.address]);
    db.release();
    if (!settings) return res.status(404).json({ error: 'User settings not found' });
    res.json(settings);
  } catch (err) { next(err); }
});

router.post('/', requireAuth, async (req, res, next) => {
  try {
    const db = await getDb();
    const { address, role } = req.body;
    if (!address || !role) { db.release(); return res.status(400).json({ error: 'address and role required' }); }
    if (role !== 'creative' && role !== 'backer') { db.release(); return res.status(400).json({ error: 'role must be creative or backer' }); }
    const now = Math.floor(Date.now() / 1000);
    const result = await db.run(`
      INSERT INTO user_settings (address, role, onboarding_completed, updated_at)
      VALUES ($1, $2, 1, $3)
      ON CONFLICT(address) DO UPDATE SET
        role = COALESCE(EXCLUDED.role, role),
        onboarding_completed = 1,
        updated_at = $3
    `, [address, role, now]);
    db.release();
    res.status(201).json(result.rows[0] || { address, role });
  } catch (err) {
    if (err.message && (err.message.includes('FOREIGN KEY') || err.message.includes('foreign key'))) {
      return res.status(400).json({ error: 'Profile must exist before setting role. Create a profile first.' });
    }
    next(err);
  }
});

export default router;
