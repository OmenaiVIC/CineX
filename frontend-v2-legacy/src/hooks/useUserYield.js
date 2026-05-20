import { useState, useEffect, useCallback } from 'react';
import { createCineXServices } from '../services';

export function useUserYield(address) {
  const [data, setData] = useState({
    totalYield: '0',
    strategies: [],
    isLoading: true,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const svc = createCineXServices(null);

  const fetchYield = useCallback(async () => {
    if (!address) {
      setData({ totalYield: '0', strategies: [], isLoading: false });
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    const [poolsResult, campaignsResult] = await Promise.all([
      svc.pool.getPools({ status: 'active', page: 1, limit: 50 }),
      svc.crowdfunding?.getCampaigns?.().catch(() => ({ success: false })),
    ]);

    const pools = poolsResult.success && poolsResult.data ? poolsResult.data.items : [];
    const campaigns = campaignsResult?.success && campaignsResult.data ? campaignsResult.data : [];

    const totalPoolContrib = Number(
      pools
        .filter((p) => p.currentMembers > 0)
        .reduce((sum, p) => sum + BigInt(p.currentAmount || '0'), 0n) / 1000000n
    );
    const yieldEstimate = (totalPoolContrib * 0.08).toFixed(2);

    const strategies = [
      {
        id: 'pool-yield',
        name: 'Pool Participation Yield',
        apr: '8.0%',
        deposited: totalPoolContrib.toString(),
        status: totalPoolContrib > 0 ? 'active' : 'pending',
      },
      {
        id: 'campaign-returns',
        name: 'Campaign Returns',
        apr: '--',
        deposited: '0',
        status: campaigns.length > 2 ? 'active' : 'pending',
      },
    ];

    setData({
      totalYield: yieldEstimate,
      strategies,
      isLoading: false,
    });
    setIsLoading(false);
  }, [address]);

  useEffect(() => {
    fetchYield();
  }, [fetchYield]);

  return { ...data, isLoading, error, refetch: fetchYield };
}
