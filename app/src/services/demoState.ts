import type {
  Campaign, Milestone, CampaignContribution, Profile, Rating, FeedEvent,
  Pool, VerificationApplication, VerifiedFilmmaker, EscrowDeposit, EscrowRelease,
  Endorsement, PortfolioItem, Collaboration, CredibilitySummary, UserSettings,
  PoolProposal, ProposalVote, PoolMember,
} from '../types';
import type { DemoData, WalletBalance, PoolProposal as SeedProposal, ProposalVote as SeedVote, PoolMember as SeedMember, MilestoneVote, YieldClaim, OraclePrice, ContractState } from './mockSeedData';
import {
  getDemoData, setDemoData, resetToSeed as resetStorage,
  addItem, updateItem, removeItem, findItems, getById, getAll, saveSettings, getSettings, SEED_ADDRESSES,
} from '../contexts/DemoStorage';

type Listener = (event: string, data?: unknown) => void;

const DEMO_DELAY = 250;

function delay(ms = DEMO_DELAY): Promise<void> {
  return new Promise(r => setTimeout(r, ms));
}

function makeId(prefix: string, num: number): string {
  return `${prefix}_${String(num).padStart(4, '0')}`;
}

function now(): number {
  return Date.now();
}

function generateTx(): string {
  return '0xdemo_' + Math.random().toString(36).slice(2, 10) + now().toString(36);
}

class DemoState {
  private listeners: Map<string, Set<Listener>> = new Map();
  private _adminCache: Set<string> = new Set();

  on(event: string, fn: Listener): () => void {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event)!.add(fn);
    return () => { this.listeners.get(event)?.delete(fn); };
  }

  emit(event: string, data?: unknown): void {
    this.listeners.get(event)?.forEach(fn => fn(event, data));
    this.listeners.get('*')?.forEach(fn => fn(event, data));
  }

  getData(): DemoData {
    return getDemoData() as unknown as DemoData;
  }

  persist(data: DemoData): void {
    setDemoData(data as unknown as DemoData);
  }

  reset(): void {
    resetStorage();
    this.emit('reset');
  }

  // ── Admin ──

  isAdmin(address: string): boolean {
    return this._adminCache.has(address);
  }

  grantAdmin(address: string): void {
    this._adminCache.add(address);
    this.emit('admin:granted', address);
  }

  revokeAdmin(address: string): void {
    this._adminCache.delete(address);
    this.emit('admin:revoked', address);
  }

  getAllAdmins(): string[] {
    return [...this._adminCache];
  }

  // ── Helpers ──

  getNextId(data: DemoData): number {
    return data.nextId;
  }

  allocId(data: DemoData, prefix: string): string {
    const id = makeId(prefix, data.nextId);
    data.nextId += 1;
    return id;
  }

  // ── Campaign Domain ──

  async createCampaign(params: {
    title: string; description: string; targetAmount: string; deadline: number;
    category: Campaign['category']; creator: string; tags?: string[]; mediaUrls?: string[];
  }): Promise<Campaign> {
    await delay();
    const data = this.getData();
    const campaign: Campaign = {
      id: this.allocId(data, 'camp'),
      title: params.title, description: params.description, creator: params.creator,
      targetAmount: params.targetAmount, currentAmount: '0',
      deadline: params.deadline, category: params.category, status: 'active',
      createdAt: now(), updatedAt: now(),
      tags: params.tags, mediaUrls: params.mediaUrls,
    };
    data.campaigns.push(campaign);
    data.feed.push({
      id: this.allocId(data, 'feed'), type: 'campaign_created', actor: params.creator,
      targetId: campaign.id, summary: `"${params.title}" campaign launched!`, createdAt: now(),
    });
    this.persist(data);
    this.emit('campaign:created', campaign);
    return campaign;
  }

  async contribute(campaignId: string, contributor: string, amount: string, message?: string): Promise<CampaignContribution> {
    await delay();
    const data = this.getData();
    const camp = data.campaigns.find(c => c.id === campaignId);
    if (!camp) throw new Error('Campaign not found');
    if (camp.status !== 'active') throw new Error('Campaign is not active');
    const contribution: CampaignContribution = {
      campaignId, contributor, amount, timestamp: now(),
      txId: generateTx(), message,
    };
    data.contributions.push(contribution);
    camp.currentAmount = (Number(camp.currentAmount) + Number(amount)).toString();
    this.updateProfileRep(contributor, 2);
    const backerName = data.profiles.find(p => p.address === contributor)?.displayName || contributor.slice(0, 6);
    data.feed.push({
      id: this.allocId(data, 'feed'), type: 'campaign_funded', actor: contributor,
      targetId: campaignId, summary: `${backerName} contributed ₦${Number(amount).toLocaleString()} to "${camp.title}"`,
      createdAt: now(),
    });
    if (Number(camp.currentAmount) >= Number(camp.targetAmount) && camp.status === 'active') {
      camp.status = 'funded';
      camp.updatedAt = now();
      data.feed.push({
        id: this.allocId(data, 'feed'), type: 'campaign_funded', actor: contributor,
        targetId: campaignId, summary: `"${camp.title}" reached its funding goal of ₦${Number(camp.targetAmount).toLocaleString()}!`,
        createdAt: now(),
      });
    }
    this.persist(data);
    this.emit('campaign:contributed', { campaignId, contribution });
    return contribution;
  }

  async claimCampaignFunds(campaignId: string): Promise<boolean> {
    await delay();
    const data = this.getData();
    const camp = data.campaigns.find(c => c.id === campaignId);
    if (!camp) throw new Error('Campaign not found');
    if (camp.status !== 'funded') throw new Error('Campaign not fully funded');
    camp.status = 'completed';
    camp.fundsClaimed = true;
    camp.updatedAt = now();
    data.yieldClaims.push({
      id: this.allocId(data, 'yc'), campaignId, claimant: camp.creator,
      amount: camp.currentAmount, type: 'creator', claimedAt: now(), txHash: generateTx(),
    });
    data.feed.push({
      id: this.allocId(data, 'feed'), type: 'milestone_reached', actor: camp.creator,
      targetId: campaignId, summary: `"${camp.title}" funds claimed — campaign completed!`,
      createdAt: now(),
    });
    this.persist(data);
    this.emit('campaign:claimed', campaignId);
    return true;
  }

  // ── Milestone Domain ──

  async createMilestone(campaignId: string, title: string, description: string, fundingRequired: string, deadline: number, deliverables?: string[]): Promise<Milestone> {
    await delay();
    const data = this.getData();
    const milestone: Milestone = {
      id: this.allocId(data, 'mile'), campaignId, title, description,
      fundingRequired, deadline, status: 'pending', deliverables,
    };
    data.milestones.push(milestone);
    this.persist(data);
    this.emit('milestone:created', milestone);
    return milestone;
  }

  async submitMilestoneProof(milestoneId: string): Promise<Milestone> {
    await delay();
    const data = this.getData();
    const ms = data.milestones.find(m => m.id === milestoneId);
    if (!ms) throw new Error('Milestone not found');
    ms.status = 'active';
    this.persist(data);
    this.emit('milestone:submitted', ms);
    return ms;
  }

  async approveMilestone(milestoneId: string, voter: string, approved: boolean): Promise<{ approved: boolean }> {
    await delay();
    const data = this.getData();
    const ms = data.milestones.find(m => m.id === milestoneId);
    if (!ms) throw new Error('Milestone not found');
    const contributed = data.contributions
      .filter(c => c.campaignId === ms.campaignId && c.contributor === voter)
      .reduce((s, c) => s + Number(c.amount), 0);
    const weight = contributed || 1;
    const vote: MilestoneVote = {
      id: this.allocId(data, 'mv'), milestoneId, voter, approved, weight, timestamp: now(),
    };
    data.milestoneVotes.push(vote);
    const allVotes = data.milestoneVotes.filter(v => v.milestoneId === milestoneId && v.approved);
    const totalWeight = allVotes.reduce((s, v) => s + v.weight, 0);
    const threshold = Number(ms.fundingRequired) * 0.51;
    if (totalWeight >= threshold) {
      ms.status = 'completed';
      ms.completedAt = now();
      const camp = data.campaigns.find(c => c.id === ms.campaignId);
      data.feed.push({
        id: this.allocId(data, 'feed'), type: 'milestone_reached', actor: voter,
        targetId: ms.campaignId, summary: `Milestone "${ms.title}" ${camp ? `for "${camp.title}"` : ''} completed!`,
        createdAt: now(),
      });
    }
    this.persist(data);
    this.emit('milestone:approved', { milestoneId, vote, completed: ms.status === 'completed' });
    return { approved: true };
  }

  async releaseMilestoneFunds(milestoneId: string): Promise<{ released: boolean }> {
    await delay();
    const data = this.getData();
    const ms = data.milestones.find(m => m.id === milestoneId);
    if (!ms || ms.status !== 'completed') throw new Error('Milestone not completed');
    const camp = data.campaigns.find(c => c.id === ms.campaignId);
    const escrowRelease: EscrowRelease = {
      escrowId: milestoneId, recipient: camp?.creator || '',
      amount: ms.fundingRequired, reason: `Milestone "${ms.title}" released`,
      txId: generateTx(), timestamp: now(),
    };
    data.escrowReleases.push(escrowRelease);
    this.persist(data);
    this.emit('milestone:released', milestoneId);
    return { released: true };
  }

  // ── Pool Domain ──

  async createPool(params: {
    name: string; description: string; creator: string; targetAmount: string;
    contributionAmount: string; maxMembers: number; category: string; deadline: number;
  }): Promise<Pool> {
    await delay();
    const data = this.getData();
    const pool: Pool = {
      id: this.allocId(data, 'pool'), name: params.name, description: params.description,
      creator: params.creator, maxMembers: params.maxMembers, currentMembers: 1,
      contributionAmount: params.contributionAmount, category: params.category,
      status: 'open', deadline: params.deadline,
      targetAmount: params.targetAmount, currentAmount: params.contributionAmount,
    };
    data.pools.push(pool);
    const member: PoolMember = {
      id: this.allocId(data, 'pm'), poolId: pool.id, address: params.creator,
      committed: params.contributionAmount, role: 'creator', joinedAt: now(),
    };
    data.poolMembers.push(member);
    data.feed.push({
      id: this.allocId(data, 'feed'), type: 'pool_formed', actor: params.creator,
      targetId: pool.id, summary: `"${params.name}" pool created!`, createdAt: now(),
    });
    this.persist(data);
    this.emit('pool:created', pool);
    return pool;
  }

  async joinPool(poolId: string, address: string, amount: string): Promise<PoolMember> {
    await delay();
    const data = this.getData();
    const pool = data.pools.find(p => p.id === poolId);
    if (!pool) throw new Error('Pool not found');
    const existing = data.poolMembers.find(m => m.poolId === poolId && m.address === address);
    if (existing) throw new Error('Already a member');
    if (pool.currentMembers >= pool.maxMembers) throw new Error('Pool is full');
    const member: SeedMember = {
      id: this.allocId(data, 'pm'), poolId, address, committed: amount, role: 'member', joinedAt: now(),
    };
    data.poolMembers.push(member);
    pool.currentMembers += 1;
    pool.currentAmount = (Number(pool.currentAmount) + Number(amount)).toString();
    this.persist(data);
    this.emit('pool:joined', { poolId, member });
    return member;
  }

  async createProposal(poolId: string, proposer: string, campaignId: string, amount: string, description?: string): Promise<PoolProposal> {
    await delay();
    const data = this.getData();
    const proposal: PoolProposal = {
      id: this.allocId(data, 'prop'), poolId, campaignId, amount, proposer,
      description, status: 'active', createdAt: now(),
    };
    data.poolProposals.push(proposal);
    this.persist(data);
    this.emit('proposal:created', proposal);
    return proposal;
  }

  async voteOnProposal(proposalId: string, voter: string, approve: boolean): Promise<{ voted: boolean; autoApproved: boolean }> {
    await delay();
    const data = this.getData();
    const prop = data.poolProposals.find(p => p.id === proposalId);
    if (!prop) throw new Error('Proposal not found');
    const existing = data.proposalVotes.find(v => v.proposalId === proposalId && v.voter === voter);
    if (existing) throw new Error('Already voted');
    const vote: SeedVote = {
      id: this.allocId(data, 'pv'), proposalId, voter, approve, weight: 1, createdAt: now(),
    };
    data.proposalVotes.push(vote);
    const allVotes = data.proposalVotes.filter(v => v.proposalId === proposalId);
    const yesVotes = allVotes.filter(v => v.approve).length;
    const totalMembers = data.poolMembers.filter(m => m.poolId === prop.poolId).length;
    if (yesVotes > totalMembers / 2 && allVotes.length >= 3) {
      prop.status = 'passed';
    }
    this.persist(data);
    this.emit('proposal:voted', { proposalId, vote, passed: prop.status === 'passed' });
    return { voted: true, autoApproved: prop.status === 'passed' };
  }

  async executeProposal(proposalId: string): Promise<void> {
    await delay();
    const data = this.getData();
    const prop = data.poolProposals.find(p => p.id === proposalId);
    if (!prop) throw new Error('Proposal not found');
    if (prop.status !== 'passed') throw new Error('Proposal not passed');
    prop.status = 'executed';
    this.persist(data);
    this.emit('proposal:executed', proposalId);
  }

  async closePool(poolId: string): Promise<void> {
    await delay();
    const data = this.getData();
    const pool = data.pools.find(p => p.id === poolId);
    if (!pool) throw new Error('Pool not found');
    pool.status = 'closed';
    this.persist(data);
    this.emit('pool:closed', poolId);
  }

  // ── Profile Domain ──

  async ensureProfile(address: string): Promise<void> {
    const existing = this.getData().profiles.find(p => p.address === address);
    if (!existing) {
      await this.getOrCreateProfile(address);
    }
  }

  async getOrCreateProfile(address: string, displayName?: string): Promise<Profile> {
    const data = this.getData();
    let profile = data.profiles.find(p => p.address === address);
    if (!profile) {
      profile = {
        address, displayName: displayName || address.slice(0, 10) + '...',
        bio: '', isOnboarded: true, joinedAt: now(), socialLinks: {},
        reputationScore: 0, ratingCount: 0,
      };
      data.profiles.push(profile);
      this.persist(data);
    }
    return profile;
  }

  async updateProfile(address: string, updates: Partial<Profile>): Promise<Profile> {
    await delay();
    const data = this.getData();
    const profile = data.profiles.find(p => p.address === address);
    if (!profile) throw new Error('Profile not found');
    Object.assign(profile, updates);
    profile.updatedAt = now() as any;
    data.feed.push({
      id: this.allocId(data, 'feed'), type: 'profile_updated', actor: address,
      targetId: undefined, summary: `${profile.displayName || address} updated their profile.`,
      createdAt: now(),
    });
    this.persist(data);
    this.emit('profile:updated', profile);
    return profile;
  }

  private updateProfileRep(address: string, delta: number): void {
    const data = this.getData();
    const profile = data.profiles.find(p => p.address === address);
    if (profile) {
      profile.reputationScore = Math.min(100, Math.max(0, (profile.reputationScore || 0) + delta));
    }
  }

  async addRating(rater: string, ratee: string, score: number, review?: string, category?: string, projectId?: string): Promise<Rating> {
    await delay();
    const data = this.getData();
    const rating: Rating = {
      id: this.allocId(data, 'rate'), rater, ratee, score, review, category: category || 'general',
      createdAt: now(), projectId,
    };
    data.ratings.push(rating);
    const rateeProfile = data.profiles.find(p => p.address === ratee);
    if (rateeProfile) {
      rateeProfile.ratingCount = (rateeProfile.ratingCount || 0) + 1;
      const all = data.ratings.filter(r => r.ratee === ratee);
      rateeProfile.reputationScore = Math.round(all.reduce((s, r) => s + r.score, 0) / all.length * 20);
    }
    this.updateProfileRep(rater, 1);
    const raterName = data.profiles.find(p => p.address === rater)?.displayName || rater.slice(0, 6);
    const rateeName = data.profiles.find(p => p.address === ratee)?.displayName || ratee.slice(0, 6);
    data.feed.push({
      id: this.allocId(data, 'feed'), type: 'rating_received', actor: ratee,
      targetId: rating.id, summary: `${rateeName} received a ${score}-star review from ${raterName}${category ? ` for ${category}` : ''}.`,
      createdAt: now(),
    });
    this.persist(data);
    this.emit('rating:added', rating);
    return rating;
  }

  async getCredibilitySummary(address: string): Promise<CredibilitySummary> {
    const data = this.getData();
    const existing = data.credibilitySummaries.find(c => c.address === address);
    if (existing) return existing;
    const profile = data.profiles.find(p => p.address === address);
    const ratingCount = data.ratings.filter(r => r.ratee === address).length;
    const campaigns = data.campaigns.filter(c => c.creator === address);
    const summary: CredibilitySummary = {
      address,
      summary: `${profile?.displayName || address} has ${campaigns.length} campaign(s) and ${ratingCount} rating(s). Active on CineX.`,
      generatedAt: new Date().toISOString(), model: 'CineX Credibility v1.0',
      disclaimer: 'AI-generated summary based on platform history and peer ratings. Not financial advice.',
    };
    data.credibilitySummaries.push(summary);
    this.persist(data);
    return summary;
  }

  async applyForVerification(applicant: string, name: string, bio: string, portfolioUrl?: string, previousWorks?: string[], socialMedia?: Record<string, string>, bondAmount?: string): Promise<VerificationApplication> {
    await delay();
    const data = this.getData();
    const app: VerificationApplication = {
      id: this.allocId(data, 'vapp'), applicant, name, bio, portfolioUrl,
      previousWorks: previousWorks || [], socialMedia: (socialMedia || {}) as any,
      bondAmount: bondAmount || '25000', documents: { identityProof: '0xdoc_' + generateTx() },
      status: 'pending', submittedAt: now(),
    };
    data.verificationApplications.push(app);
    this.persist(data);
    this.emit('verification:applied', app);
    return app;
  }

  async reviewApplication(id: string, reviewer: string, approved: boolean, rejectionReason?: string): Promise<VerificationApplication> {
    await delay();
    const data = this.getData();
    const app = data.verificationApplications.find(a => a.id === id);
    if (!app) throw new Error('Application not found');
    app.status = approved ? 'approved' : 'rejected';
    app.reviewedAt = now();
    app.reviewer = reviewer;
    if (rejectionReason) app.rejectionReason = rejectionReason;
    if (approved) {
      const vfm: VerifiedFilmmaker = {
        address: app.applicant, name: app.name, bio: app.bio,
        portfolioUrl: app.portfolioUrl, previousWorks: app.previousWorks,
        socialMedia: app.socialMedia, verifiedAt: now(),
        credibilityScore: 75, completedCampaigns: data.campaigns.filter(c => c.creator === app.applicant && c.status === 'completed').length,
        totalFundedAmount: data.campaigns.filter(c => c.creator === app.applicant).reduce((s, c) => s + Number(c.currentAmount), 0).toString(),
      };
      data.verifiedFilmmakers.push(vfm);
    }
    this.persist(data);
    this.emit('verification:reviewed', { id, approved });
    return app;
  }

  async addPortfolioItem(item: Omit<PortfolioItem, 'id'>): Promise<PortfolioItem> {
    await delay();
    const data = this.getData();
    const entry: PortfolioItem = { ...item, id: this.allocId(data, 'port') };
    data.portfolioItems.push(entry);
    this.persist(data);
    this.emit('portfolio:added', entry);
    return entry;
  }

  async claimBackerYield(campaignId: string, claimant: string): Promise<YieldClaim> {
    await delay();
    const data = this.getData();
    const camp = data.campaigns.find(c => c.id === campaignId);
    if (!camp) throw new Error('Campaign not found');
    const contribution = data.contributions.find(c => c.campaignId === campaignId && c.contributor === claimant);
    if (!contribution) throw new Error('No contribution found');
    const yieldAmount = Math.floor(Number(contribution.amount) * 0.05);
    const claim: YieldClaim = {
      id: this.allocId(data, 'yc'), campaignId, claimant, amount: yieldAmount.toString(),
      type: 'backer', claimedAt: now(), txHash: generateTx(),
    };
    data.yieldClaims.push(claim);
    this.persist(data);
    this.emit('yield:claimed', claim);
    return claim;
  }

  async setContractState(contract: string, updates: Partial<ContractState>): Promise<void> {
    const data = this.getData();
    const state = data.systemStates.find(s => s.contract === contract);
    if (state) Object.assign(state, updates);
    else data.systemStates.push({ contract, paused: false, emergencyWithdrawn: false, ...updates });
    this.persist(data);
    this.emit('admin:stateChanged', { contract, updates });
  }

  setOraclePrice(price: number): void {
    const data = this.getData();
    const oracle = data.oraclePrices.find(o => o.asset === 'STX/USD');
    if (oracle) { oracle.price = price; oracle.timestamp = now(); }
    else data.oraclePrices.push({ asset: 'STX/USD', price, timestamp: now(), source: 'demo' });
    this.persist(data);
    this.emit('admin:oracleUpdated', price);
  }

  async creditWallet(address: string, stxAmount: string): Promise<WalletBalance> {
    await delay();
    const data = this.getData();
    let bal = data.walletBalances.find(w => w.address === address);
    if (bal) {
      bal.stxBalance = (Number(bal.stxBalance) + Number(stxAmount)).toString();
      bal.ngnBalance = (Number(bal.ngnBalance) + Number(stxAmount) * 1400).toString();
      bal.usdBalance = (Number(bal.usdBalance) + Number(stxAmount)).toString();
      bal.lastUpdated = now();
    } else {
      bal = { address, stxBalance: stxAmount, ngnBalance: (Number(stxAmount) * 1400).toString(), usdBalance: stxAmount, lastUpdated: now() };
      data.walletBalances.push(bal);
    }
    this.persist(data);
    this.emit('wallet:credited', bal);
    return bal;
  }

  // ── Simple Queries ──

  getCampaigns(status?: Campaign['status']): Campaign[] {
    const data = this.getData();
    return status ? data.campaigns.filter(c => c.status === status) : [...data.campaigns];
  }

  getCampaign(id: string): Campaign | undefined {
    return this.getData().campaigns.find(c => c.id === id);
  }

  getMilestones(campaignId?: string): Milestone[] {
    const data = this.getData();
    return campaignId ? data.milestones.filter(m => m.campaignId === campaignId) : [...data.milestones];
  }

  getContributions(campaignId?: string, contributor?: string): CampaignContribution[] {
    const data = this.getData();
    let items = data.contributions;
    if (campaignId) items = items.filter(c => c.campaignId === campaignId);
    if (contributor) items = items.filter(c => c.contributor === contributor);
    return items;
  }

  getProfiles(): Profile[] {
    return [...this.getData().profiles];
  }

  getProfile(address: string): Profile | undefined {
    return this.getData().profiles.find(p => p.address === address);
  }

  getPools(status?: Pool['status']): Pool[] {
    const data = this.getData();
    return status ? data.pools.filter(p => p.status === status) : [...data.pools];
  }

  getPool(id: string): Pool | undefined {
    return this.getData().pools.find(p => p.id === id);
  }

  getPoolMembers(poolId: string): PoolMember[] {
    return this.getData().poolMembers.filter(m => m.poolId === poolId);
  }

  getPoolProposals(poolId: string): PoolProposal[] {
    return this.getData().poolProposals.filter(p => p.poolId === poolId);
  }

  getProposalVotes(proposalId: string): ProposalVote[] {
    return this.getData().proposalVotes.filter(v => v.proposalId === proposalId);
  }

  getProposal(id: string): PoolProposal | undefined {
    return this.getData().poolProposals.find(p => p.id === id);
  }

  getFeed(limit = 20, offset = 0): FeedEvent[] {
    const data = this.getData();
    return [...data.feed].sort((a, b) => b.createdAt - a.createdAt).slice(offset, offset + limit);
  }

  getUserFeed(address: string, limit = 20): FeedEvent[] {
    const data = this.getData();
    return data.feed
      .filter(e => e.actor === address || e.actor === 'system')
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, limit);
  }

  getWalletBalance(address: string): WalletBalance | undefined {
    return this.getData().walletBalances.find(w => w.address === address);
  }

  getVerificationStatus(address: string): { applied: boolean; status?: string; verified: boolean; filmmaker?: VerifiedFilmmaker } {
    const data = this.getData();
    const apps = data.verificationApplications.filter(a => a.applicant === address);
    const filmmaker = data.verifiedFilmmakers.find(f => f.address === address);
    return {
      applied: apps.length > 0,
      status: apps[0]?.status,
      verified: !!filmmaker,
      filmmaker,
    };
  }

  getCreatorCampaigns(address: string): Campaign[] {
    return this.getData().campaigns.filter(c => c.creator === address);
  }

  getCreatorPools(address: string): Pool[] {
    return this.getData().pools.filter(p => p.creator === address);
  }

  getRatingsForUser(address: string): Rating[] {
    return this.getData().ratings.filter(r => r.ratee === address);
  }

  getRatingsByUser(address: string): Rating[] {
    return this.getData().ratings.filter(r => r.rater === address);
  }

  getPortfolio(address: string): PortfolioItem[] {
    return this.getData().portfolioItems.filter(p => p.address === address);
  }

  getEscrowDeposits(campaignId?: string): EscrowDeposit[] {
    const data = this.getData();
    return campaignId ? data.escrowDeposits.filter(e => e.relatedId === campaignId) : [...data.escrowDeposits];
  }

  getReleases(milestoneId?: string): EscrowRelease[] {
    const data = this.getData();
    return milestoneId ? data.escrowReleases.filter(r => r.escrowId === milestoneId) : [...data.escrowReleases];
  }

  getVerifiedFilmmakers(): VerifiedFilmmaker[] {
    return [...this.getData().verifiedFilmmakers];
  }

  getYieldClaims(campaignId?: string): YieldClaim[] {
    const data = this.getData();
    return campaignId ? data.yieldClaims.filter(y => y.campaignId === campaignId) : [...data.yieldClaims];
  }

  getOraclePrices(): OraclePrice[] {
    return [...this.getData().oraclePrices];
  }

  getSystemStates(): ContractState[] {
    return [...this.getData().systemStates];
  }

  getPendingApplications(): VerificationApplication[] {
    return this.getData().verificationApplications.filter(a => a.status === 'pending');
  }
}

export const demoState = new DemoState();
