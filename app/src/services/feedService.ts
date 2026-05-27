import type { FeedEvent, ServiceResponse } from '../types';
import { getAll, addItem, findItems } from '../contexts/DemoStorage';

export function getFeed(limit = 20, offset = 0): ServiceResponse<FeedEvent[]> {
  const all = getAll<FeedEvent>('feed');
  const sorted = all.sort((a, b) => b.createdAt - a.createdAt);
  const page = sorted.slice(offset, offset + limit);
  return { success: true, data: page };
}

export function getUserFeed(address: string, limit = 20): ServiceResponse<FeedEvent[]> {
  const items = findItems<FeedEvent>('feed', e => e.actor === address || e.targetId === address);
  const sorted = items.sort((a, b) => b.createdAt - a.createdAt);
  return { success: true, data: sorted.slice(0, limit) };
}

export function addFeedEvent(
  type: FeedEvent['type'],
  actor: string,
  summary: string,
  targetId?: string,
  metadata?: Record<string, unknown>
): ServiceResponse<FeedEvent> {
  const event: FeedEvent = {
    id: '',
    type,
    actor,
    targetId,
    summary,
    metadata,
    createdAt: Date.now(),
  };
  const created = addItem('feed', event);
  return { success: true, data: created };
}
