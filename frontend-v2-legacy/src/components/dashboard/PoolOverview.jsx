import { Link } from 'react-router-dom';

function formatSTX(microSTX) {
  const amount = parseInt(microSTX) / 1000000;
  return new Intl.NumberFormat('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(amount);
}

export default function PoolOverview({ pools, title = 'Your Pools', emptyMessage = 'No pools joined yet.' }) {
  if (!pools || pools.length === 0) {
    return (
      <div className="text-center py-12">
        <svg className="w-12 h-12 text-gray-600 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        <p className="text-gray-500 text-sm">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {pools.map((pool) => {
        const pct = Math.min(
          Math.round((Number(pool.currentAmount) / Number(pool.targetAmount)) * 100),
          100
        );
        const daysLeft = Math.max(0, Math.ceil((pool.deadline - Date.now()) / 86400000));

        return (
          <Link
            key={pool.id}
            to={`/pool/${pool.id}`}
            className="block bg-black border border-gray-800 rounded-2xl p-5 hover:border-yellow-400/30 transition"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="min-w-0 flex-1">
                <h4 className="text-white font-medium text-sm truncate">{pool.name}</h4>
                <p className="text-xs text-gray-500 capitalize mt-0.5">{pool.category}</p>
              </div>
              <span className={`text-xs font-medium px-2 py-0.5 rounded ml-2 flex-shrink-0 ${
                pool.status === 'open' ? 'bg-green-900/40 text-green-400' :
                pool.status === 'active' ? 'bg-blue-900/40 text-blue-400' :
                'bg-gray-800 text-gray-400'
              }`}>
                {pool.status}
              </span>
            </div>

            <div className="flex items-center gap-3 text-xs text-gray-500 mb-2">
              <span>{pool.currentMembers}/{pool.maxMembers} members</span>
            </div>

            <div className="mb-3">
              <div className="flex justify-between text-xs text-gray-400 mb-1">
                <span>{formatSTX(pool.currentAmount)} STX</span>
                <span>{pct}%</span>
              </div>
              <div
                className="w-full h-1.5 bg-gray-800 rounded-full overflow-hidden"
                role="progressbar"
                aria-valuenow={pct}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <div
                  className="h-full bg-gradient-to-r from-yellow-400 to-yellow-500 rounded-full transition-all"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>

            <div className="flex justify-between text-xs text-gray-500">
              <span>{formatSTX(pool.targetAmount)} STX target</span>
              <span>{daysLeft > 0 ? `${daysLeft}d left` : 'Ended'}</span>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
