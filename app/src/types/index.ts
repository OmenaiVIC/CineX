export interface ServiceResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  transactionId?: string;
}

export type TransactionStatus = 'pending' | 'success' | 'failed' | 'cancelled';
export type NetworkType = 'testnet' | 'mainnet';

export interface BaseTransaction {
  txId: string;
  status: TransactionStatus;
  timestamp: number;
  blockHeight?: number;
  fee?: string;
}

export interface UserProfile {
  address: string;
  isVerified: boolean;
  verificationLevel: 'unverified' | '1-tier' | '2-tier' | '3-tier';
  username?: string;
  bio?: string;
  portfolioUrl?: string;
  socialLinks?: { twitter?: string; instagram?: string; website?: string };
}

export interface Campaign {
  id: string;
  title: string;
  description: string;
  creator: string;
  targetAmount: string;
  currentAmount: string;
  deadline: number;
  category: 'short-film' | 'feature' | 'documentary' | 'music-video' | 'web-series';
  status: 'active' | 'funded' | 'failed' | 'completed';
  createdAt: number;
  updatedAt: number;
  mediaUrls?: string[];
  tags?: string[];
}

export interface CampaignContribution {
  campaignId: string;
  contributor: string;
  amount: string;
  timestamp: number;
  txId: string;
  message?: string;
  chainUrl?: string;
}

export interface EscrowDeposit {
  id: string;
  depositor: string;
  amount: string;
  purpose: 'campaign' | 'pool-contribution' | 'verification-bond';
  relatedId: string;
  status: 'pending' | 'locked' | 'released' | 'refunded';
  createdAt: number;
  releaseConditions?: string[];
}

export interface EscrowRelease {
  escrowId: string;
  recipient: string;
  amount: string;
  reason: string;
  txId: string;
  timestamp: number;
}

export interface VerificationApplication {
  id: string;
  applicant: string;
  name: string;
  bio: string;
  portfolioUrl?: string;
  previousWorks: string[];
  socialMedia: { twitter?: string; linkedin?: string; instagram?: string; website?: string };
  bondAmount: string;
  documents: { identityProof: string; portfolioProof?: string };
  status: VerificationStatus;
  submittedAt: number;
  reviewedAt?: number;
  reviewer?: string;
  updatedAt?: number;
  rejectionReason?: string;
}

type VerificationStatus = 'pending' | 'under-review' | 'approved' | 'rejected';

export interface VerifiedFilmmaker {
  address: string;
  name: string;
  bio: string;
  portfolioUrl?: string;
  previousWorks: string[];
  socialMedia: { twitter?: string; linkedin?: string; instagram?: string; website?: string };
  verifiedAt: number;
  credibilityScore: number;
  completedCampaigns: number;
  totalFundedAmount: string;
}

export interface PortfolioItem {
  id: string;
  address: string;
  title: string;
  description: string;
  category: Campaign['category'];
  role: string;
  year: number;
  mediaUrls: string[];
  awards?: string[];
  collaborators?: string[];
}

export interface Collaboration {
  id: string;
  projectTitle: string;
  collaboratorAddress: string;
  role: string;
  year: number;
  verified: boolean;
}

export interface Endorsement {
  id: string;
  endorser: string;
  endorserName?: string;
  rating: number;
  comment: string;
  timestamp: number;
  projectId?: string;
}

export interface ServiceError {
  code: string;
  message: string;
  details?: any;
  userMessage: string;
}

export interface PaginationParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  items: T[];
  totalItems: number;
  totalPages: number;
  currentPage: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

export interface Profile {
  address: string;
  displayName?: string;
  bio?: string;
  avatarUrl?: string;
  isOnboarded: boolean;
  joinedAt: number;
  socialLinks: Record<string, string>;
  reputationScore: number;
  ratingCount: number;
}

export interface Rating {
  id: string;
  rater: string;
  ratee: string;
  score: number;
  review?: string;
  category?: string;
  createdAt: number;
  projectId?: string;
}

export interface FeedEvent {
  id: string;
  type: 'campaign_created' | 'campaign_funded' | 'pool_formed' | 'milestone_reached' | 'rating_received' | 'profile_updated' | 'verification_granted' | 'system';
  actor: string;
  targetId?: string;
  summary: string;
  metadata?: Record<string, unknown>;
  createdAt: number;
}

export interface UserSettings {
  notifications: { email: boolean; inApp: boolean; milestones: boolean };
  privacy: { showPortfolio: boolean; showActivity: boolean };
  display: { theme: 'dark' | 'light' | 'system'; language: string };
  defaultNetwork: 'testnet' | 'mainnet';
}

export interface Milestone {
  id: string;
  campaignId: string;
  title: string;
  description: string;
  fundingRequired: string;
  deadline: number;
  status: 'pending' | 'active' | 'completed' | 'failed';
  deliverables?: string[];
  completedAt?: number;
}

export type UserRole = 'creative' | 'backer';

export interface OnboardingState {
  address: string;
  role: UserRole | null;
  isOnboarded: boolean;
  isDemo: boolean;
}

export interface DashboardStats {
  activeCampaigns: number;
  totalRaised: string;
  reputationScore: number;
  activePools: number;
  totalContributed: string;
  yieldEarned: string;
  backedCreators: number;
}

export interface Pool {
  id: string;
  name: string;
  description: string;
  creator: string;
  maxMembers: number;
  currentMembers: number;
  contributionAmount: string;
  category: string;
  status: 'open' | 'active' | 'funded' | 'closed';
  deadline: number;
  targetAmount: string;
  currentAmount: string;
}

export interface CredibilitySummary {
  address: string;
  summary: string;
  generatedAt: string;
  model: string;
  disclaimer: string;
}

export interface CreateCampaignParams {
  title: string;
  description: string;
  targetAmount: string;
  deadline: number;
  category: Campaign['category'];
  mediaUrls?: string[];
  tags?: string[];
}

export interface ContributeToCampaignParams {
  campaignId: string;
  amount: string;
  message?: string;
}
