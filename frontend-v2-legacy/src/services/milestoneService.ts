import {
  uintCV,
  fetchCallReadOnlyFunction,
  cvToValue,
} from '@stacks/transactions';
import {
  getNetwork,
  getContractAddress,
  getContractName,
} from '../utils/network';
import {
  getMilestone,
  getCreatorStanding,
  getBonusRetentionRate,
} from './milestoneVerificationService';
import type { ServiceResponse, Milestone } from "../types";

interface UserSession {
  isUserSignedIn(): boolean;
  loadUserData(): { profile: { stxAddress: { testnet: string; mainnet: string } } };
}

const MOCK_MILESTONES: Milestone[] = [
  {
    id: "ms-1",
    campaignId: "campaign-7",
    title: "Pre-production",
    description: "Script finalisation, storyboarding, location scouting.",
    fundingRequired: "10000000000",
    deadline: Date.now() + 86_400_000 * 14,
    status: "completed",
    deliverables: ["Final script", "Storyboard PDF", "Location permits"],
    completedAt: Date.now() - 86_400_000 * 2,
  },
  {
    id: "ms-2",
    campaignId: "campaign-7",
    title: "Principal Photography",
    description: "Main shooting phase (14 days).",
    fundingRequired: "25000000000",
    deadline: Date.now() + 86_400_000 * 45,
    status: "active",
    deliverables: ["Raw footage archive", "Daily rushes"],
  },
  {
    id: "ms-3",
    campaignId: "campaign-7",
    title: "Post-production",
    description: "Editing, colour grading, sound design, VFX.",
    fundingRequired: "15000000000",
    deadline: Date.now() + 86_400_000 * 90,
    status: "pending",
  },
];

export class MilestoneService {
  private userSession: UserSession | null;

  constructor(userSession: UserSession | null) {
    this.userSession = userSession;
  }

  async getMilestones(campaignId: string): Promise<ServiceResponse<Milestone[]>> {
    const ms = MOCK_MILESTONES.filter((m) => m.campaignId === campaignId)
      .sort((a, b) => a.deadline - b.deadline);

    const numericId = parseInt(campaignId.replace(/\D/g, ''), 10);
    if (!isNaN(numericId)) {
      try {
        const onChainMs = await getMilestone(numericId, 0);
        if (onChainMs) {
          const standing = await getCreatorStanding(numericId);
          const retention = await getBonusRetentionRate(numericId);
          (ms as any)._onChainStanding = standing;
          (ms as any)._bonusRetentionRate = retention;
        }
      } catch {}
    }

    return { success: true, data: ms };
  }

  async createMilestone(params: Omit<Milestone, "id">): Promise<ServiceResponse<Milestone>> {
    const milestone: Milestone = {
      ...params,
      id: `ms-${Date.now()}`,
    };
    return { success: true, data: milestone, transactionId: `mock_tx_${Date.now()}` };
  }

  async completeMilestone(milestoneId: string): Promise<ServiceResponse<Milestone>> {
    const ms = MOCK_MILESTONES.find((m) => m.id === milestoneId);
    if (!ms) return { success: false, error: "Milestone not found" };
    const updated = { ...ms, status: "completed" as const, completedAt: Date.now() };
    return { success: true, data: updated, transactionId: `mock_tx_${Date.now()}` };
  }

  async getCampaignProgress(campaignId: string): Promise<ServiceResponse<{ completed: number; total: number; percent: number }>> {
    const ms = MOCK_MILESTONES.filter((m) => m.campaignId === campaignId);
    const totalRequired = ms.reduce((s, m) => s + BigInt(m.fundingRequired), 0n);
    const completedReq  = ms
      .filter((m) => m.status === "completed")
      .reduce((s, m) => s + BigInt(m.fundingRequired), 0n);
    const percent = totalRequired > 0n ? Number((completedReq * 10000n) / totalRequired) / 100 : 0;
    return {
      success: true,
      data: { completed: ms.filter((m) => m.status === "completed").length, total: ms.length, percent },
    };
  }
}

export function createMilestoneService(us: UserSession | null): MilestoneService {
  return new MilestoneService(us);
}
