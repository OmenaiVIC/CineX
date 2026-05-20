import { useState } from 'react';
import StarRating from './StarRating';

interface Props {
  rateeAddress: string;
  rateeName: string;
  onSubmit: (score: number, review?: string, category?: string) => Promise<void>;
  onClose: () => void;
}

export default function RatingForm({ rateeAddress, rateeName, onSubmit, onClose }: Props) {
  const [score, setScore] = useState(0);
  const [review, setReview] = useState('');
  const [category, setCategory] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (score === 0) return;
    setSubmitting(true);
    try {
      await onSubmit(score, review || undefined, category || undefined);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-gray-800">
          <h2 className="text-lg font-semibold text-white">Rate {rateeName}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="text-center">
            <p className="text-gray-400 text-sm mb-3">How was your experience working with {rateeName}?</p>
            <div className="flex justify-center">
              <StarRating value={score} onChange={setScore} size="lg" />
            </div>
            {score > 0 && (
              <p className="text-yellow-400 text-sm mt-2">
                {score === 5 ? 'Excellent!' : score === 4 ? 'Great' : score === 3 ? 'Good' : score === 2 ? 'Fair' : 'Poor'}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Review (optional)</label>
            <textarea value={review} onChange={(e) => setReview(e.target.value)} rows={3}
              className="w-full bg-black border border-gray-800 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-yellow-400/50 resize-none"
              placeholder="Share your experience..." />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Category (optional)</label>
            <select value={category} onChange={(e) => setCategory(e.target.value)}
              className="w-full bg-black border border-gray-800 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-yellow-400/50">
              <option value="">Select category</option>
              <option value="collaboration">Collaboration</option>
              <option value="reliability">Reliability</option>
              <option value="communication">Communication</option>
              <option value="quality">Quality of Work</option>
              <option value="professionalism">Professionalism</option>
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="px-4 py-2 text-sm text-gray-400 hover:text-white transition">
              Cancel
            </button>
            <button type="submit" disabled={score === 0 || submitting}
              className="px-5 py-2 bg-yellow-400 text-black font-semibold rounded-xl hover:bg-yellow-300 transition text-sm disabled:opacity-50">
              {submitting ? 'Submitting...' : 'Submit Rating'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
