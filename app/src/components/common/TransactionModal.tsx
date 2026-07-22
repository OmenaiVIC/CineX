import { useState } from 'react';
import TxStatusTimeline from '../wallet/TxStatusTimeline';
import type { TxLifecycleState } from '../../types';

export type TxModalState = 'idle' | 'loading' | 'success' | 'error';

interface TransactionModalProps {
  isOpen: boolean;
  state: TxModalState;
  lifecycleState?: TxLifecycleState;
  title: string;
  description?: string;
  txId?: string;
  chainUrl?: string;
  error?: string;
  onClose: () => void;
  onRetry?: () => void;
}

const LIFECYCLE_LABELS: Record<string, string> = {
  idle: 'Ready',
  building: 'Preparing your transaction...',
  signing: 'Awaiting your signature...',
  broadcasting: 'Sending to the network...',
  confirming: 'Waiting for confirmation on the blockchain...',
  confirmed: 'Transaction confirmed!',
  failed: 'Something went wrong.',
  cancelled: 'Transaction was cancelled.',
};

export default function TransactionModal({
  isOpen, state, lifecycleState, title, description, txId, chainUrl, error, onClose, onRetry,
}: TransactionModalProps) {
  if (!isOpen) return null;

  if (lifecycleState && lifecycleState !== 'idle') {
    const isDone = lifecycleState === 'confirmed';
    const isFailed = lifecycleState === 'failed';
    const isCancelled = lifecycleState === 'cancelled';
    const isActive = !isDone && !isFailed && !isCancelled;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
        <div className="bg-[#0a0a0f] border border-[#1a1a2e] rounded-2xl p-8 w-full max-w-md mx-4">
          <div className="text-center mb-6">
            {isDone ? (
              <div className="w-12 h-12 bg-[#4ade80]/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-[#4ade80] text-2xl">✓</span>
              </div>
            ) : isFailed || isCancelled ? (
              <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-red-400 text-2xl">✕</span>
              </div>
            ) : (
              <div className="w-12 h-12 border-4 border-[#4ade80] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            )}
            <h3 className="text-lg font-semibold text-white mb-1">{title}</h3>
            <p className="text-sm text-gray-400">{LIFECYCLE_LABELS[lifecycleState] || description}</p>
          </div>

          <div className="bg-black/30 rounded-xl p-4 mb-6">
            <TxStatusTimeline state={lifecycleState} />
          </div>

          {txId && (
            <p className="text-xs text-gray-500 font-mono break-all mb-2 text-center">Tx: {txId.slice(0, 20)}...{txId.slice(-8)}</p>
          )}
          {chainUrl && (
            <a href={chainUrl} target="_blank" rel="noopener noreferrer" className="block text-xs text-blue-400 hover:text-blue-300 mb-4 text-center">
              View on Explorer ↗
            </a>
          )}

          {isFailed && error && (
            <p className="text-sm text-red-400 mb-4 text-center">{error}</p>
          )}

          <div className="flex items-center justify-center gap-3">
            {isFailed && onRetry && (
              <button onClick={onRetry} className="px-6 py-2 bg-[#4ade80] text-black rounded-full text-sm font-medium hover:bg-green-500 transition-colors">
                Try Again
              </button>
            )}
            {(isDone || isFailed || isCancelled) && (
              <button onClick={onClose} className="px-6 py-2 bg-gray-800 text-gray-300 rounded-full text-sm hover:bg-gray-700 transition-colors">
                {isDone ? 'Done' : 'Dismiss'}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-[#0a0a0f] border border-[#1a1a2e] rounded-2xl p-8 w-full max-w-md mx-4">
        {state === 'loading' && (
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-[#4ade80] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
            {description && <p className="text-sm text-gray-400">{description}</p>}
            <p className="text-xs text-gray-500 mt-4">Transaction in progress...</p>
          </div>
        )}

        {state === 'success' && (
          <div className="text-center">
            <div className="w-12 h-12 bg-[#4ade80]/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-[#4ade80] text-2xl">✓</span>
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Transaction Confirmed</h3>
            {description && <p className="text-sm text-gray-400 mb-3">{description}</p>}
            {txId && (
              <p className="text-xs text-gray-500 font-mono break-all mb-2">Tx: {txId.slice(0, 20)}...{txId.slice(-8)}</p>
            )}
            {chainUrl && (
              <a href={chainUrl} target="_blank" rel="noopener noreferrer" className="block text-xs text-blue-400 hover:text-blue-300 mb-4">
                View on Explorer ↗
              </a>
            )}
            <button onClick={onClose} className="px-6 py-2 bg-green-400 text-black rounded-full text-sm font-medium hover:bg-green-500 transition-colors">Done</button>
          </div>
        )}

        {state === 'error' && (
          <div className="text-center">
            <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-red-400 text-2xl">✕</span>
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Transaction Failed</h3>
            <p className="text-sm text-gray-400 mb-4">{error || 'An error occurred.'}</p>
            <div className="flex items-center justify-center gap-3">
              {onRetry && <button onClick={onRetry} className="px-6 py-2 bg-[#4ade80] text-black rounded-full text-sm font-medium hover:bg-green-500 transition-colors">Retry</button>}
              <button onClick={onClose} className="px-6 py-2 bg-gray-800 text-gray-300 rounded-full text-sm hover:bg-gray-700 transition-colors">Dismiss</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function useTxModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [state, setState] = useState<TxModalState>('idle');
  const [lifecycleState, setLifecycleState] = useState<TxLifecycleState | undefined>();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [txId, setTxId] = useState<string | undefined>();
  const [chainUrl, setChainUrl] = useState<string | undefined>();
  const [error, setError] = useState<string | undefined>();

  const open = (t: string, desc?: string) => {
    setTitle(t);
    setDescription(desc || '');
    setState('loading');
    setLifecycleState(undefined);
    setTxId(undefined);
    setChainUrl(undefined);
    setError(undefined);
    setIsOpen(true);
  };

  const succeed = (id?: string, url?: string) => {
    setState('success');
    setLifecycleState('confirmed');
    if (id) setTxId(id);
    if (url) setChainUrl(url);
  };

  const fail = (err: string) => {
    setState('error');
    setLifecycleState('failed');
    setError(err);
  };

  const setLifecycle = (s: TxLifecycleState) => {
    setLifecycleState(s);
    if (s === 'building' || s === 'signing' || s === 'broadcasting' || s === 'confirming') {
      setState('loading');
    } else if (s === 'confirmed') {
      setState('success');
    } else if (s === 'failed' || s === 'cancelled') {
      setState('error');
    }
  };

  const close = () => {
    setIsOpen(false);
    setState('idle');
    setLifecycleState(undefined);
  };

  return { isOpen, state, lifecycleState, title, description, txId, chainUrl, error, open, succeed, fail, setLifecycle, close };
}
