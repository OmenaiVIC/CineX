/**
 * feedService.ts
 * ==============
 * User activity feed.
 *
 * Public methods:
 *   getFeed(params)         — paginated global feed
 *   getUserFeed(address)    — feed scoped to a single user
 *   publishEvent(event)     — add a new feed event (mock only)
 */

import type { ServiceResponse, FeedEvent, PaginatedResponse, PaginationParams } from "../types";

interface UserSession {
  isUserSignedIn(): boolean;
  loadUserData(): { profile: { stxAddress: { testnet: string; mainnet: string } } };
}

// ---------------------------------------------------------------------------
// Sample data — reverse-chronological
// ---------------------------------------------------------------------------
const MOCK_EVENTS: FeedEvent[] = [
  {
    id: "evt-6",
    type: "campaign_funded",
    actor: "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM",
    targetId: "campaign-12",
    summary: "Campaign 'Voices of the Valley' reached its funding goal!",
    metadata: { amount: "50000000000" },
    createdAt: Date.now() - 86_400_000 * 1,
  },
  {
    id: "evt-5",
    type: "milestone_reached",
    actor: "SP3X6QWWETNB4GB6B6W6Z1S2SQE3X6QWWETNB4GB",
    targetId: "campaign-7",
    summary: "Pre-production milestone completed for 'Beyond the Horizon'.",
    metadata: { milestoneId: "ms-1" },
    createdAt: Date.now() - 86_400_000 * 2,
  },
  {
    id: "evt-4",
    type: "pool_formed",
    actor: "ST2VTFJEEJQN93Z6P3AFF6QN7M3WXY85ZPNDR3G51",
    targetId: "pool-3",
    summary: "New pool 'Music Video Super-Pool' has been created.",
    createdAt: Date.now() - 86_400_000 * 3,
  },
  {
    id: "evt-3",
    type: "rating_received",
    actor: "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM",
    targetId: "rating-1",
    summary: "You received a 5-star rating from Bob Producer!",
    metadata: { score: 5 },
    createdAt: Date.now() - 86_400_000 * 3,
  },
  {
    id: "evt-2",
    type: "verification_granted",
    actor: "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM",
    summary: "Congratulations! You are now a verified filmmaker.",
    createdAt: Date.now() - 86_400_000 * 14,
  },
  {
    id: "evt-1",
    type: "campaign_created",
    actor: "SP3X6QWWETNB4GB6B6W6Z1S2SQE3X6QWWETNB4GB",
    targetId: "campaign-12",
    summary: "New campaign 'Voices of the Valley' is live.",
    metadata: { targetAmount: "50000000000" },
    createdAt: Date.now() - 86_400_000 * 20,
  },
];

export class FeedService {
  private userSession: UserSession | null;

  constructor(userSession: UserSession | null) {
    this.userSession = userSession;
  }

  /**
   * getFeed
   * -------
   * Paginated global feed of all events.
   * @param params - Optional pagination & type filter
   */
  async getFeed(params?: { type?: FeedEvent["type"] } & PaginationParams): Promise<ServiceResponse<PaginatedResponse<FeedEvent>>> {
    let filtered = [...MOCK_EVENTS];
    if (params?.type) filtered = filtered.filter((e) => e.type === params.type);

    filtered.sort((a, b) => b.createdAt - a.createdAt);

    const page  = params?.page ?? 1;
    const limit = params?.limit ?? 10;
    const total = filtered.length;
    const start = (page - 1) * limit;

    return {
      success: true,
      data: {
        items: filtered.slice(start, start + limit),
        totalItems: total,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
        hasNext: start + limit < total,
        hasPrevious: page > 1,
      },
    };
  }

  /**
   * getUserFeed
   * -----------
   * Feed scoped to events involving a specific address.
   * @param address - Filter by this address (actor or target)
   * @param params  - Optional pagination
   */
  async getUserFeed(address: string, params?: PaginationParams): Promise<ServiceResponse<PaginatedResponse<FeedEvent>>> {
    const userEvents = MOCK_EVENTS.filter(
      (e) => e.actor === address || e.targetId?.startsWith(address),
    );
    const page  = params?.page ?? 1;
    const limit = params?.limit ?? 10;
    const total = userEvents.length;
    const start = (page - 1) * limit;

    return {
      success: true,
      data: {
        items: userEvents.slice(start, start + limit),
        totalItems: total,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
        hasNext: start + limit < total,
        hasPrevious: page > 1,
      },
    };
  }

  /**
   * publishEvent
   * ------------
   * Add a new event to the feed.  Mock only — in-memory append.
   * @param event - FeedEvent (id is auto-generated if omitted)
   */
  async publishEvent(event: Omit<FeedEvent, "id">): Promise<ServiceResponse<FeedEvent>> {
    const newEvent: FeedEvent = { ...event, id: `evt-${Date.now()}` };
    // In a real backend this would POST to the API
    return { success: true, data: newEvent, transactionId: `mock_tx_${Date.now()}` };
  }
}

export function createFeedService(us: UserSession | null): FeedService {
  return new FeedService(us);
}
