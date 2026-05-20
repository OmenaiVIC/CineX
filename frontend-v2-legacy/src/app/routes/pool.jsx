import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import PageLayout from '@components/layout/page-layout';
import { useAuth } from '@contexts/StacksAuthContext';
import { createCineXServices } from '@services/index';
import LoadingSkeleton from '@components/common/LoadingSkeleton';

export default function PoolDetailPage() {
  const { slug } = useParams();
  const { isAuthenticated } = useAuth();
  const [pool, setPool] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const svc = createCineXServices(null);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    setError('');
    svc.pool.getPoolDetails(slug).then((res) => {
      if (res.success && res.data) setPool(res.data);
      else setError(res.error || 'Pool not found');
    }).catch((err) => {
      setError(err instanceof Error ? err.message : 'Failed to load pool');
    }).finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <PageLayout title="Pool Details">
        <div className="max-w-3xl mx-auto px-4 py-12">
          <LoadingSkeleton variant="profile" />
        </div>
      </PageLayout>
    );
  }

  if (error || !pool) {
    return (
      <PageLayout title="Pool Not Found">
        <div className="max-w-3xl mx-auto px-4 py-24 text-center">
          <svg className="w-16 h-16 text-gray-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h1 className="text-2xl font-bold text-white mb-2">Pool Not Found</h1>
          <p className="text-gray-500">{error || 'No pool with this ID.'}</p>
          <Link to="/active-pools" className="inline-block mt-6 text-green-400 hover:underline">← Back to Pools</Link>
        </div>
      </PageLayout>
    );
  }

  const target = parseInt(pool.target_amount || '0');
  const current = parseInt(pool.current_amount || '0');
  const progress = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0;

  const formatStx = (v) => `${(parseInt(v) / 1_000_000).toLocaleString()} STX`;

  return (
    <PageLayout title={`${pool.name || 'Pool'} - CineX`}>
      <div className="max-w-3xl mx-auto px-4 py-12">
        <Link to="/active-pools" className="text-green-400 hover:underline text-sm mb-6 inline-block">← Back to Pools</Link>

        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 mb-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-white mb-1">{pool.name}</h1>
              <p className="text-sm text-gray-500">by {pool.creator?.slice(0, 6)}…{pool.creator?.slice(-4)}</p>
            </div>
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${pool.status === 'open' ? 'bg-green-900/50 text-green-400' : pool.status === 'funded' ? 'bg-blue-900/50 text-blue-400' : 'bg-gray-800 text-gray-400'}`}>
              {pool.status}
            </span>
          </div>

          <p className="text-gray-300 mb-6">{pool.description || 'No description provided.'}</p>

          <div className="mb-4">
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-400">{formatStx(pool.current_amount)} raised</span>
              <span className="text-green-400">{progress}%</span>
            </div>
            <div className="w-full bg-gray-800 rounded-full h-2 overflow-hidden">
              <div className="bg-green-500 h-full transition-all" style={{ width: `${progress}%` }} />
            </div>
            <p className="text-xs text-gray-600 mt-1">Goal: {formatStx(pool.target_amount)}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <p className="text-xs text-gray-500 mb-1">Members</p>
            <p className="text-xl font-bold text-white">{pool.current_members || pool.members?.length || 0} / {pool.max_members || '—'}</p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <p className="text-xs text-gray-500 mb-1">Min Commitment</p>
            <p className="text-xl font-bold text-white">{pool.min_commitment ? formatStx(pool.min_commitment) : '—'}</p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <p className="text-xs text-gray-500 mb-1">Category</p>
            <p className="text-lg font-semibold text-white capitalize">{pool.category || '—'}</p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <p className="text-xs text-gray-500 mb-1">Deadline</p>
            <p className="text-lg font-semibold text-white">{pool.deadline ? new Date(pool.deadline).toLocaleDateString() : '—'}</p>
          </div>
        </div>

        {pool.members && pool.members.length > 0 && (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
            <h2 className="text-lg font-bold text-white mb-4">Members ({pool.members.length})</h2>
            <div className="space-y-2">
              {pool.members.map((m, idx) => (
                <div key={m.id || idx} className="flex items-center justify-between py-2 border-b border-gray-800 last:border-0">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center text-xs text-gray-400">
                      {(m.address || '?')[0]}
                    </div>
                    <div>
                      <Link to={`/profile/${m.address}`} className="text-sm text-white hover:text-green-400">
                        {m.address?.slice(0, 6)}…{m.address?.slice(-4)}
                      </Link>
                      <p className="text-xs text-gray-600">{m.role}</p>
                    </div>
                  </div>
                  <span className="text-sm text-gray-300">{m.committed ? formatStx(m.committed) : '—'}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {pool.status === 'open' && isAuthenticated && (
          <div className="mt-6 text-center">
            <button className="bg-green-500 hover:bg-green-600 text-black font-bold px-8 py-3 rounded-lg transition">
              Join Pool
            </button>
          </div>
        )}
      </div>
    </PageLayout>
  );
}
