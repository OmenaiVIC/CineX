import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { OnboardingWizard } from './OnboardingWizard';
import React from 'react';

describe('OnboardingWizard', () => {
  const defaultProps = {
    onComplete: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the welcome screen with correct heading and subtext', () => {
    render(<OnboardingWizard {...defaultProps} />);
    expect(screen.getByText('Welcome to CineX')).toBeInTheDocument();
    expect(screen.getByText(/The platform where creators get funded/)).toBeInTheDocument();
  });

  it('shows Get Started button on welcome screen', () => {
    render(<OnboardingWizard {...defaultProps} />);
    expect(screen.getByRole('button', { name: 'Get Started' })).toBeInTheDocument();
  });

  it('transitions to role selection on Get Started click', () => {
    render(<OnboardingWizard {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: 'Get Started' }));
    expect(screen.getByText('How will you use CineX?')).toBeInTheDocument();
    expect(screen.getByText('I create projects')).toBeInTheDocument();
    expect(screen.getByText('I support creators')).toBeInTheDocument();
  });

  it('selects creative role and shows Continue enabled', () => {
    render(<OnboardingWizard {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: 'Get Started' }));
    fireEvent.click(screen.getByText('I create projects'));
    expect(screen.getByRole('button', { name: 'Continue' })).toBeEnabled();
  });

  it('advances to about screen after selecting role and clicking Continue', () => {
    render(<OnboardingWizard {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: 'Get Started' }));
    fireEvent.click(screen.getByText('I create projects'));
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(screen.getByText('Start your campaign')).toBeInTheDocument();
    expect(screen.getByText(/Set up a campaign with milestones/)).toBeInTheDocument();
  });

  it('shows backer-specific about content when backer role is selected', () => {
    render(<OnboardingWizard {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: 'Get Started' }));
    fireEvent.click(screen.getByText('I support creators'));
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(screen.getByText('Back a project')).toBeInTheDocument();
  });

  it('navigates through the full wizard and calls onComplete', () => {
    render(<OnboardingWizard {...defaultProps} />);
    // Welcome → Role
    fireEvent.click(screen.getByRole('button', { name: 'Get Started' }));
    // Role → About
    fireEvent.click(screen.getByText('I create projects'));
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    // About → Verify
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByText('Almost there')).toBeInTheDocument();
    // Verify → Explore (non-demo shows 'Verify Now' button)
    fireEvent.click(screen.getByRole('button', { name: 'Verify Now' }));
    expect(screen.getByText('You are all set!')).toBeInTheDocument();
    // Explore → Complete
    fireEvent.click(screen.getByRole('button', { name: 'Explore CineX' }));
    expect(defaultProps.onComplete).toHaveBeenCalledWith('creative');
  });

  it('navigates backward with Back button', () => {
    render(<OnboardingWizard {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: 'Get Started' }));
    expect(screen.getByText('How will you use CineX?')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Back' }));
    expect(screen.getByText('Welcome to CineX')).toBeInTheDocument();
  });

  it('shows demo badge on welcome screen when isDemo is true', () => {
    render(<OnboardingWizard {...defaultProps} isDemo />);
    expect(screen.getByText('Demo Mode — no wallet needed')).toBeInTheDocument();
  });

  it('shows auto-verify in demo mode on verify step', () => {
    render(<OnboardingWizard {...defaultProps} isDemo />);
    fireEvent.click(screen.getByRole('button', { name: 'Get Started' }));
    fireEvent.click(screen.getByText('I create projects'));
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByText('Demo mode — you are good to go')).toBeInTheDocument();
  });

  it('Continue button is disabled when no role is selected', () => {
    render(<OnboardingWizard {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: 'Get Started' }));
    expect(screen.getByRole('button', { name: 'Continue' })).toBeDisabled();
  });
});