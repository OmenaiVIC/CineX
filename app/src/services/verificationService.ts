import type { VerificationApplication, VerifiedFilmmaker, ServiceResponse } from '../types';
import { getAll, addItem, updateItem, getById, findItems } from '../contexts/DemoStorage';

export function getVerificationStatus(address: string): ServiceResponse<{ applied: boolean; status?: string; verified: boolean; filmmaker?: VerifiedFilmmaker }> {
  const apps = findItems<VerificationApplication>('verificationApplications', a => a.applicant === address);
  const verified = findItems<VerifiedFilmmaker>('verifiedFilmmakers', f => f.address === address);
  return {
    success: true,
    data: {
      applied: apps.length > 0,
      status: apps[0]?.status,
      verified: verified.length > 0,
      filmmaker: verified[0],
    },
  };
}

export function applyForVerification(
  applicant: string,
  name: string,
  bio: string,
  portfolioUrl?: string,
  previousWorks?: string[],
  socialMedia?: { twitter?: string; linkedin?: string; instagram?: string; website?: string },
  bondAmount?: string
): ServiceResponse<VerificationApplication> {
  const existingApps = findItems<VerificationApplication>('verificationApplications', a => a.applicant === applicant);
  if (existingApps.some(a => a.status === 'pending' || a.status === 'under-review')) {
    return { success: false, error: 'You already have a pending application' };
  }

  const app: VerificationApplication = {
    id: '',
    applicant,
    name,
    bio,
    portfolioUrl,
    previousWorks: previousWorks || [],
    socialMedia: socialMedia || {},
    bondAmount: bondAmount || '0',
    documents: { identityProof: 'demo-id-upload' },
    status: 'pending',
    submittedAt: Date.now(),
  };
  const created = addItem('verificationApplications', app);
  return { success: true, data: created, transactionId: `tx_vapp_${created.id}` };
}

export function getPendingApplications(): ServiceResponse<VerificationApplication[]> {
  const items = findItems<VerificationApplication>('verificationApplications', a => a.status === 'pending' || a.status === 'under-review');
  return { success: true, data: items };
}

export function reviewApplication(id: string, reviewer: string, approved: boolean, rejectionReason?: string): ServiceResponse<VerificationApplication> {
  const app = getById<VerificationApplication>('verificationApplications', id);
  if (!app) return { success: false, error: 'Application not found' };

  const now = Date.now();
  if (approved) {
    const updateApp = updateItem<VerificationApplication>('verificationApplications', id, {
      status: 'approved',
      reviewedAt: now,
      reviewer,
    } as Partial<VerificationApplication>);

    const filmmaker: VerifiedFilmmaker = {
      address: app.applicant,
      name: app.name,
      bio: app.bio,
      portfolioUrl: app.portfolioUrl,
      previousWorks: app.previousWorks,
      socialMedia: app.socialMedia,
      verifiedAt: now,
      credibilityScore: 75,
      completedCampaigns: 0,
      totalFundedAmount: '0',
    };
    addItem('verifiedFilmmakers', filmmaker);

    return { success: true, data: updateApp!, transactionId: `tx_vapp_approve_${id}` };
  }

  const updateApp = updateItem<VerificationApplication>('verificationApplications', id, {
    status: 'rejected',
    reviewedAt: now,
    reviewer,
    rejectionReason,
  } as Partial<VerificationApplication>);
  return { success: true, data: updateApp! };
}

export function getAllVerifiedFilmmakers(): ServiceResponse<VerifiedFilmmaker[]> {
  const all = getAll<VerifiedFilmmaker>('verifiedFilmmakers');
  return { success: true, data: all };
}
