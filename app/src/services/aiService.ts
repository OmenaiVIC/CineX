import type { CredibilitySummary, ServiceResponse } from '../types';
import * as api from './api';

interface BackendSummary {
  address: string;
  summary: string;
  generatedAt: string;
  model: string;
  disclaimer: string;
}

export async function getCredibilitySummary(address: string): Promise<ServiceResponse<CredibilitySummary>> {
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
  return getCredibilitySummary(address);
}
