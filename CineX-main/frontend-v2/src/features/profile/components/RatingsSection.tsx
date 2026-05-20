import StarRating from '../../../components/common/StarRating';
import type { Rating } from '../../../types';

interface RatingsSectionProps {
  ratings: Rating[];
  avgScore: number;
  count: number;
  loading?: boolean;
  error?: string | null;
}

function truncateAddress(addr: string) {
  return addr.length > 12 ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : addr;
}

export default function RatingsSection({ ratings, avgScore, count, loading = false, error = null }: RatingsSectionProps) {
  if (loading) {
    return (
      <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Ratings</h2>
        <div className="flex items-center justify-center py-4">
          <div className="animate-spin h-5 w-5 border-2 border-indigo-500 border-t-transparent rounded-full" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-1">Ratings</h2>
        <p className="text-gray-500 text-sm">Could not load ratings. {error}</p>
      </div>
    );
  }

  if (count === 0) {
    return (
      <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-1">Ratings</h2>
        <p className="text-gray-500 text-sm">No ratings yet. Be the first to rate this filmmaker!</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-white">Ratings</h2>
        <div className="flex items-center gap-2">
          <StarRating rating={Math.round(avgScore)} size="sm" />
          <span className="text-sm text-gray-300">
            {avgScore.toFixed(1)} <span className="text-gray-500">({count} {count === 1 ? 'rating' : 'ratings'})</span>
          </span>
        </div>
      </div>
      <div className="space-y-3">
        {ratings.map((rating) => (
          <div key={rating.id} className="border border-gray-700 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <StarRating rating={rating.score} size="sm" />
                <span className="text-xs text-gray-500">
                  by {rating.raterUsername || truncateAddress(rating.raterAddress)}
                </span>
              </div>
              <span className="text-xs text-gray-600">
                {new Date(rating.timestamp * 1000).toLocaleDateString()}
              </span>
            </div>
            {rating.comment && (
              <p className="text-sm text-gray-300 mt-2">{rating.comment}</p>
            )}
            {rating.txId && (
              <a
                href={`https://explorer.hiro.so/txid/${rating.txId}?chain=testnet`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-indigo-500 hover:text-indigo-400 mt-1 inline-block"
              >
                View on chain →
              </a>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
