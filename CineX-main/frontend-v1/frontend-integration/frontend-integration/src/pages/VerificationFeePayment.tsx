import React, { useState } from 'react';
import { payVerificationFee } from '../services/verificationService';

const VerificationFeePayment: React.FC = () => {
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handlePayFee = async () => {
    setLoading(true);
    setError(null);
    setSuccess(false);
    try {
      await payVerificationFee(amount);
      setSuccess(true);
    } catch (e: any) {
      setError(e.message || 'Payment failed.');
    }
    setLoading(false);
  };

  return (
    <div>
      <h2>Pay Verification Fee</h2>
      <input
        type="number"
        placeholder="Amount (STX)"
        value={amount}
        onChange={e => setAmount(e.target.value)}
      />
      <button onClick={handlePayFee} disabled={loading || !amount}>
        {loading ? 'Processing...' : 'Pay Fee'}
      </button>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {success && <p style={{ color: 'green' }}>Payment successful!</p>}
    </div>
  );
};

export default VerificationFeePayment;
