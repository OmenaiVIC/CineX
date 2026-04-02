// Emergency service for CineX platform
// Handles system pause/resume, emergency controls, and system status monitoring

import { 
  boolCV,
  fetchCallReadOnlyFunction,
  cvToValue,
} from '@stacks/transactions';
import { openContractCall } from '@stacks/connect';
import { 
  getNetwork, 
  getContractAddress, 
  getContractName,
} from '../utils/network';

import type { 
  ServiceResponse,
} from '../types';

// Interface for user session to avoid import issues
interface UserSession {
  isUserSignedIn(): boolean;
  loadUserData(): {
    profile: {
      stxAddress: {
        mainnet: string;
        testnet: string;
      };
    };
  };
}

// System status type
export interface SystemStatus {
  isPaused: boolean;
  lastChecked: number;
  module: string;
}

// Emergency operation log entry
export interface EmergencyOperation {
  opsCountId: number;
  emergencyOpsType: string;
  recipient: string;
  admin: string;
  blockHeight: number;
  reason: string;
  timestamp: number;
}

export class EmergencyService {
  private userSession: UserSession;

  constructor(userSession: UserSession) {
    this.userSession = userSession;
  }

  /**
   * Pause the system (admin only)
   * @param reason Reason for pausing the system
   * @returns Promise with pause result
   */
  async pauseSystem(reason: string): Promise<ServiceResponse<{ txId: string }>> {
    try {
      // Validate user is authenticated
      if (!this.userSession.isUserSignedIn()) {
        return {
          success: false,
          error: 'User must be signed in to pause system',
        };
      }

      // Check if system is already paused
      const statusResult = await this.getSystemStatus('crowdfunding');
      if (statusResult.success && statusResult.data?.isPaused) {
        return {
          success: false,
          error: 'System is already paused',
        };
      }

      // Call smart contract to pause system
      const network = getNetwork();
      const contractAddress = getContractAddress();
      const contractName = getContractName('crowdfunding');

      try {
        // Open Stacks wallet to sign transaction
        const txOptions = {
          contractAddress,
          contractName,
          functionName: 'pause-system',
          functionArgs: [],
          network,
          onFinish: (data: any) => {
            console.log('System pause transaction broadcast:', data.txId);
          },
          onCancel: () => {
            console.log('System pause cancelled');
          },
        };

        await openContractCall(txOptions);

        return {
          success: true,
          data: { txId: 'pending' },
          transactionId: 'pending',
        };
      } catch (txError) {
        console.error('System pause transaction error:', txError);
        return {
          success: false,
          error: 'System pause transaction failed or was cancelled',
        };
      }

    } catch (error) {
      console.error('Error pausing system:', error);
      return {
        success: false,
        error: 'Failed to pause system. Please try again.',
      };
    }
  }

  /**
   * Resume the system (admin only)
   * @returns Promise with resume result
   */
  async resumeSystem(): Promise<ServiceResponse<{ txId: string }>> {
    try {
      // Validate user is authenticated
      if (!this.userSession.isUserSignedIn()) {
        return {
          success: false,
          error: 'User must be signed in to resume system',
        };
      }

      // Check if system is paused
      const statusResult = await this.getSystemStatus('crowdfunding');
      if (statusResult.success && !statusResult.data?.isPaused) {
        return {
          success: false,
          error: 'System is not paused',
        };
      }

      // Call smart contract to resume system
      const network = getNetwork();
      const contractAddress = getContractAddress();
      const contractName = getContractName('crowdfunding');

      try {
        // Open Stacks wallet to sign transaction
        const txOptions = {
          contractAddress,
          contractName,
          functionName: 'resume-system',
          functionArgs: [],
          network,
          onFinish: (data: any) => {
            console.log('System resume transaction broadcast:', data.txId);
          },
          onCancel: () => {
            console.log('System resume cancelled');
          },
        };

        await openContractCall(txOptions);

        return {
          success: true,
          data: { txId: 'pending' },
          transactionId: 'pending',
        };
      } catch (txError) {
        console.error('System resume transaction error:', txError);
        return {
          success: false,
          error: 'System resume transaction failed or was cancelled',
        };
      }

    } catch (error) {
      console.error('Error resuming system:', error);
      return {
        success: false,
        error: 'Failed to resume system. Please try again.',
      };
    }
  }

  /**
   * Get system status (paused or active)
   * @param module Module to check status for ('crowdfunding', 'coep', 'escrow', 'verification')
   * @returns Promise with system status
   */
  async getSystemStatus(module: 'crowdfunding' | 'coep' | 'escrow' | 'verification'): Promise<ServiceResponse<SystemStatus>> {
    try {
      const network = getNetwork();
      const contractAddress = getContractAddress();
      const contractName = getContractName(module);
      
      // For read-only calls, we need a sender address
      const senderAddress = this.userSession.isUserSignedIn()
        ? this.userSession.loadUserData().profile.stxAddress.mainnet
        : contractAddress;

      try {
        // Call read-only function to check if system is paused
        const result = await fetchCallReadOnlyFunction({
          contractAddress,
          contractName,
          functionName: 'is-system-paused',
          functionArgs: [],
          senderAddress,
          network,
        });

        const isPaused = cvToValue(result) as boolean;

        return {
          success: true,
          data: {
            isPaused,
            lastChecked: Date.now(),
            module,
          },
        };
      } catch (readError) {
        console.error('Error reading system status:', readError);
        // Return assumed active state if read fails
        return {
          success: true,
          data: {
            isPaused: false,
            lastChecked: Date.now(),
            module,
          },
        };
      }

    } catch (error) {
      console.error('Error getting system status:', error);
      return {
        success: false,
        error: 'Failed to get system status. Please try again.',
      };
    }
  }

  /**
   * Get module version
   * @param module Module to check version for
   * @returns Promise with module version
   */
  async getModuleVersion(module: 'crowdfunding' | 'coep' | 'escrow' | 'verification'): Promise<ServiceResponse<number>> {
    try {
      const network = getNetwork();
      const contractAddress = getContractAddress();
      const contractName = getContractName(module);
      
      const senderAddress = this.userSession.isUserSignedIn()
        ? this.userSession.loadUserData().profile.stxAddress.mainnet
        : contractAddress;

      try {
        const result = await fetchCallReadOnlyFunction({
          contractAddress,
          contractName,
          functionName: 'get-module-version',
          functionArgs: [],
          senderAddress,
          network,
        });

        const version = cvToValue(result) as number;

        return {
          success: true,
          data: version,
        };
      } catch (readError) {
        console.error('Error reading module version:', readError);
        return {
          success: false,
          error: 'Failed to read module version',
        };
      }

    } catch (error) {
      console.error('Error getting module version:', error);
      return {
        success: false,
        error: 'Failed to get module version. Please try again.',
      };
    }
  }

  /**
   * Check if module is active
   * @param module Module to check
   * @returns Promise with module active status
   */
  async isModuleActive(module: 'crowdfunding' | 'coep' | 'escrow' | 'verification'): Promise<ServiceResponse<boolean>> {
    try {
      const network = getNetwork();
      const contractAddress = getContractAddress();
      const contractName = getContractName(module);
      
      const senderAddress = this.userSession.isUserSignedIn()
        ? this.userSession.loadUserData().profile.stxAddress.mainnet
        : contractAddress;

      try {
        const result = await fetchCallReadOnlyFunction({
          contractAddress,
          contractName,
          functionName: 'is-module-active',
          functionArgs: [],
          senderAddress,
          network,
        });

        const isActive = cvToValue(result) as boolean;

        return {
          success: true,
          data: isActive,
        };
      } catch (readError) {
        console.error('Error reading module active status:', readError);
        return {
          success: false,
          error: 'Failed to read module active status',
        };
      }

    } catch (error) {
      console.error('Error checking module active status:', error);
      return {
        success: false,
        error: 'Failed to check module active status. Please try again.',
      };
    }
  }

  /**
   * Get all system statuses for dashboard display
   * @returns Promise with all module statuses
   */
  async getAllSystemStatuses(): Promise<ServiceResponse<SystemStatus[]>> {
    try {
      const modules: Array<'crowdfunding' | 'coep' | 'escrow' | 'verification'> = [
        'crowdfunding',
        'coep',
        'escrow',
        'verification',
      ];

      const statusPromises = modules.map(module => this.getSystemStatus(module));
      const results = await Promise.all(statusPromises);

      const statuses: SystemStatus[] = [];
      for (const result of results) {
        if (result.success && result.data) {
          statuses.push(result.data);
        }
      }

      return {
        success: true,
        data: statuses,
      };

    } catch (error) {
      console.error('Error getting all system statuses:', error);
      return {
        success: false,
        error: 'Failed to get system statuses. Please try again.',
      };
    }
  }
}

// Export default instance factory
export const createEmergencyService = (userSession: UserSession) => {
  return new EmergencyService(userSession);
};
