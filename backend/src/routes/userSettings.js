import { Router } from 'express';
import { getDb } from '../database.js';

const router = Router();

router.get('/:address', (req, res) => {
  const db = getDb();
  const settings = db.prepare('SELECT * FROM user_settings WHERE address = ?').get(req.params.address);
  if (!settings) {
    return res.status(404).json({ error: 'User settings not found' });
  }
  res.json(settings);
});

router.post('/', (req, res) => {
  const db = getDb();
  const { address, role } = req.body;
  if (!address || !role) {
    return res.status(400).json({ error: 'address and role required' });
  }
  if (role !== 'creative' && role !== 'backer') {
    return res.status(400).json({ error: 'role must be creative or backer' });
  }
  try {
    db.prepare(`
      INSERT INTO user_settings (address, role, onboarding_completed, updated_at)
      VALUES (?, ?, 1, unixepoch())
      ON CONFLICT(address) DO UPDATE SET
        role = COALESCE(excluded.role, role),
        onboarding_completed = 1,
        updated_at = unixepoch()
    `).run(address, role);
    const created = db.prepare('SELECT * FROM user_settings WHERE address = ?').get(address);
    res.status(201).json(created);
  } catch (err) {
    if (err.message && err.message.includes('FOREIGN KEY')) {
      return res.status(400).json({ error: 'Profile must exist before setting role. Create a profile first.' });
    }
    res.status(500).json({ error: 'Failed to save user settings' });
  }
});

export default router;
