import { useState, useEffect, useCallback } from 'react';
import { getStxBalance, getSip010Balance, type TokenBalance } from '../services/tokenService';
import { getWalletBalance, type WalletBalance } from '../services/walletService';
import { getContractAddress } from '../utils/network';
import type { ServiceResponse } from '../types';

export interface UnifiedBalance {
  stx: TokenBalance | null;
  usdcx: TokenBalance | null;
  backend: WalletBalance | null;
  loading: boolean;
  error: string | null;
}

export function useBalance(address: string | null) {
  const [balance, setBalance] = useState<UnifiedBalance>({
    stx: null, usdcx: null, backend: null, loading: true, error: null,
  });

  const refresh = useCallback(async () => {
    if (!address) { setBalance(s => ({ ...s, loading: false })); return; }
    setBalance(s => ({ ...s, loading: true, error: null }));
    try {
      const [stxRes, usdcxRes, backendRes] = await Promise.all([
        getStxBalance(address),
        getSip010Balance(
          getContractAddress('usdcx') || 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM',
          'usdcx',
          address,
        ),
        getWalletBalance(address).catch(() => ({ success: false, data: null }) as ServiceResponse<WalletBalance>),
      ]);
      setBalance({
        stx: stxRes.success ? stxRes.data! : null,
        usdcx: usdcxRes.success ? usdcxRes.data! : null,
        backend: backendRes.success ? backendRes.data! : null,
        loading: false,
        error: stxRes.error || usdcxRes.error || null,
      });
    } catch (err) {
      setBalance(s => ({ ...s, loading: false, error: String(err) }));
    }
  }, [address]);

  useEffect(() => { refresh(); }, [refresh]);

  return { ...balance, refresh };
}
