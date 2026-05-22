import {
  uintCV,
  stringAsciiCV,
  principalCV,
  fetchCallReadOnlyFunction,
  cvToValue,
} from '@stacks/transactions';
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
  PaginatedResponse,
} from '../types';

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

const METADATA_PREFIX = 'cinex_campaign_';
const META_KEY = (id: string) => `${METADATA_PREFIX}${id}`;
const BACKED_PREFIX = 'cinex_backed_';
const BACKED_KEY = (id: string) => `${BACKED_PREFIX}${id}`;

function saveCampaignMetadata(id: string, meta: Partial<Campaign>) {
  try {
    const existing = JSON.parse(localStorage.getItem(META_KEY(id)) || '{}');
    localStorage.setItem(META_KEY(id), JSON.stringify({ ...existing, ...meta }));
  } catch {}
}

function loadCampaignMetadata(id: string): Partial<Campaign> | null {
  try {
    const raw = localStorage.getItem(META_KEY(id));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function getAllCampaignIds(): string[] {
  const ids: string[] = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(METADATA_PREFIX)) {
        ids.push(key.slice(METADATA_PREFIX.length));
      }
    }
  } catch {}
  return ids;
}

export class CampaignService {
  private userSession: UserSession;

  constructor(userSession: UserSession) {
    this.userSession = userSession;
  }

  async createCampaign(params: CreateCampaignParams): Promise<ServiceResponse<Campaign>> {
    try {
      if (!this.userSession.isUserSignedIn()) {
        return { success: false, error: 'User must be signed in to create campaigns' };
      }
      const validation = this.validateCampaignParams(params);
      if (!validation.isValid) {
        return { success: false, error: validation.error };
      }

      const network = getNetwork();
      const contractAddress = getContractAddress('campaign');
      const contractName = getContractName('campaign');
      const verificationAddress = getContractAddress('verification');
      const verificationName = getContractName('verification');

      const durationBlocks = params.duration ? Math.floor((params.duration * 24 * 60) / 10) : 0;
      const nextCampaignId = Date.now();

      return await new Promise<ServiceResponse<Campaign>>(async (resolve) => {
        let txId: string | undefined;
        const txOptions = {
          contractAddress,
          contractName,
          functionName: 'create-campaign',
          functionArgs: [
            stringAsciiCV(params.description.slice(0, 500)),
            uintCV(nextCampaignId),
            uintCV(parseInt(params.targetAmount)),
            uintCV(durationBlocks),
            uintCV(params.rewardTiers ?? 3),
            stringAsciiCV((params.rewardDescription ?? 'Standard rewards for backers').slice(0, 150)),
            principalCV(`${verificationAddress}.${verificationName}`),
          ],
          network,
          onFinish: async (data: any) => {
            txId = data.txId;
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
            saveCampaignMetadata(nextCampaignId.toString(), {
              title: params.title,
              category: params.category,
              mediaUrls: params.mediaUrls || [],
              tags: params.tags || [],
            });
            resolve({ success: true, data: newCampaign, transactionId: txId });
          },
          onCancel: () => {
            resolve({ success: false, error: 'Transaction cancelled by user' });
          },
        };
        await openContractCall(txOptions);
      });
    } catch (error) {
      return { success: false, error: 'Failed to create campaign. Please try again.' };
    }
  }

  async contributeToCampaign(params: ContributeToCampaignParams): Promise<ServiceResponse<CampaignContribution>> {
    try {
      if (!this.userSession.isUserSignedIn()) {
        return { success: false, error: 'User must be signed in to contribute to campaigns' };
      }
      const amount = parseInt(params.amount);
      if (isNaN(amount) || amount <= 0) {
        return { success: false, error: 'Contribution amount must be a positive number' };
      }

      const network = getNetwork();
      const contractAddress = getContractAddress('campaign');
      const contractName = getContractName('campaign');
      const escrowAddress = getContractAddress('escrow');
      const escrowName = getContractName('escrow');
      const verificationAddress = getContractAddress('verification');
      const verificationName = getContractName('verification');

      return await new Promise<ServiceResponse<CampaignContribution>>(async (resolve) => {
        let txId: string | undefined;
        const txOptions = {
          contractAddress,
          contractName,
          functionName: 'contribute-to-campaign',
          functionArgs: [
            uintCV(parseInt(params.campaignId)),
            uintCV(amount),
            principalCV(`${escrowAddress}.${escrowName}`),
            principalCV(`${verificationAddress}.${verificationName}`),
          ],
          network,
          onFinish: (data: any) => {
            txId = data.txId;
            try {
              const existing = JSON.parse(localStorage.getItem(BACKED_KEY(params.campaignId)) || '{}');
              localStorage.setItem(BACKED_KEY(params.campaignId), JSON.stringify({
                ...existing,
                campaignId: params.campaignId,
                contributor: this.userSession.loadUserData().profile.stxAddress.mainnet,
                amount: params.amount,
                timestamp: Date.now(),
              }));
            } catch {}
            const contribution: CampaignContribution = {
              campaignId: params.campaignId,
              contributor: this.userSession.loadUserData().profile.stxAddress.mainnet,
              amount: params.amount,
              timestamp: Date.now(),
              txId: txId ?? '',
              message: params.message,
            };
            resolve({ success: true, data: contribution, transactionId: txId });
          },
          onCancel: () => {
            resolve({ success: false, error: 'Contribution transaction cancelled by user' });
          },
        };
        await openContractCall(txOptions);
      });
    } catch (error) {
      return { success: false, error: 'Failed to contribute to campaign. Please try again.' };
    }
  }

  async getCampaigns(
    filters?: CampaignFilters,
    pagination?: PaginationParams
  ): Promise<ServiceResponse<PaginatedResponse<Campaign>>> {
    try {
      const paginationParams = pagination || { page: 1, limit: 10 };
      const ids = getAllCampaignIds();
      const campaigns: Campaign[] = [];

      for (const id of ids) {
        const result = await this.getCampaignDetails(id);
        if (result.success && result.data) {
          campaigns.push(result.data);
        }
      }

      let filtered = campaigns;
      if (filters) {
        filtered = this.applyCampaignFilters(filtered, filters);
      }

      const paginatedResult = this.paginateResults(filtered, paginationParams);
      return { success: true, data: paginatedResult };
    } catch (error) {
      return { success: false, error: 'Failed to load campaigns. Please try again.' };
    }
  }

  async getCampaignDetails(campaignId: string): Promise<ServiceResponse<Campaign>> {
    try {
      if (!campaignId) {
        return { success: false, error: 'Campaign ID is required' };
      }

      const contractAddress = getContractAddress('campaign');
      const contractName = getContractName('campaign');
      const network = getNetwork();
      const senderAddress = this.userSession.isUserSignedIn()
        ? this.userSession.loadUserData().profile.stxAddress.testnet
        : contractAddress;

      let onChainData: Record<string, any> = {};
      try {
        const resultCV = await fetchCallReadOnlyFunction({
          contractAddress,
          contractName,
          functionName: 'get-campaign',
          functionArgs: [uintCV(parseInt(campaignId))],
          network,
          senderAddress,
        });
        const parsed = cvToValue(resultCV, true);
        if (parsed && typeof parsed === 'object') {
          onChainData = parsed;
        }
      } catch (e) {
        console.warn('[campaignService] get-campaign read failed, using metadata:', e);
      }

      const meta = loadCampaignMetadata(campaignId);

      const campaign: Campaign = {
        id: campaignId,
        title: meta?.title || `Campaign #${campaignId}`,
        description: onChainData.description || meta?.description || '',
        creator: onChainData.owner || meta?.creator || '',
        targetAmount: (onChainData.fundingGoal ?? '').toString() || meta?.targetAmount || '0',
        currentAmount: (onChainData.totalRaised ?? '').toString() || meta?.currentAmount || '0',
        deadline: onChainData.expiresAt
          ? (typeof onChainData.expiresAt === 'number' ? onChainData.expiresAt : parseInt(onChainData.expiresAt.toString())) * 600000
          : meta?.deadline || (Date.now() + 30 * 86400000),
        category: meta?.category || 'short-film',
        status: onChainData.isActive === false ? 'completed' : (meta?.status || 'active'),
        createdAt: onChainData.createdAt
          ? (typeof onChainData.createdAt === 'number' ? onChainData.createdAt : parseInt(onChainData.createdAt.toString())) * 600000
          : meta?.createdAt || Date.now(),
        updatedAt: meta?.updatedAt || Date.now(),
        mediaUrls: meta?.mediaUrls || [],
        tags: meta?.tags || [],
      };

      return { success: true, data: campaign };
    } catch (error) {
      console.error('Error getting campaign details:', error);
      return { success: false, error: 'Failed to load campaign details. Please try again.' };
    }
  }

  async getCampaignContributions(
    campaignId: string,
    pagination?: PaginationParams
  ): Promise<ServiceResponse<PaginatedResponse<CampaignContribution>>> {
    try {
      if (!campaignId) {
        return { success: false, error: 'Campaign ID is required' };
      }

      const paginationParams = pagination || { page: 1, limit: 10 };

      const contractAddress = getContractAddress('campaign');
      const contractName = getContractName('campaign');
      const network = getNetwork();
      const senderAddress = this.userSession.isUserSignedIn()
        ? this.userSession.loadUserData().profile.stxAddress.testnet
        : contractAddress;

      const contributions: CampaignContribution[] = [];

      const userAddress = this.userSession.isUserSignedIn()
        ? this.userSession.loadUserData().profile.stxAddress.mainnet
        : null;

      if (userAddress) {
        try {
          const resultCV = await fetchCallReadOnlyFunction({
            contractAddress,
            contractName,
            functionName: 'get-campaign-contributions',
            functionArgs: [uintCV(parseInt(campaignId)), principalCV(userAddress)],
            network,
            senderAddress,
          });
          const parsed = cvToValue(resultCV, true);
          if (parsed && parsed.totalContributed) {
            contributions.push({
              campaignId,
              contributor: userAddress,
              amount: parsed.totalContributed.toString(),
              timestamp: parsed.lastContributionAt
                ? (typeof parsed.lastContributionAt === 'number' ? parsed.lastContributionAt : parseInt(parsed.lastContributionAt.toString())) * 600000
                : Date.now(),
              txId: '',
              message: '',
            });
          }
        } catch {}
      }

      const paginatedResult = this.paginateResults(contributions, paginationParams);
      return { success: true, data: paginatedResult };
    } catch (error) {
      console.error('Error getting campaign contributions:', error);
      return { success: false, error: 'Failed to load campaign contributions. Please try again.' };
    }
  }

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
      if (filters.category && campaign.category !== filters.category) return false;
      if (filters.status && campaign.status !== filters.status) return false;
      if (filters.search) {
        const q = filters.search.toLowerCase();
        const titleMatch = campaign.title.toLowerCase().includes(q);
        const descMatch = campaign.description.toLowerCase().includes(q);
        const tagsMatch = campaign.tags?.some(t => t.toLowerCase().includes(q));
        if (!titleMatch && !descMatch && !tagsMatch) return false;
      }
      if (filters.minAmount && parseInt(campaign.targetAmount) < parseInt(filters.minAmount)) return false;
      if (filters.maxAmount && parseInt(campaign.targetAmount) > parseInt(filters.maxAmount)) return false;
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

export const createCampaignService = (userSession: UserSession) => {
  return new CampaignService(userSession);
};
