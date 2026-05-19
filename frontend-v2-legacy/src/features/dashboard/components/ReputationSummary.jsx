import { useState, useEffect } from 'react';
import { useAuth } from '@contexts/StacksAuthContext';
import { createReputationService } from '@services/index';

export default function ReputationSummary() {
  const { userSession, activeAddress } = useAuth();
  const [avgRating, setAvgRating] = useState(null);
  const [ratingCount, setRatingCount] = useState(0);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  const addr = activeAddress || 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM';

  useEffect(() => {
    const repService = createReputationService(userSession);
    Promise.all([
      repService.getAverageRating(addr),
      repService.getProfileRatings(addr),
      repService.getRatingSummary(addr),
    ]).then(([avgRes, ratRes, sumRes]) => {
      if (avgRes.success) setAvgRating(avgRes.data);
      if (ratRes.success) setRatingCount(ratRes.data.length);
      if (sumRes.success) setSummary(sumRes.data);
      setLoading(false);
    });
  }, [userSession, addr]);

  if (loading) {
    return (
      <div className="p-6 bg-black border border-gray-800 rounded-2xl text-white">
        <h3 className="font-semibold mb-4 text-white">Reputation</h3>
        <div className="text-gray-400 text-sm animate-pulse">Loading ratings...</div>
      </div>
    );
  }

  const stars = avgRating ? Math.round(avgRating) : 0;

  return (
    <div className="p-6 bg-black border border-gray-800 rounded-2xl text-white">
      <h3 className="font-semibold mb-4 text-white">Reputation</h3>

      <div className="flex items-center gap-4 mb-4">
        <div className="text-4xl font-bold text-yellow-400">
          {avgRating !== null ? avgRating.toFixed(1) : '--'}
        </div>
        <div>
          <div className="flex gap-0.5">
            {[1, 2, 3, 4, 5].map((s) => (
              <span key={s} className={s <= stars ? 'text-yellow-400' : 'text-gray-600'}>
                ★
              </span>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-1">{ratingCount} rating{ratingCount !== 1 ? 's' : ''}</p>
        </div>
      </div>

      {summary && (
        <div className="space-y-1.5">
          {[5, 4, 3, 2, 1].map((score) => {
            const count = summary[score] || 0;
            const pct = ratingCount > 0 ? (count / ratingCount) * 100 : 0;
            return (
              <div key={score} className="flex items-center gap-2 text-xs">
                <span className="w-3 text-gray-400">{score}</span>
                <div className="flex-1 h-2 bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-yellow-400 rounded-full transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="w-5 text-right text-gray-500">{count}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
