import { Router } from 'express';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { getDb } from '../database.js';
import { requireAuth } from '../middleware/auth.js';
import * as walletService from '../services/walletService.js';

const router = Router();

function generateToken() {
  return crypto.randomBytes(48).toString('hex');
}

const SESSION_DAYS = 30;

router.post('/register', async (req, res, next) => {
  try {
    const { address, email, password, displayName, role } = req.body;
    if ((!address && !email) || !displayName) {
      return res.status(400).json({ error: 'Provide address or email, and display name' });
    }

    const userRole = (role === 'creative' || role === 'backer') ? role : 'creative';

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
      passwordHash = bcrypt.hashSync(password, 10);
    }

    const now = Math.floor(Date.now() / 1000);
    const result = await db.run(`
      INSERT INTO users (address, email, password_hash, display_name, role, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $6)
    `, [address || null, email || null, passwordHash, displayName, userRole, now]);

    const userId = result.lastInsertRowid;
    if (!userId) { db.release(); return res.status(500).json({ error: 'Failed to create user' }); }

    const token = generateToken();
    const expiresAt = now + (SESSION_DAYS * 24 * 3600);
    await db.run('INSERT INTO sessions (user_id, token, expires_at, created_at) VALUES ($1, $2, $3, $4)',
      [userId, token, expiresAt, now]);

    const profileAddress = address || `email_${userId}`;

    await db.run('INSERT INTO profiles (address, username) VALUES ($1, $2) ON CONFLICT (address) DO NOTHING',
      [profileAddress, displayName]);

    db.release();

    await walletService.createWallet({ userId: profileAddress, email: email || null, preferredCurrency: 'NGN' });

    res.status(201).json({
      token,
      expiresAt: expiresAt * 1000,
      user: { id: userId, address: profileAddress, email: email || null, displayName, role: userRole },
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
      if (!bcrypt.compareSync(password, user.password_hash)) { db.release(); return res.status(401).json({ error: 'Invalid password' }); }
    } else if (!address) {
      db.release(); return res.status(401).json({ error: 'This account uses Stacks address login' });
    }

    const now = Math.floor(Date.now() / 1000);
    const token = generateToken();
    const expiresAt = now + (SESSION_DAYS * 24 * 3600);
    await db.run('INSERT INTO sessions (user_id, token, expires_at, created_at) VALUES ($1, $2, $3, $4)',
      [user.id, token, expiresAt, now]);

    db.release();

    const userAddress = user.address || (user.email ? `email_${user.id}` : null);

    walletService.createWallet({ userId: userAddress, email: user.email || null, preferredCurrency: 'NGN' }).catch(() => {});

    res.json({
      token,
      expiresAt: expiresAt * 1000,
      user: {
        id: user.id,
        address: userAddress,
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

router.post('/bootstrap-admin', async (req, res, next) => {
  try {
    const { email, adminKey } = req.body;
    if (!email || !adminKey) {
      return res.status(400).json({ error: 'Provide email and adminKey' });
    }

    const expectedKey = process.env.ADMIN_BOOTSTRAP_KEY;
    if (!expectedKey) {
      return res.status(500).json({ error: 'ADMIN_BOOTSTRAP_KEY not configured on server' });
    }

    if (adminKey !== expectedKey) {
      return res.status(403).json({ error: 'Invalid admin bootstrap key' });
    }

    const db = await getDb();
    const user = await db.get('SELECT * FROM users WHERE email = $1', [email]);
    if (!user) { db.release(); return res.status(404).json({ error: 'User not found' }); }

    if (user.role === 'admin') {
      db.release();
      return res.json({ message: 'User is already admin', user: { id: user.id, email: user.email, displayName: user.display_name, role: 'admin' } });
    }

    await db.run('UPDATE users SET role = $1, updated_at = $2 WHERE id = $3', ['admin', Math.floor(Date.now() / 1000), user.id]);

    const now = Math.floor(Date.now() / 1000);
    const token = generateToken();
    const expiresAt = now + (SESSION_DAYS * 24 * 3600);
    await db.run('INSERT INTO sessions (user_id, token, expires_at, created_at) VALUES ($1, $2, $3, $4)',
      [user.id, token, expiresAt, now]);

    db.release();

    res.json({
      message: 'User promoted to admin',
      token,
      expiresAt: expiresAt * 1000,
      user: { id: user.id, email: user.email, displayName: user.display_name, role: 'admin' },
    });
  } catch (err) { next(err); }
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
