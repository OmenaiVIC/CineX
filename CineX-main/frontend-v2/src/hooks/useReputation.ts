import { useEffect, useState, useRef } from 'react';
import type { Rating } from '../types';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

interface ReputationResult {
  ratings: Rating[];
  avgScore: number;
  count: number;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

interface RatingsApiResponse {
  ratings: Array<{
    id: number;
    rater_address: string;
    score: number;
    comment?: string;
    comment_hash?: string;
    tx_id?: string;
    project_id?: string;
    created_at: number;
  }>;
  summary: {
    avg_score: number;
    count: number;
  };
}

function mapRating(r: RatingsApiResponse['ratings'][0], targetAddress: string): Rating {
  return {
    id: String(r.id),
    raterAddress: r.rater_address,
    targetAddress,
    score: r.score,
    comment: r.comment || '',
    commentHash: r.comment_hash,
    txId: r.tx_id,
    projectId: r.project_id,
    timestamp: r.created_at,
  };
}

export function useReputation(address: string | undefined): ReputationResult {
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [avgScore, setAvgScore] = useState(0);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const prevAddress = useRef<string | undefined>(undefined);

  const fetchRatings = async () => {
    if (!address) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/profiles/${encodeURIComponent(address)}/ratings`);
      if (!res.ok) throw new Error(res.status === 404 ? 'No ratings found' : 'Failed to fetch ratings');
      const json: RatingsApiResponse = await res.json();
      setRatings(json.ratings.map((r) => mapRating(r, address)));
      setAvgScore(Number(json.summary.avg_score));
      setCount(json.summary.count);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (address !== prevAddress.current) {
      prevAddress.current = address;
      fetchRatings();
    }
  }, [address]);

  return { ratings, avgScore, count, loading, error, refetch: fetchRatings };
}
