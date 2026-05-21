import React, { useEffect, useState, useCallback } from 'react';
import { ApiWalletService } from '../../services/apiServices';
import type { WalletBalance as WalletBalanceType } from '../../services/apiServices';

interface WalletBalanceProps {
  userId: string;
  compact?: boolean;
}

function WalletBalance({ userId, compact = false }: WalletBalanceProps) {
  const [balance, setBalance] = useState<WalletBalanceType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const walletService = new ApiWalletService();

  const fetchBalance = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await walletService.getBalance(userId);
    if (res.success && res.data) {
      setBalance(res.data);
    } else {
      setError(res.error || 'Failed to load balance');
    }
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    fetchBalance();
    const interval = setInterval(fetchBalance, 30000);
    return () => clearInterval(interval);
  }, [fetchBalance]);

  if (loading && !balance) {
    return (
      <div className="glass-card p-6 text-center">
        <div className="animate-pulse text-gray-400">Loading balance...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass-card p-6 text-center">
        <p className="text-red-400 text-sm mb-2">{error}</p>
        <button onClick={fetchBalance} className="text-[#4ade80] text-sm hover:underline">
          Retry
        </button>
      </div>
    );
  }

  if (!balance) return null;

  const primaryBalance = balance.preferredCurrency === 'NGN'
    ? `₦${balance.ngn.toLocaleString()}`
    : `$${balance.usd.toLocaleString()}`;

  const secondaryLabel = balance.preferredCurrency === 'NGN' ? 'USD' : 'NGN';
  const secondaryValue = balance.preferredCurrency === 'NGN'
    ? `$${balance.usdEquivalent.toLocaleString()}`
    : `₦${balance.ngnEquivalent.toLocaleString()}`;

  if (compact) {
    return (
      <div className="glass-card p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-gray-400 text-xs">Balance</p>
            <p className="text-2xl font-bold text-white">{primaryBalance}</p>
          </div>
          <div className="text-right">
            <p className="text-gray-400 text-xs">{secondaryLabel}</p>
            <p className="text-sm text-gray-300">{secondaryValue}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card p-8">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-white">Wallet Balance</h3>
        <button
          onClick={fetchBalance}
          className="text-xs text-gray-400 hover:text-[#4ade80] transition-colors"
          disabled={loading}
        >
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-[rgba(74,222,128,0.05)] border border-[rgba(74,222,128,0.1)] rounded-2xl p-5">
          <p className="text-gray-400 text-xs uppercase tracking-wider mb-1">Preferred Currency</p>
          <p className="text-3xl font-bold text-white">{primaryBalance}</p>
          <p className="text-xs text-gray-400 mt-1">{balance.preferredCurrency} balance</p>
        </div>

        <div className="bg-[rgba(245,158,11,0.05)] border border-[rgba(245,158,11,0.1)] rounded-2xl p-5">
          <p className="text-gray-400 text-xs uppercase tracking-wider mb-1">Converted</p>
          <p className="text-3xl font-bold text-[#f59e0b]">{secondaryValue}</p>
          <p className="text-xs text-gray-400 mt-1">at rate ₦{balance.rates.ngnUsd.toFixed(2)}/$</p>
        </div>

        <div className="bg-[rgba(0,229,255,0.05)] border border-[rgba(0,229,255,0.1)] rounded-2xl p-5">
          <p className="text-gray-400 text-xs uppercase tracking-wider mb-1">sBTC Backing</p>
          <p className="text-3xl font-bold text-[#00e5ff]">
            {parseInt(balance.sbtc || '0') > 0 ? `${(parseInt(balance.sbtc) / 1e8).toFixed(8)}` : '0.00000000'}
          </p>
          <p className="text-xs text-gray-400 mt-1">~${balance.usd > 0 ? (balance.usd / 96000).toFixed(4) : '0.0000'} BTC</p>
        </div>
      </div>
    </div>
  );
}

export default WalletBalance;
