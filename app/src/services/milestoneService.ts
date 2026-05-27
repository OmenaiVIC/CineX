import type { Milestone, ServiceResponse } from '../types';
import { getAll, addItem, updateItem, getById, findItems } from '../contexts/DemoStorage';

export function getCampaignMilestones(campaignId: string): ServiceResponse<Milestone[]> {
  const items = findItems<Milestone>('milestones', m => m.campaignId === campaignId);
  return { success: true, data: items.sort((a, b) => {
    const aNum = parseInt(a.id.split('_')[1] || '0', 10);
    const bNum = parseInt(b.id.split('_')[1] || '0', 10);
    return aNum - bNum;
  }) };
}

export function getMilestone(id: string): ServiceResponse<Milestone> {
  const m = getById<Milestone>('milestones', id);
  if (!m) return { success: false, error: 'Milestone not found' };
  return { success: true, data: m };
}

export function createMilestone(
  campaignId: string,
  title: string,
  description: string,
  fundingRequired: string,
  deadline: number,
  deliverables?: string[]
): ServiceResponse<Milestone> {
  const milestone: Milestone = {
    id: '',
    campaignId,
    title,
    description,
    fundingRequired,
    deadline,
    status: 'pending',
    deliverables,
  };
  const created = addItem('milestones', milestone);
  return { success: true, data: created, transactionId: `tx_mile_${created.id}` };
}

export function updateMilestoneStatus(id: string, status: Milestone['status']): ServiceResponse<Milestone> {
  const updates: Partial<Milestone> = { status };
  if (status === 'completed') {
    updates.completedAt = Date.now();
  }
  const updated = updateItem<Milestone>('milestones', id, updates);
  if (!updated) return { success: false, error: 'Milestone not found' };
  return { success: true, data: updated, transactionId: `tx_mile_update_${id}` };
}

export function getCompletedCount(campaignId: string): ServiceResponse<number> {
  const items = findItems<Milestone>('milestones', m => m.campaignId === campaignId && m.status === 'completed');
  return { success: true, data: items.length };
}

export function getMilestoneProgress(campaignId: string): ServiceResponse<{ completed: number; total: number; percent: number }> {
  const all = findItems<Milestone>('milestones', m => m.campaignId === campaignId);
  const completed = all.filter(m => m.status === 'completed').length;
  const total = all.length;
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
  return { success: true, data: { completed, total, percent } };
}
