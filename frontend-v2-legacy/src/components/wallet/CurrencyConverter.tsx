import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ApiWalletService } from '../../services/apiServices';

interface CurrencyConverterProps {
  userId: string;
}

function CurrencyConverter({ userId }: CurrencyConverterProps) {
  const [fromCurrency, setFromCurrency] = useState<'NGN' | 'USD'>('NGN');
  const [toCurrency, setToCurrency] = useState<'NGN' | 'USD'>('USD');
  const [amount, setAmount] = useState('');
  const [quote, setQuote] = useState<{ quoteId: string; outputAmount: number; rate: number; spread: number; expiresAt: number } | null>(null);
  const [countdown, setCountdown] = useState(0);
  const [loading, setLoading] = useState(false);
  const [converting, setConverting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const walletService = new ApiWalletService();

  const swapCurrencies = () => {
    setFromCurrency(toCurrency);
    setToCurrency(fromCurrency);
    setQuote(null);
    setCountdown(0);
    setError(null);
  };

  const getQuote = useCallback(async () => {
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) { setQuote(null); return; }

    setLoading(true);
    setError(null);
    const res = await walletService.getQuote(userId, fromCurrency, toCurrency, amt);
    if (res.success && res.data) {
      setQuote({
        quoteId: res.data.quoteId,
        outputAmount: res.data.outputAmount,
        rate: res.data.rate,
        spread: res.data.spread,
        expiresAt: res.data.expiresAt,
      });
      const secondsRemaining = Math.max(0, Math.floor((res.data.expiresAt - Date.now()) / 1000));
      setCountdown(secondsRemaining);
    } else {
      setError(res.error || 'Failed to get quote');
      setQuote(null);
    }
    setLoading(false);
  }, [userId, fromCurrency, toCurrency, amount, walletService]);

  useEffect(() => {
    if (!amount || parseFloat(amount) <= 0) { setQuote(null); setCountdown(0); return; }

    const debounce = setTimeout(() => {
      getQuote();
    }, 500);

    return () => clearTimeout(debounce);
  }, [amount, fromCurrency, toCurrency, getQuote]);

  useEffect(() => {
    if (countdown <= 0) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }
    timerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          setQuote(null);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [countdown]);

  const handleConvert = async () => {
    if (!quote) return;
    setConverting(true);
    setError(null);

    const res = await walletService.executeConversion(userId, quote.quoteId);
    if (res.success) {
      setSuccess(true);
    } else {
      setError(res.error || 'Conversion failed');
    }
    setConverting(false);
  };

  const resetForm = () => {
    setAmount('');
    setQuote(null);
    setCountdown(0);
    setError(null);
    setSuccess(false);
  };

  if (success) {
    return (
      <div className="glass-card p-8 text-center">
        <div className="text-[#4ade80] text-5xl mb-4">&#10003;</div>
        <h3 className="text-xl font-bold text-white mb-2">Converted Successfully</h3>
        <p className="text-gray-400 mb-4">
          {fromCurrency === 'NGN' ? '₦' : '$'}{amount} → {toCurrency === 'NGN' ? '₦' : '$'}{quote?.outputAmount.toFixed(2)}
        </p>
        <button
          onClick={resetForm}
          className="px-6 py-2.5 bg-[#4ade80] text-black font-medium rounded-full hover:bg-[#22c55e] transition-all"
        >
          New Conversion
        </button>
      </div>
    );
  }

  return (
    <div className="glass-card p-8">
      <h3 className="text-lg font-semibold text-white mb-6">Currency Converter</h3>

      <div className="mb-4">
        <label className="block text-gray-400 text-xs mb-1.5">Amount</label>
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0.00"
          className="w-full px-4 py-3 bg-transparent border border-gray-800 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-[#4ade80] focus:border-transparent placeholder-gray-500"
        />
      </div>

      <div className="flex items-center gap-3 mb-4">
        <div className="flex-1">
          <label className="block text-gray-400 text-xs mb-1.5">From</label>
          <div className="px-4 py-3 border border-gray-800 rounded-xl text-white font-medium">
            {fromCurrency}
          </div>
        </div>

        <button
          onClick={swapCurrencies}
          className="mt-5 w-10 h-10 flex items-center justify-center border border-gray-700 rounded-full hover:border-[#4ade80] transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-400">
            <path d="M11 1L14 4L11 7" /><path d="M14 4H2" /><path d="M5 15L2 12L5 9" /><path d="M2 12H14" />
          </svg>
        </button>

        <div className="flex-1">
          <label className="block text-gray-400 text-xs mb-1.5">To</label>
          <div className="px-4 py-3 border border-gray-800 rounded-xl text-white font-medium">
            {toCurrency}
          </div>
        </div>
      </div>

      {loading && (
        <div className="bg-[rgba(74,222,128,0.05)] border border-[rgba(74,222,128,0.1)] rounded-2xl p-4 mb-4 text-center">
          <p className="text-gray-400 text-sm animate-pulse">Getting quote...</p>
        </div>
      )}

      {quote && !loading && (
        <div className="bg-[rgba(74,222,128,0.05)] border border-[rgba(74,222,128,0.1)] rounded-2xl p-4 mb-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-gray-400 text-sm">Rate</span>
            <span className="text-white font-medium">
              1 {fromCurrency} = {quote.rate.toFixed(4)} {toCurrency}
            </span>
          </div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-gray-400 text-sm">You receive</span>
            <span className="text-[#4ade80] text-xl font-bold">
              {toCurrency === 'NGN' ? '₦' : '$'}{quote.outputAmount.toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-gray-400 text-sm">Spread</span>
            <span className="text-gray-300 text-sm">{(quote.spread * 100).toFixed(2)}%</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-400 text-sm">Quote expires</span>
            <span className={`text-sm font-mono ${countdown <= 10 ? 'text-red-400' : 'text-[#f59e0b]'}`}>
              {countdown}s
            </span>
          </div>
          {countdown <= 10 && (
            <p className="text-xs text-red-400 mt-2">Quote expiring soon. Refresh to get a new rate.</p>
          )}
        </div>
      )}

      {error && <p className="text-red-400 text-sm mb-3">{error}</p>}

      <button
        onClick={handleConvert}
        disabled={!quote || converting}
        className="w-full px-6 py-3 bg-[#4ade80] text-black font-bold rounded-full hover:bg-[#22c55e] disabled:opacity-50 transition-all"
      >
        {converting ? 'Converting...' : quote ? `Convert ${fromCurrency === 'NGN' ? '₦' : '$'}${amount}` : 'Enter Amount'}
      </button>
    </div>
  );
}

export default CurrencyConverter;
