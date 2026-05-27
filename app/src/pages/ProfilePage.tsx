import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDemoMode } from '../contexts/DemoModeContext';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import LoadingSkeleton from '../components/common/LoadingSkeleton';
import TransactionModal, { useTxModal } from '../components/common/TransactionModal';
import { getProfile } from '../services/profileService';
import { getRatingsForUser, getAverageRating, getRatingBreakdown, addRating } from '../services/reputationService';
import { getCredibilitySummary, refreshCredibilitySummary } from '../services/aiService';
import { getCreatorCampaigns } from '../services/campaignService';
import { addFeedEvent } from '../services/feedService';
import PortfolioSection from '../components/portfolio/PortfolioSection';
import type { Profile, Rating, CredibilitySummary, Campaign } from '../types';

function StarRating({ value, onChange, readonly = false }: { value: number; onChange?: (v: number) => void; readonly?: boolean }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={readonly}
          onClick={() => onChange?.(star)}
          className={`text-lg transition-colors ${readonly ? 'cursor-default' : 'cursor-pointer hover:scale-110'} ${star <= value ? 'text-yellow-400' : 'text-gray-600'}`}
        >
          ★
        </button>
      ))}
    </div>
  );
}

export default function ProfilePage() {
  const { address } = useParams<{ address: string }>();
  const { currentUser } = useDemoMode();
  const navigate = useNavigate();
  const tx = useTxModal();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [avgRating, setAvgRating] = useState<{ average: number; count: number }>({ average: 0, count: 0 });
  const [breakdown, setBreakdown] = useState<Record<string, { average: number; count: number }>>({});
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [credibility, setCredibility] = useState<CredibilitySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCredibility, setShowCredibility] = useState(false);

  const [newRating, setNewRating] = useState(0);
  const [newReview, setNewReview] = useState('');
  const [newCategory, setNewCategory] = useState('general');

  const isOwnProfile = currentUser?.address === address;

  useEffect(() => {
    if (!address) return;
    setLoading(true);
    Promise.all([
      getProfile(address),
      getRatingsForUser(address),
      getAverageRating(address),
      getRatingBreakdown(address),
      getCreatorCampaigns(address),
    ]).then(([p, r, a, b, c]) => {
      if (p.success && p.data) setProfile(p.data);
      if (r.success && r.data) setRatings(r.data);
      if (a.success && a.data) setAvgRating(a.data);
      if (b.success && b.data) setBreakdown(b.data);
      if (c.success && c.data) setCampaigns(c.data);
      setLoading(false);
    });
  }, [address]);

  const handleSubmitRating = async () => {
    if (!currentUser || !address || newRating === 0) return;
    tx.open('Submitting Rating', `Rating ${profile?.displayName || address.slice(0, 10)}...`);
    setTimeout(async () => {
      const res = await addRating(currentUser.address, address, newRating, newReview || undefined, newCategory);
      if (res.success) {
        addFeedEvent('rating_received', currentUser.address, `Rated ${profile?.displayName || address.slice(0, 10)}... ${newRating}/5`, address);
        tx.succeed(res.transactionId);
        setTimeout(async () => {
          tx.close();
          setNewRating(0);
          setNewReview('');
          const [rRes, aRes, bRes] = await Promise.all([getRatingsForUser(address), getAverageRating(address), getRatingBreakdown(address)]);
          if (rRes.success && rRes.data) setRatings(rRes.data);
          if (aRes.success && aRes.data) setAvgRating(aRes.data);
          if (bRes.success && bRes.data) setBreakdown(bRes.data);
        }, 1000);
      } else {
        tx.fail(res.error || 'Failed to submit rating');
      }
    }, 600);
  };

  const handleRefreshCredibility = async () => {
    if (!address) return;
    const res = await refreshCredibilitySummary(address);
    if (res.success && res.data) setCredibility(res.data);
  };

  if (loading) {
    return <div className="max-w-4xl mx-auto px-4 py-8"><LoadingSkeleton variant="card" count={4} /></div>;
  }

  if (!profile) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 text-center">
        <p className="text-gray-400 mb-4">Profile not found.</p>
        <Button variant="outline" onClick={() => navigate('/explore')}>Browse Campaigns</Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <button onClick={() => navigate(-1)} className="text-sm text-gray-500 hover:text-gray-300 mb-4 block">← Back</button>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1 space-y-4">
          <Card variant="light" padding="default">
            <div className="text-center">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#4ade80] to-[#00e5ff] flex items-center justify-center text-2xl font-bold text-black mx-auto mb-3">
                {(profile.displayName || '?')[0].toUpperCase()}
              </div>
              <h2 className="text-lg font-bold text-white">{profile.displayName || 'Anonymous'}</h2>
              <p className="text-xs text-gray-500 font-mono mt-1">{profile.address.slice(0, 10)}...{profile.address.slice(-6)}</p>
              {profile.bio && <p className="text-sm text-gray-400 mt-3">{profile.bio}</p>}
              <div className="mt-3 flex items-center justify-center gap-4 text-sm">
                <div>
                  <p className="text-white font-bold">{avgRating.average}</p>
                  <p className="text-xs text-gray-500">Rating</p>
                </div>
                <div>
                  <p className="text-white font-bold">{avgRating.count}</p>
                  <p className="text-xs text-gray-500">Reviews</p>
                </div>
                <div>
                  <p className="text-white font-bold">{profile.reputationScore}</p>
                  <p className="text-xs text-gray-500">Reputation</p>
                </div>
              </div>
              {profile.joinedAt && (
                <p className="text-xs text-gray-600 mt-3">Joined {new Date(profile.joinedAt).toLocaleDateString()}</p>
              )}
              <button
                onClick={() => setShowCredibility(true)}
                className="mt-3 text-xs text-[#00e5ff] hover:underline"
              >
                View AI Credibility
              </button>
            </div>
          </Card>

          <Card variant="light" padding="default">
            <h3 className="text-sm font-semibold text-white mb-3">Rating Breakdown</h3>
            {Object.keys(breakdown).length === 0 ? (
              <p className="text-xs text-gray-500">No ratings yet.</p>
            ) : (
              <div className="space-y-2">
                {Object.entries(breakdown).map(([cat, data]) => (
                  <div key={cat} className="flex items-center justify-between text-sm">
                    <span className="text-gray-400 capitalize">{cat.replace('-', ' ')}</span>
                    <div className="flex items-center gap-2">
                      <StarRating value={Math.round(data.average)} readonly />
                      <span className="text-xs text-gray-500">({data.count})</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        <div className="md:col-span-2 space-y-6">
          {campaigns.length > 0 && (
            <div>
              <h3 className="text-base font-semibold text-white mb-3">Campaigns</h3>
              <div className="space-y-2">
                {campaigns.map(c => (
                  <Card key={c.id} variant="light" padding="small" className="cursor-pointer hover:border-gray-700" onClick={() => navigate(`/campaign/${c.id}`)}>
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="text-sm font-semibold text-white">{c.title}</h4>
                        <p className="text-xs text-gray-500">{c.category.replace('-', ' ')} · ₦{Number(c.currentAmount).toLocaleString()} raised</p>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        c.status === 'active' ? 'bg-blue-500/20 text-blue-400' :
                        c.status === 'funded' ? 'bg-[#4ade80]/20 text-[#4ade80]' : 'bg-gray-500/20 text-gray-400'
                      }`}>{c.status}</span>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          <PortfolioSection address={address} isOwnProfile={isOwnProfile} />

          {isOwnProfile && (
            <Card variant="light" padding="default">
              <h3 className="text-sm font-semibold text-white mb-2">Creator Verification</h3>
              <p className="text-xs text-gray-500 mb-3">Get verified to build trust with backers and unlock higher campaign limits. Verification requires a gatekeeper endorsement.</p>
              <Button variant="outline" size="small" onClick={() => navigate('/contact')}>
                Apply for Verification
              </Button>
            </Card>
          )}

          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-semibold text-white">Reviews ({ratings.length})</h3>
            </div>

            {!isOwnProfile && currentUser && (
              <Card variant="light" padding="small" className="mb-4">
                <h4 className="text-sm font-semibold text-white mb-3">Rate this Creator</h4>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Rating</label>
                    <StarRating value={newRating} onChange={setNewRating} />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Category</label>
                    <select
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value)}
                      className="w-full px-3 py-2 text-sm bg-black border border-gray-800 rounded-lg text-white focus:ring-2 focus:ring-green-400 focus:border-transparent"
                    >
                      {['general', 'cinematography', 'storytelling', 'professionalism', 'delivery', 'production', 'editing', 'direction', 'costume-design'].map(cat => (
                        <option key={cat} value={cat}>{cat.replace('-', ' ')}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Review (optional)</label>
                    <input
                      value={newReview}
                      onChange={(e) => setNewReview(e.target.value)}
                      placeholder="Write your review..."
                      className="w-full px-3 py-2 text-sm bg-black border border-gray-800 rounded-lg text-white focus:ring-2 focus:ring-green-400 focus:border-transparent placeholder-gray-500"
                    />
                  </div>
                  <Button variant="primary" size="small" onClick={handleSubmitRating} disabled={newRating === 0}>
                    Submit Rating
                  </Button>
                </div>
              </Card>
            )}

            {ratings.length === 0 ? (
              <Card variant="light" padding="default">
                <p className="text-sm text-gray-500">No reviews yet.</p>
              </Card>
            ) : (
              <div className="space-y-2">
                {ratings.map(r => (
                  <Card key={r.id} variant="light" padding="small">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <StarRating value={r.score} readonly />
                          {r.category && <span className="text-xs text-gray-500 capitalize">({r.category.replace('-', ' ')})</span>}
                        </div>
                        {r.review && <p className="text-sm text-gray-400">{r.review}</p>}
                        <div className="flex items-center gap-2 mt-1 text-xs text-gray-600">
                          <span>by {r.rater.slice(0, 10)}...</span>
                          <span>·</span>
                          <span>{new Date(r.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {showCredibility && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowCredibility(false)}>
          <div className="bg-[#0a0a0f] border border-[#1a1a2e] rounded-2xl p-8 w-full max-w-lg mx-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">AI Credibility Summary</h3>
              <button onClick={handleRefreshCredibility} className="text-xs text-[#00e5ff] hover:underline">Refresh</button>
            </div>
            <div className="bg-black/30 rounded-lg p-4 mb-4">
              {!credibility ? (
                <p className="text-sm text-gray-500">Loading...</p>
              ) : (
                <div className="space-y-2">
                  <p className="text-sm text-gray-300 leading-relaxed">{credibility.summary}</p>
                  <p className="text-xs text-gray-600 mt-2">Model: {credibility.model}</p>
                  <p className="text-xs text-gray-500 italic">{credibility.disclaimer}</p>
                </div>
              )}
            </div>
            <button onClick={() => setShowCredibility(false)} className="w-full px-4 py-2 bg-gray-800 text-gray-300 rounded-full text-sm hover:bg-gray-700 transition-colors">Close</button>
          </div>
        </div>
      )}

      <TransactionModal
        isOpen={tx.isOpen}
        state={tx.state}
        title={tx.title}
        description={tx.description}
        txId={tx.txId}
        error={tx.error}
        onClose={() => tx.close()}
        onRetry={handleSubmitRating}
      />
    </div>
  );
}

export { StarRating };
