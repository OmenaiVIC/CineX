import type { ServiceResponse } from '../types';
import * as api from './api';

export interface WalletBalance {
  address: string;
  stxBalance: string;
  ngnBalance: string;
  usdBalance: string;
  lastUpdated: number;
}

interface BackendBalance {
  address: string;
  stxBalance: string;
  ngnBalance: string;
  usdBalance: string;
  lastUpdated: number;
}

interface BackendWallet {
  userId: string;
  nairaBalance: number;
  usdBalance: number;
  sbtcBalance: string;
  status: string;
  preferredCurrency: string;
  updatedAt: number;
}

function toBalance(wallet: BackendWallet): WalletBalance {
  return {
    address: wallet.userId,
    stxBalance: wallet.sbtcBalance || '0',
    ngnBalance: String(wallet.nairaBalance || 0),
    usdBalance: String(wallet.usdBalance || 0),
    lastUpdated: (wallet.updatedAt || Math.floor(Date.now() / 1000)) * 1000,
  };
}

export async function getWalletBalance(address: string): Promise<ServiceResponse<WalletBalance>> {
  const res = await api.get<{ wallet: BackendWallet }>(`/wallets/${address}`);
  if (res.success && res.data?.wallet) {
    return { success: true, data: toBalance(res.data.wallet) };
  }
  try {
    const bal = await api.get<BackendBalance>(`/wallets/${address}/balance`);
    if (bal.success && bal.data) return { success: true, data: bal.data };
  } catch { /* fall through */ }
  return {
    success: true,
    data: { address, stxBalance: '0', ngnBalance: '0', usdBalance: '0', lastUpdated: Date.now() },
  };
}

export async function creditWallet(address: string, stxAmount: string): Promise<ServiceResponse<WalletBalance>> {
  const res = await api.post<{ wallet: BackendWallet }>('/wallets/deposit', {
    user_id: address,
    amount_sbtc: stxAmount,
  });
  if (res.success && res.data?.wallet) return { success: true, data: toBalance(res.data.wallet) };
  return getWalletBalance(address);
}

export async function depositToWallet(address: string, amount: number, currency: 'NGN' | 'USD' | 'STX'): Promise<ServiceResponse<WalletBalance>> {
  const body: Record<string, unknown> = { user_id: address };
  if (currency === 'NGN') body.amount_naira = amount;
  else if (currency === 'USD') body.amount_usd = amount;
  else body.amount_sbtc = String(amount);
  body.currency = currency;
  const res = await api.post<{ transaction: { reference: string; id: number } }>('/wallets/deposit', body);
  if (!res.success) return { success: false, error: res.error || 'Deposit failed' };
  if (res.data?.transaction?.reference) {
    const confirmRes = await confirmDeposit(res.data.transaction.reference);
    if (!confirmRes.success) return { success: false, error: confirmRes.error || 'Deposit confirmation failed' };
  }
  return getWalletBalance(address);
}

export async function confirmDeposit(reference: string): Promise<ServiceResponse<unknown>> {
  const res = await api.post('/wallets/confirm-deposit', { reference });
  return res;
}

export async function debitWallet(address: string, stxAmount: string): Promise<ServiceResponse<WalletBalance>> {
  const res = await api.post<{ wallet: BackendWallet }>('/wallets/send', {
    user_id: address,
    amount: parseInt(stxAmount, 10),
    counterparty_user_id: 'pool',
  });
  if (!res.success) return { success: false, error: res.error || 'Insufficient balance' };
  return getWalletBalance(address);
}

export async function sendFunds(
  senderAddress: string,
  recipientId: string,
  amount: number,
  currency: 'NGN' | 'USD' | 'STX'
): Promise<ServiceResponse<WalletBalance>> {
  const res = await api.post<{ wallet: BackendWallet }>('/wallets/send', {
    user_id: senderAddress,
    amount,
    currency,
    counterparty_user_id: recipientId,
  });
  if (!res.success) return { success: false, error: res.error || 'Transaction failed' };
  return getWalletBalance(senderAddress);
}

export async function convertCurrency(
  from: 'stx' | 'usd' | 'ngn',
  to: 'stx' | 'usd' | 'ngn',
  amount: string
): Promise<ServiceResponse<{ amount: string; rate: string; fee: string }>> {
  const res = await api.post<{ result: { amount: string; rate: string } }>('/wallets/rates/convert', { amount, from, to });
  if (!res.success || !res.data) {
    const fallback = localConvert(from, to, amount);
    return { success: true, data: fallback };
  }
  return {
    success: true,
    data: {
      amount: res.data.result.amount,
      rate: res.data.result.rate,
      fee: (Number(amount) * 0.0075).toFixed(2),
    },
  };
}

export async function getConversionRates(): Promise<ServiceResponse<{ ngnPerUsd: number; spread: number }>> {
  const res = await api.get<{ ngnPerUsd: number; spread: number }>('/wallets/rates/all');
  if (res.success && res.data) return { success: true, data: res.data };
  return { success: true, data: { ngnPerUsd: 1400, spread: 0.0075 } };
}

const NGN_PER_USD = 1400;
const SPREAD = 0.0075;

function localConvert(from: string, to: string, amount: string): { amount: string; rate: string; fee: string } {
  const amt = Number(amount);
  let stxValue = from === 'ngn' ? amt / NGN_PER_USD : amt;
  const fee = stxValue * SPREAD;
  const netStx = stxValue - fee;
  let result = to === 'ngn' ? netStx * NGN_PER_USD : netStx;
  return {
    amount: (Math.floor(result * 100) / 100).toString(),
    rate: to === 'ngn' ? String(NGN_PER_USD) : '1',
    fee: (Math.floor(fee * 100) / 100).toString(),
  };
}
