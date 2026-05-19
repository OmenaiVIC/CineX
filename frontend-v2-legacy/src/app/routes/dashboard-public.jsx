import { useNavigate } from 'react-router-dom';
import { useAuth } from '@contexts/StacksAuthContext';
import DashboardLayout from '@components/dashboard/DashboardLayout';
import FeedWidget from '@features/dashboard/components/FeedWidget';
import AIRecommendations from '@features/dashboard/components/AIRecommendations';
import ReputationSummary from '@features/dashboard/components/ReputationSummary';
import PoolOverview from '@features/dashboard/components/PoolOverview';

export default function PublicDashboard() {
  const { isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();

  if (isLoading) return <div className="p-12 text-center">Loading...</div>;
  if (!isAuthenticated) {
    navigate('/login');
    return null;
  }

  return (
    <DashboardLayout>
      <section className="py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold">Public Backer Dashboard</h2>
          <p className="text-gray-400">Browse campaigns, track pools, and discover collaborators.</p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Activity Feed — spans 2 cols */}
          <div className="lg:col-span-2">
            <FeedWidget maxItems={6} />
          </div>

          {/* Reputation — right sidebar */}
          <div>
            <ReputationSummary />
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-6 mt-6">
          <PoolOverview maxPools={3} />
          <AIRecommendations />
        </div>
      </section>
    </DashboardLayout>
  );
}
