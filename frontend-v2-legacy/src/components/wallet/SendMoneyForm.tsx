import React, { useState } from 'react';
import { ApiWalletService } from '../../services/apiServices';

interface SendMoneyFormProps {
  userId: string;
}

function SendMoneyForm({ userId }: SendMoneyFormProps) {
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState<'NGN' | 'USD'>('NGN');
  const [reference, setReference] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const walletService = new ApiWalletService();

  const handleSend = async () => {
    const amt = parseFloat(amount);
    if (!recipient.trim()) { setError('Enter a recipient'); return; }
    if (isNaN(amt) || amt <= 0) { setError('Enter a valid amount'); return; }

    setLoading(true);
    setError(null);

    const walletRes = await walletService.get(userId);
    if (!walletRes.success || !walletRes.data) {
      setError(walletRes.error || 'Wallet not found');
      setLoading(false);
      return;
    }

    const balanceRes = await walletService.getBalance(userId);
    if (!balanceRes.success || !balanceRes.data) {
      setError('Failed to check balance');
      setLoading(false);
      return;
    }

    const balance = balanceRes.data;
    const available = currency === 'NGN' ? balance.ngn : balance.usd;
    if (amt > available) {
      setError(`Insufficient ${currency} balance. You have ${currency === 'NGN' ? '₦' : '$'}${available.toLocaleString()}.`);
      setLoading(false);
      return;
    }

    const res = await walletService.recordSend(userId, {
      amount: amt,
      currency,
      counterpartyUserId: recipient.trim(),
      description: `Send ${currency} to user`,
    });

    if (res.success && res.data) {
      setReference(res.data.reference || null);
      setSuccess(true);
    } else {
      setError(res.error || 'Send failed');
    }
    setLoading(false);
  };

  const resetForm = () => {
    setRecipient('');
    setAmount('');
    setReference(null);
    setError(null);
    setSuccess(false);
  };

  if (success) {
    return (
      <div className="glass-card p-8 text-center">
        <div className="text-[#4ade80] text-5xl mb-4">&#10003;</div>
        <h3 className="text-xl font-bold text-white mb-2">Sent Successfully</h3>
        <p className="text-gray-400 mb-1">
          {currency === 'NGN' ? '₦' : '$'}{parseFloat(amount).toLocaleString()} sent to <span className="text-gray-200">{recipient}</span>
        </p>
        {reference && (
          <p className="text-xs text-gray-500 font-mono mb-4">Ref: {reference}</p>
        )}
        <button
          onClick={resetForm}
          className="px-6 py-2.5 bg-[#4ade80] text-black font-medium rounded-full hover:bg-[#22c55e] transition-all"
        >
          Send Again
        </button>
      </div>
    );
  }

  return (
    <div className="glass-card p-8">
      <h3 className="text-lg font-semibold text-white mb-6">Send Money</h3>

      <div className="mb-4">
        <label className="block text-gray-400 text-xs mb-1.5">Recipient</label>
        <div className="relative">
          <input
            type="text"
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            placeholder="User ID, email, or wallet address"
            className="w-full px-4 py-3 bg-transparent border border-gray-800 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-[#4ade80] focus:border-transparent placeholder-gray-500"
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500">
            {recipient.length > 0 ? <span className="text-[#4ade80]">&#8226;</span> : ''}
          </div>
        </div>
      </div>

      <div className="mb-4">
        <label className="block text-gray-400 text-xs mb-1.5">Amount</label>
        <div className="flex gap-2">
          <div className="flex-1">
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="w-full px-4 py-3 bg-transparent border border-gray-800 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-[#4ade80] focus:border-transparent placeholder-gray-500"
            />
          </div>
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value as 'NGN' | 'USD')}
            className="px-4 py-3 bg-transparent border border-gray-800 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-[#4ade80] focus:border-transparent"
          >
            <option value="NGN" className="bg-[#0a0a0a]">NGN</option>
            <option value="USD" className="bg-[#0a0a0a]">USD</option>
          </select>
        </div>
      </div>

      <div className="bg-[rgba(245,158,11,0.05)] border border-[rgba(245,158,11,0.1)] rounded-2xl p-3 mb-4">
        <p className="text-xs text-gray-400">
          Recipient will receive funds in their preferred currency.
          {currency === 'NGN' ? ' USD equivalent shown at time of send.' : ' NGN equivalent shown at time of send.'}
        </p>
      </div>

      {error && <p className="text-red-400 text-sm mb-3">{error}</p>}

      <button
        onClick={handleSend}
        disabled={loading}
        className="w-full px-6 py-3 bg-[#4ade80] text-black font-bold rounded-full hover:bg-[#22c55e] disabled:opacity-50 transition-all"
      >
        {loading ? 'Processing...' : `Send ${currency === 'NGN' ? '₦' : '$'}${parseFloat(amount) || 0}`}
      </button>
    </div>
  );
}

export default SendMoneyForm;
