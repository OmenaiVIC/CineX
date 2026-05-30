import { Router } from 'express';
import { getDb } from '../database.js';
import contractService from '../services/contractService.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.get('/', async (req, res, next) => {
  try {
    const db = await getDb();
    const { status, creator, search } = req.query;
    let where = 'WHERE 1=1';
    const params = [];
    if (status) { where += ' AND status = $' + (params.length + 1); params.push(status); }
    if (creator) { where += ' AND creator = $' + (params.length + 1); params.push(creator); }
    if (search) { where += ' AND (title ILIKE $' + (params.length + 1) + ' OR description ILIKE $' + (params.length + 2) + ')'; params.push(`%${search}%`, `%${search}%`); }
    const campaigns = await db.all('SELECT * FROM campaigns ' + where + ' ORDER BY created_at DESC', params);
    const parsed = campaigns.map(c => ({ ...c, tags: tryParseJson(c.tags, []), media_urls: tryParseJson(c.media_urls, []) }));
    const totalRow = await db.get('SELECT COUNT(*) as count FROM campaigns ' + where, params);
    db.release();
    res.json({ campaigns: parsed, total: totalRow?.count || 0 });
  } catch (err) { next(err); }
});

router.get('/creator/:address', async (req, res, next) => {
  try {
    const db = await getDb();
    const campaigns = await db.all('SELECT * FROM campaigns WHERE creator = $1 ORDER BY created_at DESC', [req.params.address]);
    const parsed = campaigns.map(c => ({ ...c, tags: tryParseJson(c.tags, []), media_urls: tryParseJson(c.media_urls, []) }));
    db.release();
    res.json(parsed);
  } catch (err) { next(err); }
});

router.get('/total-raised', async (req, res, next) => {
  try {
    const db = await getDb();
    const row = await db.get('SELECT COALESCE(SUM(CAST(current_amount AS BIGINT)), 0) as total FROM campaigns');
    db.release();
    res.json({ total: row?.total?.toString() || '0' });
  } catch (err) { next(err); }
});

router.get('/active-count', async (req, res, next) => {
  try {
    const db = await getDb();
    const row = await db.get("SELECT COUNT(*) as count FROM campaigns WHERE status = 'active'");
    db.release();
    res.json({ count: row?.count || 0 });
  } catch (err) { next(err); }
});

router.get('/:id/chain-state', async (req, res, next) => {
  try {
    const escrow = await contractService.getCampaignFromEscrow(Number(req.params.id));
    const mod = await contractService.getCampaignFromModule(Number(req.params.id));
    res.json({ escrow, module: mod });
  } catch (err) { next(err); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const db = await getDb();
    const campaign = await db.get('SELECT * FROM campaigns WHERE id = $1', [req.params.id]);
    if (!campaign) { db.release(); return res.status(404).json({ error: 'Campaign not found' }); }
    campaign.tags = tryParseJson(campaign.tags, []);
    campaign.media_urls = tryParseJson(campaign.media_urls, []);
    const contributions = await db.all('SELECT * FROM contributions WHERE campaign_id = $1 ORDER BY created_at DESC', [campaign.id]);
    db.release();
    res.json({ campaign, contributions });
  } catch (err) { next(err); }
});

router.post('/', requireAuth, async (req, res, next) => {
  try {
    const db = await getDb();
    const { title, description, creator, target_amount, deadline, category, media_urls, tags } = req.body;
    if (!title || !creator || !target_amount) { db.release(); return res.status(400).json({ error: 'title, creator, and target_amount required' }); }
    const now = Math.floor(Date.now() / 1000);
    const result = await db.run(`
      INSERT INTO campaigns (title, description, creator, target_amount, current_amount, deadline, category, status, media_urls, tags, created_at, updated_at)
      VALUES ($1, $2, $3, $4, '0', $5, $6, 'active', $7, $8, $9, $9)
    `, [title, description || '', creator, target_amount || 0, deadline || 0, category || 'short-film', JSON.stringify(media_urls || []), JSON.stringify(tags || []), now]);
    const created = result.rows[0] || { id: result.lastInsertRowid };
    const campaignId = created.id;
    if (created) {
      await db.run(`INSERT INTO feed_events (event_type, event_data, actor, campaign_id) VALUES ($1, $2, $3, $4)`,
        ['campaign_created', JSON.stringify({ summary: `Campaign '${title}' launched` }), creator, campaignId]);
    }
    let chainResult = null;
    try {
      chainResult = await contractService.createCampaignInModule(
        `${title}: ${(description || '').slice(0, 200)}`,
        Number(target_amount),
        2592000,
        1,
        'Standard'
      );
      console.log(`[campaigns] Chain campaign created: ${chainResult.explorer_url}`);
    } catch (chainErr) {
      console.warn(`[campaigns] Chain campaign creation failed (DB insert succeeded): ${chainErr.message}`);
    }
    db.release();
    res.status(201).json({ ...created, chain: chainResult });
  } catch (err) { next(err); }
});

router.get('/:id/contributions', async (req, res, next) => {
  try {
    const db = await getDb();
    const contributions = await db.all('SELECT * FROM contributions WHERE campaign_id = $1 ORDER BY created_at DESC', [req.params.id]);
    db.release();
    res.json(contributions);
  } catch (err) { next(err); }
});

router.post('/:id/contribute', requireAuth, async (req, res, next) => {
  try {
    const db = await getDb();
    const { contributor, amount, message } = req.body;
    if (!contributor || !amount) { db.release(); return res.status(400).json({ error: 'contributor and amount required' }); }
    const campaign = await db.get('SELECT * FROM campaigns WHERE id = $1', [req.params.id]);
    if (!campaign) { db.release(); return res.status(404).json({ error: 'Campaign not found' }); }
    const now = Math.floor(Date.now() / 1000);
    const txId = `tx_cont_${now}_${Math.random().toString(36).slice(2, 8)}`;
    await db.run('INSERT INTO contributions (campaign_id, contributor, amount, tx_id, message, created_at) VALUES ($1, $2, $3, $4, $5, $6)',
      [req.params.id, contributor, amount, txId, message || null, now]);
    const newAmount = (Number(campaign.current_amount) + Number(amount)).toString();
    const newStatus = Number(newAmount) >= Number(campaign.target_amount) ? 'funded' : campaign.status;
    await db.run('UPDATE campaigns SET current_amount = $1, status = $2, updated_at = $3 WHERE id = $4',
      [newAmount, newStatus, now, req.params.id]);
    await db.run(`INSERT INTO feed_events (event_type, event_data, actor, campaign_id) VALUES ($1, $2, $3, $4)`,
      ['campaign_funded', JSON.stringify({ summary: `Contribution of ${amount} received` }), contributor, req.params.id]);
    let chainResult = null;
    try {
      chainResult = await contractService.contribute(Number(req.params.id), Number(amount));
      console.log(`[campaigns] Chain contribution: ${chainResult.explorer_url}`);
    } catch (chainErr) {
      console.warn(`[campaigns] Chain contribution failed (DB succeed): ${chainErr.message}`);
    }
    db.release();
    res.status(201).json({ txId, campaignId: req.params.id, amount, chain: chainResult });
  } catch (err) { next(err); }
});

router.get('/contributor/:address', async (req, res, next) => {
  try {
    const db = await getDb();
    const contributions = await db.all('SELECT * FROM contributions WHERE contributor = $1 ORDER BY created_at DESC', [req.params.address]);
    db.release();
    res.json(contributions);
  } catch (err) { next(err); }
});

router.get('/user/:address/total-contributed', async (req, res, next) => {
  try {
    const db = await getDb();
    const row = await db.get('SELECT COALESCE(SUM(CAST(amount AS BIGINT)), 0) as total FROM contributions WHERE contributor = $1', [req.params.address]);
    db.release();
    res.json({ total: row?.total?.toString() || '0' });
  } catch (err) { next(err); }
});

// GET /campaigns/creator/:address/contributions — all contributions across a creator's campaigns
router.get('/creator/:address/contributions', async (req, res, next) => {
  try {
    const db = await getDb();
    const contributions = await db.all(`
      SELECT c.id, c.campaign_id, c.contributor, c.amount, c.message, c.tx_id, c.created_at
      FROM contributions c
      INNER JOIN campaigns ca ON ca.id = c.campaign_id
      WHERE ca.creator = $1
      ORDER BY c.created_at DESC
    `, [req.params.address]);
    db.release();
    res.json({ contributions });
  } catch (err) { next(err); }
});

// POST /campaigns/:id/claim-funds — creator claims raised funds after goal met
// Calls milestone-escrow directly (withdraw-from-campaign + collect-campaign-fee are unguarded)
router.post('/:id/claim-funds', requireAuth, async (req, res, next) => {
  try {
    const db = await getDb();
    const campaign = await db.get('SELECT * FROM campaigns WHERE id = $1', [req.params.id]);
    if (!campaign) { db.release(); return res.status(404).json({ error: 'Campaign not found' }); }
    if (campaign.funds_claimed) { db.release(); return res.status(400).json({ error: 'Funds already claimed' }); }
    const raised = Number(campaign.current_amount);
    const target = Number(campaign.target_amount);
    if (raised < target) { db.release(); return res.status(400).json({ error: 'Funding goal not yet reached' }); }

    const feePct = 5;
    const feeAmount = Math.floor(raised * feePct / 100);
    const netAmount = raised - feeAmount;
    const now = Math.floor(Date.now() / 1000);

    let chainResult = null;
    try {
      const withdrawTx = await contractService.withdrawFromCampaign(Number(req.params.id), netAmount);
      const feeTx = await contractService.collectCampaignFee(Number(req.params.id), feeAmount);
      chainResult = { withdraw: withdrawTx, fee: feeTx };
      console.log(`[campaigns] Chain claim-funds: ${JSON.stringify(chainResult)}`);
    } catch (chainErr) {
      console.warn(`[campaigns] Chain claim-funds failed (DB succeeded): ${chainErr.message}`);
    }

    await db.run('UPDATE campaigns SET funds_claimed = 1, status = $1, updated_at = $2 WHERE id = $3',
      ['completed', now, req.params.id]);
    await db.run(`INSERT INTO feed_events (event_type, event_data, actor, campaign_id) VALUES ($1, $2, $3, $4)`,
      ['campaign_funded', JSON.stringify({ summary: `Campaign funds claimed — ₦${netAmount.toLocaleString()} to creator, ₦${feeAmount.toLocaleString()} fee` }), campaign.creator, req.params.id]);
    const updated = await db.get('SELECT * FROM campaigns WHERE id = $1', [req.params.id]);
    db.release();
    res.json({ ...updated, chain: chainResult });
  } catch (err) { next(err); }
});

function tryParseJson(val, def) {
  if (!val) return def;
  try { return JSON.parse(val); } catch { return def; }
}

export default router;
