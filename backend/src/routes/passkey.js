import { Router } from 'express';
import * as passkeyService from '../services/passkeyService.js';

const router = Router();

/**
 * POST /api/passkey/transfer
 *
 * Relay a passkey-signed STX transfer through the vault contract.
 *
 * Body:
 *   recipient       (string)  - Stacks principal to receive STX
 *   amount          (number)  - Amount in micro-STX
 *   authId          (number)  - Monotonic auth ID (anti-replay)
 *   pubkey          (string)  - 33-byte hex P-256 public key
 *   signature       (string)  - 64-byte hex P-256 signature
 *   authenticatorData (string) - Hex-encoded authenticator data
 *   clientDataPrefix  (string) - Hex-encoded client data prefix
 *   clientDataSuffix  (string) - Hex-encoded client data suffix
 *   memo            (string)  - Optional hex-encoded memo
 *
 * Response:
 *   { txid: string }
 */
router.post('/transfer', async (req, res, next) => {
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

    const result = await passkeyService.passkeyTransfer({
      recipient,
      amount,
      authId,
      pubkey,
      signature,
      authenticatorData,
      clientDataPrefix,
      clientDataSuffix,
      memo,
    });

    res.json(result);
  } catch (err) {
    console.error('[passkey/transfer] Error:', err.message);
    next(err);
  }
});

/**
 * GET /api/passkey/vault-state
 *
 * Read the vault's on-chain state (owner, initialized).
 */
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

export default router;
