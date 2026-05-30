import { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDemoMode } from '../contexts/DemoModeContext';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import LoadingSkeleton from '../components/common/LoadingSkeleton';
import TransactionModal, { useTxModal } from '../components/common/TransactionModal';
import { getPoolDetail, joinPool, contributeToPool, getPoolProposals, createProposal, voteOnProposal, executeProposal, closePool, withdrawFromPool } from '../services/poolService';
import type { Pool, PoolProposal, PoolMember } from '../types';

export default function PoolDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentUser } = useDemoMode();
  const tx = useTxModal();

  const [pool, setPool] = useState<Pool | null>(null);
  const [members, setMembers] = useState<PoolMember[]>([]);
  const [proposals, setProposals] = useState<PoolProposal[]>([]);
  const [loading, setLoading] = useState(true);

  const [joinAmount, setJoinAmount] = useState('');
  const [contributeAmount, setContributeAmount] = useState('');
  const [proposalCampaignId, setProposalCampaignId] = useState('');
  const [proposalAmount, setProposalAmount] = useState('');
  const [pendingAction, setPendingAction] = useState<string | null>(null);

  const load = async () => {
    if (!id) return;
    setLoading(true);
    const [poolRes, proposalsRes] = await Promise.all([
      getPoolDetail(id),
      getPoolProposals(id),
    ]);
    if (poolRes.success && poolRes.data) {
      setPool(poolRes.data.pool);
      setMembers(poolRes.data.members as PoolMember[]);
    }
    if (proposalsRes.success && proposalsRes.data) setProposals(proposalsRes.data);
    setLoading(false);
  };

  useEffect(() => { load(); }, [id]);

  const isCreator = currentUser?.address === pool?.creator;
  const isMember = members.some(m => m.address === currentUser?.address);
  const raised = Number(pool?.currentAmount || 0);
  const target = Number(pool?.targetAmount || 0);
  const pct = target > 0 ? Math.round((raised / target) * 100) : 0;

  const handleJoin = async () => {
    if (!id || !currentUser || !joinAmount) return;
    setPendingAction('join');
    tx.open('Joining Pool', `Committing ₦${parseFloat(joinAmount).toLocaleString()}`);
    setTimeout(async () => {
      const res = await joinPool(id, currentUser.address, joinAmount);
      if (res.success) {
        tx.succeed(res.transactionId || `join_${id}_${Date.now()}`);
        setTimeout(() => { tx.close(); load(); }, 1000);
      } else {
        tx.fail(res.error || 'Failed to join');
        setTimeout(() => tx.close(), 1000);
      }
    }, 600);
  };

  const handleContribute = async () => {
    if (!id || !currentUser || !contributeAmount) return;
    setPendingAction('contribute');
    tx.open('Contributing', `Depositing ₦${parseFloat(contributeAmount).toLocaleString()}`);
    setTimeout(async () => {
      const res = await contributeToPool(id, currentUser.address, contributeAmount);
      if (res.success) {
        tx.succeed(res.transactionId || `contrib_${id}_${Date.now()}`);
        setTimeout(() => { tx.close(); load(); }, 1000);
      } else {
        tx.fail(res.error || 'Failed to contribute');
        setTimeout(() => tx.close(), 1000);
      }
    }, 600);
  };

  const handlePropose = async () => {
    if (!id || !currentUser || !proposalCampaignId || !proposalAmount) return;
    setPendingAction('propose');
    tx.open('Creating Proposal', `Proposing ₦${parseFloat(proposalAmount).toLocaleString()} to campaign #${proposalCampaignId}`);
    setTimeout(async () => {
      const res = await createProposal(id, currentUser.address, proposalCampaignId, proposalAmount);
      if (res.success) {
        tx.succeed(res.transactionId || `proposal_${id}_${Date.now()}`);
        setTimeout(() => { tx.close(); load(); }, 1000);
      } else {
        tx.fail(res.error || 'Failed to create proposal');
        setTimeout(() => tx.close(), 1000);
      }
    }, 600);
  };

  const handleVote = async (proposalId: string, approve: boolean) => {
    if (!currentUser) return;
    setPendingAction('vote');
    tx.open(approve ? 'Approving' : 'Rejecting', 'Casting your vote');
    setTimeout(async () => {
      const res = await voteOnProposal(proposalId, currentUser.address, approve);
      if (res.success) {
        tx.succeed(res.transactionId || `vote_${proposalId}_${Date.now()}`);
        setTimeout(() => { tx.close(); load(); }, 1000);
      } else {
        tx.fail(res.error || 'Failed to vote');
        setTimeout(() => tx.close(), 1000);
      }
    }, 600);
  };

  const handleExecute = async (proposalId: string) => {
    setPendingAction('execute');
    tx.open('Executing', 'Funding campaign from pool');
    setTimeout(async () => {
      const res = await executeProposal(proposalId);
      if (res.success) {
        tx.succeed(res.transactionId || `exec_${proposalId}_${Date.now()}`);
        setTimeout(() => { tx.close(); load(); }, 1000);
      } else {
        tx.fail(res.error || 'Failed to execute');
        setTimeout(() => tx.close(), 1000);
      }
    }, 600);
  };

  const handleClose = async () => {
    if (!id) return;
    setPendingAction('close');
    tx.open('Closing Pool', 'Ending pool contributions');
    setTimeout(async () => {
      const res = await closePool(id);
      if (res.success) {
        tx.succeed(res.transactionId || `close_${id}_${Date.now()}`);
        setTimeout(() => { tx.close(); load(); }, 1000);
      } else {
        tx.fail(res.error || 'Failed to close');
        setTimeout(() => tx.close(), 1000);
      }
    }, 600);
  };

  const handleRetry = () => {
    const action = pendingAction;
    setPendingAction(null);
    if (!action) return;
    const handlers: Record<string, () => void> = {
      join: handleJoin,
      contribute: handleContribute,
      propose: handlePropose,
      vote: () => {},
      execute: () => {},
      close: handleClose,
    };
    handlers[action]?.();
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <LoadingSkeleton variant="card" count={3} />
      </div>
    );
  }

  if (!pool) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 text-center">
        <p className="text-gray-400 mb-4">Pool not found.</p>
        <Button variant="outline" onClick={() => navigate('/pools')}>Browse Pools</Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <button onClick={() => navigate('/pools')} className="text-sm text-gray-500 hover:text-gray-300 mb-4 block">← All Pools</button>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-medium text-gray-500 uppercase">{pool.category}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full ${
                pool.status === 'open' ? 'bg-blue-500/20 text-blue-400' :
                pool.status === 'funded' ? 'bg-[#4ade80]/20 text-[#4ade80]' :
                'bg-gray-500/20 text-gray-400'
              }`}>{pool.status}</span>
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">{pool.name}</h1>
            <p className="text-sm text-gray-400 mb-4">{pool.description}</p>
            <p className="text-xs text-gray-600">
              Created by <span className="text-gray-400">{pool.creator.slice(0, 10)}...</span>
            </p>
          </div>

          <div>
            <div className="flex justify-between text-sm mb-1.5">
              <span className="text-[#4ade80] font-medium">₦{raised.toLocaleString()}</span>
              <span className="text-gray-500">of ₦{target.toLocaleString()}</span>
            </div>
            <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
              <div className="h-full bg-[#4ade80] rounded-full transition-all" style={{ width: `${Math.min(pct, 100)}%` }} />
            </div>
          </div>

          {proposals.length > 0 && (
            <div>
              <h3 className="text-base font-semibold text-white mb-3">Proposals</h3>
              <div className="space-y-3">
                {proposals.map((prop) => (
                  <Card key={prop.id} variant="light" padding="small">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="text-sm font-semibold text-white">Campaign #{prop.campaignId}</h4>
                          <span className={`text-xs px-1.5 py-0.5 rounded ${
                            prop.status === 'active' ? 'bg-blue-500/20 text-blue-400' :
                            prop.status === 'passed' ? 'bg-[#4ade80]/20 text-[#4ade80]' :
                            prop.status === 'executed' ? 'bg-gray-500/20 text-gray-400' :
                            'bg-red-500/20 text-red-400'
                          }`}>{prop.status}</span>
                        </div>
                        <p className="text-xs text-gray-500">Amount: ₦{Number(prop.amount).toLocaleString()}</p>
                        {prop.description && <p className="text-xs text-gray-600 mt-1">{prop.description}</p>}
                      </div>
                      <div className="flex-shrink-0 flex gap-1">
                        {prop.status === 'passed' && (
                          <Button variant="primary" size="small" onClick={() => handleExecute(prop.id)}>Execute</Button>
                        )}
                        {prop.status === 'active' && isMember && (
                          <>
                            <button onClick={() => handleVote(prop.id, true)} className="px-2 py-1 text-xs bg-[#4ade80]/20 text-[#4ade80] rounded hover:bg-[#4ade80]/30 transition-colors">✓</button>
                            <button onClick={() => handleVote(prop.id, false)} className="px-2 py-1 text-xs bg-red-500/20 text-red-400 rounded hover:bg-red-500/30 transition-colors">✕</button>
                          </>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          <div>
            <h3 className="text-base font-semibold text-white mb-3">Members ({members.length})</h3>
            <div className="space-y-2">
              {members.map((m) => (
                <div key={m.address} className="flex items-center justify-between text-sm bg-gray-900/50 rounded-lg px-3 py-2">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-400">{m.address.slice(0, 10)}...</span>
                    {m.role === 'creator' && <span className="text-[10px] px-1.5 py-0.5 bg-[#4ade80]/10 text-[#4ade80] rounded">Creator</span>}
                  </div>
                  <span className="text-white">₦{Number(m.committed).toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {pool.status === 'open' && !isMember && currentUser && (
            <Card variant="light" padding="default">
              <h3 className="text-sm font-semibold text-white mb-2">Join Pool</h3>
              <div className="space-y-2">
                <Input type="number" placeholder="Commit amount (₦)" value={joinAmount} onChange={(e) => setJoinAmount(e.target.value)} />
                <Button variant="primary" className="w-full" onClick={handleJoin}>Join Pool</Button>
              </div>
            </Card>
          )}

          {pool.status === 'open' && isMember && (
            <Card variant="light" padding="default">
              <h3 className="text-sm font-semibold text-white mb-2">Contribute</h3>
              <div className="space-y-2">
                <Input type="number" placeholder="Amount (₦)" value={contributeAmount} onChange={(e) => setContributeAmount(e.target.value)} />
                <Button variant="primary" className="w-full" onClick={handleContribute}>Contribute</Button>
              </div>
            </Card>
          )}

          {isMember && pool.status !== 'closed' && (
            <Card variant="light" padding="default">
              <h3 className="text-sm font-semibold text-white mb-2">Propose Allocation</h3>
              <div className="space-y-2">
                <Input type="number" placeholder="Campaign ID" value={proposalCampaignId} onChange={(e) => setProposalCampaignId(e.target.value)} />
                <Input type="number" placeholder="Amount (₦)" value={proposalAmount} onChange={(e) => setProposalAmount(e.target.value)} />
                <Button variant="primary" className="w-full" onClick={handlePropose}>Propose</Button>
              </div>
            </Card>
          )}

          <Card variant="light" padding="default">
            <h3 className="text-sm font-semibold text-white mb-2">Pool Info</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Members</span>
                <span className="text-white">{members.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Min Commitment</span>
                <span className="text-white">₦{Number(pool.minCommitment || '0').toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Max Members</span>
                <span className="text-white">{pool.maxMembers}</span>
              </div>
            </div>
          </Card>

          {isCreator && pool.status === 'open' && (
            <Button variant="outline" className="w-full" onClick={handleClose}>Close Pool</Button>
          )}
        </div>
      </div>

      <TransactionModal
        isOpen={tx.isOpen}
        state={tx.state}
        title={tx.title}
        description={tx.description}
        txId={tx.txId}
        error={tx.error}
        onClose={() => tx.close()}
        onRetry={handleRetry}
      />
    </div>
  );
}
