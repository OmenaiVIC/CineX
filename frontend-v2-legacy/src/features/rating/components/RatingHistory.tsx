import StarRating from './StarRating';
import type { Rating } from '../../../types';

interface Props {
  ratings: Rating[];
  showRater?: boolean;
}

export default function RatingHistory({ ratings, showRater = true }: Props) {
  if (ratings.length === 0) {
    return (
      <div className="text-center py-12 bg-black border border-gray-800 rounded-2xl">
        <svg className="w-12 h-12 text-gray-600 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
        </svg>
        <p className="text-gray-500 text-sm">No ratings to display yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {ratings.map((r) => (
        <div key={r.id} className="bg-black border border-gray-800 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-1">
            <StarRating value={r.score} readonly size="sm" />
            <div className="flex items-center gap-2">
              {r.category && <span className="text-[10px] bg-gray-800 text-gray-500 px-2 py-0.5 rounded-full">{r.category}</span>}
              <span className="text-gray-600 text-[10px]">{new Date(r.createdAt).toLocaleDateString()}</span>
            </div>
          </div>
          {r.review && <p className="text-gray-400 text-sm mt-1">{r.review}</p>}
          {showRater && (
            <p className="text-gray-600 text-[10px] mt-1.5 font-mono">
              by {r.rater.slice(0, 8)}...{r.rater.slice(-6)}
              {r.projectId && <> &middot; on {r.projectId}</>}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
