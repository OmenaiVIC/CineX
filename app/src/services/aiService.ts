import type { CredibilitySummary, ServiceResponse } from '../types';
import * as api from './api';
import * as mock from './mockContractService';
import { isDemoMode } from './demo';

interface BackendSummary {
  address: string;
  summary: string;
  generatedAt: string;
  model: string;
  disclaimer: string;
}

export async function getCredibilitySummary(address: string): Promise<ServiceResponse<CredibilitySummary>> {
  if (isDemoMode()) return mock.getCredibilitySummary(address);
  const res = await api.post<BackendSummary>('/ai/summary', { address });
  if (!res.success || !res.data) return { success: false, error: res.error || 'Failed to get summary' };
  return {
    success: true,
    data: {
      address: res.data.address,
      summary: res.data.summary,
      generatedAt: res.data.generatedAt,
      model: res.data.model,
      disclaimer: res.data.disclaimer,
    },
  };
}

export async function refreshCredibilitySummary(address: string): Promise<ServiceResponse<CredibilitySummary>> {
  if (isDemoMode()) return mock.refreshCredibilitySummary(address);
  return getCredibilitySummary(address);
}
