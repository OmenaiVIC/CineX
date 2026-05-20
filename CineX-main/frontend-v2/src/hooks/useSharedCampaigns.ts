import { useEffect, useState } from 'react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

interface SharedCampaign {
  id: string;
  title: string;
  role: string;
  year: number;
}

interface SharedCampaignsResult {
  sharedCampaigns: SharedCampaign[];
  loading: boolean;
  error: string | null;
  hasSharedWork: boolean;
}

export function useSharedCampaigns(addressA: string | undefined, addressB: string | undefined): SharedCampaignsResult {
  const [sharedCampaigns, setSharedCampaigns] = useState<SharedCampaign[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!addressA || !addressB || addressA === addressB) {
      setSharedCampaigns([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    Promise.all([
      fetch(`${API_BASE}/api/profiles/${encodeURIComponent(addressA)}/portfolio`).then((r) => r.json()),
      fetch(`${API_BASE}/api/profiles/${encodeURIComponent(addressB)}/portfolio`).then((r) => r.json()),
    ])
      .then(([portfolioA, portfolioB]) => {
        const titlesB = new Set((portfolioB || []).map((item: { title: string }) => item.title.toLowerCase()));
        const shared = (portfolioA || [])
          .filter((item: { title: string }) => titlesB.has(item.title.toLowerCase()))
          .map((item: { id: number; title: string; role?: string; year?: number }) => ({
            id: String(item.id),
            title: item.title,
            role: item.role || 'Collaborator',
            year: item.year || new Date().getFullYear(),
          }));
        setSharedCampaigns(shared);
      })
      .catch((err) => {
        setError(err.message);
        setSharedCampaigns([]);
      })
      .finally(() => setLoading(false));
  }, [addressA, addressB]);

  return { sharedCampaigns, loading, error, hasSharedWork: sharedCampaigns.length > 0 };
}
