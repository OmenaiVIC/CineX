import type { Rating } from '../../../types';

interface Props {
  ratings: Rating[];
  summary: Record<number, number>;
  averageScore: number;
}

export default function ProfileRatingSection({ ratings, summary, averageScore }: Props) {
  if (ratings.length === 0) {
    return (
      <section className="bg-black border border-gray-800 rounded-2xl p-5">
        <h2 className="text-lg font-semibold text-white mb-4">Ratings</h2>
        <p className="text-gray-600 text-sm text-center py-8">No ratings yet.</p>
      </section>
    );
  }

  const maxCount = Math.max(...Object.values(summary), 1);

  return (
    <section className="bg-black border border-gray-800 rounded-2xl p-5">
      <h2 className="text-lg font-semibold text-white mb-4">
        Ratings ({ratings.length})
      </h2>

      <div className="flex gap-8 mb-6">
        <div className="text-center">
          <p className="text-4xl font-bold text-white">{averageScore.toFixed(1)}</p>
          <div className="flex gap-0.5 justify-center mt-1">
            {[1, 2, 3, 4, 5].map((i) => (
              <svg key={i} className={`w-4 h-4 ${i <= Math.round(averageScore) ? 'text-yellow-400' : 'text-gray-700'}`} fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            ))}
          </div>
          <p className="text-gray-500 text-xs mt-1">{ratings.length} rating{ratings.length !== 1 ? 's' : ''}</p>
        </div>

        <div className="flex-1 space-y-1.5">
          {[5, 4, 3, 2, 1].map((star) => (
            <div key={star} className="flex items-center gap-2">
              <span className="text-xs text-gray-500 w-3 text-right">{star}</span>
              <div className="flex-1 h-2 bg-gray-800 rounded-full overflow-hidden">
                <div className="h-full bg-yellow-400 rounded-full transition-all"
                  style={{ width: `${(summary[star] || 0) / maxCount * 100}%` }} />
              </div>
              <span className="text-xs text-gray-600 w-4">{summary[star] || 0}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        {ratings.slice(0, 5).map((r) => (
          <div key={r.id} className="bg-gray-900 border border-gray-800 rounded-xl p-3">
            <div className="flex items-center justify-between mb-1">
              <div className="flex gap-0.5">
                {[1, 2, 3, 4, 5].map((i) => (
                  <svg key={i} className={`w-3.5 h-3.5 ${i <= r.score ? 'text-yellow-400' : 'text-gray-700'}`} fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
              {r.category && <span className="text-[10px] bg-gray-800 text-gray-500 px-2 py-0.5 rounded-full">{r.category}</span>}
            </div>
            {r.review && <p className="text-gray-400 text-xs">{r.review}</p>}
            <p className="text-gray-600 text-[10px] mt-1 font-mono">
              {r.rater.slice(0, 10)}...{new Date(r.createdAt).toLocaleDateString()}
            </p>
          </div>
        ))}
        {ratings.length > 5 && (
          <p className="text-center text-gray-600 text-xs pt-2">
            + {ratings.length - 5} more ratings
          </p>
        )}
      </div>
    </section>
  );
}
