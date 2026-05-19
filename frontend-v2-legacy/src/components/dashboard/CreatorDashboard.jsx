import { Link } from 'react-router-dom';
import { useAuth } from '@contexts/StacksAuthContext';
import { useRole } from '@hooks/useRole';
import { useUserCampaigns } from '@hooks/useUserCampaigns';
import { useUserPools } from '@hooks/useUserPools';
import { DEMO_ADDRESSES, DEMO_PROFILES } from '@utils/demoAddresses';
import CampaignOverview from './CampaignOverview';
import PoolOverviewComponent from './PoolOverview';

function StatCard({ label, value, sub }) {
  return (
    <div className="bg-black border border-gray-800 rounded-2xl p-4">
      <p className="text-gray-500 text-xs mb-1">{label}</p>
      <p className="text-white text-2xl font-bold">{value}</p>
      {sub && <p className="text-gray-600 text-xs mt-0.5">{sub}</p>}
    </div>
  );
}

export default function CreatorDashboard() {
  const { isDemoMode } = useAuth();
  const { role, address, isDemo } = useRole();

  const demoAddress = isDemo ? DEMO_ADDRESSES.creative : null;
  const activeAddress = address || demoAddress;
  const demoProfile = isDemo ? DEMO_PROFILES[activeAddress] : null;

  const { campaigns, isLoading: campsLoading } = useUserCampaigns(activeAddress);
  const { pools, isLoading: poolsLoading } = useUserPools(activeAddress);

  const displayName = demoProfile?.displayName || 'Creative';

  const totalRaised = campaigns.reduce((sum, c) => sum + Number(c.currentAmount), 0);
  const activeCampaignsCount = campaigns.filter((c) => c.status === 'active').length;
  const pendingMilestones = campaigns.filter((c) =>
    c.milestoneCount && (c.completedMilestones || 0) < c.milestoneCount
  );

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
        <StatCard label="Active Campaigns" value={activeCampaignsCount} />
        <StatCard
          label="Total Raised"
          value={`${(totalRaised / 1000000).toLocaleString()} STX`}
        />
        <StatCard label="Reputation Score" value={campaigns.length > 0 ? '4.2' : '--'} sub="Based on ratings" />
        <StatCard label="Active Pools" value={pools.filter((p) => p.status === 'active').length} />
      </div>

      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">Your Campaigns</h2>
          <Link
            to="/dashboard/filmmaker/create-campaign"
            className="text-sm text-yellow-400 hover:text-yellow-300 transition"
          >
            + Create Campaign
          </Link>
        </div>
        {campsLoading ? (
          <div className="text-gray-500 text-sm animate-pulse">Loading campaigns...</div>
        ) : (
          <CampaignOverview campaigns={campaigns} />
        )}
      </section>

      {pendingMilestones.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-white mb-4">Pending Milestones</h2>
          <div className="space-y-2">
            {pendingMilestones.map((camp) => (
              <div key={camp.id} className="bg-black border border-gray-800 rounded-2xl p-4 flex items-center justify-between">
                <div>
                  <p className="text-white text-sm font-medium">{camp.title}</p>
                  <p className="text-gray-500 text-xs">
                    {camp.completedMilestones || 0}/{camp.milestoneCount} milestones completed
                  </p>
                </div>
                <button className="text-xs px-3 py-1.5 bg-yellow-400 text-black font-medium rounded-lg hover:bg-yellow-300 transition">
                  View
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">Your Pools</h2>
          <Link to="/active-pools" className="text-sm text-yellow-400 hover:text-yellow-300 transition">
            Find a Tribe &rarr;
          </Link>
        </div>
        {poolsLoading ? (
          <div className="text-gray-500 text-sm animate-pulse">Loading pools...</div>
        ) : (
          <PoolOverviewComponent
            pools={pools}
            title="Your Pools"
            emptyMessage="Join a tribe to start collaborating"
          />
        )}
      </section>

      <div className="flex flex-wrap gap-3">
        <Link
          to="/dashboard/filmmaker/create-campaign"
          className="px-5 py-2.5 bg-yellow-400 text-black font-semibold rounded-xl hover:bg-yellow-300 transition text-sm"
        >
          Create Campaign
        </Link>
        <Link
          to="/active-pools"
          className="px-5 py-2.5 bg-gray-800 text-gray-300 font-medium rounded-xl hover:bg-gray-700 transition text-sm"
        >
          Find a Tribe
        </Link>
        <Link
          to="/dashboard/public"
          className="px-5 py-2.5 bg-gray-800 text-gray-300 font-medium rounded-xl hover:bg-gray-700 transition text-sm"
        >
          View Feed
        </Link>
      </div>
    </div>
  );
}
