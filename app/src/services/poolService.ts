import type { Pool, ServiceResponse } from '../types';
import * as api from './api';

interface PoolsResponse {
  pools: Pool[];
  pagination: { offset: number; limit: number; total: number };
}

interface PoolDetailResponse {
  pool: Pool;
  members: unknown[];
}

export async function getPools(status?: Pool['status']): Promise<ServiceResponse<Pool[]>> {
  const qs = status ? `?status=${status}` : '';
  const res = await api.get<PoolsResponse>(`/pools${qs}`);
  if (!res.success || !res.data) return { success: false, error: res.error || 'Failed to fetch pools' };
  return { success: true, data: res.data.pools };
}

export async function getPool(id: string): Promise<ServiceResponse<Pool>> {
  const res = await api.get<PoolDetailResponse>(`/pools/${id}`);
  if (!res.success || !res.data) return { success: false, error: res.error || 'Pool not found' };
  return { success: true, data: res.data.pool };
}

export async function createPool(
  creator: string,
  name: string,
  description: string,
  targetAmount: string,
  contributionAmount: string,
  maxMembers: number,
  category: string,
  deadline: number
): Promise<ServiceResponse<Pool>> {
  const res = await api.post<Pool>('/pools', {
    name,
    description,
    creator,
    targetAmount,
    minCommitment: contributionAmount,
    maxMembers,
    deadline,
    category,
  });
  if (!res.success || !res.data) return { success: false, error: res.error || 'Failed to create pool' };
  return { success: true, data: res.data, transactionId: `tx_pool_${res.data.id}` };
}

export async function joinPool(poolId: string, address: string, amount: string): Promise<ServiceResponse<Pool>> {
  const res = await api.post<{ id: number }>(`/pools/${poolId}/join`, { address, amount });
  if (!res.success) return { success: false, error: res.error || 'Failed to join pool' };
  return getPool(poolId);
}

export async function getCreatorPools(address: string): Promise<ServiceResponse<Pool[]>> {
  const res = await getPools();
  if (!res.success || !res.data) return res;
  return { success: true, data: res.data.filter(p => p.creator === address) };
}
