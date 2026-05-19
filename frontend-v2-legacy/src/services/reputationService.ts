/**
 * reputationService.ts
 * ====================
 * Peer-to-peer reputation / rating service.
 *
 * Public methods:
 *   getProfileRatings(address)  — all ratings for a user
 *   getAverageRating(address)   — aggregate score (0–5)
 *   submitRating(ratee, score)  — leave a rating (mock only)
 *   getRatingSummary(address)   — breakdown counts per score
 */

import type { ServiceResponse, Rating } from "../types";

/** Lightweight session shape; same interface as the real StacksAuthContext */
interface UserSession {
  isUserSignedIn(): boolean;
  loadUserData(): { profile: { stxAddress: { testnet: string; mainnet: string } } };
}

// ---------------------------------------------------------------------------
// Sample data – returned when no real backend is wired
// ---------------------------------------------------------------------------
const MOCK_RATINGS: Rating[] = [
  {
    id: "rating-1",
    rater: "SP3X6QWWETNB4GB6B6W6Z1S2SQE3X6QWWETNB4GB",
    ratee: "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM",
    score: 5,
    review: "Amazing collaborator, delivered all milestones on time.",
    category: "collaboration",
    createdAt: Date.now() - 86_400_000 * 3,
    projectId: "campaign-7",
  },
  {
    id: "rating-2",
    rater: "ST2VTFJEEJQN93Z6P3AFF6QN7M3WXY85ZPNDR3G51",
    ratee: "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM",
    score: 4,
    review: "Great communication, would work together again.",
    category: "reliability",
    createdAt: Date.now() - 86_400_000 * 14,
    projectId: "campaign-12",
  },
  {
    id: "rating-3",
    rater: "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM",
    ratee: "SP3X6QWWETNB4GB6B6W6Z1S2SQE3X6QWWETNB4GB",
    score: 3,
    review: "Good work but communication could be better.",
    category: "communication",
    createdAt: Date.now() - 86_400_000 * 7,
  },
];

export class ReputationService {
  private userSession: UserSession | null;

  constructor(userSession: UserSession | null) {
    this.userSession = userSession;
  }

  /**
   * getProfileRatings
   * -----------------
   * Return every rating where the given address is the ratee.
   * @param address - Stacks address to look up
   */
  async getProfileRatings(address: string): Promise<ServiceResponse<Rating[]>> {
    const ratings = MOCK_RATINGS.filter((r) => r.ratee === address);
    return { success: true, data: ratings };
  }

  /**
   * getAverageRating
   * ----------------
   * Compute the arithmetic mean of all scores for an address.
   * Returns 0 when no ratings exist.
   * @param address - Stacks address
   */
  async getAverageRating(address: string): Promise<ServiceResponse<number>> {
    const ratings = MOCK_RATINGS.filter((r) => r.ratee === address);
    if (ratings.length === 0) return { success: true, data: 0 };
    const avg = ratings.reduce((s, r) => s + r.score, 0) / ratings.length;
    return { success: true, data: Math.round(avg * 100) / 100 };
  }

  /**
   * submitRating
   * ------------
   * Submit a new rating.  Currently mock-only — always succeeds.
   * @param ratee   - Stacks address being rated
   * @param score   - 1 – 5
   * @param review  - Optional text
   * @param category - Optional category tag
   */
  async submitRating(
    ratee: string,
    score: number,
    review?: string,
    category?: string,
  ): Promise<ServiceResponse<Rating>> {
    const rating: Rating = {
      id: `rating-${Date.now()}`,
      rater: this.userSession?.loadUserData()?.profile?.stxAddress?.testnet ?? "unknown",
      ratee,
      score,
      review,
      category,
      createdAt: Date.now(),
    };
    return { success: true, data: rating, transactionId: `mock_tx_${Date.now()}` };
  }

  /**
   * getRatingSummary
   * ----------------
   * Return a count of ratings per score level (1–5).
   * @param address - Stacks address
   */
  async getRatingSummary(address: string): Promise<ServiceResponse<Record<number, number>>> {
    const ratings = MOCK_RATINGS.filter((r) => r.ratee === address);
    const summary: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    for (const r of ratings) {
      summary[r.score] = (summary[r.score] ?? 0) + 1;
    }
    return { success: true, data: summary };
  }
}

/**
 * Factory — wraps the class so callers don't need `new`.
 */
export function createReputationService(us: UserSession | null): ReputationService {
  return new ReputationService(us);
}
