import { useState, useEffect, useCallback } from 'react';
import type { ServiceResponse } from '../types';
import type { WalletBalance } from '../contexts/DemoStorage';
import { getWalletBalance, creditWallet, debitWallet } from '../services/walletService';

export function useWallet(address: string) {
  const [balance, setBalance] = useState<WalletBalance | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(() => {
    setLoading(true);
    const res = getWalletBalance(address);
    if (res.success && res.data) setBalance(res.data);
    setLoading(false);
  }, [address]);

  useEffect(() => { refresh(); }, [refresh]);

  const credit = useCallback((amount: string): ServiceResponse<WalletBalance> => {
    const res = creditWallet(address, amount);
    if (res.success && res.data) setBalance(res.data);
    return res;
  }, [address]);

  const debit = useCallback((amount: string): ServiceResponse<WalletBalance> => {
    const res = debitWallet(address, amount);
    if (res.success && res.data) setBalance(res.data);
    return res;
  }, [address]);

  return { balance, loading, refresh, credit, debit };
}
