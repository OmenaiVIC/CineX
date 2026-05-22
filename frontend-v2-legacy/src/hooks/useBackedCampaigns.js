import { useState, useEffect } from 'react';
import { useAuth } from '@contexts/StacksAuthContext';

const BACKED_PREFIX = 'cinex_backed_';

function getAllBackedCampaignIds() {
  const ids = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(BACKED_PREFIX)) {
        ids.push(key.slice(BACKED_PREFIX.length));
      }
    }
  } catch {}
  return ids;
}

export function useBackedCampaigns(address) {
  const { userSession } = useAuth();
  const [campaigns, setCampaigns] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!address) {
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    const load = async () => {
      setIsLoading(true);
      try {
        const { createCampaignService } = await import('@services/campaignService');
        const service = createCampaignService(userSession);
        const backedIds = getAllBackedCampaignIds();
        const results = [];

        for (const id of backedIds) {
          const res = await service.getCampaignDetails(id);
          if (res.success && res.data) {
            const backedInfo = JSON.parse(localStorage.getItem(`${BACKED_PREFIX}${id}`) || '{}');
            results.push({
              ...res.data,
              amountContributed: backedInfo.amount || '0',
            });
          }
        }

        if (!cancelled) {
          setCampaigns(results);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) setError('Failed to load backed campaigns');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, [address, userSession]);

  return { campaigns, isLoading, error };
}
