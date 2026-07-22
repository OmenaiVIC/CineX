import { useState, useEffect, useCallback } from 'react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import type { WalletBalance as WalletBalanceType } from '../../contexts/DemoStorage';
import { getWalletBalance } from '../../services/walletService';
import { getStxBalance, getSip010Balance, type TokenBalance } from '../../services/tokenService';
import { getContractAddress } from '../../utils/network';

interface Props {
  address: string;
  onFund?: () => void;
  onSend?: () => void;
  refreshKey?: number;
}

export default function WalletBalance({ address, onFund, onSend, refreshKey }: Props) {
  const [backendBalance, setBackendBalance] = useState<WalletBalanceType | null>(null);
  const [stxBalance, setStxBalance] = useState<TokenBalance | null>(null);
  const [usdcxBalance, setUsdcxBalance] = useState<TokenBalance | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const [backendRes, stxRes, usdcxRes] = await Promise.all([
      getWalletBalance(address),
      getStxBalance(address).catch(() => ({ success: false, data: null })),
      getSip010Balance(
        getContractAddress('usdcx') || 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM',
        'usdcx',
        address,
      ).catch(() => ({ success: false, data: null })),
    ]);
    if (backendRes.success && backendRes.data) setBackendBalance(backendRes.data);
    if (stxRes.success && stxRes.data) setStxBalance(stxRes.data);
    if (usdcxRes.success && usdcxRes.data) setUsdcxBalance(usdcxRes.data);
    setLoading(false);
  }, [address]);

  useEffect(() => { refresh(); }, [refresh, refreshKey]);

  if (loading) {
    return (
      <Card variant="light" padding="default">
        <div className="animate-pulse space-y-3">
          <div className="h-4 w-24 bg-gray-800 rounded" />
          <div className="h-8 w-40 bg-gray-800 rounded" />
          <div className="h-4 w-32 bg-gray-800 rounded" />
        </div>
      </Card>
    );
  }

  return (
    <Card variant="light" padding="default">
      <div className="flex items-start justify-between mb-4">
        <p className="text-sm text-gray-400 uppercase tracking-wider font-medium">Wallet Balance</p>
        <button onClick={refresh} className="text-gray-500 hover:text-[#4ade80] transition-colors" title="Refresh">
          ↻
        </button>
      </div>

      <div className="space-y-3 mb-6">
        {stxBalance && (
          <div className="flex items-baseline justify-between">
            <div>
              <p className="text-xs text-gray-500 mb-0.5">STX (on-chain)</p>
              <p className="text-2xl font-bold text-white">{Number(stxBalance.balance).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })}</p>
            </div>
            <span className="text-xs text-gray-600">STX</span>
          </div>
        )}

        {usdcxBalance && (
          <div className="flex items-baseline justify-between">
            <div>
              <p className="text-xs text-gray-500 mb-0.5">Digital dollars (on-chain)</p>
              <p className="text-2xl font-bold text-white">${Number(usdcxBalance.balance).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })}</p>
            </div>
            <span className="text-xs text-gray-600">USDCx</span>
          </div>
        )}

        {backendBalance && (
          <>
            <div className="border-t border-gray-800 pt-3">
              <p className="text-xs text-gray-600 mb-2">Book balance</p>
              <div className="flex items-baseline justify-between">
                <p className="text-lg font-semibold text-gray-300">₦{Number(backendBalance.ngnBalance).toLocaleString()}</p>
                <span className="text-xs text-gray-600">NGN</span>
              </div>
              <div className="flex items-baseline justify-between mt-1">
                <p className="text-lg font-semibold text-gray-300">${Number(backendBalance.usdBalance).toLocaleString()}</p>
                <span className="text-xs text-gray-600">USD</span>
              </div>
            </div>
          </>
        )}

        {!stxBalance && !usdcxBalance && backendBalance && (
          <div className="space-y-1">
            <p className="text-3xl font-bold text-white">₦{Number(backendBalance.ngnBalance).toLocaleString()}</p>
            <p className="text-lg text-gray-400">${Number(backendBalance.usdBalance).toLocaleString()}</p>
          </div>
        )}
      </div>

      <div className="flex gap-3">
        {onFund && <Button variant="primary" size="small" onClick={onFund}>Fund Wallet</Button>}
        {onSend && <Button variant="outline" size="small" onClick={onSend}>Send</Button>}
      </div>
      <p className="text-xs text-gray-600 mt-3 font-mono truncate">{address.slice(0, 10)}...{address.slice(-6)}</p>
    </Card>
  );
}
