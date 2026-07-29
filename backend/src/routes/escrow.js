import { Router } from 'express';
import contractService from '../services/contractService.js';
import * as disbursementService from '../services/bos/disbursementService.js';
import { getDb } from '../database.js';

const router = Router();

router.post('/milestone-proof', async (req, res, next) => {
  try {
    const { campaignId, milestoneIndex } = req.body;
    if (campaignId === undefined || milestoneIndex === undefined) {
      return res.status(400).json({ error: 'campaignId and milestoneIndex required' });
    }
    const result = await contractService.submitProof(Number(campaignId), Number(milestoneIndex));
    res.json({ status: 'broadcast', ...result });
  } catch (err) { next(err); }
});

router.post('/approve-milestone', async (req, res, next) => {
  try {
    const { campaignId, milestoneIndex } = req.body;
    if (campaignId === undefined || milestoneIndex === undefined) {
      return res.status(400).json({ error: 'campaignId and milestoneIndex required' });
    }
    const result = await contractService.approve(Number(campaignId), Number(milestoneIndex));
    res.json({ status: 'broadcast', ...result });
  } catch (err) { next(err); }
});

router.post('/release-milestone', async (req, res, next) => {
  try {
    const { campaignId, milestoneIndex, amount_usdcx } = req.body;
    if (campaignId === undefined || milestoneIndex === undefined) {
      return res.status(400).json({ error: 'campaignId and milestoneIndex required' });
    }
    const result = await contractService.release(Number(campaignId), Number(milestoneIndex));

    try {
      if (amount_usdcx && Number(amount_usdcx) > 0) {
        const campaign = await contractService.getEscrowCampaign(Number(campaignId));
        const creatorAddress = campaign?.creator || campaign?.['creator'];
        if (creatorAddress) {
          const db = await getDb();
          const profile = await db.get(`SELECT * FROM profiles WHERE address = $1`, [creatorAddress]);
          await disbursementService.initiateDisbursement({
            campaign_id: String(campaignId),
            amount_usd: 0,
            amount_usdcx: Number(amount_usdcx),
            creator_address: creatorAddress,
            creator_btc_address: profile?.btc_address || null,
            ngn_recipient: profile?.ngn_recipient ? JSON.parse(profile.ngn_recipient) : null,
            metadata: { milestone_index: Number(milestoneIndex), tx_hash: result.tx_hash, trigger: 'milestone_release' },
          });
        }
      }
    } catch (bosErr) {
      console.warn('[escrow] Failed to initiate BOS disbursement:', bosErr.message);
    }

    res.json({ status: 'broadcast', ...result });
  } catch (err) { next(err); }
});

export default router;
