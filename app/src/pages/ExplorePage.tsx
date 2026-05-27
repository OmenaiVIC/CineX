import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import LoadingSkeleton from '../components/common/LoadingSkeleton';
import { useCampaigns } from '../hooks/useCampaigns';
import type { Campaign } from '../types';

const CATEGORIES = [
  { value: '', label: 'All Categories' },
  { value: 'short-film', label: 'Short Film' },
  { value: 'feature', label: 'Feature' },
  { value: 'documentary', label: 'Documentary' },
  { value: 'music-video', label: 'Music Video' },
  { value: 'web-series', label: 'Web Series' },
];

const STATUSES = [
  { value: '', label: 'All Statuses' },
  { value: 'active', label: 'Active' },
  { value: 'funded', label: 'Funded' },
  { value: 'completed', label: 'Completed' },
];

export default function ExplorePage() {
  const navigate = useNavigate();
  const { campaigns, loading } = useCampaigns();
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const filtered = useMemo(() => {
    return campaigns.filter((c: Campaign) => {
      if (search && !c.title.toLowerCase().includes(search.toLowerCase()) && !c.description.toLowerCase().includes(search.toLowerCase())) return false;
      if (categoryFilter && c.category !== categoryFilter) return false;
      if (statusFilter && c.status !== statusFilter) return false;
      return true;
    });
  }, [campaigns, search, categoryFilter, statusFilter]);

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-white mb-6">Explore Campaigns</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
        <Input
          placeholder="Search campaigns..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Select
          options={CATEGORIES}
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          placeholder="All Categories"
        />
        <Select
          options={STATUSES}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          placeholder="All Statuses"
        />
      </div>

      {loading ? (
        <LoadingSkeleton variant="card" count={6} />
      ) : filtered.length === 0 ? (
        <Card variant="light" padding="default">
          <p className="text-gray-500 text-center">No campaigns match your filters.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((c: Campaign) => {
            const raised = Number(c.currentAmount);
            const target = Number(c.targetAmount);
            const pct = target > 0 ? Math.round((raised / target) * 100) : 0;
            return (
              <Card
                key={c.id}
                variant="light"
                padding="default"
                className="cursor-pointer hover:border-gray-700 transition-all hover:translate-y-[-2px]"
                onClick={() => navigate(`/campaign/${c.id}`)}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-medium text-gray-500 uppercase">{c.category.replace('-', ' ')}</span>
                  <span className={`text-xs px-1.5 py-0.5 rounded ${
                    c.status === 'active' ? 'bg-blue-500/20 text-blue-400' :
                    c.status === 'funded' ? 'bg-[#4ade80]/20 text-[#4ade80]' : 'bg-gray-500/20 text-gray-400'
                  }`}>{c.status}</span>
                </div>
                <h3 className="text-base font-semibold text-white mb-1 truncate">{c.title}</h3>
                <p className="text-xs text-gray-500 mb-3 line-clamp-2">{c.description}</p>
                <div className="mb-2">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-[#4ade80]">₦{raised.toLocaleString()}</span>
                    <span className="text-gray-500">₦{target.toLocaleString()}</span>
                  </div>
                  <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                    <div className="h-full bg-[#4ade80] rounded-full" style={{ width: `${Math.min(pct, 100)}%` }} />
                  </div>
                </div>
                <p className="text-xs text-gray-600">
                  By {c.creator.slice(0, 10)}... · {pct}% funded
                </p>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
