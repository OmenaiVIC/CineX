import { useMemo, useState } from 'react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import TransactionModal, { useTxModal } from '../common/TransactionModal';
import LoadingSkeleton from '../common/LoadingSkeleton';
import { claimCreatorBonus, claimCampaignFunds } from '../../services/yieldService';
import type { Campaign, Milestone, CampaignContribution } from '../../types';

interface Props {
  campaigns: Campaign[];
  milestones: Milestone[];
  contributions: CampaignContribution[];
  onViewCampaign: (id: string) => void;
  onCreateCampaign: () => void;
}

export default function CreatorDashboard({
  campaigns,
  milestones,
  contributions,
  onViewCampaign,
  onCreateCampaign,
}: Props) {
  const tx = useTxModal();
  const [claimingAction, setClaimingAction] = useState<{ type: string; campaignId: string } | null>(null);

  const handleClaimBonus = async (campaignId: string) => {
    setClaimingAction({ type: 'bonus', campaignId });
    tx.open('Claiming Bonus', 'Withdrawing your creator bonus');
    setTimeout(async () => {
      const res = await claimCreatorBonus(campaignId);
      if (res.success) {
        tx.succeed(res.transactionId || 'tx_bonus_success');
      } else {
        tx.fail(res.error || 'Failed to claim bonus');
      }
      setTimeout(() => { tx.close(); setClaimingAction(null); }, 1000);
    }, 600);
  };

  const handleClaimFunds = async (campaignId: string) => {
    setClaimingAction({ type: 'funds', campaignId });
    tx.open('Claiming Funds', 'Withdrawing all raised funds');
    setTimeout(async () => {
      const res = await claimCampaignFunds(campaignId);
      if (res.success) {
        tx.succeed(res.transactionId || 'tx_claim_success');
      } else {
        tx.fail(res.error || 'Failed to claim funds');
      }
      setTimeout(() => { tx.close(); setClaimingAction(null); }, 1000);
    }, 600);
  };

  const stats = useMemo(() => {
    const active = campaigns.filter(c => c.status === 'active').length;
    const funded = campaigns.filter(c => c.status === 'funded' || c.status === 'completed').length;
    const totalRaised = campaigns.reduce((s, c) => s + Number(c.currentAmount), 0);
    const totalTarget = campaigns.reduce((s, c) => s + Number(c.targetAmount), 0);
    const totalMilestones = milestones.length;
    const completedMilestones = milestones.filter(m => m.status === 'completed').length;
    return { active, funded, totalRaised, totalTarget, totalMilestones, completedMilestones };
  }, [campaigns, milestones]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">Creator Dashboard</h2>
        <Button variant="neon" onClick={onCreateCampaign}>New Campaign</Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card variant="light" padding="small">
          <p className="text-xs text-gray-400 mb-1">Active Campaigns</p>
          <p className="text-2xl font-bold text-white">{stats.active}</p>
        </Card>
        <Card variant="light" padding="small">
          <p className="text-xs text-gray-400 mb-1">Funded</p>
          <p className="text-2xl font-bold text-[#4ade80]">{stats.funded}</p>
        </Card>
        <Card variant="light" padding="small">
          <p className="text-xs text-gray-400 mb-1">Raised</p>
          <p className="text-2xl font-bold text-white">₦{stats.totalRaised.toLocaleString()}</p>
        </Card>
        <Card variant="light" padding="small">
          <p className="text-xs text-gray-400 mb-1">Milestones</p>
          <p className="text-2xl font-bold text-white">{stats.completedMilestones}/{stats.totalMilestones}</p>
        </Card>
      </div>

      {campaigns.length === 0 ? (
        <Card variant="light" padding="default">
          <p className="text-gray-500 text-sm mb-3">You haven't created any campaigns yet.</p>
          <Button variant="primary" size="small" onClick={onCreateCampaign}>Create Your First Campaign</Button>
        </Card>
      ) : (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Your Campaigns</h3>
          {campaigns.map((c) => {
            const campaignMilestones = milestones.filter(m => m.campaignId === c.id);
            const completed = campaignMilestones.filter(m => m.status === 'completed').length;
            const campaignContributions = contributions.filter(ct => ct.campaignId === c.id);
            const raised = Number(c.currentAmount);
            const target = Number(c.targetAmount);
            const pct = target > 0 ? Math.round((raised / target) * 100) : 0;
            const statusColor: Record<string, string> = { active: 'text-blue-400', funded: 'text-[#4ade80]', failed: 'text-red-400', completed: 'text-gray-400' };

            return (
              <Card key={c.id} variant="light" padding="small" className="cursor-pointer hover:border-gray-700 transition-colors" onClick={() => onViewCampaign(c.id)}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-semibold text-white truncate">{c.title}</h4>
                      <span className={`text-xs font-medium ${statusColor[c.status] || 'text-gray-400'}`}>{c.status.toUpperCase()}</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">{c.category.replace('-', ' ')} · {campaignContributions.length} backer{campaignContributions.length !== 1 ? 's' : ''}</p>
                    <div className="mt-2">
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-[#4ade80]">₦{raised.toLocaleString()}</span>
                        <span className="text-gray-500">₦{target.toLocaleString()}</span>
                      </div>
                      <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                        <div className="h-full bg-[#4ade80] rounded-full transition-all" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                    {campaignMilestones.length > 0 && (
                      <p className="text-xs text-gray-600 mt-1">{completed}/{campaignMilestones.length} milestones completed</p>
                    )}
                    <div className="flex gap-2 mt-2">
                      {raised >= target && !(c as any).funds_claimed && (
                        <Button variant="primary" size="small" onClick={() => handleClaimFunds(c.id)}>
                          Claim Funds
                        </Button>
                      )}
                      <Button variant="outline" size="small" onClick={() => handleClaimBonus(c.id)}>
                        Claim Bonus
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <TransactionModal
        isOpen={tx.isOpen}
        state={tx.state}
        title={tx.title}
        description={tx.description}
        txId={tx.txId}
        error={tx.error}
        onClose={() => tx.close()}
        onRetry={() => {
          if (claimingAction?.type === 'funds') handleClaimFunds(claimingAction.campaignId);
          else if (claimingAction?.type === 'bonus') handleClaimBonus(claimingAction.campaignId);
        }}
      />
    </div>
  );
}
