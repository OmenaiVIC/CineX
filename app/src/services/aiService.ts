import type { CredibilitySummary, ServiceResponse } from '../types';
import { getDemoData, setDemoData } from '../contexts/DemoStorage';

function generateSummary(address: string): string {
  const data = getDemoData();
  const profile = data.profiles.find(p => p.address === address);
  const ratings = data.ratings.filter(r => r.ratee === address);
  const campaigns = data.campaigns.filter(c => c.creator === address);
  const allMilestones = data.milestones.filter(m => campaigns.some(c => c.campaignId === m.campaignId));

  const name = profile?.displayName || address.slice(0, 10) + '...';
  const ratingCount = ratings.length;
  const avgRating = ratingCount > 0
    ? (ratings.reduce((s, r) => s + r.score, 0) / ratingCount).toFixed(1)
    : 'N/A';
  const activeCampaigns = campaigns.filter(c => c.status === 'active').length;
  const fundedCampaigns = campaigns.filter(c => c.status === 'funded' || c.status === 'completed').length;
  const totalRaised = campaigns.reduce((s, c) => s + Number(c.currentAmount), 0);
  const completedMilestones = allMilestones.filter(m => m.status === 'completed').length;
  const totalMilestones = allMilestones.length;
  const milestoneRate = totalMilestones > 0
    ? Math.round((completedMilestones / totalMilestones) * 100)
    : 0;

  const categoryBreakdown: Record<string, number[]> = {};
  for (const r of ratings) {
    const cat = r.category || 'general';
    if (!categoryBreakdown[cat]) categoryBreakdown[cat] = [];
    categoryBreakdown[cat].push(r.score);
  }
  const strengths = Object.entries(categoryBreakdown)
    .map(([cat, scores]) => ({ cat, avg: scores.reduce((s, c) => s + c, 0) / scores.length }))
    .sort((a, b) => b.avg - a.avg)
    .slice(0, 2)
    .map(s => `${s.cat} (${s.avg.toFixed(1)})`);

  const successProb = Math.min(95, 50 + fundedCampaigns * 10 + milestoneRate * 0.2 + (avgRating !== 'N/A' ? (Number(avgRating) - 3) * 15 : 0));

  const parts: string[] = [];
  parts.push(`${name} has ${fundedCampaigns > 0 ? `${fundedCampaigns} successfully funded campaign${fundedCampaigns > 1 ? 's' : ''}` : 'no funded campaigns yet'}`);

  if (ratingCount > 0) {
    parts.push(`with ${ratingCount} peer rating${ratingCount > 1 ? 's' : ''} averaging ${avgRating}/5`);
    if (strengths.length > 0) {
      parts.push(`particularly strong in ${strengths.join(' and ')}`);
    }
  }

  if (totalRaised > 0) {
    parts.push(`Total funds raised: ₦${totalRaised.toLocaleString()}`);
  }

  if (totalMilestones > 0) {
    parts.push(`Milestone completion: ${completedMilestones}/${totalMilestones} (${milestoneRate}%)`);
  }

  if (activeCampaigns > 0) {
    parts.push(`Currently running ${activeCampaigns} active campaign${activeCampaigns > 1 ? 's' : ''}`);
  }

  parts.push(`Model predicts ${Math.round(successProb)}% probability of successful delivery based on historical performance.`);

  return parts.join('. ') + '.';
}

export function getCredibilitySummary(address: string): ServiceResponse<CredibilitySummary> {
  const data = getDemoData();
  const existing = data.credibilitySummaries.find(c => c.address === address);
  if (existing) {
    return { success: true, data: existing };
  }

  const summary: CredibilitySummary = {
    address,
    summary: generateSummary(address),
    generatedAt: new Date().toISOString(),
    model: 'CineX Credibility v1.0',
    disclaimer: 'AI-generated summary based on on-chain history and peer ratings. Not financial advice.',
  };

  data.credibilitySummaries.push(summary);
  setDemoData(data);
  return { success: true, data: summary };
}

export function refreshCredibilitySummary(address: string): ServiceResponse<CredibilitySummary> {
  const data = getDemoData();
  const idx = data.credibilitySummaries.findIndex(c => c.address === address);
  const summary: CredibilitySummary = {
    address,
    summary: generateSummary(address),
    generatedAt: new Date().toISOString(),
    model: 'CineX Credibility v1.0',
    disclaimer: 'AI-generated summary based on on-chain history and peer ratings. Not financial advice.',
  };

  if (idx >= 0) {
    data.credibilitySummaries[idx] = summary;
  } else {
    data.credibilitySummaries.push(summary);
  }
  setDemoData(data);
  return { success: true, data: summary };
}
