import React, { useState, useEffect, useCallback } from 'react';
import { OnboardingWizard } from '../components/onboarding/OnboardingWizard';
import { CampaignCreationForm } from '../components/campaign/CampaignCreationForm';
import { EscrowStatus } from '../components/escrow/EscrowStatus';
import { MilestoneVoting } from '../components/milestone/MilestoneVoting';
import { useDemoMode } from '../contexts/DemoModeContext';
import { UserRole, Campaign, Milestone } from '../types';

type Scene = 'select' | 'onboarding' | 'campaign' | 'escrow' | 'voting' | 'complete';

const DEMO_CAMPAIGNS: Record<UserRole, {
  campaign: Campaign;
  milestones: Milestone[];
}> = {
  creative: {
    campaign: {
      id: 'demo-1',
      title: 'Lagos Beats Vol. 2',
      description: 'A 12-track EP fusing Afrobeats, highlife, and electronic textures — recorded live in Lagos with five emerging producers and three vocalists.',
      creator: 'Demo Creator',
      targetAmount: '5000',
      currentAmount: '3200',
      deadline: Date.now() + 30 * 86400000,
      category: 'music',
      status: 'active',
      createdAt: Date.now() - 7 * 86400000,
      updatedAt: Date.now(),
    },
    milestones: [
      {
        id: 'ms-1',
        campaignId: 'demo-1',
        title: 'Planning',
        description: 'Song selection, studio booking, producer agreements',
        fundingRequired: '1200',
        deadline: Date.now() + 10 * 86400000,
        status: 'active',
        deliverables: ['Track list', 'Studio schedule', 'Split sheets'],
      },
      {
        id: 'ms-2',
        campaignId: 'demo-1',
        title: 'Development',
        description: 'Recording sessions across two Lagos studios',
        fundingRequired: '2000',
        deadline: Date.now() + 20 * 86400000,
        status: 'pending',
        deliverables: ['Mixed stems', 'Session photos'],
      },
      {
        id: 'ms-3',
        campaignId: 'demo-1',
        title: 'Delivery',
        description: 'Mastering, artwork, distribution setup',
        fundingRequired: '1800',
        deadline: Date.now() + 30 * 86400000,
        status: 'pending',
        deliverables: ['Mastered EP (WAV + streaming)', 'Cover art', 'Distribution links'],
      },
    ],
  },
  backer: {
    campaign: {
      id: 'demo-2',
      title: 'Neon Drift Racing',
      description: 'A fast-paced indie racing game set in a neon-lit cyberpunk city. Built in Unity with online multiplayer, custom car tuning, and a procedurally generated track system.',
      creator: 'Kemi Adeyemi',
      targetAmount: '8000',
      currentAmount: '6400',
      deadline: Date.now() + 45 * 86400000,
      category: 'gaming',
      status: 'active',
      createdAt: Date.now() - 14 * 86400000,
      updatedAt: Date.now(),
    },
    milestones: [
      {
        id: 'ms-4',
        campaignId: 'demo-2',
        title: 'Planning',
        description: 'Game design document, art direction, prototype scope',
        fundingRequired: '3000',
        deadline: Date.now() + 15 * 86400000,
        status: 'completed',
        deliverables: ['Game design document', 'Art style guide', 'Prototype build'],
      },
      {
        id: 'ms-5',
        campaignId: 'demo-2',
        title: 'Development',
        description: 'Core gameplay loop, car physics, track generator, online lobbies',
        fundingRequired: '2400',
        deadline: Date.now() + 30 * 86400000,
        status: 'active',
        deliverables: ['Playable alpha build', 'Dev diary video'],
      },
      {
        id: 'ms-6',
        campaignId: 'demo-2',
        title: 'Delivery',
        description: 'Polish, QA, trailer, and storefront launch',
        fundingRequired: '2600',
        deadline: Date.now() + 45 * 86400000,
        status: 'pending',
        deliverables: ['Beta build', 'Launch trailer', 'Store page assets'],
      },
    ],
  },
};

export function DemoScenarioPage() {
  const { isDemoMode } = useDemoMode();
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [scene, setScene] = useState<Scene>('select');
  const [voteCounts, setVoteCounts] = useState<Record<string, { approves: number; rejects: number }>>({});

  const demoData = selectedRole ? DEMO_CAMPAIGNS[selectedRole] : null;

  const handleRoleSelect = (role: UserRole) => {
    setSelectedRole(role);
    setScene('onboarding');
  };

  const handleOnboardingComplete = useCallback(() => {
    if (selectedRole === 'creative') {
      setScene('campaign');
    } else {
      setScene('escrow');
    }
  }, [selectedRole]);

  const handleCampaignSubmit = useCallback(() => {
    setScene('escrow');
  }, []);

  const handleVote = useCallback((milestoneId: string, approve: boolean) => {
    setVoteCounts((prev) => {
      const existing = prev[milestoneId] || { approves: 0, rejects: 0 };
      return {
        ...prev,
        [milestoneId]: {
          approves: existing.approves + (approve ? 1 : 0),
          rejects: existing.rejects + (approve ? 0 : 1),
        },
      };
    });
  }, []);

  const handleSubmitProof = useCallback((milestoneId: string) => {
    setScene('complete');
  }, []);

  if (!isDemoMode) {
    return (
      <div style={styles.fallback}>
        <h2 style={styles.fallbackHeading}>Demo Mode Required</h2>
        <p style={styles.fallbackText}>
          Enable demo mode to explore the creator and backer flows.
        </p>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      {/* Header */}
      <div style={styles.header}>
        <h1 style={styles.headerTitle}>CineX Demo</h1>
        <div style={styles.headerBadge}>Demo Mode</div>
      </div>

      {/* Scene: Role Selection */}
      {scene === 'select' && (
        <div style={styles.sceneContainer}>
          <h2 style={styles.sceneHeading}>Choose a demo scenario</h2>
          <p style={styles.sceneSubtext}>
            Experience CineX from either side — as a creator seeking funding or a
            supporter backing great projects.
          </p>
          <div style={styles.roleGrid}>
            <button style={styles.roleCard} onClick={() => handleRoleSelect('creative')}>
              <span style={styles.roleIcon}>🎬</span>
              <span style={styles.roleTitle}>Creator Flow</span>
              <span style={styles.roleDesc}>
                Create a campaign, set milestones, submit proof, and receive funds
              </span>
            </button>
            <button style={styles.roleCard} onClick={() => handleRoleSelect('backer')}>
              <span style={styles.roleIcon}>❤️</span>
              <span style={styles.roleTitle}>Supporter Flow</span>
              <span style={styles.roleDesc}>
                Browse a campaign, see held funds, and vote to release milestone payments
              </span>
            </button>
          </div>
        </div>
      )}

      {/* Scene: Onboarding Wizard */}
      {scene === 'onboarding' && (
        <OnboardingWizard onComplete={handleOnboardingComplete} isDemo />
      )}

      {/* Scene: Campaign Creation (Creator) */}
      {scene === 'campaign' && selectedRole === 'creative' && (
        <div style={styles.sceneContainer}>
          <CampaignCreationForm
            onSubmit={handleCampaignSubmit}
            onCancel={() => setScene('select')}
            isDemo
          />
        </div>
      )}

      {/* Scene: Escrow Status */}
      {scene === 'escrow' && demoData && (
        <div style={styles.sceneContainer}>
          <EscrowStatus
            campaign={demoData.campaign}
            milestones={demoData.milestones}
          />
          <button
            style={styles.nextBtn}
            onClick={() => setScene(selectedRole === 'backer' ? 'voting' : 'complete')}
          >
            {selectedRole === 'backer' ? 'View Milestones & Vote' : 'View Milestones'}
          </button>
        </div>
      )}

      {/* Scene: Voting (Backer) */}
      {scene === 'voting' && demoData && (
        <div style={styles.sceneContainer}>
          <MilestoneVoting
            campaign={demoData.campaign}
            milestones={demoData.milestones}
            userRole="backer"
            onVote={handleVote}
          />
          {Object.keys(voteCounts).length > 0 && (
            <div style={styles.voteSummary}>
              <h4 style={styles.voteSummaryTitle}>Your votes</h4>
              {Object.entries(voteCounts).map(([msId, counts]) => (
                <div key={msId} style={styles.voteRow}>
                  <span style={styles.voteMsName}>
                    {demoData.milestones.find((m) => m.id === msId)?.title}
                  </span>
                  <span style={styles.voteCount}>
                    <span style={{ color: '#22c55e' }}>✓ {counts.approves}</span>
                    {' / '}
                    <span style={{ color: '#e94560' }}>✕ {counts.rejects}</span>
                  </span>
                </div>
              ))}
              <button
                style={styles.nextBtn}
                onClick={() => setScene('complete')}
              >
                Continue
              </button>
            </div>
          )}
        </div>
      )}

      {/* Scene: Complete */}
      {scene === 'complete' && (
        <div style={styles.sceneContainer}>
          <div style={styles.completeCard}>
            <span style={styles.completeIcon}>
              {selectedRole === 'creative' ? '🎉' : '❤️'}
            </span>
            <h2 style={styles.completeHeading}>
              {selectedRole === 'creative'
                ? 'Campaign created!'
                : 'Vote submitted!'}
            </h2>
            <p style={styles.completeText}>
              {selectedRole === 'creative'
                ? 'In the real app, your campaign would now be live and visible to supporters. Funds are held safely until milestones are delivered and approved.'
                : 'In the real app, your vote would contribute to the milestone approval. When enough supporters agree, funds are released to the creator.'}
            </p>
            <button style={styles.nextBtn} onClick={() => setScene('select')}>
              Try the other flow
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    background: '#0f0f1a',
    padding: '24px 16px',
    maxWidth: 600,
    margin: '0 auto',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    marginBottom: 32,
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: 700,
    margin: 0,
  },
  headerBadge: {
    background: 'rgba(108,99,255,0.15)',
    color: '#6c63ff',
    padding: '4px 12px',
    borderRadius: 16,
    fontSize: 12,
    fontWeight: 700,
  },
  sceneContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: 20,
  },
  sceneHeading: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: 700,
    margin: 0,
  },
  sceneSubtext: {
    color: '#a0a0b8',
    fontSize: 14,
    margin: 0,
    lineHeight: 1.5,
  },
  roleGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  roleCard: {
    background: '#1a1a2e',
    border: '2px solid #2a2a3e',
    borderRadius: 16,
    padding: 24,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 8,
    cursor: 'pointer',
    color: '#ffffff',
    textAlign: 'center',
    transition: 'border-color 0.2s',
  },
  roleIcon: { fontSize: 36 },
  roleTitle: { fontSize: 18, fontWeight: 700 },
  roleDesc: { fontSize: 14, color: '#a0a0b8', lineHeight: 1.4 },
  nextBtn: {
    width: '100%',
    padding: '14px 24px',
    background: 'linear-gradient(135deg, #6c63ff, #e94560)',
    color: '#ffffff',
    fontSize: 15,
    fontWeight: 700,
    border: 'none',
    borderRadius: 10,
    cursor: 'pointer',
  },
  voteSummary: {
    background: '#1a1a2e',
    borderRadius: 16,
    padding: 20,
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  voteSummaryTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 700,
    margin: 0,
  },
  voteRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 12px',
    background: '#16162a',
    borderRadius: 8,
  },
  voteMsName: { color: '#d0d0e0', fontSize: 14 },
  voteCount: { color: '#a0a0b8', fontSize: 13 },
  completeCard: {
    background: '#1a1a2e',
    borderRadius: 16,
    padding: 40,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 12,
    textAlign: 'center',
  },
  completeIcon: { fontSize: 48 },
  completeHeading: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: 700,
    margin: 0,
  },
  completeText: {
    color: '#a0a0b8',
    fontSize: 14,
    lineHeight: 1.5,
    margin: 0,
  },
  fallback: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#0f0f1a',
    color: '#ffffff',
    gap: 12,
  },
  fallbackHeading: { fontSize: 22, fontWeight: 700, margin: 0 },
  fallbackText: { color: '#a0a0b8', fontSize: 14, margin: 0 },
};

export default DemoScenarioPage;
