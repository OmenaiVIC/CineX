import { Router } from 'express';
import { getDb } from '../database.js';
import { requireAuth } from '../middleware/auth.js';
import contractService from '../services/contractService.js';

const router = Router();

router.get('/', async (req, res, next) => {
  try {
    const db = await getDb();
    const profiles = await db.all('SELECT * FROM profiles ORDER BY created_at DESC');
    db.release();
    res.json(profiles);
  } catch (err) { next(err); }
});

router.get('/:address', async (req, res, next) => {
  try {
    const db = await getDb();
    const profile = await db.get('SELECT * FROM profiles WHERE address = $1', [req.params.address]);
    if (!profile) {
      db.release();
      return res.status(404).json({ error: 'Profile not found' });
    }
    const portfolio = await db.all('SELECT * FROM portfolio_items WHERE address = $1 ORDER BY year DESC', [req.params.address]);
    const ratings = await db.all('SELECT * FROM ratings WHERE target_address = $1 ORDER BY created_at DESC', [req.params.address]);
    const avg = await db.get('SELECT COALESCE(AVG(score), 0) as avg_score, COUNT(*) as count FROM ratings WHERE target_address = $1', [req.params.address]);
    db.release();

    // Surface on-chain reputation
    let onchainRep = null;
    try {
      onchainRep = await contractService.getAverageRating(req.params.address);
    } catch (_) { /* chain not available */ }

    let verifiedStatus = null;
    try {
      verifiedStatus = await contractService.isCreatorCurrentlyVerified(req.params.address);
    } catch (_) { /* chain not available */ }

    res.json({ profile, portfolio, ratings, ratingSummary: avg, onchainRep, verifiedStatus });
  } catch (err) { next(err); }
});

router.put('/:address', requireAuth, async (req, res, next) => {
  try {
    const db = await getDb();
    const now = Math.floor(Date.now() / 1000);
    const { username, bio, avatarUrl, portfolioUrl, socialTwitter, socialInstagram, socialWebsite } = req.body;
    await db.run(`
      INSERT INTO profiles (address, username, bio, avatar_url, portfolio_url, social_twitter, social_instagram, social_website, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT(address) DO UPDATE SET
        username = COALESCE(EXCLUDED.username, username),
        bio = COALESCE(EXCLUDED.bio, bio),
        avatar_url = COALESCE(EXCLUDED.avatar_url, avatar_url),
        portfolio_url = COALESCE(EXCLUDED.portfolio_url, portfolio_url),
        social_twitter = COALESCE(EXCLUDED.social_twitter, social_twitter),
        social_instagram = COALESCE(EXCLUDED.social_instagram, social_instagram),
        social_website = COALESCE(EXCLUDED.social_website, social_website),
        updated_at = $9
    `, [req.params.address, username, bio, avatarUrl, portfolioUrl, socialTwitter, socialInstagram, socialWebsite, now]);
    const updated = await db.get('SELECT * FROM profiles WHERE address = $1', [req.params.address]);
    db.release();
    res.json(updated);
  } catch (err) { next(err); }
});

router.get('/:address/ratings', async (req, res, next) => {
  try {
    const db = await getDb();
    const ratings = await db.all('SELECT * FROM ratings WHERE target_address = $1 ORDER BY created_at DESC', [req.params.address]);
    const summary = await db.get('SELECT COALESCE(AVG(score), 0) as avg_score, COUNT(*) as count FROM ratings WHERE target_address = $1', [req.params.address]);
    db.release();
    res.json({ ratings, summary });
  } catch (err) { next(err); }
});

router.post('/:address/ratings', requireAuth, async (req, res, next) => {
  try {
    const db = await getDb();
    const { raterAddress, score, comment, commentHash, txId, projectId } = req.body;

    // Validation: required fields
    if (!raterAddress || !score || score < 1 || score > 5) {
      db.release();
      return res.status(400).json({ error: 'raterAddress and score (1-5) required' });
    }

    // Validation: cannot rate yourself
    if (raterAddress === req.params.address) {
      db.release();
      return res.status(400).json({ error: 'Cannot rate yourself' });
    }

    // Validation: duplicate rating prevention (rater + target + project)
    const existing = await db.get(
      'SELECT id FROM ratings WHERE rater_address = $1 AND target_address = $2 AND (project_id = $3 OR (project_id IS NULL AND $3 IS NULL))',
      [raterAddress, req.params.address, projectId || null]
    );
    if (existing) {
      db.release();
      return res.status(409).json({ error: 'You have already rated this user for this project' });
    }

    // Validation: eligibility — rater must have participated in a campaign with the target
    // Check if rater contributed to any campaign where target is creator
    const participation = await db.get(`
      SELECT 1 FROM campaigns
      WHERE creator_address = $1
      AND id IN (SELECT campaign_id FROM contributions WHERE contributor_address = $2)
      LIMIT 1
    `, [req.params.address, raterAddress]);
    if (!participation) {
      db.release();
      return res.status(403).json({ error: 'You must have contributed to a campaign by this creator to rate them' });
    }

    const created = await db.run(`
      INSERT INTO ratings (rater_address, target_address, score, comment, comment_hash, tx_id, project_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [raterAddress, req.params.address, score, comment, commentHash, txId, projectId]);
    await db.run(`
      INSERT INTO feed_events (event_type, event_data, actor, pool_id, tx_id)
      VALUES ($1, $2, $3, NULL, $4)
    `, ['rating_received', JSON.stringify({ score, summary: `${raterAddress.slice(0, 6)}… rated you ${score}/5` }), req.params.address, txId || null]);
    let chainResult = null;
    try {
      chainResult = await contractService.rateUser(
        req.params.address,
        projectId ? Number(projectId) : 0,
        score,
        commentHash || null
      );
      console.log(`[profiles] Chain rating: ${chainResult.explorer_url}`);
    } catch (chainErr) {
      console.warn(`[profiles] Chain rating failed (DB succeeded): ${chainErr.message}`);
    }
    db.release();
    const row = created.rows[0];
    res.status(201).json({ ...(row || { id: created.lastInsertRowid }), chain: chainResult });
  } catch (err) {
    if (err.message && (err.message.includes('UNIQUE') || err.message.includes('duplicate'))) {
      return res.status(409).json({ error: 'Rating already exists for this rater+project' });
    }
    next(err);
  }
});

router.get('/:address/portfolio', async (req, res, next) => {
  try {
    const db = await getDb();
    const items = await db.all('SELECT * FROM portfolio_items WHERE address = $1 ORDER BY year DESC', [req.params.address]);
    db.release();
    const parsed = items.map(i => ({ ...i, media_urls: tryParseJson(i.media_urls, []), awards: tryParseJson(i.awards, []) }));
    res.json(parsed);
  } catch (err) { next(err); }
});

router.post('/:address/portfolio', requireAuth, async (req, res, next) => {
  try {
    const db = await getDb();
    const { title, description, category, role, year, mediaUrls, awards, thumbnailUrl } = req.body;
    if (!title) { db.release(); return res.status(400).json({ error: 'title required' }); }
    const created = await db.run(`
      INSERT INTO portfolio_items (address, title, description, category, role, year, media_urls, awards, thumbnail_url)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `, [req.params.address, title, description, category, role, year, JSON.stringify(mediaUrls || []), JSON.stringify(awards || []), thumbnailUrl || null]);
    let chainResult = null;
    try {
      chainResult = await contractService.addPortfolio(
        title || 'Untitled',
        (mediaUrls && mediaUrls[0]) || '',
        description || '',
        year || new Date().getFullYear()
      );
      console.log(`[profiles] Chain portfolio added: ${chainResult.explorer_url}`);
    } catch (chainErr) {
      console.warn(`[profiles] Chain portfolio add failed (DB succeeded): ${chainErr.message}`);
    }
    db.release();
    const row = created.rows[0];
    if (row) {
      row.media_urls = tryParseJson(row.media_urls, []);
      row.awards = tryParseJson(row.awards, []);
    }
    res.status(201).json({ ...(row || { id: created.lastInsertRowid }), chain: chainResult });
  } catch (err) { next(err); }
});

router.put('/:address/portfolio/:id', requireAuth, async (req, res, next) => {
  try {
    const db = await getDb();
    const now = Math.floor(Date.now() / 1000);
    const { title, description, category, role, year, mediaUrls, awards, thumbnailUrl } = req.body;
    const result = await db.run(`
      UPDATE portfolio_items SET
        title = COALESCE($1, title), description = COALESCE($2, description),
        category = COALESCE($3, category), role = COALESCE($4, role),
        year = COALESCE($5, year), media_urls = COALESCE($6, media_urls),
        thumbnail_url = COALESCE($7, thumbnail_url), awards = COALESCE($8, awards), updated_at = $9
      WHERE id = $10 AND address = $11
    `, [title, description, category, role, year, mediaUrls ? JSON.stringify(mediaUrls) : null, thumbnailUrl || null, awards ? JSON.stringify(awards) : null, now, req.params.id, req.params.address]);
    if (result.changes === 0) { db.release(); return res.status(404).json({ error: 'Portfolio item not found' }); }
    const updated = await db.get('SELECT * FROM portfolio_items WHERE id = $1', [req.params.id]);
    db.release();
    if (updated) { updated.media_urls = tryParseJson(updated.media_urls, []); updated.awards = tryParseJson(updated.awards, []); }
    res.json(updated);
  } catch (err) { next(err); }
});

// GET /profiles/:address/reputation — on-chain reputation
router.get('/:address/reputation', async (req, res, next) => {
  try {
    const rating = await contractService.getAverageRating(req.params.address);
    const verified = await contractService.isCreatorCurrentlyVerified(req.params.address);
    const cap = await contractService.getCreatorFundingCap(req.params.address);
    const identity = await contractService.getCreatorIdentity(req.params.address);
    res.json({ rating, verified, fundingCap: cap, identity });
  } catch (err) { next(err); }
});

router.delete('/:address/portfolio/:id', async (req, res, next) => {
  try {
    const db = await getDb();
    const result = await db.run('DELETE FROM portfolio_items WHERE id = $1 AND address = $2', [req.params.id, req.params.address]);
    db.release();
    if (result.changes === 0) return res.status(404).json({ error: 'Portfolio item not found' });
    res.json({ deleted: true });
  } catch (err) { next(err); }
});

function tryParseJson(val, def) {
  if (!val) return def;
  try { return JSON.parse(val); } catch { return def; }
}

export default router;
