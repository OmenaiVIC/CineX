import React, { useState } from 'react';
import { useAuth } from '@contexts/StacksAuthContext';

export default function ContributionModal({ pool, onClose, onContribute }) {
  const { isAuthenticated, signIn } = useAuth();
  const [amount, setAmount] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState(null);
  const remaining = Math.max(0, pool.fundingGoal - pool.currentFunding);
  const [success, setSuccess] = useState(null);
  const [txId, setTxId] = useState(null);

  const handleSubmit = async (e) => {
    e?.preventDefault();
    setError(null);
    const num = Number(amount);
    if (!num || num <= 0) {
      setError('Please enter a valid contribution amount');
      console.warn('[ContributionModal] Invalid contribution amount:', amount);
      return;
    }
    if (num > remaining) {
      setError(`Amount exceeds remaining goal (${remaining.toLocaleString()})`);
      console.warn('[ContributionModal] Contribution exceeds remaining goal:', num, '>', remaining);
      return;
    }
    try {
      console.log('[ContributionModal] Calling onContribute with amount:', num);
      const result = await onContribute(num);
      console.log('[ContributionModal] onContribute result:', result);
      if (result && result.error) {
        setError(result.error);
        console.error('[ContributionModal] Contribution error:', result.error);
        return;
      }
      const newRemaining = Math.max(0, result.updated.fundingGoal - result.updated.currentFunding);
      setSuccess({ contributed: num, remaining: newRemaining, updated: result.updated });
      setTxId(result.txId);
      setAmount('');
      console.log('[ContributionModal] Contribution success, txId:', result.txId);
    } catch (err) {
      setError('Contribution failed');
      console.error('[ContributionModal] Contribution failed:', err);
    }
  };

  const handleAction = async (e) => {
    e?.preventDefault();
    if (!isAuthenticated) {
      try {
        await signIn();
      } catch (err) {
        setError('Unable to connect wallet');
      }
      return;
    }
    await handleSubmit(e);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black" onClick={onClose}></div>
      <div className="relative w-full max-w-xl mx-4 bg-gradient-radial-dark border border-gray-900/40 rounded-2xl p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-xl font-bold text-white">Contribute to {pool.title}</h3>
            <p className="text-gray-400 text-sm">Goal: {pool.fundingGoal.toLocaleString()} STX — Remaining: {remaining.toLocaleString()} STX</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-200">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="p-3 bg-red-500/10 border border-red-500/30 rounded"><p className="text-red-400 text-sm">{error}</p></div>}

          {success && (
            <div className="p-4 bg-green-900/20 border border-green-700 rounded-lg">
              <p className="text-green-300 font-semibold">Thank you{success.updated ? `, ${name || 'supporter'}` : ''}!</p>
              <p className="text-white mt-2">You contributed <strong className="text-yellow-400">{success.contributed.toLocaleString()} STX</strong> to <strong className="text-white">{pool.title}</strong>.</p>
              <p className="text-gray-400 mt-1">Remaining to reach goal: <strong className="text-white">{success.remaining.toLocaleString()} STX</strong></p>
              {txId && (
                <p className="text-gray-300 mt-2">
                  <strong>TxID:</strong> <span className="font-mono">{txId}</span><br />
                  <a href={`https://explorer.stacks.co/txid/${txId}?chain=testnet`} target="_blank" rel="noopener noreferrer" className="text-yellow-400 underline">View on Stacks Explorer</a>
                  <button style={{ marginLeft: 8 }} type="button" onClick={() => {navigator.clipboard.writeText(txId)}}>Copy TxID</button>
                </p>
              )}
              <div className="mt-4 flex gap-3">
                <button type="button" onClick={() => { onClose(); }} className="flex-1 px-4 py-3 font-bold rounded-lg bg-yellow-400 text-black">Close</button>
                <button type="button" onClick={() => { setSuccess(null); setTxId(null); }} className="flex-1 px-4 py-3 border border-gray-700 text-gray-300 rounded-lg">Make another contribution</button>
              </div>
            </div>
          )}
          <div>
            <label className="block text-sm text-gray-300 mb-2">Your Name (optional)</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Jane Doe"
              className="w-full px-4 py-3 bg-gray-900/30 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-300 mb-2">Contribution Amount (STX)</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="e.g., 100"
              min="1"
              className="w-full px-4 py-3 bg-gray-900/30 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none"
            />
            <p className="text-gray-400 text-xs mt-2">Remaining goal: {remaining.toLocaleString()} STX</p>
          </div>

          {!success && (
            <div className="flex gap-3 pt-4">
              <button type="button" onClick={onClose} className="flex-1 px-4 py-3 border border-gray-700 text-gray-300 rounded-lg">Cancel</button>
              <button type="button" onClick={handleAction} className={`flex-1 px-4 py-3 font-bold rounded-lg ${isAuthenticated ? 'bg-yellow-400 text-black' : 'bg-gray-600 text-gray-400'}`}>
                {isAuthenticated ? 'Contribute' : 'Connect Wallet'}
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
