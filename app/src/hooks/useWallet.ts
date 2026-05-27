import { useState, useEffect, useCallback } from 'react';
import type { ServiceResponse } from '../types';
import type { WalletBalance } from '../services/walletService';
import { getWalletBalance, creditWallet, debitWallet } from '../services/walletService';

export function useWallet(address: string) {
  const [balance, setBalance] = useState<WalletBalance | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(() => {
    setLoading(true);
    getWalletBalance(address).then(res => {
      if (res.success && res.data) setBalance(res.data);
      setLoading(false);
    });
  }, [address]);

  useEffect(() => { refresh(); }, [refresh]);

  const credit = useCallback(async (amount: string): Promise<ServiceResponse<WalletBalance>> => {
    const res = await creditWallet(address, amount);
    if (res.success && res.data) setBalance(res.data);
    return res;
  }, [address]);

  const debit = useCallback(async (amount: string): Promise<ServiceResponse<WalletBalance>> => {
    const res = await debitWallet(address, amount);
    if (res.success && res.data) setBalance(res.data);
    return res;
  }, [address]);

  return { balance, loading, refresh, credit, debit };
}
