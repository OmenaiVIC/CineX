import { useState, useEffect } from 'react';

const MOCK_BACKED = [
  {
    id: 'backed-1',
    campaignId: 'camp-b1',
    title: 'Sahara Blues',
    creatorName: 'Amara Okafor',
    creatorAddress: 'SP3X6QWWETNB4GB6B6W6Z1S2SQE3X6QWWETNB4GB',
    amountContributed: '500000000',
    status: 'active',
    deadline: Date.now() + 30 * 86400000,
  },
  {
    id: 'backed-2',
    campaignId: 'camp-b2',
    title: 'AfroJazz Fusion',
    creatorName: 'Kofi Mensah',
    creatorAddress: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM',
    amountContributed: '250000000',
    status: 'funded',
    deadline: Date.now() - 10 * 86400000,
  },
  {
    id: 'backed-3',
    campaignId: 'camp-b3',
    title: 'Nairobi Cyberpunk',
    creatorName: 'Theo Adelekun',
    creatorAddress: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM',
    amountContributed: '1000000000',
    status: 'active',
    deadline: Date.now() + 60 * 86400000,
  },
];

export function useBackedCampaigns(address) {
  const [campaigns, setCampaigns] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!address) {
      setIsLoading(false);
      return;
    }

    const timer = setTimeout(() => {
      setCampaigns(MOCK_BACKED);
      setIsLoading(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [address]);

  return { campaigns, isLoading, error };
}
