import { useState } from 'react';
import StarRating from '../../../components/common/StarRating';
import CommentHashInput from '../../../components/common/CommentHashInput';
import ContractCallButton from '../../../components/common/ContractCallButton';

interface RatingFormProps {
  targetAddress: string;
  raterAddress: string;
  targetName?: string;
  onSuccess?: () => void;
}

export default function RatingForm({ targetAddress, raterAddress, targetName, onSuccess }: RatingFormProps) {
  const [score, setScore] = useState(0);
  const [comment, setComment] = useState('');
  const [commentHash, setCommentHash] = useState('');
  const [projectId, setProjectId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [txId, setTxId] = useState<string | null>(null);

  const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

  const handleContractSubmit = async () => {
    const hash = commentHash || `rating:${targetAddress}:${Date.now()}`;
    return hash;
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (score < 1) {
      setError('Please select a rating (1-5 stars)');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const body: Record<string, unknown> = {
        raterAddress,
        score,
        comment: comment || null,
        commentHash: commentHash || null,
        projectId: projectId || null,
      };
      if (txId) body.txId = txId;

      const res = await fetch(`${API_BASE}/api/profiles/${encodeURIComponent(targetAddress)}/ratings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to submit rating');
      }
      setSubmitted(true);
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6 text-center">
        <div className="text-4xl mb-2">&#10003;</div>
        <h3 className="text-lg font-semibold text-white mb-1">Rating Submitted</h3>
        <p className="text-sm text-gray-400">Your rating for {targetName || targetAddress} has been recorded.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleFormSubmit} className="bg-gray-800/50 border border-gray-700 rounded-xl p-6 space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-white mb-1">
          Rate {targetName || targetAddress.slice(0, 10) + '...'}
        </h2>
        <p className="text-sm text-gray-500">Share your experience working with this filmmaker.</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">Rating</label>
        <StarRating rating={score} interactive onChange={setScore} size="lg" />
        {score > 0 && (
          <p className="text-xs text-gray-500 mt-1">
            {score === 1 ? 'Poor' : score === 2 ? 'Below Average' : score === 3 ? 'Average' : score === 4 ? 'Good' : 'Excellent'}
          </p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">Comment</label>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={3}
          maxLength={500}
          className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
          placeholder="Describe your collaboration experience..."
        />
        <p className="text-xs text-gray-600 text-right mt-1">{comment.length}/500</p>
      </div>

      <CommentHashInput value={commentHash} onChange={setCommentHash} />

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">Project ID</label>
        <input
          value={projectId}
          onChange={(e) => setProjectId(e.target.value)}
          className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          placeholder="Campaign or pool ID (if applicable)"
        />
      </div>

      <div className="flex items-center gap-3">
        <ContractCallButton
          label="Anchor on chain"
          onClick={handleContractSubmit}
          onSuccess={(id) => setTxId(id)}
          size="sm"
          variant="secondary"
        />
        {txId && <span className="text-xs text-green-400">Hash anchored</span>}
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <button
        type="submit"
        disabled={submitting || score < 1}
        className="w-full px-4 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-colors disabled:opacity-50"
      >
        {submitting ? 'Submitting...' : 'Submit Rating'}
      </button>
    </form>
  );
}
