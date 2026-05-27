import type { Rating, ServiceResponse } from '../types';
import { getAll, addItem, getById, findItems, updateItem } from '../contexts/DemoStorage';

export function getRatingsForUser(address: string): ServiceResponse<Rating[]> {
  const items = findItems<Rating>('ratings', r => r.ratee === address);
  return { success: true, data: items.sort((a, b) => b.createdAt - a.createdAt) };
}

export function getRatingsByUser(address: string): ServiceResponse<Rating[]> {
  const items = findItems<Rating>('ratings', r => r.rater === address);
  return { success: true, data: items };
}

export function getAverageRating(address: string): ServiceResponse<{ average: number; count: number }> {
  const items = findItems<Rating>('ratings', r => r.ratee === address);
  if (items.length === 0) return { success: true, data: { average: 0, count: 0 } };
  const sum = items.reduce((s, r) => s + r.score, 0);
  return { success: true, data: { average: Math.round((sum / items.length) * 10) / 10, count: items.length } };
}

export function getRatingBreakdown(address: string): ServiceResponse<Record<string, { average: number; count: number }>> {
  const items = findItems<Rating>('ratings', r => r.ratee === address);
  const breakdown: Record<string, { average: number; count: number }> = {};
  for (const r of items) {
    const cat = r.category || 'general';
    if (!breakdown[cat]) breakdown[cat] = { average: 0, count: 0 };
    breakdown[cat].count += 1;
    breakdown[cat].average = Math.round(
      (breakdown[cat].average * (breakdown[cat].count - 1) + r.score) / breakdown[cat].count * 10
    ) / 10;
  }
  return { success: true, data: breakdown };
}

export function addRating(
  rater: string,
  ratee: string,
  score: number,
  review?: string,
  category?: string,
  projectId?: string
): ServiceResponse<Rating> {
  if (score < 1 || score > 5) return { success: false, error: 'Rating must be between 1 and 5' };
  if (rater === ratee) return { success: false, error: 'Cannot rate yourself' };

  const rating: Rating = {
    id: '',
    rater,
    ratee,
    score,
    review,
    category,
    createdAt: Date.now(),
    projectId,
  };
  const created = addItem('ratings', rating);

  const allRatings = findItems<Rating>('ratings', r => r.ratee === ratee);
  const avg = allRatings.reduce((s, r) => s + r.score, 0) / allRatings.length;
  const profile = getById<{ address: string; reputationScore: number; ratingCount: number }>('profiles', ratee);
  if (profile) {
    updateItem('profiles', ratee, {
      reputationScore: Math.round(avg * 10),
      ratingCount: allRatings.length,
    } as Partial<{ address: string; reputationScore: number; ratingCount: number }>);
  }

  return { success: true, data: created, transactionId: `tx_rate_${created.id}` };
}
