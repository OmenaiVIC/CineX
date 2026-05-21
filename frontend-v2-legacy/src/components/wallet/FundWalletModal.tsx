import React, { useState } from 'react';
import { ApiWalletService } from '../../services/apiServices';

interface FundWalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
}

function FundWalletModal({ isOpen, onClose, userId }: FundWalletModalProps) {
  const [tab, setTab] = useState<'bank' | 'card'>('bank');
  const [amount, setAmount] = useState('');
  const [reference, setReference] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const walletService = new ApiWalletService();

  if (!isOpen) return null;

  const handleBankDeposit = async () => {
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) {
      setError('Enter a valid amount');
      return;
    }
    setLoading(true);
    setError(null);
    const res = await walletService.recordDeposit(userId, {
      amountNaira: amt,
      currency: 'NGN',
      description: 'Bank transfer deposit',
    });
    if (res.success && res.data) {
      setReference(res.data.reference || null);
    } else {
      setError(res.error || 'Deposit failed');
    }
    setLoading(false);
  };

  const handleCardDeposit = async () => {
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) {
      setError('Enter a valid amount');
      return;
    }
    setLoading(true);
    setError(null);
    const res = await walletService.recordDeposit(userId, {
      amountUsd: amt,
      currency: 'USD',
      description: 'Card payment deposit',
    });
    if (res.success && res.data) {
      setReference(res.data.reference || null);
    } else {
      setError(res.error || 'Deposit failed');
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-[#0a0a0a] border border-[rgba(74,222,128,0.12)] rounded-[28px] w-full max-w-md p-8 shadow-[0_0_40px_rgba(74,222,128,0.08)]" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">Fund Wallet</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl leading-none">&times;</button>
        </div>

        <div className="flex border border-[rgba(74,222,128,0.15)] rounded-xl overflow-hidden mb-6">
          <button
            className={`flex-1 py-2.5 text-sm font-medium transition-colors ${tab === 'bank' ? 'bg-[#4ade80] text-black' : 'text-gray-400 hover:text-white'}`}
            onClick={() => { setTab('bank'); setError(null); setReference(null); }}
          >
            Bank Transfer
          </button>
          <button
            className={`flex-1 py-2.5 text-sm font-medium transition-colors ${tab === 'card' ? 'bg-[#4ade80] text-black' : 'text-gray-400 hover:text-white'}`}
            onClick={() => { setTab('card'); setError(null); setReference(null); }}
          >
            Card Payment
          </button>
        </div>

        {reference ? (
          <div className="text-center py-4">
            <div className="text-[#4ade80] text-4xl mb-3">&#10003;</div>
            <p className="text-white font-medium mb-1">Deposit Initiated</p>
            <p className="text-gray-400 text-sm mb-4">Reference: <span className="text-gray-200 font-mono">{reference}</span></p>
            <p className="text-gray-500 text-xs mb-4">Awaiting confirmation. Funds will be credited once payment is verified.</p>
            <button
              onClick={onClose}
              className="px-6 py-2.5 bg-[#4ade80] text-black font-medium rounded-full hover:bg-[#22c55e] transition-all"
            >
              Done
            </button>
          </div>
        ) : (
          <>
            {tab === 'bank' ? (
              <div>
                <p className="text-gray-400 text-sm mb-4">Deposit NGN via bank transfer to:</p>
                <div className="bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] rounded-2xl p-4 mb-4">
                  <div className="flex justify-between mb-2">
                    <span className="text-gray-400 text-sm">Bank</span>
                    <span className="text-white text-sm font-medium">GTBank</span>
                  </div>
                  <div className="flex justify-between mb-2">
                    <span className="text-gray-400 text-sm">Account Name</span>
                    <span className="text-white text-sm font-medium">CineX Technologies Ltd</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400 text-sm">Account Number</span>
                    <span className="text-[#4ade80] text-sm font-mono font-bold">0123456789</span>
                  </div>
                </div>
                <div className="mb-4">
                  <label className="block text-gray-400 text-xs mb-1.5">Amount (NGN)</label>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="e.g. 50000"
                    className="w-full px-4 py-3 bg-transparent border border-gray-800 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-[#4ade80] focus:border-transparent placeholder-gray-500"
                  />
                </div>
                {error && <p className="text-red-400 text-sm mb-3">{error}</p>}
                <button
                  onClick={handleBankDeposit}
                  disabled={loading}
                  className="w-full px-6 py-3 bg-[#4ade80] text-black font-bold rounded-full hover:bg-[#22c55e] disabled:opacity-50 transition-all"
                >
                  {loading ? 'Processing...' : 'I Have Transferred'}
                </button>
              </div>
            ) : (
              <div>
                <p className="text-gray-400 text-sm mb-4">Pay with card via our secure payment partner.</p>
                <div className="mb-4">
                  <label className="block text-gray-400 text-xs mb-1.5">Amount (USD)</label>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="e.g. 100"
                    className="w-full px-4 py-3 bg-transparent border border-gray-800 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-[#4ade80] focus:border-transparent placeholder-gray-500"
                  />
                </div>
                {error && <p className="text-red-400 text-sm mb-3">{error}</p>}
                <button
                  onClick={handleCardDeposit}
                  disabled={loading}
                  className="w-full px-6 py-3 bg-[#4ade80] text-black font-bold rounded-full hover:bg-[#22c55e] disabled:opacity-50 transition-all"
                >
                  {loading ? 'Processing...' : `Pay $${parseFloat(amount) || 0}`}
                </button>
                <p className="text-gray-500 text-xs mt-3 text-center">Secured by Stripe. Your card details are never stored.</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default FundWalletModal;
