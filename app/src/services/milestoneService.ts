import type { Milestone, ServiceResponse } from '../types';
import * as api from './api';

interface ProgressResponse {
  completed: number;
  total: number;
  percent: number;
}

function toMilestone(m: Record<string, unknown>): Milestone {
  return {
    id: String(m.id || ''),
    campaignId: String(m.campaignId || ''),
    title: String(m.title || ''),
    description: String(m.description || ''),
    fundingRequired: String(m.fundingRequired || '0'),
    deadline: typeof m.deadline === 'number' && m.deadline < 1e12 ? m.deadline * 1000 : Number(m.deadline || 0),
    status: (m.status as Milestone['status']) || 'pending',
    deliverables: Array.isArray(m.deliverables) ? m.deliverables : [],
    completedAt: m.completedAt
      ? (typeof m.completedAt === 'number' && m.completedAt < 1e12 ? m.completedAt * 1000 : Number(m.completedAt))
      : undefined,
  };
}

export async function getCampaignMilestones(campaignId: string): Promise<ServiceResponse<Milestone[]>> {
  const res = await api.get<Record<string, unknown>[]>(`/milestones/campaign/${campaignId}`);
  if (!res.success) return { success: false, error: res.error || 'Failed to fetch milestones' };
  const milestones = (res.data || []).map(toMilestone);
  return { success: true, data: milestones };
}

export async function getMilestone(id: string): Promise<ServiceResponse<Milestone>> {
  const res = await api.get<Record<string, unknown>>(`/milestones/${id}`);
  if (!res.success || !res.data) return { success: false, error: res.error || 'Milestone not found' };
  return { success: true, data: toMilestone(res.data) };
}

export async function createMilestone(
  campaignId: string,
  title: string,
  description: string,
  fundingRequired: string,
  deadline: number,
  deliverables?: string[]
): Promise<ServiceResponse<Milestone>> {
  const res = await api.post<Record<string, unknown>>('/milestones', {
    campaignId,
    title,
    description,
    fundingRequired,
    deadline: Math.floor(deadline / 1000),
    deliverables: deliverables || [],
  });
  if (!res.success || !res.data) return { success: false, error: res.error || 'Failed to create milestone' };
  return { success: true, data: toMilestone(res.data), transactionId: `tx_mile_${res.data.id}` };
}

export async function updateMilestoneStatus(id: string, status: Milestone['status']): Promise<ServiceResponse<Milestone>> {
  const res = await api.put<Record<string, unknown>>(`/milestones/${id}/status`, { status });
  if (!res.success || !res.data) return { success: false, error: res.error || 'Milestone not found' };
  return { success: true, data: toMilestone(res.data), transactionId: `tx_mile_update_${id}` };
}

export async function getCompletedCount(campaignId: string): Promise<ServiceResponse<number>> {
  const res = await api.get<ProgressResponse>(`/milestones/campaign/${campaignId}/progress`);
  if (!res.success || !res.data) return { success: true, data: 0 };
  return { success: true, data: res.data.completed };
}

export async function getMilestoneProgress(campaignId: string): Promise<ServiceResponse<{ completed: number; total: number; percent: number }>> {
  const res = await api.get<ProgressResponse>(`/milestones/campaign/${campaignId}/progress`);
  if (!res.success || !res.data) return { success: true, data: { completed: 0, total: 0, percent: 0 } };
  return { success: true, data: res.data };
}
