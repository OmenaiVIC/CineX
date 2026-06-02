import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDemoMode } from '../contexts/DemoModeContext';
import { useAuth } from '../contexts/AuthContext';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import LoadingSkeleton from '../components/common/LoadingSkeleton';
import CreatorDashboard from '../components/dashboard/CreatorDashboard';
import BackerDashboard from '../components/dashboard/BackerDashboard';
import { useCreatorCampaigns, useBackerContributions, useCreatorContributions } from '../hooks/useCampaigns';
import { getCampaigns } from '../services/campaignService';
import { getPools } from '../services/poolService';
import { getCreatorMilestones } from '../services/milestoneService';
import type { Campaign, Milestone, Pool } from '../types';

export default function DashboardPage() {
  const { currentUser, isOnboarded } = useDemoMode();
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const isDemo = isOnboarded && !isAuthenticated;
  const activeUser = isDemo ? currentUser : (user || currentUser);
  const role = isDemo ? (currentUser?.role || 'backer') : (user?.role || currentUser?.role || 'backer');

  const { campaigns, loading: campaignsLoading } = useCreatorCampaigns(activeUser?.address || '');
  const { contributions, loading: contributionsLoading } = useBackerContributions(activeUser?.address || '');
  const { contributions: creatorContribs, loading: creatorContribsLoading } = useCreatorContributions(activeUser?.address || '');

  const [allMilestones, setAllMilestones] = useState<Milestone[]>([]);
  const [allPoolz, setAllPoolz] = useState<Pool[]>([]);
  const [allCampaigns, setAllCampaigns] = useState<Campaign[]>([]);
  const [loadingExtra, setLoadingExtra] = useState(true);

  useEffect(() => {
    Promise.all([
      getCampaigns(),
      getPools(),
      getCreatorMilestones(activeUser?.address || ''),
    ]).then(([campRes, poolRes, msRes]) => {
      if (campRes.success && campRes.data) setAllCampaigns(campRes.data);
      if (poolRes.success && poolRes.data) setAllPoolz(poolRes.data);
      if (msRes.success && msRes.data) setAllMilestones(msRes.data);
      setLoadingExtra(false);
    });
  }, [activeUser?.address]);

  if (!activeUser) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSkeleton variant="card" count={3} />
      </div>
    );
  }

  const banner = isDemo ? (
    <div className="mb-6 bg-gradient-to-r from-[rgba(74,222,128,0.1)] to-[rgba(34,197,94,0.05)] border border-[rgba(74,222,128,0.25)] rounded-xl p-4 flex items-center justify-between gap-4">
      <div>
        <p className="text-sm font-medium text-white">You are in Demo Mode</p>
        <p className="text-xs text-gray-400 mt-0.5">Create a real account to save your progress and access live features.</p>
      </div>
      <a
        href="https://cine-x-iota.vercel.app/signup"
        target="_blank"
        rel="noopener noreferrer"
        className="shrink-0 px-4 py-2 text-xs font-semibold text-black bg-[#4ade80] hover:bg-[#22c55e] rounded-lg transition-all"
      >
        Go to Live Site →
      </a>
    </div>
  ) : null;

  if (role === 'creative') {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <button onClick={() => navigate('/explore')} className="text-sm text-gray-400 hover:text-white mb-4 flex items-center gap-1">
          ← Explore Campaigns
        </button>
        {banner}
        <CreatorDashboard
          campaigns={campaigns}
          milestones={allMilestones}
          contributions={creatorContribs}
          loading={campaignsLoading || creatorContribsLoading || loadingExtra}
          onViewCampaign={(id) => navigate(`/campaign/${id}`)}
          onCreateCampaign={() => navigate('/campaign/new')}
        />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <button onClick={() => navigate('/explore')} className="text-sm text-gray-400 hover:text-white mb-4 flex items-center gap-1">
        ← Explore Campaigns
      </button>
      {banner}
      <BackerDashboard
        contributions={contributions}
        campaigns={allCampaigns}
        pools={allPoolz}
        loading={contributionsLoading || loadingExtra}
        onViewCampaign={(id) => navigate(`/campaign/${id}`)}
        onExplore={() => navigate('/explore')}
      />
    </div>
  );
}
