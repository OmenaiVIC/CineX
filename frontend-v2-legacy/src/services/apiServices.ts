import { api, ApiClientError } from '../utils/apiClient';
import type {
  ServiceResponse, Profile, Rating, FeedEvent, PaginatedResponse,
  UserSettings, Milestone, Campaign, CredibilitySummary
} from '../types';

function toServiceResponse<T>(data: T): ServiceResponse<T> {
  return { success: true, data };
}

function toError<T>(err: unknown): ServiceResponse<T> {
  const msg = err instanceof ApiClientError ? err.message : 'Network error';
  return { success: false, error: msg };
}

export class ApiProfileService {
  async getProfile(address: string): Promise<ServiceResponse<Profile>> {
    try {
      const data = await api.get<{ profile: Profile; portfolio: unknown[]; ratings: unknown[]; ratingSummary: { avg_score: number; count: number } }>(`/api/profiles/${address}`);
      return toServiceResponse({
        address: data.profile.address ?? address,
        displayName: data.profile.username,
        bio: data.profile.bio,
        avatarUrl: data.profile.avatar_url,
        isOnboarded: true,
        joinedAt: data.profile.created_at ? Number(data.profile.created_at) * 1000 : Date.now(),
        socialLinks: {
          ...(data.profile.social_twitter ? { twitter: data.profile.social_twitter } : {}),
          ...(data.profile.social_instagram ? { instagram: data.profile.social_instagram } : {}),
          ...(data.profile.social_website ? { website: data.profile.social_website } : {}),
        },
        reputationScore: data.ratingSummary.avg_score,
        ratingCount: data.ratingSummary.count,
      });
    } catch (err) { return toError(err); }
  }

  async updateProfile(_changes: Partial<Profile>): Promise<ServiceResponse<Profile>> {
    return { success: false, error: 'Update via PUT /api/profiles/:address' };
  }

  async searchProfiles(_query: string): Promise<ServiceResponse<Profile[]>> {
    return { success: false, error: 'Not implemented' };
  }

  async getRecentProfiles(_limit?: number): Promise<ServiceResponse<Profile[]>> {
    return { success: false, error: 'Not implemented' };
  }
}

export class ApiReputationService {
  async getProfileRatings(address: string): Promise<ServiceResponse<Rating[]>> {
    try {
      const data = await api.get<{ ratings: Rating[]; summary: { avg_score: number; count: number } }>(`/api/profiles/${address}/ratings`);
      return toServiceResponse(data.ratings);
    } catch (err) { return toError(err); }
  }

  async getAverageRating(address: string): Promise<ServiceResponse<number>> {
    try {
      const data = await api.get<{ ratings: unknown[]; summary: { avg_score: number; count: number } }>(`/api/profiles/${address}/ratings`);
      return toServiceResponse(data.summary.avg_score);
    } catch (err) { return toError(err); }
  }

  async submitRating(ratee: string, score: number, review?: string, category?: string): Promise<ServiceResponse<Rating>> {
    try {
      const data = await api.post<Rating>(`/api/profiles/${ratee}/ratings`, { raterAddress: ratee, score, comment: review, projectId: category });
      return toServiceResponse(data);
    } catch (err) { return toError(err); }
  }

  async getRatingSummary(address: string): Promise<ServiceResponse<Record<number, number>>> {
    try {
      const data = await api.get<{ ratings: Rating[]; summary: { avg_score: number; count: number } }>(`/api/profiles/${address}/ratings`);
      const summary: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
      for (const r of data.ratings) summary[r.score] = (summary[r.score] || 0) + 1;
      return toServiceResponse(summary);
    } catch (err) { return toError(err); }
  }
}

export class ApiFeedService {
  async getFeed(params?: { type?: string; page?: number; limit?: number }): Promise<ServiceResponse<PaginatedResponse<FeedEvent>>> {
    try {
      const offset = params?.page ? (params.page - 1) * (params.limit || 20) : 0;
      const limit = params?.limit || 20;
      const q = `?offset=${offset}&limit=${limit}${params?.type ? `&type=${params.type}` : ''}`;
      const data = await api.get<{ events: FeedEvent[]; pagination: { offset: number; limit: number; total: number } }>(`/api/feed/global${q}`);
      return toServiceResponse({
        items: data.events,
        totalItems: data.pagination.total,
        totalPages: Math.ceil(data.pagination.total / limit),
        currentPage: params?.page || 1,
        hasNext: data.pagination.offset + limit < data.pagination.total,
        hasPrevious: (params?.page || 1) > 1,
      });
    } catch (err) { return toError(err); }
  }

  async getUserFeed(address: string, params?: { page?: number; limit?: number }): Promise<ServiceResponse<PaginatedResponse<FeedEvent>>> {
    try {
      const offset = params?.page ? (params.page - 1) * (params.limit || 20) : 0;
      const limit = params?.limit || 20;
      const data = await api.get<{ events: FeedEvent[]; pagination: { offset: number; limit: number; total: number } }>(`/api/feed/user/${address}?offset=${offset}&limit=${limit}`);
      return toServiceResponse({
        items: data.events,
        totalItems: data.pagination.total,
        totalPages: Math.ceil(data.pagination.total / limit),
        currentPage: params?.page || 1,
        hasNext: data.pagination.offset + limit < data.pagination.total,
        hasPrevious: (params?.page || 1) > 1,
      });
    } catch (err) { return toError(err); }
  }

  async publishEvent(_event: Omit<FeedEvent, 'id'>): Promise<ServiceResponse<FeedEvent>> {
    return { success: false, error: 'Not implemented via API' };
  }
}

export class ApiUserSettingsService {
  async getSettings(address: string): Promise<ServiceResponse<UserSettings>> {
    try {
      const data = await api.get<{ address: string; role: string; onboarding_completed: number; notifications: string; privacy: string; display: string; default_network: string }>(`/api/user-settings/${address}`);
      return toServiceResponse({
        notifications: data.notifications ? JSON.parse(data.notifications) : { email: false, inApp: true, milestones: true },
        privacy: data.privacy ? JSON.parse(data.privacy) : { showPortfolio: true, showActivity: false },
        display: data.display ? JSON.parse(data.display) : { theme: 'dark' as const, language: 'en' },
        defaultNetwork: (data.default_network as 'testnet' | 'mainnet') || 'testnet',
      });
    } catch (err) { return toError(err); }
  }

  async updateSettings(_address: string, _changes: Partial<UserSettings>): Promise<ServiceResponse<UserSettings>> {
    return { success: false, error: 'Not implemented via API' };
  }

  async resetDefaults(_address: string): Promise<ServiceResponse<UserSettings>> {
    return { success: false, error: 'Not implemented via API' };
  }
}

export class ApiAiService {
  private useMock: boolean;

  constructor(useMock: boolean) {
    this.useMock = useMock;
  }

  async getRecommendations(_address: string): Promise<ServiceResponse<unknown[]>> {
    if (this.useMock) {
      return toServiceResponse([
        { id: 'campaign-12', title: 'Voices of the Valley', reason: 'Matches your interest in documentary filmmaking', matchScore: 92 },
        { id: 'pool-1', name: 'Short Film Collective Q3', reason: 'Great fit based on your portfolio', matchScore: 88 },
      ]);
    }
    return toServiceResponse([]);
  }

  async getMatchSuggestions(_profile?: { categories?: string[]; address?: string }): Promise<ServiceResponse<unknown[]>> {
    if (this.useMock) {
      return toServiceResponse([
        { address: 'SP3X6QWWETNB4GB6B6W6Z1S2SQE3X6QWWETNB4GB', displayName: 'Bob Producer', commonInterests: ['documentary', 'short-film'], matchScore: 85, reason: 'Bob is looking for an editor' },
      ]);
    }
    return toServiceResponse([]);
  }

  async analyzeProjectDescription(_text: string): Promise<ServiceResponse<{ category: string; tags: string[]; summary: string; sentiment: 'positive' | 'neutral' | 'negative' }>> {
    return toServiceResponse({ category: 'short-film', tags: [], summary: 'AI analysis will be available post-launch.', sentiment: 'neutral' });
  }

  async getCredibilitySummary(address: string): Promise<ServiceResponse<CredibilitySummary>> {
    try {
      const data = await api.post<CredibilitySummary>('/api/ai/summary', { address });
      return toServiceResponse(data);
    } catch (err) {
      const message = err instanceof ApiClientError ? err.message : 'Failed to generate AI summary';
      return { success: false, error: message };
    }
  }
}

export class ApiMilestoneService {
  async getMilestones(campaignId: string): Promise<ServiceResponse<Milestone[]>> {
    const data = await api.get<Milestone[]>(`/api/campaigns/${campaignId}/milestones`).catch(() => null);
    if (data) return toServiceResponse(data);
    return { success: false, error: 'Milestones not available' };
  }

  async createMilestone(_params: Omit<Milestone, 'id'>): Promise<ServiceResponse<Milestone>> {
    return { success: false, error: 'Not implemented via API' };
  }

  async completeMilestone(_milestoneId: string): Promise<ServiceResponse<Milestone>> {
    return { success: false, error: 'Not implemented via API' };
  }

  async getCampaignProgress(_campaignId: string): Promise<ServiceResponse<{ completed: number; total: number; percent: number }>> {
    return { success: false, error: 'Not implemented via API' };
  }
}

export class ApiPoolService {
  async getPools(_params?: { category?: string; status?: string; page?: number; limit?: number }): Promise<ServiceResponse<PaginatedResponse<unknown>>> {
    return { success: false, error: 'Not implemented via API' };
  }

  async getPoolDetails(_poolId: string): Promise<ServiceResponse<unknown>> {
    return { success: false, error: 'Not implemented via API' };
  }

  async createPool(_params: Partial<unknown>): Promise<ServiceResponse<unknown>> {
    return { success: false, error: 'Not implemented via API' };
  }

  async joinPool(_poolId: string, _amount: string): Promise<ServiceResponse<unknown>> {
    return { success: false, error: 'Not implemented via API' };
  }

  async getPoolMembers(_poolId: string): Promise<ServiceResponse<unknown[]>> {
    return { success: false, error: 'Not implemented via API' };
  }
}

export class ApiCrowdfundingService { /* keep mock-only — on-chain contract calls */ }
export class ApiCoEPService { /* keep mock-only — on-chain contract calls */ }
export class ApiEscrowService { /* keep mock-only — on-chain contract calls */ }
export class ApiEmergencyService { /* keep mock-only — on-chain contract calls */ }
export class ApiVerificationService { /* keep mock-only awaiting smart contract integration */ }
