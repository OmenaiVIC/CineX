import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import LoadingSkeleton from '../components/common/LoadingSkeleton';
import { useDemoMode } from '../contexts/DemoModeContext';
import { getPools } from '../services/poolService';
import type { Pool } from '../types';

const STATUSES = [
  { value: '', label: 'All Statuses' },
  { value: 'open', label: 'Open' },
  { value: 'active', label: 'Active' },
  { value: 'funded', label: 'Funded' },
  { value: 'closed', label: 'Closed' },
];

export default function PoolExplorePage() {
  const navigate = useNavigate();
  const { currentUser } = useDemoMode();
  const [pools, setPools] = useState<Pool[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    getPools().then(res => {
      if (res.success && res.data) setPools(res.data);
      setLoading(false);
    });
  }, []);

  const filtered = useMemo(() => {
    return pools.filter((p: Pool) => {
      if (search && !p.name.toLowerCase().includes(search.toLowerCase()) && !p.description.toLowerCase().includes(search.toLowerCase())) return false;
      if (statusFilter && p.status !== statusFilter) return false;
      return true;
    });
  }, [pools, search, statusFilter]);

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Funding Pools</h1>
        {currentUser && (
          <Button variant="neon" onClick={() => navigate('/pools/create')}>Create Pool</Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
        <Input placeholder="Search pools..." value={search} onChange={(e) => setSearch(e.target.value)} />
        <Select options={STATUSES} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} placeholder="All Statuses" />
      </div>

      {loading ? (
        <LoadingSkeleton variant="card" count={6} />
      ) : filtered.length === 0 ? (
        <Card variant="light" padding="default">
          <p className="text-gray-500 text-center">No pools match your filters.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((p: Pool) => {
            const raised = Number(p.currentAmount);
            const target = Number(p.targetAmount);
            const pct = target > 0 ? Math.round((raised / target) * 100) : 0;
            return (
              <Card
                key={p.id}
                variant="light"
                padding="default"
                className="cursor-pointer hover:border-gray-700 transition-all hover:translate-y-[-2px]"
                onClick={() => navigate(`/pools/${p.id}`)}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-medium text-gray-500 uppercase">{p.category}</span>
                  <span className={`text-xs px-1.5 py-0.5 rounded ${
                    p.status === 'open' ? 'bg-blue-500/20 text-blue-400' :
                    p.status === 'funded' ? 'bg-[#4ade80]/20 text-[#4ade80]' :
                    p.status === 'closed' ? 'bg-gray-500/20 text-gray-400' : 'bg-yellow-500/20 text-yellow-400'
                  }`}>{p.status}</span>
                </div>
                <h3 className="text-base font-semibold text-white mb-1 truncate">{p.name}</h3>
                <p className="text-xs text-gray-500 mb-3 line-clamp-2">{p.description}</p>
                <div className="mb-2">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-[#4ade80]">₦{raised.toLocaleString()}</span>
                    <span className="text-gray-500">₦{target.toLocaleString()}</span>
                  </div>
                  <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                    <div className="h-full bg-[#4ade80] rounded-full" style={{ width: `${Math.min(pct, 100)}%` }} />
                  </div>
                </div>
                <div className="flex justify-between text-xs text-gray-600">
                  <span>{p.currentMembers || 0} member{(p.currentMembers || 0) !== 1 ? 's' : ''}</span>
                  <span>{pct}% funded</span>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
