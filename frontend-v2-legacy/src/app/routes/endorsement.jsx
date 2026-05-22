import React, { useState } from 'react';
import { getEndorsements, addEndorsement } from '@services/verificationService';

export default function EndorsementSystem() {
  const [endorsements, setEndorsements] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [endorser, setEndorser] = useState('');
  const [message, setMessage] = useState('');

  const fetchEndorsements = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getEndorsements();
      setEndorsements(data || []);
    } catch (e) {
      setError(e.message || 'Failed to load endorsements.');
    }
    setLoading(false);
  };

  const handleAddEndorsement = async () => {
    if (!endorser) return;
    setLoading(true);
    setError(null);
    try {
      await addEndorsement(endorser, message);
      setEndorser('');
      setMessage('');
      fetchEndorsements();
    } catch (e) {
      setError(e.message || 'Failed to add endorsement.');
    }
    setLoading(false);
  };

  return (
    <section className="container mx-auto px-4 py-12">
      <h2 className="text-3xl font-bold mb-6">Endorsements</h2>
      <button
        onClick={fetchEndorsements}
        disabled={loading}
        className="px-6 py-3 bg-gray-800 text-white rounded font-semibold hover:bg-gray-900 disabled:opacity-50 mb-6"
      >
        {loading ? 'Loading...' : 'Load Endorsements'}
      </button>
      {error && <p className="text-red-600 mb-4">{error}</p>}
      <ul className="space-y-2 mb-8 max-w-xl">
        {endorsements.map((endorsement, idx) => (
          <li key={idx} className="p-4 bg-white rounded shadow">
            <strong className="text-yellow-600">{endorsement.endorser}</strong>: {endorsement.comment}
          </li>
        ))}
      </ul>
      <div className="space-y-3 max-w-md">
        <input
          type="text"
          placeholder="Endorser Address"
          value={endorser}
          onChange={e => setEndorser(e.target.value)}
          className="w-full border border-gray-300 rounded px-4 py-2"
        />
        <input
          type="text"
          placeholder="Message"
          value={message}
          onChange={e => setMessage(e.target.value)}
          className="w-full border border-gray-300 rounded px-4 py-2"
        />
        <button
          onClick={handleAddEndorsement}
          disabled={loading || !endorser}
          className="px-6 py-3 bg-yellow-400 rounded font-bold hover:bg-yellow-500 disabled:opacity-50"
        >
          Add Endorsement
        </button>
      </div>
    </section>
  );
}
