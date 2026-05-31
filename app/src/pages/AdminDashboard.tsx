import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useDemoMode } from '../contexts/DemoModeContext';
import { demoState } from '../services/demoState';
import * as api from '../services/api';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';

type AdminAction = {
  label: string;
  endpoint: string;
  body?: Record<string, unknown>;
  contractGroup: string;
};

const ADMIN_ACTIONS: AdminAction[] = [
  { label: 'Set Pool Addresses', endpoint: '/admin/funding-pool/set-addresses', body: { verification: '', reputation: '', escrow: '' }, contractGroup: 'Funding Pool' },
  { label: 'Toggle Pool Pause', endpoint: '/admin/funding-pool/set-pause', body: { paused: true }, contractGroup: 'Funding Pool' },
  { label: 'Emergency Withdraw (Pool)', endpoint: '/admin/funding-pool/emergency-withdraw', body: { amount: 0, recipient: '' }, contractGroup: 'Funding Pool' },
  { label: 'Emergency Close Pool', endpoint: '/admin/funding-pool/emergency-close-pool', body: { poolId: 0 }, contractGroup: 'Funding Pool' },
  { label: 'Emergency Refund Member', endpoint: '/admin/funding-pool/emergency-refund-member', body: { poolId: 0, memberAddress: '' }, contractGroup: 'Funding Pool' },
  { label: 'Set Campaign Verification', endpoint: '/admin/campaign/set-verification', body: { verification: '' }, contractGroup: 'Campaign' },
  { label: 'Set Campaign Escrow', endpoint: '/admin/campaign/set-escrow', body: { escrow: '' }, contractGroup: 'Campaign' },
  { label: 'Toggle Campaign Pause', endpoint: '/admin/campaign/set-pause', body: { paused: true }, contractGroup: 'Campaign' },
  { label: 'Campaign Emergency Withdraw', endpoint: '/admin/campaign/emergency-withdraw', body: { campaignId: 0, amount: 0, recipient: '' }, contractGroup: 'Campaign' },
  { label: 'Set Escrow Fees', endpoint: '/admin/escrow/set-fees', body: { feeBps: 0, collector: '' }, contractGroup: 'Escrow' },
  { label: 'Set Escrow Verification', endpoint: '/admin/escrow/set-verification', body: { verification: '' }, contractGroup: 'Escrow' },
  { label: 'Toggle Escrow Pause', endpoint: '/admin/escrow/set-pause', body: { paused: true }, contractGroup: 'Escrow' },
  { label: 'Escrow Emergency Withdraw', endpoint: '/admin/escrow/emergency-withdraw', body: { amount: 0, recipient: '' }, contractGroup: 'Escrow' },
  { label: 'Set Verification Escrow', endpoint: '/admin/verification/set-escrow', body: { escrow: '' }, contractGroup: 'Verification' },
  { label: 'Toggle Verification Pause', endpoint: '/admin/verification/set-pause', body: { paused: true }, contractGroup: 'Verification' },
  { label: 'Verification Emergency Withdraw', endpoint: '/admin/verification/emergency-withdraw', body: { amount: 0, recipient: '' }, contractGroup: 'Verification' },
  { label: 'Distribute Yield', endpoint: '/admin/yield/distribute', body: { campaignId: 0 }, contractGroup: 'Yield' },
  { label: 'Set Yield Strategy', endpoint: '/admin/yield/set-strategy', body: { strategyContract: '' }, contractGroup: 'Yield' },
  { label: 'Set Yield Escrow', endpoint: '/admin/yield/set-milestone-escrow', body: { escrow: '' }, contractGroup: 'Yield' },
  { label: 'Set Yield Verification', endpoint: '/admin/yield/set-milestone-verification', body: { verification: '' }, contractGroup: 'Yield' },
  { label: 'Toggle Yield Pause', endpoint: '/admin/yield/set-pause', body: { paused: true }, contractGroup: 'Yield' },
  { label: 'Yield Emergency Withdraw', endpoint: '/admin/yield/emergency-withdraw', body: { amount: 0, recipient: '' }, contractGroup: 'Yield' },
  { label: 'V1 Emergency Revoke', endpoint: '/admin/v1/emergency-revoke', body: { creatorAddress: '' }, contractGroup: 'Verification V1' },
  { label: 'V1 Set Admin', endpoint: '/admin/v1/set-admin', body: { newAdmin: '' }, contractGroup: 'Verification V1' },
  { label: 'Toggle V1 Pause', endpoint: '/admin/v1/set-pause', body: { paused: true }, contractGroup: 'Verification V1' },
  { label: 'V1 Emergency Withdraw', endpoint: '/admin/v1/emergency-withdraw', body: { amount: 0, recipient: '' }, contractGroup: 'Verification V1' },
  { label: 'V2 Emergency Verify', endpoint: '/admin/v2/emergency-verify', body: { creatorAddress: '', expirationBlock: 0 }, contractGroup: 'Verification V2' },
  { label: 'V2 Emergency Revoke', endpoint: '/admin/v2/emergency-revoke', body: { creatorAddress: '' }, contractGroup: 'Verification V2' },
  { label: 'Toggle V2 Pause', endpoint: '/admin/v2/set-pause', body: { paused: true }, contractGroup: 'Verification V2' },
  { label: 'V2 Emergency Withdraw', endpoint: '/admin/v2/emergency-withdraw', body: { amount: 0, recipient: '' }, contractGroup: 'Verification V2' },
  { label: 'Set Oracle', endpoint: '/admin/oracle/set-oracle', body: { oracleAddress: '' }, contractGroup: 'Oracle' },
  { label: 'Update Price', endpoint: '/admin/oracle/update-price', body: { price: 0 }, contractGroup: 'Oracle' },
  { label: 'Emergency Set Price', endpoint: '/admin/oracle/emergency-set-price', body: { price: 0 }, contractGroup: 'Oracle' },
  { label: 'Set Verification Gate', endpoint: '/admin/reputation/set-verification-gate', body: { verificationContract: '' }, contractGroup: 'Reputation' },
];

const GROUPS = [...new Set(ADMIN_ACTIONS.map(a => a.contractGroup))];

async function demoAdminCall(action: AdminAction, params: Record<string, unknown>): Promise<{ success: boolean; data?: unknown }> {
  await new Promise(r => setTimeout(r, 300));
  const label = action.label;
  const filtered = Object.fromEntries(Object.entries(params).filter(([, v]) => v !== '' && v !== 0));

  const dummyTx = { tx_id: '0x' + Math.random().toString(36).slice(2, 14).padStart(64, '0'), status: 'success' as const, block_height: 99999 };

  if (label.includes('Toggle') || label.includes('set-pause')) {
    const paused = filtered.paused === true || filtered.paused === 'true';
    demoState.setContractState(action.contractGroup.toLowerCase(), { paused });
    return { success: true, data: { ...dummyTx, state: paused ? 'paused' : 'active' } };
  }

  if (label.includes('Emergency Withdraw')) {
    return { success: true, data: { ...dummyTx, amount: filtered.amount, recipient: filtered.recipient } };
  }

  if (label.includes('Emergency Close Pool')) {
    const pool = demoState.getData().pools.find(p => p.id === String(filtered.poolId));
    if (pool) {
      const data = demoState.getData();
      data.pools = data.pools.map(p => p.id === String(filtered.poolId) ? { ...p, status: 'closed' as const } : p);
      demoState.persist(data);
      demoState.emit('pool:closed', filtered.poolId);
    }
    return { success: true, data: { ...dummyTx, poolId: filtered.poolId, status: 'closed' } };
  }

  if (label.includes('Emergency Refund') || label.includes('Emergency Refund Member')) {
    return { success: true, data: { ...dummyTx, poolId: filtered.poolId, member: filtered.memberAddress, refunded: true } };
  }

  if (label.includes('Emergency Verify')) {
    const t = demoState.getData();
    const existingVerifier = t.profiles.find((p: { address: string }) => p.address === String(filtered.creatorAddress));
    if (existingVerifier) {
      const updatedProfiles = t.profiles.map((p: { address: string; verificationStatus?: string }) =>
        p.address === String(filtered.creatorAddress) ? { ...p, verificationStatus: 'verified' as const } : p
      );
      t.profiles = updatedProfiles;
      demoState.persist(t);
      demoState.emit('profile:updated', filtered.creatorAddress);
    }
    return { success: true, data: { ...dummyTx, creator: filtered.creatorAddress, status: 'verified' } };
  }

  if (label.includes('Emergency Revoke')) {
    const t = demoState.getData();
    t.profiles = t.profiles.map((p: { address: string; verificationStatus?: string }) =>
      p.address === String(filtered.creatorAddress) ? { ...p, verificationStatus: 'unverified' as const } : p
    );
    demoState.persist(t);
    demoState.emit('profile:updated', filtered.creatorAddress);
    return { success: true, data: { ...dummyTx, creator: filtered.creatorAddress, status: 'revoked' } };
  }

  if (label.includes('Distribute Yield')) {
    return { success: true, data: { ...dummyTx, campaignId: filtered.campaignId, distributed: true } };
  }

  if (label.includes('Set Admin')) {
    const address = String(filtered.newAdmin);
    demoState.grantAdmin(address);
    return { success: true, data: { ...dummyTx, admin: address } };
  }

  if (label.includes('Update Price') || label.includes('Emergency Set Price')) {
    demoState.setOraclePrice(Number(filtered.price));
    return { success: true, data: { ...dummyTx, price: filtered.price } };
  }

  if (label.includes('Set Pool Addresses')) {
    return { success: true, data: { ...dummyTx, addresses: filtered } };
  }

  return { success: true, data: { ...dummyTx, message: `Simulated: ${label}`, params: filtered } };
}

function FormField({ label, value, onChange, type }: { label: string; value: unknown; onChange: (v: unknown) => void; type?: string }) {
  const id = `field-${label.replace(/\s+/g, '-')}`;
  return (
    <label htmlFor={id} className="block text-xs text-gray-400 mt-2">
      {label}
      <input
        id={id}
        type={type || (typeof value === 'number' ? 'number' : 'text')}
        value={String(value)}
        onChange={e => onChange(type === 'number' || typeof value === 'number' ? Number(e.target.value) : e.target.value)}
        className="w-full mt-1 px-2 py-1 rounded bg-gray-800 border border-gray-700 text-white text-xs"
      />
    </label>
  );
}

function ActionCard({ action }: { action: AdminAction }) {
  const { isDemoMode } = useDemoMode();
  const [params, setParams] = useState<Record<string, unknown>>({ ...action.body });
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const run = async () => {
    setLoading(true);
    setResult(null);
    try {
      if (isDemoMode) {
        const res = await demoAdminCall(action, params);
        setResult(res.success ? JSON.stringify(res.data, null, 2) : 'Error');
      } else {
        const filtered = Object.fromEntries(Object.entries(params).filter(([, v]) => v !== '' && v !== 0));
        const res = await api.post<unknown>(action.endpoint, filtered);
        setResult(res.success ? JSON.stringify(res.data, null, 2) : res.error || 'Error');
      }
    } catch (err: unknown) {
      setResult(err instanceof Error ? err.message : String(err));
    }
    setLoading(false);
  };

  return (
    <Card className="p-3">
      <h4 className="text-sm font-semibold text-white mb-1">{action.label}</h4>
      <p className="text-xs text-gray-500 mb-2">{action.endpoint}</p>
      {isDemoMode && <span className="inline-block px-1.5 py-0.5 rounded bg-[#4ade80]/20 text-[10px] text-[#4ade80] mb-2">DEMO</span>}
      {Object.keys(action.body || {}).map(key => (
        <FormField
          key={key}
          label={key}
          value={params[key]}
          onChange={v => setParams(prev => ({ ...prev, [key]: v }))}
          type={typeof action.body![key] === 'number' ? 'number' : 'text'}
        />
      ))}
      <Button onClick={run} disabled={loading} className="mt-3 text-xs">
        {loading ? 'Executing...' : 'Execute'}
      </Button>
      {result && (
        <pre className="mt-2 p-2 bg-gray-900 rounded text-xs text-green-400 overflow-x-auto max-h-24 overflow-y-auto">
          {result}
        </pre>
      )}
    </Card>
  );
}

export default function AdminDashboard() {
  const { user } = useAuth();
  const { isDemoMode, currentUser, grantAdmin } = useDemoMode();
  const [activeTab, setActiveTab] = useState(GROUPS[0]);
  const [sysInfo, setSysInfo] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    api.get<Record<string, unknown>>('/admin/system-status').then((r: { success: boolean; data?: Record<string, unknown> }) => {
      if (r.success && r.data) setSysInfo(r.data);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (isDemoMode && currentUser) {
      grantAdmin(currentUser.address);
    }
  }, [isDemoMode, currentUser, grantAdmin]);

  if ((!user || user.role !== 'admin') && !isDemoMode) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <h1 className="text-2xl font-bold text-white mb-2">Access Denied</h1>
        <p className="text-gray-400 text-sm">Admin privileges required.</p>
      </div>
    );
  }

  const filtered = ADMIN_ACTIONS.filter(a => a.contractGroup === activeTab);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Admin Dashboard</h1>
          <p className="text-xs text-gray-500 mt-1">
            {sysInfo ? `${sysInfo.network as string} · ${sysInfo.deployer as string}` : isDemoMode ? 'Demo Mode · Simulated' : 'loading...'}
          </p>
        </div>
        {isDemoMode && (
          <span className="px-2 py-1 rounded bg-[#4ade80]/20 text-xs text-[#4ade80] font-medium">DEMO MODE — Actions are simulated</span>
        )}
      </div>

      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {GROUPS.map(g => (
          <button
            key={g}
            onClick={() => setActiveTab(g)}
            className={`px-3 py-1.5 text-xs rounded-lg whitespace-nowrap transition-colors ${
              activeTab === g ? 'bg-[#4ade80] text-black font-semibold' : 'bg-gray-800 text-gray-400 hover:text-white'
            }`}
          >
            {g}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(a => <ActionCard key={a.endpoint} action={a} />)}
      </div>
    </div>
  );
}
