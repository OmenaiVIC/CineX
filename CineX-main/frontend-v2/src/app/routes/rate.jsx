import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import PageLayout from '@components/layout/page-layout';
import RatingForm from '../../features/profile/components/RatingForm';
import { useSharedCampaigns } from '../../hooks/useSharedCampaigns';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';
const WALLET = import.meta.env.VITE_WALLET_ADDRESS || '';

export default function RateUserPage() {
  const { userAddress } = useParams();
  const [targetProfile, setTargetProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const { sharedCampaigns, loading: loadingShared, hasSharedWork } = useSharedCampaigns(WALLET, userAddress);

  useEffect(() => {
    if (!userAddress) return;
    setLoading(true);
    fetch(`${API_BASE}/api/profiles/${encodeURIComponent(userAddress)}`)
      .then((res) => {
        if (!res.ok) throw new Error('Profile not found');
        return res.json();
      })
      .then((json) => {
        setTargetProfile(json.profile);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [userAddress]);

  if (userAddress === WALLET) {
    return (
      <PageLayout title="Rate - CineX">
        <div className="max-w-lg mx-auto bg-gray-800/50 border border-gray-700 rounded-xl p-8 text-center">
          <p className="text-gray-400">You cannot rate yourself.</p>
          <Link to={`/profile/${WALLET}`} className="text-indigo-400 hover:text-indigo-300 text-sm mt-2 inline-block">
            Back to my profile
          </Link>
        </div>
      </PageLayout>
    );
  }

  if (loading) {
    return (
      <PageLayout title="Rate - CineX">
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin h-8 w-8 border-2 border-indigo-500 border-t-transparent rounded-full" />
        </div>
      </PageLayout>
    );
  }

  if (error) {
    return (
      <PageLayout title="Rate - CineX">
        <div className="max-w-lg mx-auto bg-gray-800/50 border border-gray-700 rounded-xl p-8 text-center">
          <p className="text-red-400 mb-2">{error}</p>
          <p className="text-gray-500 text-sm">Cannot load user profile. Make sure the backend is running.</p>
          <Link to="/" className="text-indigo-400 hover:text-indigo-300 text-sm mt-2 inline-block">
            Go home
          </Link>
        </div>
      </PageLayout>
    );
  }

  const targetName = targetProfile?.username || targetProfile?.address?.slice(0, 10) + '...';

  return (
    <PageLayout title={`Rate ${targetName} - CineX`}>
      <div className="max-w-lg mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white">Rate Filmmaker</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              <Link to={`/profile/${userAddress}`} className="text-indigo-400 hover:text-indigo-300">
                {targetName}
              </Link>
            </p>
          </div>
        </div>

        {!loadingShared && hasSharedWork && (
          <div className="bg-green-900/20 border border-green-700/50 rounded-lg p-3">
            <p className="text-xs text-green-400">
              You have shared projects with this filmmaker. Your rating will help the community.
            </p>
          </div>
        )}

        {!loadingShared && !hasSharedWork && (
          <div className="bg-amber-900/20 border border-amber-700/50 rounded-lg p-3">
            <p className="text-xs text-amber-400">
              No shared projects found. Ratings from verified collaborators carry more weight.
            </p>
          </div>
        )}

        <RatingForm
          targetAddress={userAddress}
          raterAddress={WALLET}
          targetName={targetName}
          onSuccess={() => setSuccess(true)}
        />

        <div className="text-center">
          <Link
            to={`/profile/${userAddress}`}
            className="text-sm text-gray-500 hover:text-gray-300"
          >
            &larr; Back to profile
          </Link>
        </div>
      </div>
    </PageLayout>
  );
}
