import { Router } from 'express';
import contractService from '../services/contractService.js';

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
    const { campaignId, milestoneIndex } = req.body;
    if (campaignId === undefined || milestoneIndex === undefined) {
      return res.status(400).json({ error: 'campaignId and milestoneIndex required' });
    }
    const result = await contractService.release(Number(campaignId), Number(milestoneIndex));
    res.json({ status: 'broadcast', ...result });
  } catch (err) { next(err); }
});

export default router;
