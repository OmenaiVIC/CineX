import {
  uintCV,
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
  EscrowDeposit,
  EscrowRelease,
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

interface DepositToEscrowParams {
  amount: string;
  purpose: 'campaign' | 'pool-contribution' | 'verification-bond';
  relatedId: string;
  releaseConditions?: string[];
}

interface WithdrawFromEscrowParams {
  escrowId: string;
  recipient?: string;
  amount?: string;
  reason: string;
}

export class EscrowService {
  private userSession: UserSession;

  constructor(userSession: UserSession) {
    this.userSession = userSession;
  }

  async depositToEscrow(params: DepositToEscrowParams): Promise<ServiceResponse<EscrowDeposit>> {
    try {
      if (!this.userSession.isUserSignedIn()) {
        return { success: false, error: 'User must be signed in to deposit to escrow' };
      }
      const validation = this.validateDepositParams(params);
      if (!validation.isValid) {
        return { success: false, error: validation.error };
      }

      const network = getNetwork();
      const contractAddress = getContractAddress('escrow');
      const contractName = getContractName('escrow');

      try {
        const txOptions = {
          contractAddress,
          contractName,
          functionName: 'deposit-to-campaign',
          functionArgs: [
            uintCV(parseInt(params.relatedId)),
            uintCV(parseInt(params.amount)),
          ],
          network,
          onFinish: (data: any) => {
            console.log('Escrow deposit transaction broadcast:', data.txId);
          },
          onCancel: () => {
            console.log('Escrow deposit cancelled');
          },
        };

        await openContractCall(txOptions);

        const deposit: EscrowDeposit = {
          id: `escrow-${Date.now()}`,
          depositor: this.userSession.loadUserData().profile.stxAddress.mainnet,
          amount: params.amount,
          purpose: params.purpose,
          relatedId: params.relatedId,
          status: 'locked',
          createdAt: Date.now(),
          releaseConditions: params.releaseConditions || [],
        };

        return { success: true, data: deposit, transactionId: 'pending' };
      } catch (txError) {
        console.error('Escrow deposit transaction error:', txError);
        return { success: false, error: 'Escrow deposit transaction failed or was cancelled' };
      }
    } catch (error) {
      console.error('Error depositing to escrow:', error);
      return { success: false, error: 'Failed to deposit to escrow. Please try again.' };
    }
  }

  async withdrawFromCampaign(campaignId: string): Promise<ServiceResponse<{ txId?: string }>> {
    try {
      if (!this.userSession.isUserSignedIn()) {
        return { success: false, error: 'User must be signed in' };
      }
      const network = getNetwork();
      const contractAddress = getContractAddress('escrow');
      const contractName = getContractName('escrow');

      return await new Promise<ServiceResponse<{ txId?: string }>>(async (resolve) => {
        let txId: string | undefined;
        const txOptions = {
          contractAddress,
          contractName,
          functionName: 'withdraw-from-campaign',
          functionArgs: [uintCV(parseInt(campaignId))],
          network,
          onFinish: (data: any) => {
            txId = data.txId;
            resolve({ success: true, data: { txId } });
          },
          onCancel: () => {
            resolve({ success: false, error: 'Transaction cancelled by user' });
          },
        };
        await openContractCall(txOptions);
      });
    } catch (error) {
      console.error('Error withdrawing from escrow campaign:', error);
      return { success: false, error: 'Failed to withdraw from campaign escrow.' };
    }
  }

  async collectCampaignFee(campaignId: string): Promise<ServiceResponse<{ txId?: string }>> {
    try {
      if (!this.userSession.isUserSignedIn()) {
        return { success: false, error: 'User must be signed in' };
      }
      const network = getNetwork();
      const contractAddress = getContractAddress('escrow');
      const contractName = getContractName('escrow');

      return await new Promise<ServiceResponse<{ txId?: string }>>(async (resolve) => {
        let txId: string | undefined;
        const txOptions = {
          contractAddress,
          contractName,
          functionName: 'collect-campaign-fee',
          functionArgs: [uintCV(parseInt(campaignId))],
          network,
          onFinish: (data: any) => {
            txId = data.txId;
            resolve({ success: true, data: { txId } });
          },
          onCancel: () => {
            resolve({ success: false, error: 'Transaction cancelled by user' });
          },
        };
        await openContractCall(txOptions);
      });
    } catch (error) {
      console.error('Error collecting campaign fee:', error);
      return { success: false, error: 'Failed to collect campaign fee.' };
    }
  }

  async withdrawFromEscrow(params: WithdrawFromEscrowParams): Promise<ServiceResponse<EscrowRelease>> {
    try {
      if (!this.userSession.isUserSignedIn()) {
        return { success: false, error: 'User must be signed in to withdraw from escrow' };
      }

      const escrowResult = await this.getEscrowStatus(params.escrowId);
      if (!escrowResult.success || !escrowResult.data) {
        return { success: false, error: 'Escrow not found or inaccessible' };
      }

      const escrow = escrowResult.data;
      const userAddress = this.userSession.loadUserData().profile.stxAddress.mainnet;

      if (escrow.depositor !== userAddress && params.recipient !== userAddress) {
        return { success: false, error: 'Not authorized to withdraw from this escrow' };
      }

      if (escrow.status !== 'locked') {
        return { success: false, error: `Cannot withdraw from ${escrow.status} escrow` };
      }

      const withdrawalAmount = params.amount || escrow.amount;
      const recipient = params.recipient || escrow.depositor;

      const mockRelease: EscrowRelease = {
        escrowId: params.escrowId,
        recipient,
        amount: withdrawalAmount,
        reason: params.reason,
        txId: `mock-tx-${Date.now()}`,
        timestamp: Date.now(),
      };

      await new Promise(resolve => setTimeout(resolve, 2000));

      return { success: true, data: mockRelease, transactionId: mockRelease.txId };
    } catch (error) {
      console.error('Error withdrawing from escrow:', error);
      return { success: false, error: 'Failed to withdraw from escrow. Please try again.' };
    }
  }

  async getEscrowStatus(escrowId: string): Promise<ServiceResponse<EscrowDeposit>> {
    try {
      if (!escrowId) {
        return { success: false, error: 'Escrow ID is required' };
      }

      const contractAddress = getContractAddress('escrow');
      const contractName = getContractName('escrow');
      const network = getNetwork();
      const senderAddress = this.userSession.isUserSignedIn()
        ? this.userSession.loadUserData().profile.stxAddress.testnet
        : contractAddress;

      try {
        const resultCV = await fetchCallReadOnlyFunction({
          contractAddress,
          contractName,
          functionName: 'get-campaign',
          functionArgs: [uintCV(parseInt(escrowId))],
          network,
          senderAddress,
        });
        const parsed = cvToValue(resultCV, true);

        if (parsed) {
          const campaign: Record<string, any> = parsed;
          const deposit: EscrowDeposit = {
            id: escrowId,
            depositor: campaign.creator || '',
            amount: (campaign.totalDeposited ?? '0').toString(),
            purpose: 'campaign',
            relatedId: escrowId,
            status: campaign.status === 'completed' ? 'released' : 'locked',
            createdAt: campaign.createdAt
              ? (typeof campaign.createdAt === 'number' ? campaign.createdAt : parseInt(campaign.createdAt.toString())) * 600000
              : Date.now(),
            releaseConditions: [],
          };
          return { success: true, data: deposit };
        }
      } catch (e) {
        console.warn('[escrowService] get-campaign read failed, using mock:', e);
      }

      const mockEscrow: EscrowDeposit = {
        id: escrowId,
        depositor: 'SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7',
        amount: '25000000000',
        purpose: 'campaign',
        relatedId: 'campaign-1',
        status: 'locked',
        createdAt: Date.now() - (7 * 24 * 60 * 60 * 1000),
        releaseConditions: ['Campaign funding goal reached', 'Campaign deadline passed', 'Mutual agreement between parties'],
      };

      await new Promise(resolve => setTimeout(resolve, 300));
      return { success: true, data: mockEscrow };
    } catch (error) {
      console.error('Error getting escrow status:', error);
      return { success: false, error: 'Failed to get escrow status. Please try again.' };
    }
  }

  async getUserEscrowDeposits(
    pagination?: PaginationParams
  ): Promise<ServiceResponse<PaginatedResponse<EscrowDeposit>>> {
    try {
      if (!this.userSession.isUserSignedIn()) {
        return { success: false, error: 'User must be signed in to view escrow deposits' };
      }

      const userAddress = this.userSession.loadUserData().profile.stxAddress.mainnet;

      const mockDeposits: EscrowDeposit[] = [
        {
          id: 'escrow-1',
          depositor: userAddress,
          amount: '25000000000',
          purpose: 'campaign',
          relatedId: 'campaign-1',
          status: 'locked',
          createdAt: Date.now() - (7 * 24 * 60 * 60 * 1000),
          releaseConditions: ['Campaign funding goal reached'],
        },
        {
          id: 'escrow-2',
          depositor: userAddress,
          amount: '10000000000',
          purpose: 'pool-contribution',
          relatedId: 'pool-1',
          status: 'released',
          createdAt: Date.now() - (14 * 24 * 60 * 60 * 1000),
          releaseConditions: ['Rotation period completed'],
        },
      ];

      const paginationParams = pagination || { page: 1, limit: 10 };
      const paginatedResult = this.paginateResults(mockDeposits, paginationParams);

      await new Promise(resolve => setTimeout(resolve, 400));

      return { success: true, data: paginatedResult };
    } catch (error) {
      console.error('Error getting user escrow deposits:', error);
      return { success: false, error: 'Failed to load escrow deposits. Please try again.' };
    }
  }

  async getUserEscrowReleases(
    pagination?: PaginationParams
  ): Promise<ServiceResponse<PaginatedResponse<EscrowRelease>>> {
    try {
      if (!this.userSession.isUserSignedIn()) {
        return { success: false, error: 'User must be signed in to view escrow releases' };
      }

      const userAddress = this.userSession.loadUserData().profile.stxAddress.mainnet;

      const mockReleases: EscrowRelease[] = [
        {
          escrowId: 'escrow-2',
          recipient: userAddress,
          amount: '10000000000',
          reason: 'Pool rotation completed successfully',
          txId: 'tx-release-1',
          timestamp: Date.now() - (5 * 24 * 60 * 60 * 1000),
        },
        {
          escrowId: 'escrow-4',
          recipient: userAddress,
          amount: '15000000000',
          reason: 'Campaign funding goal reached',
          txId: 'tx-release-2',
          timestamp: Date.now() - (12 * 24 * 60 * 60 * 1000),
        },
      ];

      const paginationParams = pagination || { page: 1, limit: 10 };
      const paginatedResult = this.paginateResults(mockReleases, paginationParams);

      await new Promise(resolve => setTimeout(resolve, 350));

      return { success: true, data: paginatedResult };
    } catch (error) {
      console.error('Error getting user escrow releases:', error);
      return { success: false, error: 'Failed to load escrow release history. Please try again.' };
    }
  }

  async getRelatedEscrowDeposits(
    relatedId: string,
    purpose: EscrowDeposit['purpose'],
    pagination?: PaginationParams
  ): Promise<ServiceResponse<PaginatedResponse<EscrowDeposit>>> {
    try {
      if (!relatedId) {
        return { success: false, error: 'Related ID is required' };
      }

      const mockDeposits: EscrowDeposit[] = [
        {
          id: 'escrow-related-1',
          depositor: 'SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7',
          amount: '25000000000',
          purpose,
          relatedId,
          status: 'locked',
          createdAt: Date.now() - (7 * 24 * 60 * 60 * 1000),
          releaseConditions: [`${purpose} requirements met`],
        },
      ];

      const paginationParams = pagination || { page: 1, limit: 10 };
      const paginatedResult = this.paginateResults(mockDeposits, paginationParams);

      await new Promise(resolve => setTimeout(resolve, 400));

      return { success: true, data: paginatedResult };
    } catch (error) {
      console.error('Error getting related escrow deposits:', error);
      return { success: false, error: 'Failed to load related escrow deposits. Please try again.' };
    }
  }

  private validateDepositParams(params: DepositToEscrowParams): { isValid: boolean; error?: string } {
    const amount = parseInt(params.amount);
    if (isNaN(amount) || amount <= 0) {
      return { isValid: false, error: 'Deposit amount must be a positive number' };
    }
    if (!params.relatedId || params.relatedId.trim().length === 0) {
      return { isValid: false, error: 'Related ID (Campaign/Pool ID) is required' };
    }
    const validPurposes: EscrowDeposit['purpose'][] = ['campaign', 'pool-contribution', 'verification-bond'];
    if (!validPurposes.includes(params.purpose)) {
      return { isValid: false, error: 'Invalid escrow purpose' };
    }
    return { isValid: true };
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

export const createEscrowService = (userSession: UserSession) => {
  return new EscrowService(userSession);
};
