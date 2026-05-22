import { useState, useEffect } from 'react';
import { useAuth } from '@contexts/StacksAuthContext';

interface Tx {
  txid: string;
  block_height: number;
  tx_type: string;
  tx_status: string;
  token_transfer?: {
    recipient_address: string;
    amount: string;
  };
  block_time_iso: string;
}

function TransactionHistory() {
  const { isAuthenticated, userData, getAddressFromUserData } = useAuth();
  const [txs, setTxs] = useState<Tx[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const address = userData ? getAddressFromUserData(userData) : '';

  useEffect(() => {
    if (!address) {
      setLoading(false);
      return;
    }

    const fetchTxs = async () => {
      try {
        setLoading(true);
        const network = address.startsWith('ST') ? 'testnet' : 'mainnet';
        const baseUrl = network === 'testnet' ? 'https://api.testnet.hiro.so' : 'https://api.mainnet.hiro.so';
        const res = await fetch(`${baseUrl}/extended/v1/address/${address}/transactions?limit=20`);
        if (!res.ok) throw new Error('API error');
        const json = await res.json();
        setTxs(json.results || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load transactions');
      } finally {
        setLoading(false);
      }
    };

    fetchTxs();
    const interval = setInterval(fetchTxs, 30000);
    return () => clearInterval(interval);
  }, [address]);

  if (!isAuthenticated || !address) {
    return (
      <div className="glass-card p-6 text-center">
        <p className="text-gray-500 text-sm">Connect wallet to view transactions</p>
      </div>
    );
  }

  const formatStx = (microStx: string) => {
    const val = parseInt(microStx) / 1_000_000;
    return val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 }) + ' STX';
  };

  const getTxIcon = (type: string) => {
    switch (type) {
      case 'token_transfer': return '→';
      case 'contract_call': return '◎';
      case 'smart_contract': return '📄';
      default: return '•';
    }
  };

  return (
    <div className="glass-card p-8">
      <h3 className="text-lg font-semibold text-white mb-6">Transactions</h3>

      {error && (
        <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>
      )}

      {loading && txs.length === 0 ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-14 bg-gray-800/50 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : txs.length === 0 ? (
        <p className="text-gray-500 text-sm text-center py-8">No transactions found</p>
      ) : (
        <div className="space-y-2 max-h-[400px] overflow-y-auto">
          {txs.map((tx) => (
            <a
              key={tx.txid}
              href={`https://explorer.hiro.so/tx/${tx.txid}${address.startsWith('ST') ? '?chain=testnet' : ''}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition cursor-pointer"
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${
                tx.tx_status === 'success' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
              }`}>
                {getTxIcon(tx.tx_type)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white font-medium truncate">
                  {tx.token_transfer?.recipient_address
                    ? `${tx.tx_type === 'token_transfer' ? 'Sent to' : 'Transfer to'} ${tx.token_transfer.recipient_address.slice(0, 6)}…${tx.token_transfer.recipient_address.slice(-4)}`
                    : tx.tx_type.replace(/_/g, ' ')}
                </p>
                <p className="text-xs text-gray-500">
                  {tx.block_time_iso ? new Date(tx.block_time_iso).toLocaleDateString() : 'pending'} · {tx.tx_status}
                </p>
              </div>
              {tx.token_transfer && (
                <span className="text-sm font-mono text-gray-300">{formatStx(tx.token_transfer.amount)}</span>
              )}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

export default TransactionHistory;
