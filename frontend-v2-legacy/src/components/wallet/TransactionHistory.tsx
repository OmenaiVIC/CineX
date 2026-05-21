import React, { useEffect, useState, useCallback } from 'react';
import { ApiWalletService } from '../../services/apiServices';
import type { WalletTransaction } from '../../services/apiServices';

interface TransactionHistoryProps {
  userId: string;
}

type TransactionType = 'all' | 'deposit' | 'send' | 'receive' | 'swap' | 'fee';

function TransactionHistory({ userId }: TransactionHistoryProps) {
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<TransactionType>('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 10;

  const walletService = new ApiWalletService();

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await walletService.getTransactions(userId, { page, limit });
    if (res.success && res.data) {
      const filtered = filterType === 'all'
        ? res.data.items
        : res.data.items.filter((tx) => tx.type === filterType);
      setTransactions(filtered);
      setTotalPages(res.data.totalPages);
    } else {
      setError(res.error || 'Failed to load transactions');
    }
    setLoading(false);
  }, [userId, page, filterType, walletService]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'deposit': return '+';
      case 'send': return '↑';
      case 'receive': return '↓';
      case 'swap': return '⇄';
      case 'fee': return '—';
      default: return '•';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'deposit': return 'text-[#4ade80]';
      case 'send': return 'text-red-400';
      case 'receive': return 'text-[#4ade80]';
      case 'swap': return 'text-[#00e5ff]';
      case 'fee': return 'text-gray-400';
      default: return 'text-gray-400';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'text-[#4ade80]';
      case 'pending': return 'text-[#f59e0b]';
      case 'failed': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-NG', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const formatAmount = (tx: WalletTransaction) => {
    if (tx.currency === 'NGN') return `₦${tx.amountNgn.toLocaleString()}`;
    return `$${tx.amountUsd.toLocaleString()}`;
  };

  const emptyState = !loading && transactions.length === 0;

  const filterOptions: { value: TransactionType; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'deposit', label: 'Deposits' },
    { value: 'send', label: 'Sent' },
    { value: 'receive', label: 'Received' },
    { value: 'swap', label: 'Swaps' },
  ];

  return (
    <div className="glass-card p-8">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-white">Transaction History</h3>
        <button
          onClick={fetchTransactions}
          className="text-xs text-gray-400 hover:text-[#4ade80] transition-colors"
          disabled={loading}
        >
          {loading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
        {filterOptions.map((opt) => (
          <button
            key={opt.value}
            onClick={() => { setFilterType(opt.value); setPage(1); }}
            className={`px-3 py-1.5 text-xs rounded-full whitespace-nowrap transition-colors ${
              filterType === opt.value
                ? 'bg-[#4ade80] text-black font-medium'
                : 'bg-[rgba(255,255,255,0.05)] text-gray-400 hover:text-white'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {loading && transactions.length === 0 && (
        <div className="text-center py-8">
          <div className="animate-pulse text-gray-400">Loading transactions...</div>
        </div>
      )}

      {error && (
        <div className="text-center py-8">
          <p className="text-red-400 text-sm mb-2">{error}</p>
          <button onClick={fetchTransactions} className="text-[#4ade80] text-sm hover:underline">Retry</button>
        </div>
      )}

      {emptyState && (
        <div className="text-center py-12">
          <p className="text-gray-500 text-sm mb-1">No transactions yet</p>
          <p className="text-gray-600 text-xs">Fund your wallet to get started.</p>
        </div>
      )}

      {transactions.length > 0 && (
        <>
          <div className="space-y-2">
            {transactions.map((tx) => (
              <div
                key={tx.id}
                className="flex items-center justify-between p-3 bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.04)] rounded-xl hover:border-[rgba(74,222,128,0.15)] transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 flex items-center justify-center rounded-full border ${getTypeColor(tx.type)} border-current/20 text-sm font-bold`}>
                    {getTypeIcon(tx.type)}
                  </div>
                  <div>
                    <p className="text-white text-sm font-medium capitalize">{tx.type}</p>
                    <p className="text-gray-500 text-xs">{formatDate(tx.createdAt)}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-medium ${getTypeColor(tx.type)}`}>{formatAmount(tx)}</p>
                  <p className={`text-xs ${getStatusColor(tx.status)} capitalize`}>{tx.status}</p>
                </div>
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="px-3 py-1.5 text-xs border border-gray-700 rounded-full disabled:opacity-30 text-gray-400 hover:text-white transition-colors"
              >
                Previous
              </button>
              <span className="text-xs text-gray-500">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="px-3 py-1.5 text-xs border border-gray-700 rounded-full disabled:opacity-30 text-gray-400 hover:text-white transition-colors"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default TransactionHistory;
