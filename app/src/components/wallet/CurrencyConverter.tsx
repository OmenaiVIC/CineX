import { useState } from 'react';
import Card from '../ui/Card';
import Input from '../ui/Input';
import Select from '../ui/Select';
import Button from '../ui/Button';
import { convertCurrency, getConversionRates } from '../../services/walletService';

const CURRENCIES = [
  { value: 'stx', label: 'STX' },
  { value: 'usd', label: 'USD' },
  { value: 'ngn', label: 'NGN' },
];

export default function CurrencyConverter() {
  const [from, setFrom] = useState('stx');
  const [to, setTo] = useState('ngn');
  const [amount, setAmount] = useState('');
  const [result, setResult] = useState<{ amount: string; rate: string; fee: string } | null>(null);

  const rates = getConversionRates();

  const handleConvert = () => {
    if (!amount || isNaN(Number(amount))) return;
    const res = convertCurrency(from as any, to as any, amount);
    if (res.success && res.data) setResult(res.data);
  };

  const swapCurrencies = () => {
    setFrom(to);
    setTo(from);
    setResult(null);
  };

  return (
    <Card variant="light" padding="default">
      <h3 className="text-base font-semibold text-white mb-4">Currency Converter</h3>
      <div className="space-y-3">
        <div className="flex gap-2 items-end">
          <div className="flex-1">
            <label className="block text-xs text-gray-400 mb-1">From</label>
            <Select
              options={CURRENCIES}
              value={from}
              onChange={(e) => { setFrom(e.target.value); setResult(null); }}
            />
          </div>
          <button
            onClick={swapCurrencies}
            className="px-2 py-3 text-gray-400 hover:text-[#4ade80] transition-colors"
            title="Swap currencies"
          >
            ⇄
          </button>
          <div className="flex-1">
            <label className="block text-xs text-gray-400 mb-1">To</label>
            <Select
              options={CURRENCIES}
              value={to}
              onChange={(e) => { setTo(e.target.value); setResult(null); }}
            />
          </div>
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1">Amount</label>
          <div className="flex gap-2">
            <Input
              type="number"
              placeholder="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
            <button onClick={handleConvert} className="px-4 py-2 bg-[#4ade80] text-black rounded-lg text-sm font-medium hover:bg-[#22c55e] transition-colors">Convert</button>
          </div>
        </div>
        {result && (
          <div className="bg-black/30 rounded-lg p-3 space-y-1">
            <p className="text-lg font-semibold text-white">{result.amount} {to.toUpperCase()}</p>
            <p className="text-xs text-gray-500">Rate: 1 {from.toUpperCase()} = {result.rate} {to.toUpperCase()}</p>
            <p className="text-xs text-gray-500">Fee: {result.fee} {from.toUpperCase()} (0.75%)</p>
          </div>
        )}
        {rates.success && rates.data && (
          <p className="text-xs text-gray-600">Market rate: ₦{rates.data.ngnPerUsd}/$ · Spread: {(rates.data.spread * 100)}%</p>
        )}
      </div>
    </Card>
  );
}


