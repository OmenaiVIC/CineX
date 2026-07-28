import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MilestoneVoting } from './MilestoneVoting';
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

describe('MilestoneVoting', () => {
  const defaultProps = {
    campaign: mockCampaign,
    milestones: mockMilestones,
    userRole: 'backer' as const,
    onVote: vi.fn(),
    onSubmitProof: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the heading and subtitle', () => {
    render(<MilestoneVoting {...defaultProps} />);
    expect(screen.getByText('Milestones & Voting')).toBeInTheDocument();
    expect(screen.getByText(/Vote to release funds when milestones are delivered/)).toBeInTheDocument();
  });

  it('shows backer-specific subtitle', () => {
    render(<MilestoneVoting {...defaultProps} userRole="backer" />);
    expect(screen.getByText(/Vote to release funds when milestones are delivered/)).toBeInTheDocument();
  });

  it('shows creator-specific subtitle', () => {
    render(<MilestoneVoting {...defaultProps} userRole="creative" />);
    expect(screen.getByText(/Submit proof of delivery and track fund releases/)).toBeInTheDocument();
  });

  it('renders milestone titles', () => {
    render(<MilestoneVoting {...defaultProps} />);
    expect(screen.getByText('Pre-production')).toBeInTheDocument();
    expect(screen.getByText('Production')).toBeInTheDocument();
  });

  it('shows voting buttons for in_progress milestone (backer)', () => {
    render(<MilestoneVoting {...defaultProps} />);
    // Expand the active milestone accordion
    fireEvent.click(screen.getByText('Production'));
    const approveBtn = screen.getByText(/Approve/);
    const rejectBtn = screen.getByText(/Needs Work/);
    expect(approveBtn).toBeInTheDocument();
    expect(rejectBtn).toBeInTheDocument();
  });

  it('calls onVote when approve is clicked', () => {
    render(<MilestoneVoting {...defaultProps} />);
    // Expand the active milestone accordion
    fireEvent.click(screen.getByText('Production'));
    const approveBtn = screen.getByText(/Approve/);
    fireEvent.click(approveBtn);
    expect(defaultProps.onVote).toHaveBeenCalledWith('ms-2', true);
  });

  it('calls onVote when reject is clicked', () => {
    render(<MilestoneVoting {...defaultProps} />);
    // Expand the active milestone accordion
    fireEvent.click(screen.getByText('Production'));
    const rejectBtn = screen.getByText(/Needs Work/);
    fireEvent.click(rejectBtn);
    expect(defaultProps.onVote).toHaveBeenCalledWith('ms-2', false);
  });

  it('shows Submit Proof button for creator role', () => {
    render(<MilestoneVoting {...defaultProps} userRole="creative" />);
    // Expand the active milestone accordion
    fireEvent.click(screen.getByText('Production'));
    const submitBtn = screen.getByText(/Submit Proof/);
    expect(submitBtn).toBeInTheDocument();
  });

  it('calls onSubmitProof when Submit Proof is clicked', () => {
    render(<MilestoneVoting {...defaultProps} userRole="creative" />);
    // Expand the active milestone accordion
    fireEvent.click(screen.getByText('Production'));
    const submitBtn = screen.getByText(/Submit Proof/);
    fireEvent.click(submitBtn);
    expect(defaultProps.onSubmitProof).toHaveBeenCalledWith('ms-2');
  });

  it('shows no milestones yet when milestones array is empty', () => {
    render(<MilestoneVoting {...defaultProps} milestones={[]} />);
    expect(screen.getByText('No milestones yet')).toBeInTheDocument();
  });

  it('shows completed milestone with released indicator', () => {
    render(<MilestoneVoting {...defaultProps} />);
    // Expand the completed milestone accordion
    fireEvent.click(screen.getByText('Pre-production'));
    expect(screen.getByText(/Funds released/)).toBeInTheDocument();
    expect(screen.getByText(/Funds released — \$3,000/)).toBeInTheDocument();
  });

  it('renders milestone descriptions', () => {
    render(<MilestoneVoting {...defaultProps} />);
    // Expand the completed milestone accordion
    fireEvent.click(screen.getByText('Pre-production'));
    expect(screen.getByText('Script and planning')).toBeInTheDocument();
  });
});