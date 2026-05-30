import type { PortfolioItem, ServiceResponse } from '../types';
import * as api from './api';

function toItem(m: Record<string, unknown>): PortfolioItem {
  const rawMedia = m.mediaUrls ?? (m as Record<string, unknown>)['media_urls'];
  const rawThumb = m.thumbnailUrl ?? (m as Record<string, unknown>)['thumbnail_url'];
  return {
    id: String(m.id || ''),
    address: String(m.address || ''),
    title: String(m.title || ''),
    description: String(m.description || ''),
    category: (m.category as PortfolioItem['category']) || 'short-film',
    role: String(m.role || ''),
    year: Number(m.year || new Date().getFullYear()),
    mediaUrls: Array.isArray(rawMedia) ? rawMedia : [],
    thumbnailUrl: rawThumb ? String(rawThumb) : undefined,
    awards: Array.isArray(m.awards) ? m.awards : undefined,
  };
}

export async function getPortfolioForUser(address: string): Promise<ServiceResponse<PortfolioItem[]>> {
  const res = await api.get<Record<string, unknown>[]>(`/profiles/${address}/portfolio`);
  if (!res.success) return { success: false, error: res.error || 'Failed to fetch portfolio' };
  const items = (res.data || []).map(toItem);
  return { success: true, data: items };
}

export async function createPortfolioItem(item: Omit<PortfolioItem, 'id'>): Promise<ServiceResponse<PortfolioItem>> {
  const res = await api.post<Record<string, unknown>>(`/profiles/${item.address}/portfolio`, {
    title: item.title,
    description: item.description,
    category: item.category,
    role: item.role,
    year: item.year,
    mediaUrls: item.mediaUrls || [],
    thumbnailUrl: item.thumbnailUrl || '',
    awards: item.awards || [],
  });
  if (!res.success || !res.data) return { success: false, error: res.error || 'Failed to create portfolio item' };
  return { success: true, data: toItem(res.data), transactionId: `tx_portfolio_${res.data.id}` };
}

export async function updatePortfolioItem(id: string, updates: Partial<PortfolioItem>, address: string): Promise<ServiceResponse<PortfolioItem>> {
  const body: Record<string, unknown> = {};
  if (updates.title !== undefined) body.title = updates.title;
  if (updates.description !== undefined) body.description = updates.description;
  if (updates.category !== undefined) body.category = updates.category;
  if (updates.role !== undefined) body.role = updates.role;
  if (updates.year !== undefined) body.year = updates.year;
  if (updates.mediaUrls !== undefined) body.mediaUrls = updates.mediaUrls;
  if (updates.thumbnailUrl !== undefined) body.thumbnailUrl = updates.thumbnailUrl;
  if (updates.awards !== undefined) body.awards = updates.awards;
  const res = await api.put<Record<string, unknown>>(`/profiles/${address}/portfolio/${id}`, body);
  if (!res.success || !res.data) return { success: false, error: res.error || 'Portfolio item not found' };
  return { success: true, data: toItem(res.data), transactionId: `tx_portfolio_${id}` };
}

export async function deletePortfolioItem(id: string, address: string): Promise<ServiceResponse<boolean>> {
  const res = await api.del<{ deleted: boolean }>(`/profiles/${address}/portfolio/${id}`);
  if (!res.success) return { success: false, error: res.error || 'Portfolio item not found' };
  return { success: true, data: true };
}
