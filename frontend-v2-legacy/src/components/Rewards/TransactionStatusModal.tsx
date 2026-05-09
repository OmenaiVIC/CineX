import React from 'react';
import styles from '../styles/components/TransactionStatusModal.module.css';

interface TransactionStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  status: 'pending' | 'success' | 'error' | null;
  txId?: string;
  fee?: string;
  error?: string;
}

const TransactionStatusModal: React.FC<TransactionStatusModalProps> = ({ isOpen, onClose, status, txId, fee, error }) => {
  if (!isOpen) return null;
  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
        <button className={styles.modalCloseButton} onClick={onClose}>&times;</button>
        <h2>Transaction Status</h2>
        {status === 'pending' && <p>Transaction is pending...</p>}
        {status === 'success' && <>
          <p>Transaction successful!</p>
          {txId && <p><strong>Tx ID:</strong> {txId}</p>}
        </>}
        {status === 'error' && <>
          <p className={styles.errorMessage}>Transaction failed.</p>
          {error && <p>{error}</p>}
        </>}
        {fee && <p><strong>Fee:</strong> {fee}</p>}
      </div>
    </div>
  );
};

export default TransactionStatusModal;
