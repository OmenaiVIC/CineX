import type { ServiceResponse } from '../types';
import { getDemoData, setDemoData } from '../contexts/DemoStorage';
import type { WalletBalance } from '../contexts/DemoStorage';

const NGN_PER_USD = 1400;
const SPREAD = 0.0075;

function round(n: number): string {
  return Math.floor(n * 100) / 100 + '';
}

export function getWalletBalance(address: string): ServiceResponse<WalletBalance> {
  const data = getDemoData();
  const bal = data.walletBalances.find(w => w.address === address);
  if (!bal) {
    const newBal: WalletBalance = {
      address,
      stxBalance: '0',
      ngnBalance: '0',
      usdBalance: '0',
      lastUpdated: Date.now(),
    };
    data.walletBalances.push(newBal);
    setDemoData(data);
    return { success: true, data: newBal };
  }
  return { success: true, data: bal };
}

export function creditWallet(address: string, stxAmount: string): ServiceResponse<WalletBalance> {
  const data = getDemoData();
  const idx = data.walletBalances.findIndex(w => w.address === address);
  const amt = Number(stxAmount);

  if (idx === -1) {
    const newBal: WalletBalance = {
      address,
      stxBalance: stxAmount,
      ngnBalance: round(amt * NGN_PER_USD),
      usdBalance: round(amt),
      lastUpdated: Date.now(),
    };
    data.walletBalances.push(newBal);
  } else {
    const current = Number(data.walletBalances[idx].stxBalance);
    const total = current + amt;
    data.walletBalances[idx].stxBalance = round(total);
    data.walletBalances[idx].ngnBalance = round(total * NGN_PER_USD);
    data.walletBalances[idx].usdBalance = round(total);
    data.walletBalances[idx].lastUpdated = Date.now();
  }
  setDemoData(data);
  return getWalletBalance(address);
}

export function debitWallet(address: string, stxAmount: string): ServiceResponse<WalletBalance> {
  const data = getDemoData();
  const idx = data.walletBalances.findIndex(w => w.address === address);
  if (idx === -1) return { success: false, error: 'Wallet not found' };

  const amt = Number(stxAmount);
  const current = Number(data.walletBalances[idx].stxBalance);
  if (current < amt) return { success: false, error: 'Insufficient balance' };

  const total = current - amt;
  data.walletBalances[idx].stxBalance = round(total);
  data.walletBalances[idx].ngnBalance = round(total * NGN_PER_USD);
  data.walletBalances[idx].usdBalance = round(total);
  data.walletBalances[idx].lastUpdated = Date.now();
  setDemoData(data);
  return getWalletBalance(address);
}

export function convertCurrency(
  from: 'stx' | 'usd' | 'ngn',
  to: 'stx' | 'usd' | 'ngn',
  amount: string
): ServiceResponse<{ amount: string; rate: string; fee: string }> {
  const amt = Number(amount);
  let stxValue: number;

  switch (from) {
    case 'stx': stxValue = amt; break;
    case 'usd': stxValue = amt; break;
    case 'ngn': stxValue = amt / NGN_PER_USD; break;
    default: return { success: false, error: 'Invalid source currency' };
  }

  const fee = stxValue * SPREAD;
  const netStx = stxValue - fee;
  let result: number;

  switch (to) {
    case 'stx': result = netStx; break;
    case 'usd': result = netStx; break;
    case 'ngn': result = netStx * NGN_PER_USD; break;
    default: return { success: false, error: 'Invalid target currency' };
  }

  return {
    success: true,
    data: {
      amount: round(result),
      rate: to === 'ngn' ? NGN_PER_USD.toString() : '1',
      fee: round(fee),
    },
  };
}

export function getConversionRates(): ServiceResponse<{ ngnPerUsd: number; spread: number }> {
  return { success: true, data: { ngnPerUsd: NGN_PER_USD, spread: SPREAD } };
}
