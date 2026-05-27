import { Router } from 'express';
import crypto from 'crypto';
import { getDb } from '../database.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

function generateToken() {
  return crypto.randomBytes(48).toString('hex');
}

const SESSION_DAYS = 30;

router.post('/register', async (req, res, next) => {
  try {
    const { address, email, password, displayName } = req.body;
    if ((!address && !email) || !displayName) {
      return res.status(400).json({ error: 'Provide address or email, and display name' });
    }

    const db = await getDb();

    if (address) {
      if (address.length < 10) { db.release(); return res.status(400).json({ error: 'Invalid address' }); }
      const existing = await db.get('SELECT id FROM users WHERE address = $1', [address]);
      if (existing) { db.release(); return res.status(409).json({ error: 'Address already registered' }); }
    }

    if (email) {
      const existing = await db.get('SELECT id FROM users WHERE email = $1', [email]);
      if (existing) { db.release(); return res.status(409).json({ error: 'Email already registered' }); }
    }

    let passwordHash = null;
    if (password) {
      passwordHash = crypto.createHash('sha256').update(password).digest('hex');
    }

    const now = Math.floor(Date.now() / 1000);
    const result = await db.run(`
      INSERT INTO users (address, email, password_hash, display_name, role, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $6)
    `, [address || null, email || null, passwordHash, displayName, 'creative', now]);

    const userId = result.lastInsertRowid;
    if (!userId) { db.release(); return res.status(500).json({ error: 'Failed to create user' }); }

    const token = generateToken();
    const expiresAt = now + (SESSION_DAYS * 24 * 3600);
    await db.run('INSERT INTO sessions (user_id, token, expires_at, created_at) VALUES ($1, $2, $3, $4)',
      [userId, token, expiresAt, now]);

    await db.run('INSERT INTO profiles (address, username) VALUES ($1, $2) ON CONFLICT (address) DO NOTHING',
      [address || `email_${userId}`, displayName]);

    db.release();

    res.status(201).json({
      token,
      expiresAt: expiresAt * 1000,
      user: { id: userId, address: address || null, email: email || null, displayName, role: 'creative' },
    });
  } catch (err) { next(err); }
});

router.post('/login', async (req, res, next) => {
  try {
    const { address, email, password } = req.body;
    if (!address && !email) {
      return res.status(400).json({ error: 'Provide address or email' });
    }

    const db = await getDb();
    let user;
    if (address) {
      user = await db.get('SELECT * FROM users WHERE address = $1', [address]);
    } else {
      user = await db.get('SELECT * FROM users WHERE email = $1', [email]);
    }

    if (!user) { db.release(); return res.status(401).json({ error: 'User not found' }); }

    if (user.password_hash) {
      if (!password) { db.release(); return res.status(401).json({ error: 'Password required' }); }
      const inputHash = crypto.createHash('sha256').update(password).digest('hex');
      if (inputHash !== user.password_hash) { db.release(); return res.status(401).json({ error: 'Invalid password' }); }
    } else if (!address) {
      db.release(); return res.status(401).json({ error: 'This account uses Stacks address login' });
    }

    const now = Math.floor(Date.now() / 1000);
    const token = generateToken();
    const expiresAt = now + (SESSION_DAYS * 24 * 3600);
    await db.run('INSERT INTO sessions (user_id, token, expires_at, created_at) VALUES ($1, $2, $3, $4)',
      [user.id, token, expiresAt, now]);

    db.release();

    res.json({
      token,
      expiresAt: expiresAt * 1000,
      user: {
        id: user.id,
        address: user.address,
        email: user.email,
        displayName: user.display_name,
        role: user.role,
      },
    });
  } catch (err) { next(err); }
});

router.get('/me', requireAuth, async (req, res) => {
  res.json({ user: req.user });
});

router.post('/logout', requireAuth, async (req, res, next) => {
  try {
    const header = req.headers.authorization;
    const token = header.slice(7);
    const db = await getDb();
    await db.run('DELETE FROM sessions WHERE token = $1', [token]);
    db.release();
    res.json({ success: true });
  } catch (err) { next(err); }
});

export default router;
