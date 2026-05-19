import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@contexts/StacksAuthContext';
import { createPoolService, DevUtils } from '@services/index';

export default function PoolOverview({ maxPools = 3 }) {
  const { userSession } = useAuth();
  const [pools, setPools] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const poolService = createPoolService(userSession);
    poolService.getPools({ page: 1, limit: maxPools }).then((res) => {
      if (res.success) {
        setPools(res.data.items);
      }
      setLoading(false);
    });
  }, [userSession, maxPools]);

  if (loading) {
    return (
      <div className="p-6 bg-black border border-gray-800 rounded-2xl text-white">
        <h3 className="font-semibold mb-4 text-white">Investment Pools</h3>
        <div className="text-gray-400 text-sm animate-pulse">Loading pools...</div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-black border border-gray-800 rounded-2xl text-white">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-white">Investment Pools</h3>
        <Link to="/active-pools" className="text-xs text-yellow-400 hover:text-yellow-300 transition">
          View all &rarr;
        </Link>
      </div>

      <div className="space-y-3">
        {pools.length === 0 && (
          <p className="text-gray-500 text-sm py-4 text-center">No pools available.</p>
        )}
        {pools.map((pool) => {
          const pct = Math.round(
            (Number(pool.currentAmount) / Number(pool.targetAmount)) * 100,
          );
          const stxRaised = DevUtils.formatSTX(pool.currentAmount);
          const stxTarget = DevUtils.formatSTX(pool.targetAmount);
          const daysLeft = Math.max(
            0,
            Math.ceil((pool.deadline - Date.now()) / 86_400_000),
          );
          return (
            <div
              key={pool.id}
              className="p-4 rounded-lg bg-gray-900/30 border border-gray-800/50 hover:border-yellow-400/30 transition"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-white truncate">{pool.name}</p>
                  <p className="text-xs text-gray-400 capitalize">{pool.category}</p>
                </div>
                <span
                  className={`text-xs font-medium px-2 py-0.5 rounded ${
                    pool.status === 'open'
                      ? 'bg-green-900/40 text-green-400'
                      : pool.status === 'funded'
                        ? 'bg-blue-900/40 text-blue-400'
                        : 'bg-gray-800 text-gray-400'
                  }`}
                >
                  {pool.status}
                </span>
              </div>

              <div className="mb-2">
                <div className="flex justify-between text-xs text-gray-400 mb-1">
                  <span>{stxRaised} STX raised</span>
                  <span>{pct}%</span>
                </div>
                <div className="w-full h-1.5 bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-yellow-400 to-yellow-500 rounded-full transition-all"
                    style={{ width: `${Math.min(pct, 100)}%` }}
                  />
                </div>
              </div>

              <div className="flex justify-between text-xs text-gray-500">
                <span>Target: {stxTarget} STX</span>
                <span>{daysLeft > 0 ? `${daysLeft}d left` : 'Ended'}</span>
              </div>
            </div>
          );
        })}
      </div>

      <Link
        to="/active-pools"
        className="mt-4 inline-flex items-center gap-1 text-xs text-yellow-400 hover:text-yellow-300 transition"
      >
        Discover more pools &rarr;
      </Link>
    </div>
  );
}
