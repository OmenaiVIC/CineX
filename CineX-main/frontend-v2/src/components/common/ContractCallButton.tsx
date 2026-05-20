import { useState, useCallback } from 'react';
import type { TransactionStatus } from '../../types';

interface ContractCallButtonProps {
  label: string;
  onClick: () => Promise<string>;
  onSuccess?: (txId: string) => void;
  onError?: (error: Error) => void;
  disabled?: boolean;
  confirmMessage?: string;
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'sm' | 'md' | 'lg';
}

const variantStyles = {
  primary: 'bg-indigo-600 hover:bg-indigo-500 focus:ring-indigo-500 text-white',
  secondary: 'bg-gray-700 hover:bg-gray-600 focus:ring-gray-500 text-gray-200',
  danger: 'bg-red-700 hover:bg-red-600 focus:ring-red-500 text-white',
};

const sizeStyles = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-3 text-base',
};

export default function ContractCallButton({
  label, onClick, onSuccess, onError, disabled = false, confirmMessage, variant = 'primary', size = 'md',
}: ContractCallButtonProps) {
  const [status, setStatus] = useState<TransactionStatus | 'idle'>('idle');
  const [txId, setTxId] = useState<string | null>(null);

  const handleClick = useCallback(async () => {
    if (confirmMessage && !window.confirm(confirmMessage)) return;
    setStatus('pending');
    try {
      const txId = await onClick();
      setTxId(txId);
      setStatus('success');
      onSuccess?.(txId);
    } catch (err) {
      setStatus('failed');
      onError?.(err instanceof Error ? err : new Error(String(err)));
    }
  }, [onClick, onSuccess, onError, confirmMessage]);

  return (
    <div className="inline-flex flex-col gap-1">
      <button
        type="button"
        disabled={disabled || status === 'pending'}
        onClick={handleClick}
        className={`inline-flex items-center justify-center rounded-lg font-medium transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 disabled:opacity-50 disabled:cursor-not-allowed ${variantStyles[variant]} ${sizeStyles[size]}`}
      >
        {status === 'pending' ? (
          <>
            <svg className="animate-spin -ml-1 mr-2 h-4 w-4" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Confirming...
          </>
        ) : label}
      </button>
      {status === 'success' && txId && (
        <a
          href={`https://explorer.hiro.so/txid/${txId}?chain=testnet`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-indigo-400 hover:text-indigo-300 underline"
        >
          View transaction →
        </a>
      )}
      {status === 'failed' && (
        <span className="text-xs text-red-400">Transaction failed. Check wallet and retry.</span>
      )}
    </div>
  );
}
