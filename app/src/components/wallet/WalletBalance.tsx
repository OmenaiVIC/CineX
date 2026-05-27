import { useState, useEffect, useCallback } from 'react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import type { WalletBalance as WalletBalanceType } from '../../contexts/DemoStorage';
import { getWalletBalance } from '../../services/walletService';

interface Props {
  address: string;
  onFund?: () => void;
  onSend?: () => void;
}

export default function WalletBalance({ address, onFund, onSend }: Props) {
  const [balance, setBalance] = useState<WalletBalanceType | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const res = await getWalletBalance(address);
    if (res.success && res.data) setBalance(res.data);
    setLoading(false);
  }, [address]);

  useEffect(() => { refresh(); }, [refresh]);

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

  if (!balance) return null;

  return (
    <Card variant="light" padding="default">
      <div className="flex items-start justify-between mb-4">
        <p className="text-sm text-gray-400 uppercase tracking-wider font-medium">Wallet Balance</p>
        <button onClick={refresh} className="text-gray-500 hover:text-[#4ade80] transition-colors" title="Refresh">
          ↻
        </button>
      </div>
      <div className="space-y-1 mb-6">
        <p className="text-3xl font-bold text-white">₦{Number(balance.ngnBalance).toLocaleString()}</p>
        <p className="text-lg text-gray-400">${Number(balance.usdBalance).toLocaleString()}</p>
      </div>
      <div className="flex gap-3">
        {onFund && <Button variant="primary" size="small" onClick={onFund}>Fund Wallet</Button>}
        {onSend && <Button variant="outline" size="small" onClick={onSend}>Send</Button>}
      </div>
      <p className="text-xs text-gray-600 mt-3 font-mono truncate">{address.slice(0, 10)}...{address.slice(-6)}</p>
    </Card>
  );
}
