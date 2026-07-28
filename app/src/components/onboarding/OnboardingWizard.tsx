import React, { useState } from 'react';
import { UserRole } from '../../types';

interface OnboardingWizardProps {
  onComplete: (role: UserRole) => void;
  isDemo?: boolean;
}

const STEPS = [
  'welcome',
  'role',
  'about',
  'verify',
  'explore',
] as const;

type Step = typeof STEPS[number];

const ROLE_OPTIONS: { role: UserRole; title: string; desc: string; icon: string }[] = [
  {
    role: 'creative',
    title: 'I create projects',
    desc: 'Start campaigns, get funding for your projects, and manage milestones',
    icon: '🎬',
  },
  {
    role: 'backer',
    title: 'I support creators',
    desc: 'Support creative projects and vote to release funds when milestones are met',
    icon: '❤️',
  },
  {
    role: 'gatekeeper',
    title: 'I verify projects',
    desc: 'Endorse creative profiles and verify delivery for funded campaigns',
    icon: '🔍',
  },
];

export function OnboardingWizard({ onComplete, isDemo }: OnboardingWizardProps) {
  const [step, setStep] = useState<Step>('welcome');
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);

  const stepIndex = STEPS.indexOf(step);
  const progress = ((stepIndex + 1) / STEPS.length) * 100;

  const next = () => {
    const nextIdx = stepIndex + 1;
    if (nextIdx < STEPS.length) setStep(STEPS[nextIdx]);
  };

  const back = () => {
    const prevIdx = stepIndex - 1;
    if (prevIdx >= 0) setStep(STEPS[prevIdx]);
  };

  const handleRoleSelect = (role: UserRole) => {
    setSelectedRole(role);
  };

  const handleGetStarted = () => {
    if (selectedRole) onComplete(selectedRole);
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        {/* Progress bar */}
        <div style={styles.progressOuter}>
          <div style={{ ...styles.progressInner, width: `${progress}%` }} />
        </div>

        {/* Step: Welcome */}
        {step === 'welcome' && (
          <div style={styles.stepContent}>
            <h2 style={styles.heading}>Welcome to CineX</h2>
            <p style={styles.subtext}>
              The platform where creators get funded and supporters help bring
              great stories to life.
            </p>
            {isDemo && (
              <div style={styles.demoBadge}>
                Demo Mode — no wallet needed
              </div>
            )}
            <button style={styles.primaryBtn} onClick={next}>
              Get Started
            </button>
          </div>
        )}

        {/* Step: Role selection */}
        {step === 'role' && (
          <div style={styles.stepContent}>
            <h2 style={styles.heading}>How will you use CineX?</h2>
            <p style={styles.subtext}>Choose the role that fits you best.</p>
            <div style={styles.roleGrid}>
              {ROLE_OPTIONS.map((opt) => (
                <button
                  key={opt.role}
                  style={{
                    ...styles.roleCard,
                    ...(selectedRole === opt.role ? styles.roleCardSelected : {}),
                  }}
                  onClick={() => handleRoleSelect(opt.role)}
                >
                  <span style={styles.roleIcon}>{opt.icon}</span>
                  <span style={styles.roleTitle}>{opt.title}</span>
                  <span style={styles.roleDesc}>{opt.desc}</span>
                </button>
              ))}
            </div>
            <div style={styles.btnRow}>
              <button style={styles.secondaryBtn} onClick={back}>Back</button>
              <button
                style={{ ...styles.primaryBtn, ...(!selectedRole ? styles.btnDisabled : {}) }}
                disabled={!selectedRole}
                onClick={next}
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {/* Step: About (role-specific) */}
        {step === 'about' && (
          <div style={styles.stepContent}>
            <h2 style={styles.heading}>
              {selectedRole === 'creative' ? 'Start your campaign' : 'Back a project'}
            </h2>
            <p style={styles.subtext}>
              {selectedRole === 'creative'
                ? 'Set up a campaign with milestones. Your supporters hold the funds until you deliver.'
                : 'Browse campaigns and fund projects you believe in. You help decide when funds are released.'}
            </p>
            <div style={styles.featureList}>
              {selectedRole === 'creative' ? (
                <>
                  <FeatureItem icon="📋" text="Describe your project and set clear milestones" />
                  <FeatureItem icon="💰" text="Funds are held safely until you deliver" />
                  <FeatureItem icon="✅" text="Get paid when supporters confirm your work" />
                </>
              ) : (
                <>
                  <FeatureItem icon="🔍" text="Browse verified creators and their projects" />
                  <FeatureItem icon="🗳️" text="Vote to release funds when milestones are met" />
                  <FeatureItem icon="📊" text="Track your contributions and impact" />
                </>
              )}
            </div>
            <div style={styles.btnRow}>
              <button style={styles.secondaryBtn} onClick={back}>Back</button>
              <button style={styles.primaryBtn} onClick={next}>Next</button>
            </div>
          </div>
        )}

        {/* Step: Verify (demo auto-grants) */}
        {step === 'verify' && (
          <div style={styles.stepContent}>
            <h2 style={styles.heading}>Almost there</h2>
            <p style={styles.subtext}>
              {isDemo
                ? 'In demo mode, you are automatically set up. In the real app, you would complete a quick verification.'
                : 'Complete a quick verification to get started. This helps keep the community safe.'}
            </p>
            {isDemo ? (
              <div style={styles.autoVerifyBox}>
                <span style={{ fontSize: 28 }}>✅</span>
                <span style={styles.autoVerifyText}>
                  Demo mode — you are good to go
                </span>
              </div>
            ) : (
              <div style={styles.verifyPlaceholder}>
                <p style={styles.subtext}>
                  You will verify your identity with a few taps. This takes about 2 minutes.
                </p>
              </div>
            )}
            <div style={styles.btnRow}>
              <button style={styles.secondaryBtn} onClick={back}>Back</button>
              <button style={styles.primaryBtn} onClick={next}>
                {isDemo ? 'Continue' : 'Verify Now'}
              </button>
            </div>
          </div>
        )}

        {/* Step: Explore */}
        {step === 'explore' && (
          <div style={styles.stepContent}>
            <h2 style={styles.heading}>You are all set!</h2>
            <p style={styles.subtext}>
              {selectedRole === 'creative'
                ? 'Ready to create your first campaign? Let us show you how it works.'
                : 'Ready to explore campaigns? Let us show you what is available.'}
            </p>
            <div style={styles.btnRow}>
              <button style={styles.secondaryBtn} onClick={back}>Back</button>
              <button style={styles.primaryBtn} onClick={handleGetStarted}>
                Explore CineX
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function FeatureItem({ icon, text }: { icon: string; text: string }) {
  return (
    <div style={styles.featureItem}>
      <span style={styles.featureIcon}>{icon}</span>
      <span style={styles.featureText}>{text}</span>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#0f0f1a',
    padding: 16,
  },
  card: {
    background: '#1a1a2e',
    borderRadius: 16,
    padding: 32,
    maxWidth: 480,
    width: '100%',
    boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
  },
  progressOuter: {
    width: '100%',
    height: 4,
    background: '#2a2a3e',
    borderRadius: 2,
    marginBottom: 32,
    overflow: 'hidden',
  },
  progressInner: {
    height: '100%',
    background: 'linear-gradient(90deg, #6c63ff, #e94560)',
    borderRadius: 2,
    transition: 'width 0.3s ease',
  },
  stepContent: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: 16,
  },
  heading: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: 700,
    margin: 0,
    textAlign: 'center' as const,
  },
  subtext: {
    color: '#a0a0b8',
    fontSize: 15,
    textAlign: 'center' as const,
    margin: 0,
    lineHeight: 1.5,
  },
  demoBadge: {
    background: 'rgba(108,99,255,0.15)',
    color: '#6c63ff',
    padding: '6px 14px',
    borderRadius: 20,
    fontSize: 13,
    fontWeight: 600,
  },
  roleGrid: {
    display: 'flex',
    gap: 12,
    width: '100%',
    marginTop: 8,
  },
  roleCard: {
    flex: 1,
    background: '#16162a',
    border: '2px solid #2a2a3e',
    borderRadius: 12,
    padding: 20,
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: 8,
    cursor: 'pointer',
    transition: 'border-color 0.2s',
    color: '#ffffff',
  },
  roleCardSelected: {
    borderColor: '#6c63ff',
    background: 'rgba(108,99,255,0.08)',
  },
  roleIcon: { fontSize: 32 },
  roleTitle: { fontSize: 15, fontWeight: 700, color: '#ffffff' },
  roleDesc: { fontSize: 12, color: '#a0a0b8', textAlign: 'center' as const },
  featureList: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 12,
    width: '100%',
    marginTop: 8,
  },
  featureItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '12px 16px',
    background: '#16162a',
    borderRadius: 10,
  },
  featureIcon: { fontSize: 20 },
  featureText: { color: '#d0d0e0', fontSize: 14 },
  autoVerifyBox: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: 8,
    padding: 24,
    background: 'rgba(34,197,94,0.08)',
    borderRadius: 12,
    border: '1px solid rgba(34,197,94,0.2)',
  },
  autoVerifyText: { color: '#22c55e', fontSize: 14, fontWeight: 600 },
  verifyPlaceholder: {
    padding: 24,
    background: '#16162a',
    borderRadius: 12,
    width: '100%',
  },
  btnRow: {
    display: 'flex',
    gap: 12,
    width: '100%',
    marginTop: 8,
  },
  primaryBtn: {
    flex: 1,
    padding: '12px 24px',
    background: 'linear-gradient(135deg, #6c63ff, #e94560)',
    color: '#ffffff',
    fontSize: 15,
    fontWeight: 700,
    border: 'none',
    borderRadius: 10,
    cursor: 'pointer',
  },
  secondaryBtn: {
    flex: 1,
    padding: '12px 24px',
    background: 'transparent',
    color: '#a0a0b8',
    fontSize: 15,
    fontWeight: 600,
    border: '1px solid #2a2a3e',
    borderRadius: 10,
    cursor: 'pointer',
  },
  btnDisabled: {
    opacity: 0.4,
    cursor: 'not-allowed',
  },
};

export default OnboardingWizard;
