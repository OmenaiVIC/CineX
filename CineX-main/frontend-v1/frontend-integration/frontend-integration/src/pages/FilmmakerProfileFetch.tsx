import React, { useState } from 'react';
import { getFilmmakerIdentity, getFilmmakerPortfolioItem, getEndorsements } from '../services/verificationService';
import type { PortfolioItem, Endorsement } from '../types';

const FilmmakerProfileFetch: React.FC = () => {
  const [address, setAddress] = useState('');
  const [identity, setIdentity] = useState<any>(null);
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([]);
  const [endorsements, setEndorsements] = useState<Endorsement[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = async () => {
    setLoading(true);
    setError(null);
    try {
      const id = await getFilmmakerIdentity(address);
      // For demonstration, fetch first 5 portfolio items and endorsements (real UI should paginate or enumerate IDs)
      const pf: PortfolioItem[] = [];
      const en: Endorsement[] = [];
      for (let i = 0; i < 5; i++) {
        try {
          const item = await getFilmmakerPortfolioItem(address, i);
          if (item) pf.push(item);
        } catch {}
        try {
          const endorsement = await getEndorsements(address);
          if (endorsement && Array.isArray(endorsement)) en.push(...endorsement);
        } catch {}
      }
      setIdentity(id);
      setPortfolio(pf);
      setEndorsements(en);
    } catch (e: any) {
      setError(e.message || 'Failed to fetch profile.');
    }
    setLoading(false);
  };

  return (
    <div>
      <h2>Filmmaker Profile Fetch</h2>
      <input
        type="text"
        placeholder="Filmmaker Address"
        value={address}
        onChange={e => setAddress(e.target.value)}
      />
      <button onClick={fetchProfile} disabled={loading || !address}>
        {loading ? 'Loading...' : 'Fetch Profile'}
      </button>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {identity && (
        <div>
          <h3>Identity</h3>
          <pre>{JSON.stringify(identity, null, 2)}</pre>
        </div>
      )}
      {portfolio.length > 0 && (
        <div>
          <h3>Portfolio</h3>
          <ul>
            {portfolio.map((item, idx) => (
              <li key={idx}>{item.title} ({item.year})</li>
            ))}
          </ul>
        </div>
      )}
      {endorsements.length > 0 && (
        <div>
          <h3>Endorsements</h3>
          <ul>
            {endorsements.map((endorsement, idx) => (
              <li key={idx}>{endorsement.endorser}: {endorsement.comment}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default FilmmakerProfileFetch;
