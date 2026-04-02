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

// Co-EP Pool related types
export interface CoEPPool {
  id: string;
  name: string;
  description: string;
  creator: string; // Stacks address
  maxMembers: number;
  currentMembers: number;
  contributionAmount: string; // In microSTX per rotation
  cycleDuration: number; // In blocks
  category: 'short-film' | 'feature' | 'documentary' | 'music-video' | 'web-series';
  geographicFocus: 'bollywood' | 'hollywood' | 'nollywood' | 'global';
  status: 'forming' | 'active' | 'completed' | 'paused';
  createdAt: number;
  currentRotation: number;
  totalRotations: number;
  legalAgreementHash?: string;
}

export interface PoolMember {
  poolId: string;
  address: string;
  joinedAt: number;
  rotationOrder: number;
  hasBenefited: boolean;
  contributionsMade: number;
  isActive: boolean;
  verificationStatus: UserProfile['verificationLevel'];
}

export interface PoolRotation {
  poolId: string;
  rotationNumber: number;
  beneficiary: string;
  amount: string; // In microSTX
  startBlock: number;
  endBlock: number;
  status: 'upcoming' | 'active' | 'completed' | 'failed';
  project?: {
    title: string;
    description: string;
    mediaUrls?: string[];
  };
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
}

export interface ContributeToCampaignParams {
  campaignId: string;
  amount: string;
  message?: string;
}

export interface CreatePoolParams {
  name: string;
  description: string;
  maxMembers: number;
  contributionAmount: string;
  cycleDuration: number;
  category: CoEPPool['category'];
  geographicFocus: CoEPPool['geographicFocus'];
  legalAgreementHash?: string;
}

export interface JoinPoolParams {
  poolId: string;
  rotationOrder: number;
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
  category?: CoEPPool['category'];
  geographicFocus?: CoEPPool['geographicFocus'];
  status?: CoEPPool['status'];
  hasSpace?: boolean;
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