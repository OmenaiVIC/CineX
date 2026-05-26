import { Router } from 'express';
import contractService from '../services/contractService.js';

const router = Router();

// Demo campaign configuration — IDs are aligned after script runs
const DEMO_CAMPAIGNS = [
  {
    id: 21,
    title: 'Rain',
    description: 'A cinematic exploration of urban isolation',
    goal: 200000000,
    milestones: [
      { index: 0, name: 'Pre-production', amount: 50000000 },
      { index: 1, name: 'Production', amount: 50000000 },
      { index: 2, name: 'Post-production', amount: 100000000 },
    ],
    creator: 'Maria Chen',
  },
  {
    id: 22,
    title: 'Death of Eternity',
    description: 'A sci-fi thriller about mortality',
    goal: 150000000,
    milestones: [
      { index: 0, name: 'Script & Storyboard', amount: 30000000 },
      { index: 1, name: 'Principal Photography', amount: 70000000 },
      { index: 2, name: 'VFX & Editing', amount: 50000000 },
    ],
    creator: 'James Okafor',
  },
  {
    id: 23,
    title: 'PrePARE VR',
    description: 'VR training for emergency responders',
    goal: 300000000,
    milestones: [
      { index: 0, name: 'Prototype', amount: 60000000 },
      { index: 1, name: 'User Testing', amount: 90000000 },
      { index: 2, name: 'Production Release', amount: 150000000 },
    ],
    creator: 'Akira Tanaka',
  },
  {
    id: 24,
    title: 'Northern Travels',
    description: 'A documentary on Arctic indigenous communities',
    goal: 120000000,
    milestones: [
      { index: 0, name: 'Research', amount: 24000000 },
      { index: 1, name: 'Expedition', amount: 48000000 },
      { index: 2, name: 'Post-production', amount: 48000000 },
    ],
    creator: 'Elena Vasquez',
  },
];

// GET /api/demo/campaigns — fetch live state from chain for all campaigns
router.get('/campaigns', async (req, res) => {
  try {
    const results = await Promise.all(DEMO_CAMPAIGNS.map(async (camp) => {
      const [raised, escrowData] = await Promise.all([
        contractService.getTotalRaised(camp.id).catch(() => 0),
        contractService.getEscrowCampaign(camp.id).catch(() => null),
      ]);

      const milestoneStates = await Promise.all(
        camp.milestones.map(async (ms) => {
          const state = await contractService.getMilestoneState(camp.id, ms.index).catch(() => null);
          return {
            index: ms.index,
            name: ms.name,
            amount: ms.amount,
            approved: state?.approved || false,
            released: state?.released || false,
          };
        })
      );

      const allReleased = milestoneStates.every((ms) => ms.released);
      const anyApproved = milestoneStates.some((ms) => ms.approved);
      const status = allReleased ? 'completed' : raised >= camp.goal ? 'milestones' : 'funding';

      return {
        id: camp.id,
        title: camp.title,
        description: camp.description,
        creator: camp.creator,
        goal: camp.goal,
        raised,
        milestones: milestoneStates,
        status,
        explorer_url: `https://explorer.hiro.so/address/${encodeURIComponent('ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.campaign-module-2')}?chain=testnet`,
      };
    }));
    res.json({ campaigns: results });
  } catch (err) {
    console.error('[demo] Error fetching campaigns:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/demo/contribute
router.post('/contribute', async (req, res) => {
  try {
    const { campaignId, amountUstx } = req.body;
    if (!campaignId || !amountUstx) {
      return res.status(400).json({ error: 'campaignId and amountUstx required' });
    }
    // Step-by-step: diagnose where it fails
    res.setHeader('X-Debug-1', 'starting');
    let result;
    try {
      result = await contractService.contribute(campaignId, amountUstx);
    } catch (callErr) {
      const callMsg = (callErr && callErr.message) ? callErr.message : String(callErr);
      res.setHeader('X-Debug-Err', callMsg.substring(0,200));
      console.error('[demo] contribute call error:', callMsg);
      return res.status(500).json({ error: callMsg });
    }
    res.setHeader('X-Debug-2', 'success');
    return res.json({ status: 'broadcast', ...result });
  } catch (err) {
    console.error('[demo] contribute outer fatal:', err);
    try { res.status(500).json({ error: 'Outer fatal - see logs' }); } catch (e) {}
  }
});

// POST /api/demo/submit-proof
router.post('/submit-proof', async (req, res) => {
  try {
    const { campaignId, milestoneIndex } = req.body;
    if (campaignId === undefined || milestoneIndex === undefined) {
      return res.status(400).json({ error: 'campaignId and milestoneIndex required' });
    }
    const result = await contractService.submitProof(campaignId, milestoneIndex);
    res.json({ status: 'broadcast', ...result });
  } catch (err) {
    try {
      const msg = (err && err.message) ? err.message : String(err);
      console.error('[demo] submit-proof error:', msg);
      res.status(500).json({ error: msg });
    } catch (err2) {
      console.error('[demo] submit-proof catch crash:', err2);
      res.status(500).json({ error: 'Unknown error (see server logs)' });
    }
  }
});

// POST /api/demo/approve
router.post('/approve', async (req, res) => {
  try {
    const { campaignId, milestoneIndex } = req.body;
    if (campaignId === undefined || milestoneIndex === undefined) {
      return res.status(400).json({ error: 'campaignId and milestoneIndex required' });
    }
    const result = await contractService.approve(campaignId, milestoneIndex);
    res.json({ status: 'broadcast', ...result });
  } catch (err) {
    console.error('[demo] approve error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/demo/release
router.post('/release', async (req, res) => {
  try {
    const { campaignId, milestoneIndex } = req.body;
    if (campaignId === undefined || milestoneIndex === undefined) {
      return res.status(400).json({ error: 'campaignId and milestoneIndex required' });
    }
    const result = await contractService.release(campaignId, milestoneIndex);
    res.json({ status: 'broadcast', ...result });
  } catch (err) {
    console.error('[demo] release error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/demo/ping-hiro — test Hiro API connectivity
router.get('/ping-hiro', async (req, res) => {
  try {
    const resp = await fetch('https://api.testnet.hiro.so/v2/info');
    const data = await resp.json();
    res.json({ ok: true, peer_version: data.peer_version, burn_block_height: data.burn_block_height });
  } catch (err) {
    res.json({ ok: false, error: (err && err.message) ? err.message : String(err) });
  }
});

// GET /api/demo/test-broadcast — test transaction broadcast
router.get('/test-broadcast', async (req, res) => {
  try {
    const info = await contractService.testBroadcast();
    res.json(info);
  } catch (err) {
    res.json({ error: (err && err.message) ? err.message : String(err) });
  }
});

// GET /api/demo/debug — diagnostic endpoint
router.get('/debug', (req, res) => {
  const state = {
    initialized: contractService.getState ? contractService.getState() : null,
    creatorKeySet: !!process.env.CREATOR_KEY,
    backerKeySet: !!process.env.BACKER_KEY,
    creatorKeyLen: process.env.CREATOR_KEY ? process.env.CREATOR_KEY.length : 0,
    backerKeyLen: process.env.BACKER_KEY ? process.env.BACKER_KEY.length : 0,
    hasNetwork: !!contractService.getNetwork(),
  };
  state.networkInfo = contractService.getNetwork() ? { hasNetwork: true } : { hasNetwork: false };
  res.json(state);
});

// GET /api/demo/status/:txHash
router.get('/status/:txHash', async (req, res) => {
  try {
    const result = await contractService.getTxStatus(req.params.txHash);
    res.json(result);
  } catch (err) {
    console.error('[demo] status error:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
