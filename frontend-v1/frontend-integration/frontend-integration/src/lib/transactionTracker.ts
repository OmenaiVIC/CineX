// Transaction status tracking system for CineX platform
// Handles transaction lifecycle from initiation to completion with user feedback

import { useState, useEffect, useCallback, useRef } from 'react';
import { getExplorerUrl } from './contracts';

/**
 * Transaction status types
 */
export type TransactionStatus = 
  | 'idle'           // Not started
  | 'pending'        // User initiated, waiting for wallet confirmation
  | 'broadcasting'   // Wallet confirmed, broadcasting to network
  | 'submitted'      // Submitted to network, waiting for confirmation
  | 'confirming'     // In mempool, waiting for block confirmation
  | 'confirmed'      // Transaction confirmed in block
  | 'success'        // Transaction successful
  | 'failed'         // Transaction failed
  | 'cancelled'      // User cancelled transaction
  | 'timeout';       // Transaction timed out

/**
 * Transaction step for multi-step operations
 */
export interface TransactionStep {
  id: string;
  title: string;
  description: string;
  status: TransactionStatus;
  txId?: string;
  error?: string;
  estimatedDuration?: number; // in milliseconds
  isOptional?: boolean;
}

/**
 * Complete transaction information
 */
export interface Transaction {
  id: string;                    // Unique transaction ID
  type: TransactionType;         // Type of transaction
  status: TransactionStatus;     // Current status
  txId?: string;                 // Blockchain transaction ID
  error?: TransactionError;      // Error information if failed
  createdAt: number;             // Timestamp when transaction was initiated
  updatedAt: number;             // Timestamp of last update
  completedAt?: number;          // Timestamp when transaction completed
  
  // Transaction details
  title: string;                 // Human-readable title
  description: string;           // Human-readable description
  amount?: string;               // Amount in microSTX (if applicable)
  recipient?: string;            // Recipient address (if applicable)
  
  // Progress tracking
  steps?: TransactionStep[];     // Multi-step transaction progress
  currentStep?: number;          // Current step index
  
  // User feedback
  userMessage?: string;          // Message to display to user
  actionRequired?: string;       // Action user needs to take
  
  // Explorer integration
  explorerUrl?: string;          // Link to transaction in Stacks Explorer
  
  // Retry information
  retryCount: number;            // Number of retry attempts
  canRetry: boolean;             // Whether transaction can be retried
  maxRetries: number;            // Maximum number of retries allowed
}

/**
 * Supported transaction types
 */
export type TransactionType =
  | 'campaign-create'
  | 'campaign-contribute'
  | 'campaign-update'
  | 'pool-create'
  | 'pool-join'
  | 'pool-contribute'
  | 'escrow-deposit'
  | 'escrow-withdraw'
  | 'verification-submit'
  | 'verification-update'
  | 'nft-mint'
  | 'token-transfer';

/**
 * Transaction error information
 */
export interface TransactionError {
  code: string;
  message: string;
  userMessage: string;
  isRetryable: boolean;
  details?: any;
}

/**
 * Transaction tracking hooks interface
 */
export interface TransactionHookResult {
  // Current state
  transaction: Transaction | null;
  isLoading: boolean;
  
  // Actions
  startTransaction: (config: TransactionConfig) => string; // Returns transaction ID
  updateTransaction: (updates: Partial<Transaction>) => void;
  retryTransaction: () => Promise<void>;
  cancelTransaction: () => void;
  clearTransaction: () => void;
  
  // Multi-step helpers
  nextStep: () => void;
  setStepStatus: (stepIndex: number, status: TransactionStatus, error?: string) => void;
  
  // Status checks
  isIdle: boolean;
  isPending: boolean;
  isProcessing: boolean;
  isCompleted: boolean;
  isSuccessful: boolean;
  isFailed: boolean;
}

/**
 * Transaction configuration
 */
export interface TransactionConfig {
  type: TransactionType;
  title: string;
  description: string;
  amount?: string;
  recipient?: string;
  steps?: Omit<TransactionStep, 'status'>[];
  maxRetries?: number;
  timeout?: number; // in milliseconds
  onSuccess?: (transaction: Transaction) => void;
  onError?: (error: TransactionError) => void;
  onStatusChange?: (status: TransactionStatus) => void;
}

/**
 * Transaction status tracker class
 */
class TransactionTracker {
  private transactions = new Map<string, Transaction>();
  private listeners = new Map<string, Array<(transaction: Transaction) => void>>();
  private timeouts = new Map<string, NodeJS.Timeout>();
  
  /**
   * Create a new transaction
   */
  createTransaction(config: TransactionConfig): string {
    const id = this.generateTransactionId();
    const now = Date.now();
    
    const transaction: Transaction = {
      id,
      type: config.type,
      status: 'idle',
      createdAt: now,
      updatedAt: now,
      title: config.title,
      description: config.description,
      amount: config.amount,
      recipient: config.recipient,
      retryCount: 0,
      canRetry: true,
      maxRetries: config.maxRetries || 3,
      steps: config.steps?.map((step, index) => ({
        ...step,
        status: index === 0 ? 'idle' : 'idle' as TransactionStatus
      })),
      currentStep: config.steps?.length ? 0 : undefined,
    };
    
    this.transactions.set(id, transaction);
    
    // Set up timeout if specified
    if (config.timeout) {
      const timeoutHandle = setTimeout(() => {
        this.updateTransactionStatus(id, 'timeout', {
          code: 'TRANSACTION_TIMEOUT',
          message: 'Transaction timed out',
          userMessage: 'Transaction took too long to complete. You can try again.',
          isRetryable: true
        });
      }, config.timeout);
      
      this.timeouts.set(id, timeoutHandle);
    }
    
    this.notifyListeners(id);
    return id;
  }
  
  /**
   * Update transaction status
   */
  updateTransactionStatus(
    id: string,
    status: TransactionStatus,
    error?: TransactionError,
    txId?: string
  ): void {
    const transaction = this.transactions.get(id);
    if (!transaction) return;
    
    const updates: Partial<Transaction> = {
      status,
      updatedAt: Date.now(),
    };
    
    if (txId) {
      updates.txId = txId;
      updates.explorerUrl = getExplorerUrl(txId);
    }
    
    if (error) {
      updates.error = error;
      updates.canRetry = error.isRetryable && transaction.retryCount < transaction.maxRetries;
    }
    
    // Handle completion
    if (['success', 'failed', 'cancelled', 'timeout'].includes(status)) {
      updates.completedAt = Date.now();
      
      // Clear timeout
      const timeoutHandle = this.timeouts.get(id);
      if (timeoutHandle) {
        clearTimeout(timeoutHandle);
        this.timeouts.delete(id);
      }
    }
    
    // Update user message based on status
    updates.userMessage = this.getStatusMessage(status, transaction.type, error);
    
    this.updateTransaction(id, updates);
  }
  
  /**
   * Update transaction with partial data
   */
  updateTransaction(id: string, updates: Partial<Transaction>): void {
    const transaction = this.transactions.get(id);
    if (!transaction) return;
    
    const updatedTransaction = {
      ...transaction,
      ...updates,
      updatedAt: Date.now(),
    };
    
    this.transactions.set(id, updatedTransaction);
    this.notifyListeners(id);
  }
  
  /**
   * Get transaction by ID
   */
  getTransaction(id: string): Transaction | null {
    return this.transactions.get(id) || null;
  }
  
  /**
   * Retry a failed transaction
   */
  async retryTransaction(id: string): Promise<void> {
    const transaction = this.transactions.get(id);
    if (!transaction || !transaction.canRetry) return;
    
    this.updateTransaction(id, {
      status: 'idle',
      retryCount: transaction.retryCount + 1,
      error: undefined,
      userMessage: 'Retrying transaction...',
    });
  }
  
  /**
   * Cancel a transaction
   */
  cancelTransaction(id: string): void {
    this.updateTransactionStatus(id, 'cancelled');
  }
  
  /**
   * Remove transaction
   */
  removeTransaction(id: string): void {
    // Clear timeout
    const timeoutHandle = this.timeouts.get(id);
    if (timeoutHandle) {
      clearTimeout(timeoutHandle);
      this.timeouts.delete(id);
    }
    
    this.transactions.delete(id);
    this.listeners.delete(id);
  }
  
  /**
   * Add listener for transaction updates
   */
  addListener(id: string, listener: (transaction: Transaction) => void): () => void {
    if (!this.listeners.has(id)) {
      this.listeners.set(id, []);
    }
    
    this.listeners.get(id)!.push(listener);
    
    // Return unsubscribe function
    return () => {
      const listeners = this.listeners.get(id);
      if (listeners) {
        const index = listeners.indexOf(listener);
        if (index > -1) {
          listeners.splice(index, 1);
        }
      }
    };
  }
  
  /**
   * Update multi-step transaction progress
   */
  updateStep(id: string, stepIndex: number, status: TransactionStatus, error?: string): void {
    const transaction = this.transactions.get(id);
    if (!transaction?.steps || stepIndex >= transaction.steps.length) return;
    
    const updatedSteps = [...transaction.steps];
    updatedSteps[stepIndex] = {
      ...updatedSteps[stepIndex],
      status,
      error
    };
    
    // Update current step
    let currentStep = stepIndex;
    if (status === 'success' && stepIndex < updatedSteps.length - 1) {
      currentStep = stepIndex + 1;
      updatedSteps[currentStep].status = 'pending';
    }
    
    this.updateTransaction(id, {
      steps: updatedSteps,
      currentStep
    });
  }
  
  /**
   * Generate unique transaction ID
   */
  private generateTransactionId(): string {
    return `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  /**
   * Get user-friendly status message
   */
  private getStatusMessage(
    status: TransactionStatus,
    type: TransactionType,
    error?: TransactionError
  ): string {
    if (error) {
      return error.userMessage;
    }
    
    const typeDisplayName = this.getTransactionTypeDisplayName(type);
    
    switch (status) {
      case 'idle':
        return `Ready to start ${typeDisplayName}`;
      case 'pending':
        return 'Please confirm the transaction in your wallet';
      case 'broadcasting':
        return 'Broadcasting transaction to the network...';
      case 'submitted':
        return 'Transaction submitted, waiting for confirmation...';
      case 'confirming':
        return 'Transaction confirming in the blockchain...';
      case 'confirmed':
        return 'Transaction confirmed!';
      case 'success':
        return `${typeDisplayName} completed successfully!`;
      case 'failed':
        return `${typeDisplayName} failed. Please try again.`;
      case 'cancelled':
        return 'Transaction was cancelled';
      case 'timeout':
        return 'Transaction timed out. Please try again.';
      default:
        return 'Processing transaction...';
    }
  }
  
  /**
   * Get display name for transaction type
   */
  private getTransactionTypeDisplayName(type: TransactionType): string {
    const displayNames: Record<TransactionType, string> = {
      'campaign-create': 'Campaign creation',
      'campaign-contribute': 'Campaign contribution',
      'campaign-update': 'Campaign update',
      'pool-create': 'Pool creation',
      'pool-join': 'Pool joining',
      'pool-contribute': 'Pool contribution',
      'escrow-deposit': 'Escrow deposit',
      'escrow-withdraw': 'Escrow withdrawal',
      'verification-submit': 'Verification submission',
      'verification-update': 'Verification update',
      'nft-mint': 'NFT minting',
      'token-transfer': 'Token transfer'
    };
    
    return displayNames[type] || 'Transaction';
  }
  
  /**
   * Notify all listeners for a transaction
   */
  private notifyListeners(id: string): void {
    const transaction = this.transactions.get(id);
    const listeners = this.listeners.get(id);
    
    if (transaction && listeners) {
      listeners.forEach(listener => {
        try {
          listener(transaction);
        } catch (error) {
          console.error('Error in transaction listener:', error);
        }
      });
    }
  }
}

// Export singleton instance
export const transactionTracker = new TransactionTracker();

/**
 * React hook for transaction tracking
 */
export function useTransaction(config?: TransactionConfig): TransactionHookResult {
  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const configRef = useRef(config);
  
  // Update config ref when it changes
  useEffect(() => {
    configRef.current = config;
  }, [config]);
  
  // Start a new transaction
  const startTransaction = useCallback((newConfig: TransactionConfig): string => {
    setIsLoading(true);
    const id = transactionTracker.createTransaction(newConfig);
    
    // Subscribe to transaction updates
    transactionTracker.addListener(id, (updatedTransaction) => {
      setTransaction(updatedTransaction);
      
      // Handle completion
      if (['success', 'failed', 'cancelled', 'timeout'].includes(updatedTransaction.status)) {
        setIsLoading(false);
        
        // Call callbacks
        if (updatedTransaction.status === 'success' && newConfig.onSuccess) {
          newConfig.onSuccess(updatedTransaction);
        } else if (updatedTransaction.status === 'failed' && newConfig.onError && updatedTransaction.error) {
          newConfig.onError(updatedTransaction.error);
        }
      }
      
      // Status change callback
      if (newConfig.onStatusChange) {
        newConfig.onStatusChange(updatedTransaction.status);
      }
    });
    
    // Store initial transaction state
    setTransaction(transactionTracker.getTransaction(id));
    
    return id;
  }, []);
  
  // Update current transaction
  const updateTransaction = useCallback((updates: Partial<Transaction>) => {
    if (transaction) {
      transactionTracker.updateTransaction(transaction.id, updates);
    }
  }, [transaction]);
  
  // Retry transaction
  const retryTransaction = useCallback(async () => {
    if (transaction) {
      await transactionTracker.retryTransaction(transaction.id);
    }
  }, [transaction]);
  
  // Cancel transaction
  const cancelTransaction = useCallback(() => {
    if (transaction) {
      transactionTracker.cancelTransaction(transaction.id);
    }
  }, [transaction]);
  
  // Clear transaction
  const clearTransaction = useCallback(() => {
    if (transaction) {
      transactionTracker.removeTransaction(transaction.id);
      setTransaction(null);
    }
  }, [transaction]);
  
  // Multi-step helpers
  const nextStep = useCallback(() => {
    if (transaction?.steps && transaction.currentStep !== undefined) {
      const nextStepIndex = transaction.currentStep + 1;
      if (nextStepIndex < transaction.steps.length) {
        transactionTracker.updateStep(transaction.id, nextStepIndex, 'pending');
      }
    }
  }, [transaction]);
  
  const setStepStatus = useCallback((stepIndex: number, status: TransactionStatus, error?: string) => {
    if (transaction) {
      transactionTracker.updateStep(transaction.id, stepIndex, status, error);
    }
  }, [transaction]);
  
  // Status checks
  const isIdle = transaction?.status === 'idle' || !transaction;
  const isPending = ['pending', 'broadcasting', 'submitted'].includes(transaction?.status || '');
  const isProcessing = ['confirming'].includes(transaction?.status || '');
  const isCompleted = ['success', 'failed', 'cancelled', 'timeout'].includes(transaction?.status || '');
  const isSuccessful = transaction?.status === 'success';
  const isFailed = ['failed', 'timeout'].includes(transaction?.status || '');
  
  return {
    transaction,
    isLoading,
    startTransaction,
    updateTransaction,
    retryTransaction,
    cancelTransaction,
    clearTransaction,
    nextStep,
    setStepStatus,
    isIdle,
    isPending,
    isProcessing,
    isCompleted,
    isSuccessful,
    isFailed,
  };
}

// Export utility functions
export { transactionTracker as tracker };

/**
 * Predefined transaction steps for common operations
 */
export const TransactionSteps = {
  campaignCreate: [
    { id: 'validate', title: 'Validate Data', description: 'Validating campaign information' },
    { id: 'upload', title: 'Upload Media', description: 'Uploading campaign media files' },
    { id: 'deploy', title: 'Create Campaign', description: 'Creating campaign on blockchain' },
    { id: 'index', title: 'Index Campaign', description: 'Making campaign discoverable' }
  ],
  
  poolJoin: [
    { id: 'verify', title: 'Verify Eligibility', description: 'Checking pool requirements' },
    { id: 'deposit', title: 'Deposit Bond', description: 'Depositing joining bond' },
    { id: 'join', title: 'Join Pool', description: 'Adding to pool membership' }
  ],
  
  escrowDeposit: [
    { id: 'validate', title: 'Validate Amount', description: 'Checking deposit amount' },
    { id: 'lock', title: 'Lock Funds', description: 'Locking funds in escrow' },
    { id: 'confirm', title: 'Confirm Escrow', description: 'Confirming escrow creation' }
  ]
};