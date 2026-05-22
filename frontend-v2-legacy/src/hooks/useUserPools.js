import { useState, useEffect } from 'react';

const POOL_PREFIX = 'cinex_pool_';

function getAllPoolIds() {
  const ids = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(POOL_PREFIX)) {
        ids.push(key.slice(POOL_PREFIX.length));
      }
    }
  } catch {}
  return ids;
}

export function useUserPools(address) {
  const [pools, setPools] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!address) {
      setIsLoading(false);
      return;
    }

    const timer = setTimeout(() => {
      const ids = getAllPoolIds();
      const results = [];
      for (const id of ids) {
        try {
          const data = JSON.parse(localStorage.getItem(`${POOL_PREFIX}${id}`) || '{}');
          if (data.creator === address) {
            results.push(data);
          }
        } catch {}
      }
      setPools(results);
      setIsLoading(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [address]);

  return { pools, isLoading, error };
}
