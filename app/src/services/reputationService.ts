import type { Rating, ServiceResponse } from '../types';
import * as api from './api';
import * as mock from './mockContractService';
import { isDemoMode } from './demo';

interface RatingsResponse {
  ratings: Rating[];
  summary: { avgScore: number; count: number };
}

function toRating(r: Record<string, unknown>): Rating {
  return {
    id: String(r.id || ''),
    rater: String(r.raterAddress || r.rater || ''),
    ratee: String(r.targetAddress || r.ratee || ''),
    score: Number(r.score || 0),
    review: String(r.comment || r.review || ''),
    category: String(r.category || 'general'),
    createdAt: typeof r.createdAt === 'number' && r.createdAt < 1e12 ? r.createdAt * 1000 : Number(r.createdAt || 0),
    projectId: r.projectId ? String(r.projectId) : undefined,
  };
}

export async function getRatingsForUser(address: string): Promise<ServiceResponse<Rating[]>> {
  if (isDemoMode()) return mock.getRatingsForUser(address);
  const res = await api.get<RatingsResponse>(`/profiles/${address}/ratings`);
  if (!res.success || !res.data) return { success: false, error: res.error || 'Failed to fetch ratings' };
  const ratings = (res.data.ratings || []).map(toRating);
  return { success: true, data: ratings };
}

export async function getRatingsByUser(address: string): Promise<ServiceResponse<Rating[]>> {
  if (isDemoMode()) return mock.getRatingsByUser(address);
  const all = await getAllRatings();
  if (!all.success || !all.data) return all;
  return { success: true, data: all.data.filter(r => r.rater === address) };
}

async function getAllRatings(): Promise<ServiceResponse<Rating[]>> {
  const profiles = await api.get<unknown[]>('/profiles');
  if (!profiles.success || !profiles.data) return { success: false, error: 'Failed to fetch profiles' };
  return { success: true, data: [] };
}

export async function getAverageRating(address: string): Promise<ServiceResponse<{ average: number; count: number }>> {
  if (isDemoMode()) return mock.getAverageRating(address);
  const res = await api.get<RatingsResponse>(`/profiles/${address}/ratings`);
  if (!res.success || !res.data) return { success: true, data: { average: 0, count: 0 } };
  return { success: true, data: res.data.summary || { average: 0, count: 0 } };
}

export async function getRatingBreakdown(address: string): Promise<ServiceResponse<Record<string, { average: number; count: number }>>> {
  if (isDemoMode()) return mock.getRatingBreakdown(address);
  const res = await getRatingsForUser(address);
  if (!res.success || !res.data) return { success: true, data: {} };
  const breakdown: Record<string, { average: number; count: number }> = {};
  for (const r of res.data) {
    const cat = r.category || 'general';
    if (!breakdown[cat]) breakdown[cat] = { average: 0, count: 0 };
    breakdown[cat].count += 1;
    breakdown[cat].average = Math.round(
      (breakdown[cat].average * (breakdown[cat].count - 1) + r.score) / breakdown[cat].count * 10
    ) / 10;
  }
  return { success: true, data: breakdown };
}

export async function addRating(
  rater: string,
  ratee: string,
  score: number,
  review?: string,
  category?: string,
  projectId?: string
): Promise<ServiceResponse<Rating>> {
  if (isDemoMode()) return mock.addRating(rater, ratee, score, review, category, projectId);
  if (score < 1 || score > 5) return { success: false, error: 'Rating must be between 1 and 5' };
  if (rater === ratee) return { success: false, error: 'Cannot rate yourself' };
  const res = await api.post<Rating>(`/profiles/${ratee}/ratings`, {
    raterAddress: rater,
    score,
    comment: review,
    category,
    projectId,
  });
  if (!res.success || !res.data) return { success: false, error: res.error || 'Failed to submit rating' };
  return { success: true, data: toRating(res.data as unknown as Record<string, unknown>), transactionId: `tx_rate_${res.data.id}` };
}
