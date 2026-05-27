import type { PortfolioItem, ServiceResponse } from '../types';
import { getAll, addItem, updateItem, removeItem, findItems } from '../contexts/DemoStorage';

export function getPortfolioForUser(address: string): ServiceResponse<PortfolioItem[]> {
  const items = findItems<PortfolioItem>('portfolioItems', item => item.address === address);
  return { success: true, data: items.sort((a, b) => b.year - a.year) };
}

export function getPortfolioItem(id: string): ServiceResponse<PortfolioItem> {
  const items = getAll<PortfolioItem>('portfolioItems');
  const item = items.find(i => i.id === id);
  if (!item) return { success: false, error: 'Portfolio item not found' };
  return { success: true, data: item };
}

export function createPortfolioItem(item: Omit<PortfolioItem, 'id'>): ServiceResponse<PortfolioItem> {
  const created = addItem('portfolioItems', item as PortfolioItem);
  return { success: true, data: created, transactionId: `tx_portfolio_${created.id}` };
}

export function updatePortfolioItem(id: string, updates: Partial<PortfolioItem>): ServiceResponse<PortfolioItem> {
  const updated = updateItem<PortfolioItem>('portfolioItems', id, updates);
  if (!updated) return { success: false, error: 'Portfolio item not found' };
  return { success: true, data: updated, transactionId: `tx_portfolio_${id}` };
}

export function deletePortfolioItem(id: string): ServiceResponse<boolean> {
  const removed = removeItem('portfolioItems', id);
  if (!removed) return { success: false, error: 'Portfolio item not found' };
  return { success: true, data: true };
}
