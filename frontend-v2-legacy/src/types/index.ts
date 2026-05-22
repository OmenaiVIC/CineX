// Common types and interfaces used across all CineX services

// Service response wrapper
export interface ServiceResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  transactionId?: string;
}

// Transaction status types
export type TransactionStatus = 'pending' | 'success' | 'failed' | 'cancelled';

// Network types
export type NetworkType = 'testnet' | 'mainnet';

// Base transaction interface
export interface BaseTransaction {
  txId: string;
  status: TransactionStatus;
  timestamp: number;
  blockHeight?: number;
  fee?: string;
}

// User and authentication types
export interface UserProfile {
  address: string;
  isVerified: boolean;
  verificationLevel: 'unverified' | '1-tier' | '2-tier' | '3-tier';
  username?: string;
  bio?: string;
  portfolioUrl?: string;
  socialLinks?: {
    twitter?: string;
    instagram?: string;
    website?: string;
  };
}

// Campaign related types
export interface Campaign {
  id: string;
  title: string;
  description: string;
  creator: string; // Stacks address
  targetAmount: string; // In microSTX
  currentAmount: string; // In microSTX
  deadline: number; // Unix timestamp
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
  amount: string; // In microSTX
  timestamp: number;
  txId: string;
  message?: string;
}

// Governance Pool related types
export interface GovernancePool {
  id: string;
  name: string;
  description: string;
  creator: string; // Stacks address
  targetAmount: string; // In microSTX
  currentAmount: string; // In microSTX
  minContribution: string; // In microSTX
  minReputation: number;
  duration: number; // In blocks
  maxMembers: number;
  memberCount: number;
  status: 'active' | 'completed' | 'closed';
  createdAt: number;
  expiresAt: number;
  members: PoolMember[];
  proposals: GovernanceProposal[];
}

export interface PoolMember {
  address: string;
  amount: string; // In microSTX
  joinedAt: number;
}

export interface GovernanceProposal {
  id: string;
  poolId: string;
  proposer: string;
  campaignId: string;
  title: string;
  description: string;
  amount: string; // In microSTX
  status: 'active' | 'passed' | 'executed' | 'rejected';
  createdAt: number;
  deadline: number;
  yesVotes: number;
  noVotes: number;
  totalVotes: number;
  voters: Vote[];
}

export interface Vote {
  voter: string;
  support: boolean;
  amount: string;
  timestamp: number;
}

// Escrow related types
export interface EscrowDeposit {
  id: string;
  depositor: string;
  amount: string; // In microSTX
  purpose: 'campaign' | 'pool-contribution' | 'verification-bond';
  relatedId: string; // Campaign ID or Pool ID
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

// Verification related types
export interface VerificationApplication {
  id: string;
  applicant: string;
  name: string;
  bio: string;
  portfolioUrl?: string;
  previousWorks: string[];
  socialMedia: {
    twitter?: string;
    linkedin?: string;
    instagram?: string;
    website?: string;
  };
  bondAmount: string;
  documents: {
    identityProof: string;
    portfolioProof?: string;
  };
  status: VerificationStatus;
  submittedAt: number;
  reviewedAt?: number;
  reviewer?: string;
  updatedAt?: number;
  rejectionReason?: string;
}

export interface VerificationDocument {
  type: 'identity' | 'portfolio' | 'references' | 'collaboration-history' | 'social-proof';
  url: string;
  hash: string;
  uploadedAt: number;
  verified: boolean;
}

export interface FilmmakerCredentials {
  address: string;
  verificationLevel: UserProfile['verificationLevel'];
  portfolioItems: PortfolioItem[];
  collaborations: Collaboration[];
  endorsements: Endorsement[];
  achievements: Achievement[];
}

export interface PortfolioItem {
  id: string;
  title: string;
  description: string;
  category: Campaign['category'];
  role: string; // Director, Producer, Writer, etc.
  year: number;
  mediaUrls: string[];
  awards?: string[];
  collaborators?: string[]; // Stacks addresses
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
  endorser: string; // Stacks address
  endorserName?: string;
  rating: number; // 1-5
  comment: string;
  timestamp: number;
  projectId?: string;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  category: 'award' | 'milestone' | 'recognition' | 'completion';
  year: number;
  verificationUrl?: string;
}

// Contract function parameters
export interface CreateCampaignParams {
  title: string;
  description: string;
  targetAmount: string;
  deadline: number;
  category: Campaign['category'];
  mediaUrls?: string[];
  tags?: string[];
  duration?: number;
  rewardTiers?: number;
  rewardDescription?: string;
}

export interface ContributeToCampaignParams {
  campaignId: string;
  amount: string;
  message?: string;
}

export interface CreatePoolParams {
  name: string;
  description?: string;
  targetAmount: string;
  minContribution: string;
  minReputation?: number;
  duration?: number;
  maxMembers?: number;
}

export interface JoinPoolParams {
  poolId: string;
  amount: string;
}

export interface ProposeAllocationParams {
  poolId: string;
  campaignId: string;
  amount: string;
}

export interface VoteOnProposalParams {
  proposalId: string;
  approve: boolean;
}

export interface ExecuteAllocationParams {
  proposalId: string;
}

export interface ContributeToPoolParams {
  poolId: string;
  amount: string;
}

// Note: SubmitVerificationParams is defined in the service layer to avoid conflicts

// Error types
export interface ServiceError {
  code: string;
  message: string;
  details?: any;
  userMessage: string; // User-friendly error message
}

// Pagination
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

// Filter types
export interface CampaignFilters {
  category?: Campaign['category'];
  status?: Campaign['status'];
  minAmount?: string;
  maxAmount?: string;
  search?: string;
}

export interface PoolFilters {
  status?: GovernancePool['status'];
  minAmount?: string;
  maxAmount?: string;
  search?: string;
}

// Additional verification types for service layer
export type VerificationStatus = 'pending' | 'under-review' | 'approved' | 'rejected';

export interface VerifiedFilmmaker {
  address: string;
  name: string;
  bio: string;
  portfolioUrl?: string;
  previousWorks: string[];
  socialMedia: {
    twitter?: string;
    linkedin?: string;
    instagram?: string;
    website?: string;
  };
  verifiedAt: number;
  credibilityScore: number;
  completedCampaigns: number;
  totalFundedAmount: string; // In microSTX
}

// ===========================================================================
// Day 1 — New types for Reputation, Feed, Settings, Milestones
// ===========================================================================

/**
 * Profile
 * -------
 * Off-chain user profile for the CineX platform.  Sits alongside the
 * on-chain UserProfile and holds display-friendly fields that don't
 * need to live on the blockchain.
 */
export interface Profile {
  /** Stacks address this profile belongs to */
  address: string;
  /** Display name (may differ from the on-chain username) */
  displayName?: string;
  /** Short bio / tagline */
  bio?: string;
  /** Avatar image URL */
  avatarUrl?: string;
  /** Whether the user has completed the off-chain onboarding */
  isOnboarded: boolean;
  /** Unix ms timestamp of first profile creation */
  joinedAt: number;
  /** External links the user wants to share */
  socialLinks: Record<string, string>;
  /** Aggregate reputation score (0-5, from Rating entries) */
  reputationScore: number;
  /** Total number of ratings received */
  ratingCount: number;
}

/**
 * Rating
 * ------
 * A single peer-to-peer reputation rating.  Stored off-chain and
 * aggregated into the Profile.reputationScore.
 */
export interface Rating {
  /** Unique rating id */
  id: string;
  /** Stacks address of the rater */
  rater: string;
  /** Stacks address of the person being rated */
  ratee: string;
  /** Numeric score 1–5 */
  score: number;
  /** Optional written review */
  review?: string;
  /** Context category (collaboration, reliability, communication, etc.) */
  category?: string;
  /** Unix ms timestamp */
  createdAt: number;
  /** Optional project or campaign the rating relates to */
  projectId?: string;
}

/**
 * FeedEvent
 * ---------
 * A single entry in the activity feed shown on the dashboard.
 */
export interface FeedEvent {
  /** Unique feed event id */
  id: string;
  /** Machine-readable type for UI icons / filtering */
  type:
    | "campaign_created"
    | "campaign_funded"
    | "pool_formed"
    | "milestone_reached"
    | "rating_received"
    | "profile_updated"
    | "verification_granted"
    | "system";
  /** Stacks address that triggered the event */
  actor: string;
  /** Optional id of the related entity (campaign, pool, etc.) */
  targetId?: string;
  /** Human-readable one-line summary */
  summary: string;
  /** Arbitrary extra data (render hints, links, etc.) */
  metadata?: Record<string, unknown>;
  /** Unix ms timestamp */
  createdAt: number;
}

/**
 * UserSettings
 * ------------
 * Per-user preferences persisted off-chain.
 */
export interface UserSettings {
  /** Notification toggles */
  notifications: {
    email: boolean;
    inApp: boolean;
    milestones: boolean;
  };
  /** Privacy controls */
  privacy: {
    showPortfolio: boolean;
    showActivity: boolean;
  };
  /** Display preferences */
  display: {
    theme: "dark" | "light" | "system";
    language: string;
  };
  /** Preferred Stacks network */
  defaultNetwork: "testnet" | "mainnet";
}

/**
 * Milestone
 * ---------
 * A funding / development milestone within a campaign.
 */
export interface Milestone {
  /** Unique milestone id */
  id: string;
  /** Campaign this milestone belongs to */
  campaignId: string;
  /** Short display title */
  title: string;
  /** Detailed description */
  description: string;
  /** STX needed (in microSTX) to unlock this milestone */
  fundingRequired: string;
  /** Unix ms deadline */
  deadline: number;
  /** Current status */
  status: "pending" | "active" | "completed" | "failed";
  /** Optional list of deliverable descriptions */
  deliverables?: string[];
  /** Unix ms when the milestone was actually completed */
  completedAt?: number;
}

// ===========================================================================
// Day 2.5 — Onboarding & Role types
// ===========================================================================

export type UserRole = 'creative' | 'backer';

export interface OnboardingState {
  address: string;
  role: UserRole | null;
  isOnboarded: boolean;
  isDemo: boolean;
}

// ===========================================================================
// Day 3.5 — Dashboard data types
// ===========================================================================

export interface DashboardStats {
  activeCampaigns: number;
  totalRaised: string;
  reputationScore: number;
  activePools: number;
  totalContributed: string;
  yieldEarned: string;
  backedCreators: number;
}

export interface YieldData {
  totalYield: string;
  strategies: YieldStrategy[];
  isLoading: boolean;
}

export interface YieldStrategy {
  id: string;
  name: string;
  apr: string;
  deposited: string;
  status: 'active' | 'pending' | 'ended';
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

/**
 * CredibilitySummary
 * ------------------
 * AI-generated credibility assessment for a user profile.
 * Returned by POST /api/ai/summary on the backend.
 */
export interface CredibilitySummary {
  address: string;
  summary: string;
  generatedAt: string;
  model: string;
  disclaimer: string;
}
