import { Link } from 'react-router-dom';
import { useAuth } from '@contexts/StacksAuthContext';
import { useRole } from '@hooks/useRole';
import { useBackedCampaigns } from '@hooks/useBackedCampaigns';
import { useUserPools } from '@hooks/useUserPools';
import { useUserYield } from '@hooks/useUserYield';
import { DEMO_ADDRESSES, DEMO_PROFILES } from '@utils/demoAddresses';
import PoolOverviewComponent from './PoolOverview';
import YieldPanel from './YieldPanel';
import RecommendationCard from './RecommendationCard';

function StatCard({ label, value, sub }) {
  return (
    <div className="bg-black border border-gray-800 rounded-2xl p-4">
      <p className="text-gray-500 text-xs mb-1">{label}</p>
      <p className="text-white text-2xl font-bold">{value}</p>
      {sub && <p className="text-gray-600 text-xs mt-0.5">{sub}</p>}
    </div>
  );
}

function formatSTX(microSTX) {
  const amount = parseInt(microSTX) / 1000000;
  return new Intl.NumberFormat('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(amount);
}

export default function BackerDashboard() {
  const { isDemoMode } = useAuth();
  const { role, address, isDemo } = useRole();

  const demoAddress = isDemo ? DEMO_ADDRESSES.backer : null;
  const activeAddress = address || demoAddress;
  const demoProfile = isDemo ? DEMO_PROFILES[activeAddress] : null;

  const { campaigns, isLoading: backedLoading } = useBackedCampaigns(activeAddress);
  const { pools, isLoading: poolsLoading } = useUserPools(activeAddress);
  const yieldData = useUserYield(activeAddress);

  const displayName = demoProfile?.displayName || 'Backer';

  const totalContributed = campaigns.reduce((sum, c) => sum + Number(c.amountContributed), 0);
  const uniqueCreators = new Set(campaigns.map((c) => c.creatorAddress)).size;

  const RECOMMENDATIONS = [
    {
      title: 'Afrobeats Music Collective',
      category: 'Music',
      matchReason: 'Popular in Film & Music',
      memberCount: 6,
      to: '/active-pools',
    },
    {
      title: 'Nollywood Rising',
      category: 'Film',
      matchReason: 'Trending in Nigeria',
      memberCount: 12,
      to: '/active-pools',
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">
          Welcome, {displayName}
        </h1>
        <div className="flex items-center gap-2 mt-1">
          <span className="bg-yellow-400/10 text-yellow-400 text-xs font-medium px-2 py-0.5 rounded-full capitalize">
            {role}
          </span>
          <span className="text-gray-600 text-xs">
            {isDemo ? 'Demo Mode' : 'Wallet Connected'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Active Pools" value={pools.filter((p) => p.status === 'active' || p.status === 'open').length} />
        <StatCard label="Total Contributed" value={`${formatSTX(totalContributed)} STX`} />
        <StatCard label="Yield Earned" value="0 STX" sub="Coming soon" />
        <StatCard label="Backed Creators" value={uniqueCreators} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <section className="lg:col-span-2">
          <h2 className="text-lg font-semibold text-white mb-4">Campaigns You Backed</h2>
          {backedLoading ? (
            <div className="text-gray-500 text-sm animate-pulse">Loading backed campaigns...</div>
          ) : campaigns.length === 0 ? (
            <div className="text-center py-12 bg-black border border-gray-800 rounded-2xl">
              <svg className="w-12 h-12 text-gray-600 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-gray-500 text-sm">You haven't backed any campaigns yet.</p>
              <Link to="/active-pools" className="text-yellow-400 text-sm mt-2 inline-block hover:text-yellow-300">
                Discover campaigns &rarr;
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {campaigns.map((c) => (
                <div key={c.id} className="bg-black border border-gray-800 rounded-2xl p-4 flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="text-white text-sm font-medium truncate">{c.title}</p>
                    <p className="text-gray-500 text-xs">
                      by {c.creatorName} &middot; {formatSTX(c.amountContributed)} STX contributed
                    </p>
                  </div>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded ml-3 flex-shrink-0 ${
                    c.status === 'active' ? 'bg-green-900/40 text-green-400' :
                    c.status === 'funded' ? 'bg-blue-900/40 text-blue-400' :
                    'bg-gray-800 text-gray-400'
                  }`}>
                    {c.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-4">Your Yield</h2>
          <YieldPanel yieldData={yieldData} />
        </section>
      </div>

      <section>
        <h2 className="text-lg font-semibold text-white mb-4">Your Pools</h2>
        {poolsLoading ? (
          <div className="text-gray-500 text-sm animate-pulse">Loading pools...</div>
        ) : (
          <PoolOverviewComponent pools={pools} />
        )}
      </section>

      <section>
        <h2 className="text-lg font-semibold text-white mb-4">Recommended for You</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {RECOMMENDATIONS.map((rec, i) => (
            <RecommendationCard key={i} {...rec} />
          ))}
        </div>
      </section>
    </div>
  );
}
