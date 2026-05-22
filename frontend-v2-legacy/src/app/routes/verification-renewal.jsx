import React, { useState } from 'react';
import { renewFilmmakerVerification, updateFilmmakerExpirationPeriod } from '@services/verificationService';

export default function VerificationRenewal() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [period, setPeriod] = useState('');

  const handleRenew = async () => {
    setLoading(true);
    setError(null);
    setSuccess(false);
    try {
      await renewFilmmakerVerification();
      setSuccess(true);
    } catch (e) {
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
    } catch (e) {
      setError(e.message || 'Update failed.');
    }
    setLoading(false);
  };

  return (
    <section className="container mx-auto px-4 py-12">
      <h2 className="text-3xl font-bold mb-6">Renew Verification</h2>
      <div className="space-y-6 max-w-md">
        <button
          onClick={handleRenew}
          disabled={loading}
          className="px-6 py-3 bg-gray-800 text-white rounded font-semibold hover:bg-gray-900 disabled:opacity-50"
        >
          {loading ? 'Processing...' : 'Renew Verification'}
        </button>

        <div className="border-t pt-6">
          <h3 className="text-xl font-semibold mb-4">Update Expiration Period</h3>
          <div className="flex gap-3">
            <input
              type="number"
              placeholder="New Period (days)"
              value={period}
              onChange={e => setPeriod(e.target.value)}
              className="flex-1 border border-gray-300 rounded px-4 py-2"
            />
            <button
              onClick={handleUpdatePeriod}
              disabled={loading || !period}
              className="px-6 py-3 bg-yellow-400 rounded font-bold hover:bg-yellow-500 disabled:opacity-50"
            >
              Update Period
            </button>
          </div>
        </div>

        {error && <p className="text-red-600">{error}</p>}
        {success && <p className="text-green-600">Operation successful!</p>}
      </div>
    </section>
  );
}
