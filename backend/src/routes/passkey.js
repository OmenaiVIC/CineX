/**
 * passkey.js — Passkey relay routes with sponsorship + auth middleware
 *
 * Layer 1: relayAuth (auth + rate limiting)
 * Layer 2: sponsorService (policy engine)
 * Layer 3: passkeyService (relay executor)
 *
 * POST /api/passkey/transfer           — Relay a passkey-signed STX transfer
 * GET  /api/passkey/vault-state        — Read vault on-chain state
 * GET  /api/passkey/quota/:address     — Get user's daily quota status
 * POST /api/passkey/recovery/propose   — Admin proposes key recovery (72h timelock)
 * POST /api/passkey/recovery/execute   — Admin executes recovery after veto window
 * GET  /api/passkey/recovery/state     — Read vault recovery state
 * GET  /api/passkey/health             — Relay wallet health check
 */

import { Router } from 'express';
import * as passkeyService from '../services/passkeyService.js';
import { checkSponsorship, getUserQuota } from '../services/sponsorService.js';
import { checkRelayBalance } from '../services/relayMonitor.js';
import { relayAuthMiddleware } from '../middleware/relayAuth.js';

const router = Router();

// ─────────────────────────────────────────────────────────────
// POST /api/passkey/transfer — Sponsored relay transfer
// ─────────────────────────────────────────────────────────────
router.post('/transfer',
  relayAuthMiddleware({ rateLimit: 10 }),
  async (req, res, next) => {
    try {
      const {
        recipient,
        amount,
        authId,
        pubkey,
        signature,
        authenticatorData,
        clientDataPrefix,
        clientDataSuffix,
        memo,
        domainName,
        domainVersion,
        domainChainId,
        domainWallet,
        vaultAddress,
        vaultName,
      } = req.body;

      // Validate required fields
      if (!recipient || typeof recipient !== 'string') {
        return res.status(400).json({ error: 'recipient is required (string)' });
      }
      if (!amount || typeof amount !== 'number' || amount <= 0) {
        return res.status(400).json({ error: 'amount is required (positive number)' });
      }
      if (typeof authId !== 'number' || authId < 0) {
        return res.status(400).json({ error: 'authId is required (non-negative number)' });
      }
      if (!pubkey || typeof pubkey !== 'string') {
        return res.status(400).json({ error: 'pubkey is required (hex string)' });
      }
      if (!signature || typeof signature !== 'string') {
        return res.status(400).json({ error: 'signature is required (hex string)' });
      }
      if (!authenticatorData || typeof authenticatorData !== 'string') {
        return res.status(400).json({ error: 'authenticatorData is required (hex string)' });
      }
      if (!clientDataPrefix || typeof clientDataPrefix !== 'string') {
        return res.status(400).json({ error: 'clientDataPrefix is required (hex string)' });
      }
      if (!clientDataSuffix || typeof clientDataSuffix !== 'string') {
        return res.status(400).json({ error: 'clientDataSuffix is required (hex string)' });
      }

      // Layer 2: Sponsorship policy check
      const userAddress = req.relayUserAddress;
      const sponsorResult = await checkSponsorship({
        userAddress,
        actionType: 'stx-transfer',
        amountMicrostx: amount,
        idempotencyKey: req.relayIdempotencyKey,
        requestIp: req.ip,
        userAgent: req.headers['user-agent'],
      });

      if (sponsorResult.cached) {
        return res.json({
          txid: sponsorResult.txHash,
          transferId: sponsorResult.transferId,
          cached: true,
        });
      }

      if (sponsorResult.decision === 'rejected') {
        return res.status(403).json({
          error: 'Transfer not sponsored',
          reason: sponsorResult.reason,
          transferId: sponsorResult.transferId,
        });
      }

      // Layer 3: Execute relay transfer
      const result = await passkeyService.passkeyTransfer({
        domainName: domainName || 'cinex-smart-vault',
        domainVersion: domainVersion || '1.0.0',
        domainChainId: domainChainId || 2143456,
        domainWallet: domainWallet || userAddress,
        recipient,
        amount,
        authId,
        pubkey,
        signature,
        authenticatorData,
        clientDataPrefix,
        clientDataSuffix,
        memo,
        transferId: sponsorResult.transferId,
        vaultAddress,
        vaultName,
      });

      res.json(result);
    } catch (err) {
      console.error('[passkey/transfer] Error:', err.message);
      // Mark transfer as failed if we have a transferId
      if (req.relayTransferId) {
        try { await passkeyService.failTransfer({ transferId: req.relayTransferId, reason: err.message }); } catch {}
      }
      next(err);
    }
  }
);

// ─────────────────────────────────────────────────────────────
// GET /api/passkey/vault-state — Read vault on-chain state
// ─────────────────────────────────────────────────────────────
router.get('/vault-state', async (req, res, next) => {
  try {
    const [owner, initialized] = await Promise.all([
      passkeyService.getVaultOwner(),
      passkeyService.getVaultInitialized(),
    ]);
    res.json({ owner, initialized });
  } catch (err) {
    console.error('[passkey/vault-state] Error:', err.message);
    next(err);
  }
});

// ─────────────────────────────────────────────────────────────
// GET /api/passkey/quota/:address — User daily quota status
// ─────────────────────────────────────────────────────────────
router.get('/quota/:address', async (req, res, next) => {
  try {
    const quota = await getUserQuota(req.params.address);
    res.json(quota);
  } catch (err) {
    console.error('[passkey/quota] Error:', err.message);
    next(err);
  }
});

// ─────────────────────────────────────────────────────────────
// POST /api/passkey/recovery/propose — Admin proposes key recovery
// Sets new-pubkey and starts 72h veto window on vault contract.
// ─────────────────────────────────────────────────────────────
router.post('/recovery/propose',
  relayAuthMiddleware({ rateLimit: 5 }),
  async (req, res, next) => {
    try {
      const { newPubkey, vaultAddress, vaultName } = req.body;

      if (!newPubkey || typeof newPubkey !== 'string') {
        return res.status(400).json({ error: 'newPubkey is required (33-byte hex string)' });
      }
      if (newPubkey.length !== 66) {
        return res.status(400).json({ error: 'newPubkey must be 66 hex characters (33 bytes)' });
      }

      const result = await passkeyService.proposeRecovery({
        newPubkey,
        vaultAddress,
        vaultName,
      });

      res.json({ txid: result.txid, status: 'proposed' });
    } catch (err) {
      console.error('[passkey/recovery/propose] Error:', err.message);
      next(err);
    }
  }
);

// ─────────────────────────────────────────────────────────────
// POST /api/passkey/recovery/execute — Admin executes recovery
// After 72h veto window, rotates owner-pubkey to new key.
// ─────────────────────────────────────────────────────────────
router.post('/recovery/execute',
  relayAuthMiddleware({ rateLimit: 5 }),
  async (req, res, next) => {
    try {
      const { vaultAddress, vaultName } = req.body;

      const result = await passkeyService.executeRecovery({
        vaultAddress,
        vaultName,
      });

      res.json({ txid: result.txid, status: 'executed' });
    } catch (err) {
      console.error('[passkey/recovery/execute] Error:', err.message);
      next(err);
    }
  }
);

// ─────────────────────────────────────────────────────────────
// GET /api/passkey/recovery/state — Read vault recovery state
// Returns recovery-pubkey, proposed-at, veto-until from chain.
// ─────────────────────────────────────────────────────────────
router.get('/recovery/state', async (req, res, next) => {
  try {
    const { vaultAddress, vaultName } = req.query;
    const state = await passkeyService.getRecoveryState(vaultAddress, vaultName);
    res.json(state);
  } catch (err) {
    console.error('[passkey/recovery/state] Error:', err.message);
    next(err);
  }
});

// ─────────────────────────────────────────────────────────────
// GET /api/passkey/health — Relay wallet health check
// ─────────────────────────────────────────────────────────────
router.get('/health', async (req, res, next) => {
  try {
    const health = await checkRelayBalance();
    const statusCode = health.status === 'critical' ? 503 : 200;
    res.status(statusCode).json(health);
  } catch (err) {
    console.error('[passkey/health] Error:', err.message);
    next(err);
  }
});

export default router;
