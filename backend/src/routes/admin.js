import { Router } from 'express';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import contractService from '../services/contractService.js';
import { STACKS_NETWORK, DEPLOYER_ADDRESS, V2_DEPLOYER_ADDRESS, EXPLORER_URL, HIRO_API_URL } from '../config/chain.js';

const router = Router();

// All admin routes require auth + admin role
router.use(requireAuth, requireAdmin);

// ── System ──
router.get('/system-status', async (req, res, next) => {
  try {
    res.json({
      network: STACKS_NETWORK,
      deployer: DEPLOYER_ADDRESS,
      v2Deployer: V2_DEPLOYER_ADDRESS,
      explorerBase: EXPLORER_URL,
      apiBase: HIRO_API_URL,
    });
  } catch (err) { next(err); }
});

// ── Funding Pool Admin ──
router.post('/funding-pool/set-addresses', async (req, res, next) => {
  try {
    const { verification, reputation, escrow } = req.body;
    const chain = await contractService.adminSetPoolContractAddresses(verification, reputation, escrow);
    res.json({ ok: true, chain });
  } catch (err) { next(err); }
});

router.post('/funding-pool/set-pause', async (req, res, next) => {
  try {
    const chain = await contractService.adminSetPoolPauseState(!!req.body.paused);
    res.json({ ok: true, chain });
  } catch (err) { next(err); }
});

router.post('/funding-pool/emergency-withdraw', async (req, res, next) => {
  try {
    const { amount, recipient } = req.body;
    const chain = await contractService.adminPoolEmergencyWithdraw(amount, recipient);
    res.json({ ok: true, chain });
  } catch (err) { next(err); }
});

router.post('/funding-pool/emergency-close-pool', async (req, res, next) => {
  try {
    const chain = await contractService.adminEmergencyClosePool(req.body.poolId);
    res.json({ ok: true, chain });
  } catch (err) { next(err); }
});

router.post('/funding-pool/emergency-refund-member', async (req, res, next) => {
  try {
    const { poolId, memberAddress } = req.body;
    const chain = await contractService.adminEmergencyRefundMember(poolId, memberAddress);
    res.json({ ok: true, chain });
  } catch (err) { next(err); }
});

// ── Campaign Module Admin ──
router.post('/campaign/set-verification', async (req, res, next) => {
  try {
    const chain = await contractService.adminSetCampaignVerificationContract(req.body.verification);
    res.json({ ok: true, chain });
  } catch (err) { next(err); }
});

router.post('/campaign/set-escrow', async (req, res, next) => {
  try {
    const chain = await contractService.adminSetCampaignEscrowContract(req.body.escrow);
    res.json({ ok: true, chain });
  } catch (err) { next(err); }
});

router.post('/campaign/set-pause', async (req, res, next) => {
  try {
    const chain = await contractService.adminSetCampaignPauseState(!!req.body.paused);
    res.json({ ok: true, chain });
  } catch (err) { next(err); }
});

router.post('/campaign/emergency-withdraw', async (req, res, next) => {
  try {
    const { campaignId, amount, recipient } = req.body;
    const chain = await contractService.adminCampaignEmergencyWithdraw(campaignId, amount, recipient);
    res.json({ ok: true, chain });
  } catch (err) { next(err); }
});

// ── Milestone Escrow Admin ──
router.post('/escrow/set-fees', async (req, res, next) => {
  try {
    const { feeBps, collector } = req.body;
    const chain = await contractService.adminSetEscrowFeeParameters(feeBps, collector);
    res.json({ ok: true, chain });
  } catch (err) { next(err); }
});

router.post('/escrow/set-verification', async (req, res, next) => {
  try {
    const chain = await contractService.adminSetEscrowVerificationContract(req.body.verification);
    res.json({ ok: true, chain });
  } catch (err) { next(err); }
});

router.post('/escrow/set-pause', async (req, res, next) => {
  try {
    const chain = await contractService.adminSetEscrowPauseState(!!req.body.paused);
    res.json({ ok: true, chain });
  } catch (err) { next(err); }
});

router.post('/escrow/emergency-withdraw', async (req, res, next) => {
  try {
    const { amount, recipient } = req.body;
    const chain = await contractService.adminEscrowEmergencyWithdraw(amount, recipient);
    res.json({ ok: true, chain });
  } catch (err) { next(err); }
});

// ── Milestone Verification Admin ──
router.post('/verification/set-escrow', async (req, res, next) => {
  try {
    const chain = await contractService.adminSetVerificationEscrow(req.body.escrow);
    res.json({ ok: true, chain });
  } catch (err) { next(err); }
});

router.post('/verification/set-pause', async (req, res, next) => {
  try {
    const chain = await contractService.adminSetVerificationPauseState(!!req.body.paused);
    res.json({ ok: true, chain });
  } catch (err) { next(err); }
});

router.post('/verification/emergency-withdraw', async (req, res, next) => {
  try {
    const { amount, recipient } = req.body;
    const chain = await contractService.adminVerificationEmergencyWithdraw(amount, recipient);
    res.json({ ok: true, chain });
  } catch (err) { next(err); }
});

// ── Yield Escrow Admin ──
router.post('/yield/distribute', async (req, res, next) => {
  try {
    const chain = await contractService.adminDistributePlatformYield(req.body.campaignId);
    res.json({ ok: true, chain });
  } catch (err) { next(err); }
});

router.post('/yield/set-strategy', async (req, res, next) => {
  try {
    const chain = await contractService.adminSetYieldStrategy(req.body.strategyContract);
    res.json({ ok: true, chain });
  } catch (err) { next(err); }
});

router.post('/yield/set-milestone-escrow', async (req, res, next) => {
  try {
    const chain = await contractService.adminSetYieldMilestoneEscrow(req.body.escrow);
    res.json({ ok: true, chain });
  } catch (err) { next(err); }
});

router.post('/yield/set-milestone-verification', async (req, res, next) => {
  try {
    const chain = await contractService.adminSetYieldMilestoneVerification(req.body.verification);
    res.json({ ok: true, chain });
  } catch (err) { next(err); }
});

router.post('/yield/set-pause', async (req, res, next) => {
  try {
    const chain = await contractService.adminSetYieldPauseState(!!req.body.paused);
    res.json({ ok: true, chain });
  } catch (err) { next(err); }
});

router.post('/yield/emergency-withdraw', async (req, res, next) => {
  try {
    const { amount, recipient } = req.body;
    const chain = await contractService.adminYieldEmergencyWithdraw(amount, recipient);
    res.json({ ok: true, chain });
  } catch (err) { next(err); }
});

// ── Verification Module v1 Admin ──
router.post('/v1/emergency-revoke', async (req, res, next) => {
  try {
    const chain = await contractService.adminV1EmergencyRevokeVerification(req.body.creatorAddress);
    res.json({ ok: true, chain });
  } catch (err) { next(err); }
});

router.post('/v1/set-admin', async (req, res, next) => {
  try {
    const chain = await contractService.adminV1SetContractAdmin(req.body.newAdmin);
    res.json({ ok: true, chain });
  } catch (err) { next(err); }
});

router.post('/v1/set-pause', async (req, res, next) => {
  try {
    const chain = await contractService.adminV1SetPauseState(!!req.body.paused);
    res.json({ ok: true, chain });
  } catch (err) { next(err); }
});

router.post('/v1/emergency-withdraw', async (req, res, next) => {
  try {
    const { amount, recipient } = req.body;
    const chain = await contractService.adminV1EmergencyWithdraw(amount, recipient);
    res.json({ ok: true, chain });
  } catch (err) { next(err); }
});

// ── Verification Module v2 Admin ──
router.post('/v2/emergency-verify', async (req, res, next) => {
  try {
    const { creatorAddress, expirationBlock } = req.body;
    const chain = await contractService.adminV2EmergencyVerifyCreator(creatorAddress, expirationBlock);
    res.json({ ok: true, chain });
  } catch (err) { next(err); }
});

router.post('/v2/emergency-revoke', async (req, res, next) => {
  try {
    const chain = await contractService.adminV2EmergencyRevokeVerification(req.body.creatorAddress);
    res.json({ ok: true, chain });
  } catch (err) { next(err); }
});

router.post('/v2/set-pause', async (req, res, next) => {
  try {
    const chain = await contractService.adminV2SetPauseState(!!req.body.paused);
    res.json({ ok: true, chain });
  } catch (err) { next(err); }
});

router.post('/v2/emergency-withdraw', async (req, res, next) => {
  try {
    const { amount, recipient } = req.body;
    const chain = await contractService.adminV2EmergencyWithdraw(amount, recipient);
    res.json({ ok: true, chain });
  } catch (err) { next(err); }
});

// ── Oracle Proxy Admin ──
router.post('/oracle/set-oracle', async (req, res, next) => {
  try {
    const chain = await contractService.adminSetPriceOracle(req.body.oracleAddress);
    res.json({ ok: true, chain });
  } catch (err) { next(err); }
});

router.post('/oracle/update-price', async (req, res, next) => {
  try {
    const chain = await contractService.adminUpdatePrice(req.body.price);
    res.json({ ok: true, chain });
  } catch (err) { next(err); }
});

router.post('/oracle/emergency-set-price', async (req, res, next) => {
  try {
    const chain = await contractService.adminEmergencySetPrice(req.body.price);
    res.json({ ok: true, chain });
  } catch (err) { next(err); }
});

// ── Reputation Admin ──
router.post('/reputation/set-verification-gate', async (req, res, next) => {
  try {
    const chain = await contractService.adminSetVerificationGate(req.body.verificationContract);
    res.json({ ok: true, chain });
  } catch (err) { next(err); }
});

export default router;
