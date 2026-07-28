import { getExplorerUrl } from '../../services/passkeyService';
import Button from '../ui/Button';

interface Props {
  txid: string;
  status: 'proposed' | 'executed';
  onClose: () => void;
}

export default function RecoveryInitiatedModal({ txid, status, onClose }: Props) {
  const isProposed = status === 'proposed';
  const explorerUrl = getExplorerUrl(txid);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-[#1a1d24] border border-white/10 rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl">
        <div className="text-center mb-6">
          <div className={`w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center ${
            isProposed ? 'bg-amber-500/10' : 'bg-green-500/10'
          }`}>
            <span className="text-2xl">{isProposed ? '⏳' : '✅'}</span>
          </div>
          <h3 className="text-sm font-semibold text-white mb-1">
            {isProposed ? 'Recovery Proposed' : 'Recovery Executed'}
          </h3>
          <p className="text-xs text-gray-400">
            {isProposed
              ? 'A 72-hour veto window has started. The owner can cancel during this period.'
              : 'The new passkey is now the vault owner. Key rotation is complete.'}
          </p>
        </div>

        <div className="bg-white/5 rounded-lg p-3 mb-4">
          <div className="text-[10px] text-gray-500 mb-1">Transaction ID</div>
          <a
            href={explorerUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-mono text-blue-400 hover:underline break-all"
          >
            {txid}
          </a>
        </div>

        {isProposed && (
          <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-3 mb-4">
            <p className="text-[11px] text-amber-400">
              If this was not initiated by you or you still have your passkey, cancel this recovery immediately from the dashboard.
            </p>
          </div>
        )}

        <Button onClick={onClose} className="w-full text-xs" variant="primary">
          Done
        </Button>
      </div>
    </div>
  );
}
