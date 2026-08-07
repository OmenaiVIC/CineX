import type {
  Campaign,
  Contribution,
  Milestone,
  PortfolioCategory,
  PortfolioItem,
  Role,
  Transaction,
  User,
  Wallet,
  BackendRole,
  BackendVerificationLevel,
  ProfileRow,
  PortfolioItemRow,
  RatingSummary,
  SessionUser,
  WalletTransactionRow,
} from "./cinex-types";
import {
  BACKEND_TO_CATEGORY,
  BACKEND_TO_ROLE,
  BACKEND_TO_TX_STATUS,
  coverToneFor,
  parseNumber,
  ROLE_TO_BACKEND,
  verificationTierFromLevel,
} from "./cinex-types";
import { get, post, put, setAuthToken, clearAuthToken, getAuthToken } from "./api";

// ---------------------------------------------------------------------------
// Data plane abstraction. The store is a thin orchestrator over whichever
// DataSource is active; components only ever import useStore/StoreProvider.
// ---------------------------------------------------------------------------

export type DataMode = "mock" | "live";

export interface StoreSnapshot {
  user: User | null;
  creatives: User[];
  backers: User[];
  campaigns: Campaign[];
  wallet: Wallet;
}

const KEY = "cinex-state-v2";

const uid = () => Math.random().toString(36).slice(2, 10);

const demoCreatives: User[] = [
  {
    id: "c-amara",
    name: "Amara Okonkwo",
    email: "amara@cinex.africa",
    role: "Creative",
    verificationTier: "Standard",
    reputationScore: 862,
    bio: "Lagos-based director working on speculative West African cinema.",
    portfolio: [
      {
        id: uid(),
        title: "Harmattan Light",
        description: "Short film exploring migration through the eyes of a Kano photographer.",
        mediaUrl: "https://youtube.com/watch?v=harmattan",
        year: 2024,
        category: "Film",
      },
    ],
    endorsements: [
      {
        id: uid(),
        endorserName: "Guild of Nigerian Cinematographers",
        letter: "Amara has consistently delivered on schedule across three guild-backed productions.",
        url: "https://guild.example/endorsements/amara",
        timestamp: "2026-03-14T10:12:00.000Z",
        creativeId: "c-amara",
      },
    ],
  },
  {
    id: "c-thabo",
    name: "Thabo Nkosi",
    email: "thabo@cinex.africa",
    role: "Creative",
    verificationTier: "Basic",
    reputationScore: 604,
    bio: "Johannesburg producer blending amapiano with orchestral scoring.",
    portfolio: [],
    endorsements: [],
  },
  {
    id: "c-fatou",
    name: "Fatou Diallo",
    email: "fatou@cinex.africa",
    role: "Creative",
    verificationTier: "Unverified",
    reputationScore: 318,
    bio: "Dakar fashion designer building adaptive textile collections.",
    portfolio: [],
    endorsements: [],
  },
];

const demoBackers: User[] = [
  {
    id: "b-nomsa",
    name: "Nomsa Khumalo",
    email: "nomsa@cinex.africa",
    role: "Backer",
    verificationTier: "Unverified",
    reputationScore: 0,
    bio: "Curator and first-round backer of African independent cinema.",
    portfolio: [],
    endorsements: [],
  },
  {
    id: "b-kofi",
    name: "Kofi Mensah",
    email: "kofi@cinex.africa",
    role: "Backer",
    verificationTier: "Unverified",
    reputationScore: 0,
    bio: "Angel investor focused on music-tech and fashion ateliers.",
    portfolio: [],
    endorsements: [],
  },
  {
    id: "b-zanele",
    name: "Zanele Mokoena",
    email: "zanele@cinex.africa",
    role: "Backer",
    verificationTier: "Unverified",
    reputationScore: 0,
    bio: "Impact investor backing pan-African creative productions.",
    portfolio: [],
    endorsements: [],
  },
];

const contrib = (userId: string, userName: string, amount: number): Contribution => ({
  userId,
  userName,
  amount,
  timestamp: "2026-07-20T08:00:00.000Z",
});

const demoCampaigns: Campaign[] = [
  {
    id: "cmp-harmattan",
    title: "Harmattan Season",
    description:
      "A feature-length drama tracing three families across the Sahel during the dry season. Shot on location in Kano and Agadez.",
    fundingTarget: 48000,
    raised: 31200,
    creatorId: "c-amara",
    creatorName: "Amara Okonkwo",
    category: "Film",
    coverTone: "from-emerald-500/25 to-cyan-500/10",
    contributions: [
      contrib("b-nomsa", "Nomsa Khumalo", 3000),
      contrib("b-kofi", "Kofi Mensah", 8000),
      contrib("b-zanele", "Zanele Mokoena", 20200),
    ],
    milestones: [
      {
        id: uid(),
        description: "Pre-production, casting and location scouting",
        amount: 12000,
        status: "Released",
        votes: { yes: 3, no: 0, yesAmount: 31200, noAmount: 0 },
        voters: { "b-nomsa": "yes", "b-kofi": "yes", "b-zanele": "yes" },
      },
      {
        id: uid(),
        description: "Principal photography — 21 shooting days",
        amount: 21000,
        status: "Approved",
        votes: { yes: 2, no: 1, yesAmount: 28200, noAmount: 3000 },
        voters: { "b-nomsa": "no", "b-kofi": "yes", "b-zanele": "yes" },
      },
      {
        id: uid(),
        description: "Post-production, colour grade and score",
        amount: 15000,
        status: "Pending",
        votes: { yes: 1, no: 0, yesAmount: 3000, noAmount: 0 },
        voters: { "b-nomsa": "yes" },
      },
    ],
  },
  {
    id: "cmp-amapiano",
    title: "Amapiano Orchestral",
    description:
      "A twelve-track album pairing Soweto amapiano producers with a 30-piece string ensemble, recorded live.",
    fundingTarget: 22000,
    raised: 8400,
    creatorId: "c-thabo",
    creatorName: "Thabo Nkosi",
    category: "Music",
    coverTone: "from-violet-500/25 to-emerald-500/10",
    contributions: [
      contrib("b-nomsa", "Nomsa Khumalo", 1200),
      contrib("b-kofi", "Kofi Mensah", 2000),
      contrib("b-zanele", "Zanele Mokoena", 5200),
    ],
    milestones: [
      {
        id: uid(),
        description: "Arrangement and studio booking",
        amount: 7000,
        status: "Approved",
        votes: { yes: 2, no: 1, yesAmount: 7200, noAmount: 1200 },
        voters: { "b-nomsa": "no", "b-kofi": "yes", "b-zanele": "yes" },
      },
      {
        id: uid(),
        description: "Live ensemble recording sessions",
        amount: 9000,
        status: "Pending",
        votes: { yes: 1, no: 0, yesAmount: 1200, noAmount: 0 },
        voters: { "b-nomsa": "yes" },
      },
      {
        id: uid(),
        description: "Mixing, mastering and release rollout",
        amount: 6000,
        status: "Pending",
        votes: { yes: 0, no: 0, yesAmount: 0, noAmount: 0 },
        voters: {},
      },
    ],
  },
  {
    id: "cmp-adire",
    title: "Adire Futures",
    description:
      "An adaptive-textile capsule collection reinterpreting Yoruba adire indigo dyeing for performance wear.",
    fundingTarget: 9500,
    raised: 9500,
    creatorId: "c-fatou",
    creatorName: "Fatou Diallo",
    category: "Fashion",
    coverTone: "from-amber-400/25 to-emerald-500/10",
    contributions: [contrib("b-kofi", "Kofi Mensah", 9500)],
    milestones: [
      {
        id: uid(),
        description: "Dye workshop residency and sampling",
        amount: 4500,
        status: "Released",
        votes: { yes: 1, no: 0, yesAmount: 9500, noAmount: 0 },
        voters: { "b-kofi": "yes" },
      },
      {
        id: uid(),
        description: "Production run and lookbook shoot",
        amount: 5000,
        status: "Disputed",
        votes: { yes: 0, no: 1, yesAmount: 0, noAmount: 9500 },
        voters: { "b-kofi": "no" },
      },
    ],
  },
];

const demoWallet: Wallet = {
  ngnBalance: 4820500,
  usdcxBalance: 3145.72,
  transactions: [
    {
      id: uid(),
      type: "Milestone disbursement — Harmattan Season",
      amount: 12000,
      currency: "USDCx",
      status: "Released",
      timestamp: "2026-07-28T09:30:00.000Z",
    },
    {
      id: uid(),
      type: "Escrow yield accrual (Bitflow)",
      amount: 184.4,
      currency: "USDCx",
      status: "Approved",
      timestamp: "2026-07-22T14:02:00.000Z",
    },
    {
      id: uid(),
      type: "NGN payout to GTBank ••4417",
      amount: 1850000,
      currency: "NGN",
      status: "Pending",
      timestamp: "2026-07-19T11:45:00.000Z",
    },
  ],
};

export const SEED_SNAPSHOT: StoreSnapshot = {
  user: null,
  creatives: demoCreatives,
  backers: demoBackers,
  campaigns: demoCampaigns,
  wallet: demoWallet,
};

export interface DataSource {
  readonly mode: DataMode;
  getSnapshot(): StoreSnapshot;
  subscribe(listener: () => void): () => void;
  hydrate(): Promise<void> | void;
  register(data: { name: string; email: string; role: Role }): Promise<boolean>;
  login(email: string): Promise<boolean>;
  logout(): Promise<void> | void;
  updateUser(patch: Partial<User>): Promise<void> | void;
  addPortfolioItem(item: Omit<PortfolioItem, "id">): Promise<void> | void;
  updatePortfolioItem(id: string, item: Omit<PortfolioItem, "id">): Promise<void> | void;
  deletePortfolioItem(id: string): Promise<void> | void;
  addCampaign(data: {
    title: string;
    description: string;
    fundingTarget: number;
    mediaUrl?: string;
    category: PortfolioCategory | "";
    milestones: { description: string; amount: number }[];
  }): string;
  contribute(campaignId: string, amount: number): boolean;
  voteMilestone(campaignId: string, milestoneId: string, vote: "yes" | "no"): boolean;
  addTransaction(t: Omit<Transaction, "id" | "timestamp">): void;
}

export class MockDataSource implements DataSource {
  readonly mode: DataMode = "mock";
  private state: StoreSnapshot;
  private listeners = new Set<() => void>();

  constructor(initial: StoreSnapshot = SEED_SNAPSHOT) {
    this.state = initial;
  }

  getSnapshot() {
    return this.state;
  }

  subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  hydrate() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as StoreSnapshot;
        this.state = { ...SEED_SNAPSHOT, ...parsed };
      }
    } catch {
      /* ignore corrupt storage */
    }
    this.persist();
    this.notify();
  }

  private contributionOf(campaign: Campaign, userId: string) {
    return campaign.contributions
      .filter((c) => c.userId === userId)
      .reduce((sum, c) => sum + c.amount, 0);
  }

  private persist() {
    try {
      localStorage.setItem(KEY, JSON.stringify(this.state));
    } catch {
      /* storage full or unavailable */
    }
  }

  private notify() {
    for (const listener of this.listeners) listener();
  }

  async register({ name, email, role }: { name: string; email: string; role: Role }): Promise<boolean> {
    const user: User = {
      id: uid(),
      name,
      email,
      role,
      verificationTier: "Unverified",
      reputationScore: role === "Creative" ? 120 : 0,
      bio: "",
      portfolio: [],
      endorsements: [],
    };
    if (role === "Creative") {
      this.state = { ...this.state, user, creatives: [user, ...this.state.creatives] };
    } else {
      this.state = { ...this.state, user, backers: [user, ...this.state.backers] };
    }
    this.persist();
    this.notify();
    return true;
  }

  async login(email: string): Promise<boolean> {
    const norm = email.trim().toLowerCase();
    const match =
      this.state.creatives.find((c) => c.email.toLowerCase() === norm) ??
      this.state.backers.find((b) => b.email.toLowerCase() === norm) ??
      (this.state.user && this.state.user.email.toLowerCase() === norm ? this.state.user : null);
    if (!match) return false;
    this.state = { ...this.state, user: match };
    this.persist();
    this.notify();
    return true;
  }

  logout(): void {
    this.state = { ...this.state, user: null };
    this.persist();
    this.notify();
  }

  updateUser(patch: Partial<User>): void {
    if (!this.state.user) return;
    const next = { ...this.state.user, ...patch };
    this.state = {
      ...this.state,
      user: next,
      creatives: this.state.creatives.map((c) => (c.id === next.id ? next : c)),
      backers: this.state.backers.map((b) => (b.id === next.id ? next : b)),
    };
    this.persist();
    this.notify();
  }

  addPortfolioItem(item: Omit<PortfolioItem, "id">): void {
    if (!this.state.user) return;
    this.updateUser({ portfolio: [{ ...item, id: uid() }, ...this.state.user.portfolio] });
  }

  updatePortfolioItem(id: string, item: Omit<PortfolioItem, "id">): void {
    if (!this.state.user) return;
    this.updateUser({
      portfolio: this.state.user.portfolio.map((p) => (p.id === id ? { ...item, id } : p)),
    });
  }

  deletePortfolioItem(id: string): void {
    if (!this.state.user) return;
    this.updateUser({ portfolio: this.state.user.portfolio.filter((p) => p.id !== id) });
  }

  addCampaign({
    title,
    description,
    fundingTarget,
    mediaUrl,
    category,
    milestones,
  }: {
    title: string;
    description: string;
    fundingTarget: number;
    mediaUrl?: string;
    category: PortfolioCategory | "";
    milestones: { description: string; amount: number }[];
  }): string {
    const id = `cmp-${uid()}`;
    if (!this.state.user) return id;
    const campaign: Campaign = {
      id,
      title,
      description,
      fundingTarget,
      raised: 0,
      creatorId: this.state.user.id,
      creatorName: this.state.user.name,
      category: category || "Other",
      coverTone: coverToneFor(category || "Other"),
      mediaUrl,
      contributions: [],
      milestones: milestones.map<Milestone>((m) => ({
        id: uid(),
        description: m.description,
        amount: m.amount,
        status: "Pending",
        votes: { yes: 0, no: 0, yesAmount: 0, noAmount: 0 },
        voters: {},
      })),
    };
    this.state = { ...this.state, campaigns: [campaign, ...this.state.campaigns] };
    this.persist();
    this.notify();
    return id;
  }

  contribute(campaignId: string, amount: number): boolean {
    if (!this.state.user || this.state.user.role !== "Backer" || amount <= 0) return false;
    const campaign = this.state.campaigns.find((c) => c.id === campaignId);
    if (!campaign) return false;
    const remaining = campaign.fundingTarget - campaign.raised;
    if (remaining <= 0 || amount > remaining) return false;
    const contribution: Contribution = {
      userId: this.state.user.id,
      userName: this.state.user.name,
      amount,
      timestamp: new Date().toISOString(),
    };
    const tx: Transaction = {
      id: uid(),
      type: `Contribution — ${campaign.title}`,
      amount,
      currency: "USDCx",
      status: "Approved",
      timestamp: new Date().toISOString(),
    };
    this.state = {
      ...this.state,
      campaigns: this.state.campaigns.map((c) =>
        c.id === campaignId
          ? { ...c, raised: c.raised + amount, contributions: [contribution, ...c.contributions] }
          : c,
      ),
      wallet: {
        ...this.state.wallet,
        usdcxBalance: Math.max(0, this.state.wallet.usdcxBalance - amount),
        transactions: [tx, ...this.state.wallet.transactions],
      },
    };
    this.persist();
    this.notify();
    return true;
  }

  voteMilestone(campaignId: string, milestoneId: string, vote: "yes" | "no"): boolean {
    const campaign = this.state.campaigns.find((c) => c.id === campaignId);
    const milestone = campaign?.milestones.find((m) => m.id === milestoneId);
    if (!campaign || !milestone || milestone.status === "Released") return false;
    if (!this.state.user || this.state.user.role !== "Backer") return false;
    if (this.contributionOf(campaign, this.state.user.id) <= 0) return false;
    if (milestone.voters[this.state.user.id] === vote) return false;
    const cam = this.state.campaigns.find((c) => c.id === campaignId);
    const ms = cam?.milestones.find((m) => m.id === milestoneId);
    if (!cam || !ms || ms.status === "Released") return false;
    const voters: Record<string, "yes" | "no"> = { ...ms.voters };
    if (voters[this.state.user.id]) delete voters[this.state.user.id];
    voters[this.state.user.id] = vote;

    const totalContributed = cam.contributions.reduce((sum, c) => sum + c.amount, 0);
    let yesAmount = 0;
    let noAmount = 0;
    let yes = 0;
    let no = 0;
    for (const [id, v] of Object.entries(voters)) {
      const amount = this.contributionOf(cam, id);
      if (v === "yes") {
        yes += 1;
        yesAmount += amount;
      } else {
        no += 1;
        noAmount += amount;
      }
    }

    const status: Milestone["status"] =
      yesAmount > totalContributed / 2
        ? "Approved"
        : noAmount >= totalContributed / 2
          ? "Disputed"
          : "Pending";

    this.state = {
      ...this.state,
      campaigns: this.state.campaigns.map((c) =>
        c.id !== campaignId
          ? c
          : {
              ...c,
              milestones: c.milestones.map((m) =>
                m.id !== milestoneId
                  ? m
                  : { ...m, votes: { yes, no, yesAmount, noAmount }, voters, myVote: vote, status },
              ),
            },
      ),
    };
    this.persist();
    this.notify();
    return true;
  }

  addTransaction(t: Omit<Transaction, "id" | "timestamp">): void {
    this.state = {
      ...this.state,
      wallet: {
        ...this.state.wallet,
        transactions: [
          { ...t, id: uid(), timestamp: new Date().toISOString() },
          ...this.state.wallet.transactions,
        ],
      },
    };
    this.persist();
    this.notify();
  }
}

interface AuthResponse {
  token: string;
  expiresAt: number;
  user: SessionUser;
}

interface WalletBalanceResponse {
  ngn: number;
  usd: number;
}

const emptyWallet: Wallet = { ngnBalance: 0, usdcxBalance: 0, transactions: [] };

function sanitizeRole(role: BackendRole): Role {
  return BACKEND_TO_ROLE[role] ?? "Creative";
}

function basicUser(session: SessionUser): User {
  return {
    id: session.address || `email_${session.id}`,
    name: session.displayName,
    email: session.email || "",
    role: sanitizeRole(session.role),
    verificationTier: "Unverified",
    reputationScore: 0,
    bio: "",
    portfolio: [],
    endorsements: [],
  };
}

export class ApiDataSource implements DataSource {
  readonly mode: DataMode = "live";
  private state: StoreSnapshot = {
    user: null,
    creatives: [],
    backers: [],
    campaigns: [],
    wallet: emptyWallet,
  };
  private listeners = new Set<() => void>();

  getSnapshot() {
    return this.state;
  }

  subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    for (const listener of this.listeners) listener();
  }

  private addressFor(session: SessionUser): string {
    return session.address || `email_${session.id}`;
  }

  private mapTransaction(row: WalletTransactionRow): Transaction {
    const currency: Transaction["currency"] =
      row.amountNaira != null && row.amountNaira !== 0 ? "NGN" : "USDCx";
    const amount =
      currency === "NGN" ? parseNumber(row.amountNaira) : parseNumber(row.amountUsd);
    return {
      id: String(row.id),
      type: row.description || row.type || "Transaction",
      amount,
      currency,
      status: BACKEND_TO_TX_STATUS[row.status],
      timestamp: row.createdAt,
    };
  }

  private async fetchWallet(address: string): Promise<Wallet> {
    const [bal, hist] = await Promise.all([
      get<WalletBalanceResponse>(`/wallets/${encodeURIComponent(address)}/balance`),
      get<{ transactions: WalletTransactionRow[] }>(
        `/wallets/${encodeURIComponent(address)}/transactions`
      ),
    ]);
    return {
      ngnBalance: bal.success ? parseNumber(bal.data?.ngn) : 0,
      usdcxBalance: bal.success ? parseNumber(bal.data?.usd) : 0,
      transactions: hist.success
        ? (hist.data?.transactions ?? []).map((row) => this.mapTransaction(row))
        : [],
    };
  }

  private async fetchProfile(address: string, session: SessionUser): Promise<User | null> {
    const res = await get<{
      profile: ProfileRow;
      portfolio: PortfolioItemRow[];
      ratingSummary: RatingSummary;
    }>(`/profiles/${encodeURIComponent(address)}`);
    if (!res.success || !res.data?.profile) return null;
    const { profile, portfolio = [], ratingSummary } = res.data;
    const reputationScore =
      ratingSummary && ratingSummary.count > 0
        ? Math.round(parseNumber(ratingSummary.avgScore) * 200)
        : 0;
    return {
      id: profile.address,
      name: profile.username || session.displayName || profile.address,
      email: session.email || "",
      role: sanitizeRole(session.role),
      verificationTier: verificationTierFromLevel(profile.verificationLevel),
      reputationScore,
      bio: profile.bio || "",
      portfolio: portfolio.map((p): PortfolioItem => ({
        id: String(p.id),
        title: p.title,
        description: p.description || "",
        mediaUrl: p.mediaUrls?.[0] || "",
        year: p.year || 0,
        category: BACKEND_TO_CATEGORY[p.category] || "Other",
      })),
      endorsements: [],
    };
  }

  private async loadSessionUser(session: SessionUser): Promise<void> {
    const address = this.addressFor(session);
    const user =
      (await this.fetchProfile(address, session)) ?? basicUser(session);
    const wallet = await this.fetchWallet(address).catch(() => emptyWallet);
    this.state = { ...this.state, user, wallet };
    this.notify();
  }

  private clearAuthState(): void {
    clearAuthToken();
    this.state = { ...this.state, user: null };
    this.notify();
  }

  async hydrate(): Promise<void> {
    const token = getAuthToken();
    if (!token) {
      this.state = { ...this.state, user: null };
      this.notify();
      return;
    }
    const me = await get<{ user: SessionUser }>("/auth/me");
    if (!me.success || !me.data?.user) {
      this.clearAuthState();
      return;
    }
    await this.loadSessionUser(me.data.user);
  }

  async register({ name, email, role }: { name: string; email: string; role: Role }): Promise<boolean> {
    const res = await post<AuthResponse>("/auth/register", {
      email,
      displayName: name,
      role: ROLE_TO_BACKEND[role],
    });
    if (!res.success || !res.data?.token) return false;
    setAuthToken(res.data.token);
    await this.loadSessionUser(res.data.user);
    return true;
  }

  async login(email: string): Promise<boolean> {
    const res = await post<AuthResponse>("/auth/login", { email: email.trim().toLowerCase() });
    if (!res.success || !res.data?.token) return false;
    setAuthToken(res.data.token);
    await this.loadSessionUser(res.data.user);
    return true;
  }

  async logout(): Promise<void> {
    try {
      await post("/auth/logout");
    } catch {
      /* best effort — local token clear is authoritative */
    }
    this.clearAuthState();
  }

  async updateUser(patch: Partial<User>): Promise<void> {
    if (!this.state.user) return;
    const next = { ...this.state.user, ...patch };
    this.state = { ...this.state, user: next };
    this.notify();
    if (patch.name !== undefined || patch.bio !== undefined) {
      void put(`/profiles/${encodeURIComponent(next.id)}`, {
        username: patch.name,
        bio: patch.bio,
      }).catch(() => {
        /* optimistic — reconcile on next load */
      });
    }
  }

  async addPortfolioItem(item: Omit<PortfolioItem, "id">): Promise<void> {
    const user = this.state.user;
    if (!user) return;
    const optimistic: PortfolioItem = { ...item, id: uid() };
    await this.updateUser({ portfolio: [optimistic, ...user.portfolio] });
  }

  async updatePortfolioItem(id: string, item: Omit<PortfolioItem, "id">): Promise<void> {
    const user = this.state.user;
    if (!user) return;
    await this.updateUser({
      portfolio: user.portfolio.map((p) => (p.id === id ? { ...item, id } : p)),
    });
  }

  async deletePortfolioItem(id: string): Promise<void> {
    const user = this.state.user;
    if (!user) return;
    await this.updateUser({ portfolio: user.portfolio.filter((p) => p.id !== id) });
  }

  addCampaign(): string {
    return "";
  }

  contribute(): boolean {
    return false;
  }

  voteMilestone(): boolean {
    return false;
  }

  addTransaction(): void {}
}

export function resolveDataMode(): DataMode {
  try {
    const stored = localStorage.getItem("cinex_data_mode");
    if (stored === "mock" || stored === "live") return stored;
  } catch {
    /* SSR or storage unavailable */
  }
  const env = import.meta.env.VITE_DATA_MODE;
  if (env === "mock" || env === "live") return env;
  return "mock";
}

export function createDataSource(): DataSource {
  return resolveDataMode() === "live" ? new ApiDataSource() : new MockDataSource();
}
