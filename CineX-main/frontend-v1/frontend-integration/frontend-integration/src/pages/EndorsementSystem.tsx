import React, { useState } from 'react';
import { getEndorsements, addEndorsement } from '../services/verificationService';
import type { Endorsement } from '../types';

const EndorsementSystem: React.FC = () => {
  const [endorsements, setEndorsements] = useState<Endorsement[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [endorser, setEndorser] = useState('');
  const [message, setMessage] = useState('');

  const fetchEndorsements = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getEndorsements();
      setEndorsements(data || []);
    } catch (e: any) {
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
    } catch (e: any) {
      setError(e.message || 'Failed to add endorsement.');
    }
    setLoading(false);
  };

  return (
    <div>
      <h2>Endorsements</h2>
      <button onClick={fetchEndorsements}>Load Endorsements</button>
      {loading && <p>Loading...</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <ul>
        {endorsements.map((endorsement, idx) => (
          <li key={idx}>
            <strong>{endorsement.endorser}</strong>: {endorsement.comment}
          </li>
        ))}
      </ul>
      <div style={{ marginTop: 20 }}>
        <input
          type="text"
          placeholder="Endorser Address"
          value={endorser}
          onChange={e => setEndorser(e.target.value)}
        />
        <input
          type="text"
          placeholder="Message"
          value={message}
          onChange={e => setMessage(e.target.value)}
        />
        <button onClick={handleAddEndorsement}>Add Endorsement</button>
      </div>
    </div>
  );
};

export default EndorsementSystem;
