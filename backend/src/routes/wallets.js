import { Router } from 'express';
import {
  createWallet,
  getWallet,
  activateWallet,
  getBalance,
  recordDeposit,
  confirmDeposit,
  recordSend,
  confirmSend,
  getTransactionHistory,
  failTransaction
} from '../services/walletService.js';

const router = Router();

router.post('/create', (req, res) => {
  const { user_id, email, phone } = req.body;
  if (!user_id) {
    return res.status(400).json({ error: 'user_id is required' });
  }
  try {
    const wallet = createWallet({ userId: user_id, email, phone });
    res.status(201).json({ wallet, message: 'Wallet created. Activate via /api/wallets/activate after Pillar deployment.' });
  } catch (err) {
    console.error('Wallet create error:', err);
    res.status(500).json({ error: 'Failed to create wallet' });
  }
});

router.post('/activate', (req, res) => {
  const { user_id, pillar_wallet_address, bns_name, stx_address, btc_address } = req.body;
  if (!user_id || !pillar_wallet_address) {
    return res.status(400).json({ error: 'user_id and pillar_wallet_address are required' });
  }
  try {
    const wallet = activateWallet(user_id, {
      pillarWalletAddress: pillar_wallet_address,
      bnsName: bns_name,
      stxAddress: stx_address,
      btcAddress: btc_address
    });
    if (!wallet) {
      return res.status(404).json({ error: 'Wallet not found for this user' });
    }
    res.json({ wallet, message: 'Wallet activated.' });
  } catch (err) {
    console.error('Wallet activate error:', err);
    res.status(500).json({ error: 'Failed to activate wallet' });
  }
});

router.get('/:userId/balance', (req, res) => {
  try {
    const balance = getBalance(req.params.userId);
    res.json(balance);
  } catch (err) {
    console.error('Balance error:', err);
    res.status(500).json({ error: 'Failed to get balance' });
  }
});

router.get('/:userId', (req, res) => {
  try {
    const wallet = getWallet(req.params.userId);
    if (!wallet) {
      return res.status(404).json({ error: 'Wallet not found' });
    }
    res.json({ wallet });
  } catch (err) {
    console.error('Wallet get error:', err);
    res.status(500).json({ error: 'Failed to get wallet' });
  }
});

router.post('/deposit', (req, res) => {
  const { user_id, amount_naira, amount_sbtc, tx_id, description } = req.body;
  if (!user_id || (!amount_naira && !amount_sbtc)) {
    return res.status(400).json({ error: 'user_id and at least one of amount_naira or amount_sbtc required' });
  }
  try {
    const deposit = recordDeposit(user_id, {
      amountNaira: parseInt(amount_naira) || 0,
      amountSbtc: amount_sbtc || '0',
      txId: tx_id,
      description
    });
    if (!deposit) {
      return res.status(404).json({ error: 'Wallet not found' });
    }
    res.status(201).json({ transaction: deposit, message: 'Deposit recorded. Confirm via /api/wallets/confirm-deposit after on-chain confirmation.' });
  } catch (err) {
    console.error('Deposit error:', err);
    res.status(500).json({ error: 'Failed to record deposit' });
  }
});

router.post('/confirm-deposit', (req, res) => {
  const { tx_id, reference } = req.body;
  if (!tx_id && !reference) {
    return res.status(400).json({ error: 'tx_id or reference required' });
  }
  try {
    const txn = confirmDeposit(tx_id, reference);
    if (!txn) {
      return res.status(404).json({ error: 'Pending transaction not found' });
    }
    res.json({ transaction: txn, message: 'Deposit confirmed.' });
  } catch (err) {
    console.error('Confirm deposit error:', err);
    res.status(500).json({ error: 'Failed to confirm deposit' });
  }
});

router.post('/send', (req, res) => {
  const { user_id, amount_naira, amount_sbtc, counterparty, description } = req.body;
  if (!user_id || (!amount_naira && !amount_sbtc)) {
    return res.status(400).json({ error: 'user_id and at least one of amount_naira or amount_sbtc required' });
  }
  try {
    const send = recordSend(user_id, {
      amountNaira: parseInt(amount_naira) || 0,
      amountSbtc: amount_sbtc || '0',
      counterparty,
      description
    });
    if (!send) {
      return res.status(400).json({ error: 'Insufficient balance or wallet not active' });
    }
    res.status(201).json({ transaction: send, message: 'Send pending. Confirm via /api/wallets/confirm-send after on-chain confirmation.' });
  } catch (err) {
    console.error('Send error:', err);
    res.status(500).json({ error: 'Failed to process send' });
  }
});

router.post('/confirm-send', (req, res) => {
  const { reference, tx_id } = req.body;
  if (!reference) {
    return res.status(400).json({ error: 'reference required' });
  }
  try {
    const txn = confirmSend(reference, tx_id);
    if (!txn) {
      return res.status(404).json({ error: 'Pending send not found' });
    }
    res.json({ transaction: txn, message: 'Send confirmed.' });
  } catch (err) {
    console.error('Confirm send error:', err);
    res.status(500).json({ error: 'Failed to confirm send' });
  }
});

router.post('/fail', (req, res) => {
  const { reference } = req.body;
  if (!reference) {
    return res.status(400).json({ error: 'reference required' });
  }
  try {
    const txn = failTransaction(reference);
    if (!txn) {
      return res.status(404).json({ error: 'Pending transaction not found' });
    }
    res.json({ transaction: txn, message: 'Transaction marked as failed, balance reverted if applicable.' });
  } catch (err) {
    console.error('Fail transaction error:', err);
    res.status(500).json({ error: 'Failed to fail transaction' });
  }
});

router.get('/:userId/transactions', (req, res) => {
  const offset = parseInt(req.query.offset) || 0;
  const limit = Math.min(parseInt(req.query.limit) || 20, 100);
  try {
    const history = getTransactionHistory(req.params.userId, { offset, limit });
    res.json(history);
  } catch (err) {
    console.error('Transaction history error:', err);
    res.status(500).json({ error: 'Failed to get transaction history' });
  }
});

export default router;
