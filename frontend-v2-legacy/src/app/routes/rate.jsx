import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import PageLayout from '@components/layout/page-layout';
import { useAuth } from '@contexts/StacksAuthContext';
import { createCineXServices } from '@services/index';
import LoadingSkeleton from '@components/common/LoadingSkeleton';
import StarRating from '../../features/rating/components/StarRating';
import RatingForm from '../../features/rating/components/RatingForm';
import RatingHistory from '../../features/rating/components/RatingHistory';

export default function RatePage() {
  const { address } = useParams();
  const { isAuthenticated } = useAuth();
  const [profile, setProfile] = useState(null);
  const [ratings, setRatings] = useState([]);
  const [avgScore, setAvgScore] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [message, setMessage] = useState('');

  const svc = createCineXServices(null);

  useEffect(() => {
    if (!address) return;
    setLoading(true);
    Promise.all([
      svc.profile.getProfile(address),
      svc.reputation.getProfileRatings(address),
      svc.reputation.getAverageRating(address),
    ]).then(([prof, rat, avg]) => {
      if (prof.success && prof.data) setProfile(prof.data);
      if (rat.success && rat.data) setRatings(rat.data);
      if (avg.success && avg.data !== undefined) setAvgScore(avg.data);
    }).finally(() => setLoading(false));
  }, [address]);

  const handleSubmitRating = async (score, review, category) => {
    if (!address) return;
    const res = await svc.reputation.submitRating(address, score, review, category);
    if (res.success && res.data) {
      setRatings((prev) => [res.data, ...prev]);
      setShowForm(false);
      setMessage('Rating submitted successfully!');
      setTimeout(() => setMessage(''), 3000);
    } else {
      setMessage(res.error || 'Failed to submit rating');
    }
  };

  if (loading) {
    return (
      <PageLayout title="Rate User">
        <div className="max-w-2xl mx-auto px-4 py-12">
          <LoadingSkeleton variant="profile" />
        </div>
      </PageLayout>
    );
  }

  const displayName = profile?.displayName || address?.slice(0, 10) || 'Unknown';

  return (
    <PageLayout title={`Rate ${displayName} - CineX`}>
      <div className="max-w-2xl mx-auto px-4 py-12 space-y-6">
        <div className="flex items-center gap-3">
          <Link to={`/profile/${address}`} className="text-gray-500 hover:text-white transition">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white">Rate {displayName}</h1>
            <p className="text-gray-500 text-sm flex items-center gap-2">
              <StarRating value={avgScore} readonly size="sm" />
              {avgScore > 0 ? `${avgScore.toFixed(1)} (${ratings.length} ratings)` : 'No ratings yet'}
            </p>
          </div>
        </div>

        {message && (
          <div className={`p-4 rounded-xl text-sm ${message.includes('success') ? 'bg-green-900/30 text-green-400 border border-green-800' : 'bg-red-900/30 text-red-400 border border-red-800'}`}>
            {message}
          </div>
        )}

        {isAuthenticated && !showForm && (
          <button onClick={() => setShowForm(true)}
            className="w-full py-3 px-5 bg-yellow-400 text-black font-semibold rounded-xl hover:bg-yellow-300 transition text-sm">
            Write a Review
          </button>
        )}

        {showForm && (
          <RatingForm
            rateeAddress={address}
            rateeName={displayName}
            onSubmit={handleSubmitRating}
            onClose={() => setShowForm(false)}
          />
        )}

        <section>
          <h2 className="text-lg font-semibold text-white mb-4">Ratings & Reviews</h2>
          <RatingHistory ratings={ratings} showRater />
        </section>
      </div>
    </PageLayout>
  );
}
