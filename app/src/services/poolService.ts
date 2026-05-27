import type { Pool, ServiceResponse } from '../types';
import { getAll, addItem, updateItem, getById, findItems } from '../contexts/DemoStorage';

export function getPools(status?: Pool['status']): ServiceResponse<Pool[]> {
  const all = getAll<Pool>('pools');
  const items = status ? all.filter(p => p.status === status) : all;
  return { success: true, data: items };
}

export function getPool(id: string): ServiceResponse<Pool> {
  const p = getById<Pool>('pools', id);
  if (!p) return { success: false, error: 'Pool not found' };
  return { success: true, data: p };
}

export function createPool(
  creator: string,
  name: string,
  description: string,
  targetAmount: string,
  contributionAmount: string,
  maxMembers: number,
  category: string,
  deadline: number
): ServiceResponse<Pool> {
  const pool: Pool = {
    id: '',
    name,
    description,
    creator,
    maxMembers,
    currentMembers: 1,
    contributionAmount,
    category,
    status: 'open',
    deadline,
    targetAmount,
    currentAmount: '0',
  };
  const created = addItem('pools', pool);
  return { success: true, data: created, transactionId: `tx_pool_${created.id}` };
}

export function joinPool(poolId: string, address: string, amount: string): ServiceResponse<Pool> {
  const pool = getById<Pool>('pools', poolId);
  if (!pool) return { success: false, error: 'Pool not found' };
  if (pool.status !== 'open') return { success: false, error: 'Pool is not open' };
  if (pool.currentMembers >= pool.maxMembers) return { success: false, error: 'Pool is full' };

  const newAmount = (Number(pool.currentAmount) + Number(amount)).toString();
  const updated = updateItem<Pool>('pools', poolId, {
    currentMembers: pool.currentMembers + 1,
    currentAmount: newAmount,
    status: Number(newAmount) >= Number(pool.targetAmount) ? 'funded' : pool.status,
  } as Partial<Pool>);

  return { success: true, data: updated!, transactionId: `tx_pool_join_${poolId}` };
}

export function getCreatorPools(address: string): ServiceResponse<Pool[]> {
  const items = findItems<Pool>('pools', p => p.creator === address);
  return { success: true, data: items };
}
