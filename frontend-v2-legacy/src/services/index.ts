// CineX Services - Main exports
// Centralized exports for all CineX platform services
// Gated by VITE_USE_MOCK_DATA — when 'false', API-backed services are used.

import { CampaignService, createCampaignService } from './campaignService';
import { FundingPoolService, createFundingPoolService } from './fundingPoolService';
import { EscrowService, createEscrowService } from './escrowService';
import { VerificationService, createVerificationService } from './verificationService';
import { EmergencyService, createEmergencyService } from './emergencyService';
import { ReputationService, createReputationService } from './reputationService';
import { ProfileService, createProfileService } from './profileService';
import { PoolService, createPoolService } from './poolService';
import { MilestoneService, createMilestoneService } from './milestoneService';
import { MilestoneVerificationService, createMilestoneVerificationService } from './milestoneVerificationService';
import { FeedService, createFeedService } from './feedService';
import { AiService, createAiService } from './aiService';
import { UserSettingsService, createUserSettingsService } from './userSettingsService';
import {
  ApiProfileService, ApiReputationService, ApiFeedService,
  ApiUserSettingsService, ApiAiService, ApiMilestoneService,
  ApiPoolService, ApiWalletService,
} from './apiServices';
import type { Campaign } from '../types';

export { CampaignService, createCampaignService };
export { FundingPoolService, createFundingPoolService };
export { EscrowService, createEscrowService };
export { VerificationService, createVerificationService };
export { EmergencyService, createEmergencyService };
export { ReputationService, createReputationService };
export { ProfileService, createProfileService };
export { PoolService, createPoolService };
export { MilestoneService, createMilestoneService };
export { MilestoneVerificationService, createMilestoneVerificationService };
export { FeedService, createFeedService };
export { AiService, createAiService };
export { UserSettingsService, createUserSettingsService };

export { ApiProfileService, ApiReputationService, ApiFeedService, ApiUserSettingsService, ApiAiService, ApiWalletService };

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

export { contractErrorToHuman, getContractPrefix } from '../utils/ContractErrorMap';
export { withTransactionRetry, isPermanentTxError, isTransientTxError } from '../utils/transactionRetry';

// Re-export common types for convenience
export type {
  ServiceResponse,
  Campaign,
  CampaignContribution,
  GovernancePool,
  GovernanceProposal,
  PoolMember,
  EscrowDeposit,
  EscrowRelease,
  VerificationApplication,
  VerifiedFilmmaker,
  PaginationParams,
  PaginatedResponse,
  Profile,
  Rating,
  FeedEvent,
  UserSettings,
  Milestone,
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
 * const campaigns = await services.campaign.getCampaigns();
 * const pools = await services.coep.getPools();
 * ```
 */
/**
 * createCineXServices
 * -------------------
 * Factory that instantiates every CineX service with a shared user session.
 *
 * When VITE_USE_MOCK_DATA=true (the default) the contract-calling services
 * still return mock data.  The new Day 1 services (reputation, profile, pool,
 * milestone, feed, ai, userSettings) are mock-only at this stage.
 *
 * @example
 *   const svc = createCineXServices(userSession);
 *   const feed = await svc.feed.getFeed();
 */
export function createCineXServices(userSession: any) {
  const useMock = import.meta.env.VITE_USE_MOCK_DATA !== 'false';

  if (!useMock) {
    return {
      campaign: createCampaignService(userSession),
      fundingPool: createFundingPoolService(userSession),
      escrow: createEscrowService(userSession),
      verification: createVerificationService(userSession),
      emergency: createEmergencyService(userSession),
      reputation:    new ApiReputationService(),
      profile:       new ApiProfileService(),
      pool:          new ApiPoolService(),
      milestone:     new ApiMilestoneService(),
      milestoneVerification: createMilestoneVerificationService(userSession),
      feed:          new ApiFeedService(),
      ai:            new ApiAiService(false),
      userSettings:  new ApiUserSettingsService(),
      wallet:        new ApiWalletService(),
    };
  }

  return {
    campaign: createCampaignService(userSession),
    fundingPool: createFundingPoolService(userSession),
    escrow: createEscrowService(userSession),
    verification: createVerificationService(userSession),
    emergency: createEmergencyService(userSession),
    reputation:    createReputationService(userSession),
    profile:       createProfileService(userSession),
    pool:          createPoolService(userSession),
    milestone:     createMilestoneService(userSession),
    milestoneVerification: createMilestoneVerificationService(userSession),
    feed:          createFeedService(userSession),
    ai:            createAiService(userSession),
    userSettings:  createUserSettingsService(userSession),
  };
}

/**
 * Service configuration constants
 */
export const ServiceConfig = {
  // API endpoints (when we integrate with real backend)
  API_BASE_URL: import.meta.env.VITE_API_URL || 'http://localhost:3003',
  STACKS_API_URL: import.meta.env.VITE_STACKS_API_URL || 'https://stacks-node-api.testnet.stacks.co',
  
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

  // Mock / demo settings
  /** Simulated network delay (ms) injected into mock service responses */
  MOCK_DELAY_MS: 300,

  /** Backend URL for the off-chain API */
  BACKEND_URL: import.meta.env.VITE_BACKEND_URL || 'http://localhost:3003',
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

  /**
   * Generate a mock feed event for testing
   */
  generateMockFeedEvent(): import('../../src/types').FeedEvent {
    return {
      id: `evt-${Date.now()}`,
      type: 'system',
      actor: this.generateMockAddress(),
      summary: 'Mock feed event for development.',
      createdAt: Date.now(),
    };
  },

  /**
   * Generate a mock rating for testing
   */
  generateMockRating(): import('../../src/types').Rating {
    return {
      id: `rating-${Date.now()}`,
      rater: this.generateMockAddress(),
      ratee: this.generateMockAddress(),
      score: Math.floor(Math.random() * 5) + 1,
      category: 'collaboration',
      createdAt: Date.now(),
    };
  },

  /**
   * Generate a mock profile for testing
   */
  generateMockProfile(): import('../../src/types').Profile {
    return {
      address: this.generateMockAddress(),
      displayName: 'Test User',
      bio: 'Test profile generated for development.',
      isOnboarded: false,
      joinedAt: Date.now(),
      socialLinks: {},
      reputationScore: 0,
      ratingCount: 0,
    };
  },
};