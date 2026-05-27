import { useState, useMemo } from 'react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import TransactionModal, { useTxModal } from '../common/TransactionModal';
import type { Milestone, CampaignContribution } from '../../types';
import { updateMilestoneStatus } from '../../services/milestoneService';
import { addFeedEvent } from '../../services/feedService';

interface Vote {
  milestoneId: string;
  voter: string;
  weight: number;
  approved: boolean;
}

interface Props {
  milestones: Milestone[];
  contributions: CampaignContribution[];
  currentUserAddress: string;
  campaignCreator: string;
  readOnly?: boolean;
  onUpdate?: () => void;
}

export default function MilestoneList({
  milestones,
  contributions,
  currentUserAddress,
  campaignCreator,
  readOnly = false,
  onUpdate,
}: Props) {
  const tx = useTxModal();
  const [votes, setVotes] = useState<Vote[]>([]);
  const [voteAction, setVoteAction] = useState<{ mileId: string; approve: boolean } | null>(null);

  const userContribution = useMemo(() => {
    const total = contributions
      .filter(c => c.contributor === currentUserAddress)
      .reduce((s, c) => s + Number(c.amount), 0);
    return total;
  }, [contributions, currentUserAddress]);

  const totalContributions = useMemo(() => {
    return contributions.reduce((s, c) => s + Number(c.amount), 0);
  }, [contributions]);

  const isCreator = currentUserAddress === campaignCreator;

  const getMilestoneVotes = (mileId: string) => votes.filter(v => v.milestoneId === mileId);
  const getUserVote = (mileId: string) => votes.find(v => v.milestoneId === mileId && v.voter === currentUserAddress);

  const getVoteResult = (mileId: string) => {
    const mileVotes = getMilestoneVotes(mileId);
    if (mileVotes.length === 0 || totalContributions === 0) return { passed: false, forWeight: 0, againstWeight: 0, totalWeight: 0 };
    const forWeight = mileVotes.filter(v => v.approved).reduce((s, v) => s + v.weight, 0);
    const againstWeight = mileVotes.filter(v => !v.approved).reduce((s, v) => s + v.weight, 0);
    const pct = (forWeight / totalContributions) * 100;
    return { passed: pct > 50, forWeight, againstWeight, totalWeight: forWeight + againstWeight };
  };

  const castVote = (mileId: string, approve: boolean) => {
    setVoteAction({ mileId, approve });
    tx.open(
      approve ? 'Approving Milestone' : 'Rejecting Milestone',
      `Your vote weight: ${userContribution} STX`
    );

    setTimeout(() => {
      const newVote: Vote = {
        milestoneId: mileId,
        voter: currentUserAddress,
        weight: userContribution,
        approved: approve,
      };
      setVotes(prev => {
        const filtered = prev.filter(v => !(v.milestoneId === mileId && v.voter === currentUserAddress));
        return [...filtered, newVote];
      });

      const result = getVoteResult(mileId);
      const mile = milestones.find(m => m.id === mileId);
      const mileName = mile?.title || mileId;
      addFeedEvent('milestone_reached', currentUserAddress, `${approve ? 'Approved' : 'Rejected'} milestone: ${mileName}`, mileId);

      tx.succeed(`tx_vote_${mileId}_${Date.now()}`);
      setTimeout(() => { tx.close(); setVoteAction(null); onUpdate?.(); }, 1000);
    }, 600);
  };

  const completeMilestone = (mileId: string) => {
    tx.open('Completing Milestone', 'Marking milestone as completed');
    setTimeout(() => {
      const res = updateMilestoneStatus(mileId, 'completed');
      if (res.success) {
        const mile = milestones.find(m => m.id === mileId);
        addFeedEvent('milestone_reached', currentUserAddress, `Completed milestone: ${mile?.title || mileId}`, mileId);
        tx.succeed(`tx_complete_${mileId}_${Date.now()}`);
        setTimeout(() => { tx.close(); onUpdate?.(); }, 1000);
      } else {
        tx.fail(res.error || 'Failed to complete milestone');
      }
    }, 600);
  };

  if (milestones.length === 0) {
    return (
      <Card variant="light" padding="default">
        <p className="text-sm text-gray-500">No milestones defined yet.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {milestones.map((mile) => {
        const result = getMilestoneVotes(mile.id).length > 0 ? getVoteResult(mile.id) : null;
        const userVote = getUserVote(mile.id);
        const statusColors: Record<string, string> = {
          pending: 'text-yellow-400',
          active: 'text-blue-400',
          completed: 'text-[#4ade80]',
          failed: 'text-red-400',
        };

        return (
          <Card key={mile.id} variant="light" padding="small">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="text-sm font-semibold text-white truncate">{mile.title}</h4>
                  <span className={`text-xs font-medium ${statusColors[mile.status] || 'text-gray-400'}`}>
                    {mile.status.toUpperCase()}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mb-1">{mile.description}</p>
                <div className="flex items-center gap-3 text-xs text-gray-600">
                  <span>Required: ₦{Number(mile.fundingRequired).toLocaleString()}</span>
                  {mile.deliverables && mile.deliverables.length > 0 && (
                    <span>{mile.deliverables.length} deliverable{mile.deliverables.length > 1 ? 's' : ''}</span>
                  )}
                  {mile.completedAt && (
                    <span>Completed {new Date(mile.completedAt).toLocaleDateString()}</span>
                  )}
                </div>

                {result && (
                  <div className="mt-2 flex items-center gap-2 text-xs">
                    <div className="flex-1 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all ${result.passed ? 'bg-[#4ade80]' : 'bg-yellow-400'}`}
                        style={{ width: `${totalContributions > 0 ? (result.forWeight / totalContributions) * 100 : 0}%` }}
                      />
                    </div>
                    <span className={result.passed ? 'text-[#4ade80]' : 'text-yellow-400'}>
                      {result.passed ? 'PASS' : 'PENDING'} ({Math.round((result.forWeight / (totalContributions || 1)) * 100)}%)
                    </span>
                  </div>
                )}
              </div>

              <div className="flex-shrink-0 flex flex-col gap-1.5">
                {!readOnly && mile.status === 'active' && !isCreator && userContribution > 0 && (
                  <>
                    {userVote ? (
                      <span className={`text-xs font-medium ${userVote.approved ? 'text-[#4ade80]' : 'text-red-400'}`}>
                        {userVote.approved ? '✓ Approved' : '✕ Rejected'}
                      </span>
                    ) : (
                      <div className="flex gap-1">
                        <button
                          onClick={() => castVote(mile.id, true)}
                          className="px-2 py-1 text-xs bg-[#4ade80]/20 text-[#4ade80] rounded hover:bg-[#4ade80]/30 transition-colors"
                        >
                          ✓
                        </button>
                        <button
                          onClick={() => castVote(mile.id, false)}
                          className="px-2 py-1 text-xs bg-red-500/20 text-red-400 rounded hover:bg-red-500/30 transition-colors"
                        >
                          ✕
                        </button>
                      </div>
                    )}
                    <span className="text-xs text-gray-600">Weight: {userContribution}</span>
                  </>
                )}
                {isCreator && mile.status === 'active' && (
                  <Button variant="primary" size="small" onClick={() => completeMilestone(mile.id)}>
                    Complete
                  </Button>
                )}
              </div>
            </div>
          </Card>
        );
      })}

      <TransactionModal
        isOpen={tx.isOpen}
        state={tx.state}
        title={tx.title}
        description={tx.description}
        txId={tx.txId}
        error={tx.error}
        onClose={() => tx.close()}
        onRetry={() => voteAction && castVote(voteAction.mileId, voteAction.approve)}
      />
    </div>
  );
}
