// Crowdfunding service for CineX platform
// Handles campaign creation, contributions, and campaign management

import { 
  uintCV,
  stringAsciiCV,
  principalCV,
  // fetchCallReadOnlyFunction,
  // cvToValue,
} from '@stacks/transactions';

console.log('VITE_CROWDFUNDING_CONTRACT_ADDRESS (crowdfundingService.ts):', import.meta.env.VITE_CROWDFUNDING_CONTRACT_ADDRESS);
import { transactionTracker } from '../lib/transactionTracker';
import { openContractCall } from '@stacks/connect';
import { 
  getNetwork, 
  getContractAddress, 
  getContractName,
} from '../utils/network';

import type { 
  ServiceResponse, 
  Campaign, 
  CampaignContribution,
  CreateCampaignParams,
  ContributeToCampaignParams,
  CampaignFilters,
  PaginationParams,
  PaginatedResponse
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

export class CrowdfundingService {
  private userSession: UserSession;

  constructor(userSession: UserSession) {
    this.userSession = userSession;
  }

  /**
   * Create a new crowdfunding campaign
   * @param params Campaign creation parameters
   * @returns Promise with campaign creation result
   */
  async createCampaign(params: CreateCampaignParams): Promise<ServiceResponse<Campaign>> {
    console.log('createCampaign: VITE_CROWDFUNDING_CONTRACT_ADDRESS:', import.meta.env.VITE_CROWDFUNDING_CONTRACT_ADDRESS);
    try {
      // Validate user is authenticated
      if (!this.userSession.isUserSignedIn()) {
        console.error('[crowdfundingService] Not signed in');
        return {
          success: false,
          error: 'User must be signed in to create campaigns',
        };
      }

      // Validate parameters
      const validation = this.validateCampaignParams(params);
      if (!validation.isValid) {
        console.error('[crowdfundingService] Validation failed:', validation.error);
        return {
          success: false,
          error: validation.error,
        };
      }

      // Prepare contract call
      const network = getNetwork();
      const contractAddress = getContractAddress('crowdfunding');
      const contractName = getContractName('crowdfunding');
      console.log('createCampaign: contractAddress:', contractAddress);
      console.log('createCampaign: contractName:', contractName);
      const verificationAddress = getContractAddress('verification');
      const verificationName = getContractName('verification');

      // Calculate duration in blocks (user input in days, 10 min per block)
      const durationBlocks = params.duration ? Math.floor((params.duration * 24 * 60) / 10) : 0;
      // Generate campaign ID (will be incremented on-chain)
      const nextCampaignId = Date.now();

      // Return a promise that resolves with the txId from onFinish
      return await new Promise<ServiceResponse<Campaign>>(async (resolve) => {
        let txId: string | undefined = undefined;
        const txOptions = {
          contractAddress,
          contractName,
          functionName: 'create-campaign',
          functionArgs: [
            stringAsciiCV(params.description.slice(0, 500)), // Max 500 chars
            uintCV(nextCampaignId),
            uintCV(parseInt(params.targetAmount)), // Funding goal in microSTX
            uintCV(durationBlocks), // Duration in blocks
            uintCV(params.rewardTiers ?? 3),
            stringAsciiCV((params.rewardDescription ?? 'Standard rewards for backers').slice(0, 150)), // Max 150 chars
            principalCV(`${verificationAddress}.${verificationName}`), // Verification contract trait
          ],
          network,
          onFinish: (data: any) => {
            txId = data.txId;
            console.log('[crowdfundingService] onFinish called, txId:', txId);
            const newCampaign: Campaign = {
              id: nextCampaignId.toString(),
              title: params.title,
              description: params.description,
              creator: this.userSession.loadUserData().profile.stxAddress.mainnet,
              targetAmount: params.targetAmount,
              currentAmount: '0',
              deadline: params.deadline,
              category: params.category,
              status: 'active',
              createdAt: Date.now(),
              updatedAt: Date.now(),
              mediaUrls: params.mediaUrls || [],
              tags: params.tags || [],
            };
            console.log('[crowdfundingService] Resolving promise with txId:', txId);
            resolve({
              success: true,
              data: newCampaign,
              transactionId: txId,
            });
          },
          onCancel: () => {
            console.warn('[crowdfundingService] Transaction cancelled by user');
            resolve({
              success: false,
              error: 'Transaction cancelled by user',
            });
          },
        };
        console.log('[crowdfundingService] Calling openContractCall with options:', txOptions);
        await openContractCall(txOptions);
        console.log('[crowdfundingService] openContractCall finished');
      });
    } catch (error) {
      console.error('[crowdfundingService] Error creating campaign:', error);
      return {
        success: false,
        error: 'Failed to create campaign. Please try again.',
      };
    }
  }

  /**
   * Contribute STX to a campaign
   * @param params Contribution parameters
   * @returns Promise with contribution result
   */
  async contributeToCampaign(params: ContributeToCampaignParams): Promise<ServiceResponse<CampaignContribution>> {
    try {
      // Validate user is authenticated
      if (!this.userSession.isUserSignedIn()) {
        return {
          success: false,
          error: 'User must be signed in to contribute to campaigns',
        };
      }

      // Validate contribution amount
      const amount = parseInt(params.amount);
      if (isNaN(amount) || amount <= 0) {
        return {
          success: false,
          error: 'Contribution amount must be a positive number',
        };
      }

      // Call smart contract to contribute to campaign
      const network = getNetwork();
      const contractAddress = getContractAddress('crowdfunding');
      const contractName = getContractName('crowdfunding');
      const escrowAddress = getContractAddress('escrow');
      const escrowName = getContractName('escrow');
      const userAddress = this.userSession.loadUserData().profile.stxAddress.mainnet;

      // Return a promise that resolves with the txId from onFinish
      return await new Promise<ServiceResponse<CampaignContribution>>(async (resolve) => {
        let txId: string | undefined = undefined;
        const txOptions = {
          contractAddress,
          contractName,
          functionName: 'contribute-to-campaign',
          functionArgs: [
            uintCV(parseInt(params.campaignId)),
            uintCV(amount), // Amount in microSTX
            principalCV(`${escrowAddress}.${escrowName}`), // Escrow contract trait
          ],
          network,
          onFinish: (data: any) => {
            txId = data.txId;
            console.log('[crowdfundingService] Contribution onFinish, txId:', txId);
            const contribution: CampaignContribution = {
              campaignId: params.campaignId,
              contributor: userAddress,
              amount: params.amount,
              timestamp: Date.now(),
              txId: txId ?? '',
              message: params.message,
            };
            resolve({
              success: true,
              data: contribution,
              transactionId: txId,
            });
          },
          onCancel: () => {
            console.warn('[crowdfundingService] Contribution cancelled by user');
            resolve({
              success: false,
              error: 'Contribution transaction cancelled by user',
            });
          },
        };
        console.log('[crowdfundingService] Calling openContractCall for contribution:', txOptions);
        await openContractCall(txOptions);
        console.log('[crowdfundingService] openContractCall finished for contribution');
      });
    } catch (error) {
      console.error('[crowdfundingService] Error contributing to campaign:', error);
      return {
        success: false,
        error: 'Failed to contribute to campaign. Please try again.',
      };
    }
  }

  /**
   * Get list of campaigns with optional filtering and pagination
   * @param filters Optional filters for campaigns
   * @param pagination Optional pagination parameters
   * @returns Promise with paginated campaigns list
   */
  async getCampaigns(
    filters?: CampaignFilters,
    pagination?: PaginationParams
  ): Promise<ServiceResponse<PaginatedResponse<Campaign>>> {
    try {
      // TODO: Replace with actual API call to get campaigns from blockchain
      // For now, return mock data
      const mockCampaigns: Campaign[] = [
        {
          id: 'campaign-1',
          title: 'Independent Short Film: The Last Frame',
          description: 'A heartwarming story about a photographer discovering the magic of film photography in the digital age.',
          creator: 'SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7',
          targetAmount: '50000000000', // 50,000 STX in microSTX
          currentAmount: '25000000000', // 25,000 STX
          deadline: Date.now() + (30 * 24 * 60 * 60 * 1000), // 30 days from now
          category: 'short-film',
          status: 'active',
          createdAt: Date.now() - (7 * 24 * 60 * 60 * 1000), // 7 days ago
          updatedAt: Date.now() - (1 * 24 * 60 * 60 * 1000), // 1 day ago
          mediaUrls: ['https://example.com/trailer1.mp4'],
          tags: ['drama', 'independent', 'photography'],
        },
        {
          id: 'campaign-2',
          title: 'Documentary: Climate Change in Africa',
          description: 'An eye-opening documentary exploring the effects of climate change on African communities.',
          creator: 'SP3F1JDPZ9S85FPBG712QY96TC4FJC1XHPFJFCK1R',
          targetAmount: '100000000000', // 100,000 STX
          currentAmount: '75000000000', // 75,000 STX
          deadline: Date.now() + (45 * 24 * 60 * 60 * 1000), // 45 days from now
          category: 'documentary',
          status: 'active',
          createdAt: Date.now() - (14 * 24 * 60 * 60 * 1000), // 14 days ago
          updatedAt: Date.now() - (2 * 24 * 60 * 60 * 1000), // 2 days ago
          mediaUrls: ['https://example.com/documentary-trailer.mp4'],
          tags: ['documentary', 'climate', 'africa', 'environmental'],
        },
      ];

      // Apply filters if provided
      let filteredCampaigns = mockCampaigns;
      if (filters) {
        filteredCampaigns = this.applyCampaignFilters(mockCampaigns, filters);
      }

      // Apply pagination
      const paginationParams = pagination || { page: 1, limit: 10 };
      const paginatedResult = this.paginateResults(filteredCampaigns, paginationParams);

      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 500));

      return {
        success: true,
        data: paginatedResult,
      };

    } catch (error) {
      console.error('Error getting campaigns:', error);
      return {
        success: false,
        error: 'Failed to load campaigns. Please try again.',
      };
    }
  }

  /**
   * Get detailed information about a specific campaign
   * @param campaignId Campaign ID to get details for
   * @returns Promise with campaign details
   */
  async getCampaignDetails(campaignId: string): Promise<ServiceResponse<Campaign>> {
    try {
      if (!campaignId) {
        return {
          success: false,
          error: 'Campaign ID is required',
        };
      }

      // TODO: Replace with actual smart contract call
      // For now, return mock campaign details
      const mockCampaign: Campaign = {
        id: campaignId,
        title: 'Independent Short Film: The Last Frame',
        description: 'A heartwarming story about a photographer discovering the magic of film photography in the digital age. This project explores themes of nostalgia, technology, and human connection through the lens of analog photography.',
        creator: 'SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7',
        targetAmount: '50000000000', // 50,000 STX
        currentAmount: '25000000000', // 25,000 STX
        deadline: Date.now() + (30 * 24 * 60 * 60 * 1000), // 30 days from now
        category: 'short-film',
        status: 'active',
        createdAt: Date.now() - (7 * 24 * 60 * 60 * 1000), // 7 days ago
        updatedAt: Date.now() - (1 * 24 * 60 * 60 * 1000), // 1 day ago
        mediaUrls: [
          'https://example.com/trailer1.mp4',
          'https://example.com/behind-scenes.jpg',
          'https://example.com/concept-art.png'
        ],
        tags: ['drama', 'independent', 'photography', 'analog'],
      };

      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 300));

      return {
        success: true,
        data: mockCampaign,
      };

    } catch (error) {
      console.error('Error getting campaign details:', error);
      return {
        success: false,
        error: 'Failed to load campaign details. Please try again.',
      };
    }
  }

  /**
   * Get contributions for a specific campaign
   * @param campaignId Campaign ID to get contributions for
   * @param pagination Optional pagination parameters
   * @returns Promise with paginated contributions list
   */
  async getCampaignContributions(
    campaignId: string,
    pagination?: PaginationParams
  ): Promise<ServiceResponse<PaginatedResponse<CampaignContribution>>> {
    try {
      if (!campaignId) {
        return {
          success: false,
          error: 'Campaign ID is required',
        };
      }

      // TODO: Replace with actual API call
      // For now, return mock contributions
      const mockContributions: CampaignContribution[] = [
        {
          campaignId,
          contributor: 'SP1H1733V5MZ3SZ9XRW9FKYAH3W17PQATB3RFGAVY',
          amount: '5000000000', // 5,000 STX
          timestamp: Date.now() - (2 * 24 * 60 * 60 * 1000), // 2 days ago
          txId: 'tx-contribution-1',
          message: 'Excited to support this project!'
        },
        {
          campaignId,
          contributor: 'SP2C2YFP12AJZB4MABJBAJ55XECVS7E4PMMZ89YZR',
          amount: '10000000000', // 10,000 STX
          timestamp: Date.now() - (3 * 24 * 60 * 60 * 1000), // 3 days ago
          txId: 'tx-contribution-2',
          message: 'Great concept, keep up the good work!'
        },
      ];

      const paginationParams = pagination || { page: 1, limit: 10 };
      const paginatedResult = this.paginateResults(mockContributions, paginationParams);

      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 400));

      return {
        success: true,
        data: paginatedResult,
      };

    } catch (error) {
      console.error('Error getting campaign contributions:', error);
      return {
        success: false,
        error: 'Failed to load campaign contributions. Please try again.',
      };
    }
  }

  // Private helper methods

  private validateCampaignParams(params: CreateCampaignParams): { isValid: boolean; error?: string } {
    if (!params.title || params.title.trim().length < 3) {
      return { isValid: false, error: 'Campaign title must be at least 3 characters long' };
    }

    if (!params.description || params.description.trim().length < 10) {
      return { isValid: false, error: 'Campaign description must be at least 10 characters long' };
    }

    const targetAmount = parseInt(params.targetAmount);
    if (isNaN(targetAmount) || targetAmount <= 0) {
      return { isValid: false, error: 'Target amount must be a positive number' };
    }

    if (params.deadline <= Date.now()) {
      return { isValid: false, error: 'Campaign deadline must be in the future' };
    }

    const validCategories: Campaign['category'][] = ['short-film', 'feature', 'documentary', 'music-video', 'web-series'];
    if (!validCategories.includes(params.category)) {
      return { isValid: false, error: 'Invalid campaign category' };
    }

    return { isValid: true };
  }

  private applyCampaignFilters(campaigns: Campaign[], filters: CampaignFilters): Campaign[] {
    return campaigns.filter(campaign => {
      if (filters.category && campaign.category !== filters.category) {
        return false;
      }

      if (filters.status && campaign.status !== filters.status) {
        return false;
      }

      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const titleMatch = campaign.title.toLowerCase().includes(searchLower);
        const descriptionMatch = campaign.description.toLowerCase().includes(searchLower);
        const tagsMatch = campaign.tags?.some(tag => tag.toLowerCase().includes(searchLower));
        
        if (!titleMatch && !descriptionMatch && !tagsMatch) {
          return false;
        }
      }

      if (filters.minAmount) {
        const minAmount = parseInt(filters.minAmount);
        if (parseInt(campaign.targetAmount) < minAmount) {
          return false;
        }
      }

      if (filters.maxAmount) {
        const maxAmount = parseInt(filters.maxAmount);
        if (parseInt(campaign.targetAmount) > maxAmount) {
          return false;
        }
      }

      return true;
    });
  }

  private paginateResults<T>(items: T[], params: PaginationParams): PaginatedResponse<T> {
    const { page, limit } = params;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedItems = items.slice(startIndex, endIndex);

    return {
      items: paginatedItems,
      totalItems: items.length,
      totalPages: Math.ceil(items.length / limit),
      currentPage: page,
      hasNext: endIndex < items.length,
      hasPrevious: page > 1,
    };
  }
}

// Export default instance factory
export const createCrowdfundingService = (userSession: UserSession) => {
  return new CrowdfundingService(userSession);
};