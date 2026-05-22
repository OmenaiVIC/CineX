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
  GovernancePool,
  PoolMember,
  GovernanceProposal,
  Vote,
  CreatePoolParams,
  JoinPoolParams,
  ContributeToPoolParams,
  ProposeAllocationParams,
  VoteOnProposalParams,
  ExecuteAllocationParams,
  PoolFilters,
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

const POOL_META_PREFIX = 'cinex_pool_';
const POOL_META_KEY = (id: string) => `${POOL_META_PREFIX}${id}`;

function savePoolMetadata(id: string, meta: Partial<GovernancePool>) {
  try {
    const existing = JSON.parse(localStorage.getItem(POOL_META_KEY(id)) || '{}');
    localStorage.setItem(POOL_META_KEY(id), JSON.stringify({ ...existing, ...meta }));
  } catch {}
}

function loadPoolMetadata(id: string): Partial<GovernancePool> | null {
  try {
    const raw = localStorage.getItem(POOL_META_KEY(id));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function getAllPoolIds(): string[] {
  const ids: string[] = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(POOL_META_PREFIX)) {
        ids.push(key.slice(POOL_META_PREFIX.length));
      }
    }
  } catch {}
  return ids;
}

const MOCK_POOLS: GovernancePool[] = [
  {
    id: '1',
    name: 'Independent Film Fund',
    description: 'A governance pool supporting independent filmmakers. Members vote on how to allocate pooled STX toward milestone-based campaigns.',
    creator: 'SP2ZRX9W6D6VZ9WZ6Z6Z6Z6Z6Z6Z6Z6Z6Z6Z6Z6',
    targetAmount: '100000',
    currentAmount: '45000',
    minContribution: '1000',
    minReputation: '0',
    duration: 518400,
    maxMembers: 50,
    memberCount: 12,
    status: 'active',
    createdAt: Date.now() - 14 * 86400000,
    expiresAt: Date.now() + 16 * 86400000,
    members: [
      { address: 'SP2ZRX9W6D6VZ9WZ6Z6Z6Z6Z6Z6Z6Z6Z6Z6Z6Z6', amount: '10000', joinedAt: Date.now() - 14 * 86400000 },
      { address: 'SP3ZRX9W6D6VZ9WZ6Z6Z6Z6Z6Z6Z6Z6Z6Z6Z6Z6', amount: '5000', joinedAt: Date.now() - 10 * 86400000 },
      { address: 'SP4ZRX9W6D6VZ9WZ6Z6Z6Z6Z6Z6Z6Z6Z6Z6Z6Z6', amount: '3000', joinedAt: Date.now() - 7 * 86400000 },
    ],
    proposals: [],
  },
  {
    id: '2',
    name: 'Documentary Collective',
    description: 'Pool dedicated to funding documentary projects about social impact. Governance is shared among members.',
    creator: 'SP3ZRX9W6D6VZ9WZ6Z6Z6Z6Z6Z6Z6Z6Z6Z6Z6Z6',
    targetAmount: '50000',
    currentAmount: '25000',
    minContribution: '500',
    minReputation: '0',
    duration: 345600,
    maxMembers: 30,
    memberCount: 8,
    status: 'active',
    createdAt: Date.now() - 7 * 86400000,
    expiresAt: Date.now() + 23 * 86400000,
    members: [
      { address: 'SP3ZRX9W6D6VZ9WZ6Z6Z6Z6Z6Z6Z6Z6Z6Z6Z6Z6', amount: '8000', joinedAt: Date.now() - 7 * 86400000 },
    ],
    proposals: [],
  },
];

const MOCK_PROPOSALS: Record<string, GovernanceProposal[]> = {
  '1': [
    {
      id: '1-1',
      poolId: '1',
      proposer: 'SP2ZRX9W6D6VZ9WZ6Z6Z6Z6Z6Z6Z6Z6Z6Z6Z6Z6',
      campaignId: '5',
      title: 'Allocate 10,000 STX to Campaign #5',
      description: 'Proposal to fund the short film "Neon Dreams" which aligns with our collective vision.',
      amount: '10000',
      status: 'active',
      createdAt: Date.now() - 3 * 86400000,
      deadline: Date.now() + 7 * 86400000,
      yesVotes: 3,
      noVotes: 1,
      totalVotes: 4,
      voters: [
        { voter: 'SP2ZRX9W6D6VZ9WZ6Z6Z6Z6Z6Z6Z6Z6Z6Z6Z6Z6', support: true, amount: '10000', timestamp: Date.now() - 3 * 86400000 },
        { voter: 'SP3ZRX9W6D6VZ9WZ6Z6Z6Z6Z6Z6Z6Z6Z6Z6Z6Z6', support: true, amount: '5000', timestamp: Date.now() - 2 * 86400000 },
        { voter: 'SP4ZRX9W6D6VZ9WZ6Z6Z6Z6Z6Z6Z6Z6Z6Z6Z6Z6', support: false, amount: '3000', timestamp: Date.now() - 1 * 86400000 },
        { voter: 'SP5ZRX9W6D6VZ9WZ6Z6Z6Z6Z6Z6Z6Z6Z6Z6Z6Z6', support: true, amount: '2000', timestamp: Date.now() - 12 * 3600000 },
      ],
    },
  ],
};

export class FundingPoolService {
  private userSession: UserSession;

  constructor(userSession: UserSession) {
    this.userSession = userSession;
  }

  async createPool(params: CreatePoolParams): Promise<ServiceResponse<GovernancePool>> {
    try {
      if (!this.userSession.isUserSignedIn()) {
        return { success: false, error: 'User must be signed in to create a pool' };
      }

      const network = getNetwork();
      const contractAddress = getContractAddress('fundingPool');
      const contractName = getContractName('fundingPool');
      const nextPoolId = Date.now();

      return await new Promise<ServiceResponse<GovernancePool>>(async (resolve) => {
        let txId: string | undefined;
        const txOptions = {
          contractAddress,
          contractName,
          functionName: 'create-pool',
          functionArgs: [
            stringAsciiCV(params.name),
            uintCV(parseInt(params.targetAmount)),
            uintCV(parseInt(params.minContribution)),
            uintCV(params.minReputation ?? 0),
            uintCV(Math.floor((params.duration ?? 518400) / 600)),
            uintCV(params.maxMembers ?? 50),
          ],
          network,
          onFinish: (data: any) => {
            txId = data.txId;
            const newPool: GovernancePool = {
              id: nextPoolId.toString(),
              name: params.name,
              description: params.description ?? '',
              creator: this.userSession.loadUserData().profile.stxAddress.mainnet,
              targetAmount: params.targetAmount,
              currentAmount: '0',
              minContribution: params.minContribution,
              minReputation: params.minReputation ?? 0,
              duration: params.duration ?? 518400,
              maxMembers: params.maxMembers ?? 50,
              memberCount: 1,
              status: 'active',
              createdAt: Date.now(),
              expiresAt: Date.now() + (params.duration ?? 518400) * 1000,
              members: [],
              proposals: [],
            };
            savePoolMetadata(nextPoolId.toString(), { name: params.name, description: params.description });
            resolve({ success: true, data: newPool, transactionId: txId });
          },
          onCancel: () => {
            resolve({ success: false, error: 'Transaction cancelled by user' });
          },
        };
        await openContractCall(txOptions);
      });
    } catch (error) {
      return { success: false, error: 'Failed to create pool. Please try again.' };
    }
  }

  async joinPool(params: JoinPoolParams): Promise<ServiceResponse<GovernancePool>> {
    try {
      if (!this.userSession.isUserSignedIn()) {
        return { success: false, error: 'User must be signed in to join a pool' };
      }

      const amount = parseInt(params.amount);
      if (isNaN(amount) || amount <= 0) {
        return { success: false, error: 'Amount must be a positive number' };
      }

      const network = getNetwork();
      const contractAddress = getContractAddress('fundingPool');
      const contractName = getContractName('fundingPool');

      return await new Promise<ServiceResponse<GovernancePool>>(async (resolve) => {
        let txId: string | undefined;
        const txOptions = {
          contractAddress,
          contractName,
          functionName: 'join-pool',
          functionArgs: [
            uintCV(parseInt(params.poolId)),
            uintCV(amount),
          ],
          network,
          onFinish: (data: any) => {
            txId = data.txId;
            resolve({ success: true, transactionId: txId });
          },
          onCancel: () => {
            resolve({ success: false, error: 'Transaction cancelled by user' });
          },
        };
        await openContractCall(txOptions);
      });
    } catch (error) {
      return { success: false, error: 'Failed to join pool. Please try again.' };
    }
  }

  async contribute(params: ContributeToPoolParams): Promise<ServiceResponse<void>> {
    try {
      if (!this.userSession.isUserSignedIn()) {
        return { success: false, error: 'User must be signed in to contribute' };
      }

      const network = getNetwork();
      const contractAddress = getContractAddress('fundingPool');
      const contractName = getContractName('fundingPool');

      return await new Promise<ServiceResponse<void>>(async (resolve) => {
        let txId: string | undefined;
        const txOptions = {
          contractAddress,
          contractName,
          functionName: 'contribute',
          functionArgs: [
            uintCV(parseInt(params.poolId)),
            uintCV(parseInt(params.amount)),
          ],
          network,
          onFinish: (data: any) => {
            txId = data.txId;
            resolve({ success: true, transactionId: txId });
          },
          onCancel: () => {
            resolve({ success: false, error: 'Contribution cancelled by user' });
          },
        };
        await openContractCall(txOptions);
      });
    } catch (error) {
      return { success: false, error: 'Failed to contribute to pool. Please try again.' };
    }
  }

  async proposeAllocation(params: ProposeAllocationParams): Promise<ServiceResponse<GovernanceProposal>> {
    try {
      if (!this.userSession.isUserSignedIn()) {
        return { success: false, error: 'User must be signed in' };
      }

      const network = getNetwork();
      const contractAddress = getContractAddress('fundingPool');
      const contractName = getContractName('fundingPool');

      return await new Promise<ServiceResponse<GovernanceProposal>>(async (resolve) => {
        let txId: string | undefined;
        const txOptions = {
          contractAddress,
          contractName,
          functionName: 'propose-allocation',
          functionArgs: [
            uintCV(parseInt(params.poolId)),
            uintCV(parseInt(params.campaignId)),
            uintCV(parseInt(params.amount)),
          ],
          network,
          onFinish: (data: any) => {
            txId = data.txId;
            resolve({ success: true, transactionId: txId });
          },
          onCancel: () => {
            resolve({ success: false, error: 'Proposal cancelled by user' });
          },
        };
        await openContractCall(txOptions);
      });
    } catch (error) {
      return { success: false, error: 'Failed to propose allocation. Please try again.' };
    }
  }

  async voteOnProposal(params: VoteOnProposalParams): Promise<ServiceResponse<void>> {
    try {
      if (!this.userSession.isUserSignedIn()) {
        return { success: false, error: 'User must be signed in to vote' };
      }

      const network = getNetwork();
      const contractAddress = getContractAddress('fundingPool');
      const contractName = getContractName('fundingPool');

      return await new Promise<ServiceResponse<void>>(async (resolve) => {
        let txId: string | undefined;
        const txOptions = {
          contractAddress,
          contractName,
          functionName: 'vote',
          functionArgs: [
            uintCV(parseInt(params.proposalId)),
            uintCV(params.approve ? 1 : 0),
          ],
          network,
          onFinish: (data: any) => {
            txId = data.txId;
            resolve({ success: true, transactionId: txId });
          },
          onCancel: () => {
            resolve({ success: false, error: 'Vote cancelled by user' });
          },
        };
        await openContractCall(txOptions);
      });
    } catch (error) {
      return { success: false, error: 'Failed to submit vote. Please try again.' };
    }
  }

  async executeAllocation(params: ExecuteAllocationParams): Promise<ServiceResponse<void>> {
    try {
      const network = getNetwork();
      const contractAddress = getContractAddress('fundingPool');
      const contractName = getContractName('fundingPool');

      return await new Promise<ServiceResponse<void>>(async (resolve) => {
        let txId: string | undefined;
        const txOptions = {
          contractAddress,
          contractName,
          functionName: 'execute-allocation',
          functionArgs: [
            uintCV(parseInt(params.proposalId)),
          ],
          network,
          onFinish: (data: any) => {
            txId = data.txId;
            resolve({ success: true, transactionId: txId });
          },
          onCancel: () => {
            resolve({ success: false, error: 'Execution cancelled by user' });
          },
        };
        await openContractCall(txOptions);
      });
    } catch (error) {
      return { success: false, error: 'Failed to execute allocation. Please try again.' };
    }
  }

  async getPools(
    filters?: PoolFilters,
    pagination?: PaginationParams
  ): Promise<ServiceResponse<PaginatedResponse<GovernancePool>>> {
    try {
      const paginationParams = pagination || { page: 1, limit: 10 };
      const ids = getAllPoolIds();
      const pools: GovernancePool[] = [];

      for (const id of ids) {
        const result = await this.getPoolDetails(id);
        if (result.success && result.data) {
          pools.push(result.data);
        }
      }

      const allPools = [...MOCK_POOLS, ...pools];

      let filtered = allPools;
      if (filters) {
        filtered = this.applyFilters(filtered, filters);
      }

      const paginatedResult = this.paginateResults(filtered, paginationParams);
      return { success: true, data: paginatedResult };
    } catch (error) {
      return { success: false, error: 'Failed to load pools. Please try again.' };
    }
  }

  async getPoolDetails(poolId: string): Promise<ServiceResponse<GovernancePool>> {
    try {
      if (!poolId) {
        return { success: false, error: 'Pool ID is required' };
      }

      const contractAddress = getContractAddress('fundingPool');
      const contractName = getContractName('fundingPool');
      const network = getNetwork();
      const senderAddress = this.userSession.isUserSignedIn()
        ? this.userSession.loadUserData().profile.stxAddress.testnet
        : contractAddress;

      let onChainData: Record<string, any> = {};
      try {
        const resultCV = await fetchCallReadOnlyFunction({
          contractAddress,
          contractName,
          functionName: 'get-pool',
          functionArgs: [uintCV(parseInt(poolId))],
          network,
          senderAddress,
        });
        const parsed = cvToValue(resultCV, true);
        if (parsed && typeof parsed === 'object') {
          onChainData = parsed;
        }
      } catch (e) {
        console.warn('[fundingPoolService] get-pool read failed, using metadata:', e);
      }

      const meta = loadPoolMetadata(poolId) ?? {};
      const mockPool = MOCK_POOLS.find(p => p.id === poolId);
      const proposal = MOCK_PROPOSALS[poolId] ?? [];

      const pool: GovernancePool = {
        id: poolId,
        name: meta?.name || mockPool?.name || onChainData.name || `Pool #${poolId}`,
        description: meta?.description || mockPool?.description || onChainData.description || '',
        creator: onChainData.creator || mockPool?.creator || '',
        targetAmount: (onChainData.targetAmount ?? '').toString() || mockPool?.targetAmount || '0',
        currentAmount: (onChainData.currentAmount ?? '').toString() || mockPool?.currentAmount || '0',
        minContribution: (onChainData.minContribution ?? '').toString() || mockPool?.minContribution || '0',
        minReputation: onChainData.minReputation ?? mockPool?.minReputation ?? 0,
        duration: onChainData.duration ?? mockPool?.duration ?? 518400,
        maxMembers: onChainData.maxMembers ?? mockPool?.maxMembers ?? 50,
        memberCount: onChainData.memberCount ?? mockPool?.memberCount ?? 0,
        status: onChainData.isActive === false ? 'completed' : (mockPool?.status || 'active'),
        createdAt: onChainData.createdAt
          ? (typeof onChainData.createdAt === 'number' ? onChainData.createdAt : parseInt(onChainData.createdAt.toString())) * 1000
          : mockPool?.createdAt || Date.now(),
        expiresAt: onChainData.expiresAt
          ? (typeof onChainData.expiresAt === 'number' ? onChainData.expiresAt : parseInt(onChainData.expiresAt.toString())) * 1000
          : mockPool?.expiresAt || (Date.now() + 30 * 86400000),
        members: mockPool?.members ?? [],
        proposals: proposal,
      };

      return { success: true, data: pool };
    } catch (error) {
      return { success: false, error: 'Failed to load pool details.' };
    }
  }

  async getProposals(poolId: string): Promise<ServiceResponse<GovernanceProposal[]>> {
    try {
      const proposals = MOCK_PROPOSALS[poolId] ?? [];
      return { success: true, data: proposals };
    } catch (error) {
      return { success: false, error: 'Failed to load proposals.' };
    }
  }

  async getMemberStatus(poolId: string, address: string): Promise<ServiceResponse<PoolMember | null>> {
    try {
      if (!this.userSession.isUserSignedIn()) {
        return { success: false, data: null };
      }

      const contractAddress = getContractAddress('fundingPool');
      const contractName = getContractName('fundingPool');
      const network = getNetwork();

      const resultCV = await fetchCallReadOnlyFunction({
        contractAddress,
        contractName,
        functionName: 'get-member',
        functionArgs: [
          uintCV(parseInt(poolId)),
          principalCV(address),
        ],
        network,
        senderAddress: address,
      });
      const parsed = cvToValue(resultCV, true);

      if (parsed) {
        return {
          success: true,
          data: {
            address,
            amount: parsed.amount?.toString() || '0',
            joinedAt: parsed.joinedAt
              ? (typeof parsed.joinedAt === 'number' ? parsed.joinedAt : parseInt(parsed.joinedAt.toString())) * 1000
              : Date.now(),
          },
        };
      }
      return { success: true, data: null };
    } catch (error) {
      return { success: false, error: 'Failed to get member status.' };
    }
  }

  private applyFilters(pools: GovernancePool[], filters: PoolFilters): GovernancePool[] {
    return pools.filter(pool => {
      if (filters.status && pool.status !== filters.status) return false;
      if (filters.minAmount && parseInt(pool.targetAmount) < parseInt(filters.minAmount)) return false;
      if (filters.maxAmount && parseInt(pool.targetAmount) > parseInt(filters.maxAmount)) return false;
      if (filters.search) {
        const q = filters.search.toLowerCase();
        if (!pool.name.toLowerCase().includes(q) && !pool.description.toLowerCase().includes(q)) return false;
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

export const createFundingPoolService = (userSession: UserSession) => {
  return new FundingPoolService(userSession);
};
