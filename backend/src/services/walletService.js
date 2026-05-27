import { getDb } from '../database.js';
import crypto from 'crypto';
import { getNgnUsdRate, getUsdBtcRate, convert, consumeQuote } from './rateService.js';

const REF_PREFIX = 'CNX';
function genRef() { return `${REF_PREFIX}-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`; }
function now() { return Math.floor(Date.now() / 1000); }

export async function createWallet({ userId, email, phone, preferredCurrency }) {
  const db = await getDb();
  try {
    const existing = await db.get('SELECT * FROM wallets WHERE user_id = $1', [userId]);
    if (existing) {
      if (preferredCurrency && preferredCurrency !== existing.preferred_currency) {
        await db.run('UPDATE wallets SET preferred_currency = $1, updated_at = $2 WHERE user_id = $3', [preferredCurrency, now(), userId]);
      }
      const updated = await db.get('SELECT * FROM wallets WHERE user_id = $1', [userId]);
      return updated;
    }
    const result = await db.run('INSERT INTO wallets (user_id, email, phone, preferred_currency, status) VALUES ($1, $2, $3, $4, $5)', [userId, email || null, phone || null, preferredCurrency || 'NGN', 'pending']);
    return result.rows[0] || { user_id: userId };
  } finally { db.release(); }
}

export async function getWallet(userId) {
  const db = await getDb();
  try { return await db.get('SELECT * FROM wallets WHERE user_id = $1', [userId]); } finally { db.release(); }
}

export async function getWalletById(walletId) {
  const db = await getDb();
  try { return await db.get('SELECT * FROM wallets WHERE id = $1', [walletId]); } finally { db.release(); }
}

export async function getWalletByAddress(address) {
  const db = await getDb();
  try { return await db.get('SELECT * FROM wallets WHERE pillar_wallet_address = $1 OR stx_address = $2', [address, address]); } finally { db.release(); }
}

export async function activateWallet(userId, { pillarWalletAddress, bnsName, stxAddress, btcAddress }) {
  const db = await getDb();
  try {
    const existing = await db.get('SELECT * FROM wallets WHERE user_id = $1', [userId]);
    if (!existing) return null;
    await db.run(`
      UPDATE wallets SET pillar_wallet_address = $1, bns_name = $2, stx_address = $3, btc_address = $4, status = 'active', updated_at = $5
      WHERE user_id = $6
    `, [pillarWalletAddress || null, bnsName || null, stxAddress || null, btcAddress || null, now(), userId]);
    return await db.get('SELECT * FROM wallets WHERE user_id = $1', [userId]);
  } finally { db.release(); }
}

export async function setPreferredCurrency(userId, currency) {
  const db = await getDb();
  try {
    const wallet = await db.get('SELECT * FROM wallets WHERE user_id = $1', [userId]);
    if (!wallet || (currency !== 'NGN' && currency !== 'USD')) return null;
    await db.run('UPDATE wallets SET preferred_currency = $1, updated_at = $2 WHERE user_id = $3', [currency, now(), userId]);
    return await db.get('SELECT * FROM wallets WHERE user_id = $1', [userId]);
  } finally { db.release(); }
}

export async function getBalance(userId) {
  const db = await getDb();
  try {
    const wallet = await db.get('SELECT * FROM wallets WHERE user_id = $1', [userId]);
    if (!wallet) return { ngn: 0, usd: 0, sbtc: '0', preferredCurrency: 'NGN', ngnEquivalent: 0, usdEquivalent: 0 };
    const ngnUsd = await getNgnUsdRate();
    const usdBtc = getUsdBtcRate();
    const satsToUsd = parseInt(wallet.sbtc_balance || '0') / 100000000 * (usdBtc.rate || 0);
    return {
      ngn: wallet.naira_balance, usd: wallet.usd_balance, sbtc: wallet.sbtc_balance,
      preferredCurrency: wallet.preferred_currency,
      ngnEquivalent: Math.round(wallet.naira_balance + (wallet.usd_balance * ngnUsd.rate) + (satsToUsd * ngnUsd.rate)),
      usdEquivalent: Math.round((wallet.naira_balance / ngnUsd.rate + wallet.usd_balance + satsToUsd) * 100) / 100,
      rates: { ngnUsd: ngnUsd.rate, usdBtc: usdBtc.rate },
    };
  } finally { db.release(); }
}

export async function recordDeposit(userId, { amountNaira, amountUsd, amountSbtc, currency, txId, description }) {
  const db = await getDb();
  try {
    const wallet = await db.get('SELECT * FROM wallets WHERE user_id = $1', [userId]);
    if (!wallet) return null;
    const ref = genRef();
    const cur = currency || 'NGN';
    const result = await db.run(`
      INSERT INTO wallet_transactions (wallet_id, type, amount_naira, amount_usd, amount_sbtc, status, reference, tx_id, description)
      VALUES ($1, 'deposit', $2, $3, $4, 'pending', $5, $6, $7)
    `, [wallet.id, amountNaira || 0, amountUsd || 0, amountSbtc || '0', ref, txId || null, description || null]);
    return { ...result.rows[0], currency: cur };
  } finally { db.release(); }
}

export async function confirmDeposit(reference, txId) {
  const db = await getDb();
  try {
    const txn = await db.get('SELECT * FROM wallet_transactions WHERE reference = $1 OR tx_id = $2', [reference, txId]);
    if (!txn || txn.status !== 'pending') return null;
    const wallet = await db.get('SELECT * FROM wallets WHERE id = $1', [txn.wallet_id]);
    if (!wallet) return null;
    await db.run('UPDATE wallet_transactions SET status = $1, confirmed_at = $2, tx_id = COALESCE($3, tx_id) WHERE id = $4', ['confirmed', now(), txId || null, txn.id]);
    const updates = []; const params = [];
    if (txn.amount_naira > 0) { updates.push('naira_balance = naira_balance + $' + (params.length + 1)); params.push(txn.amount_naira); }
    if (txn.amount_usd > 0) { updates.push('usd_balance = usd_balance + $' + (params.length + 1)); params.push(txn.amount_usd); }
    if (parseInt(txn.amount_sbtc || '0') > 0) { updates.push('sbtc_balance = CAST(sbtc_balance AS INTEGER) + $' + (params.length + 1)); params.push(parseInt(txn.amount_sbtc)); }
    if (updates.length > 0) { updates.push('updated_at = $' + (params.length + 1)); params.push(now()); params.push(wallet.id); await db.run(`UPDATE wallets SET ${updates.join(', ')} WHERE id = $${params.length}`, params); }
    return await db.get('SELECT * FROM wallet_transactions WHERE id = $1', [txn.id]);
  } finally { db.release(); }
}

export async function recordSend(userId, { amount, currency, counterpartyUserId, description }) {
  const db = await getDb();
  try {
    const sender = await db.get('SELECT * FROM wallets WHERE user_id = $1', [userId]);
    if (!sender || sender.status !== 'active') return null;
    const counterparty = counterpartyUserId ? await db.get('SELECT * FROM wallets WHERE user_id = $1', [counterpartyUserId]) : null;
    if (counterpartyUserId && !counterparty) return null;
    const cur = currency || 'NGN';
    if ((cur === 'NGN' && sender.naira_balance < amount) || (cur === 'USD' && sender.usd_balance < amount)) return null;
    const recipientCurrency = counterparty?.preferred_currency || cur;
    let sendNaira = 0, sendUsd = 0, conversionRate = null;
    if (cur === recipientCurrency) { if (cur === 'NGN') sendNaira = amount; else sendUsd = amount; }
    else {
      conversionRate = await convert(amount, cur, recipientCurrency);
      if (cur === 'NGN') { sendNaira = amount; sendUsd = conversionRate.amount; }
      else { sendUsd = amount; sendNaira = conversionRate.amount; }
    }
    const ref = genRef();
    const result = await db.run(`
      INSERT INTO wallet_transactions (wallet_id, type, amount_naira, amount_usd, amount_sbtc, counterparty, status, reference, conversion_rate_ngn_usd, description)
      VALUES ($1, 'send', $2, $3, '0', $4, 'pending', $5, $6, $7)
    `, [sender.id, sendNaira, sendUsd, counterpartyUserId || null, ref, conversionRate ? String(conversionRate.rate) : null, description || null]);
    if (cur === 'NGN') await db.run('UPDATE wallets SET naira_balance = naira_balance - $1, updated_at = $2 WHERE id = $3', [amount, now(), sender.id]);
    else await db.run('UPDATE wallets SET usd_balance = usd_balance - $1, updated_at = $2 WHERE id = $3', [amount, now(), sender.id]);
    if (counterparty) {
      await db.run(`
        INSERT INTO wallet_transactions (wallet_id, type, amount_naira, amount_usd, amount_sbtc, counterparty, status, reference, conversion_rate_ngn_usd, description)
        VALUES ($1, 'receive', $2, $3, '0', $4, 'pending', $5, $6, $7)
      `, [counterparty.id, sendNaira, sendUsd, userId, genRef(), conversionRate ? String(conversionRate.rate) : null, description || null]);
    }
    return { ...result.rows[0], currency: cur };
  } finally { db.release(); }
}

export async function confirmSend(reference, txId) {
  const db = await getDb();
  try {
    const txn = await db.get('SELECT * FROM wallet_transactions WHERE reference = $1', [reference]);
    if (!txn || txn.status !== 'pending') return null;
    await db.run('UPDATE wallet_transactions SET status = $1, tx_id = $2, confirmed_at = $3 WHERE id = $4', ['confirmed', txId || null, now(), txn.id]);
    if (txn.type === 'receive') {
      const wallet = await db.get('SELECT * FROM wallets WHERE id = $1', [txn.wallet_id]);
      if (wallet) {
        const updates = []; const params = [];
        if (txn.amount_naira > 0) { updates.push('naira_balance = naira_balance + $' + (params.length + 1)); params.push(txn.amount_naira); }
        if (txn.amount_usd > 0) { updates.push('usd_balance = usd_balance + $' + (params.length + 1)); params.push(txn.amount_usd); }
        if (updates.length > 0) { updates.push('updated_at = $' + (params.length + 1)); params.push(now()); params.push(wallet.id); await db.run(`UPDATE wallets SET ${updates.join(', ')} WHERE id = $${params.length}`, params); }
      }
    }
    return await db.get('SELECT * FROM wallet_transactions WHERE id = $1', [txn.id]);
  } finally { db.release(); }
}

export async function failTransaction(reference) {
  const db = await getDb();
  try {
    const txn = await db.get('SELECT * FROM wallet_transactions WHERE reference = $1', [reference]);
    if (!txn || txn.status !== 'pending') return null;
    const wallet = await db.get('SELECT * FROM wallets WHERE id = $1', [txn.wallet_id]);
    if (!wallet) return null;
    if (txn.type === 'send') {
      const updates = []; const params = [];
      if (txn.amount_naira > 0) { updates.push('naira_balance = naira_balance + $' + (params.length + 1)); params.push(txn.amount_naira); }
      if (txn.amount_usd > 0) { updates.push('usd_balance = usd_balance + $' + (params.length + 1)); params.push(txn.amount_usd); }
      if (updates.length > 0) { updates.push('updated_at = $' + (params.length + 1)); params.push(now()); params.push(wallet.id); await db.run(`UPDATE wallets SET ${updates.join(', ')} WHERE id = $${params.length}`, params); }
    }
    await db.run("UPDATE wallet_transactions SET status = 'failed' WHERE id = $1", [txn.id]);
    return await db.get('SELECT * FROM wallet_transactions WHERE id = $1', [txn.id]);
  } finally { db.release(); }
}

export async function convertCurrency(userId, quoteId) {
  const quote = consumeQuote(quoteId);
  if (!quote || quote.userId !== userId) return null;
  const db = await getDb();
  try {
    const wallet = await db.get('SELECT * FROM wallets WHERE user_id = $1', [userId]);
    if (!wallet || wallet.status !== 'active') return null;
    if ((quote.from === 'NGN' && wallet.naira_balance < quote.amount) || (quote.from === 'USD' && wallet.usd_balance < quote.amount)) return null;
    const conversion = await convert(quote.amount, quote.from, quote.to, quote.rates);
    const ref = genRef();
    if (quote.from === 'NGN') await db.run('UPDATE wallets SET naira_balance = naira_balance - $1, updated_at = $2 WHERE id = $3', [quote.amount, now(), wallet.id]);
    else await db.run('UPDATE wallets SET usd_balance = usd_balance - $1, updated_at = $2 WHERE id = $3', [quote.amount, now(), wallet.id]);
    if (quote.to === 'NGN') await db.run('UPDATE wallets SET naira_balance = naira_balance + $1, updated_at = $2 WHERE id = $3', [conversion.amount, now(), wallet.id]);
    else await db.run('UPDATE wallets SET usd_balance = usd_balance + $1, updated_at = $2 WHERE id = $3', [conversion.amount, now(), wallet.id]);
    const result = await db.run(`
      INSERT INTO wallet_transactions (wallet_id, type, amount_naira, amount_usd, amount_sbtc, status, reference, conversion_rate_ngn_usd, description)
      VALUES ($1, 'swap', $2, $3, '0', 'confirmed', $4, $5, $6)
    `, [wallet.id, (quote.from === 'NGN' ? quote.amount : 0) - (quote.to === 'NGN' ? conversion.amount : 0), (quote.from === 'USD' ? quote.amount : 0) - (quote.to === 'USD' ? conversion.amount : 0), ref, String(conversion.rate), `Converted ${quote.amount} ${quote.from} → ${conversion.amount} ${quote.to}`]);
    return result.rows[0];
  } finally { db.release(); }
}

export async function getTransactionHistory(userId, { limit = 20, offset = 0 } = {}) {
  const db = await getDb();
  try {
    const wallet = await db.get('SELECT * FROM wallets WHERE user_id = $1', [userId]);
    if (!wallet) return { transactions: [], pagination: { offset, limit, total: 0 } };
    const totalRow = await db.get('SELECT COUNT(*) as count FROM wallet_transactions WHERE wallet_id = $1', [wallet.id]);
    const transactions = await db.all('SELECT * FROM wallet_transactions WHERE wallet_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3', [wallet.id, limit, offset]);
    return { transactions, pagination: { offset, limit, total: totalRow?.count || 0 } };
  } finally { db.release(); }
}

export async function getWalletSummary(userId) {
  const db = await getDb();
  try {
    const wallet = await db.get('SELECT * FROM wallets WHERE user_id = $1', [userId]);
    if (!wallet) return null;
    const balance = await getBalance(userId);
    return { wallet: { id: wallet.id, userId: wallet.user_id, status: wallet.status, preferredCurrency: wallet.preferred_currency }, balance, hasPillarWallet: !!wallet.pillar_wallet_address, bnsName: wallet.bns_name };
  } finally { db.release(); }
}
