import { Router } from 'express';
import contractService from '../services/contractService.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.get('/pool/:campaignId', async (req, res, next) => {
  try {
    const pool = await contractService.getYieldPool(Number(req.params.campaignId));
    res.json({ pool });
  } catch (err) { next(err); }
});

router.get('/contributions/:campaignId/:contributor', async (req, res, next) => {
  try {
    const data = await contractService.getCampaignContributions(
      Number(req.params.campaignId),
      req.params.contributor
    );
    res.json({ data });
  } catch (err) { next(err); }
});

router.post('/claim-yield/:campaignId', requireAuth, async (req, res, next) => {
  try {
    const result = await contractService.claimBackerYield(Number(req.params.campaignId));
    res.json(result);
  } catch (err) { next(err); }
});

router.post('/claim-bonus/:campaignId', requireAuth, async (req, res, next) => {
  try {
    const result = await contractService.claimCreatorBonus(Number(req.params.campaignId));
    res.json(result);
  } catch (err) { next(err); }
});

export default router;
