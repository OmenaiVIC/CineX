import type { Profile, ServiceResponse } from '../types';
import { getAll, addItem, updateItem, getById, getDemoData, setDemoData } from '../contexts/DemoStorage';

export function getProfile(address: string): ServiceResponse<Profile> {
  const p = getById<Profile>('profiles', address);
  if (!p) return { success: false, error: 'Profile not found' };
  return { success: true, data: p };
}

export function getOrCreateProfile(address: string): ServiceResponse<Profile> {
  const existing = getById<Profile>('profiles', address);
  if (existing) return { success: true, data: existing };

  const profile: Profile = {
    address,
    displayName: address.slice(0, 10) + '...',
    isOnboarded: true,
    joinedAt: Date.now(),
    socialLinks: {},
    reputationScore: 0,
    ratingCount: 0,
  };
  const created = addItem('profiles', profile);
  return { success: true, data: created };
}

export function updateProfile(address: string, updates: Partial<Profile>): ServiceResponse<Profile> {
  const updated = updateItem<Profile>('profiles', address, updates);
  if (!updated) return { success: false, error: 'Profile not found' };
  return { success: true, data: updated, transactionId: `tx_profile_${address}` };
}

export function getAllProfiles(): ServiceResponse<Profile[]> {
  const all = getAll<Profile>('profiles');
  return { success: true, data: all };
}

export function searchProfiles(query: string): ServiceResponse<Profile[]> {
  const all = getAll<Profile>('profiles');
  const q = query.toLowerCase();
  const matches = all.filter(p =>
    (p.displayName && p.displayName.toLowerCase().includes(q)) ||
    (p.bio && p.bio.toLowerCase().includes(q)) ||
    p.address.toLowerCase().includes(q)
  );
  return { success: true, data: matches };
}
