import { useState } from 'react';
import { useAuth } from '@contexts/StacksAuthContext';

interface FundWalletModalProps {
  onClose: () => void;
}

function FundWalletModal({ onClose }: FundWalletModalProps) {
  const { isAuthenticated, userData, getAddressFromUserData } = useAuth();
  const [copied, setCopied] = useState(false);

  const address = userData ? getAddressFromUserData(userData) : '';

  const copyAddress = () => {
    if (!address) return;
    navigator.clipboard.writeText(address).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {});
  };

  if (!isAuthenticated || !address) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
        <div className="glass-card p-8 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
          <h3 className="text-lg font-semibold text-white mb-4">Connect Wallet</h3>
          <p className="text-gray-400 text-sm">Connect your Stacks wallet to fund it.</p>
          <button onClick={onClose} className="mt-6 text-sm text-gray-500 hover:text-white">Close</button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="glass-card p-8 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-white">Fund Wallet</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-white text-xl leading-none">&times;</button>
        </div>

        <div className="space-y-4 text-sm">
          <div className="bg-cyan-400/5 border border-cyan-400/10 rounded-xl p-4">
            <p className="text-gray-400 mb-2">Your STX Address:</p>
            <p className="text-sm font-mono text-cyan-400 break-all bg-black/20 rounded-lg p-3">{address}</p>
            <button
              onClick={copyAddress}
              className="mt-2 text-xs text-green-400 hover:text-green-300"
            >
              {copied ? '✓ Copied' : 'Copy address'}
            </button>
          </div>

          <div className="text-gray-400 space-y-2">
            <p className="font-medium text-white mb-2">Ways to fund:</p>
            <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-3">
              <p className="text-white font-medium mb-1">1. Exchange withdrawal</p>
              <p className="text-xs">Withdraw STX from Binance, OKX, or other exchange to the address above.</p>
            </div>
            <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-3">
              <p className="text-white font-medium mb-1">2. sBTC deposit</p>
              <p className="text-xs">Deposit BTC to receive sBTC on Stacks. Use the sBTC Bridge or a supported wallet.</p>
            </div>
            <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-3">
              <p className="text-white font-medium mb-1">3. Wallet transfer</p>
              <p className="text-xs">Send STX from Leather, Xverse, or Asigna directly to this address.</p>
            </div>
          </div>

          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-3 text-yellow-400 text-xs">
            ⚠ Only send STX or sBTC to this address. Other tokens may be lost.
          </div>
        </div>
      </div>
    </div>
  );
}

export default FundWalletModal;
