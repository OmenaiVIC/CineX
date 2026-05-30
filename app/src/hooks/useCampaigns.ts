import { useState, useEffect, useCallback } from 'react';
import type { Campaign, CampaignContribution } from '../types';
import { getCampaigns, getCampaign, getCampaignContributions, contributeToCampaign, createCampaign, getCreatorCampaigns, getBackerContributions, getCreatorContributions } from '../services/campaignService';

export function useCampaigns(status?: Campaign['status']) {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const refresh = useCallback(() => {
    setLoading(true);
    getCampaigns(status).then(res => {
      if (res.success && res.data) setCampaigns(res.data);
      setLoading(false);
    });
  }, [status]);
  useEffect(() => { refresh(); }, [refresh]);
  return { campaigns, loading, refresh };
}

export function useCampaign(id: string) {
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState(true);
  const refresh = useCallback(() => {
    if (!id) { setLoading(false); return; }
    setLoading(true);
    getCampaign(id).then(res => {
      if (res.success && res.data) setCampaign(res.data);
      else setCampaign(null);
      setLoading(false);
    });
  }, [id]);
  useEffect(() => { refresh(); }, [refresh]);
  return { campaign, loading, refresh };
}

export function useCampaignContributions(campaignId: string) {
  const [contributions, setContributions] = useState<CampaignContribution[]>([]);
  const refresh = useCallback(() => {
    getCampaignContributions(campaignId).then(res => {
      if (res.success && res.data) setContributions(res.data);
    });
  }, [campaignId]);
  useEffect(() => { refresh(); }, [refresh]);
  return { contributions, refresh };
}

export function useCreatorCampaigns(address: string) {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const refresh = useCallback(() => {
    setLoading(true);
    getCreatorCampaigns(address).then(res => {
      if (res.success && res.data) setCampaigns(res.data);
      setLoading(false);
    });
  }, [address]);
  useEffect(() => { refresh(); }, [refresh]);
  return { campaigns, loading, refresh };
}

export function useBackerContributions(address: string) {
  const [contributions, setContributions] = useState<CampaignContribution[]>([]);
  const [loading, setLoading] = useState(true);
  const refresh = useCallback(() => {
    setLoading(true);
    getBackerContributions(address).then(res => {
      if (res.success && res.data) setContributions(res.data);
      setLoading(false);
    });
  }, [address]);
  useEffect(() => { refresh(); }, [refresh]);
  return { contributions, loading, refresh };
}

export function useCreatorContributions(address: string) {
  const [contributions, setContributions] = useState<CampaignContribution[]>([]);
  const [loading, setLoading] = useState(true);
  const refresh = useCallback(() => {
    if (!address) { setContributions([]); setLoading(false); return; }
    setLoading(true);
    getCreatorContributions(address).then(res => {
      if (res.success && res.data) setContributions(res.data);
      setLoading(false);
    });
  }, [address]);
  useEffect(() => { refresh(); }, [refresh]);
  return { contributions, loading, refresh };
}
