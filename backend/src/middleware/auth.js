import { getDb } from '../database.js';

export async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid authorization header' });
    }
    const token = header.slice(7);
    const db = await getDb();
    const session = await db.get(
      'SELECT s.*, u.address, u.display_name, u.email, u.role FROM sessions s JOIN users u ON s.user_id = u.id WHERE s.token = $1 AND s.expires_at > $2',
      [token, Math.floor(Date.now() / 1000)]
    );
    db.release();
    if (!session) return res.status(401).json({ error: 'Invalid or expired session' });

    req.user = {
      id: session.user_id,
      address: session.address,
      displayName: session.display_name,
      email: session.email,
      role: session.role,
    };
    next();
  } catch (err) {
    console.error('[auth] Error:', err.message);
    res.status(500).json({ error: 'Authentication error' });
  }
}

export function optionalAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    req.user = null;
    return next();
  }
  const token = header.slice(7);
  getDb().then(async (db) => {
    try {
      const session = await db.get(
        'SELECT u.id, u.address, u.display_name, u.email, u.role FROM sessions s JOIN users u ON s.user_id = u.id WHERE s.token = $1 AND s.expires_at > $2',
        [token, Math.floor(Date.now() / 1000)]
      );
      req.user = session ? {
        id: session.id,
        address: session.address,
        displayName: session.display_name,
        email: session.email,
        role: session.role,
      } : null;
    } catch { req.user = null; }
    db.release();
    next();
  }).catch(() => { req.user = null; next(); });
}
