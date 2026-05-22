import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@contexts/StacksAuthContext';
import DashboardLayout from '@components/dashboard/DashboardLayout';
import PublicCampaignForm from '@features/campaign/components/public-campaign-form';
import PrivatePoolForm from '@features/campaign/components/private-pool-form';
import { createCampaignService } from '../../services/campaignService';
import FeedWidget from '@features/dashboard/components/FeedWidget';
import AIRecommendations from '@features/dashboard/components/AIRecommendations';
import ReputationSummary from '@features/dashboard/components/ReputationSummary';

export default function FilmmakerDashboard() {
  const { userData, isAuthenticated, isLoading, userSession } = useAuth();
  const navigate = useNavigate();

  const [showPublicModal, setShowPublicModal] = useState(false);
  const [showPrivateModal, setShowPrivateModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [txId, setTxId] = useState(null);

  if (isLoading) return <div className="p-12 text-center">Loading...</div>;
  if (!isAuthenticated) {
    navigate('/login');
    return null;
  }

  const handlePublicSubmit = async (formData) => {
    setError(null);
    setIsSubmitting(true);
    setTxId(null);
    setSuccess(false);
    try {
      if (!userSession) {
        setError('Please connect your wallet first');
        setIsSubmitting(false);
        return;
      }
      const campaignService = createCampaignService(userSession);
      const allowedCategories = [
        'short-film', 'feature', 'documentary', 'music-video', 'web-series', 'animation', 'podcast', 'other'
      ];
      let category = formData.category || formData.filmGenre || 'feature';
      if (!allowedCategories.includes(category)) {
        category = 'feature';
      }
      const result = await campaignService.createCampaign({
        title: formData.title,
        description: formData.description,
        targetAmount: formData.targetAmount,
        category,
        deadline: formData.deadline ? new Date(formData.deadline).getTime() : Date.now() + (30 * 24 * 60 * 60 * 1000),
        duration: formData.fundingPeriod || formData.duration || 30,
        rewardTiers: formData.rewardTiers || 3,
        rewardDescription: formData.rewardDescription || 'Standard rewards for backers',
        mediaUrls: formData.mediaUrls || [],
        tags: formData.tags || [],
      });
      if (result.success) {
        setTxId(result.transactionId ?? null);
        setSuccess(true);
        setShowPublicModal(false);
      } else {
        setError(result.error || 'Failed to create campaign');
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePrivateSubmit = async (formData) => {
    setError(null);
    setIsSubmitting(true);
    setTxId(null);
    setSuccess(false);
    try {
      if (!userSession) {
        setError('Please connect your wallet first');
        setIsSubmitting(false);
        return;
      }
      const campaignService = createCampaignService(userSession);
      const result = await campaignService.createCampaign({
        title: formData.title,
        description: formData.description,
        targetAmount: formData.targetAmount,
        category: 'private-pool',
        deadline: Date.now() + (formData.fundingPeriod * 24 * 60 * 60 * 1000),
        duration: formData.fundingPeriod,
        minInvestment: formData.minInvestment,
        maxParticipants: formData.maxParticipants,
        invitedInvestors: formData.invitedInvestors || [],
        coProducerRoles: formData.coProducerRoles || [],
      });
      if (result.success) {
        setTxId(result.transactionId ?? null);
        setSuccess(true);
        setShowPrivateModal(false);
      } else {
        setError(result.error || 'Failed to create private pool');
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setShowPublicModal(false);
    setShowPrivateModal(false);
    setError(null);
    setSuccess(false);
    setTxId(null);
  };

  return (
    <DashboardLayout>
      <section className="py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-3xl font-bold">Filmmaker Dashboard</h2>
            <p className="text-gray-400">Create and manage your campaigns, pools and submissions.</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-400">Welcome back, <span className="font-semibold text-white">{userData?.name || 'Filmmaker'}</span></p>
          </div>
        </div>

        {/* Action cards row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="p-6 bg-black border border-gray-800 rounded-2xl text-white">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">Create Campaign</h3>
                <p className="text-gray-400 text-sm">Start a public campaign to raise funds from the CineX community.</p>
              </div>
              <div className="text-yellow-400 text-3xl">🎬</div>
            </div>
            <div className="mt-6">
              <button onClick={() => setShowPublicModal(true)} className="inline-flex items-center gap-3 px-4 py-2 bg-yellow-400 text-black rounded-lg font-semibold hover:bg-yellow-500 transition">Create Campaign</button>
            </div>
          </div>

          <div className="p-6 bg-black border border-gray-800 rounded-2xl text-white">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">Private Pools</h3>
                <p className="text-gray-400 text-sm">Set up invite-only pools for co-producers and selected investors.</p>
              </div>
              <div className="text-yellow-400 text-3xl">🔒</div>
            </div>
            <div className="mt-6">
              <button onClick={() => setShowPrivateModal(true)} className="inline-flex items-center gap-3 px-4 py-2 bg-yellow-400 text-black rounded-lg font-semibold hover:bg-yellow-500 transition">Create Private Pool</button>
            </div>
          </div>

          <div className="p-6 bg-black border border-gray-800 rounded-2xl text-white">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">My Campaigns</h3>
                <p className="text-gray-400 text-sm">View and manage your existing campaigns and performance.</p>
              </div>
              <div className="text-yellow-400 text-3xl">📊</div>
            </div>
            <div className="mt-6">
              <Link to="/dashboard/filmmaker/crowdfunding" className="inline-flex items-center gap-3 px-4 py-2 border border-yellow-400 text-yellow-400 rounded-lg font-semibold hover:bg-yellow-400 hover:text-black transition">View Campaigns</Link>
            </div>
          </div>

          <div className="p-6 bg-black border border-gray-800 rounded-2xl text-white">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">Active Pools</h3>
                <p className="text-gray-400 text-sm">Browse active pools and discover collaborators.</p>
              </div>
              <div className="text-yellow-400 text-3xl">🌐</div>
            </div>
            <div className="mt-6">
              <Link to="/active-pools" className="inline-flex items-center gap-3 px-4 py-2 bg-transparent border border-gray-700 text-gray-300 rounded-lg hover:bg-gray-800 transition">Explore Pools</Link>
            </div>
          </div>

          <div className="p-6 col-span-1 sm:col-span-2 lg:col-span-3 bg-black border border-gray-800 rounded-2xl text-white">
            <h4 className="text-white font-semibold mb-3">Quick Actions</h4>
            <div className="flex flex-wrap gap-3">
              <button onClick={() => setShowPublicModal(true)} className="px-4 py-2 bg-yellow-400 text-black rounded-lg font-medium">New Campaign</button>
              <button onClick={() => setShowPrivateModal(true)} className="px-4 py-2 bg-yellow-400 text-black rounded-lg font-medium">New Private Pool</button>
              <Link to="/dashboard/filmmaker/crowdfunding" className="px-4 py-2 border border-gray-700 text-gray-300 rounded-lg">Manage Campaigns</Link>
              <Link to="/active-pools" className="px-4 py-2 border border-gray-700 text-gray-300 rounded-lg">Browse Pools</Link>
            </div>
          </div>
        </div>

        {/* Projects overview */}
        <div className="mt-10 grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="p-6 bg-black border border-gray-800 rounded-2xl text-white">
            <h4 className="text-lg font-semibold mb-4">Projects In Progress</h4>
            <div className="space-y-3">
              <div className="p-4 bg-gray-900/30 border border-gray-800 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold">Ethereal Dreams</p>
                    <p className="text-sm text-gray-400">75% funded — 18 days left</p>
                  </div>
                  <Link to="/dashboard/filmmaker/crowdfunding" className="px-3 py-1 bg-yellow-400 text-black rounded font-medium">Manage</Link>
                </div>
              </div>

              <div className="p-4 bg-gray-900/30 border border-gray-800 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold">Echoes of Tomorrow</p>
                    <p className="text-sm text-gray-400">70% funded — 31 days left</p>
                  </div>
                  <Link to="/dashboard/filmmaker/crowdfunding" className="px-3 py-1 bg-yellow-400 text-black rounded font-medium">Manage</Link>
                </div>
              </div>
            </div>
          </div>

          <div className="p-6 bg-black border border-gray-800 rounded-2xl text-white">
            <h4 className="text-lg font-semibold mb-4">Completed Projects</h4>
            <div className="space-y-3">
              <div className="p-4 bg-gray-900/30 border border-gray-800 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold">Beyond the Horizon</p>
                    <p className="text-sm text-gray-400">Completed — 85,000 STX raised</p>
                  </div>
                  <Link to="/dashboard/filmmaker/crowdfunding" className="px-3 py-1 border border-gray-700 text-gray-300 rounded font-medium">View</Link>
                </div>
              </div>

              <div className="p-4 bg-gray-900/30 border border-gray-800 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold">City Pulse</p>
                    <p className="text-sm text-gray-400">Completed — 42,000 STX raised</p>
                  </div>
                  <Link to="/dashboard/filmmaker/crowdfunding" className="px-3 py-1 border border-gray-700 text-gray-300 rounded font-medium">View</Link>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom row: Feed + Reputation + AI */}
        <div className="mt-10 grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <FeedWidget maxItems={5} />
          </div>
          <div>
            <ReputationSummary />
          </div>
        </div>
        <div className="mt-6">
          <AIRecommendations />
        </div>
      </section>

      {/* Public Campaign Modal */}
      {showPublicModal && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-black border border-gray-800 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-8">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold text-white">Create Public Campaign</h3>
                <button onClick={handleCancel} className="text-gray-400 hover:text-white text-2xl">&times;</button>
              </div>
              <PublicCampaignForm onSubmit={handlePublicSubmit} onCancel={handleCancel} />
              {error && <p className="text-red-400 mt-4">{error}</p>}
              {success && txId && (
                <div className="mt-4 text-green-400">
                  Campaign created! TxID: <span className="font-mono">{txId}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Private Pool Modal */}
      {showPrivateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-black border border-gray-800 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-8">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold text-white">Create Private Pool</h3>
                <button onClick={handleCancel} className="text-gray-400 hover:text-white text-2xl">&times;</button>
              </div>
              <PrivatePoolForm onSubmit={handlePrivateSubmit} onCancel={handleCancel} />
              {error && <p className="text-red-400 mt-4">{error}</p>}
              {success && txId && (
                <div className="mt-4 text-green-400">
                  Private pool created! TxID: <span className="font-mono">{txId}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
