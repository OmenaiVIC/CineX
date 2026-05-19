/**
 * poolService.ts
 * ==============
 * Investment / collaboration pool service distinct from the Co-EP rotating
 * funding pools.  These are fixed-term pools where members commit STX and
 * receive proportional returns when the pool's campaign succeeds.
 *
 * Public methods:
 *   getPools(filters)       — list pools with optional filters
 *   getPoolDetails(id)      — single pool
 *   createPool(params)      — deploy a new pool
 *   joinPool(poolId)        — request membership
 *   getPoolMembers(poolId)  — list pool participants
 */

import type { ServiceResponse, PaginatedResponse, PaginationParams } from "../types";

interface UserSession {
  isUserSignedIn(): boolean;
  loadUserData(): { profile: { stxAddress: { testnet: string; mainnet: string } } };
}

// ---------------------------------------------------------------------------
// Local types (not yet in the central types file)
// ---------------------------------------------------------------------------
export interface InvestmentPool {
  id: string;
  name: string;
  description: string;
  creator: string;
  targetAmount: string;     // microSTX
  currentAmount: string;    // microSTX
  minCommitment: string;    // microSTX
  maxMembers: number;
  currentMembers: number;
  deadline: number;         // Unix ms
  category: string;
  status: "open" | "active" | "funded" | "closed";
  createdAt: number;
  returnRate?: string;      // e.g. "1.15" = 15% projected return
}

export interface PoolMember {
  address: string;
  committed: string;        // microSTX
  joinedAt: number;
  role: "creator" | "member";
}

// ---------------------------------------------------------------------------
// Sample data
// ---------------------------------------------------------------------------
const MOCK_POOLS: InvestmentPool[] = [
  {
    id: "pool-1",
    name: "Short Film Collective Q3",
    description: "Pool to fund 5 short films in Q3.  Returns distributed after festival submissions.",
    creator: "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM",
    targetAmount: "50000000000",      // 50 000 STX
    currentAmount: "32000000000",     // 32 000 STX
    minCommitment: "1000000000",      // 1 000 STX
    maxMembers: 10,
    currentMembers: 6,
    deadline: Date.now() + 86_400_000 * 30,
    category: "short-film",
    status: "open",
    createdAt: Date.now() - 86_400_000 * 10,
    returnRate: "1.15",
  },
  {
    id: "pool-2",
    name: "Docu-series Launch",
    description: "First-of-its-kind documentary series about African tech hubs.",
    creator: "SP3X6QWWETNB4GB6B6W6Z1S2SQE3X6QWWETNB4GB",
    targetAmount: "100000000000",     // 100 000 STX
    currentAmount: "100000000000",    // fully funded
    minCommitment: "5000000000",      // 5 000 STX
    maxMembers: 8,
    currentMembers: 8,
    deadline: Date.now() - 86_400_000 * 5,
    category: "documentary",
    status: "funded",
    createdAt: Date.now() - 86_400_000 * 40,
    returnRate: "1.20",
  },
  {
    id: "pool-3",
    name: "Music Video Super-Pool",
    description: "Pool dedicated to music videos for emerging Afrobeats artists.",
    creator: "ST2VTFJEEJQN93Z6P3AFF6QN7M3WXY85ZPNDR3G51",
    targetAmount: "25000000000",      // 25 000 STX
    currentAmount: "8000000000",      // 8 000 STX
    minCommitment: "500000000",       // 500 STX
    maxMembers: 15,
    currentMembers: 4,
    deadline: Date.now() + 86_400_000 * 60,
    category: "music-video",
    status: "open",
    createdAt: Date.now() - 86_400_000 * 3,
    returnRate: "1.10",
  },
];

const MOCK_MEMBERS: Record<string, PoolMember[]> = {
  "pool-1": [
    { address: "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM", committed: "5000000000", joinedAt: Date.now() - 86_400_000 * 9, role: "creator" },
    { address: "SP3X6QWWETNB4GB6B6W6Z1S2SQE3X6QWWETNB4GB", committed: "3000000000", joinedAt: Date.now() - 86_400_000 * 8, role: "member" },
    { address: "ST2VTFJEEJQN93Z6P3AFF6QN7M3WXY85ZPNDR3G51", committed: "1000000000", joinedAt: Date.now() - 86_400_000 * 5, role: "member" },
  ],
};

export class PoolService {
  private userSession: UserSession | null;

  constructor(userSession: UserSession | null) {
    this.userSession = userSession;
  }

  /**
   * getPools
   * --------
   * List investment pools with optional category / status filtering.
   * @param params - Pagination + optional filters
   */
  async getPools(params?: { category?: string; status?: string } & PaginationParams): Promise<ServiceResponse<PaginatedResponse<InvestmentPool>>> {
    let filtered = [...MOCK_POOLS];
    if (params?.category)  filtered = filtered.filter((p) => p.category === params.category);
    if (params?.status)    filtered = filtered.filter((p) => p.status === params.status);

    const page    = params?.page ?? 1;
    const limit   = params?.limit ?? 10;
    const total   = filtered.length;
    const start   = (page - 1) * limit;
    const items   = filtered.slice(start, start + limit);

    return {
      success: true,
      data: { items, totalItems: total, totalPages: Math.ceil(total / limit), currentPage: page, hasNext: start + limit < total, hasPrevious: page > 1 },
    };
  }

  /**
   * getPoolDetails
   * --------------
   * Get full details for a single pool by id.
   */
  async getPoolDetails(poolId: string): Promise<ServiceResponse<InvestmentPool>> {
    const pool = MOCK_POOLS.find((p) => p.id === poolId);
    if (!pool) return { success: false, error: "Pool not found" };
    return { success: true, data: pool };
  }

  /**
   * createPool
   * ----------
   * Create a new investment pool (mock only).
   * @param params - Pool creation parameters
   */
  async createPool(params: Partial<InvestmentPool>): Promise<ServiceResponse<InvestmentPool>> {
    const pool: InvestmentPool = {
      id: `pool-${Date.now()}`,
      name: params.name ?? "New Pool",
      description: params.description ?? "",
      creator: this.userSession?.loadUserData()?.profile?.stxAddress?.testnet ?? "unknown",
      targetAmount: params.targetAmount ?? "10000000000",
      currentAmount: "0",
      minCommitment: params.minCommitment ?? "100000000",
      maxMembers: params.maxMembers ?? 10,
      currentMembers: 1,
      deadline: params.deadline ?? Date.now() + 86_400_000 * 30,
      category: params.category ?? "short-film",
      status: "open",
      createdAt: Date.now(),
      returnRate: params.returnRate,
    };
    return { success: true, data: pool, transactionId: `mock_tx_${Date.now()}` };
  }

  /**
   * joinPool
   * --------
   * Request to join a pool.  Mock only.
   * @param poolId - Target pool id
   * @param amount - STX commitment in microSTX
   */
  async joinPool(poolId: string, amount: string): Promise<ServiceResponse<{ poolId: string; address: string; amount: string }>> {
    return {
      success: true,
      data: { poolId, address: "mock_address", amount },
      transactionId: `mock_tx_${Date.now()}`,
    };
  }

  /**
   * getPoolMembers
   * --------------
   * List all members of a pool.
   */
  async getPoolMembers(poolId: string): Promise<ServiceResponse<PoolMember[]>> {
    return { success: true, data: MOCK_MEMBERS[poolId] ?? [] };
  }
}

export function createPoolService(us: UserSession | null): PoolService {
  return new PoolService(us);
}
