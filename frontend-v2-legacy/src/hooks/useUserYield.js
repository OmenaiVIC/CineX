import { useState, useEffect } from 'react';

export function useUserYield(address) {
  const [data, setData] = useState({
    totalYield: '0',
    strategies: [],
    isLoading: false,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!address) {
      setIsLoading(false);
      return;
    }

    const timer = setTimeout(() => {
      setData({
        totalYield: '0',
        strategies: [],
        isLoading: false,
      });
      setIsLoading(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [address]);

  return { ...data, isLoading };
}
