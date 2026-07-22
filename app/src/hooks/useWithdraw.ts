import { useCallback } from 'react';
import { useTransaction, type UseTransactionReturn } from './useTransaction';
import type { WithdrawParams } from '../types';
import { API_BASE } from '../services/api';

export interface UseWithdrawReturn extends UseTransactionReturn {
  withdraw: (params: WithdrawParams) => Promise<void>;
}

export function useWithdraw(userAddress: string | null): UseWithdrawReturn {
  const tx = useTransaction();

  const withdraw = useCallback(async (params: WithdrawParams) => {
    if (!userAddress) { tx.fail('Wallet not connected'); return; }

    try {
      tx.start('withdraw', params.amountMicro, 'USDCx');

      tx.broadcast('pending-escrow-withdraw');

      const res = await fetch(`${API_BASE}/escrow/withdraw`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_address: userAddress,
          campaign_id: params.campaignId,
          amount: params.amountMicro,
          recipient: params.recipient,
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

  return { ...tx, withdraw };
}
