import React, { useState } from 'react';
import {
  setContractAdmin,
  setCoreContract,
  setRenewalExtensionContract,
  setThirdPartyEndorser,
  setPauseState,
  emergencyWithdraw
} from '../services/verificationService';

const AdminControls: React.FC = () => {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleAction = async (action: () => Promise<void>, label: string, requiresInput: boolean = false, infoMsg?: string) => {
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
    } catch (e: any) {
      setError(e.message || `${label} failed.`);
    }
    setLoading(false);
  };

  return (
    <div>
      <h2>Admin Controls</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', alignItems: 'flex-start', marginBottom: 24, maxWidth: 700 }}>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', width: '100%' }}>
          <input
            type="text"
            placeholder="Address or Value"
            value={input}
            onChange={e => setInput(e.target.value)}
            style={{ minWidth: 180 }}
          />
        </div>
        <button
          style={{ padding: '14px 28px', fontSize: '1.1rem', fontWeight: 600, borderRadius: 8, background: '#222', color: '#fff', width: '100%' }}
          onClick={() => handleAction(
            () => setContractAdmin(input),
            'Set Admin',
            true,
            'To set a new admin, please enter the admin address.'
          )}
          disabled={loading}
        >Set Admin</button>
        <button
          style={{ padding: '14px 28px', fontSize: '1.1rem', fontWeight: 600, borderRadius: 8, background: '#222', color: '#fff', width: '100%' }}
          onClick={() => handleAction(
            () => setCoreContract(input),
            'Set Core Contract',
            true,
            'To set the core contract, please enter the contract address.'
          )}
          disabled={loading}
        >Set Core Contract</button>
        <button
          style={{ padding: '14px 28px', fontSize: '1.1rem', fontWeight: 600, borderRadius: 8, background: '#222', color: '#fff', width: '100%' }}
          onClick={() => handleAction(
            () => setRenewalExtensionContract(input),
            'Set Renewal Extension',
            true,
            'To set the renewal extension, please enter the extension contract address.'
          )}
          disabled={loading}
        >Set Renewal Extension</button>
        <button
          style={{ padding: '14px 28px', fontSize: '1.1rem', fontWeight: 600, borderRadius: 8, background: '#222', color: '#fff', width: '100%' }}
          onClick={() => handleAction(
            () => setThirdPartyEndorser(input),
            'Set Third Party Endorser',
            true,
            'To set a third party endorser, please enter the endorser address.'
          )}
          disabled={loading}
        >Set Third Party Endorser</button>
        <button
          style={{ padding: '14px 28px', fontSize: '1.1rem', fontWeight: 600, borderRadius: 8, background: '#222', color: '#fff', width: '100%' }}
          onClick={() => handleAction(
            () => setPauseState(input),
            'Set Pause State',
            true,
            'To set the pause state, please enter the value (e.g., true or false).' 
          )}
          disabled={loading}
        >Set Pause State</button>
        <button 
          onClick={() => handleAction(() => emergencyWithdraw(), 'Emergency Withdraw')} 
          disabled={loading} 
          style={{ padding: '14px 28px', fontSize: '1.1rem', fontWeight: 600, borderRadius: 8, background: '#b71c1c', color: '#fff', width: '100%' }}
        >Emergency Withdraw</button>
      </div>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {success && <p style={{ color: 'green' }}>{success}</p>}
    </div>
  );
};

export default AdminControls;
