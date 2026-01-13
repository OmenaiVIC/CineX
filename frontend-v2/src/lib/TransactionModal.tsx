import React, { useState } from 'react';
import { transactionTracker, Transaction } from './transactionTracker';

export interface TransactionConfirmationData {
  type: string;
  title: string;
  description?: string;
  amount?: string;
  recipient?: string;
  recipientName?: string;
  estimatedFees?: string;
  riskLevel?: string;
  metadata?: Record<string, any>;
}

export interface TransactionModalHook {
  isOpen: boolean;
  transactionData: TransactionConfirmationData | null;
  currentTransaction: Transaction | null;
  openModal: (data: TransactionConfirmationData) => void;
  closeModal: () => void;
  confirmTransaction: () => Promise<void>;
  isProcessing: boolean;
}

export function useTransactionModal(onConfirm?: (data: TransactionConfirmationData) => Promise<string>): TransactionModalHook {
  const [isOpen, setIsOpen] = useState(false);
  const [transactionData, setTransactionData] = useState<TransactionConfirmationData | null>(null);
  const [currentTransaction, setCurrentTransaction] = useState<Transaction | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const openModal = (data: TransactionConfirmationData) => {
    setTransactionData(data);
    setIsOpen(true);
  };

  const closeModal = () => {
    setIsOpen(false);
    setTransactionData(null);
    setCurrentTransaction(null);
    setIsProcessing(false);
  };

  const confirmTransaction = async () => {
    if (!transactionData || !onConfirm) return;
    setIsProcessing(true);
    try {
      const txId = await onConfirm(transactionData);
      const tx = transactionTracker.getTransaction(txId);
      setCurrentTransaction(tx || null);
    } catch (error) {
      setCurrentTransaction(null);
    } finally {
      setIsProcessing(false);
    }
  };

  return {
    isOpen,
    transactionData,
    currentTransaction,
    openModal,
    closeModal,
    confirmTransaction,
    isProcessing,
  };
}

export const TransactionModal: React.FC<{ hook: TransactionModalHook }> = ({ hook }) => {
  if (!hook.isOpen || !hook.transactionData) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-bold mb-2">{hook.transactionData.title}</h2>
        <p className="mb-4">{hook.transactionData.description}</p>
        {hook.isProcessing ? (
          <div className="text-blue-500">Processing transaction...</div>
        ) : hook.currentTransaction ? (
          <div>
            <div>Status: {hook.currentTransaction.status}</div>
            {hook.currentTransaction.txId && (
              <div>TxID: {hook.currentTransaction.txId}</div>
            )}
            {hook.currentTransaction.error && (
              <div className="text-red-500">Error: {hook.currentTransaction.error}</div>
            )}
          </div>
        ) : (
          <button className="bg-blue-600 text-white px-4 py-2 rounded" onClick={hook.confirmTransaction}>
            Confirm Transaction
          </button>
        )}
        <button className="mt-4 text-gray-600" onClick={hook.closeModal}>Close</button>
      </div>
    </div>
  );
};
