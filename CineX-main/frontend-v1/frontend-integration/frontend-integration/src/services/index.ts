// CineX Services - Main exports
// Centralized exports for all CineX platform services

import { CrowdfundingService, createCrowdfundingService } from './crowdfundingService';
import { CoEPService, createCoEPService } from './coepService';
import { EscrowService, createEscrowService } from './escrowService';
import { VerificationService, createVerificationService } from './verificationService';
import { EmergencyService, createEmergencyService } from './emergencyService';
import type { Campaign } from '../types';

export { CrowdfundingService, createCrowdfundingService };
export { CoEPService, createCoEPService };
export { EscrowService, createEscrowService };
export { VerificationService, createVerificationService };
export { EmergencyService, createEmergencyService };

export {
  CineXServiceError,
  ErrorCodes,
  ErrorMessages,
  ValidationUtils,
  ServiceValidators,
  TransactionUtils,
  RateLimiter,
  defaultRateLimiter,
  createErrorResponse,
  handleServiceOperation,
  retryOperation,
} from './errorHandler';

// Re-export common types for convenience
export type {
  ServiceResponse,
  Campaign,
  CampaignContribution,
  CoEPPool,
  PoolMember,
  EscrowDeposit,
  EscrowRelease,
  VerificationApplication,
  VerifiedFilmmaker,
  PaginationParams,
  PaginatedResponse,
} from '../types';

/**
 * Service factory for creating all CineX services with a shared user session
 * 
 * @example
 * ```typescript
 * import { createCineXServices } from './services';
 * import { UserSession } from '@stacks/connect';
 * 
 * const userSession = new UserSession();
 * const services = createCineXServices(userSession);
 * 
 * // Use services
 * const campaigns = await services.crowdfunding.getCampaigns();
 * const pools = await services.coep.getPools();
 * ```
 */
export function createCineXServices(userSession: any) {
  return {
    crowdfunding: createCrowdfundingService(userSession),
    coep: createCoEPService(userSession),
    escrow: createEscrowService(userSession),
    verification: createVerificationService(userSession),
    emergency: createEmergencyService(userSession),
  };
}

/**
 * Service configuration constants
 */
export const ServiceConfig = {
  // API endpoints (when we integrate with real backend)
  API_BASE_URL: process.env.REACT_APP_API_URL || 'http://localhost:3001',
  STACKS_API_URL: process.env.REACT_APP_STACKS_API_URL || 'https://stacks-node-api.testnet.stacks.co',
  
  // Default pagination limits
  DEFAULT_PAGE_SIZE: 10,
  MAX_PAGE_SIZE: 100,
  
  // Minimum amounts (in microSTX)
  MIN_CAMPAIGN_TARGET: '10000000000', // 10,000 STX
  MIN_CONTRIBUTION: '100000', // 0.1 STX
  MIN_VERIFICATION_BOND: '1000000000', // 1,000 STX
  MIN_POOL_CONTRIBUTION: '1000000000', // 1,000 STX
  
  // Time constants
  MIN_CAMPAIGN_DURATION: 7 * 24 * 60 * 60 * 1000, // 7 days
  MAX_CAMPAIGN_DURATION: 365 * 24 * 60 * 60 * 1000, // 1 year
  
  // Pool constants
  MAX_POOL_MEMBERS: 12,
  DEFAULT_POOL_DURATION: 12, // months
  
  // Network settings
  REQUEST_TIMEOUT: 30000, // 30 seconds
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000, // 1 second
} as const;

/**
 * Development and testing utilities
 */
export const DevUtils = {
  /**
   * Generate mock STX address for testing
   */
  generateMockAddress(): string {
    const chars = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
    let result = 'SP';
    for (let i = 0; i < 38; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  },

  /**
   * Generate mock transaction ID
   */
  generateMockTxId(): string {
    return '0x' + Array.from(crypto.getRandomValues(new Uint8Array(32)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  },

  /**
   * Format microSTX to STX for display
   */
  formatSTX(microSTX: string): string {
    const amount = parseInt(microSTX) / 1000000;
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 6,
    }).format(amount);
  },

  /**
   * Format STX to microSTX for transactions
   */
  toMicroSTX(stx: number): string {
    return Math.floor(stx * 1000000).toString();
  },

  /**
   * Generate mock campaign data for testing
   */
  generateMockCampaign(): Campaign {
    return {
      id: `campaign-${Date.now()}`,
      title: 'Test Campaign',
      description: 'This is a test campaign for development purposes.',
      creator: this.generateMockAddress(),
      targetAmount: '50000000000', // 50,000 STX
      currentAmount: '10000000000', // 10,000 STX
      deadline: Date.now() + (30 * 24 * 60 * 60 * 1000), // 30 days from now
      category: 'short-film',
      status: 'active',
      createdAt: Date.now() - (7 * 24 * 60 * 60 * 1000), // 7 days ago
      updatedAt: Date.now(),
      tags: ['test', 'development'],
      mediaUrls: [],
    };
  },
};