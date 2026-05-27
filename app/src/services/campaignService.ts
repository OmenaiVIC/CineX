import type { Campaign, CampaignContribution, CreateCampaignParams, ContributeToCampaignParams, ServiceResponse } from '../types';
import * as api from './api';

export async function getCampaigns(status?: Campaign['status']): Promise<ServiceResponse<Campaign[]>> {
  const qs = status ? `?status=${status}` : '';
  const res = await api.get<{ campaigns: Campaign[] }>(`/campaigns${qs}`);
  if (!res.success || !res.data) return { success: false, error: res.error || 'Failed to fetch campaigns' };
  return { success: true, data: res.data.campaigns };
}

export async function getCampaign(id: string): Promise<ServiceResponse<Campaign>> {
  const res = await api.get<{ campaign: Campaign; contributions: CampaignContribution[] }>(`/campaigns/${id}`);
  if (!res.success || !res.data) return { success: false, error: res.error || 'Campaign not found' };
  return { success: true, data: res.data.campaign };
}

export async function createCampaign(params: CreateCampaignParams, creator: string): Promise<ServiceResponse<Campaign>> {
  const res = await api.post<Campaign>('/campaigns', {
    title: params.title,
    description: params.description,
    creator,
    targetAmount: params.targetAmount,
    deadline: params.deadline,
    category: params.category,
    mediaUrls: params.mediaUrls,
    tags: params.tags,
  });
  if (!res.success || !res.data) return { success: false, error: res.error || 'Failed to create campaign' };
  return { success: true, data: res.data, transactionId: `tx_create_${res.data.id}` };
}

export async function getCreatorCampaigns(address: string): Promise<ServiceResponse<Campaign[]>> {
  const res = await api.get<Campaign[]>(`/campaigns/creator/${address}`);
  if (!res.success) return { success: false, error: res.error || 'Failed to fetch creator campaigns' };
  return { success: true, data: res.data || [] };
}

export async function getBackerContributions(address: string): Promise<ServiceResponse<CampaignContribution[]>> {
  const res = await api.get<CampaignContribution[]>(`/campaigns/contributor/${address}`);
  if (!res.success) return { success: false, error: res.error || 'Failed to fetch contributions' };
  return { success: true, data: res.data || [] };
}

export async function getCampaignContributions(campaignId: string): Promise<ServiceResponse<CampaignContribution[]>> {
  const res = await api.get<CampaignContribution[]>(`/campaigns/${campaignId}/contributions`);
  if (!res.success) return { success: false, error: res.error || 'Failed to fetch contributions' };
  return { success: true, data: res.data || [] };
}

export async function contributeToCampaign(params: ContributeToCampaignParams, contributor: string): Promise<ServiceResponse<CampaignContribution>> {
  const res = await api.post<{ txId: string }>(`/campaigns/${params.campaignId}/contribute`, {
    contributor,
    amount: params.amount,
    message: params.message,
  });
  if (!res.success || !res.data) return { success: false, error: res.error || 'Contribution failed' };
  const contribution: CampaignContribution = {
    campaignId: params.campaignId,
    contributor,
    amount: params.amount,
    timestamp: Date.now(),
    txId: res.data.txId,
    message: params.message,
  };
  return { success: true, data: contribution, transactionId: res.data.txId };
}

export async function getTotalFundsRaised(): Promise<ServiceResponse<string>> {
  const res = await api.get<{ total: string }>('/campaigns/total-raised');
  if (!res.success || !res.data) return { success: false, error: res.error || 'Failed to fetch total' };
  return { success: true, data: res.data.total };
}

export async function getActiveCampaignCount(): Promise<ServiceResponse<number>> {
  const res = await api.get<{ count: number }>('/campaigns/active-count');
  if (!res.success || !res.data) return { success: false, error: res.error || 'Failed to fetch count' };
  return { success: true, data: res.data.count };
}

export async function getTotalContributedByUser(address: string): Promise<ServiceResponse<string>> {
  const res = await api.get<{ total: string }>(`/campaigns/user/${address}/total-contributed`);
  if (!res.success || !res.data) return { success: false, error: res.error || 'Failed to fetch total' };
  return { success: true, data: res.data.total };
}
