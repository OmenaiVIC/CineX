import { useState } from 'react';

export type TxModalState = 'idle' | 'loading' | 'success' | 'error';

interface TransactionModalProps {
  isOpen: boolean;
  state: TxModalState;
  title: string;
  description?: string;
  txId?: string;
  error?: string;
  onClose: () => void;
  onRetry?: () => void;
}

export default function TransactionModal({ isOpen, state, title, description, txId, error, onClose, onRetry }: TransactionModalProps) {
  if (!isOpen) return null;

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
              <p className="text-xs text-gray-500 font-mono break-all mb-4">Tx: {txId.slice(0, 20)}...{txId.slice(-8)}</p>
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
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [txId, setTxId] = useState<string | undefined>();
  const [error, setError] = useState<string | undefined>();

  const open = (t: string, desc?: string) => {
    setTitle(t);
    setDescription(desc || '');
    setState('loading');
    setTxId(undefined);
    setError(undefined);
    setIsOpen(true);
  };

  const succeed = (id?: string) => {
    setState('success');
    if (id) setTxId(id);
  };

  const fail = (err: string) => {
    setState('error');
    setError(err);
  };

  const close = () => {
    setIsOpen(false);
    setState('idle');
  };

  return { isOpen, state, title, description, txId, error, open, succeed, fail, close };
}
