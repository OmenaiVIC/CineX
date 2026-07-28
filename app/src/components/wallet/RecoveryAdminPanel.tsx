import { useState } from 'react';
import { proposeRecovery, executeRecovery, getRecoveryState } from '../../services/passkeyService';
import Button from '../ui/Button';
import RecoveryInitiatedModal from './RecoveryInitiatedModal';

const VAULT_CONTRACT_ADDRESS = 'ST29JKDEFRY0RYMGF97FZC9PZWJ4H4VBSQFFERNXX';
const VAULT_CONTRACT_NAME = 'cinex-smart-vault-v4';

interface Props {
  vaultAddress?: string;
  vaultName?: string;
  onRecoveryAction?: () => void;
}

export default function RecoveryAdminPanel({ vaultAddress = VAULT_CONTRACT_ADDRESS, vaultName = VAULT_CONTRACT_NAME, onRecoveryAction }: Props) {
  const [mode, setMode] = useState<'idle' | 'propose' | 'execute'>('idle');
  const [newPubkey, setNewPubkey] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ txid: string; status: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);

  const handlePropose = async () => {
    if (!newPubkey || newPubkey.length !== 66) {
      setError('Public key must be 66 hex characters (33 bytes)');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await proposeRecovery(newPubkey, vaultAddress, vaultName);
      setResult(res);
      setShowModal(true);
      onRecoveryAction?.();
    } catch (err: any) {
      setError(err.message || 'Failed to propose recovery');
    } finally {
      setLoading(false);
    }
  };

  const handleExecute = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await executeRecovery(vaultAddress, vaultName);
      setResult(res);
      setShowModal(true);
      onRecoveryAction?.();
    } catch (err: any) {
      setError(err.message || 'Failed to execute recovery');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="bg-white/5 border border-white/10 rounded-xl p-4">
        <h3 className="text-xs font-semibold text-white mb-3">Recovery Administration</h3>

        {mode === 'idle' && (
          <div className="space-y-2">
            <Button
              onClick={() => setMode('propose')}
              className="w-full text-xs"
              variant="secondary"
            >
              Propose Key Recovery
            </Button>
            <Button
              onClick={() => setMode('execute')}
              className="w-full text-xs"
              variant="primary"
            >
              Execute Recovery
            </Button>
          </div>
        )}

        {mode === 'propose' && (
          <div className="space-y-3">
            <p className="text-[11px] text-gray-400">
              Propose a new passkey for this vault. A 72-hour veto window begins. The owner can cancel during this period.
            </p>
            <input
              type="text"
              value={newPubkey}
              onChange={(e) => setNewPubkey(e.target.value)}
              placeholder="New P-256 public key (66 hex chars)"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
            />
            {error && <p className="text-xs text-red-400">{error}</p>}
            <div className="flex gap-2">
              <Button onClick={handlePropose} className="flex-1 text-xs" variant="primary" disabled={loading}>
                {loading ? 'Broadcasting…' : 'Propose'}
              </Button>
              <Button onClick={() => { setMode('idle'); setError(null); }} className="text-xs" variant="secondary">
                Cancel
              </Button>
            </div>
          </div>
        )}

        {mode === 'execute' && (
          <div className="space-y-3">
            <p className="text-[11px] text-gray-400">
              Execute a previously proposed recovery. Only available after the 72-hour veto window has expired.
            </p>
            {error && <p className="text-xs text-red-400">{error}</p>}
            <div className="flex gap-2">
              <Button onClick={handleExecute} className="flex-1 text-xs" variant="primary" disabled={loading}>
                {loading ? 'Broadcasting…' : 'Execute Now'}
              </Button>
              <Button onClick={() => { setMode('idle'); setError(null); }} className="text-xs" variant="secondary">
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div>

      {showModal && result && (
        <RecoveryInitiatedModal
          txid={result.txid}
          status={result.status as 'proposed' | 'executed'}
          onClose={() => { setShowModal(false); setResult(null); }}
        />
      )}
    </>
  );
}
