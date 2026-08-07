// ---------------------------------------------------------------------------
// Frontend view-model vocabulary (component contract — do not rename).
// These are the shapes the routes render. The store maps backend rows into
// these. Keep this section identical to what the components already import.
// ---------------------------------------------------------------------------

export type Role = "Creative" | "Backer" | "Gatekeeper";
export type VerificationTier = "Unverified" | "Basic" | "Standard";
export type PresetPortfolioCategory =
  | "Acting"
  | "Animation"
  | "App & Web Development"
  | "Architecture & Interior Design"
  | "Arts Education & Mentorship"
  | "Beauty & Makeup Artistry"
  | "Ceramics & Crafts"
  | "Cinematography"
  | "Comedy"
  | "Commercial / Advertising"
  | "Comics & Graphic Novels"
  | "Costume Design"
  | "Creative Direction"
  | "Cultural Heritage & Preservation"
  | "Curatorial & Exhibition"
  | "Dance & Choreography"
  | "Digital & Generative Art"
  | "DJ & Electronic Music"
  | "Documentary"
  | "Editing & Publishing"
  | "Esports & Streaming"
  | "Event Production & Management"
  | "Fashion Design"
  | "Fashion Styling"
  | "Feature Film"
  | "Fiction Writing"
  | "Film Direction"
  | "Film Editing"
  | "Film Production"
  | "Game Art & Design"
  | "Game Development"
  | "Graphic Design"
  | "Illustration"
  | "Indigenous & Traditional Arts"
  | "Licensing & IP Management"
  | "Live Performance / Concerts"
  | "Model / Talent"
  | "Motion Graphics"
  | "Music Production"
  | "Music Publishing"
  | "Music Video"
  | "Non-fiction & Journalism"
  | "Opera & Musical Theatre"
  | "Painting"
  | "Photography"
  | "Podcast & Audio Storytelling"
  | "Poetry"
  | "Printmaking"
  | "Product & Industrial Design"
  | "Puppetry & Circus Arts"
  | "Screenwriting"
  | "Sculpture & Installation"
  | "Short Film"
  | "Songwriting & Composition"
  | "Sound Design"
  | "Sound Engineering"
  | "Spoken Word & Poetry"
  | "Talent & Artist Management"
  | "Television / Series"
  | "Textile Design"
  | "Theatre & Drama"
  | "Translation"
  | "UI/UX Design"
  | "VFX & Post-Production"
  | "Web Series"
  | "XR / VR / AR"
  | "Other";
export type PortfolioCategory = PresetPortfolioCategory | (string & {});
export type PortfolioSector =
  | "Film & TV"
  | "Music & Audio"
  | "Fashion & Beauty"
  | "Visual Arts & Design"
  | "Performing Arts"
  | "Writing & Publishing"
  | "Games & Interactive"
  | "Heritage & Culture"
  | "Creative Services"
  | "Other";
export type MilestoneStatus = "Pending" | "Approved" | "Released" | "Disputed";
export type TransactionStatus = "Pending" | "Approved" | "Released";

export interface PortfolioItem {
  id: string;
  title: string;
  description: string;
  mediaUrl: string;
  year: number;
  category: PortfolioCategory;
}

export interface Endorsement {
  id: string;
  endorserName: string;
  letter: string;
  url: string;
  timestamp: string;
  creativeId: string;
}

export interface MilestoneVotes {
  yes: number;
  no: number;
  yesAmount: number;
  noAmount: number;
}

export interface Milestone {
  id: string;
  description: string;
  amount: number;
  status: MilestoneStatus;
  votes: MilestoneVotes;
  voters: Record<string, "yes" | "no">;
  myVote?: "yes" | "no";
}

export interface Contribution {
  userId: string;
  userName: string;
  amount: number;
  timestamp: string;
}

export interface Campaign {
  id: string;
  title: string;
  description: string;
  fundingTarget: number;
  raised: number;
  creatorId: string;
  creatorName: string;
  category: PortfolioCategory;
  coverTone: string;
  mediaUrl?: string;
  contributions: Contribution[];
  milestones: Milestone[];
}

export interface Transaction {
  id: string;
  type: string;
  amount: number;
  currency: "NGN" | "USDCx";
  status: TransactionStatus;
  timestamp: string;
}

export interface Wallet {
  ngnBalance: number;
  usdcxBalance: number;
  transactions: Transaction[];
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  verificationTier: VerificationTier;
  reputationScore: number;
  bio: string;
  portfolio: PortfolioItem[];
  endorsements: Endorsement[];
}

export const TIER_CAPS: Record<VerificationTier, number | null> = {
  Unverified: 1000,
  Basic: 10000,
  Standard: null,
};

export const CATEGORIES: PresetPortfolioCategory[] = [
  "Acting",
  "Animation",
  "App & Web Development",
  "Architecture & Interior Design",
  "Arts Education & Mentorship",
  "Beauty & Makeup Artistry",
  "Ceramics & Crafts",
  "Cinematography",
  "Comedy",
  "Commercial / Advertising",
  "Comics & Graphic Novels",
  "Costume Design",
  "Creative Direction",
  "Cultural Heritage & Preservation",
  "Curatorial & Exhibition",
  "Dance & Choreography",
  "Digital & Generative Art",
  "DJ & Electronic Music",
  "Documentary",
  "Editing & Publishing",
  "Esports & Streaming",
  "Event Production & Management",
  "Fashion Design",
  "Fashion Styling",
  "Feature Film",
  "Fiction Writing",
  "Film Direction",
  "Film Editing",
  "Film Production",
  "Game Art & Design",
  "Game Development",
  "Graphic Design",
  "Illustration",
  "Indigenous & Traditional Arts",
  "Licensing & IP Management",
  "Live Performance / Concerts",
  "Model / Talent",
  "Motion Graphics",
  "Music Production",
  "Music Publishing",
  "Music Video",
  "Non-fiction & Journalism",
  "Opera & Musical Theatre",
  "Painting",
  "Photography",
  "Podcast & Audio Storytelling",
  "Poetry",
  "Printmaking",
  "Product & Industrial Design",
  "Puppetry & Circus Arts",
  "Screenwriting",
  "Sculpture & Installation",
  "Short Film",
  "Songwriting & Composition",
  "Sound Design",
  "Sound Engineering",
  "Spoken Word & Poetry",
  "Talent & Artist Management",
  "Television / Series",
  "Textile Design",
  "Theatre & Drama",
  "Translation",
  "UI/UX Design",
  "VFX & Post-Production",
  "Web Series",
  "XR / VR / AR",
  "Other",
];

// ---------------------------------------------------------------------------
// Backend vocabulary (CineX API). The API camelCases keys (snake_to_camel) but
// does NOT parse JSON-string fields, so `parseStringArray` is used for those.
// ---------------------------------------------------------------------------

export type BackendRole = "creative" | "backer" | "admin";
export type BackendVerificationLevel = "unverified" | "1-tier" | "2-tier" | "3-tier";
export type BackendCategory = "short-film" | "feature" | "documentary" | "music-video" | "web-series";
export type BackendCampaignStatus = "active" | "funded" | "failed" | "completed";
export type BackendMilestoneStatus = "pending" | "active" | "completed" | "failed";
export type BackendTransactionStatus = "pending" | "confirmed" | "failed" | "cancelled";
export type BackendWalletStatus = "pending" | "active" | "suspended";
export type BackendTransactionType = "deposit" | "withdrawal" | "send" | "receive" | "fee" | "swap";
export type Currency = "NGN" | "USD";

export interface SessionUser {
  id: number;
  address: string | null;
  displayName: string;
  email: string | null;
  role: BackendRole;
}

export interface ProfileRow {
  address: string;
  username: string | null;
  bio: string | null;
  avatarUrl: string | null;
  portfolioUrl: string | null;
  socialTwitter: string | null;
  socialInstagram: string | null;
  socialWebsite: string | null;
  verificationLevel: BackendVerificationLevel;
  createdAt: string;
  updatedAt: string;
}

export interface PortfolioItemRow {
  id: number;
  address: string;
  title: string;
  description: string | null;
  category: BackendCategory;
  role: string | null;
  year: number | null;
  mediaUrls: string[];
  awards: string[];
  createdAt: string;
  updatedAt: string;
}

export interface RatingRow {
  id: number;
  raterAddress: string;
  targetAddress: string;
  score: number;
  comment: string | null;
  commentHash: string | null;
  txId: string | null;
  projectId: number | null;
  category: string | null;
  createdAt: string;
}

export interface RatingSummary {
  avgScore: number;
  count: number;
}

export interface CampaignRow {
  id: number;
  title: string;
  description: string | null;
  creator: string;
  targetAmount: string;
  currentAmount: string;
  deadline: number;
  category: string;
  status: BackendCampaignStatus;
  mediaUrls: string[];
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ContributionRow {
  id: number;
  campaignId: number;
  contributor: string;
  amount: string;
  txId: string | null;
  message: string | null;
  createdAt: string;
}

export interface MilestoneRow {
  id: number;
  campaignId: number;
  title: string | null;
  description: string | null;
  fundingRequired: string;
  deadline: number;
  status: BackendMilestoneStatus;
  deliverables: string[];
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MilestoneVoteRow {
  id: number;
  milestoneId: number;
  voterAddress: string;
  contributionWeight: string;
  approved: number;
  createdAt: string;
}

export interface VoteResult {
  totalYes: number;
  grandTotal: number;
  percent: number;
  passed: boolean;
}

export interface WalletRow {
  id: number;
  userId: string;
  email: string | null;
  phone: string | null;
  pillarWalletAddress: string | null;
  bnsName: string | null;
  stxAddress: string | null;
  btcAddress: string | null;
  status: BackendWalletStatus;
  nairaBalance: number;
  sbtcBalance: string;
  usdBalance: number;
  preferredCurrency: Currency;
  createdAt: string;
  updatedAt: string;
}

export interface WalletTransactionRow {
  id: number;
  walletId: number;
  type: BackendTransactionType;
  amountNaira: number | null;
  amountUsd: number | null;
  amountSbtc: string | null;
  asset: string | null;
  status: BackendTransactionStatus;
  reference: string | null;
  txId: string | null;
  counterparty: string | null;
  conversionRateNgnUsd: number | null;
  description: string | null;
  metadata: string | null;
  createdAt: string;
  confirmedAt: string | null;
}

export function parseStringArray(value: string | null | undefined): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function parseNumber(value: string | number | null | undefined): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === "number") return value;
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

// ---------------------------------------------------------------------------
// Vocabulary mapping — frontend view-model values <-> backend vocab.
// The backend is film-centric; these maps are intentionally lossy.
// ---------------------------------------------------------------------------

// The backend is film-centric; categories are grouped into sectors that map
// (intentionally lossily) onto the backend vocabulary.
export const CATEGORY_TO_BACKEND: Record<PortfolioSector, BackendCategory> = {
  "Film & TV": "feature",
  "Music & Audio": "music-video",
  "Fashion & Beauty": "short-film",
  "Visual Arts & Design": "short-film",
  "Performing Arts": "short-film",
  "Writing & Publishing": "short-film",
  "Games & Interactive": "web-series",
  "Heritage & Culture": "documentary",
  "Creative Services": "short-film",
  Other: "short-film",
};

export const BACKEND_TO_CATEGORY: Record<BackendCategory, PortfolioCategory> = {
  "short-film": "Film",
  feature: "Film",
  documentary: "Film",
  "music-video": "Music",
  "web-series": "Film",
};

export const MILESTONE_STATUS_TO_BACKEND: Record<MilestoneStatus, BackendMilestoneStatus> = {
  Pending: "pending",
  Approved: "active",
  Released: "completed",
  Disputed: "failed",
};

export const BACKEND_TO_MILESTONE_STATUS: Record<BackendMilestoneStatus, MilestoneStatus> = {
  pending: "Pending",
  active: "Approved",
  completed: "Released",
  failed: "Disputed",
};

export const TX_STATUS_TO_BACKEND: Partial<Record<TransactionStatus, BackendTransactionStatus>> = {
  Pending: "pending",
  Approved: "confirmed",
  Released: "confirmed",
};

export const BACKEND_TO_TX_STATUS: Record<BackendTransactionStatus, TransactionStatus> = {
  pending: "Pending",
  confirmed: "Approved",
  failed: "Pending",
  cancelled: "Pending",
};

export const ROLE_TO_BACKEND: Record<Role, BackendRole> = {
  Creative: "creative",
  Backer: "backer",
  Gatekeeper: "admin",
};

export const BACKEND_TO_ROLE: Record<BackendRole, Role> = {
  creative: "Creative",
  backer: "Backer",
  admin: "Gatekeeper",
};

export const VERIFICATION_TIER_TO_LEVEL: Record<VerificationTier, BackendVerificationLevel> = {
  Unverified: "unverified",
  Basic: "1-tier",
  Standard: "3-tier",
};

export const LEVEL_TO_VERIFICATION_TIER: Record<BackendVerificationLevel, VerificationTier> = {
  unverified: "Unverified",
  "1-tier": "Basic",
  "2-tier": "Basic",
  "3-tier": "Standard",
};

export function verificationTierFromLevel(level: string | null | undefined): VerificationTier {
  if (level && level in LEVEL_TO_VERIFICATION_TIER) {
    return LEVEL_TO_VERIFICATION_TIER[level as BackendVerificationLevel];
  }
  return "Unverified";
}

const SECTOR_COVER_TONES: Record<PortfolioSector, string> = {
  "Film & TV": "from-emerald-500/25 to-cyan-500/10",
  "Music & Audio": "from-violet-500/25 to-emerald-500/10",
  "Fashion & Beauty": "from-amber-400/25 to-emerald-500/10",
  "Visual Arts & Design": "from-amber-400/25 to-emerald-500/10",
  "Performing Arts": "from-violet-500/25 to-cyan-500/10",
  "Writing & Publishing": "from-emerald-500/25 to-violet-500/10",
  "Games & Interactive": "from-violet-500/25 to-cyan-500/10",
  "Heritage & Culture": "from-amber-400/25 to-cyan-500/10",
  "Creative Services": "from-emerald-500/25 to-amber-400/10",
  Other: "from-emerald-500/25 to-violet-500/10",
};

export const CATEGORY_TO_SECTOR: Record<PresetPortfolioCategory, PortfolioSector> = {
  Acting: "Performing Arts",
  Animation: "Film & TV",
  "App & Web Development": "Games & Interactive",
  "Architecture & Interior Design": "Visual Arts & Design",
  "Arts Education & Mentorship": "Heritage & Culture",
  "Beauty & Makeup Artistry": "Fashion & Beauty",
  "Ceramics & Crafts": "Visual Arts & Design",
  Cinematography: "Film & TV",
  Comedy: "Performing Arts",
  "Commercial / Advertising": "Film & TV",
  "Comics & Graphic Novels": "Writing & Publishing",
  "Costume Design": "Fashion & Beauty",
  "Creative Direction": "Creative Services",
  "Cultural Heritage & Preservation": "Heritage & Culture",
  "Curatorial & Exhibition": "Heritage & Culture",
  "Dance & Choreography": "Performing Arts",
  "Digital & Generative Art": "Visual Arts & Design",
  "DJ & Electronic Music": "Music & Audio",
  Documentary: "Film & TV",
  "Editing & Publishing": "Writing & Publishing",
  "Esports & Streaming": "Games & Interactive",
  "Event Production & Management": "Creative Services",
  "Fashion Design": "Fashion & Beauty",
  "Fashion Styling": "Fashion & Beauty",
  "Feature Film": "Film & TV",
  "Fiction Writing": "Writing & Publishing",
  "Film Direction": "Film & TV",
  "Film Editing": "Film & TV",
  "Film Production": "Film & TV",
  "Game Art & Design": "Games & Interactive",
  "Game Development": "Games & Interactive",
  "Graphic Design": "Visual Arts & Design",
  Illustration: "Visual Arts & Design",
  "Indigenous & Traditional Arts": "Heritage & Culture",
  "Licensing & IP Management": "Creative Services",
  "Live Performance / Concerts": "Music & Audio",
  "Model / Talent": "Fashion & Beauty",
  "Motion Graphics": "Games & Interactive",
  "Music Production": "Music & Audio",
  "Music Publishing": "Music & Audio",
  "Music Video": "Film & TV",
  "Non-fiction & Journalism": "Writing & Publishing",
  "Opera & Musical Theatre": "Performing Arts",
  Painting: "Visual Arts & Design",
  Photography: "Visual Arts & Design",
  "Podcast & Audio Storytelling": "Music & Audio",
  Poetry: "Writing & Publishing",
  Printmaking: "Visual Arts & Design",
  "Product & Industrial Design": "Visual Arts & Design",
  "Puppetry & Circus Arts": "Performing Arts",
  Screenwriting: "Film & TV",
  "Sculpture & Installation": "Visual Arts & Design",
  "Short Film": "Film & TV",
  "Songwriting & Composition": "Music & Audio",
  "Sound Design": "Music & Audio",
  "Sound Engineering": "Music & Audio",
  "Spoken Word & Poetry": "Performing Arts",
  "Talent & Artist Management": "Creative Services",
  "Television / Series": "Film & TV",
  "Textile Design": "Fashion & Beauty",
  "Theatre & Drama": "Performing Arts",
  Translation: "Writing & Publishing",
  "UI/UX Design": "Games & Interactive",
  "VFX & Post-Production": "Film & TV",
  "Web Series": "Film & TV",
  "XR / VR / AR": "Games & Interactive",
  Other: "Other",
};

export function categorySector(category: PortfolioCategory): PortfolioSector {
  if (category in CATEGORY_TO_SECTOR) return CATEGORY_TO_SECTOR[category as PresetPortfolioCategory];
  return "Other";
}

export function coverToneFor(category: PortfolioCategory): string {
  return SECTOR_COVER_TONES[categorySector(category)];
}
