import { Router } from 'express';
import { getDb } from '../database.js';

const router = Router();

router.get('/:address', (req, res) => {
  const db = getDb();
  const profile = db.prepare('SELECT * FROM profiles WHERE address = ?').get(req.params.address);
  if (!profile) {
    return res.status(404).json({ error: 'Profile not found' });
  }
  const portfolio = db.prepare('SELECT * FROM portfolio_items WHERE address = ? ORDER BY year DESC').all(req.params.address);
  const ratings = db.prepare('SELECT * FROM ratings WHERE target_address = ? ORDER BY created_at DESC').all(req.params.address);
  const avg = db.prepare('SELECT COALESCE(AVG(score), 0) as avg_score, COUNT(*) as count FROM ratings WHERE target_address = ?').get(req.params.address);
  res.json({ profile, portfolio, ratings, ratingSummary: avg });
});

router.put('/:address', (req, res) => {
  const db = getDb();
  const { username, bio, avatarUrl, portfolioUrl, socialTwitter, socialInstagram, socialWebsite } = req.body;
  const stmt = db.prepare(`
    INSERT INTO profiles (address, username, bio, avatar_url, portfolio_url, social_twitter, social_instagram, social_website, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, unixepoch())
    ON CONFLICT(address) DO UPDATE SET
      username = COALESCE(excluded.username, username),
      bio = COALESCE(excluded.bio, bio),
      avatar_url = COALESCE(excluded.avatar_url, avatar_url),
      portfolio_url = COALESCE(excluded.portfolio_url, portfolio_url),
      social_twitter = COALESCE(excluded.social_twitter, social_twitter),
      social_instagram = COALESCE(excluded.social_instagram, social_instagram),
      social_website = COALESCE(excluded.social_website, social_website),
      updated_at = unixepoch()
  `);
  stmt.run(req.params.address, username, bio, avatarUrl, portfolioUrl, socialTwitter, socialInstagram, socialWebsite);
  const updated = db.prepare('SELECT * FROM profiles WHERE address = ?').get(req.params.address);
  res.json(updated);
});

router.get('/:address/ratings', (req, res) => {
  const db = getDb();
  const ratings = db.prepare('SELECT * FROM ratings WHERE target_address = ? ORDER BY created_at DESC').all(req.params.address);
  const summary = db.prepare('SELECT COALESCE(AVG(score), 0) as avg_score, COUNT(*) as count FROM ratings WHERE target_address = ?').get(req.params.address);
  res.json({ ratings, summary });
});

router.post('/:address/ratings', (req, res) => {
  const db = getDb();
  const { raterAddress, score, comment, commentHash, txId, projectId } = req.body;
  if (!raterAddress || !score || score < 1 || score > 5) {
    return res.status(400).json({ error: 'raterAddress and score (1-5) required' });
  }
  try {
    const result = db.prepare(`
      INSERT INTO ratings (rater_address, target_address, score, comment, comment_hash, tx_id, project_id)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(raterAddress, req.params.address, score, comment, commentHash, txId, projectId);
    const created = db.prepare('SELECT * FROM ratings WHERE id = ?').get(Number(result.lastInsertRowid));
    res.status(201).json(created);
  } catch (err) {
    if (err.message && err.message.includes('UNIQUE')) {
      return res.status(409).json({ error: 'Rating already exists for this rater+project' });
    }
    res.status(500).json({ error: 'Failed to create rating' });
  }
});

router.get('/:address/portfolio', (req, res) => {
  const db = getDb();
  const items = db.prepare('SELECT * FROM portfolio_items WHERE address = ? ORDER BY year DESC').all(req.params.address);
  res.json(items);
});

router.post('/:address/portfolio', (req, res) => {
  const db = getDb();
  const { title, description, category, role, year, mediaUrls, awards } = req.body;
  if (!title) {
    return res.status(400).json({ error: 'title required' });
  }
  const result = db.prepare(`
    INSERT INTO portfolio_items (address, title, description, category, role, year, media_urls, awards)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(req.params.address, title, description, category, role, year, JSON.stringify(mediaUrls || []), JSON.stringify(awards || []));
  const created = db.prepare('SELECT * FROM portfolio_items WHERE id = ?').get(Number(result.lastInsertRowid));
  res.status(201).json(created);
});

router.put('/:address/portfolio/:id', (req, res) => {
  const db = getDb();
  const { title, description, category, role, year, mediaUrls, awards } = req.body;
  const result = db.prepare(`
    UPDATE portfolio_items
    SET title = COALESCE(?, title),
        description = COALESCE(?, description),
        category = COALESCE(?, category),
        role = COALESCE(?, role),
        year = COALESCE(?, year),
        media_urls = COALESCE(?, media_urls),
        awards = COALESCE(?, awards),
        updated_at = unixepoch()
    WHERE id = ? AND address = ?
  `).run(title, description, category, role, year, mediaUrls ? JSON.stringify(mediaUrls) : null, awards ? JSON.stringify(awards) : null, req.params.id, req.params.address);
  if (result.changes === 0) {
    return res.status(404).json({ error: 'Portfolio item not found' });
  }
  const updated = db.prepare('SELECT * FROM portfolio_items WHERE id = ?').get(req.params.id);
  res.json(updated);
});

router.delete('/:address/portfolio/:id', (req, res) => {
  const db = getDb();
  const result = db.prepare('DELETE FROM portfolio_items WHERE id = ? AND address = ?').run(req.params.id, req.params.address);
  if (result.changes === 0) {
    return res.status(404).json({ error: 'Portfolio item not found' });
  }
  res.json({ deleted: true });
});

export default router;
