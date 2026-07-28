import { useState, useEffect } from 'react';
import { getRecoveryState, hasKeypair, getOrCreateKeypair } from '../../services/passkeyService';
import Button from '../ui/Button';

const VAULT_CONTRACT_ADDRESS = 'ST29JKDEFRY0RYMGF97FZC9PZWJ4H4VBSQFFERNXX';
const VAULT_CONTRACT_NAME = 'cinex-smart-vault-v4';
const RECOVERY_VETO_WINDOW = 4320; // 72h in blocks (~3s per block)

interface RecoveryState {
  'recovery-pubkey': string | null;
  'recovery-proposed-at': number | null;
}

interface Props {
  vaultAddress?: string;
  vaultName?: string;
}

export default function RecoveryStatus({ vaultAddress = VAULT_CONTRACT_ADDRESS, vaultName = VAULT_CONTRACT_NAME }: Props) {
  const [state, setState] = useState<RecoveryState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentHeight, setCurrentHeight] = useState<number | null>(null);

  const fetchState = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await getRecoveryState(vaultAddress, vaultName);
      // result is the raw Hiro read-only response
      const value = result?.result?.value;
      if (value) {
        setState({
          'recovery-pubkey': value['recovery-pubkey']?.value ?? null,
          'recovery-proposed-at': value['recovery-proposed-at']?.value
            ? parseInt(value['recovery-proposed-at'].value, 10)
            : null,
        });
      }
      // Fetch current block height for countdown
      const heightRes = await fetch('https://api.testnet.hiro.so/extended/v1/block?limit=1');
      const heightData = await heightRes.json();
      setCurrentHeight(heightData.results?.[0]?.height ?? null);
    } catch (err: any) {
      setError(err.message || 'Failed to load recovery state');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchState();
  }, [vaultAddress, vaultName]);

  if (loading) {
    return (
      <div className="bg-white/5 border border-white/10 rounded-xl p-4">
        <div className="text-xs text-gray-400 animate-pulse">Loading recovery status…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white/5 border border-white/10 rounded-xl p-4">
        <div className="text-xs text-red-400">{error}</div>
      </div>
    );
  }

  const hasRecovery = state?.['recovery-pubkey'] !== null && state?.['recovery-pubkey'] !== undefined;
  const proposedAt = state?.['recovery-proposed-at'];
  const vetoEndsAt = proposedAt ? proposedAt + RECOVERY_VETO_WINDOW : null;
  const blocksRemaining = currentHeight && vetoEndsAt ? Math.max(0, vetoEndsAt - currentHeight) : null;
  const hoursRemaining = blocksRemaining !== null ? Math.round((blocksRemaining * 3) / 3600) : null;

  if (!hasRecovery) {
    return (
      <div className="bg-white/5 border border-white/10 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-2 h-2 rounded-full bg-green-400" />
          <span className="text-xs font-medium text-white">No Recovery in Progress</span>
        </div>
        <p className="text-[11px] text-gray-500">Your passkey is active. No admin-initiated recovery has been proposed.</p>
      </div>
    );
  }

  const truncatedKey = state!['recovery-pubkey']!.slice(0, 16) + '…';

  return (
    <div className="bg-white/5 border border-amber-500/20 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
        <span className="text-xs font-medium text-amber-400">Recovery Proposed</span>
      </div>

      <div className="space-y-2 text-xs">
        <div>
          <span className="text-gray-500">New key: </span>
          <span className="font-mono text-gray-300">{truncatedKey}</span>
        </div>
        {proposedAt && (
          <div>
            <span className="text-gray-500">Proposed at block: </span>
            <span className="text-gray-300">{proposedAt}</span>
          </div>
        )}
        {hoursRemaining !== null && hoursRemaining > 0 && (
          <div>
            <span className="text-gray-500">Veto window ends in: </span>
            <span className="text-amber-400 font-medium">~{hoursRemaining}h</span>
          </div>
        )}
        {hoursRemaining !== null && hoursRemaining === 0 && (
          <div className="text-red-400 font-medium">
            Veto window has expired. Admin can execute recovery at any time.
          </div>
        )}
      </div>

      <div className="mt-3 pt-3 border-t border-white/5">
        <p className="text-[11px] text-gray-500 mb-2">
          If you still have access to your passkey, cancel this recovery immediately.
        </p>
        <Button
          onClick={async () => {
            if (!hasKeypair()) return;
            const kp = await getOrCreateKeypair();
            // Owner signs cancel-recovery via passkey relay
            const res = await fetch(`/api/passkey/transfer`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'X-Relay-Api-Key': '***REMOVED***',
                'X-Relay-User-Address': kp.address,
              },
              body: JSON.stringify({ cancelRecovery: true, vaultAddress, vaultName }),
            });
            if (res.ok) {
              fetchState();
            }
          }}
          className="w-full text-xs"
          variant="danger"
        >
          Cancel Recovery
        </Button>
      </div>
    </div>
  );
}
