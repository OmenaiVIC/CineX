import { useState, useEffect } from 'react';

const MOCK_POOLS = [
  {
    id: 'pool-1',
    name: 'West African Filmmakers Fund',
    description: 'A rotating fund for independent filmmakers in West Africa.',
    creator: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM',
    maxMembers: 12,
    currentMembers: 8,
    contributionAmount: '500000000',
    category: 'film',
    status: 'active',
    deadline: Date.now() + 90 * 86400000,
    targetAmount: '50000000000',
    currentAmount: '20000000000',
  },
  {
    id: 'pool-2',
    title: 'Afrobeats Music Collective',
    name: 'Afrobeats Music Collective',
    description: 'Pool for funding music video productions across the continent.',
    creator: 'SP3X6QWWETNB4GB6B6W6Z1S2SQE3X6QWWETNB4GB',
    maxMembers: 10,
    currentMembers: 6,
    contributionAmount: '250000000',
    category: 'music',
    status: 'open',
    deadline: Date.now() + 60 * 86400000,
    targetAmount: '30000000000',
    currentAmount: '15000000000',
  },
  {
    id: 'pool-3',
    name: 'Nollywood Rising',
    description: 'Supporting the next generation of Nigerian filmmakers.',
    creator: 'SP3X6QWWETNB4GB6B6W6Z1S2SQE3X6QWWETNB4GB',
    maxMembers: 15,
    currentMembers: 12,
    contributionAmount: '100000000',
    category: 'film',
    status: 'active',
    deadline: Date.now() + 30 * 86400000,
    targetAmount: '20000000000',
    currentAmount: '16000000000',
  },
];

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
      setPools(MOCK_POOLS);
      setIsLoading(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [address]);

  return { pools, isLoading, error };
}
