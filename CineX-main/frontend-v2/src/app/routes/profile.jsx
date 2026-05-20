import { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import PageLayout from '@components/layout/page-layout';
import ProfileHeader from '../../features/profile/components/ProfileHeader';
import PortfolioSection from '../../features/profile/components/PortfolioSection';
import RatingsSection from '../../features/profile/components/RatingsSection';
import EditProfileModal from '../../features/profile/components/EditProfileModal';
import PortfolioItemForm from '../../features/profile/components/PortfolioItemForm';
import { useReputation } from '../../hooks/useReputation';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';
const WALLET = import.meta.env.VITE_WALLET_ADDRESS || '';

function mapProfile(json) {
  const p = json.profile;
  return {
    profile: {
      address: p.address,
      isVerified: p.verification_level !== 'unverified',
      verificationLevel: p.verification_level || 'unverified',
      username: p.username,
      bio: p.bio,
      portfolioUrl: p.portfolio_url,
      socialLinks: {
        twitter: p.social_twitter,
        instagram: p.social_instagram,
        website: p.social_website,
      },
    },
    portfolio: json.portfolio.map((item) => ({
      id: String(item.id),
      title: item.title,
      description: item.description,
      category: item.category || 'short-film',
      role: item.role || '',
      year: item.year || new Date().getFullYear(),
      mediaUrls: JSON.parse(item.media_urls || '[]'),
      awards: JSON.parse(item.awards || '[]'),
    })),
  };
}

export default function ProfilePage() {
  const { userAddress } = useParams();
  const isOwner = userAddress === WALLET;
  const [profile, setProfile] = useState(null);
  const [portfolio, setPortfolio] = useState([]);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [error, setError] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAddPortfolio, setShowAddPortfolio] = useState(false);

  const { ratings, avgScore, count, loading: loadingRatings, error: ratingsError, refetch: refetchRatings } = useReputation(userAddress);

  const fetchProfile = useCallback(async () => {
    if (!userAddress) return;
    setLoadingProfile(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/profiles/${encodeURIComponent(userAddress)}`);
      if (!res.ok) throw new Error(res.status === 404 ? 'Profile not found' : 'Failed to load profile');
      const json = await res.json();
      const { profile, portfolio } = mapProfile(json);
      setProfile(profile);
      setPortfolio(portfolio);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingProfile(false);
    }
  }, [userAddress]);

  useEffect(() => { fetchProfile(); }, [fetchProfile]);

  const handleSaveProfile = async (updates) => {
    const body = {
      username: updates.username || null,
      bio: updates.bio || null,
      avatarUrl: null,
      portfolioUrl: updates.portfolioUrl || null,
      socialTwitter: updates.socialLinks?.twitter || null,
      socialInstagram: updates.socialLinks?.instagram || null,
      socialWebsite: updates.socialLinks?.website || null,
    };
    const res = await fetch(`${API_BASE}/api/profiles/${encodeURIComponent(userAddress)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error('Failed to save profile');
    const updated = await res.json();
    const mapped = mapProfile({ profile: updated, portfolio: [] });
    setProfile(mapped.profile);
  };

  const handleAddPortfolio = async (data) => {
    const res = await fetch(`${API_BASE}/api/profiles/${encodeURIComponent(userAddress)}/portfolio`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to add portfolio item');
    await fetchProfile();
  };

  const handleDeletePortfolio = async (id) => {
    const res = await fetch(`${API_BASE}/api/profiles/${encodeURIComponent(userAddress)}/portfolio/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to delete portfolio item');
    setPortfolio((prev) => prev.filter((item) => item.id !== id));
  };

  if (loadingProfile) {
    return (
      <PageLayout title="Profile - CineX">
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin h-8 w-8 border-2 border-indigo-500 border-t-transparent rounded-full" />
        </div>
      </PageLayout>
    );
  }

  if (error) {
    return (
      <PageLayout title="Profile - CineX">
        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-8 text-center">
          <p className="text-red-400 mb-2">{error}</p>
          <p className="text-gray-500 text-sm">The address may not have a profile yet, or the backend may be offline.</p>
          <p className="text-gray-600 text-xs mt-1">Make sure the backend is running at {API_BASE}</p>
        </div>
      </PageLayout>
    );
  }

  if (!profile) return null;

  return (
    <PageLayout title={`${profile.username || 'Profile'} - CineX`}>
      <div className="max-w-3xl mx-auto space-y-6">
        {!isOwner && (
          <Link
            to={`/rate/${encodeURIComponent(userAddress)}`}
            className="inline-block px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-colors"
          >
            Rate this Filmmaker
          </Link>
        )}
        <ProfileHeader profile={profile} onEdit={isOwner ? () => setShowEditModal(true) : undefined} />
        <RatingsSection
          ratings={ratings}
          avgScore={avgScore}
          count={count}
          loading={loadingRatings}
          error={ratingsError}
        />
        <PortfolioSection
          items={portfolio}
          isOwner={isOwner}
          onAdd={isOwner ? () => setShowAddPortfolio(true) : undefined}
          onDelete={isOwner ? handleDeletePortfolio : undefined}
        />
      </div>

      {showEditModal && (
        <EditProfileModal
          profile={profile}
          onSave={handleSaveProfile}
          onClose={() => setShowEditModal(false)}
        />
      )}

      {showAddPortfolio && (
        <PortfolioItemForm
          onSave={handleAddPortfolio}
          onClose={() => setShowAddPortfolio(false)}
        />
      )}
    </PageLayout>
  );
}
