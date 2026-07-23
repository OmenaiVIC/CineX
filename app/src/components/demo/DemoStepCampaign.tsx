import { useState } from 'react';
import { openContractCall } from '@stacks/connect';
import { uintCV, contractPrincipalCV, stringAsciiCV, listCV, tupleCV } from '@stacks/transactions';
import { useStacksConnect } from '../../hooks/useStacksConnect';
import TransactionModal, { useTxModal } from '../common/TransactionModal';

const DEPLOYER = 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM';
const STX_PRINCIPAL = 'SP000000000000000000002Q6VF78';

const BLOCKS_PER_DAY = 144;

interface Milestone {
  name: string;
  amount: string;
}

function initMilestones(): Milestone[] {
  return [
    { name: 'Planning', amount: '20' },
    { name: 'Development', amount: '50' },
    { name: 'Delivery', amount: '30' },
  ];
}

export default function DemoStepCampaign() {
  const { connectWallet, connected, walletAddress } = useStacksConnect();
  const tx = useTxModal();

  const [projectId, setProjectId] = useState('1');
  const [goal, setGoal] = useState('100');
  const [milestones, setMilestones] = useState<Milestone[]>(initMilestones);
  const [deadlineDays, setDeadlineDays] = useState('30');
  const [txId, setTxId] = useState('');
  const [done, setDone] = useState(false);

  const totalAllocated = milestones.reduce((s, m) => s + (parseFloat(m.amount) || 0), 0);
  const goalNum = parseFloat(goal) || 0;
  const remaining = goalNum - totalAllocated;
  const allocationValid = Math.abs(remaining) < 0.01 && goalNum > 0;

  const addMilestone = () => {
    setMilestones([...milestones, { name: '', amount: '0' }]);
  };

  const removeMilestone = (i: number) => {
    if (milestones.length <= 1) return;
    setMilestones(milestones.filter((_, idx) => idx !== i));
  };

  const updateMilestone = (i: number, field: keyof Milestone, value: string) => {
    const copy = [...milestones];
    copy[i] = { ...copy[i], [field]: value };
    setMilestones(copy);
  };

  const handleCreate = async () => {
    const addr = connected && walletAddress ? walletAddress : await connectWallet();
    if (!addr) { tx.fail('Connect your Stacks wallet first'); return; }
    if (!addr.startsWith('S')) { tx.fail('Invalid wallet address. Make sure your wallet is on testnet.'); return; }

    if (!allocationValid) { tx.fail('Milestone amounts must equal the goal'); return; }

    const goalUstx = Math.round(goalNum * 1000000);
    const deadline = Math.floor(Date.now() / 1000 / 600) + parseInt(deadlineDays || '30') * BLOCKS_PER_DAY;

    tx.open('Creating Campaign', 'Step 1: Sign the escrow campaign in your wallet...');
    try {
      await openContractCall({
        contractAddress: DEPLOYER,
        contractName: 'milestone-escrow',
        functionName: 'create-campaign',
        functionArgs: [
          uintCV(parseInt(projectId) || 1),
          contractPrincipalCV(STX_PRINCIPAL),
          uintCV(goalUstx),
          listCV(milestones.map(m => tupleCV({
            name: stringAsciiCV(m.name.slice(0, 64)),
            amount: uintCV(Math.round((parseFloat(m.amount) || 0) * 1000000)),
          }))),
          uintCV(deadline),
        ],
        appDetails: { name: 'CineX', icon: window.location.origin + '/favicon.ico' },
        onFinish: (data) => {
          setTxId(data.txId);
          setDone(true);
          tx.succeed(data.txId, `https://explorer.hiro.so/txid/${data.txId}?chain=testnet`);
        },
        onCancel: () => { tx.fail('Transaction cancelled'); },
      });
    } catch (err) {
      tx.fail(err instanceof Error ? err.message : 'Campaign creation failed');
    }
  };

  return (
    <div>
      <TransactionModal
        isOpen={tx.isOpen}
        state={tx.state}
        title={tx.title}
        description={tx.description}
        txId={tx.txId}
        chainUrl={tx.chainUrl}
        error={tx.error}
        onClose={tx.close}
        onRetry={handleCreate}
      />

      {done ? (
        <div style={{ background: 'rgba(74,222,128,0.08)', borderRadius: 12, padding: '1.5rem', border: '1px solid rgba(74,222,128,0.25)', textAlign: 'center' }}>
          <span style={{ fontSize: '2rem' }}>✓</span>
          <p style={{ color: 'var(--green)', fontWeight: 600, marginTop: 8 }}>Campaign #{projectId} Created!</p>
          <p style={{ color: 'var(--text-dim)', fontSize: '.85rem', marginTop: 4 }}>{goal} STX · {milestones.length} milestones</p>
          {txId && (
            <a
              href={`https://explorer.hiro.so/txid/${txId}?chain=testnet`}
              target="_blank"
              rel="noopener"
              style={{ color: 'var(--green)', fontSize: '.85rem', opacity: 0.7, display: 'inline-block', marginTop: 8 }}
            >
              View transaction ↗
            </a>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ fontSize: '.85rem', color: 'var(--text-dim)', marginBottom: 4, display: 'block' }}>Campaign ID</label>
              <input
                value={projectId}
                onChange={e => setProjectId(e.target.value)}
                type="number"
                min="1"
                style={{
                  width: '100%', padding: '10px 14px', borderRadius: 8,
                  background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)',
                  color: 'var(--text)', fontSize: '.9rem', outline: 'none',
                }}
              />
            </div>
            <div>
              <label style={{ fontSize: '.85rem', color: 'var(--text-dim)', marginBottom: 4, display: 'block' }}>Goal (STX)</label>
              <input
                value={goal}
                onChange={e => setGoal(e.target.value)}
                type="number"
                min="1"
                style={{
                  width: '100%', padding: '10px 14px', borderRadius: 8,
                  background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)',
                  color: 'var(--text)', fontSize: '.9rem', outline: 'none',
                }}
              />
            </div>
          </div>

          <div>
            <label style={{ fontSize: '.85rem', color: 'var(--text-dim)', marginBottom: 4, display: 'block' }}>
              Milestones <span style={{ fontSize: '.75rem', opacity: 0.6 }}>(total must equal goal)</span>
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {milestones.map((m, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input
                    value={m.name}
                    onChange={e => updateMilestone(i, 'name', e.target.value)}
                    placeholder="Milestone name"
                    style={{
                      flex: 1, padding: '8px 12px', borderRadius: 6,
                      background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)',
                      color: 'var(--text)', fontSize: '.85rem', outline: 'none',
                    }}
                  />
                  <input
                    value={m.amount}
                    onChange={e => updateMilestone(i, 'amount', e.target.value)}
                    type="number"
                    min="0"
                    placeholder="STX"
                    style={{
                      width: 80, padding: '8px 12px', borderRadius: 6,
                      background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)',
                      color: 'var(--text)', fontSize: '.85rem', outline: 'none',
                    }}
                  />
                  {milestones.length > 1 && (
                    <button
                      onClick={() => removeMilestone(i)}
                      style={{
                        background: 'none', border: 'none', color: 'rgba(255,100,100,0.7)',
                        cursor: 'pointer', fontSize: '1.1rem', padding: '4px',
                      }}
                      title="Remove milestone"
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
            </div>
            {milestones.length < 10 && (
              <button
                onClick={addMilestone}
                style={{
                  marginTop: 6, padding: '6px 14px', borderRadius: 6,
                  background: 'rgba(74,222,128,0.08)', border: '1px dashed rgba(74,222,128,0.3)',
                  color: 'var(--green)', fontSize: '.8rem', cursor: 'pointer',
                }}
              >
                + Add Milestone
              </button>
            )}
          </div>

          <div style={{
            height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.06)',
            overflow: 'hidden', marginTop: 4,
          }}>
            <div style={{
              height: '100%', borderRadius: 3,
              background: allocationValid ? 'var(--green)' : 'rgba(255,200,0,0.5)',
              width: `${Math.min(100, (totalAllocated / Math.max(goalNum, 1)) * 100)}%`,
              transition: 'width 0.2s',
            }} />
          </div>
          <p style={{ fontSize: '.75rem', color: allocationValid ? 'var(--green)' : 'var(--text-dim)', textAlign: 'right' }}>
            {totalAllocated.toFixed(1)} / {goalNum.toFixed(1)} STX
            {!allocationValid && ` (${remaining > 0 ? 'under by ' + remaining.toFixed(1) : 'over by ' + Math.abs(remaining).toFixed(1)})`}
          </p>

          <div>
            <label style={{ fontSize: '.85rem', color: 'var(--text-dim)', marginBottom: 4, display: 'block' }}>Deadline (days from now)</label>
            <input
              value={deadlineDays}
              onChange={e => setDeadlineDays(e.target.value)}
              type="number"
              min="1"
              style={{
                width: '100%', padding: '10px 14px', borderRadius: 8,
                background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)',
                color: 'var(--text)', fontSize: '.9rem', outline: 'none',
              }}
            />
          </div>

          <button
            onClick={handleCreate}
            style={{
              marginTop: 8, width: '100%', padding: '12px 24px', borderRadius: 8,
              background: allocationValid ? 'var(--green)' : 'rgba(74,222,128,0.2)',
              color: allocationValid ? 'black' : 'rgba(74,222,128,0.4)',
              fontWeight: 600, fontSize: '.9rem', border: 'none',
              cursor: allocationValid ? 'pointer' : 'not-allowed',
            }}
            disabled={!allocationValid}
          >
            {connected ? 'Create Campaign on Chain →' : 'Connect Wallet & Create'}
          </button>
        </div>
      )}
    </div>
  );
}
