import { getDb } from '../database.js';
import crypto from 'crypto';
import { convert, getNgnUsdRate, getUsdBtcRate, createQuote, consumeQuote, getFxSpread } from './rateService.js';

const REFERENCE_PREFIX = 'CNX';

function generateReference() {
  return `${REFERENCE_PREFIX}-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
}

function now() {
  return Math.floor(Date.now() / 1000);
}

export function createWallet({ userId, email, phone, preferredCurrency }) {
  const db = getDb();
  const existing = db.prepare('SELECT * FROM wallets WHERE user_id = ?').get(userId);
  if (existing) {
    if (preferredCurrency && preferredCurrency !== existing.preferred_currency) {
      db.prepare("UPDATE wallets SET preferred_currency = ?, updated_at = ? WHERE user_id = ?")
        .run(preferredCurrency, now(), userId);
    }
    return db.prepare('SELECT * FROM wallets WHERE user_id = ?').get(userId);
  }
  const result = db.prepare(`
    INSERT INTO wallets (user_id, email, phone, preferred_currency, status)
    VALUES (?, ?, ?, ?, 'pending')
  `).run(userId, email || null, phone || null, preferredCurrency || 'NGN');
  return db.prepare('SELECT * FROM wallets WHERE id = ?').get(Number(result.lastInsertRowid));
}

export function getWallet(userId) {
  const db = getDb();
  return db.prepare('SELECT * FROM wallets WHERE user_id = ?').get(userId);
}

export function getWalletById(walletId) {
  const db = getDb();
  return db.prepare('SELECT * FROM wallets WHERE id = ?').get(walletId);
}

export function getWalletByAddress(address) {
  const db = getDb();
  return db.prepare('SELECT * FROM wallets WHERE pillar_wallet_address = ? OR stx_address = ?').get(address, address);
}

export function activateWallet(userId, { pillarWalletAddress, bnsName, stxAddress, btcAddress }) {
  const db = getDb();
  const existing = getWallet(userId);
  if (!existing) return null;
  db.prepare(`
    UPDATE wallets SET
      pillar_wallet_address = ?,
      bns_name = ?,
      stx_address = ?,
      btc_address = ?,
      status = 'active',
      updated_at = ?
    WHERE user_id = ?
  `).run(pillarWalletAddress || null, bnsName || null, stxAddress || null, btcAddress || null, now(), userId);
  return getWallet(userId);
}

export function setPreferredCurrency(userId, currency) {
  const db = getDb();
  const wallet = getWallet(userId);
  if (!wallet) return null;
  if (currency !== 'NGN' && currency !== 'USD') return null;
  db.prepare("UPDATE wallets SET preferred_currency = ?, updated_at = ? WHERE user_id = ?")
    .run(currency, now(), userId);
  return getWallet(userId);
}

export async function getBalance(userId) {
  const db = getDb();
  const wallet = getWallet(userId);
  if (!wallet) {
    return { ngn: 0, usd: 0, sbtc: '0', preferredCurrency: 'NGN', ngnEquivalent: 0, usdEquivalent: 0 };
  }
  const ngnUsd = await getNgnUsdRate();
  const usdBtc = getUsdBtcRate();
  const ngnRate = ngnUsd.rate;
  const btcRate = usdBtc.rate;
  const satsToUsd = parseInt(wallet.sbtc_balance || '0') / 100000000 * btcRate;
  return {
    ngn: wallet.naira_balance,
    usd: wallet.usd_balance,
    sbtc: wallet.sbtc_balance,
    preferredCurrency: wallet.preferred_currency,
    ngnEquivalent: Math.round(wallet.naira_balance + (wallet.usd_balance * ngnRate) + (satsToUsd * ngnRate)),
    usdEquivalent: Math.round((wallet.naira_balance / ngnRate + wallet.usd_balance + satsToUsd) * 100) / 100,
    rates: { ngnUsd: ngnRate, usdBtc: btcRate },
  };
}

export function recordDeposit(userId, { amountNaira, amountUsd, amountSbtc, currency, txId, description }) {
  const db = getDb();
  const wallet = getWallet(userId);
  if (!wallet) return null;
  const ref = generateReference();
  const cur = currency || 'NGN';
  const result = db.prepare(`
    INSERT INTO wallet_transactions
      (wallet_id, type, amount_naira, amount_usd, amount_sbtc, status, reference, tx_id, description)
    VALUES (?, 'deposit', ?, ?, ?, 'pending', ?, ?, ?)
  `).run(wallet.id, amountNaira || 0, amountUsd || 0, amountSbtc || '0', ref, txId || null, description || null);
  const txn = db.prepare('SELECT * FROM wallet_transactions WHERE id = ?').get(Number(result.lastInsertRowid));
  return {
    ...txn,
    currency: cur,
    naira_balance_before: wallet.naira_balance,
    naira_balance_after: wallet.naira_balance + (cur === 'NGN' ? (amountNaira || 0) : 0),
    usd_balance_before: wallet.usd_balance,
    usd_balance_after: wallet.usd_balance + (cur === 'USD' ? (amountUsd || 0) : 0),
  };
}

export function confirmDeposit(reference, txId) {
  const db = getDb();
  const txn = db.prepare('SELECT * FROM wallet_transactions WHERE reference = ? OR tx_id = ?').get(reference, txId);
  if (!txn || txn.status !== 'pending') return null;
  const wallet = getWalletById(txn.wallet_id);
  if (!wallet) return null;

  db.prepare('UPDATE wallet_transactions SET status = ?, confirmed_at = ?, tx_id = COALESCE(?, tx_id) WHERE id = ?')
    .run('confirmed', now(), txId || null, txn.id);

  const updates = [];
  if (txn.amount_naira > 0) updates.push('naira_balance = naira_balance + ?');
  if (txn.amount_usd > 0) updates.push('usd_balance = usd_balance + ?');
  if (parseInt(txn.amount_sbtc || '0') > 0) updates.push('sbtc_balance = CAST(sbtc_balance AS INTEGER) + ?');
  updates.push('updated_at = ?');

  const params = [];
  if (txn.amount_naira > 0) params.push(txn.amount_naira);
  if (txn.amount_usd > 0) params.push(txn.amount_usd);
  if (parseInt(txn.amount_sbtc || '0') > 0) params.push(txn.amount_sbtc);
  params.push(now(), txn.wallet_id);

  db.prepare(`UPDATE wallets SET ${updates.join(', ')} WHERE id = ?`).run(...params);
  return db.prepare('SELECT * FROM wallet_transactions WHERE id = ?').get(txn.id);
}

export async function recordSend(userId, { amount, currency, counterpartyUserId, description }) {
  const db = getDb();
  const sender = getWallet(userId);
  if (!sender || sender.status !== 'active') return null;

  const counterparty = counterpartyUserId ? getWallet(counterpartyUserId) : null;
  if (counterpartyUserId && !counterparty) return null;

  const cur = currency || 'NGN';
  if (cur === 'NGN' && sender.naira_balance < amount) return null;
  if (cur === 'USD' && sender.usd_balance < amount) return null;

  const recipientCurrency = counterparty?.preferred_currency || cur;
  let sendNaira = 0;
  let sendUsd = 0;
  let conversionRate = null;

  if (cur === recipientCurrency) {
    if (cur === 'NGN') sendNaira = amount;
    else sendUsd = amount;
  } else {
    conversionRate = await convert(amount, cur, recipientCurrency);
    if (cur === 'NGN') {
      sendNaira = amount;
      sendUsd = conversionRate.amount;
    } else {
      sendUsd = amount;
      sendNaira = conversionRate.amount;
    }
  }

  const ref = generateReference();
  const result = db.prepare(`
    INSERT INTO wallet_transactions
      (wallet_id, type, amount_naira, amount_usd, amount_sbtc, counterparty, status, reference, conversion_rate_ngn_usd, description)
    VALUES (?, 'send', ?, ?, '0', ?, 'pending', ?, ?, ?)
  `).run(sender.id, sendNaira, sendUsd, counterpartyUserId || null, ref, conversionRate ? String(conversionRate.rate) : null, description || null);

  if (cur === 'NGN') {
    db.prepare('UPDATE wallets SET naira_balance = naira_balance - ?, updated_at = ? WHERE id = ?')
      .run(amount, now(), sender.id);
  } else {
    db.prepare('UPDATE wallets SET usd_balance = usd_balance - ?, updated_at = ? WHERE id = ?')
      .run(amount, now(), sender.id);
  }

  if (counterparty) {
    const recipientRef = generateReference();
    db.prepare(`
      INSERT INTO wallet_transactions
        (wallet_id, type, amount_naira, amount_usd, amount_sbtc, counterparty, status, reference, conversion_rate_ngn_usd, description)
      VALUES (?, 'receive', ?, ?, '0', ?, 'pending', ?, ?, ?)
    `).run(counterparty.id, sendNaira, sendUsd, userId, recipientRef, conversionRate ? String(conversionRate.rate) : null, description || null);
  }

  const txn = db.prepare('SELECT * FROM wallet_transactions WHERE id = ?').get(Number(result.lastInsertRowid));
  return { ...txn, currency: cur };
}

export function confirmSend(reference, txId) {
  const db = getDb();
  const txn = db.prepare('SELECT * FROM wallet_transactions WHERE reference = ?').get(reference);
  if (!txn || txn.status !== 'pending') return null;

  db.prepare('UPDATE wallet_transactions SET status = ?, tx_id = ?, confirmed_at = ? WHERE id = ?')
    .run('confirmed', txId || null, now(), txn.id);

  if (txn.type === 'receive' && txn.status === 'pending') {
    const wallet = getWalletById(txn.wallet_id);
    if (wallet) {
      const updates = [];
      if (txn.amount_naira > 0) updates.push('naira_balance = naira_balance + ?');
      if (txn.amount_usd > 0) updates.push('usd_balance = usd_balance + ?');
      updates.push('updated_at = ?');
      const params = [];
      if (txn.amount_naira > 0) params.push(txn.amount_naira);
      if (txn.amount_usd > 0) params.push(txn.amount_usd);
      params.push(now(), txn.wallet_id);
      db.prepare(`UPDATE wallets SET ${updates.join(', ')} WHERE id = ?`).run(...params);
    }
  }

  return db.prepare('SELECT * FROM wallet_transactions WHERE id = ?').get(txn.id);
}

export function failTransaction(reference) {
  const db = getDb();
  const txn = db.prepare('SELECT * FROM wallet_transactions WHERE reference = ?').get(reference);
  if (!txn || txn.status !== 'pending') return null;

  const wallet = getWalletById(txn.wallet_id);
  if (!wallet) return null;

  if (txn.type === 'send') {
    const updates = [];
    if (txn.amount_naira > 0) updates.push('naira_balance = naira_balance + ?');
    if (txn.amount_usd > 0) updates.push('usd_balance = usd_balance + ?');
    updates.push('updated_at = ?');
    const params = [];
    if (txn.amount_naira > 0) params.push(txn.amount_naira);
    if (txn.amount_usd > 0) params.push(txn.amount_usd);
    params.push(now(), txn.wallet_id);
    db.prepare(`UPDATE wallets SET ${updates.join(', ')} WHERE id = ?`).run(...params);
  }

  db.prepare("UPDATE wallet_transactions SET status = 'failed' WHERE id = ?").run(txn.id);
  return db.prepare('SELECT * FROM wallet_transactions WHERE id = ?').get(txn.id);
}

export async function convertCurrency(userId, quoteId) {
  const quote = consumeQuote(quoteId);
  if (!quote) return null;
  if (quote.userId !== userId) return null;

  const db = getDb();
  const wallet = getWallet(userId);
  if (!wallet || wallet.status !== 'active') return null;

  if (quote.from === 'NGN' && wallet.naira_balance < quote.amount) return null;
  if (quote.from === 'USD' && wallet.usd_balance < quote.amount) return null;

  const conversion = await convert(quote.amount, quote.from, quote.to, quote.rates);
  const ref = generateReference();

  // Debit source
  if (quote.from === 'NGN') {
    db.prepare('UPDATE wallets SET naira_balance = naira_balance - ?, updated_at = ? WHERE id = ?')
      .run(quote.amount, now(), wallet.id);
  } else {
    db.prepare('UPDATE wallets SET usd_balance = usd_balance - ?, updated_at = ? WHERE id = ?')
      .run(quote.amount, now(), wallet.id);
  }

  // Credit destination
  if (quote.to === 'NGN') {
    db.prepare('UPDATE wallets SET naira_balance = naira_balance + ?, updated_at = ? WHERE id = ?')
      .run(conversion.amount, now(), wallet.id);
  } else {
    db.prepare('UPDATE wallets SET usd_balance = usd_balance + ?, updated_at = ? WHERE id = ?')
      .run(conversion.amount, now(), wallet.id);
  }

  const fromAmount = quote.from === 'NGN' ? quote.amount : 0;
  const fromUsd = quote.from === 'USD' ? quote.amount : 0;
  const toAmount = quote.to === 'NGN' ? conversion.amount : 0;
  const toUsd = quote.to === 'USD' ? conversion.amount : 0;

  const result = db.prepare(`
    INSERT INTO wallet_transactions
      (wallet_id, type, amount_naira, amount_usd, amount_sbtc, status, reference, conversion_rate_ngn_usd, description)
    VALUES (?, 'swap', ?, ?, '0', 'confirmed', ?, ?, ?)
  `).run(wallet.id, fromAmount - toAmount, fromUsd - toUsd, ref, String(conversion.rate), `Converted ${quote.amount} ${quote.from} → ${conversion.amount} ${quote.to}`);

  return db.prepare('SELECT * FROM wallet_transactions WHERE id = ?').get(Number(result.lastInsertRowid));
}

export function getTransactionHistory(userId, { limit = 20, offset = 0 } = {}) {
  const db = getDb();
  const wallet = getWallet(userId);
  if (!wallet) return { transactions: [], pagination: { offset, limit, total: 0 } };
  const total = db.prepare('SELECT COUNT(*) as count FROM wallet_transactions WHERE wallet_id = ?').get(wallet.id).count;
  const transactions = db.prepare(`
    SELECT * FROM wallet_transactions WHERE wallet_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?
  `).all(wallet.id, limit, offset);
  return { transactions, pagination: { offset, limit, total } };
}

export async function getWalletSummary(userId) {
  const wallet = getWallet(userId);
  if (!wallet) return null;
  const balance = await getBalance(userId);
  return {
    wallet: { id: wallet.id, userId: wallet.user_id, status: wallet.status, preferredCurrency: wallet.preferred_currency },
    balance,
    hasPillarWallet: !!wallet.pillar_wallet_address,
    bnsName: wallet.bns_name,
  };
}
