import type { Profile, Rating, ServiceResponse } from '../types';
import * as api from './api';
import * as mock from './mockContractService';
import { isDemoMode } from './demo';

interface ProfileApiResponse {
  profile: Profile;
  portfolio: unknown[];
  ratings: Rating[];
  ratingSummary: { avgScore: number; count: number };
}

interface ProfileRow {
  address: string;
  username?: string;
  bio?: string;
  avatarUrl?: string;
  portfolioUrl?: string;
  socialTwitter?: string;
  socialInstagram?: string;
  socialWebsite?: string;
  verificationLevel?: string;
  createdAt?: number;
  updatedAt?: number;
}

function toProfile(row: ProfileRow): Profile {
  const links: Record<string, string> = {};
  if (row.socialTwitter) links.twitter = row.socialTwitter;
  if (row.socialInstagram) links.instagram = row.socialInstagram;
  if (row.socialWebsite) links.website = row.socialWebsite;
  return {
    address: row.address,
    displayName: row.username || (row.address ? row.address.slice(0, 10) + '...' : 'Unknown'),
    bio: row.bio,
    avatarUrl: row.avatarUrl,
    isOnboarded: true,
    joinedAt: (row.createdAt || 0) * 1000,
    socialLinks: links,
    reputationScore: 0,
    ratingCount: 0,
  };
}

export async function getProfile(address: string): Promise<ServiceResponse<Profile>> {
  if (isDemoMode()) return mock.getProfile(address);
  const res = await api.get<ProfileApiResponse>(`/profiles/${address}`);
  if (!res.success || !res.data) return { success: false, error: res.error || 'Profile not found' };
  return { success: true, data: toProfile(res.data.profile as unknown as ProfileRow) };
}

export async function getOrCreateProfile(address: string): Promise<ServiceResponse<Profile>> {
  if (isDemoMode()) return mock.getOrCreateProfile(address);
  const existing = await getProfile(address);
  if (existing.success && existing.data) return existing;

  const res = await api.put<ProfileRow>(`/profiles/${address}`, {
    username: address.slice(0, 10) + '...',
  });
  if (!res.success || !res.data) return { success: false, error: 'Failed to create profile' };
  return { success: true, data: toProfile(res.data) };
}

export async function updateProfile(address: string, updates: Partial<Profile>): Promise<ServiceResponse<Profile>> {
  if (isDemoMode()) return mock.updateProfile(address, updates);
  const body: Record<string, unknown> = {};
  if (updates.displayName !== undefined) body.username = updates.displayName;
  if (updates.bio !== undefined) body.bio = updates.bio;
  if (updates.avatarUrl !== undefined) body.avatarUrl = updates.avatarUrl;
  if (updates.socialLinks) {
    if (updates.socialLinks.twitter !== undefined) body.socialTwitter = updates.socialLinks.twitter;
    if (updates.socialLinks.instagram !== undefined) body.socialInstagram = updates.socialLinks.instagram;
    if (updates.socialLinks.website !== undefined) body.socialWebsite = updates.socialLinks.website;
  }
  const res = await api.put<ProfileRow>(`/profiles/${address}`, body);
  if (!res.success || !res.data) return { success: false, error: res.error || 'Profile not found' };
  return { success: true, data: toProfile(res.data), transactionId: `tx_profile_${address}` };
}

export async function getAllProfiles(): Promise<ServiceResponse<Profile[]>> {
  if (isDemoMode()) return mock.getAllProfiles();
  const res = await api.get<ProfileRow[]>('/profiles');
  if (!res.success) return { success: false, error: res.error || 'Failed to fetch profiles' };
  const profiles = (res.data || []).map(toProfile);
  return { success: true, data: profiles };
}

export async function searchProfiles(query: string): Promise<ServiceResponse<Profile[]>> {
  if (isDemoMode()) return mock.searchProfiles(query);
  const res = await getAllProfiles();
  if (!res.success || !res.data) return res;
  const q = query.toLowerCase();
  const matches = res.data.filter(p =>
    (p.displayName && p.displayName.toLowerCase().includes(q)) ||
    (p.bio && p.bio.toLowerCase().includes(q)) ||
    p.address.toLowerCase().includes(q)
  );
  return { success: true, data: matches };
}
