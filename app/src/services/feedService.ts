import type { FeedEvent, ServiceResponse } from '../types';
import * as api from './api';
import * as mock from './mockContractService';
import { isDemoMode } from './demo';

interface BackendFeedEvent {
  id: number;
  eventType: string;
  eventData: string;
  actor: string;
  poolId?: number;
  campaignId?: number;
  createdAt: number;
}

interface FeedResponse {
  events: BackendFeedEvent[];
  pagination: { offset: number; limit: number; total: number };
}

function toFeedEvent(e: BackendFeedEvent): FeedEvent {
  let eventData: Record<string, unknown> = {};
  try { eventData = JSON.parse(typeof e.eventData === 'string' ? e.eventData : '{}'); } catch { /* ignore */ }
  const timestamp = typeof e.createdAt === 'number' && e.createdAt < 1e12 ? e.createdAt * 1000 : e.createdAt;
  return {
    id: String(e.id),
    type: (e.eventType as FeedEvent['type']) || 'system',
    actor: e.actor || '',
    targetId: e.campaignId ? String(e.campaignId) : e.poolId ? `pool_${e.poolId}` : undefined,
    summary: (eventData?.summary as string) || `${e.eventType} event`,
    metadata: eventData,
    createdAt: timestamp,
  };
}

export async function getFeed(limit = 20, offset = 0): Promise<ServiceResponse<FeedEvent[]>> {
  if (isDemoMode()) return mock.getFeed(limit, offset);
  const res = await api.get<FeedResponse>(`/feed/global?limit=${limit}&offset=${offset}`);
  if (!res.success || !res.data) return { success: false, error: res.error || 'Failed to fetch feed' };
  const events = (res.data.events || []).map(toFeedEvent);
  return { success: true, data: events };
}

export async function getUserFeed(address: string, limit = 20): Promise<ServiceResponse<FeedEvent[]>> {
  if (isDemoMode()) return mock.getUserFeed(address, limit);
  const res = await api.get<FeedResponse>(`/feed/user/${address}?limit=${limit}`);
  if (!res.success || !res.data) return { success: false, error: res.error || 'Failed to fetch feed' };
  const events = (res.data.events || []).map(toFeedEvent);
  return { success: true, data: events };
}

export async function addFeedEvent(
  type: FeedEvent['type'],
  actor: string,
  summary: string,
  targetId?: string,
  metadata?: Record<string, unknown>
): Promise<ServiceResponse<FeedEvent>> {
  if (isDemoMode()) return mock.addFeedEvent(type, actor, summary, targetId, metadata);
  const res = await api.post<{ id: number }>('/feed/event', {
    eventType: type,
    eventData: JSON.stringify({ summary, ...metadata }),
    actor,
  });
  if (!res.success) return { success: false, error: res.error || 'Failed to create feed event' };
  const event: FeedEvent = {
    id: String(res.data?.id || Date.now()),
    type,
    actor,
    targetId,
    summary,
    metadata,
    createdAt: Date.now(),
  };
  return { success: true, data: event };
}
