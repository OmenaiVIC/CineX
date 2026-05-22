import { useState, useEffect } from 'react';
import { useAuth } from '@contexts/StacksAuthContext';

const METADATA_PREFIX = 'cinex_campaign_';

function getAllCampaignIds() {
  const ids = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(METADATA_PREFIX)) {
        ids.push(key.slice(METADATA_PREFIX.length));
      }
    }
  } catch {}
  return ids;
}

export function useUserCampaigns(address) {
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
        const ids = getAllCampaignIds();
        const results = [];

        for (const id of ids) {
          const res = await service.getCampaignDetails(id);
          if (res.success && res.data) {
            results.push(res.data);
          }
        }

        if (!cancelled) {
          setCampaigns(results.filter((c) => c.creator === address));
          setError(null);
        }
      } catch (err) {
        if (!cancelled) setError('Failed to load campaigns');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, [address, userSession]);

  return { campaigns, isLoading, error };
}
