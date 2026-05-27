import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDemoMode } from '../contexts/DemoModeContext';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import LoadingSkeleton from '../components/common/LoadingSkeleton';
import CreatorDashboard from '../components/dashboard/CreatorDashboard';
import BackerDashboard from '../components/dashboard/BackerDashboard';
import { useCreatorCampaigns, useBackerContributions } from '../hooks/useCampaigns';
import { getAll } from '../contexts/DemoStorage';
import type { Campaign, Milestone, Pool } from '../types';

export default function DashboardPage() {
  const { currentUser } = useDemoMode();
  const navigate = useNavigate();

  const { campaigns, loading: campaignsLoading } = useCreatorCampaigns(currentUser?.address || '');
  const { contributions, refresh: refreshContributions } = useBackerContributions(currentUser?.address || '');

  const [allMilestones, setAllMilestones] = useState<Milestone[]>([]);
  const [allPoolz, setAllPoolz] = useState<Pool[]>([]);
  const [allCampaigns, setAllCampaigns] = useState<Campaign[]>([]);

  useEffect(() => {
    setAllMilestones(getAll<Milestone>('milestones'));
    setAllPoolz(getAll<Pool>('pools'));
    setAllCampaigns(getAll<Campaign>('campaigns'));
  }, []);

  if (!currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSkeleton variant="card" count={3} />
      </div>
    );
  }

  const role = currentUser.role;

  if (role === 'creative') {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <CreatorDashboard
          campaigns={campaigns}
          milestones={allMilestones}
          contributions={[]}
          onViewCampaign={(id) => navigate(`/campaign/${id}`)}
          onCreateCampaign={() => navigate('/campaign/new')}
        />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <BackerDashboard
        contributions={contributions}
        campaigns={allCampaigns}
        pools={allPoolz}
        onViewCampaign={(id) => navigate(`/campaign/${id}`)}
        onExplore={() => navigate('/explore')}
      />
    </div>
  );
}
