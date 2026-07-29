export const STATE_LABELS = {
  disbursement_initiated: { label: 'Disbursement created', icon: '📋', category: 'init' },
  preflight_check: { label: 'Preflight checks running', icon: '🔍', category: 'preflight' },
  manual_review_required: { label: 'Manual review needed', icon: '👤', category: 'review' },
  burn_submitted: { label: 'Digital currency sent for burning', icon: '🔥', category: 'burn' },
  burn_confirmed: { label: 'Burn confirmed on-chain', icon: '✅', category: 'burn' },
  attestation_requested: { label: 'Attestation requested from xReserve', icon: '📄', category: 'attestation' },
  attestation_confirmed: { label: 'Attestation received from xReserve', icon: '📄', category: 'attestation' },
  destination_release_submitted: { label: 'Funds released to destination', icon: '🌍', category: 'release' },
  destination_release_confirmed: { label: 'Destination release confirmed', icon: '✅', category: 'release' },
  yellowcard_payout_submitted: { label: 'Yellow Card payout initiated', icon: '💸', category: 'payout' },
  yellowcard_payout_confirmed: { label: 'Yellow Card payout confirmed', icon: '✅', category: 'payout' },
  settled: { label: 'Disbursement settled', icon: '🎉', category: 'terminal' },
  failed: { label: 'Disbursement failed', icon: '❌', category: 'terminal' },
  cancelled: { label: 'Disbursement cancelled', icon: '🚫', category: 'terminal' },
};

export async function buildTimeline(ctx, { disbursementId }) {
  const { db } = ctx;

  const [auditRows, snapshotRows, evidenceRows] = await Promise.all([
    db.query('SELECT * FROM disbursement_audit WHERE disbursement_id = $1 ORDER BY created_at ASC', [disbursementId]),
    db.query('SELECT * FROM external_status_snapshots WHERE disbursement_id = $1 ORDER BY captured_at ASC', [disbursementId]),
    db.query('SELECT * FROM disbursement_evidence WHERE disbursement_id = $1 ORDER BY created_at ASC', [disbursementId]),
  ]);

  const audit = auditRows.rows || [];
  const snapshots = snapshotRows.rows || [];
  const evidence = evidenceRows.rows || [];

  const timeline = audit.map(event => {
    const stateLabel = STATE_LABELS[event.to_state] || { label: event.to_state, icon: '➡️', category: 'unknown' };
    const matchingSnapshots = snapshots.filter(s => {
      const snapTime = new Date(s.captured_at).getTime();
      const eventTime = new Date(event.created_at).getTime();
      return Math.abs(snapTime - eventTime) < 5000;
    });

    return {
      fromState: event.from_state,
      toState: event.to_state,
      label: stateLabel.label,
      icon: stateLabel.icon,
      category: stateLabel.category,
      reason: event.guard_reason,
      metadata: event.metadata,
      timestamp: event.created_at,
      externalStatuses: matchingSnapshots.map(s => ({
        system: s.external_system || s.source,
        status: s.status,
        raw: s.raw_response,
      })),
    };
  });

  const currentState = timeline.length > 0 ? timeline[timeline.length - 1].toState : 'unknown';
  const isSettled = currentState === 'settled';
  const isFailed = currentState === 'failed' || currentState === 'cancelled';

  return {
    timeline,
    summary: {
      currentState,
      totalEvents: timeline.length,
      settled: isSettled,
      failed: isFailed,
    },
    evidence,
  };
}

export function formatTimelineText(timeline) {
  return timeline.map(entry => {
    let line = `${entry.icon} ${entry.label}`;
    if (entry.timestamp) {
      line += ` — ${new Date(entry.timestamp).toLocaleString()}`;
    }
    if (entry.externalStatuses?.length) {
      line += ` [${entry.externalStatuses.map(s => `${s.system}:${s.status}`).join(', ')}]`;
    }
    return line;
  }).join('\n');
}

export default { STATE_LABELS, buildTimeline, formatTimelineText };
