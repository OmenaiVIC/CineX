import { useCallback } from 'react';
import { useTransaction, type UseTransactionReturn } from './useTransaction';
import type { DepositParams } from '../types';
import { API_BASE } from '../services/api';

export interface UseDepositReturn extends UseTransactionReturn {
  deposit: (params: DepositParams) => Promise<void>;
}

export function useDeposit(userAddress: string | null): UseDepositReturn {
  const tx = useTransaction();

  const deposit = useCallback(async (params: DepositParams) => {
    if (!userAddress) { tx.fail('Wallet not connected'); return; }

    try {
      tx.start('deposit', params.amountMicro, 'USDCx');

      tx.broadcast('pending-escrow-deposit');

      const res = await fetch(`${API_BASE}/escrow/deposit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_address: userAddress,
          campaign_id: params.campaignId,
          amount: params.amountMicro,
          token: 'USDCx',
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || body.message || `HTTP ${res.status}`);
      }

      const data = await res.json();
      if (data.txid) {
        tx.broadcast(data.txid);
      } else {
        tx.confirm();
      }
    } catch (err) {
      tx.fail(err);
    }
  }, [userAddress, tx]);

  return { ...tx, deposit };
}
