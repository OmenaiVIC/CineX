import React, { useState } from 'react';
import { Milestone, Campaign } from '../../types';

interface MilestoneVotingProps {
  campaign: Campaign;
  milestones: Milestone[];
  userRole: 'creative' | 'backer';
  onVote: (milestoneId: string, approve: boolean) => void;
  onSubmitProof?: (milestoneId: string) => void;
}

function formatAmount(amount: string): string {
  const num = Number(amount);
  if (isNaN(num)) return amount;
  return num.toLocaleString();
}

function timeLeft(deadline: number): string {
  const diff = deadline - Date.now();
  if (diff <= 0) return 'Deadline passed';
  const days = Math.floor(diff / 86400000);
  if (days > 0) return `${days} day${days !== 1 ? 's' : ''} left`;
  const hours = Math.floor(diff / 3600000);
  return `${hours} hour${hours !== 1 ? 's' : ''} left`;
}

export function MilestoneVoting({ campaign, milestones, userRole, onVote, onSubmitProof }: MilestoneVotingProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const handleVote = (milestoneId: string, approve: boolean) => {
    onVote(milestoneId, approve);
  };

  return (
    <div style={styles.container}>
      <h3 style={styles.title}>Milestones & Voting</h3>
      <p style={styles.subtext}>
        {userRole === 'backer'
          ? 'Vote to release funds when milestones are delivered'
          : 'Submit proof of delivery and track fund releases'}
      </p>

      {milestones.length === 0 ? (
        <div style={styles.emptyState}>
          <span style={styles.emptyIcon}>📋</span>
          <span style={styles.emptyText}>No milestones yet</span>
        </div>
      ) : (
        <div style={styles.list}>
          {milestones.map((m, idx) => {
            const isActive = m.status === 'active';
            const isCompleted = m.status === 'completed';
            const isExpanded = expandedId === m.id;

            return (
              <div key={m.id} style={styles.milestoneCard}>
                <div
                  style={styles.milestoneHeader}
                  onClick={() => setExpandedId(isExpanded ? null : m.id)}
                >
                  <div style={styles.milestoneLeft}>
                    <div
                      style={{
                        ...styles.stepIndicator,
                        background: isCompleted
                          ? '#22c55e'
                          : isActive
                          ? '#f59e0b'
                          : '#2a2a3e',
                      }}
                    >
                      {isCompleted ? '✓' : idx + 1}
                    </div>
                    <div style={styles.milestoneInfo}>
                      <span style={styles.milestoneName}>{m.title}</span>
                      <span style={styles.milestoneMeta}>
                        ${formatAmount(m.fundingRequired)} · {timeLeft(m.deadline)}
                      </span>
                    </div>
                  </div>
                  <span
                    style={{
                      ...styles.statusBadge,
                      color: isCompleted ? '#22c55e' : isActive ? '#f59e0b' : '#6b7280',
                      background: isCompleted
                        ? 'rgba(34,197,94,0.1)'
                        : isActive
                        ? 'rgba(245,158,11,0.1)'
                        : 'rgba(107,114,128,0.1)',
                    }}
                  >
                    {isCompleted ? 'Delivered' : isActive ? 'In progress' : 'Pending'}
                  </span>
                </div>

                {isExpanded && (
                  <div style={styles.expandedContent}>
                    <p style={styles.description}>{m.description}</p>

                    {m.deliverables && m.deliverables.length > 0 && (
                      <div style={styles.deliverables}>
                        <span style={styles.deliverablesTitle}>Deliverables</span>
                        {m.deliverables.map((d, i) => (
                          <span key={i} style={styles.deliverableItem}>· {d}</span>
                        ))}
                      </div>
                    )}

                    {isActive && (
                      <div style={styles.actions}>
                        {userRole === 'creative' && onSubmitProof && (
                          <button
                            style={styles.proofBtn}
                            onClick={() => onSubmitProof(m.id)}
                          >
                            Submit Proof of Delivery
                          </button>
                        )}
                        {userRole === 'backer' && (
                          <div style={styles.voteButtons}>
                            <button
                              style={styles.approveBtn}
                              onClick={() => handleVote(m.id, true)}
                            >
                              ✓ Approve & Release Funds
                            </button>
                            <button
                              style={styles.rejectBtn}
                              onClick={() => handleVote(m.id, false)}
                            >
                              ✕ Needs Work
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    {isCompleted && (
                      <div style={styles.completedBox}>
                        <span style={{ fontSize: 16 }}>✅</span>
                        <span style={styles.completedText}>
                          Funds released — ${formatAmount(m.fundingRequired)}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
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
  subtext: {
    color: '#a0a0b8',
    fontSize: 14,
    margin: 0,
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 8,
    padding: 32,
  },
  emptyIcon: { fontSize: 32 },
  emptyText: { color: '#6b7280', fontSize: 14 },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  milestoneCard: {
    background: '#16162a',
    borderRadius: 12,
    overflow: 'hidden',
    border: '1px solid #2a2a3e',
  },
  milestoneHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '14px 16px',
    cursor: 'pointer',
  },
  milestoneLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  stepIndicator: {
    width: 28,
    height: 28,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 700,
    flexShrink: 0,
  },
  milestoneInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
  },
  milestoneName: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 600,
  },
  milestoneMeta: {
    color: '#a0a0b8',
    fontSize: 12,
  },
  statusBadge: {
    padding: '4px 10px',
    borderRadius: 12,
    fontSize: 12,
    fontWeight: 600,
    flexShrink: 0,
  },
  expandedContent: {
    padding: '0 16px 16px',
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
    borderTop: '1px solid #2a2a3e',
    paddingTop: 12,
  },
  description: {
    color: '#d0d0e0',
    fontSize: 13,
    margin: 0,
    lineHeight: 1.5,
  },
  deliverables: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  deliverablesTitle: {
    color: '#a0a0b8',
    fontSize: 12,
    fontWeight: 600,
  },
  deliverableItem: {
    color: '#d0d0e0',
    fontSize: 13,
    paddingLeft: 8,
  },
  actions: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  proofBtn: {
    padding: '10px 16px',
    background: 'linear-gradient(135deg, #6c63ff, #e94560)',
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 700,
    border: 'none',
    borderRadius: 8,
    cursor: 'pointer',
  },
  voteButtons: {
    display: 'flex',
    gap: 8,
  },
  approveBtn: {
    flex: 1,
    padding: '10px 16px',
    background: 'rgba(34,197,94,0.12)',
    color: '#22c55e',
    fontSize: 13,
    fontWeight: 700,
    border: '1px solid rgba(34,197,94,0.3)',
    borderRadius: 8,
    cursor: 'pointer',
  },
  rejectBtn: {
    flex: 1,
    padding: '10px 16px',
    background: 'rgba(233,69,96,0.12)',
    color: '#e94560',
    fontSize: 13,
    fontWeight: 700,
    border: '1px solid rgba(233,69,96,0.3)',
    borderRadius: 8,
    cursor: 'pointer',
  },
  completedBox: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '10px 14px',
    background: 'rgba(34,197,94,0.06)',
    borderRadius: 8,
    border: '1px solid rgba(34,197,94,0.15)',
  },
  completedText: {
    color: '#22c55e',
    fontSize: 13,
    fontWeight: 600,
  },
};

export default MilestoneVoting;
