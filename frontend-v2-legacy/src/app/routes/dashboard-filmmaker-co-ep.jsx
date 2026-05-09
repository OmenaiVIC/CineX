import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '@components/dashboard/DashboardLayout';
import { useAuth } from '@contexts/StacksAuthContext';

// Simple Adashe-like Co-EP demo UI (mocked, in-memory)
export default function CoEPDashboard() {
  const { isAuthenticated, isLoading, userData, signIn } = useAuth();
  const navigate = useNavigate();

  const [pools, setPools] = useState([{
    id: 'coep-1',
    title: 'Adashe: Neighbors Fund',
    contributionAmount: 100, // fixed STX per member
    frequency: 'monthly',
    members: ['ST1__creator'],
    contributions: {}, // member -> total contributed
    pot: 0,
    cycleIndex: 0,
    rotationOrder: ['ST1__creator'],
    maxMembers: 5,
    status: 'open'
  }]);

  const [form, setForm] = useState({ title: '', amount: 100, frequency: 'monthly', maxMembers: 5 });
  const [selectedPool, setSelectedPool] = useState(null);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  const ensureAuth = async () => {
    if (!isAuthenticated) {
      try { await signIn(); }
      catch (e) { setError('Wallet connection failed'); return false; }
    }
    return true;
  };

  const handleCreate = async (e) => {
    e?.preventDefault();
    if (!form.title) return setError('Please provide a title');
    const id = `coep-${Date.now()}`;
    const creator = userData?.profile?.stxAddress?.mainnet || userData?.stxAddress?.mainnet || 'ST1_creator';
    const pool = {
      id,
      title: form.title,
      contributionAmount: Number(form.amount),
      frequency: form.frequency,
      members: [creator],
      contributions: { [creator]: 0 },
      pot: 0,
      cycleIndex: 0,
      rotationOrder: [creator],
      maxMembers: Number(form.maxMembers),
      status: 'open'
    };
    setPools(prev => [pool, ...prev]);
    setForm({ title: '', amount: 100, frequency: 'monthly', maxMembers: 5 });
    setSuccessMsg('Co-EP pool created');
  };

  const handleJoin = async (poolId) => {
    setError(null);
    if (!await ensureAuth()) return;
    setPools(prev => prev.map(p => {
      if (p.id !== poolId) return p;
      const addr = userData?.profile?.stxAddress?.mainnet || userData?.stxAddress?.mainnet || `ST1_user_${Date.now()}`;
      if (p.members.includes(addr)) return p;
      if (p.members.length >= p.maxMembers) { setError('Pool is full'); return p; }
      return { ...p, members: [...p.members, addr], rotationOrder: [...p.rotationOrder, addr], contributions: { ...p.contributions, [addr]: 0 } };
    }));
    setSuccessMsg('Joined pool successfully');
  };

  const handleContribute = async (poolId) => {
    setError(null);
    if (!await ensureAuth()) return;
    setPools(prev => prev.map(p => {
      if (p.id !== poolId) return p;
      const addr = userData?.profile?.stxAddress?.mainnet || userData?.stxAddress?.mainnet || `ST1_user_${Date.now()}`;
      // enforce fixed contribution
      const amount = Number(p.contributionAmount);
      const newContribs = { ...p.contributions, [addr]: (p.contributions[addr] || 0) + amount };
      const newPot = p.pot + amount;
      // advance cycle if everyone has contributed for this round (mock)
      const everyoneContributed = p.rotationOrder.every(m => (newContribs[m] || 0) >= amount * (p.cycleIndex + 1));
      let cycleIndex = p.cycleIndex;
      let status = p.status;
      let rotationOrder = [...p.rotationOrder];
      if (everyoneContributed) {
        // pay out to next member in rotation
        const recipient = rotationOrder[cycleIndex % rotationOrder.length];
        // reset pot to 0
        // In real system: transfer pot to recipient. Here we just note it.
        // advance cycle
        cycleIndex = cycleIndex + 1;
      }
      return { ...p, contributions: newContribs, pot: newPot, cycleIndex, rotationOrder, status };
    }));
    setSuccessMsg('Contribution recorded (mock)');
  };

  return (
    <DashboardLayout>
      <section className="container mx-auto px-4 py-12">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold">Co-EP Rotating Funds (Adashe)</h2>
          <div>
            <button onClick={() => navigate('/dashboard/filmmaker/create-campaign')} className="px-4 py-2 bg-yellow-400 rounded">New Campaign</button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="col-span-2">
            {error && <div className="p-3 bg-red-600 text-white rounded mb-4">{error}</div>}
            {successMsg && <div className="p-3 bg-green-600 text-white rounded mb-4">{successMsg}</div>}

            <div className="space-y-6">
              {pools.map(pool => (
                <div key={pool.id} className="p-6 bg-black border border-gray-800 rounded-2xl text-white">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-lg font-semibold">{pool.title}</h3>
                      <p className="text-sm text-gray-400">Fixed contribution: <strong className="text-yellow-400">{pool.contributionAmount} STX</strong> • {pool.frequency} • Members: {pool.members.length}/{pool.maxMembers}</p>
                      <p className="text-sm text-gray-400 mt-2">Pot: {pool.pot.toLocaleString()} STX • Cycle: {pool.cycleIndex}</p>
                    </div>
                    <div className="text-yellow-400 text-3xl">🔁</div>
                  </div>

                  <div className="mt-4 flex gap-3">
                    <button onClick={() => handleJoin(pool.id)} className="px-4 py-2 bg-yellow-400 text-black rounded">Join / Register</button>
                    <button onClick={() => handleContribute(pool.id)} className="px-4 py-2 border border-gray-700 text-gray-300 rounded">Contribute {pool.contributionAmount} STX</button>
                  </div>

                  <div className="mt-4">
                    <p className="text-sm text-gray-400 mb-2">Rotation Order</p>
                    <div className="flex flex-wrap gap-2">
                      {pool.rotationOrder.map((m) => (
                        <span key={m} className="px-3 py-1 bg-gray-900/30 rounded text-sm">{m}</span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <aside>
            <div className="p-6 bg-black border border-gray-800 rounded-2xl text-white">
              <h4 className="font-semibold mb-3">Create a Co-EP Pool</h4>
              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <label className="text-sm text-gray-300">Title</label>
                  <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="w-full mt-2 px-3 py-2 bg-gray-900/30 rounded" />
                </div>
                <div>
                  <label className="text-sm text-gray-300">Fixed Contribution (STX)</label>
                  <input type="number" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} className="w-full mt-2 px-3 py-2 bg-gray-900/30 rounded" />
                </div>
                <div>
                  <label className="text-sm text-gray-300">Frequency</label>
                  <select value={form.frequency} onChange={e => setForm({ ...form, frequency: e.target.value })} className="w-full mt-2 px-3 py-2 bg-gray-900/30 rounded">
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm text-gray-300">Max Members</label>
                  <input type="number" value={form.maxMembers} onChange={e => setForm({ ...form, maxMembers: e.target.value })} className="w-full mt-2 px-3 py-2 bg-gray-900/30 rounded" />
                </div>
                <div>
                  <button className="w-full mt-2 px-4 py-2 bg-yellow-400 rounded">Create Pool</button>
                </div>
              </form>
            </div>
          </aside>
        </div>
      </section>
    </DashboardLayout>
  );
}
