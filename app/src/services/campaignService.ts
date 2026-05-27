import type { Campaign, CampaignContribution, CreateCampaignParams, ContributeToCampaignParams, ServiceResponse } from '../types';
import { getAll, addItem, updateItem, getById, findItems, getDemoData, setDemoData } from '../contexts/DemoStorage';

export function getCampaigns(status?: Campaign['status']): ServiceResponse<Campaign[]> {
  const all = getAll<Campaign>('campaigns');
  const items = status ? all.filter(c => c.status === status) : all;
  return { success: true, data: items };
}

export function getCampaign(id: string): ServiceResponse<Campaign> {
  const c = getById<Campaign>('campaigns', id);
  if (!c) return { success: false, error: 'Campaign not found' };
  return { success: true, data: c };
}

export function createCampaign(params: CreateCampaignParams, creator: string): ServiceResponse<Campaign> {
  const now = Date.now();
  const campaign: Campaign = {
    id: '',
    title: params.title,
    description: params.description,
    creator,
    targetAmount: params.targetAmount,
    currentAmount: '0',
    deadline: params.deadline,
    category: params.category,
    status: 'active',
    createdAt: now,
    updatedAt: now,
    mediaUrls: params.mediaUrls,
    tags: params.tags,
  };
  const created = addItem('campaigns', campaign);
  return { success: true, data: created, transactionId: `tx_create_${created.id}` };
}

export function getCreatorCampaigns(address: string): ServiceResponse<Campaign[]> {
  const items = findItems<Campaign>('campaigns', c => c.creator === address);
  return { success: true, data: items };
}

export function getBackerContributions(address: string): ServiceResponse<CampaignContribution[]> {
  const items = findItems<CampaignContribution>('contributions', c => c.contributor === address);
  return { success: true, data: items };
}

export function getCampaignContributions(campaignId: string): ServiceResponse<CampaignContribution[]> {
  const items = findItems<CampaignContribution>('contributions', c => c.campaignId === campaignId);
  return { success: true, data: items };
}

export function contributeToCampaign(params: ContributeToCampaignParams, contributor: string): ServiceResponse<CampaignContribution> {
  const campaign = getById<Campaign>('campaigns', params.campaignId);
  if (!campaign) return { success: false, error: 'Campaign not found' };

  const now = Date.now();
  const contribution: CampaignContribution = {
    campaignId: params.campaignId,
    contributor,
    amount: params.amount,
    timestamp: now,
    txId: `tx_cont_${now}_${Math.random().toString(36).slice(2, 8)}`,
    message: params.message,
  };

  const newAmount = (Number(campaign.currentAmount) + Number(params.amount)).toString();
  updateItem('campaigns', params.campaignId, {
    currentAmount: newAmount,
    updatedAt: now,
    status: Number(newAmount) >= Number(campaign.targetAmount) ? 'funded' : campaign.status,
  } as Partial<Campaign>);

  const created = addItem('contributions', contribution);
  return { success: true, data: created, transactionId: contribution.txId };
}

export function getTotalFundsRaised(): ServiceResponse<string> {
  const all = getAll<Campaign>('campaigns');
  const total = all.reduce((sum, c) => sum + Number(c.currentAmount), 0);
  return { success: true, data: total.toString() };
}

export function getActiveCampaignCount(): ServiceResponse<number> {
  const all = getAll<Campaign>('campaigns');
  return { success: true, data: all.filter(c => c.status === 'active').length };
}

export function getTotalContributedByUser(address: string): ServiceResponse<string> {
  const items = findItems<CampaignContribution>('contributions', c => c.contributor === address);
  const total = items.reduce((sum, c) => sum + Number(c.amount), 0);
  return { success: true, data: total.toString() };
}
