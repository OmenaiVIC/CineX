import { useState, useEffect, useCallback } from 'react';
import type { FeedEvent } from '../types';
import { getFeed, getUserFeed } from '../services/feedService';

export function useFeed(limit = 20) {
  const [items, setItems] = useState<FeedEvent[]>([]);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const refresh = useCallback(() => {
    const res = getFeed(limit, 0);
    if (res.success && res.data) {
      setItems(res.data);
      setOffset(limit);
      setHasMore(res.data.length >= limit);
    }
  }, [limit]);

  const loadMore = useCallback(() => {
    const res = getFeed(limit, offset);
    if (res.success && res.data) {
      setItems(prev => [...prev, ...res.data]);
      setOffset(prev => prev + limit);
      if (res.data.length < limit) setHasMore(false);
    }
  }, [limit, offset]);

  useEffect(() => { refresh(); }, [refresh]);

  return { items, hasMore, loadMore, refresh };
}

export function useUserFeed(address: string, limit = 20) {
  const [items, setItems] = useState<FeedEvent[]>([]);
  const refresh = useCallback(() => {
    const res = getUserFeed(address, limit);
    if (res.success && res.data) setItems(res.data);
  }, [address, limit]);
  useEffect(() => { refresh(); }, [refresh]);
  return { items, refresh };
}
