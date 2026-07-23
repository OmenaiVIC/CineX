import React from 'react';
import { Campaign, Milestone } from '../../types';

interface EscrowStatusProps {
  campaign: Campaign;
  milestones: Milestone[];
  totalDeposited?: string;
}

const MILESTONE_STATES = {
  pending: { label: 'Not started', color: '#6b7280', bg: 'rgba(107,114,128,0.1)' },
  active: { label: 'In progress', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
  completed: { label: 'Delivered', color: '#22c55e', bg: 'rgba(34,197,94,0.1)' },
  failed: { label: 'Missed', color: '#e94560', bg: 'rgba(233,69,96,0.1)' },
};

function formatAmount(amount: string): string {
  const num = Number(amount);
  if (isNaN(num)) return amount;
  return num.toLocaleString();
}

export function EscrowStatus({ campaign, milestones, totalDeposited }: EscrowStatusProps) {
  const totalTarget = Number(campaign.targetAmount) || 0;
  const totalRaised = Number(campaign.currentAmount) || 0;
  const deposited = Number(totalDeposited || totalRaised);
  const progressPct = totalTarget > 0 ? Math.min((deposited / totalTarget) * 100, 100) : 0;

  const completedCount = milestones.filter((m) => m.status === 'completed').length;
  const activeCount = milestones.filter((m) => m.status === 'active').length;

  return (
    <div style={styles.container}>
      <h3 style={styles.title}>Held funds</h3>

      {/* Amount summary */}
      <div style={styles.amountRow}>
        <div style={styles.amountBlock}>
          <span style={styles.amountLabel}>Goal</span>
          <span style={styles.amountValue}>${formatAmount(campaign.targetAmount)}</span>
        </div>
        <div style={styles.amountBlock}>
          <span style={styles.amountLabel}>Held</span>
          <span style={{ ...styles.amountValue, color: '#6c63ff' }}>
            ${formatAmount(String(deposited))}
          </span>
        </div>
        <div style={styles.amountBlock}>
          <span style={styles.amountLabel}>Released</span>
          <span style={{ ...styles.amountValue, color: '#22c55e' }}>
            ${formatAmount(String(deposited * (completedCount / Math.max(milestones.length, 1))))}
          </span>
        </div>
      </div>

      {/* Progress bar */}
      <div style={styles.progressOuter}>
        <div
          style={{
            ...styles.progressInner,
            width: `${progressPct}%`,
            background: progressPct >= 100
              ? 'linear-gradient(90deg, #22c55e, #16a34a)'
              : 'linear-gradient(90deg, #6c63ff, #e94560)',
          }}
        />
      </div>
      <span style={styles.progressLabel}>
        {Math.round(progressPct)}% funded
      </span>

      {/* Milestone summary */}
      <div style={styles.milestoneSection}>
        <h4 style={styles.milestoneTitle}>Milestones</h4>
        {milestones.length === 0 ? (
          <span style={styles.emptyText}>No milestones yet</span>
        ) : (
          milestones.map((m, idx) => {
            const state = MILESTONE_STATES[m.status] || MILESTONE_STATES.pending;
            return (
              <div key={m.id} style={styles.milestoneRow}>
                <div style={styles.milestoneLeft}>
                  <span style={{ ...styles.statusDot, background: state.color }} />
                  <div style={styles.milestoneInfo}>
                    <span style={styles.milestoneName}>
                      {idx + 1}. {m.title}
                    </span>
                    <span style={styles.milestoneAmt}>
                      ${formatAmount(m.fundingRequired)}
                    </span>
                  </div>
                </div>
                <span style={{ ...styles.badge, color: state.color, background: state.bg }}>
                  {state.label}
                </span>
              </div>
            );
          })
        )}
      </div>

      {/* Stats */}
      <div style={styles.statsRow}>
        <div style={styles.stat}>
          <span style={styles.statValue}>{completedCount}</span>
          <span style={styles.statLabel}>Completed</span>
        </div>
        <div style={styles.stat}>
          <span style={styles.statValue}>{activeCount}</span>
          <span style={styles.statLabel}>Active</span>
        </div>
        <div style={styles.stat}>
          <span style={styles.statValue}>{milestones.length}</span>
          <span style={styles.statLabel}>Total</span>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    background: '#1a1a2e',
    borderRadius: 16,
    padding: 24,
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
  title: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 700,
    margin: 0,
  },
  amountRow: {
    display: 'flex',
    gap: 16,
  },
  amountBlock: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
    padding: 12,
    background: '#16162a',
    borderRadius: 10,
  },
  amountLabel: {
    color: '#a0a0b8',
    fontSize: 12,
  },
  amountValue: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 700,
  },
  progressOuter: {
    width: '100%',
    height: 6,
    background: '#2a2a3e',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressInner: {
    height: '100%',
    borderRadius: 3,
    transition: 'width 0.5s ease',
  },
  progressLabel: {
    color: '#a0a0b8',
    fontSize: 12,
    textAlign: 'right',
  },
  milestoneSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  milestoneTitle: {
    color: '#d0d0e0',
    fontSize: 14,
    fontWeight: 600,
    margin: 0,
  },
  emptyText: {
    color: '#6b7280',
    fontSize: 13,
  },
  milestoneRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px 12px',
    background: '#16162a',
    borderRadius: 8,
  },
  milestoneLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: '50%',
    flexShrink: 0,
  },
  milestoneInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: 1,
  },
  milestoneName: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 600,
  },
  milestoneAmt: {
    color: '#a0a0b8',
    fontSize: 12,
  },
  badge: {
    padding: '4px 10px',
    borderRadius: 12,
    fontSize: 12,
    fontWeight: 600,
  },
  statsRow: {
    display: 'flex',
    gap: 16,
    borderTop: '1px solid #2a2a3e',
    paddingTop: 12,
  },
  stat: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 2,
  },
  statValue: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 700,
  },
  statLabel: {
    color: '#a0a0b8',
    fontSize: 12,
  },
};

export default EscrowStatus;
