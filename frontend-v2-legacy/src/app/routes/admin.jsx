import React, { useState } from 'react';
import {
  setContractAdmin,
  setCoreContract,
  setRenewalExtensionContract,
  setThirdPartyEndorser,
  setPauseState,
  emergencyWithdraw
} from '@services/verificationService';

export default function AdminControls() {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const handleAction = async (action, label, requiresInput = false, infoMsg) => {
    setError(null);
    setSuccess(null);
    if (requiresInput && !input) {
      setError(infoMsg || `Please enter a value for ${label}.`);
      return;
    }
    setLoading(true);
    try {
      await action();
      setSuccess(`${label} successful!`);
    } catch (e) {
      setError(e.message || `${label} failed.`);
    }
    setLoading(false);
  };

  const actions = [
    { label: 'Set Admin', fn: () => setContractAdmin(input), requiresInput: true, msg: 'Enter the admin address.' },
    { label: 'Set Core Contract', fn: () => setCoreContract(input), requiresInput: true, msg: 'Enter the contract address.' },
    { label: 'Set Renewal Extension', fn: () => setRenewalExtensionContract(input), requiresInput: true, msg: 'Enter the extension contract address.' },
    { label: 'Set Third Party Endorser', fn: () => setThirdPartyEndorser(input), requiresInput: true, msg: 'Enter the endorser address.' },
    { label: 'Set Pause State', fn: () => setPauseState(input), requiresInput: true, msg: 'Enter the value (true or false).' },
    { label: 'Emergency Withdraw', fn: () => emergencyWithdraw(), requiresInput: false, danger: true },
  ];

  return (
    <section className="container mx-auto px-4 py-12">
      <h2 className="text-3xl font-bold mb-6">Admin Controls</h2>
      <div className="max-w-lg space-y-4">
        <input
          type="text"
          placeholder="Address or Value"
          value={input}
          onChange={e => setInput(e.target.value)}
          className="w-full border border-gray-300 rounded px-4 py-2"
        />
        {actions.map(a => (
          <button
            key={a.label}
            onClick={() => handleAction(a.fn, a.label, a.requiresInput, a.msg)}
            disabled={loading}
            className={`w-full px-6 py-3 rounded font-semibold text-white ${a.danger ? 'bg-red-700 hover:bg-red-800' : 'bg-gray-800 hover:bg-gray-900'} disabled:opacity-50`}
          >
            {a.label}
          </button>
        ))}
        {error && <p className="text-red-600">{error}</p>}
        {success && <p className="text-green-600">{success}</p>}
      </div>
    </section>
  );
}
