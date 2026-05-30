import type { ServiceResponse } from '../types';
import * as api from './api';

export async function claimBackerYield(campaignId: string): Promise<ServiceResponse<{ tx_hash: string }>> {
  const res = await api.post<{ tx_hash: string }>(`/yield/claim-yield/${campaignId}`);
  if (!res.success) return { success: false, error: res.error || 'Failed to claim yield' };
  return { success: true, data: res.data, transactionId: `tx_yield_${campaignId}_${Date.now()}` };
}

export async function claimCreatorBonus(campaignId: string): Promise<ServiceResponse<{ tx_hash: string }>> {
  const res = await api.post<{ tx_hash: string }>(`/yield/claim-bonus/${campaignId}`);
  if (!res.success) return { success: false, error: res.error || 'Failed to claim bonus' };
  return { success: true, data: res.data, transactionId: `tx_bonus_${campaignId}_${Date.now()}` };
}

export async function claimCampaignFunds(campaignId: string): Promise<ServiceResponse<{ funds_claimed: boolean; chain: unknown }>> {
  const res = await api.post<{ funds_claimed: boolean; chain: unknown }>(`/campaigns/${campaignId}/claim-funds`);
  if (!res.success) return { success: false, error: res.error || 'Failed to claim funds' };
  return { success: true, data: res.data, transactionId: `tx_claim_${campaignId}_${Date.now()}` };
}
