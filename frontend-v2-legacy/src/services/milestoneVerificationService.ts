import {
  uintCV,
  principalCV,
  boolCV,
  listCV,
  fetchCallReadOnlyFunction,
  cvToValue,
} from '@stacks/transactions';
import { openContractCall } from '@stacks/connect';
import {
  getNetwork,
  getContractAddress,
  getContractName,
} from '../utils/network';

import type { ServiceResponse } from '../types';

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

export interface MilestoneVerificationState {
  totalMilestones: number;
  approvedMilestones: number;
  missedMilestones: number;
  bonusForfeited: boolean;
  forfeitedAt: number;
  creator: string;
}

export interface MilestoneRecord {
  deadline: number;
  firstSubmission: number;
  lastSubmission: number;
  resubmissionCount: number;
  yesWeight: number;
  noWeight: number;
  isEndorsed: boolean;
  isFinalized: boolean;
}

export interface EndorsementRecord {
  vote: boolean;
  weight: number;
  endorsedAt: number;
}

async function readContract(functionName: string, functionArgs: any[] = []): Promise<any> {
  const contractAddress = getContractAddress('milestone_verification');
  const contractName = getContractName('milestone_verification');
  const network = getNetwork();
  try {
    const resultCV = await fetchCallReadOnlyFunction({
      contractAddress,
      contractName,
      functionName,
      functionArgs,
      network,
      senderAddress: contractAddress,
    });
    return cvToValue(resultCV, true);
  } catch (e) {
    console.warn(`[milestoneVerificationService] ${functionName} read failed:`, e);
    return null;
  }
}

export async function getMilestone(campaignId: number, milestoneIndex: number): Promise<MilestoneRecord | null> {
  const result = await readContract('get-milestone', [uintCV(campaignId), uintCV(milestoneIndex)]);
  if (!result) return null;
  if (result && typeof result === 'object' && 'deadline' in result) {
    return {
      deadline: Number(result.deadline),
      firstSubmission: Number(result.firstSubmission),
      lastSubmission: Number(result.lastSubmission),
      resubmissionCount: Number(result.resubmissionCount),
      yesWeight: Number(result.yesWeight),
      noWeight: Number(result.noWeight),
      isEndorsed: Boolean(result.isEndorsed),
      isFinalized: Boolean(result.isFinalized),
    };
  }
  return null;
}

export async function getCreatorStanding(campaignId: number): Promise<MilestoneVerificationState | null> {
  const result = await readContract('get-creator-standing', [uintCV(campaignId)]);
  if (!result || typeof result !== 'object') return null;
  if ('total-milestones' in result) {
    return {
      totalMilestones: Number(result['total-milestones']),
      approvedMilestones: Number(result['approved-milestones']),
      missedMilestones: Number(result['missed-milestones']),
      bonusForfeited: Boolean(result['bonus-forfeited']),
      forfeitedAt: Number(result['forfeited-at']),
      creator: String(result.creator),
    };
  }
  return null;
}

export async function isBonusForfeited(campaignId: number): Promise<boolean> {
  const result = await readContract('is-bonus-forfeited', [uintCV(campaignId)]);
  if (result && typeof result === 'object' && 'value' in result) {
    return Boolean(result.value);
  }
  return result === true;
}

export async function getBonusRetentionRate(campaignId: number): Promise<number> {
  const result = await readContract('get-bonus-retention-rate', [uintCV(campaignId)]);
  return typeof result === 'number' ? result : 100;
}

export async function getEndorsement(campaignId: number, milestoneIndex: number, backer: string): Promise<EndorsementRecord | null> {
  const result = await readContract('get-endorsement', [uintCV(campaignId), uintCV(milestoneIndex), principalCV(backer)]);
  if (!result) return null;
  if (result && typeof result === 'object' && 'vote' in result) {
    return {
      vote: Boolean(result.vote),
      weight: Number(result.weight),
      endorsedAt: Number(result.endorsedAt),
    };
  }
  return null;
}

export class MilestoneVerificationService {
  private userSession: UserSession;

  constructor(userSession: UserSession) {
    this.userSession = userSession;
  }

  async createMilestones(campaignId: number, deadlines: number[]): Promise<ServiceResponse<{ txId?: string }>> {
    try {
      if (!this.userSession.isUserSignedIn()) {
        return { success: false, error: 'User must be signed in' };
      }
      const network = getNetwork();
      const contractAddress = getContractAddress('milestone_verification');
      const contractName = getContractName('milestone_verification');

      return await new Promise<ServiceResponse<{ txId?: string }>>(async (resolve) => {
        let txId: string | undefined;
        const txOptions = {
          contractAddress,
          contractName,
          functionName: 'create-milestones',
          functionArgs: [
            uintCV(campaignId),
            listCV(deadlines.map(d => uintCV(d))),
          ],
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
      console.error('[milestoneVerificationService] createMilestones error:', error);
      return { success: false, error: 'Failed to create milestones on-chain.' };
    }
  }

  async submitMilestone(campaignId: number, milestoneIndex: number): Promise<ServiceResponse<{ txId?: string }>> {
    try {
      if (!this.userSession.isUserSignedIn()) {
        return { success: false, error: 'User must be signed in' };
      }
      const network = getNetwork();
      const contractAddress = getContractAddress('milestone_verification');
      const contractName = getContractName('milestone_verification');

      return await new Promise<ServiceResponse<{ txId?: string }>>(async (resolve) => {
        let txId: string | undefined;
        const txOptions = {
          contractAddress,
          contractName,
          functionName: 'submit-milestone',
          functionArgs: [uintCV(campaignId), uintCV(milestoneIndex)],
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
      console.error('[milestoneVerificationService] submitMilestone error:', error);
      return { success: false, error: 'Failed to submit milestone.' };
    }
  }

  async endorseMilestone(campaignId: number, milestoneIndex: number, vote: boolean): Promise<ServiceResponse<{ txId?: string }>> {
    try {
      if (!this.userSession.isUserSignedIn()) {
        return { success: false, error: 'User must be signed in' };
      }
      const network = getNetwork();
      const contractAddress = getContractAddress('milestone_verification');
      const contractName = getContractName('milestone_verification');

      return await new Promise<ServiceResponse<{ txId?: string }>>(async (resolve) => {
        let txId: string | undefined;
        const txOptions = {
          contractAddress,
          contractName,
          functionName: 'endorse-milestone',
          functionArgs: [uintCV(campaignId), uintCV(milestoneIndex), boolCV(vote)],
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
      console.error('[milestoneVerificationService] endorseMilestone error:', error);
      return { success: false, error: 'Failed to submit endorsement.' };
    }
  }

  async finalizeMilestone(campaignId: number, milestoneIndex: number): Promise<ServiceResponse<{ txId?: string }>> {
    try {
      const network = getNetwork();
      const contractAddress = getContractAddress('milestone_verification');
      const contractName = getContractName('milestone_verification');

      return await new Promise<ServiceResponse<{ txId?: string }>>(async (resolve) => {
        let txId: string | undefined;
        const txOptions = {
          contractAddress,
          contractName,
          functionName: 'finalize-milestone',
          functionArgs: [uintCV(campaignId), uintCV(milestoneIndex)],
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
      console.error('[milestoneVerificationService] finalizeMilestone error:', error);
      return { success: false, error: 'Failed to finalize milestone.' };
    }
  }
}

export function createMilestoneVerificationService(userSession: UserSession): MilestoneVerificationService {
  return new MilestoneVerificationService(userSession);
}
