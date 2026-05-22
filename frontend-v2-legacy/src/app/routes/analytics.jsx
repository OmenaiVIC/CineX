import React, { useState } from 'react';
import {
  getTotalFilmmakers,
  getTotalVerificationFees,
  getTotalRegisteredFilmmakerPortfolios,
  getTotalFilmmakerEndorsements
} from '@services/verificationService';

export default function AnalyticsStats() {
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchStats = async () => {
    setLoading(true);
    setError(null);
    try {
      const [filmmakers, fees, portfolios, endorsements] = await Promise.all([
        getTotalFilmmakers(),
        getTotalVerificationFees(),
        getTotalRegisteredFilmmakerPortfolios(),
        getTotalFilmmakerEndorsements()
      ]);
      setStats({ filmmakers, fees, portfolios, endorsements });
    } catch (e) {
      setError(e.message || 'Failed to fetch stats.');
    }
    setLoading(false);
  };

  const items = [
    { label: 'Total Filmmakers', key: 'filmmakers' },
    { label: 'Total Verification Fees (uSTX)', key: 'fees' },
    { label: 'Total Registered Portfolios', key: 'portfolios' },
    { label: 'Total Endorsements', key: 'endorsements' },
  ];

  return (
    <section className="container mx-auto px-4 py-12">
      <h2 className="text-3xl font-bold mb-6">Analytics & Stats</h2>
      <button
        onClick={fetchStats}
        disabled={loading}
        className="px-6 py-3 bg-gray-800 text-white rounded font-semibold hover:bg-gray-900 disabled:opacity-50 mb-6"
      >
        {loading ? 'Loading...' : 'Fetch Stats'}
      </button>
      {error && <p className="text-red-600 mb-4">{error}</p>}
      <ul className="space-y-3 max-w-md">
        {items.map(item => (
          <li key={item.key} className="p-4 bg-white rounded shadow flex justify-between">
            <span className="font-medium">{item.label}</span>
            <span className="text-yellow-600 font-bold">{stats[item.key] ?? '—'}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
