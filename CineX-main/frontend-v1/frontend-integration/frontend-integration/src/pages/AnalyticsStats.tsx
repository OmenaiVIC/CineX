import React, { useState } from 'react';
import {
  getTotalFilmmakers,
  getTotalVerificationFees,
  getTotalRegisteredFilmmakerPortfolios,
  getTotalFilmmakerEndorsements
} from '../services/verificationService';

const AnalyticsStats: React.FC = () => {
  const [stats, setStats] = useState<any>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async () => {
    setLoading(true);
    setError(null);
    try {
      const filmmakers = await getTotalFilmmakers();
      const fees = await getTotalVerificationFees();
      const portfolios = await getTotalRegisteredFilmmakerPortfolios();
      const endorsements = await getTotalFilmmakerEndorsements();
      setStats({ filmmakers, fees, portfolios, endorsements });
    } catch (e: any) {
      setError(e.message || 'Failed to fetch stats.');
    }
    setLoading(false);
  };

  return (
    <div>
      <h2>Analytics & Stats</h2>
      <button onClick={fetchStats} disabled={loading}>
        {loading ? 'Loading...' : 'Fetch Stats'}
      </button>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <ul>
        <li>Total Filmmakers: {stats.filmmakers}</li>
        <li>Total Verification Fees: {stats.fees}</li>
        <li>Total Registered Portfolios: {stats.portfolios}</li>
        <li>Total Endorsements: {stats.endorsements}</li>
      </ul>
    </div>
  );
};

export default AnalyticsStats;
