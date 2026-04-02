// Transaction Status UI Components
// User-facing components for displaying transaction progress and feedback

import React, { useState, useEffect } from 'react';
import type { 
  Transaction, 
  TransactionStatus as TxStatus, 
  TransactionStep
} from './transactionTracker';
import styles from '../styles/components/TransactionStatusUI.module.css';

/**
 * Props for transaction status components
 */
interface TransactionStatusProps {
  transaction: Transaction;
  onRetry?: () => void;
  onCancel?: () => void;
  onDismiss?: () => void;
  showExplorerLink?: boolean;
  compact?: boolean;
}

interface TransactionStepProps {
  step: TransactionStep;
  isActive: boolean;
  isCompleted: boolean;
  index: number;
}

interface TransactionProgressProps {
  steps: TransactionStep[];
  currentStep: number;
  compact?: boolean;
}

/**
 * Transaction status badge component
 */
export const TransactionStatusBadge: React.FC<{ status: TxStatus; compact?: boolean }> = ({ 
  status, 
  compact = false 
}) => {
  const getStatusClasses = (status: TxStatus) => {
    const baseClasses = `${styles.statusBadge} ${compact ? styles.statusBadgeCompact : styles.statusBadgeRegular}`;
    
    switch (status) {
      case 'idle':
        return `${baseClasses} ${styles.statusIdle}`;
      case 'pending':
      case 'broadcasting':
      case 'submitted':
        return `${baseClasses} ${styles.statusPending}`;
      case 'confirming':
        return `${baseClasses} ${styles.statusConfirming}`;
      case 'confirmed':
      case 'success':
        return `${baseClasses} ${styles.statusSuccess}`;
      case 'failed':
      case 'timeout':
        return `${baseClasses} ${styles.statusFailed}`;
      case 'cancelled':
        return `${baseClasses} ${styles.statusCancelled}`;
      default:
        return `${baseClasses} ${styles.statusPending}`;
    }
  };

  const getStatusText = (status: TxStatus) => {
    switch (status) {
      case 'idle': return 'Ready';
      case 'pending': return 'Pending';
      case 'broadcasting': return 'Broadcasting';
      case 'submitted': return 'Submitted';
      case 'confirming': return 'Confirming';
      case 'confirmed': return 'Confirmed';
      case 'success': return 'Success';
      case 'failed': return 'Failed';
      case 'cancelled': return 'Cancelled';
      case 'timeout': return 'Timeout';
      default: return 'Processing';
    }
  };

  return (
    <span className={getStatusClasses(status)}>
      {getStatusText(status)}
    </span>
  );
};

/**
 * Transaction step indicator component
 */
export const TransactionStepIndicator: React.FC<TransactionStepProps> = ({ 
  step, 
  isActive, 
  isCompleted, 
  index 
}) => {
  const getStepIcon = () => {
    if (step.status === 'success' || isCompleted) {
      return (
        <div className={`${styles.stepIcon} ${styles.stepIconSuccess}`}>
          <svg className={styles.stepIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
      );
    }
    
    if (step.status === 'failed') {
      return (
        <div className={`${styles.stepIcon} ${styles.stepIconFailed}`}>
          <svg className={styles.stepIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
      );
    }
    
    if (isActive || ['pending', 'broadcasting', 'submitted', 'confirming'].includes(step.status)) {
      return (
        <div className={`${styles.stepIcon} ${styles.stepIconActive}`}>
          <div className={styles.stepIconPulse}></div>
        </div>
      );
    }
    
    return (
      <div className={`${styles.stepIcon} ${styles.stepIconDefault}`}>
        <span className={styles.stepTitle}>{index + 1}</span>
      </div>
    );
  };

  return (
    <div className={styles.stepContainer}>
      {getStepIcon()}
      <div className={styles.stepContent}>
        <div className={styles.stepHeader}>
          <p className={`${styles.stepTitle} ${isActive ? styles.stepTitleActive : ''}`}>
            {step.title}
          </p>
          <TransactionStatusBadge status={step.status} compact />
        </div>
        <p className={styles.stepDescription}>{step.description}</p>
        {step.error && (
          <p className={styles.stepError}>{step.error}</p>
        )}
      </div>
    </div>
  );
};

/**
 * Transaction progress indicator component
 */
export const TransactionProgress: React.FC<TransactionProgressProps> = ({ 
  steps, 
  currentStep, 
  compact = false 
}) => {
  const completedSteps = steps.filter(step => step.status === 'success').length;
  const progressPercentage = (completedSteps / steps.length) * 100;

  if (compact) {
    return (
      <div className={styles.progressCompactContainer}>
        <div className={styles.progressHeader}>
          <span className={styles.progressStats}>Progress</span>
          <span className={styles.progressStatsCompact}>{completedSteps}/{steps.length}</span>
        </div>
        <div className={styles.progressBar}>
          <div 
            className={styles.progressFill}
            style={{ width: `${progressPercentage}%` }}
          ></div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.progressContainer}>
      <div className={styles.progressHeader}>
        <h3 className={styles.progressTitle}>Transaction Progress</h3>
        <span className={styles.progressStats}>{completedSteps}/{steps.length} completed</span>
      </div>
      
      <div className={styles.progressBar}>
        <div 
          className={styles.progressFill}
          style={{ width: `${progressPercentage}%` }}
        ></div>
      </div>
      
      <div className={styles.progressSteps}>
        {steps.map((step, index) => (
          <TransactionStepIndicator
            key={step.id}
            step={step}
            isActive={index === currentStep}
            isCompleted={step.status === 'success'}
            index={index}
          />
        ))}
      </div>
    </div>
  );
};

/**
 * Main transaction status display component
 */
export const TransactionStatusDisplay: React.FC<TransactionStatusProps> = ({
  transaction,
  onRetry,
  onCancel,
  onDismiss,
  showExplorerLink = true,
  compact = false
}) => {
  const [isExpanded] = useState(!compact);

  const handleExplorerClick = () => {
    if (transaction.explorerUrl) {
      window.open(transaction.explorerUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const canRetry = transaction.canRetry && onRetry;
  const canCancel = ['idle', 'pending'].includes(transaction.status) && onCancel;

  if (compact) {
    return (
      <div className={styles.statusDisplayCompact}>
        <div className={styles.compactHeader}>
          <div className={styles.compactInfo}>
            <TransactionStatusBadge status={transaction.status} compact />
            <div>
              <p className={styles.compactTitle}>{transaction.title}</p>
              <p className={styles.compactMessage}>{transaction.userMessage}</p>
            </div>
          </div>
          
          <div className={styles.compactActions}>
            {transaction.txId && showExplorerLink && (
              <button
                onClick={handleExplorerClick}
                className={`${styles.compactButton} ${styles.compactButtonSecondary}`}
              >
                View
              </button>
            )}
            
            {canRetry && (
              <button
                onClick={onRetry}
                className={`${styles.compactButton} ${styles.compactButtonPrimary}`}
              >
                Retry
              </button>
            )}
            
            {onDismiss && (
              <button
                onClick={onDismiss}
                className={styles.compactDismiss}
              >
                ×
              </button>
            )}
          </div>
        </div>
        
        {transaction.steps && isExpanded && (
          <div className={styles.compactProgress}>
            <TransactionProgress
              steps={transaction.steps}
              currentStep={transaction.currentStep || 0}
              compact
            />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={styles.fullDisplay}>
      {/* Header */}
      <div className={styles.fullDisplayHeader}>
        <div className={styles.fullDisplayHeaderContent}>
          <div>
            <h3 className={styles.fullDisplayTitle}>{transaction.title}</h3>
            <p className={styles.fullDisplayDescription}>{transaction.description}</p>
          </div>
          <TransactionStatusBadge status={transaction.status} />
        </div>
      </div>

      {/* Content */}
      <div className={styles.fullDisplayContent}>
        {/* User Message */}
        <div className={styles.userMessage}>
          {transaction.userMessage}
        </div>

        {/* Error Display */}
        {transaction.error && (
          <div className={styles.errorDisplay}>
            <div className={styles.errorContent}>
              <svg className={styles.errorIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <h4 className={styles.errorTitle}>Error</h4>
                <p className={styles.errorMessage}>{transaction.error.userMessage}</p>
              </div>
            </div>
          </div>
        )}

        {/* Multi-step Progress */}
        {transaction.steps && (
          <TransactionProgress
            steps={transaction.steps}
            currentStep={transaction.currentStep || 0}
          />
        )}

        {/* Transaction Details */}
        {transaction.txId && (
          <div className={styles.transactionDetailsBox}>
            <div className={styles.detailRowFull}>
              <span className={styles.detailLabelFull}>Transaction ID:</span>
              <span className={styles.txIdFull}>
                {transaction.txId.substring(0, 20)}...
              </span>
            </div>
            
            {transaction.amount && (
              <div className={styles.detailRowFull}>
                <span className={styles.detailLabelFull}>Amount:</span>
                <span className={styles.detailValueFull}>{transaction.amount} μSTX</span>
              </div>
            )}
            
            <div className={styles.detailRowFull}>
              <span className={styles.detailLabelFull}>Created:</span>
              <span>{new Date(transaction.createdAt).toLocaleTimeString()}</span>
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className={styles.fullDisplayActions}>
        <div className={styles.actionsLeft}>
          {canRetry && (
            <button
              onClick={onRetry}
              className={styles.retryButton}
            >
              Retry Transaction
            </button>
          )}
          
          {canCancel && (
            <button
              onClick={onCancel}
              className={styles.cancelButton}
            >
              Cancel
            </button>
          )}
        </div>
        
        <div className={styles.actionsRight}>
          {transaction.txId && showExplorerLink && (
            <button
              onClick={handleExplorerClick}
              className={styles.explorerButton}
            >
              <span>View in Explorer</span>
              <svg className={styles.explorerIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </button>
          )}
          
          {onDismiss && transaction.status === 'success' && (
            <button
              onClick={onDismiss}
              className={styles.dismissButton}
            >
              Dismiss
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

/**
 * Transaction notification toast component
 */
export const TransactionToast: React.FC<{
  transaction: Transaction;
  onDismiss: () => void;
  autoHide?: boolean;
  hideDelay?: number;
}> = ({ transaction, onDismiss, autoHide = true, hideDelay = 5000 }) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (autoHide && ['success', 'failed', 'cancelled'].includes(transaction.status)) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(onDismiss, 300); // Allow fade out animation
      }, hideDelay);
      
      return () => clearTimeout(timer);
    }
  }, [transaction.status, autoHide, hideDelay, onDismiss]);

  const getToastStyle = () => {
    const baseClasses = "fixed top-4 right-4 max-w-sm w-full bg-white border rounded-lg shadow-lg transform transition-all duration-300 z-50";
    
    switch (transaction.status) {
      case 'success':
        return `${baseClasses} border-green-200`;
      case 'failed':
      case 'timeout':
        return `${baseClasses} border-red-200`;
      case 'cancelled':
        return `${baseClasses} border-gray-200`;
      default:
        return `${baseClasses} border-blue-200`;
    }
  };

  const getIcon = () => {
    switch (transaction.status) {
      case 'success':
        return (
          <div className={`${styles.toastIcon} ${styles.toastIconSuccess}`}>
            <svg className={`${styles.toastIconSvg} ${styles.toastIconSvgSuccess}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        );
      case 'failed':
      case 'timeout':
        return (
          <div className={`${styles.toastIcon} ${styles.toastIconError}`}>
            <svg className={`${styles.toastIconSvg} ${styles.toastIconSvgError}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
        );
      default:
        return (
          <div className={`${styles.toastIcon} ${styles.toastIconPending}`}>
            <div className={styles.toastPulse}></div>
          </div>
        );
    }
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div className={`${getToastStyle()} ${isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}`}>
      <div className={styles.toastContent}>
        <div className={styles.toastBody}>
          {getIcon()}
          <div className={styles.toastText}>
            <p className={styles.toastTitle}>{transaction.title}</p>
            <p className={styles.toastMessage}>{transaction.userMessage}</p>
          </div>
          <button
            onClick={() => {
              setIsVisible(false);
              setTimeout(onDismiss, 300);
            }}
            className={styles.toastCloseButton}
          >
            <svg className={styles.toastCloseIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

/**
 * Hook for managing transaction notifications
 */
export function useTransactionNotifications() {
  const [toasts, setToasts] = useState<Transaction[]>([]);

  const showToast = (transaction: Transaction) => {
    setToasts(prev => [...prev.filter(t => t.id !== transaction.id), transaction]);
  };

  const hideToast = (transactionId: string) => {
    setToasts(prev => prev.filter(t => t.id !== transactionId));
  };

  const clearAllToasts = () => {
    setToasts([]);
  };

  return {
    toasts,
    showToast,
    hideToast,
    clearAllToasts
  };
}

/**
 * Transaction manager component for handling multiple transactions
 */
export const TransactionManager: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const { toasts, hideToast } = useTransactionNotifications();

  return (
    <>
      {children}
      
      {/* Render toast notifications */}
      {toasts.map(transaction => (
        <TransactionToast
          key={transaction.id}
          transaction={transaction}
          onDismiss={() => hideToast(transaction.id)}
        />
      ))}
    </>
  );
};