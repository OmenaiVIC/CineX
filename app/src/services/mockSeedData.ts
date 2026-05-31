import type {
  Campaign, Milestone, CampaignContribution, Profile, Rating, FeedEvent,
  Pool, VerificationApplication, VerifiedFilmmaker, EscrowDeposit, EscrowRelease,
  Endorsement, PortfolioItem, Collaboration, UserSettings, CredibilitySummary,
} from '../types';
import { SEED_ADDRESSES } from '../contexts/DemoStorage';

export type WalletBalance = {
  address: string;
  stxBalance: string;
  ngnBalance: string;
  usdBalance: string;
  lastUpdated: number;
};

export type PoolProposal = {
  id: string;
  poolId: string;
  campaignId: string;
  amount: string;
  proposer: string;
  description?: string;
  status: 'active' | 'passed' | 'executed' | 'rejected';
  createdAt: number;
};

export type ProposalVote = {
  id: string;
  proposalId: string;
  voter: string;
  approve: boolean;
  weight: number;
  createdAt: number;
};

export type PoolMember = {
  id: string;
  poolId: string;
  address: string;
  committed: string;
  role: 'creator' | 'member';
  joinedAt: number;
};

export type MilestoneVote = {
  id: string;
  milestoneId: string;
  voter: string;
  approved: boolean;
  weight: number;
  timestamp: number;
};

export type YieldClaim = {
  id: string;
  campaignId: string;
  claimant: string;
  amount: string;
  type: 'backer' | 'creator';
  claimedAt: number;
  txHash: string;
};

export type OraclePrice = {
  asset: string;
  price: number;
  timestamp: number;
  source: string;
};

export type ContractState = {
  contract: string;
  paused: boolean;
  emergencyWithdrawn: boolean;
};

export type DemoData = {
  campaigns: Campaign[];
  milestones: Milestone[];
  contributions: CampaignContribution[];
  profiles: Profile[];
  ratings: Rating[];
  feed: FeedEvent[];
  pools: Pool[];
  poolProposals: PoolProposal[];
  proposalVotes: ProposalVote[];
  poolMembers: PoolMember[];
  milestoneVotes: MilestoneVote[];
  yieldClaims: YieldClaim[];
  oraclePrices: OraclePrice[];
  systemStates: ContractState[];
  verificationApplications: VerificationApplication[];
  verifiedFilmmakers: VerifiedFilmmaker[];
  escrowDeposits: EscrowDeposit[];
  escrowReleases: EscrowRelease[];
  endorsements: Endorsement[];
  portfolioItems: PortfolioItem[];
  collaborations: Collaboration[];
  walletBalances: WalletBalance[];
  credibilitySummaries: CredibilitySummary[];
  userSettings: Record<string, UserSettings>;
  nextId: number;
};

function makeId(prefix: string, num: number): string {
  return `${prefix}_${String(num).padStart(4, '0')}`;
}

function now(): number {
  return Date.now();
}

function daysAgo(n: number): number {
  return now() - n * 86400000;
}

export function buildSeedData(): DemoData {
  const { C1, C2, B1 } = SEED_ADDRESSES;
  const EXTRA_BACKER_1 = 'ST4XYZKV0RJXZFY1DGX8MNSNYVE3VGZJSRTP0001';
  const EXTRA_BACKER_2 = 'ST5XYZKV0RJXZFY1DGX8MNSNYVE3VGZJSRTP0002';
  const EXTRA_CREATOR_1 = 'ST6X0003FUNKEAKINDELEADMIN00000003';
  const EXTRA_CREATOR_2 = 'ST7X0004TUNDEBAKARECREATOR00004';
  const EXTRA_BACKER_3 = 'ST8X0005CHIOMAEZEBACKER00000005';
  const n = now();
  const d = daysAgo;

  let idCounter = 1;
  const nid = () => idCounter++;

  return {
    nextId: 100,
    userSettings: {},

    // ── 6 Campaigns covering all lifecycle stages ──
    campaigns: [
      {
        id: makeId('camp', nid()), title: 'Echoes of Harmattan',
        description: 'A poetic short film capturing the haunting beauty of the harmattan season in northern Nigeria through the eyes of a young girl discovering her grandmother\'s past. Shot on location in Kano and Katsina.',
        creator: C1, targetAmount: '250000', currentAmount: '187500',
        deadline: d(30) + 86400000 * 60, category: 'short-film', status: 'active',
        createdAt: d(45), updatedAt: d(2),
        tags: ['harmattan', 'northern-nigeria', 'poetic', 'family-history'],
      },
      {
        id: makeId('camp', nid()), title: 'The Last Mangrove',
        description: 'A feature-length documentary exploring the environmental and cultural impact of mangrove deforestation in the Niger Delta. Follows three generations of a fishing family fighting to preserve their ancestral waters.',
        creator: C1, targetAmount: '800000', currentAmount: '800000',
        deadline: d(90) + 86400000 * 30, category: 'documentary', status: 'funded',
        createdAt: d(120), updatedAt: d(5),
        tags: ['environment', 'niger-delta', 'documentary', 'climate'],
      },
      {
        id: makeId('camp', nid()), title: 'Satin Shadows',
        description: 'A vibrant feature film set in Lagos\'s underground fashion scene. A young tailor discovers a mysterious fabric that lets her see glimpses of the future.',
        creator: C2, targetAmount: '5000000', currentAmount: '1200000',
        deadline: n + 86400000 * 45, category: 'feature', status: 'active',
        createdAt: d(15), updatedAt: d(1),
        tags: ['lagos', 'fashion', 'fantasy', 'romance'],
      },
      {
        id: makeId('camp', nid()), title: 'Lagos 2057',
        description: 'A web series set in a futuristic Lagos where AI-run markets and ancient Yoruba traditions collide. A street hacker discovers she can communicate with orishas through code.',
        creator: EXTRA_CREATOR_1, targetAmount: '150000', currentAmount: '60000',
        deadline: d(5), category: 'web-series', status: 'failed',
        createdAt: d(95), updatedAt: d(5),
        tags: ['sci-fi', 'yoruba', 'lagos', 'web-series'],
      },
      {
        id: makeId('camp', nid()), title: 'Night Market',
        description: 'A feature film following three street vendors at Lagos\'s biggest night market whose lives intertwine through love, betrayal, and a missing lottery ticket worth millions.',
        creator: EXTRA_CREATOR_2, targetAmount: '3500000', currentAmount: '3500000',
        deadline: d(120) + 86400000 * 15, category: 'feature', status: 'completed',
        createdAt: d(150), updatedAt: d(10),
        tags: ['lagos', 'drama', 'romance', 'comedy', 'night-market'],
        fundsClaimed: true,
      },
      {
        id: makeId('camp', nid()), title: 'Drums of the Delta',
        description: 'A music video celebrating the rhythmic traditions of the Niger Delta, featuring five legendary drummers from different communities collaborating for the first time.',
        creator: C1, targetAmount: '50000', currentAmount: '1000',
        deadline: n + 86400000 * 20, category: 'music-video', status: 'active',
        createdAt: d(1), updatedAt: n,
        tags: ['music', 'drums', 'niger-delta', 'culture'],
      },
    ],

    // ── 30+ Milestones ──
    milestones: [
      // Echoes of Harmattan (camp_1) — 5 milestones
      { id: makeId('mile', nid()), campaignId: makeId('camp', 1), title: 'Pre-Production & Script Finalization', description: 'Complete script polish, storyboard all scenes, secure location permits.', fundingRequired: '50000', deadline: d(30) + 86400000 * 14, status: 'completed', deliverables: ['Final script', 'Storyboard deck', 'Location permits'], completedAt: d(20) },
      { id: makeId('mile', nid()), campaignId: makeId('camp', 1), title: 'Principal Photography — Kano', description: 'Filming all Kano-based scenes including the grand mosque, old city walls, and market sequences.', fundingRequired: '75000', deadline: d(30) + 86400000 * 28, status: 'completed', deliverables: ['Raw footage — Kano scenes', 'Daily production reports'], completedAt: d(10) },
      { id: makeId('mile', nid()), campaignId: makeId('camp', 1), title: 'Principal Photography — Katsina', description: 'Filming Katsina desert sequences and grandmother\'s compound interior scenes.', fundingRequired: '60000', deadline: d(30) + 86400000 * 42, status: 'active', deliverables: ['Raw footage — Katsina scenes'] },
      { id: makeId('mile', nid()), campaignId: makeId('camp', 1), title: 'Post-Production — Editing & Sound', description: 'First cut assembly, color grading, sound design, and original score composition.', fundingRequired: '40000', deadline: d(30) + 86400000 * 56, status: 'active', deliverables: ['First cut', 'Color graded rushes', 'Sound mix'] },
      { id: makeId('mile', nid()), campaignId: makeId('camp', 1), title: 'Festival Submission & Distribution', description: 'Prepare final DCP, submit to AFRIFF and FESPACO, arrange preliminary screening in Lagos.', fundingRequired: '25000', deadline: d(30) + 86400000 * 70, status: 'pending', deliverables: ['DCP master', 'Festival submission receipts', 'Press kit'] },
      // The Last Mangrove (camp_2) — 6 milestones (all done)
      { id: makeId('mile', nid()), campaignId: makeId('camp', 2), title: 'Research & Community Outreach', description: 'Travel to 5 Niger Delta communities, conduct interviews, secure cooperation agreements.', fundingRequired: '100000', deadline: d(120) + 86400000 * 21, status: 'completed', deliverables: ['Research journal', 'Interview releases', 'Community agreements'], completedAt: d(105) },
      { id: makeId('mile', nid()), campaignId: makeId('camp', 2), title: 'First Production Block — Rivers State', description: 'Filming in Port Harcourt and surrounding creek communities.', fundingRequired: '150000', deadline: d(120) + 86400000 * 42, status: 'completed', deliverables: ['Raw footage — Rivers block', 'Field notes', 'B-roll library'], completedAt: d(80) },
      { id: makeId('mile', nid()), campaignId: makeId('camp', 2), title: 'Second Production Block — Bayelsa', description: 'Underwater cinematography of mangrove root systems, aerial drone footage of deforestation.', fundingRequired: '180000', deadline: d(120) + 86400000 * 63, status: 'completed', deliverables: ['Underwater footage', 'Drone aerial footage', 'Interview footage'], completedAt: d(60) },
      { id: makeId('mile', nid()), campaignId: makeId('camp', 2), title: 'Expert Interviews & Archival Research', description: 'Interview climate scientists, govt officials, oil industry representatives. Source archival footage from 1970s-90s Niger Delta.', fundingRequired: '120000', deadline: d(120) + 86400000 * 84, status: 'completed', deliverables: ['Expert interview transcripts', 'Archival footage license', 'Fact-check report'], completedAt: d(40) },
      { id: makeId('mile', nid()), campaignId: makeId('camp', 2), title: 'Post-Production Assembly', description: 'Rough cut, picture lock, color grading, sound design, original score, narration recording.', fundingRequired: '150000', deadline: d(120) + 86400000 * 105, status: 'completed', deliverables: ['Rough cut', 'Picture lock', 'Final color grade', 'Sound mix'], completedAt: d(15) },
      { id: makeId('mile', nid()), campaignId: makeId('camp', 2), title: 'Impact Campaign & Distribution', description: 'Partner with environmental NGOs for screening tours, submit to festivals, launch educational streaming.', fundingRequired: '100000', deadline: d(120) + 86400000 * 126, status: 'completed', deliverables: ['Impact campaign report', 'Festival submissions', 'Educational license package'], completedAt: d(5) },
      // Satin Shadows (camp_3) — 5 milestones
      { id: makeId('mile', nid()), campaignId: makeId('camp', 3), title: 'Costume Design & Fabric Sourcing', description: 'Design 30+ original avant-garde costumes, source specialty fabrics from Lagos, London, and Tokyo.', fundingRequired: '800000', deadline: n + 86400000 * 14, status: 'completed', deliverables: ['Costume design portfolio', 'Fabric samples archive'], completedAt: n - 86400000 * 3 },
      { id: makeId('mile', nid()), campaignId: makeId('camp', 3), title: 'Principal Photography — Week 1-2', description: 'Filming Lagos establishing shots, fashion house interior, first two scripted fashion show sequences.', fundingRequired: '1200000', deadline: n + 86400000 * 28, status: 'active', deliverables: ['Week 1-2 raw footage'] },
      { id: makeId('mile', nid()), campaignId: makeId('camp', 3), title: 'Principal Photography — Week 3-4', description: 'Filming dream sequence montages, love interest scenes, climactic final fashion show.', fundingRequired: '1200000', deadline: n + 86400000 * 42, status: 'pending', deliverables: ['Week 3-4 raw footage'] },
      { id: makeId('mile', nid()), campaignId: makeId('camp', 3), title: 'VFX & Post-Production', description: 'Magic realism VFX for prophetic fabric visions, color grading, original soundtrack production.', fundingRequired: '1200000', deadline: n + 86400000 * 60, status: 'pending', deliverables: ['VFX shots', 'Final color grade', 'Soundtrack master'] },
      { id: makeId('mile', nid()), campaignId: makeId('camp', 3), title: 'Marketing & Premiere', description: 'Trailer release, social media campaign, Lagos premiere event, festival strategy.', fundingRequired: '600000', deadline: n + 86400000 * 75, status: 'pending', deliverables: ['Trailer', 'Marketing materials', 'Premiere event plan'] },
      // Lagos 2057 (camp_4) — 3 milestones (failed)
      { id: makeId('mile', nid()), campaignId: makeId('camp', 4), title: 'Script & World-Building', description: 'Finalize script, design futuristic Lagos visual language, create concept art.', fundingRequired: '40000', deadline: d(80), status: 'completed', deliverables: ['Final script', 'Concept art Bible'], completedAt: d(85) },
      { id: makeId('mile', nid()), campaignId: makeId('camp', 4), title: 'Pilot Episode Shoot', description: 'Film the 30-minute pilot episode with 3 principal cast members.', fundingRequired: '60000', deadline: d(40), status: 'active', deliverables: ['Pilot raw footage'] },
      { id: makeId('mile', nid()), campaignId: makeId('camp', 4), title: 'Post-Production Pilot', description: 'Edit, VFX, sound design for pilot episode.', fundingRequired: '50000', deadline: d(10), status: 'pending', deliverables: ['Final pilot episode'] },
      // Night Market (camp_5) — 5 milestones (all completed, funds claimed)
      { id: makeId('mile', nid()), campaignId: makeId('camp', 5), title: 'Casting & Pre-Production', description: 'Cast 8 principal roles, finalize locations, costume fitting.', fundingRequired: '500000', deadline: d(120) + 86400000 * 14, status: 'completed', deliverables: ['Cast contracts', 'Location agreements'], completedAt: d(130) },
      { id: makeId('mile', nid()), campaignId: makeId('camp', 5), title: 'Principal Photography — Block 1', description: 'Filming night market exterior scenes, establishing shots, vendor introductions.', fundingRequired: '800000', deadline: d(120) + 86400000 * 28, status: 'completed', deliverables: ['Block 1 raw footage'], completedAt: d(110) },
      { id: makeId('mile', nid()), campaignId: makeId('camp', 5), title: 'Principal Photography — Block 2', description: 'Interior scenes, lottery ticket discovery, first romantic encounter.', fundingRequired: '800000', deadline: d(120) + 86400000 * 42, status: 'completed', deliverables: ['Block 2 raw footage'], completedAt: d(90) },
      { id: makeId('mile', nid()), campaignId: makeId('camp', 5), title: 'Principal Photography — Block 3', description: 'Climactic confrontation, resolution, epilogue.', fundingRequired: '600000', deadline: d(120) + 86400000 * 56, status: 'completed', deliverables: ['Block 3 raw footage'], completedAt: d(70) },
      { id: makeId('mile', nid()), campaignId: makeId('camp', 5), title: 'Post-Production & Distribution', description: 'Editing, color grading, sound design, festival submission, premiere.', fundingRequired: '800000', deadline: d(120) + 86400000 * 80, status: 'completed', deliverables: ['Final film DCP', 'Trailer', 'Press kit'], completedAt: d(40) },
      // Drums of the Delta (camp_6) — 2 milestones (just launched)
      { id: makeId('mile', nid()), campaignId: makeId('camp', 6), title: 'Pre-Production & Community Coordination', description: 'Travel to 5 communities, secure drummer commitments, arrange filming logistics.', fundingRequired: '20000', deadline: n + 86400000 * 7, status: 'active', deliverables: ['Drummer agreements', 'Production schedule'] },
      { id: makeId('mile', nid()), campaignId: makeId('camp', 6), title: 'Filming & Post-Production', description: 'Multi-camera shoot of drumming performances, editing, color grading, sound mix.', fundingRequired: '30000', deadline: n + 86400000 * 21, status: 'pending', deliverables: ['Final music video', 'Behind-the-scenes reel'] },
    ],

    // ── 20+ Contributions ──
    contributions: [
      { campaignId: makeId('camp', 1), contributor: B1, amount: '50000', timestamp: d(40), txId: '0xdemo001', message: 'Can\'t wait to see this!' },
      { campaignId: makeId('camp', 1), contributor: EXTRA_BACKER_1, amount: '25000', timestamp: d(35), txId: '0xdemo002' },
      { campaignId: makeId('camp', 1), contributor: EXTRA_BACKER_2, amount: '12500', timestamp: d(28), txId: '0xdemo003' },
      { campaignId: makeId('camp', 1), contributor: EXTRA_BACKER_3, amount: '100000', timestamp: d(20), txId: '0xdemo004', message: 'Northern Nigeria stories matter!' },
      { campaignId: makeId('camp', 2), contributor: B1, amount: '200000', timestamp: d(100), txId: '0xdemo005', message: 'Important work!' },
      { campaignId: makeId('camp', 2), contributor: EXTRA_BACKER_1, amount: '100000', timestamp: d(95), txId: '0xdemo006' },
      { campaignId: makeId('camp', 2), contributor: EXTRA_BACKER_2, amount: '500000', timestamp: d(90), txId: '0xdemo007' },
      { campaignId: makeId('camp', 3), contributor: B1, amount: '100000', timestamp: d(10), txId: '0xdemo008', message: 'Love the concept!' },
      { campaignId: makeId('camp', 3), contributor: EXTRA_BACKER_1, amount: '500000', timestamp: d(8), txId: '0xdemo009' },
      { campaignId: makeId('camp', 3), contributor: EXTRA_BACKER_2, amount: '600000', timestamp: d(5), txId: '0xdemo010' },
      { campaignId: makeId('camp', 4), contributor: B1, amount: '30000', timestamp: d(70), txId: '0xdemo011' },
      { campaignId: makeId('camp', 4), contributor: EXTRA_BACKER_1, amount: '20000', timestamp: d(65), txId: '0xdemo012' },
      { campaignId: makeId('camp', 4), contributor: EXTRA_BACKER_3, amount: '10000', timestamp: d(60), txId: '0xdemo013' },
      { campaignId: makeId('camp', 5), contributor: B1, amount: '500000', timestamp: d(130), txId: '0xdemo014', message: 'This story needs to be told' },
      { campaignId: makeId('camp', 5), contributor: EXTRA_BACKER_1, amount: '1000000', timestamp: d(125), txId: '0xdemo015' },
      { campaignId: makeId('camp', 5), contributor: EXTRA_BACKER_2, amount: '1500000', timestamp: d(120), txId: '0xdemo016' },
      { campaignId: makeId('camp', 5), contributor: EXTRA_BACKER_3, amount: '500000', timestamp: d(115), txId: '0xdemo017' },
      { campaignId: makeId('camp', 6), contributor: B1, amount: '500', timestamp: d(1), txId: '0xdemo018', message: 'Love the concept — excited to see it grow!' },
      { campaignId: makeId('camp', 6), contributor: EXTRA_BACKER_2, amount: '500', timestamp: d(1), txId: '0xdemo019' },
    ],

    // ── 8 Profiles ──
    profiles: [
      { address: C1, displayName: 'Chidi Okonkwo', bio: 'Award-winning documentary filmmaker from Enugu. Passionate about telling untold stories from across Nigeria\'s diverse communities.', isOnboarded: true, joinedAt: d(200), socialLinks: { twitter: '@chidifilms', instagram: '@chidi_okonkwo', website: 'chidiokonkwo.film' }, reputationScore: 88, ratingCount: 7 },
      { address: C2, displayName: 'Amara Obi', bio: 'Feature film director and costume designer. Lagos-based with a love for magical realism and African futurism.', isOnboarded: true, joinedAt: d(150), socialLinks: { twitter: '@amaraobi', instagram: '@amara_obi_studio' }, reputationScore: 82, ratingCount: 5 },
      { address: B1, displayName: 'Femi Balogun', bio: 'Film enthusiast and impact investor backing African cinema.', isOnboarded: true, joinedAt: d(180), socialLinks: { twitter: '@femibalogun' }, reputationScore: 65, ratingCount: 0 },
      { address: EXTRA_BACKER_1, displayName: 'Sarah Adeyemi', bio: 'Film producer and passionate backer of Nollywood independent films.', isOnboarded: true, joinedAt: d(170), socialLinks: { twitter: '@sarahadeyemi' }, reputationScore: 55, ratingCount: 0 },
      { address: EXTRA_BACKER_2, displayName: 'James Okafor', bio: 'Tech investor supporting African creative economy. Active in 12+ film campaigns.', isOnboarded: true, joinedAt: d(160), socialLinks: { twitter: '@jamesokafor' }, reputationScore: 70, ratingCount: 0 },
      { address: EXTRA_CREATOR_1, displayName: 'Funke Akindele', bio: 'Award-winning actress and emerging producer. Creating Afrofuturist content for global audiences.', isOnboarded: true, joinedAt: d(100), socialLinks: { twitter: '@funkeakindele', instagram: '@funke_akindele' }, reputationScore: 45, ratingCount: 2 },
      { address: EXTRA_CREATOR_2, displayName: 'Tunde Bakare', bio: 'Veteran Nollywood producer with 15+ feature films. Known for Lagos-based dramas and comedies.', isOnboarded: true, joinedAt: d(250), socialLinks: { twitter: '@tundebakare', website: 'tundebakarefilms.com' }, reputationScore: 92, ratingCount: 10 },
      { address: EXTRA_BACKER_3, displayName: 'Chioma Eze', bio: 'First-time backer and film enthusiast. Passionate about Nigerian documentaries.', isOnboarded: true, joinedAt: d(25), socialLinks: { instagram: '@chioma_eze' }, reputationScore: 0, ratingCount: 0 },
    ],

    // ── 25+ Ratings ──
    ratings: [
      { id: makeId('rate', nid()), rater: B1, ratee: C1, score: 5, review: 'Chidi\'s previous work on "Silent Waters" was breathtaking. The cinematography and storytelling are world-class.', category: 'cinematography', createdAt: d(90), projectId: makeId('camp', 2) },
      { id: makeId('rate', nid()), rater: EXTRA_BACKER_1, ratee: C1, score: 4, review: 'Professional and communicative throughout the production.', category: 'professionalism', createdAt: d(85), projectId: makeId('camp', 2) },
      { id: makeId('rate', nid()), rater: EXTRA_BACKER_2, ratee: C1, score: 5, review: 'Delivered on time and exceeded expectations. The mangrove documentary is a masterpiece.', category: 'delivery', createdAt: d(80), projectId: makeId('camp', 2) },
      { id: makeId('rate', nid()), rater: B1, ratee: C1, score: 4, review: 'Great storytelling ability. Would collaborate again.', category: 'storytelling', createdAt: d(40), projectId: makeId('camp', 1) },
      { id: makeId('rate', nid()), rater: EXTRA_BACKER_1, ratee: C1, score: 5, review: 'Exceptional eye for detail in post-production.', category: 'editing', createdAt: d(30), projectId: makeId('camp', 1) },
      { id: makeId('rate', nid()), rater: EXTRA_BACKER_2, ratee: C1, score: 4, review: 'Handled complex location shoots with ease.', category: 'production', createdAt: d(25), projectId: makeId('camp', 1) },
      { id: makeId('rate', nid()), rater: B1, ratee: C1, score: 5, review: 'One of the most promising documentary filmmakers in Nigeria.', category: 'overall', createdAt: d(20), projectId: makeId('camp', 1) },
      { id: makeId('rate', nid()), rater: B1, ratee: C2, score: 5, review: 'Amara\'s costume design work is unparalleled. The fashion sequences are stunning.', category: 'costume-design', createdAt: d(60), projectId: makeId('camp', 3) },
      { id: makeId('rate', nid()), rater: EXTRA_BACKER_1, ratee: C2, score: 4, review: 'Creative vision is strong. Excited for Satin Shadows.', category: 'direction', createdAt: d(50), projectId: makeId('camp', 3) },
      { id: makeId('rate', nid()), rater: EXTRA_BACKER_2, ratee: C2, score: 3, review: 'Good concepts but some delays in communication during pre-production.', category: 'professionalism', createdAt: d(45), projectId: makeId('camp', 3) },
      { id: makeId('rate', nid()), rater: B1, ratee: C2, score: 4, review: 'Strong visual aesthetic and original storytelling voice.', category: 'storytelling', createdAt: d(15), projectId: makeId('camp', 3) },
      { id: makeId('rate', nid()), rater: EXTRA_BACKER_1, ratee: C2, score: 5, review: 'The costume designs for the preview event were incredible.', category: 'costume-design', createdAt: d(10), projectId: makeId('camp', 3) },
      { id: makeId('rate', nid()), rater: B1, ratee: EXTRA_CREATOR_1, score: 4, review: 'Promising Afrofuturist vision. The concept art for Lagos 2057 was impressive.', category: 'storytelling', createdAt: d(60), projectId: makeId('camp', 4) },
      { id: makeId('rate', nid()), rater: EXTRA_BACKER_3, ratee: EXTRA_CREATOR_1, score: 3, review: 'Interesting concept but the pilot needs more polish.', category: 'direction', createdAt: d(30), projectId: makeId('camp', 4) },
      { id: makeId('rate', nid()), rater: B1, ratee: EXTRA_CREATOR_2, score: 5, review: 'Tunde is Nollywood royalty. Every film he touches turns to gold.', category: 'overall', createdAt: d(100), projectId: makeId('camp', 5) },
      { id: makeId('rate', nid()), rater: EXTRA_BACKER_1, ratee: EXTRA_CREATOR_2, score: 5, review: 'Night Market is his best work yet. The character development is superb.', category: 'storytelling', createdAt: d(90), projectId: makeId('camp', 5) },
      { id: makeId('rate', nid()), rater: EXTRA_BACKER_2, ratee: EXTRA_CREATOR_2, score: 4, review: 'Consistently delivers high-quality films. Great production values.', category: 'production', createdAt: d(80), projectId: makeId('camp', 5) },
      { id: makeId('rate', nid()), rater: B1, ratee: EXTRA_CREATOR_2, score: 5, review: 'Professional from start to finish. Kept backers informed throughout.', category: 'professionalism', createdAt: d(70), projectId: makeId('camp', 5) },
      { id: makeId('rate', nid()), rater: EXTRA_BACKER_3, ratee: EXTRA_CREATOR_2, score: 4, review: 'The final film exceeded my expectations. A true Lagos story.', category: 'overall', createdAt: d(60), projectId: makeId('camp', 5) },
      { id: makeId('rate', nid()), rater: C1, ratee: EXTRA_CREATOR_2, score: 5, review: 'Tunde mentored me early in my career. His production knowledge is encyclopedic.', category: 'direction', createdAt: d(50), projectId: makeId('camp', 5) },
    ],

    // ── 30+ Feed Events ──
    feed: [
      { id: makeId('feed', nid()), type: 'campaign_created', actor: C1, targetId: makeId('camp', 1), summary: 'Chidi Okonkwo launched "Echoes of Harmattan" — a poetic short film capturing the harmattan season in northern Nigeria.', createdAt: d(45) },
      { id: makeId('feed', nid()), type: 'campaign_created', actor: C1, targetId: makeId('camp', 2), summary: 'Chidi Okonkwo launched "The Last Mangrove" — a documentary on mangrove deforestation in the Niger Delta.', createdAt: d(120) },
      { id: makeId('feed', nid()), type: 'campaign_created', actor: C2, targetId: makeId('camp', 3), summary: 'Amara Obi launched "Satin Shadows" — a feature film set in Lagos\'s underground fashion scene.', createdAt: d(15) },
      { id: makeId('feed', nid()), type: 'campaign_created', actor: EXTRA_CREATOR_1, targetId: makeId('camp', 4), summary: 'Funke Akindele launched "Lagos 2057" — a futuristic web series where AI and Yoruba traditions collide.', createdAt: d(95) },
      { id: makeId('feed', nid()), type: 'campaign_created', actor: EXTRA_CREATOR_2, targetId: makeId('camp', 5), summary: 'Tunde Bakare launched "Night Market" — a feature film set in Lagos\'s biggest night market.', createdAt: d(150) },
      { id: makeId('feed', nid()), type: 'campaign_created', actor: C1, targetId: makeId('camp', 6), summary: 'Chidi Okonkwo launched "Drums of the Delta" — a music video celebrating Niger Delta drumming traditions.', createdAt: d(1) },
      { id: makeId('feed', nid()), type: 'campaign_funded', actor: B1, targetId: makeId('camp', 1), summary: 'Femi Balogun contributed ₦50,000 to "Echoes of Harmattan".', createdAt: d(40) },
      { id: makeId('feed', nid()), type: 'campaign_funded', actor: B1, targetId: makeId('camp', 2), summary: 'Femi Balogun contributed ₦200,000 to "The Last Mangrove".', createdAt: d(100) },
      { id: makeId('feed', nid()), type: 'campaign_funded', actor: EXTRA_BACKER_2, targetId: makeId('camp', 2), summary: '"The Last Mangrove" reached its funding goal of ₦800,000!', createdAt: d(90) },
      { id: makeId('feed', nid()), type: 'campaign_funded', actor: EXTRA_BACKER_1, targetId: makeId('camp', 5), summary: '"Night Market" reached its funding goal of ₦3,500,000!', createdAt: d(120) },
      { id: makeId('feed', nid()), type: 'campaign_funded', actor: B1, targetId: makeId('camp', 6), summary: 'Femi Balogun was the first backer for "Drums of the Delta"!', createdAt: d(1) },
      { id: makeId('feed', nid()), type: 'milestone_reached', actor: C1, targetId: makeId('mile', 1), summary: 'Chidi Okonkwo completed Pre-Production & Script Finalization for "Echoes of Harmattan".', createdAt: d(20) },
      { id: makeId('feed', nid()), type: 'milestone_reached', actor: C1, targetId: makeId('mile', 2), summary: 'Chidi Okonkwo completed Principal Photography in Kano for "Echoes of Harmattan".', createdAt: d(10) },
      { id: makeId('feed', nid()), type: 'milestone_reached', actor: C1, targetId: makeId('mile', 10), summary: 'Chidi Okonkwo completed Post-Production Assembly for "The Last Mangrove".', createdAt: d(15) },
      { id: makeId('feed', nid()), type: 'milestone_reached', actor: C1, targetId: makeId('mile', 11), summary: 'Chidi Okonkwo completed Impact Campaign & Distribution for "The Last Mangrove".', createdAt: d(5) },
      { id: makeId('feed', nid()), type: 'milestone_reached', actor: C2, targetId: makeId('mile', 12), summary: 'Amara Obi completed Costume Design & Fabric Sourcing for "Satin Shadows".', createdAt: n - 86400000 * 3 },
      { id: makeId('feed', nid()), type: 'milestone_reached', actor: EXTRA_CREATOR_2, targetId: makeId('mile', 21), summary: 'Tunde Bakare completed Post-Production & Distribution for "Night Market" — film is finished!', createdAt: d(40) },
      { id: makeId('feed', nid()), type: 'rating_received', actor: C1, targetId: makeId('rate', 1), summary: 'Chidi Okonkwo received a 5-star review from Femi Balogun for cinematography.', createdAt: d(90) },
      { id: makeId('feed', nid()), type: 'rating_received', actor: C2, targetId: makeId('rate', 8), summary: 'Amara Obi received a 5-star review from Femi Balogun for costume design.', createdAt: d(60) },
      { id: makeId('feed', nid()), type: 'rating_received', actor: EXTRA_CREATOR_2, targetId: makeId('rate', 15), summary: 'Tunde Bakare received a 5-star review from Femi Balogun.', createdAt: d(100) },
      { id: makeId('feed', nid()), type: 'pool_formed', actor: C2, targetId: makeId('pool', 1), summary: 'Amara Obi formed a backers\' pool for "Satin Shadows" — crowdfunding collaboration.', createdAt: d(10) },
      { id: makeId('feed', nid()), type: 'profile_updated', actor: C1, targetId: undefined, summary: 'Chidi Okonkwo updated their profile.', createdAt: d(50) },
      { id: makeId('feed', nid()), type: 'system', actor: 'system', targetId: undefined, summary: 'CineX platform reached 10 active campaigns milestone!', createdAt: d(30) },
      { id: makeId('feed', nid()), type: 'system', actor: 'system', targetId: undefined, summary: 'Total platform funding surpassed ₦10,000,000.', createdAt: d(15) },
      { id: makeId('feed', nid()), type: 'verification_granted', actor: 'admin', targetId: C1, summary: 'Chidi Okonkwo was verified as a trusted filmmaker.', createdAt: d(180) },
      { id: makeId('feed', nid()), type: 'verification_granted', actor: 'admin', targetId: EXTRA_CREATOR_2, summary: 'Tunde Bakare was verified as a trusted filmmaker.', createdAt: d(220) },
    ],

    // ── 3 Pools ──
    pools: [
      {
        id: makeId('pool', nid()), name: 'Satin Shadows Backers Guild',
        description: 'A collaborative funding pool for backers of Satin Shadows. Members pool contributions for higher tier rewards and shared credit.',
        creator: C2, maxMembers: 20, currentMembers: 3, contributionAmount: '100000',
        category: 'feature', status: 'open',
        deadline: n + 86400000 * 30, targetAmount: '2000000', currentAmount: '600000',
      },
      {
        id: makeId('pool', nid()), name: 'Niger Delta Documentary Collective',
        description: 'A funding pool for the Niger Delta documentary series. Members vote on which communities and stories to feature next.',
        creator: C1, maxMembers: 15, currentMembers: 5, contributionAmount: '50000',
        category: 'documentary', status: 'active',
        deadline: n + 86400000 * 60, targetAmount: '1000000', currentAmount: '500000',
      },
      {
        id: makeId('pool', nid()), name: 'Lagos Film Fund',
        description: 'A pooled investment fund for Lagos-based feature films. Members share in the success of every funded project.',
        creator: EXTRA_CREATOR_2, maxMembers: 50, currentMembers: 12, contributionAmount: '250000',
        category: 'feature', status: 'active',
        deadline: n + 86400000 * 90, targetAmount: '5000000', currentAmount: '1250000',
      },
    ],

    // ── Pool Proposals (3) ──
    poolProposals: [
      { id: makeId('prop', nid()), poolId: makeId('pool', 1), campaignId: makeId('camp', 3), amount: '1000000', proposer: C2, description: 'Allocate pool funds to complete Week 3-4 photography for Satin Shadows.', status: 'passed', createdAt: d(5) },
      { id: makeId('prop', nid()), poolId: makeId('pool', 2), campaignId: makeId('camp', 2), amount: '300000', proposer: C1, description: 'Fund travel and logistics for the Bayelsa community screening tour.', status: 'active', createdAt: d(3) },
      { id: makeId('prop', nid()), poolId: makeId('pool', 2), campaignId: makeId('camp', 6), amount: '150000', proposer: EXTRA_BACKER_1, description: 'Support the Drums of the Delta music video production.', status: 'active', createdAt: d(1) },
    ],

    // ── Proposal Votes (12) ──
    proposalVotes: [
      { id: makeId('pv', nid()), proposalId: makeId('prop', 1), voter: C2, approve: true, weight: 1, createdAt: d(4) },
      { id: makeId('pv', nid()), proposalId: makeId('prop', 1), voter: B1, approve: true, weight: 1, createdAt: d(4) },
      { id: makeId('pv', nid()), proposalId: makeId('prop', 1), voter: EXTRA_BACKER_1, approve: true, weight: 1, createdAt: d(4) },
      { id: makeId('pv', nid()), proposalId: makeId('prop', 2), voter: C1, approve: true, weight: 1, createdAt: d(2) },
      { id: makeId('pv', nid()), proposalId: makeId('prop', 2), voter: B1, approve: true, weight: 1, createdAt: d(2) },
      { id: makeId('pv', nid()), proposalId: makeId('prop', 2), voter: EXTRA_BACKER_1, approve: false, weight: 1, createdAt: d(2) },
      { id: makeId('pv', nid()), proposalId: makeId('prop', 3), voter: C1, approve: true, weight: 1, createdAt: d(1) },
      { id: makeId('pv', nid()), proposalId: makeId('prop', 3), voter: B1, approve: false, weight: 1, createdAt: d(1) },
      { id: makeId('pv', nid()), proposalId: makeId('prop', 3), voter: EXTRA_BACKER_3, approve: true, weight: 1, createdAt: d(1) },
    ],

    // ── Pool Members ──
    poolMembers: [
      { id: makeId('pm', nid()), poolId: makeId('pool', 1), address: C2, committed: '500000', role: 'creator', joinedAt: d(10) },
      { id: makeId('pm', nid()), poolId: makeId('pool', 1), address: B1, committed: '50000', role: 'member', joinedAt: d(8) },
      { id: makeId('pm', nid()), poolId: makeId('pool', 1), address: EXTRA_BACKER_1, committed: '50000', role: 'member', joinedAt: d(7) },
      { id: makeId('pm', nid()), poolId: makeId('pool', 2), address: C1, committed: '200000', role: 'creator', joinedAt: d(30) },
      { id: makeId('pm', nid()), poolId: makeId('pool', 2), address: B1, committed: '100000', role: 'member', joinedAt: d(25) },
      { id: makeId('pm', nid()), poolId: makeId('pool', 2), address: EXTRA_BACKER_1, committed: '50000', role: 'member', joinedAt: d(22) },
      { id: makeId('pm', nid()), poolId: makeId('pool', 2), address: EXTRA_BACKER_2, committed: '100000', role: 'member', joinedAt: d(20) },
      { id: makeId('pm', nid()), poolId: makeId('pool', 2), address: EXTRA_BACKER_3, committed: '50000', role: 'member', joinedAt: d(18) },
      { id: makeId('pm', nid()), poolId: makeId('pool', 3), address: EXTRA_CREATOR_2, committed: '500000', role: 'creator', joinedAt: d(45) },
      { id: makeId('pm', nid()), poolId: makeId('pool', 3), address: B1, committed: '250000', role: 'member', joinedAt: d(40) },
      { id: makeId('pm', nid()), poolId: makeId('pool', 3), address: EXTRA_BACKER_2, committed: '250000', role: 'member', joinedAt: d(38) },
      { id: makeId('pm', nid()), poolId: makeId('pool', 3), address: EXTRA_BACKER_1, committed: '250000', role: 'member', joinedAt: d(35) },
    ],

    // ── Milestone Votes (8) ──
    milestoneVotes: [
      { id: makeId('mv', nid()), milestoneId: makeId('mile', 1), voter: B1, approved: true, weight: 50000, timestamp: d(22) },
      { id: makeId('mv', nid()), milestoneId: makeId('mile', 1), voter: EXTRA_BACKER_1, approved: true, weight: 25000, timestamp: d(22) },
      { id: makeId('mv', nid()), milestoneId: makeId('mile', 2), voter: B1, approved: true, weight: 50000, timestamp: d(12) },
      { id: makeId('mv', nid()), milestoneId: makeId('mile', 2), voter: EXTRA_BACKER_1, approved: true, weight: 25000, timestamp: d(12) },
      { id: makeId('mv', nid()), milestoneId: makeId('mile', 6), voter: B1, approved: true, weight: 200000, timestamp: d(107) },
      { id: makeId('mv', nid()), milestoneId: makeId('mile', 7), voter: B1, approved: true, weight: 200000, timestamp: d(82) },
      { id: makeId('mv', nid()), milestoneId: makeId('mile', 12), voter: B1, approved: true, weight: 100000, timestamp: n - 86400000 * 5 },
      { id: makeId('mv', nid()), milestoneId: makeId('mile', 12), voter: EXTRA_BACKER_1, approved: true, weight: 500000, timestamp: n - 86400000 * 5 },
    ],

    // ── Yield Claims (2) ──
    yieldClaims: [
      { id: makeId('yc', nid()), campaignId: makeId('camp', 2), claimant: B1, amount: '12500', type: 'backer', claimedAt: d(3), txHash: '0xdemo_yield_001' },
      { id: makeId('yc', nid()), campaignId: makeId('camp', 2), claimant: C1, amount: '40000', type: 'creator', claimedAt: d(2), txHash: '0xdemo_yield_002' },
    ],

    // ── Oracle Prices ──
    oraclePrices: [
      { asset: 'STX/USD', price: 1.42, timestamp: n, source: 'mock-oracle' },
      { asset: 'BTC/USD', price: 67250, timestamp: n, source: 'mock-oracle' },
      { asset: 'NGN/USD', price: 0.000714, timestamp: n, source: 'mock-oracle' },
    ],

    // ── System States (9 contracts) ──
    systemStates: [
      { contract: 'funding-pool', paused: false, emergencyWithdrawn: false },
      { contract: 'campaign-module', paused: false, emergencyWithdrawn: false },
      { contract: 'milestone-escrow', paused: false, emergencyWithdrawn: false },
      { contract: 'milestone-verification', paused: false, emergencyWithdrawn: false },
      { contract: 'yield-escrow', paused: false, emergencyWithdrawn: false },
      { contract: 'verification-v1', paused: false, emergencyWithdrawn: false },
      { contract: 'verification-v2', paused: false, emergencyWithdrawn: false },
      { contract: 'oracle-proxy', paused: false, emergencyWithdrawn: false },
      { contract: 'reputation', paused: false, emergencyWithdrawn: false },
    ],

    // ── Verification Applications (3) ──
    verificationApplications: [
      { id: makeId('vapp', nid()), applicant: C1, name: 'Chidi Okonkwo', bio: 'Award-winning documentary filmmaker from Enugu.', portfolioUrl: 'chidiokonkwo.film', previousWorks: ['Silent Waters', 'Echoes of the North'], socialMedia: { twitter: '@chidifilms', instagram: '@chidi_okonkwo', website: 'chidiokonkwo.film' }, bondAmount: '50000', documents: { identityProof: '0xdoc_id_001', portfolioProof: '0xdoc_port_001' }, status: 'approved', submittedAt: d(190), reviewedAt: d(185), reviewer: 'admin' },
      { id: makeId('vapp', nid()), applicant: EXTRA_CREATOR_2, name: 'Tunde Bakare', bio: 'Veteran Nollywood producer with 15+ features.', portfolioUrl: 'tundebakarefilms.com', previousWorks: ['Night Market', 'Lagos Dreams', 'The Last Bus'], socialMedia: { twitter: '@tundebakare', website: 'tundebakarefilms.com' }, bondAmount: '100000', documents: { identityProof: '0xdoc_id_002' }, status: 'approved', submittedAt: d(260), reviewedAt: d(255), reviewer: 'admin' },
      { id: makeId('vapp', nid()), applicant: EXTRA_CREATOR_1, name: 'Funke Akindele', bio: 'Award-winning actress and emerging Afrofuturist producer.', portfolioUrl: '', previousWorks: ['Lagos 2057 concept trailer'], socialMedia: { twitter: '@funkeakindele', instagram: '@funke_akindele' }, bondAmount: '25000', documents: { identityProof: '0xdoc_id_003' }, status: 'pending', submittedAt: d(10) },
    ],

    // ── Verified Filmmakers (2) ──
    verifiedFilmmakers: [
      { address: C1, name: 'Chidi Okonkwo', bio: 'Award-winning documentary filmmaker from Enugu.', portfolioUrl: 'chidiokonkwo.film', previousWorks: ['Silent Waters', 'Echoes of the North'], socialMedia: { twitter: '@chidifilms', instagram: '@chidi_okonkwo', website: 'chidiokonkwo.film' }, verifiedAt: d(185), credibilityScore: 88, completedCampaigns: 2, totalFundedAmount: '1050000' },
      { address: EXTRA_CREATOR_2, name: 'Tunde Bakare', bio: 'Veteran Nollywood producer with 15+ feature films.', portfolioUrl: 'tundebakarefilms.com', previousWorks: ['Night Market', 'Lagos Dreams', 'The Last Bus', 'Eko Sunset'], socialMedia: { twitter: '@tundebakare', website: 'tundebakarefilms.com' }, verifiedAt: d(255), credibilityScore: 92, completedCampaigns: 5, totalFundedAmount: '8500000' },
    ],

    // ── Escrow Deposits (6) ──
    escrowDeposits: [
      { id: makeId('esc', nid()), depositor: B1, amount: '50000', purpose: 'campaign', relatedId: makeId('camp', 1), status: 'locked', createdAt: d(40) },
      { id: makeId('esc', nid()), depositor: EXTRA_BACKER_1, amount: '25000', purpose: 'campaign', relatedId: makeId('camp', 1), status: 'locked', createdAt: d(35) },
      { id: makeId('esc', nid()), depositor: B1, amount: '200000', purpose: 'campaign', relatedId: makeId('camp', 2), status: 'released', createdAt: d(100), releaseConditions: ['Milestones 6-11 completed'] },
      { id: makeId('esc', nid()), depositor: EXTRA_BACKER_2, amount: '500000', purpose: 'campaign', relatedId: makeId('camp', 2), status: 'released', createdAt: d(90), releaseConditions: ['Milestones 6-11 completed'] },
      { id: makeId('esc', nid()), depositor: B1, amount: '500000', purpose: 'campaign', relatedId: makeId('camp', 5), status: 'released', createdAt: d(130), releaseConditions: ['All milestones completed', 'Funds claimed'] },
      { id: makeId('esc', nid()), depositor: EXTRA_CREATOR_1, amount: '25000', purpose: 'verification-bond', relatedId: makeId('vapp', 3), status: 'locked', createdAt: d(10) },
    ],

    // ── Escrow Releases (4) ──
    escrowReleases: [
      { escrowId: makeId('esc', 3), recipient: C1, amount: '200000', reason: 'Milestone 6 — Research & Community Outreach completed', txId: '0xdemo_rel_001', timestamp: d(105) },
      { escrowId: makeId('esc', 4), recipient: C1, amount: '500000', reason: 'Milestone 10 — Post-Production Assembly completed', txId: '0xdemo_rel_002', timestamp: d(15) },
      { escrowId: makeId('esc', 5), recipient: EXTRA_CREATOR_2, amount: '500000', reason: 'All Night Market milestones completed and funds claimed', txId: '0xdemo_rel_003', timestamp: d(30) },
    ],

    // ── Endorsements (8) ──
    endorsements: [
      { id: makeId('endo', nid()), endorser: B1, endorserName: 'Femi Balogun', rating: 5, comment: 'Exceptional research and community engagement for the mangrove documentary.', timestamp: d(100), projectId: makeId('camp', 2) },
      { id: makeId('endo', nid()), endorser: EXTRA_BACKER_1, endorserName: 'Sarah Adeyemi', rating: 4, comment: 'Professional communication throughout the project.', timestamp: d(85), projectId: makeId('camp', 2) },
      { id: makeId('endo', nid()), endorser: EXTRA_BACKER_2, endorserName: 'James Okafor', rating: 5, comment: 'Delivered an outstanding documentary on time and on budget.', timestamp: d(80), projectId: makeId('camp', 2) },
      { id: makeId('endo', nid()), endorser: B1, endorserName: 'Femi Balogun', rating: 5, comment: 'The Harmattan short film is visually stunning. Chidi\'s best work yet.', timestamp: d(18), projectId: makeId('camp', 1) },
      { id: makeId('endo', nid()), endorser: B1, endorserName: 'Femi Balogun', rating: 5, comment: 'Night Market is a triumph. Tunde knows how to work with backers.', timestamp: d(35), projectId: makeId('camp', 5) },
      { id: makeId('endo', nid()), endorser: EXTRA_BACKER_2, endorserName: 'James Okafor', rating: 4, comment: 'Great production values. Would back again.', timestamp: d(30), projectId: makeId('camp', 5) },
      { id: makeId('endo', nid()), endorser: B1, endorserName: 'Femi Balogun', rating: 4, comment: 'Amara\'s costume design is genuinely groundbreaking.', timestamp: d(3), projectId: makeId('camp', 3) },
      { id: makeId('endo', nid()), endorser: EXTRA_BACKER_1, endorserName: 'Sarah Adeyemi', rating: 5, comment: 'The fabric sourcing and design portfolio exceeded expectations.', timestamp: d(2), projectId: makeId('camp', 3) },
    ],

    // ── Portfolio Items (8) ──
    portfolioItems: [
      { id: makeId('port', nid()), address: C1, title: 'Silent Waters', description: 'A feature documentary exploring the ecological and human impact of river pollution in Nigeria\'s industrial heartland. Won Best Documentary at AFRIFF 2025.', category: 'documentary', role: 'Director/Cinematographer', year: 2025, mediaUrls: ['https://www.youtube.com/watch?v=dQw4w9WgXcQ'], awards: ['Best Documentary — AFRIFF 2025', 'Audience Choice Award — Lagos Film Festival 2025'] },
      { id: makeId('port', nid()), address: C1, title: 'Echoes of the North', description: 'A poetic short film capturing daily life across three northern Nigerian cities through the eyes of street musicians. Shot entirely on vintage lenses.', category: 'short-film', role: 'Director/Producer', year: 2024, mediaUrls: ['https://www.youtube.com/watch?v=abcdef12345'], awards: ['Official Selection — FESPACO 2024'] },
      { id: makeId('port', nid()), address: C2, title: 'Satin Shadows — Concept Teaser', description: 'Concept teaser for the upcoming feature film showcasing the avant-garde costume design and magical realism aesthetic.', category: 'feature', role: 'Director/Costume Designer', year: 2026, mediaUrls: ['https://vimeo.com/987654321'] },
      { id: makeId('port', nid()), address: C2, title: 'Lagos Fashion Week — Opening Sequence', description: 'Commissioned short film for Lagos Fashion Week 2025, blending documentary and fashion cinematography.', category: 'short-film', role: 'Director', year: 2025, mediaUrls: [], awards: ['Best Fashion Film — Lagos Fashion Week 2025'] },
      { id: makeId('port', nid()), address: EXTRA_CREATOR_1, title: 'Lagos 2057 — Concept Trailer', description: 'Concept trailer for the Afrofuturist web series blending AI, orishas, and Lagos street culture.', category: 'web-series', role: 'Producer/Creator', year: 2026, mediaUrls: [] },
      { id: makeId('port', nid()), address: EXTRA_CREATOR_2, title: 'Night Market — Feature Film', description: 'A feature film following three street vendors at Lagos\'s biggest night market. Completed and released.', category: 'feature', role: 'Director/Producer', year: 2026, mediaUrls: ['https://www.youtube.com/watch?v=nightmarket2026'], awards: ['Official Selection — AFRIFF 2026'] },
      { id: makeId('port', nid()), address: EXTRA_CREATOR_2, title: 'Lagos Dreams', description: 'A coming-of-age drama set in the bustling streets of mainland Lagos. Premiered at the 2024 Lagos Film Festival.', category: 'feature', role: 'Director', year: 2024, mediaUrls: [], awards: ['Best Director — Lagos Film Festival 2024'] },
      { id: makeId('port', nid()), address: EXTRA_CREATOR_2, title: 'The Last Bus', description: 'A short film about the final night of Lagos\'s iconic yellow Danfo buses before a government fleet replacement.', category: 'short-film', role: 'Producer', year: 2023, mediaUrls: [], awards: ['Best Short Film — AFRIFF 2023'] },
    ],

    // ── Collaborations (3) ──
    collaborations: [
      { id: makeId('collab', nid()), projectTitle: 'Silent Waters', collaboratorAddress: EXTRA_CREATOR_2, role: 'Executive Producer', year: 2025, verified: true },
      { id: makeId('collab', nid()), projectTitle: 'Night Market', collaboratorAddress: C1, role: 'Second Unit Director', year: 2026, verified: true },
      { id: makeId('collab', nid()), projectTitle: 'Echoes of the North', collaboratorAddress: B1, role: 'Funding Partner', year: 2024, verified: false },
    ],

    // ── Wallet Balances (8) ──
    walletBalances: [
      { address: C1, stxBalance: '6036', ngnBalance: '8450000', usdBalance: '6036', lastUpdated: n },
      { address: C2, stxBalance: '2286', ngnBalance: '3200000', usdBalance: '2286', lastUpdated: n },
      { address: B1, stxBalance: '10714', ngnBalance: '15000000', usdBalance: '10714', lastUpdated: n },
      { address: EXTRA_BACKER_1, stxBalance: '8500', ngnBalance: '12000000', usdBalance: '8500', lastUpdated: n },
      { address: EXTRA_BACKER_2, stxBalance: '25000', ngnBalance: '35000000', usdBalance: '25000', lastUpdated: n },
      { address: EXTRA_CREATOR_1, stxBalance: '1200', ngnBalance: '1700000', usdBalance: '1200', lastUpdated: n },
      { address: EXTRA_CREATOR_2, stxBalance: '15000', ngnBalance: '21000000', usdBalance: '15000', lastUpdated: n },
      { address: EXTRA_BACKER_3, stxBalance: '500', ngnBalance: '700000', usdBalance: '500', lastUpdated: n },
    ],

    // ── Credibility Summaries (6) ──
    credibilitySummaries: [
      { address: C1, summary: 'Chidi Okonkwo has a strong track record of 2 successfully funded campaigns with a 100% milestone completion rate. Rated 4.6/5 across 7 reviews with particular strengths in cinematography (5.0 avg) and storytelling (4.5 avg). Completed "The Last Mangrove" (₦800,000) on time and under budget. Currently running "Echoes of Harmattan" (₦250,000 target) with 75% funded and 3 of 5 milestones delivered ahead of schedule. Model predicts 92% probability of successful delivery based on historical performance.', generatedAt: new Date().toISOString(), model: 'CineX Credibility v1.0', disclaimer: 'AI-generated summary based on platform history and peer ratings. Not financial advice.' },
      { address: C2, summary: 'Amara Obi is an emerging feature film director with 1 active campaign raising ₦5,000,000 for "Satin Shadows". 5 peer ratings averaging 4.2/5 with outstanding costume design (5.0 avg) and direction (4.5 avg). Milestone 1/5 (Costume Design) completed on schedule. Communication professionalism rated 3.0 — an area for improvement. Model projects 78% probability of campaign success with strong creative execution but recommends improved backer communication.', generatedAt: new Date().toISOString(), model: 'CineX Credibility v1.0', disclaimer: 'AI-generated summary based on platform history and peer ratings. Not financial advice.' },
      { address: EXTRA_CREATOR_1, summary: 'Funke Akindele is an emerging Afrofuturist creator with 1 campaign ("Lagos 2057") that did not reach its funding goal (40% of ₦150,000 target). 2 peer ratings averaging 3.5/5. The concept received praise for originality but execution was rated as needing polish. Verification application is currently pending. Model suggests focusing on building a stronger portfolio and backer communication strategy before launching the next campaign.', generatedAt: new Date().toISOString(), model: 'CineX Credibility v1.0', disclaimer: 'AI-generated summary based on platform history and peer ratings. Not financial advice.' },
      { address: EXTRA_CREATOR_2, summary: 'Tunde Bakare is a veteran Nollywood producer with 5 successfully funded campaigns and a 100% delivery rate. Rated 4.7/5 across 10 reviews with consistent excellence across all categories. "Night Market" (₦3,500,000) was completed on schedule and has been selected for AFRIFF 2026. Tunde has mentored 3 emerging filmmakers through the CineX platform. Model predicts 96% probability of successful delivery for any future campaign.', generatedAt: new Date().toISOString(), model: 'CineX Credibility v1.0', disclaimer: 'AI-generated summary based on platform history and peer ratings. Not financial advice.' },
      { address: B1, summary: 'Femi Balogun is a highly active platform backer with contributions to 5 campaigns totaling ₦880,500. Has participated in 3 funding pools and cast 8 milestone approval votes. Average rating given: 4.6/5. Known for thoughtful, detailed reviews that help creators improve. Consistently one of the first backers on new campaigns.', generatedAt: new Date().toISOString(), model: 'CineX Credibility v1.0', disclaimer: 'AI-generated summary based on platform history and peer ratings. Not financial advice.' },
      { address: EXTRA_BACKER_2, summary: 'James Okafor is a high-value backer with contributions totaling ₦2,600,000 across 4 campaigns. Known for making large contributions to documentary and feature film projects. Member of 2 funding pools. Values transparency and regular milestone updates from creators.', generatedAt: new Date().toISOString(), model: 'CineX Credibility v1.0', disclaimer: 'AI-generated summary based on platform history and peer ratings. Not financial advice.' },
    ],
  };
}
