import type {
  Campaign, Milestone, CampaignContribution, Profile, Rating, FeedEvent,
  Pool, VerificationApplication, VerifiedFilmmaker, EscrowDeposit, EscrowRelease,
  Endorsement, PortfolioItem, CredibilitySummary, ServiceResponse,
  PoolProposal, ProposalVote, PoolMember, CreateCampaignParams, ContributeToCampaignParams,
} from '../types';
import type { YieldClaim, OraclePrice, ContractState, WalletBalance } from './mockSeedData';
import { demoState } from './demoState';

import { isDemoFailing } from './demo';

const MUTATION_FAIL_RATE = 0.3;

function ok<T>(data: T, txId?: string): ServiceResponse<T> {
  return { success: true, data, ...(txId ? { transactionId: txId } : {}) };
}

function err(msg: string): ServiceResponse<never> {
  return { success: false, error: msg };
}

function txId(prefix: string): string {
  return `tx_${prefix}_${Date.now()}`;
}

function simulateFail(action: string): ServiceResponse<never> | null {
  if (isDemoFailing() && Math.random() < MUTATION_FAIL_RATE) {
    return err(`${action} failed: simulated network error (demo fail mode)`);
  }
  return null;
}

// ── Campaign ──

export async function getCampaigns(status?: Campaign['status']): Promise<ServiceResponse<Campaign[]>> {
  const items = demoState.getCampaigns(status);
  return ok(items);
}

export async function getCampaign(id: string): Promise<ServiceResponse<Campaign>> {
  const data = demoState.getCampaign(id);
  if (!data) return err('Campaign not found');
  return ok(data);
}

export async function createCampaign(params: CreateCampaignParams, creator: string): Promise<ServiceResponse<Campaign>> {
  { const f = simulateFail('createCampaign'); if (f) return f; }
  try {
    const data = await demoState.createCampaign({ ...params, creator });
    return ok(data, txId('create'));
  } catch (e: any) { return err(e.message); }
}

export async function getCreatorCampaigns(address: string): Promise<ServiceResponse<Campaign[]>> {
  return ok(demoState.getCreatorCampaigns(address));
}

export async function getBackerContributions(address: string): Promise<ServiceResponse<CampaignContribution[]>> {
  return ok(demoState.getContributions(undefined, address));
}

export async function getCampaignContributions(campaignId: string): Promise<ServiceResponse<CampaignContribution[]>> {
  return ok(demoState.getContributions(campaignId));
}

export async function contributeToCampaign(params: ContributeToCampaignParams, contributor: string): Promise<ServiceResponse<CampaignContribution>> {
  { const f = simulateFail('contributeToCampaign'); if (f) return f; }
  try {
    const data = await demoState.contribute(params.campaignId, contributor, params.amount, params.message);
    return ok(data, data.txId);
  } catch (e: any) { return err(e.message); }
}

export async function getTotalFundsRaised(): Promise<ServiceResponse<string>> {
  const total = demoState.getData().campaigns.reduce((s, c) => s + Number(c.currentAmount), 0);
  return ok(total.toString());
}

export async function getActiveCampaignCount(): Promise<ServiceResponse<number>> {
  return ok(demoState.getCampaigns('active').length);
}

export async function getCampaignChainState(_id: string): Promise<ServiceResponse<{ escrow: unknown; module: unknown }>> {
  return ok({ escrow: { balance: '0', locked: true }, module: { exists: true } });
}

export async function getTotalContributedByUser(address: string): Promise<ServiceResponse<string>> {
  const total = demoState.getContributions(undefined, address).reduce((s, c) => s + Number(c.amount), 0);
  return ok(total.toString());
}

export async function getCreatorContributions(address: string): Promise<ServiceResponse<CampaignContribution[]>> {
  return ok(demoState.getContributions(undefined, address));
}

// ── Milestone ──

export async function getCreatorMilestones(address: string): Promise<ServiceResponse<Milestone[]>> {
  const campaigns = demoState.getCreatorCampaigns(address);
  const ids = new Set(campaigns.map(c => c.id));
  const all = demoState.getMilestones();
  return ok(all.filter(m => ids.has(m.campaignId)));
}

export async function getCampaignMilestones(campaignId: string): Promise<ServiceResponse<Milestone[]>> {
  return ok(demoState.getMilestones(campaignId));
}

export async function getMilestone(id: string): Promise<ServiceResponse<Milestone>> {
  const data = demoState.getMilestones().find(m => m.id === id);
  if (!data) return err('Milestone not found');
  return ok(data);
}

export async function createMilestone(
  campaignId: string, title: string, description: string,
  fundingRequired: string, deadline: number, deliverables?: string[]
): Promise<ServiceResponse<Milestone>> {
  { const f = simulateFail('createMilestone'); if (f) return f; }
  try {
    const data = await demoState.createMilestone(campaignId, title, description, fundingRequired, deadline, deliverables);
    return ok(data, txId('mile'));
  } catch (e: any) { return err(e.message); }
}

export async function updateMilestoneStatus(id: string, status: Milestone['status']): Promise<ServiceResponse<Milestone>> {
  { const f = simulateFail('updateMilestoneStatus'); if (f) return f; }
  try {
    const data = demoState.getMilestones().find(m => m.id === id);
    if (!data) return err('Milestone not found');
    if (status === 'active') await demoState.submitMilestoneProof(id);
    else {
      const d = demoState.getData();
      const ms = d.milestones.find(m => m.id === id);
      if (ms) { ms.status = status; demoState.persist(d); }
    }
    return ok({ ...demoState.getMilestones().find(m => m.id === id)! }, txId('mile_update'));
  } catch (e: any) { return err(e.message); }
}

export async function getCompletedCount(campaignId: string): Promise<ServiceResponse<number>> {
  const ms = demoState.getMilestones(campaignId);
  return ok(ms.filter(m => m.status === 'completed').length);
}

export async function castVote(milestoneId: string, voterAddress: string, approved: boolean, contributionWeight: number): Promise<ServiceResponse<{ voted: boolean; thresholdMet: boolean; totalYes: number; grandTotal: number; autoCompleted: boolean }>> {
  { const f = simulateFail('castVote'); if (f) return f; }
  try {
    const result = await demoState.approveMilestone(milestoneId, voterAddress, approved);
    return ok({ voted: result.approved, thresholdMet: true, totalYes: 1, grandTotal: 1, autoCompleted: true }, txId('vote'));
  } catch (e: any) { return err(e.message); }
}

export async function getMilestoneVotes(milestoneId: string): Promise<ServiceResponse<{ votes: unknown[]; result: { totalYes: number; grandTotal: number; percent: number; passed: boolean } }>> {
  const votes = demoState.getData().milestoneVotes.filter(v => v.milestoneId === milestoneId);
  const totalYes = votes.filter(v => v.approved).reduce((s, v) => s + v.weight, 0);
  const grandTotal = votes.reduce((s, v) => s + v.weight, 0) || 1;
  const ms = demoState.getMilestones().find(m => m.id === milestoneId);
  const threshold = ms ? Number(ms.fundingRequired) * 0.51 : 0;
  return ok({ votes, result: { totalYes, grandTotal, percent: Math.round(totalYes / grandTotal * 100), passed: totalYes >= threshold } });
}

export async function getMilestoneProgress(campaignId: string): Promise<ServiceResponse<{ completed: number; total: number; percent: number }>> {
  const ms = demoState.getMilestones(campaignId);
  const completed = ms.filter(m => m.status === 'completed').length;
  const total = ms.length;
  return ok({ completed, total, percent: total ? Math.round(completed / total * 100) : 0 });
}

// ── Pool ──

export async function getPools(status?: Pool['status']): Promise<ServiceResponse<Pool[]>> {
  return ok(demoState.getPools(status));
}

export async function getPool(id: string): Promise<ServiceResponse<Pool>> {
  const data = demoState.getPool(id);
  if (!data) return err('Pool not found');
  return ok(data);
}

export async function getPoolDetail(id: string): Promise<ServiceResponse<{ pool: Pool; members: PoolMember[]; proposals: PoolProposal[]; chain: unknown }>> {
  const pool = demoState.getPool(id);
  if (!pool) return err('Pool not found');
  return ok({ pool, members: demoState.getPoolMembers(id), proposals: demoState.getPoolProposals(id), chain: null });
}

export async function createPool(creator: string, name: string, description: string, targetAmount: string, contributionAmount: string, maxMembers: number, category: string, deadline: number): Promise<ServiceResponse<Pool>> {
  { const f = simulateFail('createPool'); if (f) return f; }
  try {
    const data = await demoState.createPool({ name, description, creator, targetAmount, contributionAmount, maxMembers, category, deadline });
    return ok(data, txId('pool'));
  } catch (e: any) { return err(e.message); }
}

export async function joinPool(poolId: string, address: string, amount: string): Promise<ServiceResponse<Pool>> {
  { const f = simulateFail('joinPool'); if (f) return f; }
  try {
    await demoState.joinPool(poolId, address, amount);
    return ok(demoState.getPool(poolId)!, txId('join'));
  } catch (e: any) { return err(e.message); }
}

export async function contributeToPool(_poolId: string, _address: string, _amount: string): Promise<ServiceResponse<{ chain: unknown }>> {
  { const f = simulateFail('contributeToPool'); if (f) return f; }
  return ok({ chain: null }, txId('pool_contrib'));
}

export async function getPoolProposals(poolId: string): Promise<ServiceResponse<PoolProposal[]>> {
  return ok(demoState.getPoolProposals(poolId));
}

export async function createProposal(poolId: string, proposer: string, campaignId: string, amount: string, description?: string): Promise<ServiceResponse<{ id: number; chain: unknown }>> {
  { const f = simulateFail('createProposal'); if (f) return f; }
  try {
    const prop = await demoState.createProposal(poolId, proposer, campaignId, amount, description);
    return ok({ id: parseInt(prop.id.split('_').pop() || '0', 10), chain: null }, txId('prop'));
  } catch (e: any) { return err(e.message); }
}

export async function getProposalDetail(proposalId: string): Promise<ServiceResponse<{ proposal: PoolProposal; votes: ProposalVote[]; chain: unknown }>> {
  const prop = demoState.getProposal(proposalId);
  if (!prop) return err('Proposal not found');
  return ok({ proposal: prop, votes: demoState.getProposalVotes(proposalId), chain: null });
}

export async function voteOnProposal(proposalId: string, voter: string, approve: boolean, _weight?: number): Promise<ServiceResponse<{ voted: boolean; autoApproved: boolean; chain: unknown }>> {
  { const f = simulateFail('voteOnProposal'); if (f) return f; }
  try {
    const result = await demoState.voteOnProposal(proposalId, voter, approve);
    return ok({ ...result, chain: null }, txId('pv'));
  } catch (e: any) { return err(e.message); }
}

export async function executeProposal(proposalId: string): Promise<ServiceResponse<{ status: string; chain: unknown }>> {
  { const f = simulateFail('executeProposal'); if (f) return f; }
  try {
    await demoState.executeProposal(proposalId);
    return ok({ status: 'executed', chain: null }, txId('exec'));
  } catch (e: any) { return err(e.message); }
}

export async function closePool(poolId: string): Promise<ServiceResponse<{ status: string; chain: unknown }>> {
  { const f = simulateFail('closePool'); if (f) return f; }
  try {
    await demoState.closePool(poolId);
    return ok({ status: 'closed', chain: null }, txId('close'));
  } catch (e: any) { return err(e.message); }
}

export async function withdrawFromPool(_poolId: string, _address: string, _amount: string): Promise<ServiceResponse<{ chain: unknown }>> {
  return ok({ chain: null }, txId('withdraw'));
}

export async function getPoolMember(poolId: string, address: string): Promise<ServiceResponse<PoolMember | undefined>> {
  const member = demoState.getPoolMembers(poolId).find(m => m.address === address);
  if (!member) return err('Not a member');
  return ok(member);
}

export async function getCreatorPools(address: string): Promise<ServiceResponse<Pool[]>> {
  return ok(demoState.getCreatorPools(address));
}

// ── Profile ──

export async function getProfile(address: string): Promise<ServiceResponse<Profile>> {
  const data = demoState.getProfile(address);
  if (!data) return err('Profile not found');
  return ok(data);
}

export async function getOrCreateProfile(address: string): Promise<ServiceResponse<Profile>> {
  const data = await demoState.getOrCreateProfile(address);
  return ok(data);
}

export async function updateProfile(address: string, updates: Partial<Profile>): Promise<ServiceResponse<Profile>> {
  { const f = simulateFail('updateProfile'); if (f) return f; }
  try {
    const data = await demoState.updateProfile(address, updates);
    return ok(data, txId('profile'));
  } catch (e: any) { return err(e.message); }
}

export async function getAllProfiles(): Promise<ServiceResponse<Profile[]>> {
  return ok(demoState.getProfiles());
}

export async function searchProfiles(query: string): Promise<ServiceResponse<Profile[]>> {
  const q = query.toLowerCase();
  const matches = demoState.getProfiles().filter(p =>
    (p.displayName && p.displayName.toLowerCase().includes(q)) ||
    (p.bio && p.bio.toLowerCase().includes(q)) ||
    p.address.toLowerCase().includes(q)
  );
  return ok(matches);
}

// ── Reputation ──

export async function getRatingsForUser(address: string): Promise<ServiceResponse<Rating[]>> {
  return ok(demoState.getRatingsForUser(address));
}

export async function getRatingsByUser(address: string): Promise<ServiceResponse<Rating[]>> {
  return ok(demoState.getRatingsByUser(address));
}

export async function getAverageRating(address: string): Promise<ServiceResponse<{ average: number; count: number }>> {
  const ratings = demoState.getRatingsForUser(address);
  const count = ratings.length;
  const average = count ? ratings.reduce((s, r) => s + r.score, 0) / count : 0;
  return ok({ average: Math.round(average * 10) / 10, count });
}

export async function getRatingBreakdown(address: string): Promise<ServiceResponse<Record<string, { average: number; count: number }>>> {
  const ratings = demoState.getRatingsForUser(address);
  const breakdown: Record<string, { average: number; count: number }> = {};
  for (const r of ratings) {
    const cat = r.category || 'general';
    if (!breakdown[cat]) breakdown[cat] = { average: 0, count: 0 };
    breakdown[cat].count += 1;
    breakdown[cat].average = Math.round((breakdown[cat].average * (breakdown[cat].count - 1) + r.score) / breakdown[cat].count * 10) / 10;
  }
  return ok(breakdown);
}

export async function addRating(rater: string, ratee: string, score: number, review?: string, category?: string, projectId?: string): Promise<ServiceResponse<Rating>> {
  if (score < 1 || score > 5) return err('Rating must be between 1 and 5');
  if (rater === ratee) return err('Cannot rate yourself');
  { const f = simulateFail('addRating'); if (f) return f; }
  try {
    const data = await demoState.addRating(rater, ratee, score, review, category, projectId);
    return ok(data, txId('rate'));
  } catch (e: any) { return err(e.message); }
}

// ── Verification ──

export async function getVerificationStatus(address: string): Promise<ServiceResponse<{ applied: boolean; status?: string; verified: boolean; filmmaker?: VerifiedFilmmaker }>> {
  return ok(demoState.getVerificationStatus(address));
}

export async function applyForVerification(applicant: string, name: string, bio: string, portfolioUrl?: string, previousWorks?: string[], socialMedia?: Record<string, string>, bondAmount?: string): Promise<ServiceResponse<VerificationApplication>> {
  { const f = simulateFail('applyForVerification'); if (f) return f; }
  try {
    const data = await demoState.applyForVerification(applicant, name, bio, portfolioUrl, previousWorks, socialMedia, bondAmount);
    return ok(data, txId('vapp'));
  } catch (e: any) { return err(e.message); }
}

export async function getPendingApplications(): Promise<ServiceResponse<VerificationApplication[]>> {
  return ok(demoState.getPendingApplications());
}

export async function reviewApplication(id: string, reviewer: string, approved: boolean, rejectionReason?: string): Promise<ServiceResponse<VerificationApplication>> {
  { const f = simulateFail('reviewApplication'); if (f) return f; }
  try {
    const data = await demoState.reviewApplication(id, reviewer, approved, rejectionReason);
    return ok(data, approved ? txId('vapp_approve') : undefined);
  } catch (e: any) { return err(e.message); }
}

export async function getAllVerifiedFilmmakers(): Promise<ServiceResponse<VerifiedFilmmaker[]>> {
  return ok(demoState.getVerifiedFilmmakers());
}

// ── Wallet ──

export async function getWalletBalance(address: string): Promise<ServiceResponse<WalletBalance>> {
  const bal = demoState.getWalletBalance(address);
  if (!bal) return ok({ address, stxBalance: '0', ngnBalance: '0', usdBalance: '0', lastUpdated: Date.now() });
  return ok(bal);
}

export async function creditWallet(address: string, stxAmount: string): Promise<ServiceResponse<WalletBalance>> {
  { const f = simulateFail('creditWallet'); if (f) return f; }
  try {
    const data = await demoState.creditWallet(address, stxAmount);
    return ok(data, txId('credit'));
  } catch (e: any) { return err(e.message); }
}

export async function depositToWallet(address: string, _amount: number, _currency: string): Promise<ServiceResponse<WalletBalance>> {
  const bal = demoState.getWalletBalance(address);
  return ok(bal || { address, stxBalance: '0', ngnBalance: '0', usdBalance: '0', lastUpdated: Date.now() }, txId('deposit'));
}

export async function debitWallet(address: string, stxAmount: string): Promise<ServiceResponse<WalletBalance>> {
  { const f = simulateFail('debitWallet'); if (f) return f; }
  const data = demoState.getData();
  const bal = data.walletBalances.find(w => w.address === address);
  if (!bal || Number(bal.stxBalance) < Number(stxAmount)) return err('Insufficient balance');
  bal.stxBalance = (Number(bal.stxBalance) - Number(stxAmount)).toString();
  demoState.persist(data);
  return ok(bal, txId('debit'));
}

export async function sendFunds(senderAddress: string, _recipientId: string, _amount: number, _currency: string): Promise<ServiceResponse<WalletBalance>> {
  return getWalletBalance(senderAddress);
}

export async function convertCurrency(_from: string, _to: string, amount: string): Promise<ServiceResponse<{ amount: string; rate: string; fee: string }>> {
  const n = Number(amount);
  const fee = (n * 0.0075).toFixed(2);
  return ok({ amount: (n - Number(fee)).toString(), rate: '1400', fee });
}

export async function getConversionRates(): Promise<ServiceResponse<{ ngnPerUsd: number; spread: number }>> {
  return ok({ ngnPerUsd: 1400, spread: 0.0075 });
}

// ── Yield ──

export async function claimBackerYield(campaignId: string, claimant: string): Promise<ServiceResponse<{ tx_hash: string }>> {
  { const f = simulateFail('claimBackerYield'); if (f) return f; }
  try {
    const claim = await demoState.claimBackerYield(campaignId, claimant);
    return ok({ tx_hash: claim.txHash }, txId('yield'));
  } catch (e: any) { return err(e.message); }
}

export async function claimCreatorBonus(campaignId: string, creator: string): Promise<ServiceResponse<{ tx_hash: string }>> {
  { const f = simulateFail('claimCreatorBonus'); if (f) return f; }
  try {
    const claim = await demoState.claimBackerYield(campaignId, creator);
    return ok({ tx_hash: claim.txHash }, txId('bonus'));
  } catch (e: any) { return err(e.message); }
}

export async function claimCampaignFunds(campaignId: string): Promise<ServiceResponse<{ funds_claimed: boolean; chain: unknown }>> {
  { const f = simulateFail('claimCampaignFunds'); if (f) return f; }
  try {
    await demoState.claimCampaignFunds(campaignId);
    return ok({ funds_claimed: true, chain: null }, txId('claim'));
  } catch (e: any) { return err(e.message); }
}

// ── Feed ──

export async function getFeed(limit = 20, offset = 0): Promise<ServiceResponse<FeedEvent[]>> {
  return ok(demoState.getFeed(limit, offset));
}

export async function getUserFeed(address: string, limit = 20): Promise<ServiceResponse<FeedEvent[]>> {
  return ok(demoState.getUserFeed(address, limit));
}

export async function addFeedEvent(type: FeedEvent['type'], actor: string, summary: string, targetId?: string, metadata?: Record<string, unknown>): Promise<ServiceResponse<FeedEvent>> {
  const data = demoState.getData();
  const event: FeedEvent = {
    id: demoState.allocId(data, 'feed'), type, actor, targetId, summary, metadata, createdAt: Date.now(),
  };
  data.feed.push(event);
  demoState.persist(data);
  return ok(event);
}

// ── Portfolio ──

export async function getPortfolioForUser(address: string): Promise<ServiceResponse<PortfolioItem[]>> {
  return ok(demoState.getPortfolio(address));
}

export async function createPortfolioItem(item: Omit<PortfolioItem, 'id'>): Promise<ServiceResponse<PortfolioItem>> {
  { const f = simulateFail('createPortfolioItem'); if (f) return f; }
  try {
    const data = await demoState.addPortfolioItem(item);
    return ok(data, txId('portfolio'));
  } catch (e: any) { return err(e.message); }
}

export async function updatePortfolioItem(id: string, updates: Partial<PortfolioItem>, _address: string): Promise<ServiceResponse<PortfolioItem>> {
  { const f = simulateFail('updatePortfolioItem'); if (f) return f; }
  const data = demoState.getData();
  const idx = data.portfolioItems.findIndex(p => p.id === id);
  if (idx === -1) return err('Portfolio item not found');
  Object.assign(data.portfolioItems[idx], updates);
  demoState.persist(data);
  return ok(data.portfolioItems[idx], txId('portfolio_upd'));
}

export async function deletePortfolioItem(id: string, _address: string): Promise<ServiceResponse<boolean>> {
  { const f = simulateFail('deletePortfolioItem'); if (f) return f; }
  const data = demoState.getData();
  const idx = data.portfolioItems.findIndex(p => p.id === id);
  if (idx === -1) return err('Portfolio item not found');
  data.portfolioItems.splice(idx, 1);
  demoState.persist(data);
  return ok(true);
}

// ── AI ──

export async function getCredibilitySummary(address: string): Promise<ServiceResponse<CredibilitySummary>> {
  try {
    const data = await demoState.getCredibilitySummary(address);
    return ok(data);
  } catch (e: any) { return err(e.message); }
}

export async function refreshCredibilitySummary(address: string): Promise<ServiceResponse<CredibilitySummary>> {
  const data = demoState.getData();
  const idx = data.credibilitySummaries.findIndex(c => c.address === address);
  if (idx !== -1) data.credibilitySummaries.splice(idx, 1);
  demoState.persist(data);
  return getCredibilitySummary(address);
}

// ── Admin ──

export async function setContractState(contract: string, paused: boolean, emergencyWithdrawn?: boolean): Promise<ServiceResponse<void>> {
  { const f = simulateFail('setContractState'); if (f) return f; }
  await demoState.setContractState(contract, { contract, paused, emergencyWithdrawn: emergencyWithdrawn || false });
  return ok(undefined, txId('admin'));
}

export async function getSystemStates(): Promise<ServiceResponse<ContractState[]>> {
  return ok(demoState.getSystemStates());
}

export async function getOraclePrices(): Promise<ServiceResponse<OraclePrice[]>> {
  return ok(demoState.getOraclePrices());
}

export async function getEscrowDeposits(campaignId?: string): Promise<ServiceResponse<EscrowDeposit[]>> {
  return ok(demoState.getEscrowDeposits(campaignId));
}

export async function getReleases(milestoneId?: string): Promise<ServiceResponse<EscrowRelease[]>> {
  return ok(demoState.getReleases(milestoneId));
}

export async function getYieldClaims(campaignId?: string): Promise<ServiceResponse<YieldClaim[]>> {
  return ok(demoState.getYieldClaims(campaignId));
}

export async function getAllYieldClaims(): Promise<ServiceResponse<YieldClaim[]>> {
  return ok(demoState.getYieldClaims());
}

// ── Dashboard stats ──

export async function getDashboardStats(address: string): Promise<ServiceResponse<{
  activeCampaigns: number; totalRaised: string; reputationScore: number;
  activePools: number; totalContributed: string; yieldEarned: string; backedCreators: number;
}>> {
  const profile = demoState.getProfile(address);
  const campaigns = demoState.getCreatorCampaigns(address);
  const contributions = demoState.getContributions(undefined, address);
  const yieldTotals = demoState.getYieldClaims().filter(y => y.claimant === address).reduce((s, y) => s + Number(y.amount), 0);
  const backedCreators = new Set(contributions.map(c => {
    const camp = demoState.getCampaign(c.campaignId);
    return camp?.creator;
  }).filter(Boolean)).size;
  return ok({
    activeCampaigns: campaigns.filter(c => c.status === 'active' || c.status === 'funded').length,
    totalRaised: campaigns.reduce((s, c) => s + Number(c.currentAmount), 0).toString(),
    reputationScore: profile?.reputationScore || 0,
    activePools: demoState.getCreatorPools(address).filter(p => p.status === 'open' || p.status === 'active').length,
    totalContributed: contributions.reduce((s, c) => s + Number(c.amount), 0).toString(),
    yieldEarned: yieldTotals.toString(),
    backedCreators,
  });
}
