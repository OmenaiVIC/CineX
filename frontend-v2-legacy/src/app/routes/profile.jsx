import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import PageLayout from '@components/layout/page-layout';
import { useAuth } from '@contexts/StacksAuthContext';
import { createCineXServices } from '@services/index';
import LoadingSkeleton from '@components/common/LoadingSkeleton';
import ProfileHeader from '../../features/profile/components/ProfileHeader';
import PortfolioSection from '../../features/profile/components/PortfolioSection';
import ProfileRatingSection from '../../features/profile/components/ProfileRatingSection';

export default function ProfilePage() {
  const { address } = useParams();
  const { isAuthenticated } = useAuth();
  const [profile, setProfile] = useState(null);
  const [portfolio, setPortfolio] = useState([]);
  const [ratings, setRatings] = useState([]);
  const [ratingSummary, setRatingSummary] = useState({ 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 });
  const [avgScore, setAvgScore] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const svc = createCineXServices(null);
  const isOwnProfile = isAuthenticated && profile?.address === address;

  useEffect(() => {
    if (!address) return;
    setLoading(true);
    setError('');
    Promise.all([
      svc.profile.getProfile(address),
      svc.reputation.getProfileRatings(address),
      svc.reputation.getRatingSummary(address),
      svc.reputation.getAverageRating(address),
    ]).then(([prof, rat, summ, avg]) => {
      if (prof.success && prof.data) setProfile(prof.data);
      else setError(prof.error || 'Profile not found');
      if (rat.success && rat.data) setRatings(rat.data);
      if (summ.success && summ.data) setRatingSummary(summ.data);
      if (avg.success && avg.data !== undefined) setAvgScore(avg.data);
    }).catch((err) => {
      setError(err instanceof Error ? err.message : 'Failed to load profile');
    }).finally(() => setLoading(false));
  }, [address]);

  const handleProfileUpdate = (changes) => {
    if (!profile) return;
    svc.profile.updateProfile(changes).then((res) => {
      if (res.success && res.data) setProfile(res.data);
    });
  };

  if (loading) {
    return (
      <PageLayout title="Profile">
        <div className="max-w-3xl mx-auto px-4 py-12">
          <LoadingSkeleton variant="profile" />
        </div>
      </PageLayout>
    );
  }

  if (error || !profile) {
    return (
      <PageLayout title="Profile Not Found">
        <div className="max-w-3xl mx-auto px-4 py-24 text-center">
          <svg className="w-16 h-16 text-gray-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h1 className="text-2xl font-bold text-white mb-2">Profile Not Found</h1>
          <p className="text-gray-500">{error || 'No profile for this address.'}</p>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout title={`${profile.displayName || 'Profile'} - CineX`}>
      <div className="max-w-3xl mx-auto px-4 py-12 space-y-6">
        <ProfileHeader profile={profile} isOwnProfile={isOwnProfile} onUpdate={handleProfileUpdate} />
        <PortfolioSection
          items={portfolio}
          isOwnProfile={isOwnProfile}
          onAdd={(item) => {
            const fakeItem = { ...item, id: `portfolio-${Date.now()}` };
            setPortfolio((prev) => [fakeItem, ...prev]);
          }}
          onDelete={(id) => setPortfolio((prev) => prev.filter((p) => p.id !== id))}
        />
        <ProfileRatingSection ratings={ratings} summary={ratingSummary} averageScore={avgScore} />
      </div>
    </PageLayout>
  );
}
