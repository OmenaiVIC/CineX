import { useState, useEffect, useCallback } from 'react';
import type { Campaign, CampaignContribution } from '../types';
import { getCampaigns, getCampaign, getCampaignContributions, contributeToCampaign, createCampaign, getCreatorCampaigns, getBackerContributions } from '../services/campaignService';

export function useCampaigns(status?: Campaign['status']) {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const refresh = useCallback(() => {
    setLoading(true);
    const res = getCampaigns(status);
    if (res.success && res.data) setCampaigns(res.data);
    setLoading(false);
  }, [status]);
  useEffect(() => { refresh(); }, [refresh]);
  return { campaigns, loading, refresh };
}

export function useCampaign(id: string) {
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState(true);
  const refresh = useCallback(() => {
    setLoading(true);
    const res = getCampaign(id);
    if (res.success && res.data) setCampaign(res.data);
    else setCampaign(null);
    setLoading(false);
  }, [id]);
  useEffect(() => { refresh(); }, [refresh]);
  return { campaign, loading, refresh };
}

export function useCampaignContributions(campaignId: string) {
  const [contributions, setContributions] = useState<CampaignContribution[]>([]);
  const refresh = useCallback(() => {
    const res = getCampaignContributions(campaignId);
    if (res.success && res.data) setContributions(res.data);
  }, [campaignId]);
  useEffect(() => { refresh(); }, [refresh]);
  return { contributions, refresh };
}

export function useCreatorCampaigns(address: string) {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const refresh = useCallback(() => {
    const res = getCreatorCampaigns(address);
    if (res.success && res.data) setCampaigns(res.data);
  }, [address]);
  useEffect(() => { refresh(); }, [refresh]);
  return { campaigns, refresh };
}

export function useBackerContributions(address: string) {
  const [contributions, setContributions] = useState<CampaignContribution[]>([]);
  const refresh = useCallback(() => {
    const res = getBackerContributions(address);
    if (res.success && res.data) setContributions(res.data);
  }, [address]);
  useEffect(() => { refresh(); }, [refresh]);
  return { contributions, refresh };
}
