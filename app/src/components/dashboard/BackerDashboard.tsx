import { useMemo, useState } from 'react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import LoadingSkeleton from '../common/LoadingSkeleton';
import TransactionModal, { useTxModal } from '../common/TransactionModal';
import { claimBackerYield } from '../../services/yieldService';
import type { Campaign, CampaignContribution, Pool } from '../../types';

interface Props {
  contributions: CampaignContribution[];
  campaigns: Campaign[];
  pools: Pool[];
  loading?: boolean;
  onViewCampaign: (id: string) => void;
  onExplore: () => void;
}

export default function BackerDashboard({
  contributions,
  campaigns,
  pools,
  loading = false,
  onViewCampaign,
  onExplore,
}: Props) {
  const tx = useTxModal();
  const [claimingId, setClaimingId] = useState<string | null>(null);

  const handleClaimYield = async (campaignId: string) => {
    setClaimingId(campaignId);
    tx.open('Claiming Yield', 'Withdrawing your yield from this campaign');
    setTimeout(async () => {
      const res = await claimBackerYield(campaignId);
      if (res.success) {
        tx.succeed(res.transactionId || 'tx_yield_success');
      } else {
        tx.fail(res.error || 'Failed to claim yield');
      }
      setTimeout(() => { tx.close(); setClaimingId(null); }, 1000);
    }, 600);
  };
  const stats = useMemo(() => {
    const totalContributed = contributions.reduce((s, c) => s + Number(c.amount), 0);
    const uniqueCreators = new Set(
      contributions
        .map(c => campaigns.find(camp => camp.id === c.campaignId)?.creator)
        .filter(Boolean)
    ).size;
    return {
      totalContributed,
      campaignsBacked: contributions.length,
      uniqueCreators,
      activePools: pools.filter(p => p.status === 'open' || p.status === 'active').length,
    };
  }, [contributions, campaigns, pools]);

  const backedCampaigns = useMemo(() => {
    const backedIds = new Set(contributions.map(c => c.campaignId));
    return campaigns.filter(c => backedIds.has(c.id));
  }, [campaigns, contributions]);

  if (loading) {
    return (
      <div className="space-y-6">
        <h2 className="text-xl font-bold text-white">Backer Dashboard</h2>
        <LoadingSkeleton variant="card" count={3} />
      </div>
    );
  }

  if (contributions.length === 0) {
    return (
      <div className="space-y-6">
        <h2 className="text-xl font-bold text-white">Backer Dashboard</h2>
        <Card variant="light" padding="default">
          <p className="text-gray-500 text-sm mb-3">You haven't backed any campaigns yet.</p>
          <Button variant="primary" size="small" onClick={onExplore}>Explore Campaigns</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">Backer Dashboard</h2>
        <Button variant="neon" onClick={onExplore}>Explore</Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card variant="light" padding="small">
          <p className="text-xs text-gray-400 mb-1">Total Contributed</p>
          <p className="text-2xl font-bold text-white">₦{stats.totalContributed.toLocaleString()}</p>
        </Card>
        <Card variant="light" padding="small">
          <p className="text-xs text-gray-400 mb-1">Campaigns Backed</p>
          <p className="text-2xl font-bold text-[#4ade80]">{stats.campaignsBacked}</p>
        </Card>
        <Card variant="light" padding="small">
          <p className="text-xs text-gray-400 mb-1">Creators Supported</p>
          <p className="text-2xl font-bold text-white">{stats.uniqueCreators}</p>
        </Card>
        <Card variant="light" padding="small">
          <p className="text-xs text-gray-400 mb-1">Active Pools</p>
          <p className="text-2xl font-bold text-white">{stats.activePools}</p>
        </Card>
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Your Backed Campaigns</h3>
        {backedCampaigns.map((c) => {
          const raised = Number(c.currentAmount);
          const target = Number(c.targetAmount);
          const pct = target > 0 ? Math.round((raised / target) * 100) : 0;
          const userTotal = contributions
            .filter(ct => ct.campaignId === c.id && ct.contributor)
            .reduce((s, ct) => s + Number(ct.amount), 0);

          return (
            <Card key={c.id} variant="light" padding="small" className="cursor-pointer hover:border-gray-700 transition-colors" onClick={() => onViewCampaign(c.id)}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-semibold text-white truncate">{c.title}</h4>
                  <p className="text-xs text-gray-500 mt-0.5">{c.category.replace('-', ' ')} by {c.creator.slice(0, 10)}...</p>
                  <div className="mt-2">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-[#4ade80]">₦{raised.toLocaleString()}</span>
                      <span className="text-gray-500">₦{target.toLocaleString()}</span>
                    </div>
                    <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                      <div className="h-full bg-[#4ade80] rounded-full transition-all" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                  <div className="flex items-center gap-3 mt-2">
                    <p className="text-xs text-gray-600">Your contribution: ₦{userTotal.toLocaleString()}</p>
                    <Button
                      variant="outline"
                      size="small"
                      onClick={() => handleClaimYield(c.id)}
                    >
                      Claim Yield
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <TransactionModal
        isOpen={tx.isOpen}
        state={tx.state}
        title={tx.title}
        description={tx.description}
        txId={tx.txId}
        error={tx.error}
        onClose={() => tx.close()}
        onRetry={() => claimingId && handleClaimYield(claimingId)}
      />
    </div>
  );
}
