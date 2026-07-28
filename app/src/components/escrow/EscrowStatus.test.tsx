import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { EscrowStatus } from './EscrowStatus';
import React from 'react';

const mockCampaign = {
  id: 'campaign-1',
  title: 'Test Campaign',
  creator: 'ST1CREATOR',
  targetAmount: '10000',
  deadline: '2026-12-31',
  status: 'funded',
  createdAt: '2026-01-01',
  currentAmount: '5000',
  category: 'short-film',
  description: 'Test description',
  updatedAt: '2026-06-01',
};

const mockMilestones = [
  {
    id: 'ms-1',
    campaignId: 'campaign-1',
    title: 'Pre-production',
    description: 'Script and planning',
    fundingRequired: '3000',
    status: 'completed',
    deadline: '2026-06-30',
    deliverables: ['Script', 'Storyboard'],
    submittedAt: '2026-06-25',
    approvedAt: '2026-06-28',
    releasedAt: '2026-06-29',
    rejectedAt: null,
  },
  {
    id: 'ms-2',
    campaignId: 'campaign-1',
    title: 'Production',
    description: 'Filming',
    fundingRequired: '4000',
    status: 'active',
    deadline: '2026-09-30',
    deliverables: ['Footage'],
    submittedAt: null,
    approvedAt: null,
    releasedAt: null,
    rejectedAt: null,
  },
];

describe('EscrowStatus', () => {
  const defaultProps = {
    campaign: mockCampaign,
    milestones: mockMilestones,
    totalDeposited: '5000',
  };

  it('renders the Held funds heading', () => {
    render(<EscrowStatus {...defaultProps} />);
    expect(screen.getByText('Held funds')).toBeInTheDocument();
  });

  it('displays goal, held, and released amounts', () => {
    render(<EscrowStatus {...defaultProps} />);
    expect(screen.getByText('Goal')).toBeInTheDocument();
    expect(screen.getByText('Held')).toBeInTheDocument();
    expect(screen.getByText('Released')).toBeInTheDocument();
  });

  it('shows total raised amount', () => {
    render(<EscrowStatus {...defaultProps} />);
    expect(screen.getByText('$5,000')).toBeInTheDocument();
  });

  it('renders milestone list with titles', () => {
    render(<EscrowStatus {...defaultProps} />);
    expect(screen.getByText('1. Pre-production')).toBeInTheDocument();
    expect(screen.getByText('2. Production')).toBeInTheDocument();
  });

  it('shows milestone funding amounts', () => {
    render(<EscrowStatus {...defaultProps} />);
    expect(screen.getByText('$3,000')).toBeInTheDocument();
    expect(screen.getByText('$4,000')).toBeInTheDocument();
  });

  it('shows milestone statuses', () => {
    render(<EscrowStatus {...defaultProps} />);
    expect(screen.getByText('Delivered')).toBeInTheDocument();
    expect(screen.getByText('In progress')).toBeInTheDocument();
  });

  it('shows no milestones defined when milestones array is empty', () => {
    render(<EscrowStatus {...defaultProps} milestones={[]} />);
    expect(screen.getByText('No milestones yet')).toBeInTheDocument();
  });

  it('shows completed count in stats', () => {
    render(<EscrowStatus {...defaultProps} />);
    expect(screen.getByText('Completed')).toBeInTheDocument();
    // Both completed and active counts are "1", so getAllByText returns 2 matches
    const ones = screen.getAllByText('1');
    expect(ones.length).toBeGreaterThanOrEqual(1);
  });

  it('renders with different campaign states', () => {
    const draftCampaign = { ...mockCampaign, status: 'draft' };
    render(<EscrowStatus {...defaultProps} campaign={draftCampaign} />);
    expect(screen.getByText('Held funds')).toBeInTheDocument();
  });
});