import { getDb } from '../database.js';
import crypto from 'crypto';

const NGN_PER_SBTC = 120000000;
const REFERENCE_PREFIX = 'CNX';

function generateReference() {
  return `${REFERENCE_PREFIX}-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
}

function now() {
  return Math.floor(Date.now() / 1000);
}

export function createWallet({ userId, email, phone }) {
  const db = getDb();
  const existing = db.prepare('SELECT * FROM wallets WHERE user_id = ?').get(userId);
  if (existing) {
    return existing;
  }
  const result = db.prepare(`
    INSERT INTO wallets (user_id, email, phone, status)
    VALUES (?, ?, ?, 'pending')
  `).run(userId, email || null, phone || null);
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
  if (!existing) {
    return null;
  }
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

export function getBalance(userId) {
  const db = getDb();
  const wallet = getWallet(userId);
  if (!wallet) {
    return { naira: 0, sbtc: '0', stx: '0' };
  }
  return {
    naira: wallet.naira_balance,
    sbtc: wallet.sbtc_balance,
    stx: wallet.sbtc_balance,
    naira_equivalent: Math.round(parseInt(wallet.sbtc_balance || '0') * NGN_PER_SBTC / 100000000)
  };
}

export function recordDeposit(userId, { amountNaira, amountSbtc, txId, description }) {
  const db = getDb();
  const wallet = getWallet(userId);
  if (!wallet) {
    return null;
  }
  const ref = generateReference();
  const result = db.prepare(`
    INSERT INTO wallet_transactions (wallet_id, type, amount_naira, amount_sbtc, status, reference, tx_id, description)
    VALUES (?, 'deposit', ?, ?, 'pending', ?, ?, ?)
  `).run(wallet.id, amountNaira || 0, amountSbtc || '0', ref, txId || null, description || null);
  const txn = db.prepare('SELECT * FROM wallet_transactions WHERE id = ?').get(Number(result.lastInsertRowid));
  return { ...txn, naira_balance_before: wallet.naira_balance, naira_balance_after: wallet.naira_balance + (amountNaira || 0) };
}

export function confirmDeposit(txId, reference) {
  const db = getDb();
  const txn = db.prepare('SELECT * FROM wallet_transactions WHERE reference = ? OR tx_id = ?').get(reference, txId);
  if (!txn || txn.status !== 'pending') {
    return null;
  }
  const wallet = getWalletById(txn.wallet_id);
  if (!wallet) {
    return null;
  }
  db.prepare(`
    UPDATE wallet_transactions SET status = 'confirmed', confirmed_at = ? WHERE id = ?
  `).run(now(), txn.id);
  db.prepare(`
    UPDATE wallets SET naira_balance = naira_balance + ?, sbtc_balance = CAST(sbtc_balance AS INTEGER) + ?, updated_at = ? WHERE id = ?
  `).run(txn.amount_naira, txn.amount_sbtc, now(), txn.wallet_id);
  return db.prepare('SELECT * FROM wallet_transactions WHERE id = ?').get(txn.id);
}

export function recordSend(userId, { amountNaira, amountSbtc, counterparty, description }) {
  const db = getDb();
  const wallet = getWallet(userId);
  if (!wallet) {
    return null;
  }
  if (wallet.status !== 'active') {
    return null;
  }
  if (wallet.naira_balance < (amountNaira || 0)) {
    return null;
  }
  const ref = generateReference();
  const result = db.prepare(`
    INSERT INTO wallet_transactions (wallet_id, type, amount_naira, amount_sbtc, counterparty, status, reference, description)
    VALUES (?, 'send', ?, ?, ?, 'pending', ?, ?)
  `).run(wallet.id, amountNaira || 0, amountSbtc || '0', counterparty || null, ref, description || null);
  db.prepare(`
    UPDATE wallets SET naira_balance = naira_balance - ?, updated_at = ? WHERE id = ?
  `).run(amountNaira || 0, now(), wallet.id);
  const txn = db.prepare('SELECT * FROM wallet_transactions WHERE id = ?').get(Number(result.lastInsertRowid));
  return { ...txn, naira_balance_after: Math.max(0, wallet.naira_balance - (amountNaira || 0)) };
}

export function confirmSend(reference, txId) {
  const db = getDb();
  const txn = db.prepare('SELECT * FROM wallet_transactions WHERE reference = ?').get(reference);
  if (!txn || txn.status !== 'pending') {
    return null;
  }
  db.prepare(`
    UPDATE wallet_transactions SET status = 'confirmed', tx_id = ?, confirmed_at = ? WHERE id = ?
  `).run(txId || null, now(), txn.id);
  return db.prepare('SELECT * FROM wallet_transactions WHERE id = ?').get(txn.id);
}

export function getTransactionHistory(userId, { limit = 20, offset = 0 } = {}) {
  const db = getDb();
  const wallet = getWallet(userId);
  if (!wallet) {
    return { transactions: [], pagination: { offset, limit, total: 0 } };
  }
  const total = db.prepare('SELECT COUNT(*) as count FROM wallet_transactions WHERE wallet_id = ?').get(wallet.id).count;
  const transactions = db.prepare(`
    SELECT * FROM wallet_transactions WHERE wallet_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?
  `).all(wallet.id, limit, offset);
  return { transactions, pagination: { offset, limit, total } };
}

export function failTransaction(reference) {
  const db = getDb();
  const txn = db.prepare('SELECT * FROM wallet_transactions WHERE reference = ?').get(reference);
  if (!txn || txn.status !== 'pending') {
    return null;
  }
  if (txn.type === 'send') {
    const wallet = getWalletById(txn.wallet_id);
    if (wallet) {
      db.prepare(`
        UPDATE wallets SET naira_balance = naira_balance + ?, updated_at = ? WHERE id = ?
      `).run(txn.amount_naira, now(), txn.wallet_id);
    }
  }
  db.prepare('UPDATE wallet_transactions SET status = ? WHERE id = ?').run('failed', txn.id);
  return db.prepare('SELECT * FROM wallet_transactions WHERE id = ?').get(txn.id);
}
