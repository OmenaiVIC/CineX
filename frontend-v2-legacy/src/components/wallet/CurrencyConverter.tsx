import { useState, useEffect } from 'react';

function CurrencyConverter() {
  const [btcPrice, setBtcPrice] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPrice = async () => {
      try {
        const res = await fetch('https://api.mainnet.hiro.so/v2/prices');
        if (res.ok) {
          const json = await res.json();
          setBtcPrice(json.btc_usd || null);
        }
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    };
    fetchPrice();
  }, []);

  const stxPrice = btcPrice ? btcPrice / 1000 : null; // rough STX ~ BTC/1000

  return (
    <div className="glass-card p-6">
      <h3 className="text-sm font-semibold text-white mb-4">Market Data</h3>
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-3">
          <p className="text-xs text-gray-500">BTC/USD</p>
          <p className="text-lg font-bold text-amber-400">
            {loading ? '…' : btcPrice ? `$${btcPrice.toLocaleString()}` : '—'}
          </p>
        </div>
        <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-3">
          <p className="text-xs text-gray-500">STX (est.)</p>
          <p className="text-lg font-bold text-green-400">
            {loading ? '…' : stxPrice ? `$${stxPrice.toFixed(2)}` : '—'}
          </p>
        </div>
      </div>
    </div>
  );
}

export default CurrencyConverter;
