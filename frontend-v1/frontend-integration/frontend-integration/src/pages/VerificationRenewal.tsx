import React, { useState } from 'react';
import { renewFilmmakerVerification, updateFilmmakerExpirationPeriod } from '../services/verificationService';

const VerificationRenewal: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [period, setPeriod] = useState('');

  const handleRenew = async () => {
    setLoading(true);
    setError(null);
    setSuccess(false);
    try {
      await renewFilmmakerVerification();
      setSuccess(true);
    } catch (e: any) {
      setError(e.message || 'Renewal failed.');
    }
    setLoading(false);
  };

  const handleUpdatePeriod = async () => {
    setLoading(true);
    setError(null);
    setSuccess(false);
    try {
      await updateFilmmakerExpirationPeriod(period);
      setSuccess(true);
    } catch (e: any) {
      setError(e.message || 'Update failed.');
    }
    setLoading(false);
  };

  return (
    <div>
      <h2>Renew Verification</h2>
      <button onClick={handleRenew} disabled={loading}>
        {loading ? 'Processing...' : 'Renew Verification'}
      </button>
      <h3>Update Expiration Period</h3>
      <input
        type="number"
        placeholder="New Period (days)"
        value={period}
        onChange={e => setPeriod(e.target.value)}
      />
      <button onClick={handleUpdatePeriod} disabled={loading || !period}>
        {loading ? 'Processing...' : 'Update Period'}
      </button>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {success && <p style={{ color: 'green' }}>Operation successful!</p>}
    </div>
  );
};

export default VerificationRenewal;
