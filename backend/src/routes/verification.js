import { Router } from 'express';
import { getDb } from '../database.js';
import { requireAuth } from '../middleware/auth.js';
import contractService from '../services/contractService.js';

const router = Router();

router.get('/status/:address', async (req, res, next) => {
  try {
    const db = await getDb();
    const apps = await db.all('SELECT * FROM verification_applications WHERE applicant = $1 ORDER BY submitted_at DESC', [req.params.address]);
    const filmmakers = await db.all('SELECT * FROM verified_filmmakers WHERE address = $1', [req.params.address]);
    db.release();
    res.json({
      applied: apps.length > 0,
      applications: apps,
      verified: filmmakers.length > 0,
      filmmaker: filmmakers[0] || null,
    });
  } catch (err) { next(err); }
});

router.get('/filmmakers', async (req, res, next) => {
  try {
    const db = await getDb();
    const filmmakers = await db.all('SELECT * FROM verified_filmmakers ORDER BY verified_at DESC');
    db.release();
    res.json(filmmakers);
  } catch (err) { next(err); }
});

router.get('/pending', async (req, res, next) => {
  try {
    const db = await getDb();
    const apps = await db.all("SELECT * FROM verification_applications WHERE status IN ('pending', 'under-review') ORDER BY submitted_at ASC");
    db.release();
    res.json(apps);
  } catch (err) { next(err); }
});

router.post('/apply', requireAuth, async (req, res, next) => {
  try {
    const db = await getDb();
    const { applicant, name, bio, portfolio_url, previous_works, social_media, bond_amount } = req.body;
    if (!applicant || !name) { db.release(); return res.status(400).json({ error: 'applicant and name required' }); }
    const existing = await db.all("SELECT * FROM verification_applications WHERE applicant = $1 AND status IN ('pending', 'under-review')", [applicant]);
    if (existing.length > 0) { db.release(); return res.status(409).json({ error: 'You already have a pending application' }); }
    const now = Math.floor(Date.now() / 1000);
    const result = await db.run(`
      INSERT INTO verification_applications (applicant, name, bio, portfolio_url, previous_works, social_media, bond_amount, documents, status, submitted_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending', $9, $9)
    `, [applicant, name, bio || '', portfolio_url || '', JSON.stringify(previous_works || []), JSON.stringify(social_media || {}), bond_amount || '0', JSON.stringify({ identityProof: 'demo-id-upload' }), now]);
    const created = result.rows[0];
    if (created) {
      await db.run(`INSERT INTO feed_events (event_type, event_data, actor) VALUES ($1, $2, $3)`,
        ['verification_granted', JSON.stringify({ summary: `${name} applied for verification` }), applicant]);
    }
    db.release();
    res.status(201).json(created || { id: result.lastInsertRowid });
  } catch (err) { next(err); }
});

router.post('/:id/review', requireAuth, async (req, res, next) => {
  try {
    const db = await getDb();
    const { reviewer, approved, rejection_reason } = req.body;
    if (!reviewer) { db.release(); return res.status(400).json({ error: 'reviewer required' }); }
    const app = await db.get('SELECT * FROM verification_applications WHERE id = $1', [req.params.id]);
    if (!app) { db.release(); return res.status(404).json({ error: 'Application not found' }); }
    const now = Math.floor(Date.now() / 1000);
    let onchainTx = null;
    if (approved) {
      await db.run('UPDATE verification_applications SET status = $1, reviewed_at = $2, reviewer = $3, updated_at = $2 WHERE id = $4',
        ['approved', now, reviewer, req.params.id]);
      await db.run(`
        INSERT INTO verified_filmmakers (address, name, bio, portfolio_url, previous_works, social_media, verified_at, credibility_score, completed_campaigns, total_funded_amount)
        VALUES ($1, $2, $3, $4, $5, $6, $7, 75, 0, '0')
        ON CONFLICT(address) DO UPDATE SET name = $2, bio = $3, portfolio_url = $4, previous_works = $5, social_media = $6, verified_at = $7
      `, [app.applicant, app.name, app.bio || '', app.portfolio_url || '', app.previous_works, app.social_media, now]);

      // Attempt on-chain verification via emergency-verify-creator
      try {
        const expirationBlock = now + 52560 * 2; // ~2 years
        onchainTx = await contractService.emergencyVerifyCreator(app.applicant, expirationBlock);
      } catch (onchainErr) {
        console.warn('[verification] on-chain verify failed (user may need to register first):', onchainErr.message);
      }
    } else {
      await db.run('UPDATE verification_applications SET status = $1, reviewed_at = $2, reviewer = $3, rejection_reason = $4, updated_at = $2 WHERE id = $5',
        ['rejected', now, reviewer, rejection_reason || null, req.params.id]);
    }
    const updated = await db.get('SELECT * FROM verification_applications WHERE id = $1', [req.params.id]);
    db.release();
    res.json({ ...updated, onchainTx });
  } catch (err) { next(err); }
});

// GET /verification/onchain-status/:address — check on-chain verification state
router.get('/onchain-status/:address', async (req, res, next) => {
  try {
    const [identityData, verifiedData, capData] = await Promise.all([
      contractService.getCreatorIdentity(req.params.address).catch(() => null),
      contractService.isCreatorCurrentlyVerified(req.params.address).catch(() => null),
      contractService.getCreatorFundingCap(req.params.address).catch(() => null),
    ]);
    res.json({
      identity: identityData,
      verified: verifiedData,
      fundingCap: capData,
    });
  } catch (err) { next(err); }
});

// POST /verification/proxy-register — wallet-free Quick Register (backend signs for user)
router.post('/proxy-register', requireAuth, async (req, res, next) => {
  try {
    const db = await getDb();
    const { address, name, portfolioUrl, projectVertical, verificationLevel } = req.body;
    if (!address || !name) { db.release(); return res.status(400).json({ error: 'address and name required' }); }

    // DB write first (dual-write pattern)
    const now = Math.floor(Date.now() / 1000);
    await db.run(`
      INSERT INTO profiles (address, username, bio, portfolio_url, updated_at)
      VALUES ($1, $2, '', $3, $4)
      ON CONFLICT(address) DO UPDATE SET username = COALESCE($2, username), updated_at = $4
    `, [address, name, portfolioUrl || '', now]);
    db.release();

    let chainResult = null;
    try {
      chainResult = await contractService.proxyRegisterCreator(
        address,
        name,
        portfolioUrl || '',
        projectVertical || 'film',
        verificationLevel || 1,
      );
    } catch (chainErr) {
      console.warn(`[verification] Chain proxy-register failed (DB succeeded): ${chainErr.message}`);
    }

    res.json({ status: 'registered', db: true, chain: chainResult });
  } catch (err) { next(err); }
});

// POST /verification/notify-registered — frontend calls after user registers on-chain via wallet
router.post('/notify-registered', requireAuth, async (req, res, next) => {
  try {
    const { address } = req.body;
    if (!address) return res.status(400).json({ error: 'address required' });
    const now = Math.floor(Date.now() / 1000);
    const expirationBlock = now + 52560 * 2;
    const result = await contractService.emergencyVerifyCreator(address, expirationBlock);
    res.json({ status: 'broadcast', ...result });
  } catch (err) { next(err); }
});

export default router;
