import { useState, useCallback } from 'react';
import { useAuth } from '@contexts/StacksAuthContext';

interface WalletBalanceProps {
  compact?: boolean;
}

function WalletBalance({ compact = false }: WalletBalanceProps) {
  const { isAuthenticated, userData, stxBalance, fetchStxBalance, isLoadingBalance, getAddressFromUserData } = useAuth();
  const [copied, setCopied] = useState(false);

  const address = userData ? getAddressFromUserData(userData) : '';

  const copyAddress = useCallback(() => {
    if (!address) return;
    navigator.clipboard.writeText(address).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {});
  }, [address]);

  if (!isAuthenticated || !userData) {
    return (
      <div className="glass-card p-6 text-center">
        <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-gray-800 flex items-center justify-center">
          <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m0 0v2m0-2h2m-2 0H10m21-7a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <p className="text-gray-400 text-sm">Connect wallet to view balance</p>
      </div>
    );
  }

  if (compact) {
    return (
      <div className="glass-card p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-gray-500 text-xs">STX Balance</p>
            <p className="text-2xl font-bold text-white">
              {stxBalance ? `${stxBalance}` : '—'}
              <span className="text-sm text-gray-500 ml-1">STX</span>
            </p>
          </div>
          <button onClick={copyAddress} className="text-xs text-gray-500 hover:text-green-400 font-mono truncate max-w-[140px]" title={address}>
            {copied ? 'Copied!' : `${address.slice(0, 6)}…${address.slice(-4)}`}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card p-8">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-white">STX Wallet</h3>
        <button
          onClick={fetchStxBalance}
          className="text-xs text-gray-500 hover:text-green-400 transition-colors"
          disabled={isLoadingBalance}
        >
          {isLoadingBalance ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-green-500/5 border border-green-500/10 rounded-2xl p-5">
          <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">STX Balance</p>
          <p className="text-3xl font-bold text-white">
            {stxBalance || '—'}
          </p>
          <p className="text-xs text-gray-500 mt-1">Stacks (STX)</p>
        </div>

        <div className="bg-cyan-400/5 border border-cyan-400/10 rounded-2xl p-5">
          <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">Address</p>
          <p className="text-sm font-mono text-cyan-400 break-all">{address}</p>
          <button onClick={copyAddress} className="text-xs text-gray-500 hover:text-green-400 mt-1">
            {copied ? '✓ Copied' : 'Copy address'}
          </button>
        </div>

        <div className="bg-amber-400/5 border border-amber-400/10 rounded-2xl p-5">
          <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">Network</p>
          <p className="text-3xl font-bold text-amber-400">
            {address?.startsWith('ST') ? 'Testnet' : address?.startsWith('SP') ? 'Mainnet' : '—'}
          </p>
          <p className="text-xs text-gray-500 mt-1">{address ? 'Hiro API' : 'Not connected'}</p>
        </div>
      </div>
    </div>
  );
}

export default WalletBalance;
