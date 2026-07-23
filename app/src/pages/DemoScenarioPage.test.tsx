import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import DemoScenarioPage from './DemoScenarioPage';
import { DemoModeContext, DemoModeContextType } from '../contexts/DemoModeContext';
import React from 'react';

vi.mock('../contexts/PasskeyContext', () => ({
  PasskeyContext: {
    Provider: ({ children }: { children: React.ReactNode }) => children,
  },
  usePasskey: () => ({
    passkeyState: { isInitialized: false },
    initPasskey: vi.fn(),
  }),
}));

vi.mock('../contexts/GuideContext', () => ({
  GuideContext: {
    Provider: ({ children }: { children: React.ReactNode }) => children,
  },
  useGuide: () => ({
    isOpen: false,
    toggleGuide: vi.fn(),
  }),
}));

vi.mock('../components/onboarding/OnboardingWizard', () => ({
  OnboardingWizard: ({ onComplete, isDemo }: { onComplete: (role: string) => void; isDemo: boolean }) => (
    <div data-testid="onboarding-wizard">
      <p>Onboarding Wizard Mock (demo={String(isDemo)})</p>
      <button onClick={() => onComplete('creative')}>Complete Onboarding</button>
      <button onClick={() => onComplete('backer')}>Complete as Backer</button>
    </div>
  ),
}));

vi.mock('../components/campaign/CampaignCreationForm', () => ({
  CampaignCreationForm: ({ isDemo, onSubmit }: { isDemo: boolean; onSubmit: (p: unknown) => void }) => (
    <div data-testid="campaign-form">
      <p>Campaign Form Mock (demo={String(isDemo)})</p>
      <button onClick={() => onSubmit({ name: 'Demo Campaign' })}>Submit Campaign</button>
    </div>
  ),
}));

vi.mock('../components/escrow/EscrowStatus', () => ({
  EscrowStatus: ({ campaign }: { campaign: { name: string } }) => (
    <div data-testid="escrow-status">
      <p>Escrow Status for: {campaign.name}</p>
    </div>
  ),
}));

vi.mock('../components/milestone/MilestoneVoting', () => ({
  MilestoneVoting: ({ userRole }: { userRole: string }) => (
    <div data-testid="milestone-voting">
      <p>Milestone Voting for: {userRole}</p>
    </div>
  ),
}));

function renderWithDemoMode(ui: React.ReactElement, overrides: Partial<DemoModeContextType> = {}) {
  const defaultValue: DemoModeContextType = {
    isDemoMode: true,
    setIsDemoMode: vi.fn(),
    loadIdentity: vi.fn().mockResolvedValue({ address: 'ST1DEMO', publicKey: 'pub' }),
    generateAddress: vi.fn().mockResolvedValue({ address: 'ST1DEMO', publicKey: 'pub', privateKey: 'priv' }),
    saveIdentity: vi.fn(),
    ...overrides,
  };
  return render(
    <DemoModeContext.Provider value={defaultValue}>{ui}</DemoModeContext.Provider>
  );
}

describe('DemoScenarioPage', () => {
  it('renders the demo header', () => {
    renderWithDemoMode(<DemoScenarioPage />);
    expect(screen.getByText('CineX Demo')).toBeInTheDocument();
    expect(screen.getByText('Demo Mode')).toBeInTheDocument();
  });

  it('shows role selection with both flows', () => {
    renderWithDemoMode(<DemoScenarioPage />);
    expect(screen.getByText('Choose a demo scenario')).toBeInTheDocument();
    expect(screen.getByText('Creator Flow')).toBeInTheDocument();
    expect(screen.getByText('Supporter Flow')).toBeInTheDocument();
  });

  it('displays demo mode badge', () => {
    renderWithDemoMode(<DemoScenarioPage />);
    expect(screen.getByText('Demo Mode')).toBeInTheDocument();
  });

  it('displays workflow description text', () => {
    renderWithDemoMode(<DemoScenarioPage />);
    expect(screen.getByText(/Experience CineX from either side/)).toBeInTheDocument();
  });

  it('transitions to onboarding scene after selecting creator role', () => {
    renderWithDemoMode(<DemoScenarioPage />);
    fireEvent.click(screen.getByText('Creator Flow'));
    expect(screen.getByTestId('onboarding-wizard')).toBeInTheDocument();
  });

  it('transitions to onboarding scene after selecting supporter role', () => {
    renderWithDemoMode(<DemoScenarioPage />);
    fireEvent.click(screen.getByText('Supporter Flow'));
    expect(screen.getByTestId('onboarding-wizard')).toBeInTheDocument();
  });

  it('transitions to campaign scene after onboarding completes', () => {
    renderWithDemoMode(<DemoScenarioPage />);
    fireEvent.click(screen.getByText('Creator Flow'));
    fireEvent.click(screen.getByText('Complete Onboarding'));
    expect(screen.getByTestId('campaign-form')).toBeInTheDocument();
  });

  it('transitions to escrow scene after campaign submission', () => {
    renderWithDemoMode(<DemoScenarioPage />);
    fireEvent.click(screen.getByText('Creator Flow'));
    fireEvent.click(screen.getByText('Complete Onboarding'));
    fireEvent.click(screen.getByText('Submit Campaign'));
    expect(screen.getByTestId('escrow-status')).toBeInTheDocument();
  });

  it('allows backer flow through escrow to voting', () => {
    renderWithDemoMode(<DemoScenarioPage />);
    fireEvent.click(screen.getByText('Supporter Flow'));
    fireEvent.click(screen.getByText('Complete as Backer'));
    // Backer goes to escrow scene after onboarding
    expect(screen.getByTestId('escrow-status')).toBeInTheDocument();
    // Click "View Milestones & Vote" to proceed to voting
    fireEvent.click(screen.getByText('View Milestones & Vote'));
    expect(screen.getByTestId('milestone-voting')).toBeInTheDocument();
    expect(screen.getByText('Milestone Voting for: backer')).toBeInTheDocument();
  });
});
