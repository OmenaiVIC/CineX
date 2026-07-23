import type { Campaign } from '../types';

export const CATEGORIES: { value: Campaign['category']; label: string }[] = [
  { value: 'film', label: 'Film & Video' },
  { value: 'music', label: 'Music' },
  { value: 'gaming', label: 'Gaming' },
  { value: 'immersive-media', label: 'Immersive Media' },
  { value: 'publishing', label: 'Publishing' },
  { value: 'visual-art', label: 'Visual Art' },
  { value: 'other', label: 'Other' },
];

export const CATEGORY_VALUES = CATEGORIES.map(c => c.value);

export const DEFAULT_MILESTONES = [
  { title: 'Planning', description: 'Define scope, budget, and timeline.' },
  { title: 'Development', description: 'Execute core creative work.' },
  { title: 'Delivery', description: 'Finalize and release to backers.' },
];
