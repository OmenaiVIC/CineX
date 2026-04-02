// Simplified transaction integration for CineX platform
// Provides transaction simulation and tracking for development/demo purposes

import { useState, useEffect } from 'react';
import { 
  transactionTracker
} from './transactionTracker';
import type {
  TransactionConfig,
  TransactionType,
  TransactionError 
} from './transactionTracker';

/**
 * Demo transaction parameters
 */
export interface CampaignCreateParams {
  title: string;
  description: string;
  targetAmount: number;
  duration: number;
  category: string;
  mediaHashes?: string[];
}

export interface PoolCreateParams {
  name: string;
  description: string;
  bondAmount: number;
  maxMembers: number;
  duration: number;
}

export interface ContributeParams {
  id: number;
  amount: number;
}

/**
 * Demo transaction handler for development and testing
 */
class DemoTransactionHandler {
  /**
   * Simulate wallet connection
   */
  async connectWallet(): Promise<void> {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        if (Math.random() > 0.1) { // 90% success rate
          resolve();
        } else {
          reject(new Error('User cancelled wallet connection'));
        }
      }, 1500); // Simulate connection delay
    });
  }
  
  /**
   * Simulate creating a campaign
   */
  async createCampaign(params: CampaignCreateParams, transactionId: string): Promise<void> {
    try {
      // Step 1: Validate data
      transactionTracker.updateTransactionStatus(transactionId, 'pending');
      transactionTracker.updateStep(transactionId, 0, 'pending');
      
      await this.simulateDelay(800);
      transactionTracker.updateStep(transactionId, 0, 'success');
      
      // Step 2: Upload media (if any)
      transactionTracker.updateStep(transactionId, 1, 'pending');
      await this.simulateDelay(2000);
      transactionTracker.updateStep(transactionId, 1, 'success');
      
      // Step 3: Create campaign on blockchain
      transactionTracker.updateStep(transactionId, 2, 'pending');
      transactionTracker.updateTransactionStatus(transactionId, 'broadcasting');
      
      const txId = this.generateMockTxId();
      transactionTracker.updateTransaction(transactionId, { txId });
      
      await this.simulateDelay(3000);
      transactionTracker.updateTransactionStatus(transactionId, 'submitted', undefined, txId);
      
      // Simulate blockchain confirmation
      await this.simulateDelay(5000);
      transactionTracker.updateStep(transactionId, 2, 'success');
      
      // Step 4: Index campaign
      transactionTracker.updateStep(transactionId, 3, 'pending');
      await this.simulateDelay(1500);
      transactionTracker.updateStep(transactionId, 3, 'success');
      
      transactionTracker.updateTransactionStatus(transactionId, 'success');
      
    } catch (error) {
      this.handleError(transactionId, error as Error);
    }
  }
  
  /**
   * Simulate contributing to a campaign
   */
  async contributeToCampaign(params: ContributeParams, transactionId: string): Promise<void> {
    try {
      transactionTracker.updateTransactionStatus(transactionId, 'pending');
      await this.simulateDelay(1000);
      
      transactionTracker.updateTransactionStatus(transactionId, 'broadcasting');
      const txId = this.generateMockTxId();
      transactionTracker.updateTransaction(transactionId, { txId });
      
      await this.simulateDelay(2000);
      transactionTracker.updateTransactionStatus(transactionId, 'submitted', undefined, txId);
      
      // Simulate random failure for testing
      if (Math.random() < 0.15) { // 15% failure rate
        throw new Error('Insufficient funds');
      }
      
      await this.simulateDelay(4000);
      transactionTracker.updateTransactionStatus(transactionId, 'success');
      
    } catch (error) {
      this.handleError(transactionId, error as Error);
    }
  }
  
  /**
   * Simulate creating a Co-EP pool
   */
  async createPool(params: PoolCreateParams, transactionId: string): Promise<void> {
    try {
      // Step 1: Verify eligibility
      transactionTracker.updateTransactionStatus(transactionId, 'pending');
      transactionTracker.updateStep(transactionId, 0, 'pending');
      
      await this.simulateDelay(1200);
      transactionTracker.updateStep(transactionId, 0, 'success');
      
      // Step 2: Deposit bond
      transactionTracker.updateStep(transactionId, 1, 'pending');
      transactionTracker.updateTransactionStatus(transactionId, 'broadcasting');
      
      const txId = this.generateMockTxId();
      transactionTracker.updateTransaction(transactionId, { txId });
      
      await this.simulateDelay(2500);
      transactionTracker.updateStep(transactionId, 1, 'success');
      
      // Step 3: Create pool
      transactionTracker.updateStep(transactionId, 2, 'pending');
      await this.simulateDelay(3000);
      transactionTracker.updateStep(transactionId, 2, 'success');
      
      transactionTracker.updateTransactionStatus(transactionId, 'success');
      
    } catch (error) {
      this.handleError(transactionId, error as Error);
    }
  }
  
  /**
   * Simulate joining a Co-EP pool
   */
  async joinPool(poolId: number, bondAmount: number, transactionId: string): Promise<void> {
    try {
      // Single step process
      transactionTracker.updateTransactionStatus(transactionId, 'pending');
      await this.simulateDelay(1000);
      
      transactionTracker.updateTransactionStatus(transactionId, 'broadcasting');
      const txId = this.generateMockTxId();
      transactionTracker.updateTransaction(transactionId, { txId });
      
      await this.simulateDelay(3000);
      transactionTracker.updateTransactionStatus(transactionId, 'submitted', undefined, txId);
      
      await this.simulateDelay(4000);
      transactionTracker.updateTransactionStatus(transactionId, 'success');
      
    } catch (error) {
      this.handleError(transactionId, error as Error);
    }
  }
  
  /**
   * Generate a mock transaction ID for demo purposes
   */
  private generateMockTxId(): string {
    const chars = 'abcdef0123456789';
    let result = '0x';
    for (let i = 0; i < 64; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }
  
  /**
   * Simulate network delay
   */
  private async simulateDelay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  /**
   * Handle transaction errors
   */
  private handleError(transactionId: string, error: Error): void {
    const transactionError: TransactionError = {
      code: 'SIMULATION_ERROR',
      message: error.message,
      userMessage: this.getErrorMessage(error.message),
      isRetryable: true,
      details: error
    };
    
    transactionTracker.updateTransactionStatus(transactionId, 'failed', transactionError);
  }
  
  /**
   * Get user-friendly error message
   */
  private getErrorMessage(errorMessage: string): string {
    switch (errorMessage) {
      case 'Insufficient funds':
        return 'You don\'t have enough STX for this transaction. Please check your balance.';
      case 'User cancelled':
        return 'Transaction was cancelled by user.';
      case 'Network error':
        return 'Network connection failed. Please try again.';
      default:
        return 'Transaction failed. Please try again later.';
    }
  }
}

// Export singleton instance
export const demoTransactionHandler = new DemoTransactionHandler();

/**
 * High-level transaction functions with multi-step tracking
 */
export const DemoTransactions = {
  /**
   * Create a campaign with full transaction tracking
   */
  async createCampaign(params: CampaignCreateParams): Promise<string> {
    const config: TransactionConfig = {
      type: 'campaign-create' as TransactionType,
      title: 'Create Campaign',
      description: `Creating campaign: ${params.title}`,
      maxRetries: 3,
      timeout: 300000, // 5 minutes
      steps: [
        { id: 'validate', title: 'Validate Data', description: 'Validating campaign information' },
        { id: 'upload', title: 'Upload Media', description: 'Uploading campaign media files' },
        { id: 'deploy', title: 'Create Campaign', description: 'Creating campaign on blockchain' },
        { id: 'index', title: 'Index Campaign', description: 'Making campaign discoverable' }
      ]
    };
    
    const transactionId = transactionTracker.createTransaction(config);
    
    // Start the transaction process
    setTimeout(() => {
      demoTransactionHandler.createCampaign(params, transactionId);
    }, 100);
    
    return transactionId;
  },
  
  /**
   * Contribute to a campaign
   */
  async contributeToCampaign(campaignId: number, amount: number): Promise<string> {
    const config: TransactionConfig = {
      type: 'campaign-contribute' as TransactionType,
      title: 'Contribute to Campaign',
      description: `Contributing ${amount.toLocaleString()} μSTX to campaign #${campaignId}`,
      amount: amount.toString(),
      maxRetries: 3,
      timeout: 180000 // 3 minutes
    };
    
    const transactionId = transactionTracker.createTransaction(config);
    
    setTimeout(() => {
      demoTransactionHandler.contributeToCampaign({ id: campaignId, amount }, transactionId);
    }, 100);
    
    return transactionId;
  },
  
  /**
   * Create a Co-EP pool with multi-step tracking
   */
  async createPool(params: PoolCreateParams): Promise<string> {
    const config: TransactionConfig = {
      type: 'pool-create' as TransactionType,
      title: 'Create Pool',
      description: `Creating pool: ${params.name}`,
      maxRetries: 3,
      timeout: 300000,
      steps: [
        { id: 'verify', title: 'Verify Eligibility', description: 'Checking pool requirements' },
        { id: 'deposit', title: 'Deposit Bond', description: 'Depositing creation bond' },
        { id: 'create', title: 'Create Pool', description: 'Creating pool on blockchain' }
      ]
    };
    
    const transactionId = transactionTracker.createTransaction(config);
    
    setTimeout(() => {
      demoTransactionHandler.createPool(params, transactionId);
    }, 100);
    
    return transactionId;
  },
  
  /**
   * Join a Co-EP pool
   */
  async joinPool(poolId: number, bondAmount: number): Promise<string> {
    const config: TransactionConfig = {
      type: 'pool-join' as TransactionType,
      title: 'Join Pool',
      description: `Joining pool #${poolId} with ${bondAmount.toLocaleString()} μSTX bond`,
      amount: bondAmount.toString(),
      maxRetries: 3,
      timeout: 180000
    };
    
    const transactionId = transactionTracker.createTransaction(config);
    
    setTimeout(() => {
      demoTransactionHandler.joinPool(poolId, bondAmount, transactionId);
    }, 100);
    
    return transactionId;
  }
};

/**
 * Hook for demo wallet connection
 */
export function useDemoWallet() {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [address, setAddress] = useState<string | null>(null);
  
  // Simulate auto-connection check
  useEffect(() => {
    const savedConnection = localStorage.getItem('demo-wallet-connected');
    if (savedConnection === 'true') {
      setIsConnected(true);
      setAddress('ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM'); // Demo address
    }
  }, []);
  
  const connect = async (): Promise<void> => {
    setIsConnecting(true);
    try {
      await demoTransactionHandler.connectWallet();
      setIsConnected(true);
      setAddress('ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM'); // Demo address
      localStorage.setItem('demo-wallet-connected', 'true');
    } catch (error) {
      console.error('Failed to connect wallet:', error);
      throw error;
    } finally {
      setIsConnecting(false);
    }
  };
  
  const disconnect = (): void => {
    setIsConnected(false);
    setAddress(null);
    localStorage.removeItem('demo-wallet-connected');
  };
  
  return {
    isConnected,
    isConnecting,
    address,
    connect,
    disconnect
  };
}

/**
 * Predefined transaction configurations for common operations
 */
export const TransactionTemplates = {
  campaignCreate: (title: string) => ({
    type: 'campaign-create' as TransactionType,
    title: 'Create Campaign',
    description: `Creating campaign: ${title}`,
    steps: [
      { id: 'validate', title: 'Validate Data', description: 'Validating campaign information' },
      { id: 'upload', title: 'Upload Media', description: 'Uploading campaign media files' },
      { id: 'deploy', title: 'Create Campaign', description: 'Creating campaign on blockchain' },
      { id: 'index', title: 'Index Campaign', description: 'Making campaign discoverable' }
    ]
  }),
  
  poolCreate: (name: string) => ({
    type: 'pool-create' as TransactionType,
    title: 'Create Pool',
    description: `Creating pool: ${name}`,
    steps: [
      { id: 'verify', title: 'Verify Eligibility', description: 'Checking pool requirements' },
      { id: 'deposit', title: 'Deposit Bond', description: 'Depositing creation bond' },
      { id: 'create', title: 'Create Pool', description: 'Creating pool on blockchain' }
    ]
  }),
  
  contribute: (amount: number, target: string) => ({
    type: 'campaign-contribute' as TransactionType,
    title: 'Contribute',
    description: `Contributing ${amount.toLocaleString()} μSTX to ${target}`,
    amount: amount.toString()
  }),
  
  poolJoin: (poolId: number, bondAmount: number) => ({
    type: 'pool-join' as TransactionType,
    title: 'Join Pool',
    description: `Joining pool #${poolId} with ${bondAmount.toLocaleString()} μSTX bond`,
    amount: bondAmount.toString()
  })
};