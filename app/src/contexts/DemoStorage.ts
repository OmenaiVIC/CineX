import type {
  Campaign, Milestone, CampaignContribution, Profile, Rating, FeedEvent,
  Pool, VerificationApplication, VerifiedCreator, EscrowDeposit, EscrowRelease,
  Endorsement, PortfolioItem, Collaboration, UserSettings, CredibilitySummary,
} from '../types';

export interface WalletBalance {
  address: string;
  stxBalance: string;
  ngnBalance: string;
  usdBalance: string;
  lastUpdated: number;
}

export interface DemoData {
  campaigns: Campaign[];
  milestones: Milestone[];
  contributions: CampaignContribution[];
  profiles: Profile[];
  ratings: Rating[];
  feed: FeedEvent[];
  pools: Pool[];
  verificationApplications: VerificationApplication[];
  verifiedCreators: VerifiedCreator[];
  escrowDeposits: EscrowDeposit[];
  escrowReleases: EscrowRelease[];
  endorsements: Endorsement[];
  portfolioItems: PortfolioItem[];
  collaborations: Collaboration[];
  walletBalances: WalletBalance[];
  credibilitySummaries: CredibilitySummary[];
  userSettings: Record<string, UserSettings>;
  nextId: number;
}

export type DemoCollection = keyof Omit<DemoData, 'nextId' | 'userSettings'>;

const STORAGE_KEY = 'cinex_demo_data';

function makeId(prefix: string, num: number): string {
  return `${prefix}_${String(num).padStart(4, '0')}`;
}

function now(): number {
  return Date.now();
}

function daysAgo(n: number): number {
  return now() - n * 86400000;
}

const SEED_ADDRESSES = {
  C1: 'ST1J4G6R0VX7NZYF1DGX8MNSNYVE3VGZJSRTPGZGM',
  C2: 'ST2N81HZ0YM5PZQF2EHX9ONTZWF4WHZKJSQVWXYZM',
  B1: 'ST3PQXKV6RJXZFY3FIY8MPSOZVE3VGZJSQTVWABC',
};

function buildSeedData(): DemoData {
  const { C1, C2, B1 } = SEED_ADDRESSES;
  const n = now();
  const d = daysAgo;

  return {
    nextId: 17,
    userSettings: {},

    campaigns: [
      {
        id: makeId('camp', 1), title: 'Echoes of Harmattan',
        description: 'A poetic short film capturing the haunting beauty of the harmattan season in northern Nigeria through the eyes of a young girl discovering her grandmother\'s past. Shot on location in Kano and Katsina.',
        creator: C1, targetAmount: '250000', currentAmount: '187500',
        deadline: d(30) + 86400000 * 60, category: 'film', status: 'active',
        createdAt: d(45), updatedAt: d(2),
        tags: ['harmattan', 'northern-nigeria', 'poetic', 'family-history'],
      },
      {
        id: makeId('camp', 2), title: 'Delta Frequencies',
        description: 'An album fusing Afrobeat with electronic soundscapes, recording field sessions across the Niger Delta.',
        creator: C1, targetAmount: '800000', currentAmount: '800000',
        deadline: d(90) + 86400000 * 30, category: 'music', status: 'funded',
        createdAt: d(120), updatedAt: d(5),
        tags: ['music', 'afrobeat', 'niger-delta', 'electronic'],
      },
      {
        id: makeId('camp', 3), title: 'Satin Shadows',
        description: 'A vibrant feature film set in Lagos\'s underground fashion scene. A young tailor discovers a mysterious fabric that lets her see glimpses of the future, forcing her to navigate love, betrayal, and the high-stakes world of avant-garde couture.',
        creator: C2, targetAmount: '5000000', currentAmount: '1200000',
        deadline: n + 86400000 * 45, category: 'visual-art', status: 'active',
        createdAt: d(15), updatedAt: d(1),
        tags: ['lagos', 'fashion', 'fantasy', 'romance'],
      },
    ],

    milestones: [
      { id: makeId('mile', 1), campaignId: makeId('camp', 1), title: 'Pre-Production & Script Finalization', description: 'Complete script polish, storyboard all scenes, secure location permits.', fundingRequired: '50000', deadline: d(30) + 86400000 * 14, status: 'completed', deliverables: ['Final script', 'Storyboard deck', 'Location permits'], completedAt: d(20) },
      { id: makeId('mile', 2), campaignId: makeId('camp', 1), title: 'Principal Photography — Kano', description: 'Filming all Kano-based scenes including the grand mosque, old city walls, and market sequences.', fundingRequired: '75000', deadline: d(30) + 86400000 * 28, status: 'completed', deliverables: ['Raw footage — Kano scenes', 'Daily production reports'], completedAt: d(10) },
      { id: makeId('mile', 3), campaignId: makeId('camp', 1), title: 'Principal Photography — Katsina', description: 'Filming Katsina desert sequences and grandmother\'s compound interior scenes.', fundingRequired: '60000', deadline: d(30) + 86400000 * 42, status: 'active', deliverables: ['Raw footage — Katsina scenes'] },
      { id: makeId('mile', 4), campaignId: makeId('camp', 1), title: 'Post-Production — Editing & Sound', description: 'First cut assembly, color grading, sound design, and original score composition.', fundingRequired: '40000', deadline: d(30) + 86400000 * 56, status: 'active', deliverables: ['First cut', 'Color graded rushes', 'Sound mix'] },
      { id: makeId('mile', 5), campaignId: makeId('camp', 1), title: 'Festival Submission & Distribution', description: 'Prepare final DCP, submit to AFRIFF and FESPACO, arrange preliminary screening in Lagos.', fundingRequired: '25000', deadline: d(30) + 86400000 * 70, status: 'active', deliverables: ['DCP master', 'Festival submission receipts', 'Press kit'] },
      { id: makeId('mile', 6), campaignId: makeId('camp', 2), title: 'Research & Community Outreach', description: 'Travel to 5 Niger Delta communities, conduct interviews, secure cooperation agreements.', fundingRequired: '100000', deadline: d(120) + 86400000 * 21, status: 'completed', deliverables: ['Research journal', 'Interview releases', 'Community agreements'], completedAt: d(105) },
      { id: makeId('mile', 7), campaignId: makeId('camp', 2), title: 'First Production Block — Rivers State', description: 'Filming in Port Harcourt and surrounding creek communities.', fundingRequired: '150000', deadline: d(120) + 86400000 * 42, status: 'completed', deliverables: ['Raw footage — Rivers block', 'Field notes', 'B-roll library'], completedAt: d(80) },
      { id: makeId('mile', 8), campaignId: makeId('camp', 2), title: 'Studio Recording Block — Port Harcourt', description: 'Field recording sessions in Port Harcourt, capturing local instruments and vocal performances.', fundingRequired: '180000', deadline: d(120) + 86400000 * 63, status: 'completed', deliverables: ['Field recordings', 'Studio session takes', 'Interview footage'], completedAt: d(60) },
      { id: makeId('mile', 9), campaignId: makeId('camp', 2), title: 'Expert Interviews & Archival Research', description: 'Interview climate scientists, govt officials, oil industry representatives. Source archival footage from 1970s-90s Niger Delta.', fundingRequired: '120000', deadline: d(120) + 86400000 * 84, status: 'completed', deliverables: ['Expert interview transcripts', 'Archival footage license', 'Fact-check report'], completedAt: d(40) },
      { id: makeId('mile', 10), campaignId: makeId('camp', 2), title: 'Post-Production Assembly', description: 'Rough cut, picture lock, color grading, sound design, original score, narration recording.', fundingRequired: '150000', deadline: d(120) + 86400000 * 105, status: 'completed', deliverables: ['Rough cut', 'Picture lock', 'Final color grade', 'Sound mix'], completedAt: d(15) },
      { id: makeId('mile', 11), campaignId: makeId('camp', 2), title: 'Impact Campaign & Distribution', description: 'Partner with environmental NGOs for screening tours, submit to festivals, launch educational streaming.', fundingRequired: '100000', deadline: d(120) + 86400000 * 126, status: 'active', deliverables: ['Impact campaign report', 'Festival submissions', 'Educational license package'] },
      { id: makeId('mile', 12), campaignId: makeId('camp', 3), title: 'Costume Design & Fabric Sourcing', description: 'Design 30+ original avant-garde costumes, source specialty fabrics from Lagos, London, and Tokyo.', fundingRequired: '800000', deadline: n + 86400000 * 14, status: 'completed', deliverables: ['Costume design portfolio', 'Fabric samples archive'], completedAt: n - 86400000 * 3 },
      { id: makeId('mile', 13), campaignId: makeId('camp', 3), title: 'Principal Photography — Week 1-2', description: 'Filming Lagos establishing shots, fashion house interior, first two scripted fashion show sequences.', fundingRequired: '1200000', deadline: n + 86400000 * 28, status: 'active', deliverables: ['Week 1-2 raw footage'] },
      { id: makeId('mile', 14), campaignId: makeId('camp', 3), title: 'Principal Photography — Week 3-4', description: 'Filming dream sequence montages, love interest scenes, climactic final fashion show.', fundingRequired: '1200000', deadline: n + 86400000 * 42, status: 'active', deliverables: ['Week 3-4 raw footage'] },
      { id: makeId('mile', 15), campaignId: makeId('camp', 3), title: 'VFX & Post-Production', description: 'Magic realism VFX for prophetic fabric visions, color grading, original soundtrack production.', fundingRequired: '1200000', deadline: n + 86400000 * 60, status: 'active', deliverables: ['VFX shots', 'Final color grade', 'Soundtrack master'] },
      { id: makeId('mile', 16), campaignId: makeId('camp', 3), title: 'Marketing & Premiere', description: 'Trailer release, social media campaign, Lagos premiere event, festival strategy.', fundingRequired: '600000', deadline: n + 86400000 * 75, status: 'pending', deliverables: ['Trailer', 'Marketing materials', 'Premiere event plan'] },
    ],

    contributions: [
      { campaignId: makeId('camp', 1), contributor: B1, amount: '50000', timestamp: d(40), txId: '0xseed001', message: 'Can\'t wait to see this!' },
      { campaignId: makeId('camp', 1), contributor: 'ST4XYZKV0RJXZFY1DGX8MNSNYVE3VGZJSRTP0001', amount: '25000', timestamp: d(35), txId: '0xseed002' },
      { campaignId: makeId('camp', 1), contributor: 'ST5XYZKV0RJXZFY1DGX8MNSNYVE3VGZJSRTP0002', amount: '12500', timestamp: d(28), txId: '0xseed003' },
      { campaignId: makeId('camp', 2), contributor: B1, amount: '200000', timestamp: d(100), txId: '0xseed004', message: 'Important work!' },
      { campaignId: makeId('camp', 2), contributor: 'ST4XYZKV0RJXZFY1DGX8MNSNYVE3VGZJSRTP0001', amount: '100000', timestamp: d(95), txId: '0xseed005' },
      { campaignId: makeId('camp', 2), contributor: 'ST5XYZKV0RJXZFY1DGX8MNSNYVE3VGZJSRTP0002', amount: '500000', timestamp: d(90), txId: '0xseed006' },
      { campaignId: makeId('camp', 3), contributor: B1, amount: '100000', timestamp: d(10), txId: '0xseed007', message: 'Love the concept!' },
      { campaignId: makeId('camp', 3), contributor: 'ST4XYZKV0RJXZFY1DGX8MNSNYVE3VGZJSRTP0001', amount: '500000', timestamp: d(8), txId: '0xseed008' },
      { campaignId: makeId('camp', 3), contributor: 'ST5XYZKV0RJXZFY1DGX8MNSNYVE3VGZJSRTP0002', amount: '600000', timestamp: d(5), txId: '0xseed009' },
    ],

    profiles: [
      { address: C1, displayName: 'Chidi Okonkwo', bio: 'Award-winning documentary filmmaker from Enugu. Passionate about telling untold stories from across Nigeria\'s diverse communities.', isOnboarded: true, joinedAt: d(200), socialLinks: { twitter: '@chidifilms', instagram: '@chidi_okonkwo', website: 'chidiokonkwo.film' }, reputationScore: 88, ratingCount: 7 },
      { address: C2, displayName: 'Amara Obi', bio: 'Feature film director and costume designer. Lagos-based with a love for magical realism and African futurism.', isOnboarded: true, joinedAt: d(150), socialLinks: { twitter: '@amaraobi', instagram: '@amara_obi_studio' }, reputationScore: 82, ratingCount: 5 },
      { address: B1, displayName: 'Femi Balogun', bio: 'Film enthusiast and impact investor backing African cinema.', isOnboarded: true, joinedAt: d(180), socialLinks: { twitter: '@femibalogun' }, reputationScore: 65, ratingCount: 0 },
    ],

    ratings: [
      { id: makeId('rate', 1), rater: B1, ratee: C1, score: 5, review: 'Chidi\'s previous work on "Silent Waters" was breathtaking. The cinematography and storytelling are world-class.', category: 'cinematography', createdAt: d(90), projectId: makeId('camp', 2) },
      { id: makeId('rate', 2), rater: 'ST4XYZKV0RJXZFY1DGX8MNSNYVE3VGZJSRTP0001', ratee: C1, score: 4, review: 'Professional and communicative throughout the production.', category: 'professionalism', createdAt: d(85), projectId: makeId('camp', 2) },
      { id: makeId('rate', 3), rater: 'ST5XYZKV0RJXZFY1DGX8MNSNYVE3VGZJSRTP0002', ratee: C1, score: 5, review: 'Delivered on time and exceeded expectations. The Niger Delta field recordings are a masterpiece.', category: 'delivery', createdAt: d(80), projectId: makeId('camp', 2) },
      { id: makeId('rate', 4), rater: B1, ratee: C1, score: 4, review: 'Great storytelling ability. Would collaborate again.', category: 'storytelling', createdAt: d(40), projectId: makeId('camp', 1) },
      { id: makeId('rate', 5), rater: 'ST4XYZKV0RJXZFY1DGX8MNSNYVE3VGZJSRTP0001', ratee: C1, score: 5, review: 'Exceptional eye for detail in post-production.', category: 'editing', createdAt: d(30), projectId: makeId('camp', 1) },
      { id: makeId('rate', 6), rater: 'ST5XYZKV0RJXZFY1DGX8MNSNYVE3VGZJSRTP0002', ratee: C1, score: 4, review: 'Handled complex location shoots with ease.', category: 'production', createdAt: d(25), projectId: makeId('camp', 1) },
      { id: makeId('rate', 7), rater: B1, ratee: C1, score: 5, review: 'One of the most promising documentary filmmakers in Nigeria.', category: 'overall', createdAt: d(20), projectId: makeId('camp', 1) },
      { id: makeId('rate', 8), rater: B1, ratee: C2, score: 5, review: 'Amara\'s costume design work is unparalleled. The fashion sequences in her previous films are stunning.', category: 'costume-design', createdAt: d(60), projectId: makeId('camp', 3) },
      { id: makeId('rate', 9), rater: 'ST4XYZKV0RJXZFY1DGX8MNSNYVE3VGZJSRTP0001', ratee: C2, score: 4, review: 'Creative vision is strong. Excited for Satin Shadows.', category: 'direction', createdAt: d(50), projectId: makeId('camp', 3) },
      { id: makeId('rate', 10), rater: 'ST5XYZKV0RJXZFY1DGX8MNSNYVE3VGZJSRTP0002', ratee: C2, score: 3, review: 'Good concepts but some delays in communication during pre-production.', category: 'professionalism', createdAt: d(45), projectId: makeId('camp', 3) },
      { id: makeId('rate', 11), rater: B1, ratee: C2, score: 4, review: 'Strong visual aesthetic and original storytelling voice.', category: 'storytelling', createdAt: d(15), projectId: makeId('camp', 3) },
      { id: makeId('rate', 12), rater: 'ST4XYZKV0RJXZFY1DGX8MNSNYVE3VGZJSRTP0001', ratee: C2, score: 5, review: 'The costume designs for the preview event were incredible.', category: 'costume-design', createdAt: d(10), projectId: makeId('camp', 3) },
    ],

    feed: [
      { id: makeId('feed', 1), type: 'campaign_created', actor: C1, targetId: makeId('camp', 1), summary: 'Chidi Okonkwo launched "Echoes of Harmattan" — a poetic short film capturing the harmattan season in northern Nigeria.', createdAt: d(45) },
      { id: makeId('feed', 2), type: 'campaign_created', actor: C1, targetId: makeId('camp', 2), summary: 'Chidi Okonkwo launched "Delta Frequencies" — an Afrobeat-electronic album fusing field sessions from the Niger Delta.', createdAt: d(120) },
      { id: makeId('feed', 3), type: 'campaign_created', actor: C2, targetId: makeId('camp', 3), summary: 'Amara Obi launched "Satin Shadows" — a feature film set in Lagos\'s underground fashion scene.', createdAt: d(15) },
      { id: makeId('feed', 4), type: 'campaign_funded', actor: B1, targetId: makeId('camp', 1), summary: 'Femi Balogun contributed ₦50,000 to "Echoes of Harmattan".', createdAt: d(40) },
      { id: makeId('feed', 5), type: 'campaign_funded', actor: B1, targetId: makeId('camp', 2), summary: 'Femi Balogun contributed ₦200,000 to "Delta Frequencies".', createdAt: d(100) },
      { id: makeId('feed', 6), type: 'milestone_reached', actor: C1, targetId: makeId('mile', 1), summary: 'Chidi Okonkwo completed Pre-Production & Script Finalization for "Echoes of Harmattan".', createdAt: d(20) },
      { id: makeId('feed', 7), type: 'milestone_reached', actor: C1, targetId: makeId('mile', 2), summary: 'Chidi Okonkwo completed Principal Photography in Kano for "Echoes of Harmattan".', createdAt: d(10) },
      { id: makeId('feed', 8), type: 'campaign_funded', actor: 'ST5XYZKV0RJXZFY1DGX8MNSNYVE3VGZJSRTP0002', targetId: makeId('camp', 2), summary: '"Delta Frequencies" reached its funding goal of ₦800,000!', createdAt: d(90) },
      { id: makeId('feed', 9), type: 'rating_received', actor: C1, targetId: makeId('rate', 1), summary: 'Chidi Okonkwo received a 5-star review from Femi Balogun for cinematography.', createdAt: d(90) },
      { id: makeId('feed', 10), type: 'milestone_reached', actor: C1, targetId: makeId('mile', 10), summary: 'Chidi Okonkwo completed Post-Production Assembly for "Delta Frequencies".', createdAt: d(15) },
      { id: makeId('feed', 11), type: 'milestone_reached', actor: C2, targetId: makeId('mile', 12), summary: 'Amara Obi completed Costume Design & Fabric Sourcing for "Satin Shadows".', createdAt: n - 86400000 * 3 },
      { id: makeId('feed', 12), type: 'pool_formed', actor: C2, targetId: makeId('pool', 1), summary: 'Amara Obi formed a backers\' pool for "Satin Shadows" — crowdfunding collaboration.', createdAt: d(10) },
    ],

    pools: [
      {
        id: makeId('pool', 1), name: 'Satin Shadows Backers Guild',
        description: 'A collaborative funding pool for backers of Satin Shadows. Members pool contributions for higher tier rewards and shared credit.',
        creator: C2, maxMembers: 20, currentMembers: 3, contributionAmount: '100000',
        category: 'music', status: 'open',
        deadline: n + 86400000 * 30, targetAmount: '2000000', currentAmount: '600000',
      },
    ],

    walletBalances: [
      { address: C1, stxBalance: '6036', ngnBalance: '8450000', usdBalance: '6036', lastUpdated: n },
      { address: C2, stxBalance: '2286', ngnBalance: '3200000', usdBalance: '2286', lastUpdated: n },
      { address: B1, stxBalance: '10714', ngnBalance: '15000000', usdBalance: '10714', lastUpdated: n },
    ],

    credibilitySummaries: [
      {
        address: C1,
        summary: 'Chidi Okonkwo has a strong track record of 2 successfully funded campaigns with a 100% milestone completion rate. Rated 4.6/5 across 7 reviews with particular strengths in production quality (5.0 avg) and storytelling (4.5 avg). Completed "Delta Frequencies" (₦800,000) on time and under budget. Currently running "Echoes of Harmattan" (₦250,000 target) with 75% funded and 3 of 5 milestones delivered ahead of schedule. Model predicts 92% probability of successful delivery based on historical performance.',
        generatedAt: new Date().toISOString(), model: 'CineX Credibility v1.0',
        disclaimer: 'AI-generated summary based on platform history and peer ratings. Not financial advice.',
      },
      {
        address: C2,
        summary: 'Amara Obi is an emerging feature film director with 1 active campaign raising ₦5,000,000 for "Satin Shadows". 5 peer ratings averaging 4.2/5 with outstanding costume design (5.0 avg) and direction (4.5 avg). Milestone 1/5 (Costume Design) completed on schedule. Communication professionalism rated 3.0 — an area for improvement. Model projects 78% probability of campaign success with strong creative execution but recommends improved backer communication.',
        generatedAt: new Date().toISOString(), model: 'CineX Credibility v1.0',
        disclaimer: 'AI-generated summary based on platform history and peer ratings. Not financial advice.',
      },
    ],

    verificationApplications: [],
    verifiedCreators: [],
    escrowDeposits: [],
    escrowReleases: [],
    endorsements: [],
    portfolioItems: [
      {
        id: makeId('port', 1), address: C1, title: 'Silent Waters',
        description: 'A feature documentary exploring the ecological and human impact of river pollution in Nigeria\'s industrial heartland. Won Best Documentary at AFRIFF 2025.',
        category: 'film', role: 'Director/Cinematographer', year: 2025,
        mediaUrls: ['https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'https://vimeo.com/123456789'],
        awards: ['Best Documentary — AFRIFF 2025', 'Audience Choice Award — Lagos Film Festival 2025'],
      },
      {
        id: makeId('port', 2), address: C1, title: 'Echoes of the North',
        description: 'A poetic short film capturing daily life across three northern Nigerian cities through the eyes of street musicians. Shot entirely on vintage lenses.',
        category: 'film', role: 'Director/Producer', year: 2024,
        mediaUrls: ['https://www.youtube.com/watch?v=abcdef12345'],
        awards: ['Official Selection — FESPACO 2024'],
      },
      {
        id: makeId('port', 3), address: C2, title: 'Satin Shadows — Concept Teaser',
        description: 'Concept teaser for the upcoming feature film showcasing the avant-garde costume design and magical realism aesthetic.',
        category: 'visual-art', role: 'Director/Costume Designer', year: 2026,
        mediaUrls: ['https://vimeo.com/987654321', 'https://www.youtube.com/watch?v=zyxwvutsrq'],
      },
      {
        id: makeId('port', 4), address: C2, title: 'Lagos Fashion Week — Opening Sequence',
        description: 'Commissioned short film for Lagos Fashion Week 2025, blending documentary and fashion cinematography.',
        category: 'film', role: 'Director', year: 2025,
        mediaUrls: ['https://drive.google.com/file/d/1Y_Zu9nltx6mPxlqsBObGM3Ikw9YrbLXz/view'],
        awards: ['Best Fashion Film — Lagos Fashion Week 2025'],
      },
    ],
    collaborations: [],
  };
}

export function hasSeedData(): boolean {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const data = JSON.parse(raw) as DemoData;
    return data.campaigns.length > 0;
  } catch {
    return false;
  }
}

export function getDemoData(): DemoData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const seed = buildSeedData();
      setDemoData(seed);
      return seed;
    }
    return JSON.parse(raw) as DemoData;
  } catch {
    const seed = buildSeedData();
    setDemoData(seed);
    return seed;
  }
}

export function setDemoData(data: DemoData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error('Failed to persist demo data to localStorage:', e);
  }
}

export function resetToSeed(): void {
  const seed = buildSeedData();
  setDemoData(seed);
}

export function getAll<T extends Record<string, unknown>>(
  collection: DemoCollection
): T[] {
  const data = getDemoData();
  return data[collection] as unknown as T[];
}

export function getById<T extends Record<string, unknown>>(
  collection: DemoCollection,
  id: string
): T | undefined {
  const items = getAll<T>(collection);
  return items.find((item) => (item as unknown as { id: string }).id === id);
}

export function addItem<T extends Record<string, unknown>>(
  collection: DemoCollection,
  item: T
): T {
  const data = getDemoData();
  const items = data[collection] as unknown as T[];
  const itemWithId = { ...item } as Record<string, unknown>;
  if (!itemWithId.id) {
    const prefix = collection === 'milestones' ? 'mile'
      : collection === 'campaigns' ? 'camp'
      : collection === 'ratings' ? 'rate'
      : collection === 'feed' ? 'feed'
      : collection === 'pools' ? 'pool'
      : collection === 'contributions' ? 'cont'
      : collection === 'profiles' ? 'prof'
      : collection === 'verificationApplications' ? 'vapp'
      : collection === 'verifiedCreators' ? 'vfm'
      : collection === 'escrowDeposits' ? 'esc'
      : collection === 'escrowReleases' ? 'esr'
      : collection === 'endorsements' ? 'endo'
      : collection === 'portfolioItems' ? 'port'
      : collection === 'collaborations' ? 'collab'
      : collection === 'walletBalances' ? 'wal'
      : collection === 'credibilitySummaries' ? 'cred'
      : 'item';
    itemWithId.id = makeId(prefix, data.nextId);
    data.nextId += 1;
  }
  items.push(itemWithId as unknown as T);
  setDemoData(data);
  return itemWithId as unknown as T;
}

export function updateItem<T extends Record<string, unknown>>(
  collection: DemoCollection,
  id: string,
  updates: Partial<T>
): T | undefined {
  const data = getDemoData();
  const items = data[collection] as unknown as T[];
  const index = items.findIndex(
    (item) => (item as unknown as { id: string }).id === id
  );
  if (index === -1) return undefined;
  items[index] = { ...items[index], ...updates };
  setDemoData(data);
  return items[index];
}

export function removeItem(
  collection: DemoCollection,
  id: string
): boolean {
  const data = getDemoData();
  const items = data[collection] as unknown as Array<{ id: string }>;
  const index = items.findIndex((item) => item.id === id);
  if (index === -1) return false;
  items.splice(index, 1);
  setDemoData(data);
  return true;
}

export function findItems<T extends Record<string, unknown>>(
  collection: DemoCollection,
  predicate: (item: T) => boolean
): T[] {
  const items = getAll<T>(collection);
  return items.filter(predicate);
}

export function getSettings(address: string): UserSettings | undefined {
  const data = getDemoData();
  return data.userSettings[address];
}

export function saveSettings(
  address: string,
  settings: UserSettings
): void {
  const data = getDemoData();
  data.userSettings[address] = settings;
  setDemoData(data);
}

export function getNextId(data: DemoData): number {
  return data.nextId;
}

export { SEED_ADDRESSES };
