import type { Pool, PoolProposal, ProposalVote, ServiceResponse } from '../types';
import * as api from './api';
import * as mock from './mockContractService';
import { isDemoMode } from './demo';

interface PoolsResponse {
  pools: Pool[];
  pagination: { offset: number; limit: number; total: number };
}

interface PoolDetailResponse {
  pool: Pool;
  members: unknown[];
  proposals: PoolProposal[];
  chain: unknown;
}

export async function getPools(status?: Pool['status']): Promise<ServiceResponse<Pool[]>> {
  if (isDemoMode()) return mock.getPools(status);
  const qs = status ? `?status=${status}` : '';
  const res = await api.get<PoolsResponse>(`/pools${qs}`);
  if (!res.success || !res.data) return { success: false, error: res.error || 'Failed to fetch pools' };
  return { success: true, data: res.data.pools };
}

export async function getPool(id: string): Promise<ServiceResponse<Pool>> {
  if (isDemoMode()) return mock.getPool(id);
  const res = await api.get<PoolDetailResponse>(`/pools/${id}`);
  if (!res.success || !res.data) return { success: false, error: res.error || 'Pool not found' };
  return { success: true, data: res.data.pool };
}

export async function getPoolDetail(id: string): Promise<ServiceResponse<PoolDetailResponse>> {
  if (isDemoMode()) return mock.getPoolDetail(id) as Promise<ServiceResponse<PoolDetailResponse>>;
  const res = await api.get<PoolDetailResponse>(`/pools/${id}`);
  if (!res.success) return { success: false, error: res.error || 'Pool not found' };
  return { success: true, data: res.data };
}

export async function createPool(
  creator: string,
  name: string,
  description: string,
  targetAmount: string,
  contributionAmount: string,
  maxMembers: number,
  category: string,
  deadline: number
): Promise<ServiceResponse<Pool>> {
  if (isDemoMode()) return mock.createPool(creator, name, description, targetAmount, contributionAmount, maxMembers, category, deadline);
  const res = await api.post<Pool>('/pools', {
    name,
    description,
    creator,
    target_amount: targetAmount,
    min_commitment: contributionAmount,
    max_members: maxMembers,
    deadline,
    category,
  });
  if (!res.success || !res.data) return { success: false, error: res.error || 'Failed to create pool' };
  return { success: true, data: res.data, transactionId: `tx_pool_${res.data.id}` };
}

export async function joinPool(poolId: string, address: string, amount: string): Promise<ServiceResponse<Pool>> {
  if (isDemoMode()) return mock.joinPool(poolId, address, amount);
  const res = await api.post<{ id: number; chain: unknown }>(`/pools/${poolId}/join`, { address, amount });
  if (!res.success) return { success: false, error: res.error || 'Failed to join pool' };
  return getPool(poolId);
}

export async function contributeToPool(poolId: string, address: string, amount: string): Promise<ServiceResponse<{ chain: unknown }>> {
  if (isDemoMode()) return mock.contributeToPool(poolId, address, amount);
  const res = await api.post<{ chain: unknown }>(`/pools/${poolId}/contribute`, { address, amount });
  if (!res.success) return { success: false, error: res.error || 'Failed to contribute' };
  return { success: true, data: res.data, transactionId: `tx_pool_contrib_${poolId}_${Date.now()}` };
}

export async function getPoolProposals(poolId: string): Promise<ServiceResponse<PoolProposal[]>> {
  if (isDemoMode()) return mock.getPoolProposals(poolId);
  const res = await api.get<PoolProposal[]>(`/pools/${poolId}/proposals`);
  if (!res.success) return { success: false, error: res.error || 'Failed to fetch proposals' };
  return { success: true, data: res.data || [] };
}

export async function createProposal(poolId: string, proposer: string, campaignId: string, amount: string, description?: string): Promise<ServiceResponse<{ id: number; chain: unknown }>> {
  if (isDemoMode()) return mock.createProposal(poolId, proposer, campaignId, amount, description);
  const res = await api.post<{ id: number; chain: unknown }>(`/pools/${poolId}/proposals`, { proposer, campaign_id: campaignId, amount, description });
  if (!res.success) return { success: false, error: res.error || 'Failed to create proposal' };
  return { success: true, data: res.data, transactionId: `tx_proposal_${poolId}_${Date.now()}` };
}

export async function getProposalDetail(proposalId: string): Promise<ServiceResponse<{ proposal: PoolProposal; votes: ProposalVote[]; chain: unknown }>> {
  if (isDemoMode()) return mock.getProposalDetail(proposalId);
  const res = await api.get<{ proposal: PoolProposal; votes: ProposalVote[]; chain: unknown }>(`/pools/proposals/${proposalId}`);
  if (!res.success) return { success: false, error: res.error || 'Failed to fetch proposal' };
  return { success: true, data: res.data };
}

export async function voteOnProposal(proposalId: string, voter: string, approve: boolean, weight?: number): Promise<ServiceResponse<{ voted: boolean; autoApproved: boolean; chain: unknown }>> {
  if (isDemoMode()) return mock.voteOnProposal(proposalId, voter, approve, weight);
  const res = await api.post<{ voted: boolean; autoApproved: boolean; chain: unknown }>(`/pools/proposals/${proposalId}/vote`, { voter, approve, weight });
  if (!res.success) return { success: false, error: res.error || 'Failed to vote' };
  return { success: true, data: res.data, transactionId: `tx_vote_${proposalId}_${Date.now()}` };
}

export async function executeProposal(proposalId: string): Promise<ServiceResponse<{ status: string; chain: unknown }>> {
  if (isDemoMode()) return mock.executeProposal(proposalId);
  const res = await api.post<{ status: string; chain: unknown }>(`/pools/proposals/${proposalId}/execute`);
  if (!res.success) return { success: false, error: res.error || 'Failed to execute proposal' };
  return { success: true, data: res.data, transactionId: `tx_exec_${proposalId}_${Date.now()}` };
}

export async function closePool(poolId: string): Promise<ServiceResponse<{ status: string; chain: unknown }>> {
  if (isDemoMode()) return mock.closePool(poolId);
  const res = await api.post<{ status: string; chain: unknown }>(`/pools/${poolId}/close`);
  if (!res.success) return { success: false, error: res.error || 'Failed to close pool' };
  return { success: true, data: res.data, transactionId: `tx_close_${poolId}_${Date.now()}` };
}

export async function withdrawFromPool(poolId: string, address: string, amount: string): Promise<ServiceResponse<{ chain: unknown }>> {
  if (isDemoMode()) return mock.withdrawFromPool(poolId, address, amount);
  const res = await api.post<{ chain: unknown }>(`/pools/${poolId}/withdraw`, { address, amount });
  if (!res.success) return { success: false, error: res.error || 'Failed to withdraw' };
  return { success: true, data: res.data, transactionId: `tx_withdraw_${poolId}_${Date.now()}` };
}

export async function getPoolMember(poolId: string, address: string): Promise<ServiceResponse<unknown>> {
  if (isDemoMode()) return mock.getPoolMember(poolId, address) as Promise<ServiceResponse<unknown>>;
  const res = await api.get<unknown>(`/pools/${poolId}/member/${address}`);
  if (!res.success) return { success: false, error: res.error || 'Not a member' };
  return { success: true, data: res.data };
}

export async function getCreatorPools(address: string): Promise<ServiceResponse<Pool[]>> {
  if (isDemoMode()) return mock.getCreatorPools(address);
  const res = await getPools();
  if (!res.success || !res.data) return res;
  return { success: true, data: res.data.filter(p => p.creator === address) };
}
