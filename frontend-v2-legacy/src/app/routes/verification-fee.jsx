import React, { useState } from 'react';
import { payVerificationFee } from '@services/verificationService';

export default function VerificationFeePayment() {
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const handlePayFee = async () => {
    setLoading(true);
    setError(null);
    setSuccess(false);
    try {
      await payVerificationFee(amount);
      setSuccess(true);
    } catch (e) {
      setError(e.message || 'Payment failed.');
    }
    setLoading(false);
  };

  return (
    <section className="container mx-auto px-4 py-12">
      <h2 className="text-3xl font-bold mb-6">Pay Verification Fee</h2>
      <div className="flex gap-3 max-w-md">
        <input
          type="number"
          placeholder="Amount (STX)"
          value={amount}
          onChange={e => setAmount(e.target.value)}
          className="flex-1 border border-gray-300 rounded px-4 py-2"
        />
        <button
          onClick={handlePayFee}
          disabled={loading || !amount}
          className="px-6 py-3 bg-gray-800 text-white rounded font-semibold hover:bg-gray-900 disabled:opacity-50"
        >
          {loading ? 'Processing...' : 'Pay Fee'}
        </button>
      </div>
      {error && <p className="text-red-600 mt-4">{error}</p>}
      {success && <p className="text-green-600 mt-4">Payment successful!</p>}
    </section>
  );
}
