import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDemoMode } from '../contexts/DemoModeContext';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import LoadingSkeleton from '../components/common/LoadingSkeleton';
import TransactionModal, { useTxModal } from '../components/common/TransactionModal';
import MilestoneList from '../components/dashboard/MilestoneList';
import { useCampaign, useCampaignContributions } from '../hooks/useCampaigns';
import { contributeToCampaign, getCampaignChainState } from '../services/campaignService';
import { getCampaignMilestones } from '../services/milestoneService';
import { addFeedEvent } from '../services/feedService';
import type { Milestone } from '../types';

export default function CampaignPage() {
  const { id } = useParams<{ id: string }>();
  const { currentUser } = useDemoMode();
  const navigate = useNavigate();
  const tx = useTxModal();

  const { campaign, loading, refresh: refreshCampaign } = useCampaign(id || '');
  const { contributions, refresh: refreshContributions } = useCampaignContributions(id || '');

  const [contributeAmount, setContributeAmount] = useState('');
  const [contributeMessage, setContributeMessage] = useState('');
  const [lastChainUrl, setLastChainUrl] = useState<string | null>(null);

  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [chainState, setChainState] = useState<{ escrow: Record<string, unknown>; module: Record<string, unknown> } | null>(null);
  const [chainStateLoading, setChainStateLoading] = useState(false);
  useEffect(() => {
    if (!id) return;
    getCampaignMilestones(id).then(res => {
      if (res.success && res.data) setMilestones(res.data);
    });
    setChainStateLoading(true);
    getCampaignChainState(id).then(res => {
      if (res.success && res.data) setChainState(res.data as unknown as { escrow: Record<string, unknown>; module: Record<string, unknown> });
      setChainStateLoading(false);
    });
  }, [id]);

  const handleContribute = async () => {
    if (!currentUser || !id) return;
    const amt = parseFloat(contributeAmount);
    if (isNaN(amt) || amt <= 0) { tx.fail('Enter a valid amount'); return; }

    tx.open('Contributing', `Depositing ₦${amt.toLocaleString()} to ${campaign?.title}`);
    setTimeout(async () => {
      const res = await contributeToCampaign({ campaignId: id, amount: amt.toString(), message: contributeMessage }, currentUser.address);
      if (res.success) {
        addFeedEvent('campaign_funded', currentUser.address, `Contributed ₦${amt.toLocaleString()} to ${campaign?.title}`, id);
        const chainUrl = (res as { chainUrl?: string }).chainUrl || undefined;
        setLastChainUrl(chainUrl || null);
        tx.succeed(res.transactionId || 'tx_success', chainUrl);
        setTimeout(() => {
          tx.close();
          setContributeAmount('');
          setContributeMessage('');
          setLastChainUrl(null);
          refreshCampaign();
          refreshContributions();
        }, 1000);
      } else {
        tx.fail(res.error || 'Contribution failed');
      }
    }, 800);
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <LoadingSkeleton variant="card" count={3} />
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 text-center">
        <p className="text-gray-400 mb-4">Campaign not found.</p>
        <Button variant="outline" onClick={() => navigate('/explore')}>Browse Campaigns</Button>
      </div>
    );
  }

  const raised = Number(campaign.currentAmount);
  const target = Number(campaign.targetAmount);
  const pct = target > 0 ? Math.round((raised / target) * 100) : 0;
  const isCreator = currentUser?.address === campaign.creator;
  const daysLeft = Math.max(0, Math.ceil((campaign.deadline - Date.now()) / 86400000));

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <button onClick={() => navigate(-1)} className="text-sm text-gray-500 hover:text-gray-300 mb-4 block">← Back</button>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-medium text-gray-500 uppercase">{campaign.category.replace('-', ' ')}</span>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                campaign.status === 'active' ? 'bg-blue-500/20 text-blue-400' :
                campaign.status === 'funded' ? 'bg-[#4ade80]/20 text-[#4ade80]' :
                campaign.status === 'completed' ? 'bg-gray-500/20 text-gray-400' :
                'bg-red-500/20 text-red-400'
              }`}>{campaign.status}</span>
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">{campaign.title}</h1>
            <p className="text-sm text-gray-400 mb-4">{campaign.description}</p>
            {campaign.tags && campaign.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-4">
                {campaign.tags.map(tag => (
                  <span key={tag} className="text-xs px-2 py-0.5 bg-gray-800 text-gray-400 rounded-full">#{tag}</span>
                ))}
              </div>
            )}
            <p className="text-xs text-gray-600">
              Created by <span className="text-gray-400">{campaign.creator.slice(0, 10)}...</span>
              {' · '}{new Date(campaign.createdAt).toLocaleDateString()}
            </p>
          </div>

          <div>
            <div className="flex justify-between text-sm mb-1.5">
              <span className="text-[#4ade80] font-medium">₦{raised.toLocaleString()} raised</span>
              <span className="text-gray-500">of ₦{target.toLocaleString()}</span>
            </div>
            <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
              <div className="h-full bg-[#4ade80] rounded-full transition-all" style={{ width: `${Math.min(pct, 100)}%` }} />
            </div>
            <div className="flex justify-between text-xs text-gray-600 mt-1">
              <span>{pct}% funded</span>
              <span>{daysLeft > 0 ? `${daysLeft} days left` : 'Ended'}</span>
            </div>
          </div>

          <div>
            <h3 className="text-base font-semibold text-white mb-3">Milestones</h3>
            <MilestoneList
              milestones={milestones}
              contributions={contributions}
              currentUserAddress={currentUser?.address || ''}
              campaignCreator={campaign.creator}
              readOnly={!currentUser}
              onUpdate={() => {
                // force re-render by triggering state
                refreshCampaign();
              }}
            />
          </div>
        </div>

        <div className="space-y-4">
          {!isCreator && currentUser && campaign.status === 'active' && (
            <Card variant="light" padding="default">
              <h3 className="text-base font-semibold text-white mb-3">Back This Project</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Amount (₦)</label>
                  <Input
                    type="number"
                    placeholder="Enter amount"
                    value={contributeAmount}
                    onChange={(e) => setContributeAmount(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Message (optional)</label>
                  <Input
                    placeholder="Say something..."
                    value={contributeMessage}
                    onChange={(e) => setContributeMessage(e.target.value)}
                  />
                </div>
                <Button variant="primary" className="w-full" onClick={handleContribute}>
                  Contribute
                </Button>
              </div>
            </Card>
          )}

          <Card variant="light" padding="default">
            <h3 className="text-sm font-semibold text-white mb-2">Campaign Stats</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Backers</span>
                <span className="text-white">{contributions.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Milestones</span>
                <span className="text-white">{milestones.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Created</span>
                <span className="text-white">{new Date(campaign.createdAt).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Deadline</span>
                <span className="text-white">{new Date(campaign.deadline).toLocaleDateString()}</span>
              </div>
            </div>
          </Card>

          <Card variant="light" padding="default">
            <h3 className="text-sm font-semibold text-white mb-2">On-Chain Status</h3>
            {chainStateLoading ? (
              <p className="text-xs text-gray-500">Loading...</p>
            ) : chainState?.escrow ? (
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-500">Escrow</span>
                  <span className="text-[#4ade80]">Active</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Module</span>
                  <span className={chainState.module ? 'text-[#4ade80]' : 'text-gray-500'}>
                    {chainState.module ? 'Synced' : 'Off-chain'}
                  </span>
                </div>
                <a
                  href={`https://explorer.hiro.so/txid/ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.milestone-escrow?chain=testnet`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-blue-400 hover:text-blue-300 mt-1"
                >
                  View Escrow Contract ↗
                </a>
              </div>
            ) : (
              <p className="text-xs text-gray-500">Not on chain</p>
            )}
          </Card>

          {contributions.length > 0 && (
            <Card variant="light" padding="default">
              <h3 className="text-sm font-semibold text-white mb-2">Recent Backers</h3>
              <div className="space-y-2">
                {contributions.slice(-5).reverse().map((c) => (
                  <div key={c.txId} className="flex items-center justify-between text-sm">
                    <span className="text-gray-400 truncate max-w-[140px]">{c.contributor.slice(0, 10)}...</span>
                    <span className="text-[#4ade80]">₦{Number(c.amount).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>

      <TransactionModal
        isOpen={tx.isOpen}
        state={tx.state}
        title={tx.title}
        description={tx.description}
        txId={tx.txId}
        chainUrl={tx.chainUrl}
        error={tx.error}
        onClose={() => tx.close()}
        onRetry={handleContribute}
      />
    </div>
  );
}
