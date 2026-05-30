import { Router } from 'express';
import { getDb } from '../database.js';
import contractService from '../services/contractService.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// GET /pools — list pools
router.get('/', async (req, res, next) => {
  try {
    const db = await getDb();
    const offset = parseInt(req.query.offset) || 0;
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const { category, status, search } = req.query;

    let where = 'WHERE 1=1';
    const params = [];
    if (category) { where += ' AND category = $' + (params.length + 1); params.push(category); }
    if (status) { where += ' AND status = $' + (params.length + 1); params.push(status); }
    if (search) { where += ' AND (name LIKE $' + (params.length + 1) + ' OR description LIKE $' + (params.length + 2) + ')'; params.push(`%${search}%`, `%${search}%`); }

    const totalRow = await db.get('SELECT COUNT(*) as count FROM pools ' + where, params);
    const total = totalRow?.count || 0;

    params.push(limit, offset);
    const pools = await db.all('SELECT * FROM pools ' + where + ' ORDER BY created_at DESC LIMIT $' + (params.length - 1) + ' OFFSET $' + params.length, params);

    const enriched = [];
    for (const p of pools) {
      const mc = await db.get('SELECT COUNT(*) as count FROM pool_members WHERE pool_id = $1', [p.id]);
      enriched.push({ ...p, current_members: mc?.count || 0 });
    }
    db.release();
    res.json({ pools: enriched, pagination: { offset, limit, total } });
  } catch (err) { next(err); }
});

// GET /pools/:id — get pool details + members
router.get('/:id', async (req, res, next) => {
  try {
    const db = await getDb();
    const pool = await db.get('SELECT * FROM pools WHERE id = $1', [req.params.id]);
    if (!pool) { db.release(); return res.status(404).json({ error: 'Pool not found' }); }
    const members = await db.all('SELECT * FROM pool_members WHERE pool_id = $1 ORDER BY joined_at ASC', [pool.id]);
    const proposals = await db.all('SELECT * FROM pool_proposals WHERE pool_id = $1 ORDER BY created_at DESC', [pool.id]);
    db.release();

    let chainPool = null;
    try {
      chainPool = await contractService.getPoolFromContract(Number(req.params.id));
    } catch (_) { /* chain may not exist */ }

    res.json({ pool, members, proposals, chain: chainPool });
  } catch (err) { next(err); }
});

// GET /pools/:id/members — list members
router.get('/:id/members', async (req, res, next) => {
  try {
    const db = await getDb();
    const members = await db.all('SELECT * FROM pool_members WHERE pool_id = $1 ORDER BY joined_at ASC', [req.params.id]);
    db.release();
    res.json(members);
  } catch (err) { next(err); }
});

// GET /pools/:id/proposals — list proposals for a pool
router.get('/:id/proposals', async (req, res, next) => {
  try {
    const db = await getDb();
    const proposals = await db.all('SELECT * FROM pool_proposals WHERE pool_id = $1 ORDER BY created_at DESC', [req.params.id]);
    db.release();
    res.json(proposals);
  } catch (err) { next(err); }
});

// GET /pools/:id/member/:address — get member info
router.get('/:id/member/:address', async (req, res, next) => {
  try {
    const db = await getDb();
    const member = await db.get('SELECT * FROM pool_members WHERE pool_id = $1 AND address = $2', [req.params.id, req.params.address]);
    db.release();
    if (!member) return res.status(404).json({ error: 'Not a member' });
    res.json(member);
  } catch (err) { next(err); }
});

// POST /pools — create pool
router.post('/', requireAuth, async (req, res, next) => {
  try {
    const db = await getDb();
    const { name, description, creator, target_amount, min_commitment, max_members, deadline, category, return_rate } = req.body;
    if (!name || !creator || !target_amount) { db.release(); return res.status(400).json({ error: 'name, creator, and target_amount are required' }); }
    const now = Math.floor(Date.now() / 1000);
    const result = await db.run(`
      INSERT INTO pools (name, description, creator, target_amount, current_amount, min_commitment, max_members, deadline, category, status, return_rate, created_at, updated_at)
      VALUES ($1, $2, $3, $4, '0', $5, $6, $7, $8, 'open', $9, $10, $10)
    `, [name, description || '', creator, target_amount, min_commitment || '0', max_members || 10, deadline || 0, category || 'short-film', return_rate || null, now]);
    const created = result.rows[0] || { id: result.lastInsertRowid };

    let chainResult = null;
    try {
      chainResult = await contractService.createPoolInContract(
        name.slice(0, 64),
        Number(target_amount),
        Number(min_commitment) || 1,
        50,
        86400,
        max_members || 10,
      );
      console.log(`[pools] Chain pool created: ${chainResult.explorer_url}`);
    } catch (chainErr) {
      console.warn(`[pools] Chain pool creation failed (DB succeeded): ${chainErr.message}`);
    }

    if (created) {
      await db.run(`INSERT INTO feed_events (event_type, event_data, actor, pool_id) VALUES ($1, $2, $3, $4)`,
        ['pool_formed', JSON.stringify({ summary: `New pool '${name}' has been formed.` }), creator, created.id]);
    }
    db.release();
    res.status(201).json({ ...created, chain: chainResult });
  } catch (err) { next(err); }
});

// POST /pools/:id/join — join pool
router.post('/:id/join', requireAuth, async (req, res, next) => {
  try {
    const db = await getDb();
    const { address, amount } = req.body;
    if (!address || !amount) { db.release(); return res.status(400).json({ error: 'address and amount are required' }); }
    const pool = await db.get('SELECT * FROM pools WHERE id = $1', [req.params.id]);
    if (!pool) { db.release(); return res.status(404).json({ error: 'Pool not found' }); }
    if (pool.status !== 'open') { db.release(); return res.status(400).json({ error: 'Pool is not open for joining' }); }
    const existing = await db.get('SELECT * FROM pool_members WHERE pool_id = $1 AND address = $2', [pool.id, address]);
    if (existing) { db.release(); return res.status(409).json({ error: 'Already a member' }); }
    const result = await db.run('INSERT INTO pool_members (pool_id, address, committed, role) VALUES ($1, $2, $3, $4)', [pool.id, address, amount, 'member']);
    await db.run('UPDATE pools SET current_amount = CAST(CAST(current_amount AS INTEGER) + CAST($1 AS INTEGER) AS TEXT) WHERE id = $2', [amount.toString(), pool.id]);

    let chainResult = null;
    try {
      chainResult = await contractService.joinPoolInContract(Number(req.params.id), Number(amount));
      console.log(`[pools] Chain join pool: ${chainResult.explorer_url}`);
    } catch (chainErr) {
      console.warn(`[pools] Chain join pool failed (DB succeeded): ${chainErr.message}`);
    }

    db.release();
    res.status(201).json({ ...(result.rows[0] || { id: result.lastInsertRowid }), chain: chainResult });
  } catch (err) { next(err); }
});

// POST /pools/:id/contribute — contribute funds to pool
router.post('/:id/contribute', requireAuth, async (req, res, next) => {
  try {
    const db = await getDb();
    const { address, amount } = req.body;
    if (!address || !amount) { db.release(); return res.status(400).json({ error: 'address and amount are required' }); }
    const pool = await db.get('SELECT * FROM pools WHERE id = $1', [req.params.id]);
    if (!pool) { db.release(); return res.status(404).json({ error: 'Pool not found' }); }

    let chainResult = null;
    try {
      chainResult = await contractService.contributeToPoolContract(Number(req.params.id), Number(amount));
      console.log(`[pools] Chain contribute: ${chainResult.explorer_url}`);
    } catch (chainErr) {
      console.warn(`[pools] Chain contribute failed (DB succeeded): ${chainErr.message}`);
    }

    await db.run('UPDATE pools SET current_amount = CAST(CAST(current_amount AS INTEGER) + CAST($1 AS INTEGER) AS TEXT) WHERE id = $2', [amount.toString(), req.params.id]);
    db.release();
    res.json({ status: 'ok', chain: chainResult });
  } catch (err) { next(err); }
});

// POST /pools/:id/proposals — create allocation proposal
router.post('/:id/proposals', requireAuth, async (req, res, next) => {
  try {
    const db = await getDb();
    const { proposer, campaign_id, amount, description } = req.body;
    if (!proposer || !campaign_id || !amount) { db.release(); return res.status(400).json({ error: 'proposer, campaign_id, and amount are required' }); }
    const now = Math.floor(Date.now() / 1000);

    const result = await db.run(`
      INSERT INTO pool_proposals (pool_id, campaign_id, amount, proposer, description, status, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, 'active', $6, $6)
    `, [req.params.id, campaign_id, amount, proposer, description || '', now]);

    let chainResult = null;
    try {
      chainResult = await contractService.proposeAllocation(Number(req.params.id), Number(campaign_id), Number(amount));
      console.log(`[pools] Chain proposal: ${chainResult.explorer_url}`);
    } catch (chainErr) {
      console.warn(`[pools] Chain proposal failed (DB succeeded): ${chainErr.message}`);
    }

    const created = result.rows[0] || { id: result.lastInsertRowid };
    db.release();
    res.status(201).json({ ...created, chain: chainResult });
  } catch (err) { next(err); }
});

// GET /pools/proposals/:id — get proposal details
router.get('/proposals/:id', async (req, res, next) => {
  try {
    const db = await getDb();
    const proposal = await db.get('SELECT * FROM pool_proposals WHERE id = $1', [req.params.id]);
    if (!proposal) { db.release(); return res.status(404).json({ error: 'Proposal not found' }); }
    const votes = await db.all('SELECT * FROM proposal_votes WHERE proposal_id = $1 ORDER BY created_at DESC', [proposal.id]);
    db.release();

    let chainProposal = null;
    try {
      chainProposal = await contractService.getProposalFromContract(Number(req.params.id));
    } catch (_) { /* chain may not exist */ }

    res.json({ proposal, votes, chain: chainProposal });
  } catch (err) { next(err); }
});

// POST /pools/proposals/:id/vote — vote on proposal
router.post('/proposals/:id/vote', requireAuth, async (req, res, next) => {
  try {
    const db = await getDb();
    const { voter, approve, weight } = req.body;
    if (!voter || approve === undefined) { db.release(); return res.status(400).json({ error: 'voter and approve are required' }); }
    const proposal = await db.get('SELECT * FROM pool_proposals WHERE id = $1', [req.params.id]);
    if (!proposal) { db.release(); return res.status(404).json({ error: 'Proposal not found' }); }
    const existing = await db.get('SELECT * FROM proposal_votes WHERE proposal_id = $1 AND voter = $2', [proposal.id, voter]);
    if (existing) { db.release(); return res.status(409).json({ error: 'Already voted' }); }

    const now = Math.floor(Date.now() / 1000);
    const voteWeight = weight || 1;
    await db.run('INSERT INTO proposal_votes (proposal_id, voter, approve, weight, created_at) VALUES ($1, $2, $3, $4, $5)',
      [proposal.id, voter, approve ? 1 : 0, voteWeight, now]);

    const forVotes = await db.get('SELECT COALESCE(SUM(weight),0) as total FROM proposal_votes WHERE proposal_id = $1 AND approve = 1', [proposal.id]);
    const againstVotes = await db.get('SELECT COALESCE(SUM(weight),0) as total FROM proposal_votes WHERE proposal_id = $1 AND approve = 0', [proposal.id]);
    const totalVotes = Number(forVotes?.total || 0) + Number(againstVotes?.total || 0);
    const autoApproved = totalVotes > 0 && Number(forVotes?.total || 0) > Number(againstVotes?.total || 0);

    let chainResult = null;
    try {
      chainResult = await contractService.voteOnProposal(Number(req.params.id), approve);
      console.log(`[pools] Chain vote: ${chainResult.explorer_url}`);
    } catch (chainErr) {
      console.warn(`[pools] Chain vote failed (DB succeeded): ${chainErr.message}`);
    }

    if (autoApproved) {
      await db.run('UPDATE pool_proposals SET status = $1, updated_at = $2 WHERE id = $3', ['passed', now, proposal.id]);
    }
    db.release();
    res.json({ voted: true, autoApproved, chain: chainResult });
  } catch (err) { next(err); }
});

// POST /pools/proposals/:id/execute — execute passed proposal
router.post('/proposals/:id/execute', requireAuth, async (req, res, next) => {
  try {
    const db = await getDb();
    const proposal = await db.get('SELECT * FROM pool_proposals WHERE id = $1', [req.params.id]);
    if (!proposal) { db.release(); return res.status(404).json({ error: 'Proposal not found' }); }
    if (proposal.status !== 'passed') { db.release(); return res.status(400).json({ error: 'Proposal not passed' }); }

    let chainResult = null;
    try {
      chainResult = await contractService.executeAllocation(Number(req.params.id));
      console.log(`[pools] Chain execute: ${chainResult.explorer_url}`);
    } catch (chainErr) {
      console.warn(`[pools] Chain execute failed (DB succeeded): ${chainErr.message}`);
    }

    const now = Math.floor(Date.now() / 1000);
    await db.run('UPDATE pool_proposals SET status = $1, updated_at = $2 WHERE id = $3', ['executed', now, proposal.id]);
    db.release();
    res.json({ status: 'executed', chain: chainResult });
  } catch (err) { next(err); }
});

// POST /pools/:id/close — close pool
router.post('/:id/close', requireAuth, async (req, res, next) => {
  try {
    const db = await getDb();
    const pool = await db.get('SELECT * FROM pools WHERE id = $1', [req.params.id]);
    if (!pool) { db.release(); return res.status(404).json({ error: 'Pool not found' }); }

    let chainResult = null;
    try {
      chainResult = await contractService.closePoolInContract(Number(req.params.id));
      console.log(`[pools] Chain close: ${chainResult.explorer_url}`);
    } catch (chainErr) {
      console.warn(`[pools] Chain close failed (DB succeeded): ${chainErr.message}`);
    }

    const now = Math.floor(Date.now() / 1000);
    await db.run('UPDATE pools SET status = $1, updated_at = $2 WHERE id = $3', ['closed', now, req.params.id]);
    db.release();
    res.json({ status: 'closed', chain: chainResult });
  } catch (err) { next(err); }
});

// POST /pools/:id/withdraw — withdraw unused funds
router.post('/:id/withdraw', requireAuth, async (req, res, next) => {
  try {
    const db = await getDb();
    const { address, amount } = req.body;
    if (!address || !amount) { db.release(); return res.status(400).json({ error: 'address and amount are required' }); }

    let chainResult = null;
    try {
      chainResult = await contractService.withdrawUnused(Number(req.params.id), Number(amount));
      console.log(`[pools] Chain withdraw: ${chainResult.explorer_url}`);
    } catch (chainErr) {
      console.warn(`[pools] Chain withdraw failed (DB succeeded): ${chainErr.message}`);
    }

    db.release();
    res.json({ status: 'ok', chain: chainResult });
  } catch (err) { next(err); }
});

export default router;
