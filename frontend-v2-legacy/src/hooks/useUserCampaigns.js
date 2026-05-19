import { useState, useEffect } from 'react';
import { useAuth } from '@contexts/StacksAuthContext';

const MOCK_CAMPAIGNS = [
  {
    id: 'camp-1',
    title: 'Echoes of the Motherland',
    description: 'A documentary exploring the rich tapestry of West African music traditions.',
    creator: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM',
    targetAmount: '50000000000',
    currentAmount: '12500000000',
    deadline: Date.now() + 45 * 86400000,
    category: 'documentary',
    status: 'active',
    milestoneCount: 3,
    completedMilestones: 1,
  },
  {
    id: 'camp-2',
    title: 'Lagos Noir',
    description: 'A neo-noir thriller set in the vibrant streets of Lagos.',
    creator: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM',
    targetAmount: '100000000000',
    currentAmount: '80000000000',
    deadline: Date.now() + 20 * 86400000,
    category: 'feature',
    status: 'active',
    milestoneCount: 5,
    completedMilestones: 2,
  },
  {
    id: 'camp-3',
    title: 'Rhythm of Accra',
    description: 'A music video project showcasing emerging Ghanaian artists.',
    creator: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM',
    targetAmount: '20000000000',
    currentAmount: '20000000000',
    deadline: Date.now() - 5 * 86400000,
    category: 'music-video',
    status: 'funded',
    milestoneCount: 2,
    completedMilestones: 0,
  },
];

export function useUserCampaigns(address) {
  const [campaigns, setCampaigns] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!address) {
      setIsLoading(false);
      return;
    }

    const timer = setTimeout(() => {
      setCampaigns(MOCK_CAMPAIGNS.filter((c) => c.creator === address || !address));
      setIsLoading(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [address]);

  return { campaigns, isLoading, error };
}
