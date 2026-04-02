// Co-EP (Collaborative Executive Producer) Pool service for CineX platform
// Handles pool creation, joining, contributions, and rotation management

import { 
  uintCV,
  stringUtf8CV,
  stringAsciiCV,
  bufferCV,
  principalCV,
} from '@stacks/transactions';
import { openContractCall } from '@stacks/connect';
import { 
  getNetwork, 
  getContractAddress, 
  getContractName,
} from '../utils/network';

import type { 
  ServiceResponse, 
  CoEPPool, 
  PoolMember,
  PoolRotation,
  CreatePoolParams,
  JoinPoolParams,
  ContributeToPoolParams,
  PoolFilters,
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

export class CoEPService {
  private userSession: UserSession;

  constructor(userSession: UserSession) {
    this.userSession = userSession;
  }

  /**
   * Create a new Co-EP pool
   * @param params Pool creation parameters
   * @returns Promise with pool creation result
   */
  async createPool(params: CreatePoolParams): Promise<ServiceResponse<CoEPPool>> {
    try {
      // Validate user is authenticated
      if (!this.userSession.isUserSignedIn()) {
        return {
          success: false,
          error: 'User must be signed in to create pools',
        };
      }

      // Validate parameters
      const validation = this.validatePoolParams(params);
      if (!validation.isValid) {
        return {
          success: false,
          error: validation.error,
        };
      }

      // Call smart contract to create pool
      const network = getNetwork();
      const contractAddress = getContractAddress();
      const contractName = getContractName('coep');
      const verificationAddress = getContractAddress(); // Same address for all contracts
      const verificationName = getContractName('verification');

      try {
        // Convert legal agreement hash to buffer (32 bytes)
        const legalHashBuffer = params.legalAgreementHash 
          ? bufferCV(Buffer.from(params.legalAgreementHash.slice(0, 64), 'hex').slice(0, 32))
          : bufferCV(Buffer.alloc(32)); // Empty buffer if no hash provided

        // Open Stacks wallet to sign transaction
        const txOptions = {
          contractAddress,
          contractName,
          functionName: 'create-new-rotating-funding-pool',
          functionArgs: [
            uintCV(1), // new-project-id (hardcoded for now - should track filmmaker projects)
            stringUtf8CV(params.name),
            uintCV(params.maxMembers),
            uintCV(parseInt(params.contributionAmount)), // STX in microSTX
            uintCV(params.cycleDuration), // In blocks
            legalHashBuffer,
            stringAsciiCV(params.category),
            stringAsciiCV(params.geographicFocus),
            principalCV(`${verificationAddress}.${verificationName}`), // Verification contract principal
          ],
          network,
          onFinish: (data: any) => {
            console.log('Pool creation transaction broadcast:', data.txId);
          },
          onCancel: () => {
            console.log('Pool creation cancelled');
          },
        };

        await openContractCall(txOptions);

        // Return success with pending transaction
        const mockPool: CoEPPool = {
          id: 'pending',
          name: params.name,
          description: params.description,
          creator: this.userSession.loadUserData().profile.stxAddress.mainnet,
          maxMembers: params.maxMembers,
          currentMembers: 1,
          contributionAmount: params.contributionAmount,
          cycleDuration: params.cycleDuration,
          category: params.category,
          geographicFocus: params.geographicFocus,
          status: 'forming',
          createdAt: Date.now(),
          currentRotation: 0,
          totalRotations: params.maxMembers,
          legalAgreementHash: params.legalAgreementHash,
        };

        return {
          success: true,
          data: mockPool,
          transactionId: 'pending',
        };
      } catch (txError) {
        console.error('Pool creation transaction error:', txError);
        return {
          success: false,
          error: 'Pool creation transaction failed or was cancelled',
        };
      }

    } catch (error) {
      console.error('Error creating Co-EP pool:', error);
      return {
        success: false,
        error: 'Failed to create pool. Please try again.',
      };
    }
  }

  /**
   * Join an existing Co-EP pool
   * @param params Pool joining parameters
   * @returns Promise with joining result
   */
  async joinPool(params: JoinPoolParams): Promise<ServiceResponse<PoolMember>> {
    try {
      // Validate user is authenticated
      if (!this.userSession.isUserSignedIn()) {
        return {
          success: false,
          error: 'User must be signed in to join pools',
        };
      }

      // Validate pool exists and has space
      const poolResult = await this.getPoolDetails(params.poolId);
      if (!poolResult.success || !poolResult.data) {
        return {
          success: false,
          error: 'Pool not found or unavailable',
        };
      }

      const pool = poolResult.data;
      if (pool.currentMembers >= pool.maxMembers) {
        return {
          success: false,
          error: 'Pool is full. Cannot join at this time.',
        };
      }

      if (pool.status !== 'forming') {
        return {
          success: false,
          error: 'Pool is no longer accepting new members',
        };
      }

      // Call smart contract to join pool
      const network = getNetwork();
      const contractAddress = getContractAddress();
      const contractName = getContractName('coep');
      const userAddress = this.userSession.loadUserData().profile.stxAddress.mainnet;

      try {
        // Open Stacks wallet to sign transaction
        const txOptions = {
          contractAddress,
          contractName,
          functionName: 'contribute-to-existing-pool',
          functionArgs: [uintCV(parseInt(params.poolId))],
          network,
          onFinish: (data: any) => {
            console.log('Transaction broadcast:', data.txId);
          },
          onCancel: () => {
            console.log('Transaction cancelled');
          },
        };

        await openContractCall(txOptions);

        // Return success with pending transaction
        const mockMember: PoolMember = {
          poolId: params.poolId,
          address: userAddress,
          joinedAt: Date.now(),
          rotationOrder: params.rotationOrder,
          hasBenefited: false,
          contributionsMade: 0,
          isActive: true,
          verificationStatus: '1-tier',
        };

        return {
          success: true,
          data: mockMember,
          transactionId: 'pending', // Transaction ID will be available in onFinish callback
        };
      } catch (txError) {
        console.error('Transaction error:', txError);
        return {
          success: false,
          error: 'Transaction failed or was cancelled',
        };
      }

    } catch (error) {
      console.error('Error joining Co-EP pool:', error);
      return {
        success: false,
        error: 'Failed to join pool. Please try again.',
      };
    }
  }

  /**
   * Contribute STX to a Co-EP pool for current rotation
   * @param params Contribution parameters
   * @returns Promise with contribution result
   */
  async contributeToPool(params: ContributeToPoolParams): Promise<ServiceResponse<{ txId: string; amount: string }>> {
    try {
      // Validate user is authenticated
      if (!this.userSession.isUserSignedIn()) {
        return {
          success: false,
          error: 'User must be signed in to contribute to pools',
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

      // Validate user is a member of the pool
      const membersResult = await this.getPoolMembers(params.poolId);
      if (!membersResult.success || !membersResult.data) {
        return {
          success: false,
          error: 'Failed to verify pool membership',
        };
      }

      const userAddress = this.userSession.loadUserData().profile.stxAddress.mainnet;
      const isMember = membersResult.data.items.some(member => member.address === userAddress);
      
      if (!isMember) {
        return {
          success: false,
          error: 'You must be a pool member to contribute',
        };
      }

      // Call smart contract to contribute to pool
      const network = getNetwork();
      const contractAddress = getContractAddress();
      const contractName = getContractName('coep');

      try {
        // Open Stacks wallet to sign transaction
        const txOptions = {
          contractAddress,
          contractName,
          functionName: 'contribute-to-existing-pool',
          functionArgs: [uintCV(parseInt(params.poolId))],
          network,
          onFinish: (data: any) => {
            console.log('Contribution transaction broadcast:', data.txId);
          },
          onCancel: () => {
            console.log('Contribution cancelled');
          },
        };

        await openContractCall(txOptions);

        return {
          success: true,
          data: {
            txId: 'pending',
            amount: params.amount,
          },
          transactionId: 'pending',
        };
      } catch (txError) {
        console.error('Contribution transaction error:', txError);
        return {
          success: false,
          error: 'Contribution transaction failed or was cancelled',
        };
      }

    } catch (error) {
      console.error('Error contributing to Co-EP pool:', error);
      return {
        success: false,
        error: 'Failed to contribute to pool. Please try again.',
      };
    }
  }

  /**
   * Get detailed information about a specific Co-EP pool
   * @param poolId Pool ID to get details for
   * @returns Promise with pool details
   */
  async getPoolDetails(poolId: string): Promise<ServiceResponse<CoEPPool>> {
    try {
      if (!poolId) {
        return {
          success: false,
          error: 'Pool ID is required',
        };
      }

      // TODO: Replace with actual smart contract call
      // For now, return mock pool details
      const mockPool: CoEPPool = {
        id: poolId,
        name: 'Hollywood Independent Filmmakers Pool',
        description: 'A collaborative funding pool for independent filmmakers in Hollywood. Members rotate as beneficiaries every 3 months, supporting each other\'s creative projects.',
        creator: 'SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7',
        maxMembers: 8,
        currentMembers: 5,
        contributionAmount: '10000000000', // 10,000 STX per rotation
        cycleDuration: 2160, // ~3 months in blocks (assuming 10 min blocks)
        category: 'feature',
        geographicFocus: 'hollywood',
        status: 'active',
        createdAt: Date.now() - (30 * 24 * 60 * 60 * 1000), // 30 days ago
        currentRotation: 2,
        totalRotations: 8,
        legalAgreementHash: 'QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco',
      };

      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 400));

      return {
        success: true,
        data: mockPool,
      };

    } catch (error) {
      console.error('Error getting Co-EP pool details:', error);
      return {
        success: false,
        error: 'Failed to load pool details. Please try again.',
      };
    }
  }

  /**
   * Get list of members in a specific Co-EP pool
   * @param poolId Pool ID to get members for
   * @param pagination Optional pagination parameters
   * @returns Promise with paginated members list
   */
  async getPoolMembers(
    poolId: string,
    pagination?: PaginationParams
  ): Promise<ServiceResponse<PaginatedResponse<PoolMember>>> {
    try {
      if (!poolId) {
        return {
          success: false,
          error: 'Pool ID is required',
        };
      }

      // TODO: Replace with actual API call
      // For now, return mock members
      const mockMembers: PoolMember[] = [
        {
          poolId,
          address: 'SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7',
          joinedAt: Date.now() - (30 * 24 * 60 * 60 * 1000), // 30 days ago (creator)
          rotationOrder: 1,
          hasBenefited: true,
          contributionsMade: 2,
          isActive: true,
          verificationStatus: '3-tier',
        },
        {
          poolId,
          address: 'SP1H1733V5MZ3SZ9XRW9FKYAH3W17PQATB3RFGAVY',
          joinedAt: Date.now() - (25 * 24 * 60 * 60 * 1000), // 25 days ago
          rotationOrder: 2,
          hasBenefited: true,
          contributionsMade: 2,
          isActive: true,
          verificationStatus: '2-tier',
        },
        {
          poolId,
          address: 'SP3F1JDPZ9S85FPBG712QY96TC4FJC1XHPFJFCK1R',
          joinedAt: Date.now() - (20 * 24 * 60 * 60 * 1000), // 20 days ago
          rotationOrder: 3,
          hasBenefited: false,
          contributionsMade: 2,
          isActive: true,
          verificationStatus: '2-tier',
        },
        {
          poolId,
          address: 'SP2C2YFP12AJZB4MABJBAJ55XECVS7E4PMMZ89YZR',
          joinedAt: Date.now() - (15 * 24 * 60 * 60 * 1000), // 15 days ago
          rotationOrder: 4,
          hasBenefited: false,
          contributionsMade: 1,
          isActive: true,
          verificationStatus: '1-tier',
        },
        {
          poolId,
          address: 'SP1WTA0YBPC5R6GDMPPJCEDEA6Z2ZEPNMQ4C39W6M',
          joinedAt: Date.now() - (10 * 24 * 60 * 60 * 1000), // 10 days ago
          rotationOrder: 5,
          hasBenefited: false,
          contributionsMade: 1,
          isActive: true,
          verificationStatus: '1-tier',
        },
      ];

      const paginationParams = pagination || { page: 1, limit: 10 };
      const paginatedResult = this.paginateResults(mockMembers, paginationParams);

      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 300));

      return {
        success: true,
        data: paginatedResult,
      };

    } catch (error) {
      console.error('Error getting Co-EP pool members:', error);
      return {
        success: false,
        error: 'Failed to load pool members. Please try again.',
      };
    }
  }

  /**
   * Get list of Co-EP pools with optional filtering and pagination
   * @param filters Optional filters for pools
   * @param pagination Optional pagination parameters
   * @returns Promise with paginated pools list
   */
  async getPools(
    filters?: PoolFilters,
    pagination?: PaginationParams
  ): Promise<ServiceResponse<PaginatedResponse<CoEPPool>>> {
    try {
      // TODO: Replace with actual API call to get pools from blockchain
      // For now, return mock data
      const mockPools: CoEPPool[] = [
        {
          id: 'pool-1',
          name: 'Hollywood Independent Filmmakers Pool',
          description: 'A collaborative funding pool for independent filmmakers in Hollywood.',
          creator: 'SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7',
          maxMembers: 8,
          currentMembers: 5,
          contributionAmount: '10000000000', // 10,000 STX
          cycleDuration: 2160,
          category: 'feature',
          geographicFocus: 'hollywood',
          status: 'active',
          createdAt: Date.now() - (30 * 24 * 60 * 60 * 1000),
          currentRotation: 2,
          totalRotations: 8,
        },
        {
          id: 'pool-2',
          name: 'Nollywood Documentary Collective',
          description: 'Supporting documentary filmmakers exploring African stories and culture.',
          creator: 'SP3F1JDPZ9S85FPBG712QY96TC4FJC1XHPFJFCK1R',
          maxMembers: 6,
          currentMembers: 4,
          contributionAmount: '15000000000', // 15,000 STX
          cycleDuration: 1440, // ~2 months
          category: 'documentary',
          geographicFocus: 'nollywood',
          status: 'forming',
          createdAt: Date.now() - (10 * 24 * 60 * 60 * 1000),
          currentRotation: 0,
          totalRotations: 6,
        },
        {
          id: 'pool-3',
          name: 'Global Short Film Accelerator',
          description: 'Fast-track funding for short films from creators worldwide.',
          creator: 'SP1H1733V5MZ3SZ9XRW9FKYAH3W17PQATB3RFGAVY',
          maxMembers: 10,
          currentMembers: 10,
          contributionAmount: '5000000000', // 5,000 STX
          cycleDuration: 720, // ~1 month
          category: 'short-film',
          geographicFocus: 'global',
          status: 'completed',
          createdAt: Date.now() - (120 * 24 * 60 * 60 * 1000),
          currentRotation: 10,
          totalRotations: 10,
        },
      ];

      // Apply filters if provided
      let filteredPools = mockPools;
      if (filters) {
        filteredPools = this.applyPoolFilters(mockPools, filters);
      }

      // Apply pagination
      const paginationParams = pagination || { page: 1, limit: 10 };
      const paginatedResult = this.paginateResults(filteredPools, paginationParams);

      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 500));

      return {
        success: true,
        data: paginatedResult,
      };

    } catch (error) {
      console.error('Error getting Co-EP pools:', error);
      return {
        success: false,
        error: 'Failed to load pools. Please try again.',
      };
    }
  }

  /**
   * Execute rotation funding - transfers Co-EP pool funds to beneficiary and creates linked campaign
   * 
   * IMPORTANT: This is the core of Co-EP collaborative funding:
   * 1. Transfers accumulated pool funds to current rotation beneficiary
   * 2. Automatically creates a linked crowdfunding campaign for the beneficiary
   * 3. Allows beneficiary to run PUBLIC crowdfunding CONCURRENT with Co-EP funding
   * 4. Advances rotation to next member in the pool
   * 
   * @param poolId Pool ID to execute rotation for
   * @returns Promise with rotation execution result
   */
  async executeRotation(poolId: string): Promise<ServiceResponse<{ txId: string; beneficiary: string }>> {
    try {
      // Validate user is authenticated
      if (!this.userSession.isUserSignedIn()) {
        return {
          success: false,
          error: 'User must be signed in to execute rotations',
        };
      }

      // Call smart contract to execute rotation
      // This will:
      // 1. Verify all pool members have contributed for current rotation
      // 2. Transfer full pool funds to beneficiary
      // 3. Create linked crowdfunding campaign (if beneficiary enabled public funding)
      // 4. Advance rotation schedule to next member
      // 5. Reset contribution status for all members
      const network = getNetwork();
      const contractAddress = getContractAddress();
      const contractName = getContractName('coep');
      const crowdfundingAddress = getContractAddress();
      const crowdfundingName = getContractName('crowdfunding');
      const verificationAddress = getContractAddress();
      const verificationName = getContractName('verification');

      try {
        // Open Stacks wallet to sign transaction
        const txOptions = {
          contractAddress,
          contractName,
          functionName: 'execute-rotation-funding',
          functionArgs: [
            uintCV(parseInt(poolId)),
            principalCV(`${crowdfundingAddress}.${crowdfundingName}`), // Crowdfunding trait for campaign creation
            principalCV(`${verificationAddress}.${verificationName}`), // Verification trait for filmmaker validation
          ],
          network,
          onFinish: (data: any) => {
            console.log('Rotation execution transaction broadcast:', data.txId);
            console.log('Pool funds transferred to beneficiary + Campaign created (if enabled)');
          },
          onCancel: () => {
            console.log('Rotation execution cancelled');
          },
        };

        await openContractCall(txOptions);

        return {
          success: true,
          data: {
            txId: 'pending',
            beneficiary: 'pending', // Will be available after transaction confirms
          },
          transactionId: 'pending',
        };
      } catch (txError) {
        console.error('Rotation execution transaction error:', txError);
        return {
          success: false,
          error: 'Rotation execution transaction failed or was cancelled',
        };
      }

    } catch (error) {
      console.error('Error executing rotation:', error);
      return {
        success: false,
        error: 'Failed to execute rotation. Please try again.',
      };
    }
  }

  /**
   * Update project details for upcoming rotation (beneficiary only)
   * 
   * CRITICAL FEATURE: Allows rotation beneficiary to configure their project BEFORE rotation executes:
   * 1. Set project title and description for their campaign
   * 2. Define completion percentage and milestones
   * 3. Configure reward tiers for public crowdfunding
   * 4. CHOOSE whether to enable public crowdfunding alongside Co-EP funding
   * 
   * Use Case:
   * - Filmmaker may have NO main campaign yet → can set up details here
   * - Filmmaker may want ONLY Co-EP funding → disable public crowdfunding
   * - Filmmaker may want BOTH → enable public funding for concurrent support
   * 
   * @param poolId Pool ID
   * @param rotationNumber Rotation number (beneficiary's turn)
   * @param projectDetails Project configuration
   * @returns Promise with update result
   */
  async updateRotationProjectDetails(
    poolId: string,
    rotationNumber: number,
    projectDetails: {
      title: string;
      description: string;
      expectedCompletion: number; // Block height or duration
      rewardTiers: number;
      rewardDescription: string;
      enablePublicCrowdfunding?: boolean; // NEW: Opt-in/out of public funding
    }
  ): Promise<ServiceResponse<{ txId: string }>> {
    try {
      // Validate user is authenticated
      if (!this.userSession.isUserSignedIn()) {
        return {
          success: false,
          error: 'User must be signed in to update project details',
        };
      }

      // Validate project details
      if (!projectDetails.title || projectDetails.title.length < 3) {
        return {
          success: false,
          error: 'Project title must be at least 3 characters long',
        };
      }

      if (!projectDetails.description || projectDetails.description.length < 10) {
        return {
          success: false,
          error: 'Project description must be at least 10 characters long',
        };
      }

      // Call smart contract to update project details
      const network = getNetwork();
      const contractAddress = getContractAddress();
      const contractName = getContractName('coep');

      try {
        // Note: The enable-public-crowdfunding flag is handled by the smart contract
        // When true: execute-rotation-funding will create linked campaign
        // When false: beneficiary receives Co-EP funds only, no public campaign
        
        const txOptions = {
          contractAddress,
          contractName,
          functionName: 'update-rotation-project-details',
          functionArgs: [
            uintCV(parseInt(poolId)),
            uintCV(rotationNumber),
            stringUtf8CV(projectDetails.title.slice(0, 100)), // Max 100 chars
            stringAsciiCV(projectDetails.description.slice(0, 500)), // Max 500 chars
            uintCV(projectDetails.expectedCompletion),
            uintCV(projectDetails.rewardTiers),
            stringAsciiCV(projectDetails.rewardDescription.slice(0, 500)), // Max 500 chars
          ],
          network,
          onFinish: (data: any) => {
            console.log('Project details update transaction broadcast:', data.txId);
            console.log(`Public crowdfunding: ${projectDetails.enablePublicCrowdfunding !== false ? 'ENABLED' : 'DISABLED'}`);
          },
          onCancel: () => {
            console.log('Project details update cancelled');
          },
        };

        await openContractCall(txOptions);

        return {
          success: true,
          data: { txId: 'pending' },
          transactionId: 'pending',
        };
      } catch (txError) {
        console.error('Project details update transaction error:', txError);
        return {
          success: false,
          error: 'Project details update transaction failed or was cancelled',
        };
      }

    } catch (error) {
      console.error('Error updating project details:', error);
      return {
        success: false,
        error: 'Failed to update project details. Please try again.',
      };
    }
  }

  /**
   * Get rotation schedule for a specific Co-EP pool
   * @param poolId Pool ID to get rotations for
   * @returns Promise with rotation schedule
   */
  async getPoolRotations(poolId: string): Promise<ServiceResponse<PoolRotation[]>> {
    try {
      if (!poolId) {
        return {
          success: false,
          error: 'Pool ID is required',
        };
      }

      // TODO: Replace with actual API call
      // For now, return mock rotations
      const mockRotations: PoolRotation[] = [
        {
          poolId,
          rotationNumber: 1,
          beneficiary: 'SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7',
          amount: '40000000000', // 40,000 STX (8 members × 5,000 STX each)
          startBlock: 100000,
          endBlock: 102160,
          status: 'completed',
          project: {
            title: 'The Last Frame',
            description: 'A heartwarming story about analog photography',
            mediaUrls: ['https://example.com/project1.jpg'],
          },
        },
        {
          poolId,
          rotationNumber: 2,
          beneficiary: 'SP1H1733V5MZ3SZ9XRW9FKYAH3W17PQATB3RFGAVY',
          amount: '40000000000',
          startBlock: 102160,
          endBlock: 104320,
          status: 'completed',
          project: {
            title: 'Urban Stories',
            description: 'Documentary about city life and community',
            mediaUrls: ['https://example.com/project2.jpg'],
          },
        },
        {
          poolId,
          rotationNumber: 3,
          beneficiary: 'SP3F1JDPZ9S85FPBG712QY96TC4FJC1XHPFJFCK1R',
          amount: '40000000000',
          startBlock: 104320,
          endBlock: 106480,
          status: 'active',
          project: {
            title: 'Climate Chronicles',
            description: 'Environmental documentary focusing on solutions',
            mediaUrls: ['https://example.com/project3.jpg'],
          },
        },
      ];

      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 400));

      return {
        success: true,
        data: mockRotations,
      };

    } catch (error) {
      console.error('Error getting pool rotations:', error);
      return {
        success: false,
        error: 'Failed to load rotation schedule. Please try again.',
      };
    }
  }

  // Private helper methods

  private validatePoolParams(params: CreatePoolParams): { isValid: boolean; error?: string } {
    if (!params.name || params.name.trim().length < 3) {
      return { isValid: false, error: 'Pool name must be at least 3 characters long' };
    }

    if (!params.description || params.description.trim().length < 10) {
      return { isValid: false, error: 'Pool description must be at least 10 characters long' };
    }

    if (params.maxMembers < 3 || params.maxMembers > 20) {
      return { isValid: false, error: 'Pool must have between 3 and 20 members' };
    }

    const contributionAmount = parseInt(params.contributionAmount);
    if (isNaN(contributionAmount) || contributionAmount <= 0) {
      return { isValid: false, error: 'Contribution amount must be a positive number' };
    }

    if (params.cycleDuration < 144 || params.cycleDuration > 8640) { // 1 day to 60 days in blocks
      return { isValid: false, error: 'Cycle duration must be between 1 and 60 days' };
    }

    const validCategories: CoEPPool['category'][] = ['short-film', 'feature', 'documentary', 'music-video', 'web-series'];
    if (!validCategories.includes(params.category)) {
      return { isValid: false, error: 'Invalid pool category' };
    }

    const validFocus: CoEPPool['geographicFocus'][] = ['bollywood', 'hollywood', 'nollywood', 'global'];
    if (!validFocus.includes(params.geographicFocus)) {
      return { isValid: false, error: 'Invalid geographic focus' };
    }

    return { isValid: true };
  }

  private applyPoolFilters(pools: CoEPPool[], filters: PoolFilters): CoEPPool[] {
    return pools.filter(pool => {
      if (filters.category && pool.category !== filters.category) {
        return false;
      }

      if (filters.geographicFocus && pool.geographicFocus !== filters.geographicFocus) {
        return false;
      }

      if (filters.status && pool.status !== filters.status) {
        return false;
      }

      if (filters.hasSpace !== undefined) {
        const hasSpace = pool.currentMembers < pool.maxMembers;
        if (filters.hasSpace && !hasSpace) {
          return false;
        }
        if (!filters.hasSpace && hasSpace) {
          return false;
        }
      }

      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const nameMatch = pool.name.toLowerCase().includes(searchLower);
        const descriptionMatch = pool.description.toLowerCase().includes(searchLower);
        
        if (!nameMatch && !descriptionMatch) {
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
export const createCoEPService = (userSession: UserSession) => {
  return new CoEPService(userSession);
};