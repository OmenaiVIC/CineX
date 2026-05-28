import { Router } from 'express';
import * as walletService from '../services/walletService.js';
import * as rateService from '../services/rateService.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.post('/create', requireAuth, async (req, res, next) => {
  try {
    const { user_id, email, phone, preferred_currency } = req.body;
    if (!user_id) return res.status(400).json({ error: 'user_id is required' });
    const wallet = await walletService.createWallet({ userId: user_id, email, phone, preferredCurrency: preferred_currency || 'NGN' });
    res.status(201).json({ wallet, message: 'Wallet created. Set preferred_currency (NGN or USD). Activate via /api/wallets/activate after Pillar deployment.' });
  } catch (err) { console.error('Wallet create error:', err); res.status(500).json({ error: 'Failed to create wallet' }); }
});

router.post('/activate', requireAuth, async (req, res, next) => {
  try {
    const { user_id, pillar_wallet_address, bns_name, stx_address, btc_address } = req.body;
    if (!user_id || !pillar_wallet_address) return res.status(400).json({ error: 'user_id and pillar_wallet_address are required' });
    const wallet = await walletService.activateWallet(user_id, { pillarWalletAddress: pillar_wallet_address, bnsName: bns_name, stxAddress: stx_address, btcAddress: btc_address });
    if (!wallet) return res.status(404).json({ error: 'Wallet not found for this user' });
    res.json({ wallet, message: 'Wallet activated.' });
  } catch (err) { console.error('Wallet activate error:', err); res.status(500).json({ error: 'Failed to activate wallet' }); }
});

router.get('/:userId', requireAuth, async (req, res, next) => {
  try {
    const wallet = await walletService.getWallet(req.params.userId);
    if (!wallet) return res.status(404).json({ error: 'Wallet not found' });
    res.json({ wallet });
  } catch (err) { console.error('Wallet get error:', err); res.status(500).json({ error: 'Failed to get wallet' }); }
});

router.get('/:userId/balance', requireAuth, async (req, res, next) => {
  try {
    const balance = await walletService.getBalance(req.params.userId);
    res.json(balance);
  } catch (err) { console.error('Balance error:', err); res.status(500).json({ error: 'Failed to get balance' }); }
});

router.post('/preferred-currency', requireAuth, async (req, res, next) => {
  try {
    const { user_id, currency } = req.body;
    if (!user_id || !currency) return res.status(400).json({ error: 'user_id and currency (NGN/USD) required' });
    const wallet = await walletService.setPreferredCurrency(user_id, currency);
    if (!wallet) return res.status(404).json({ error: 'Wallet not found' });
    res.json({ wallet, message: `Preferred currency set to ${currency}` });
  } catch (err) { console.error('Preferred currency error:', err); res.status(500).json({ error: 'Failed to set preferred currency' }); }
});

router.post('/demo-credit', async (req, res, next) => {
  try {
    const { user_id } = req.body;
    if (!user_id) return res.status(400).json({ error: 'user_id required' });
    let wallet = await walletService.getWallet(user_id);
    if (!wallet) {
      wallet = await walletService.createWallet({ userId: user_id, preferredCurrency: 'NGN' });
    }
    const deposit = await walletService.recordDeposit(user_id, { amountNaira: 100000, currency: 'NGN' });
    if (!deposit) return res.status(500).json({ error: 'Failed to record deposit' });
    const confirmed = await walletService.confirmDeposit(deposit.reference);
    if (!confirmed) return res.status(500).json({ error: 'Failed to confirm deposit' });
    const balance = await walletService.getBalance(user_id);
    res.json({ message: 'Demo credit applied', amount: 100000, balance });
  } catch (err) { console.error('Demo credit error:', err); res.status(500).json({ error: 'Failed to process demo credit' }); }
});

router.post('/deposit', requireAuth, async (req, res, next) => {
  try {
    const { user_id, amount_naira, amount_usd, amount_sbtc, currency, tx_id, description } = req.body;
    if (!user_id || (!amount_naira && !amount_usd && !amount_sbtc)) return res.status(400).json({ error: 'user_id and at least one amount field required' });
    const deposit = await walletService.recordDeposit(user_id, { amountNaira: parseInt(amount_naira) || 0, amountUsd: parseInt(amount_usd) || 0, amountSbtc: amount_sbtc || '0', currency: currency || 'NGN', txId: tx_id, description });
    if (!deposit) return res.status(404).json({ error: 'Wallet not found' });
    res.status(201).json({ transaction: deposit, message: 'Deposit recorded. Confirm via /api/wallets/confirm-deposit after on-chain settlement.' });
  } catch (err) { console.error('Deposit error:', err); res.status(500).json({ error: 'Failed to record deposit' }); }
});

router.post('/confirm-deposit', requireAuth, async (req, res, next) => {
  try {
    const { tx_id, reference } = req.body;
    if (!tx_id && !reference) return res.status(400).json({ error: 'tx_id or reference required' });
    const txn = await walletService.confirmDeposit(reference, tx_id);
    if (!txn) return res.status(404).json({ error: 'Pending transaction not found' });
    res.json({ transaction: txn, message: 'Deposit confirmed.' });
  } catch (err) { console.error('Confirm deposit error:', err); res.status(500).json({ error: 'Failed to confirm deposit' }); }
});

router.post('/send', requireAuth, async (req, res, next) => {
  try {
    const { user_id, amount, currency, counterparty_user_id, description } = req.body;
    if (!user_id || !amount || !counterparty_user_id) return res.status(400).json({ error: 'user_id, amount, and counterparty_user_id required' });
    const send = await walletService.recordSend(user_id, { amount: parseFloat(amount), currency: currency || 'NGN', counterpartyUserId: counterparty_user_id, description });
    if (!send) return res.status(400).json({ error: 'Insufficient balance, wallet not active, or recipient not found' });
    res.status(201).json({ transaction: send, message: 'Send pending. Confirm via /api/wallets/confirm-send after on-chain confirmation.' });
  } catch (err) { console.error('Send error:', err); res.status(500).json({ error: 'Failed to process send' }); }
});

router.post('/confirm-send', requireAuth, async (req, res, next) => {
  try {
    const { reference, tx_id } = req.body;
    if (!reference) return res.status(400).json({ error: 'reference required' });
    const txn = await walletService.confirmSend(reference, tx_id);
    if (!txn) return res.status(404).json({ error: 'Pending send not found' });
    res.json({ transaction: txn, message: 'Send confirmed.' });
  } catch (err) { console.error('Confirm send error:', err); res.status(500).json({ error: 'Failed to confirm send' }); }
});

router.post('/fail', requireAuth, async (req, res, next) => {
  try {
    const { reference } = req.body;
    if (!reference) return res.status(400).json({ error: 'reference required' });
    const txn = await walletService.failTransaction(reference);
    if (!txn) return res.status(404).json({ error: 'Pending transaction not found' });
    res.json({ transaction: txn, message: 'Transaction marked as failed, balance reverted if applicable.' });
  } catch (err) { console.error('Fail transaction error:', err); res.status(500).json({ error: 'Failed to fail transaction' }); }
});

router.get('/:userId/transactions', requireAuth, async (req, res, next) => {
  try {
    const offset = parseInt(req.query.offset) || 0;
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const history = await walletService.getTransactionHistory(req.params.userId, { offset, limit });
    res.json(history);
  } catch (err) { console.error('Transaction history error:', err); res.status(500).json({ error: 'Failed to get transaction history' }); }
});

router.get('/:userId/summary', requireAuth, async (req, res, next) => {
  try {
    const summary = await walletService.getWalletSummary(req.params.userId);
    if (!summary) return res.status(404).json({ error: 'Wallet not found' });
    res.json(summary);
  } catch (err) { console.error('Wallet summary error:', err); res.status(500).json({ error: 'Failed to get wallet summary' }); }
});

router.get('/rates/all', async (req, res, next) => {
  try {
    const rates = await rateService.getAllRates();
    res.json(rates);
  } catch (err) { console.error('Rates error:', err); res.status(500).json({ error: 'Failed to fetch rates' }); }
});

router.post('/rates/convert', async (req, res, next) => {
  try {
    const { amount, from, to } = req.body;
    if (!amount || !from || !to) return res.status(400).json({ error: 'amount, from, and to required' });
    const result = await rateService.convert(amount, from, to);
    res.json({ input: { amount, from, to }, result });
  } catch (err) { console.error('Convert error:', err); res.status(400).json({ error: err.message }); }
});

router.post('/quote', requireAuth, async (req, res, next) => {
  try {
    const { user_id, from, to, amount } = req.body;
    if (!user_id || !from || !to || !amount) return res.status(400).json({ error: 'user_id, from, to, amount required' });
    const rates = await rateService.getAllRates();
    const conversion = await rateService.convert(amount, from, to, rates);
    const quote = rateService.createQuote(user_id, from, to, amount);
    res.json({ quoteId: quote.quoteId, expiresAt: quote.expiresAt, from, to, inputAmount: amount, outputAmount: conversion.amount, rate: conversion.rate, spread: rates.spread, rates });
  } catch (err) { console.error('Quote error:', err); res.status(400).json({ error: err.message }); }
});

router.post('/convert', requireAuth, async (req, res, next) => {
  try {
    const { user_id, quote_id } = req.body;
    if (!user_id || !quote_id) return res.status(400).json({ error: 'user_id and quote_id required' });
    const txn = await walletService.convertCurrency(user_id, quote_id);
    if (!txn) return res.status(400).json({ error: 'Quote expired, invalid, or insufficient balance' });
    res.json({ transaction: txn, message: 'Currency conversion completed.' });
  } catch (err) { console.error('Convert execute error:', err); res.status(500).json({ error: 'Failed to execute conversion' }); }
});

export default router;
