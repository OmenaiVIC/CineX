/**
 * aiService.ts
 * ============
 * AI-powered features: recommendations, matchmaking, content analysis.
 *
 * Public methods:
 *   getRecommendations(address)      — suggested campaigns / pools to explore
 *   getMatchSuggestions(profile)     — potential collaborators
 *   analyzeProjectDescription(text)  — extract tags, category, sentiment
 */

import type { ServiceResponse, Campaign, CoEPPool, CredibilitySummary } from "../types";

interface UserSession {
  isUserSignedIn(): boolean;
  loadUserData(): { profile: { stxAddress: { testnet: string; mainnet: string } } };
}

// ---------------------------------------------------------------------------
// Sample recommendations
// ---------------------------------------------------------------------------
type RecommendationItem = Partial<Campaign | CoEPPool> & { reason: string; matchScore: number };

const MOCK_RECOMMENDATIONS: RecommendationItem[] = [
  {
    id: "campaign-12",
    title: "Voices of the Valley",
    reason: "Matches your interest in documentary filmmaking",
    matchScore: 92,
  },
  {
    id: "pool-1",
    name: "Short Film Collective Q3",
    reason: "You collaborated on short films before — great fit!",
    matchScore: 88,
  },
  {
    id: "campaign-7",
    title: "Beyond the Horizon",
    reason: "Popular campaign with a 4.8 average rating",
    matchScore: 76,
  },
  {
    id: "pool-3",
    name: "Music Video Super-Pool",
    reason: "Low entry barrier (500 STX minimum)",
    matchScore: 71,
  },
];

// ---------------------------------------------------------------------------
// Sample match suggestions
// ---------------------------------------------------------------------------
interface MatchSuggestion {
  address: string;
  displayName: string;
  commonInterests: string[];
  matchScore: number;
  reason: string;
}

const MOCK_MATCHES: MatchSuggestion[] = [
  {
    address: "SP3X6QWWETNB4GB6B6W6Z1S2SQE3X6QWWETNB4GB",
    displayName: "Bob Producer",
    commonInterests: ["documentary", "short-film"],
    matchScore: 85,
    reason: "Bob is looking for an editor for his upcoming feature.",
  },
  {
    address: "ST2VTFJEEJQN93Z6P3AFF6QN7M3WXY85ZPNDR3G51",
    displayName: "Carol Editor",
    commonInterests: ["music-video", "post-production"],
    matchScore: 72,
    reason: "Carol's editing style complements your directing portfolio.",
  },
];

export class AiService {
  private userSession: UserSession | null;

  constructor(userSession: UserSession | null) {
    this.userSession = userSession;
  }

  /**
   * getRecommendations
   * ------------------
   * Return personalised campaigns/pools for a given address.
   * @param address - Stacks address to generate recommendations for
   */
  async getRecommendations(address: string): Promise<ServiceResponse<RecommendationItem[]>> {
    return { success: true, data: MOCK_RECOMMENDATIONS };
  }

  /**
   * getMatchSuggestions
   * -------------------
   * Return potential collaborators for the given profile.
   * @param profile - A partial profile object with interests / categories
   */
  async getMatchSuggestions(profile?: { categories?: string[]; address?: string }): Promise<ServiceResponse<MatchSuggestion[]>> {
    return { success: true, data: MOCK_MATCHES };
  }

  /**
   * analyzeProjectDescription
   * -------------------------
   * Send a project description for mock AI analysis.
   * Returns predicted category, suggested tags, and a brief summary.
   * @param text - Free-text project description
   */
  async analyzeProjectDescription(text: string): Promise<ServiceResponse<{ category: string; tags: string[]; summary: string; sentiment: "positive" | "neutral" | "negative" }>> {
    // Basic keyword sniffing as a stand-in for real AI
    const lower = text.toLowerCase();
    let category = "short-film";
    if (lower.includes("document") || lower.includes("docu")) category = "documentary";
    else if (lower.includes("music") || lower.includes("video")) category = "music-video";

    const tags = lower.split(" ").filter((w) => w.length > 5).slice(0, 5);

    return {
      success: true,
      data: {
        category,
        tags,
        summary: `Analysis complete: detected "${category}" project with ${tags.length} suggested tags.`,
        sentiment: "positive",
      },
    };
  }

  /**
   * getCredibilitySummary
   * ---------------------
   * Return an AI-generated credibility assessment for a user.
   * In mock mode, returns a simulated response after a short delay.
   * @param address - Stacks address to assess
   */
  async getCredibilitySummary(address: string): Promise<ServiceResponse<CredibilitySummary>> {
    await new Promise(r => setTimeout(r, 300));
    return {
      success: true,
      data: {
        address,
        summary: 'Mock assessment: This creator has 3 completed projects and a strong on-chain reputation score of 42. Peers rate them highly for collaboration and timely delivery. Their portfolio shows consistent engagement in the short-film and documentary space.',
        generatedAt: new Date().toISOString(),
        model: 'mock',
        disclaimer: 'This is a mock summary for development purposes.',
      },
    };
  }
}

export function createAiService(us: UserSession | null): AiService {
  return new AiService(us);
}
