import type { VerificationApplication, VerifiedFilmmaker, ServiceResponse } from '../types';
import * as api from './api';
import * as mock from './mockContractService';
import { isDemoMode } from './demo';

interface StatusResponse {
  applied: boolean;
  applications: VerificationApplication[];
  verified: boolean;
  filmmaker: VerifiedFilmmaker | null;
}

export async function getVerificationStatus(address: string): Promise<ServiceResponse<{ applied: boolean; status?: string; verified: boolean; filmmaker?: VerifiedFilmmaker }>> {
  if (isDemoMode()) return mock.getVerificationStatus(address);
  const res = await api.get<StatusResponse>(`/verification/status/${address}`);
  if (!res.success || !res.data) return { success: false, error: res.error || 'Failed to get verification status' };
  return {
    success: true,
    data: {
      applied: res.data.applied,
      status: res.data.applications?.[0]?.status,
      verified: res.data.verified,
      filmmaker: res.data.filmmaker || undefined,
    },
  };
}

export async function applyForVerification(
  applicant: string,
  name: string,
  bio: string,
  portfolioUrl?: string,
  previousWorks?: string[],
  socialMedia?: { twitter?: string; linkedin?: string; instagram?: string; website?: string },
  bondAmount?: string
): Promise<ServiceResponse<VerificationApplication>> {
  if (isDemoMode()) return mock.applyForVerification(applicant, name, bio, portfolioUrl, previousWorks, socialMedia, bondAmount);
  const res = await api.post<VerificationApplication>('/verification/apply', {
    applicant,
    name,
    bio,
    portfolioUrl,
    previousWorks: previousWorks || [],
    socialMedia: socialMedia || {},
    bondAmount: bondAmount || '0',
  });
  if (!res.success || !res.data) return { success: false, error: res.error || 'Failed to apply' };
  return { success: true, data: res.data, transactionId: `tx_vapp_${res.data.id}` };
}

export async function getPendingApplications(): Promise<ServiceResponse<VerificationApplication[]>> {
  if (isDemoMode()) return mock.getPendingApplications();
  const res = await api.get<VerificationApplication[]>('/verification/pending');
  if (!res.success) return { success: false, error: res.error || 'Failed to fetch pending applications' };
  return { success: true, data: res.data || [] };
}

export async function reviewApplication(id: string, reviewer: string, approved: boolean, rejectionReason?: string): Promise<ServiceResponse<VerificationApplication>> {
  if (isDemoMode()) return mock.reviewApplication(id, reviewer, approved, rejectionReason);
  const res = await api.post<VerificationApplication>(`/verification/${id}/review`, {
    reviewer,
    approved,
    rejectionReason,
  });
  if (!res.success || !res.data) return { success: false, error: res.error || 'Failed to review application' };
  return { success: true, data: res.data, transactionId: approved ? `tx_vapp_approve_${id}` : undefined };
}

export async function getAllVerifiedFilmmakers(): Promise<ServiceResponse<VerifiedFilmmaker[]>> {
  if (isDemoMode()) return mock.getAllVerifiedFilmmakers();
  const res = await api.get<VerifiedFilmmaker[]>('/verification/filmmakers');
  if (!res.success) return { success: false, error: res.error || 'Failed to fetch filmmakers' };
  return { success: true, data: res.data || [] };
}
