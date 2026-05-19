# CineX Frontend & AI Implementation Plan — 12-Day Sprint

> **Changelog (v2):** Extended from 10 to 12 days. Added Day 2.5 (Onboarding & Role Selection), Day 3.5 (Role-Based Dashboards), Day 9 (Demo Mode, Transaction Feedback & Network Detection). Original Day 9 → Day 10, Day 10 → Day 11. Added Day 12 (Production Deployment with demo flag). All original content preserved.

> **Scope:** User Profile page, Rating UI, Tribe (Pool) Homepage, Activity Feed, AI Credibility Summary, Onboarding, Role-Based Dashboards, Demo Mode
> **Framework:** React (Vite) + Tailwind CSS v4 + Stacks Web3 SDK
> **Backend:** Node.js/Express API (off-chain profile store, activity feed indexer, AI proxy)
> **Database:** PostgreSQL (or Supabase) for off-chain data
> **AI:** OpenAI / Claude API for credibility summaries
> **Team:** 1 senior full-stack dev (80h), 1 AI integration specialist (20h)
> **Total estimated effort:** ~120 person-hours

---

## 0. Alignment with Smart Contract Schedule

This frontend/AI sprint runs **in parallel** with the contract sprint defined in `SMART_CONTRACT_IMPLEMENTATION_PLAN_2WEEKS.md`. The frontend team does **not** wait for contracts to deploy — they build against mock/stub contract data and swap to real `contract-call?` when each contract reaches testnet.

| Contract Day | Contract Delivers | Frontend Day | Frontend Uses |
|-------------|-------------------|-------------|---------------|
| Day 1 | cinex-multisig, timelock, asset-registry | Day 1-2 | — (infra, no frontend surface) |
| Day 2 | reputation.clar `rate-user`, `get-reputation-score` | Day 2.5, 3-4 | Onboarding role check, Profile: reputation score |
| Day 3 | project-verification-module | Day 3.5, 4-5 | Dashboard: verification badge, registration call-to-action |
| Day 4-5 | milestone-escrow (create, deposit, approve, release) | Day 5-6 | Campaign data for rating; milestone display on dashboards |
| Day 6-7 | yield-escrow, bitflow-strategy | Day 7 | Yield info panel (read-only, secondary) |
| Day 8-9 | funding-pool (create, join, propose, vote, execute) | Day 7-8, 9 | Pool homepage + dashboards + demo mode transaction feedback |
| Day 10 | Integration tests complete | Day 10-12 | End-to-end frontend/contract testing + deployment |

**Mock-first strategy:** Each frontend service layer starts with a mock implementation. A `VITE_USE_MOCK_DATA` feature flag controls the switch.

---

## 1. File Structure

The plan extends the existing `frontend-v2-legacy` codebase. All new files are noted with `**NEW**`.

```
frontend-v2/
├── src/
│   ├── app/
│   │   └── router.jsx                     # **MODIFY** — add routes for onboarding, dashboards
│   ├── components/
│   │   ├── onboarding/
│   │   │   ├── RoleSelector.tsx           # **NEW** — Creative/Backer role selection cards
│   │   │   ├── OnboardingWizard.tsx       # **NEW** — multi-step onboarding flow
│   │   │   └── RoleGuard.tsx              # **NEW** — redirect wrapper by role
│   │   ├── dashboard/
│   │   │   ├── CreatorDashboard.tsx       # **NEW** — creator-specific dashboard
│   │   │   ├── BackerDashboard.tsx        # **NEW** — backer-specific dashboard
│   │   │   ├── CampaignOverview.tsx       # **NEW** — campaign list widget
│   │   │   ├── PoolOverview.tsx           # **NEW** — pool list widget
│   │   │   ├── YieldPanel.tsx             # **NEW** — yield display widget
│   │   │   └── RecommendationCard.tsx     # **NEW** — recommended pool/campaign card
│   │   ├── demo/
│   │   │   ├── DemoModeBanner.tsx         # **NEW** — top banner indicating demo mode
│   │   │   ├── TransactionModal.tsx       # **NEW** — tx status modal (loading/success/error)
│   │   │   └── NetworkDetector.tsx        # **NEW** — network mismatch detection + switch prompt
│   │   ├── profile/
│   │   │   ├── ProfileHeader.tsx          # **NEW** — avatar, name, reputation badge, verification badge, AI button
│   │   │   ├── ProfileBio.tsx            # **NEW** — editable bio section
│   │   │   ├── PortfolioList.tsx         # **NEW** — list of past projects (off-chain)
│   │   │   ├── RatingsReceived.tsx       # **NEW** — list of ratings received (from reputation.clar)
│   │   │   ├── TribeAffiliations.tsx     # **NEW** — list of pool memberships
│   │   │   ├── AICredibilityModal.tsx    # **NEW** — modal displaying AI summary
│   │   │   ├── EditProfileModal.tsx      # **NEW** — modal for editing bio + portfolio
│   │   │   └── VerificationBadge.tsx     # **NEW** — blue checkmark + vertical tag
│   │   ├── rating/
│   │   │   ├── RatingForm.tsx            # **NEW** — 1-5 star selector + optional comment
│   │   │   └── StarRating.tsx            # **NEW** — reusable star display (filled/half/empty + interactive)
│   │   ├── pool/
│   │   │   ├── PoolHeader.tsx            # **NEW** — pool name, target, status, reputation gate
│   │   │   ├── MemberList.tsx            # **NEW** — list of pool members (linked to profiles)
│   │   │   ├── MilestoneProgress.tsx     # **NEW** — milestone completion bars
│   │   │   └── ProposalCard.tsx          # **NEW** — allocation proposal card with vote buttons
│   │   ├── feed/
│   │   │   ├── ActivityFeed.tsx          # **NEW** — per-pool feed component
│   │   │   ├── ActivityFeedItem.tsx      # **NEW** — single feed event (icon + actor + action + timestamp)
│   │   │   └── FeedFilters.tsx           # **NEW** — filter by event type, pool, date range
│   │   └── common/
│   │       ├── CommentHashInput.tsx       # **NEW** — text area -> SHA256 -> optional buff 32
│   │       ├── ContractCallButton.tsx     # **MODIFY** — integrate TransactionModal in real mode
│   │       └── ErrorBoundary.tsx          # **MODIFY** — already exists, extend for new pages
│   ├── pages/
│   │   ├── OnboardingPage.tsx             # **NEW** — /onboarding wallet connect + role selection
│   │   ├── CreatorDashboardPage.tsx       # **NEW** — /dashboard/creator
│   │   ├── BackerDashboardPage.tsx        # **NEW** — /dashboard/backer
│   │   ├── ProfilePage.tsx                # **NEW** — /profile/:userAddress
│   │   ├── RateUserPage.tsx               # **NEW** — /rate/:userAddress
│   │   ├── PoolPage.tsx                   # **NEW** — /pool/:poolId
│   │   └── ActivityFeedPage.tsx           # **NEW** — /feed
│   ├── services/
│   │   ├── onboardingService.ts           # **NEW** — user_settings CRUD (GET/POST /api/user-settings)
│   │   ├── reputationService.ts           # **NEW** — read/write reputation.clar (mock + real)
│   │   ├── profileService.ts              # **NEW** — off-chain profile CRUD (API calls)
│   │   ├── poolService.ts                 # **NEW** — read funding-pool.clar data
│   │   ├── milestoneService.ts            # **NEW** — read milestone-escrow.clar data
│   │   ├── feedService.ts                 # **NEW** — read activity feed from indexer API
│   │   ├── aiService.ts                   # **NEW** — call /api/ai-summary endpoint
│   │   ├── demoService.ts                 # **NEW** — centralized demo mock data provider
│   │   └── index.ts                       # **MODIFY** — add new services to factory
│   ├── hooks/
│   │   ├── useOnboarding.ts              # **NEW** — onboarding state, role selection
│   │   ├── useRole.ts                    # **NEW** — current user role + role guard logic
│   │   ├── useUserCampaigns.ts           # **NEW** — fetch campaigns created by user
│   │   ├── useUserPools.ts               # **NEW** — fetch pools user belongs to
│   │   ├── useBackedCampaigns.ts         # **NEW** — fetch campaigns user has backed
│   │   ├── useUserYield.ts              # **NEW** — fetch user yield data (stub)
│   │   ├── useTransaction.ts             # **NEW** — tx lifecycle with modal integration
│   │   ├── useNetworkDetection.ts        # **NEW** — network detection + switch logic
│   │   ├── useReputation.ts              # **NEW** — fetch reputation score + ratings
│   │   ├── usePool.ts                    # **NEW** — fetch pool data + members
│   │   ├── useMilestones.ts              # **NEW** — fetch campaign milestones
│   │   ├── useActivityFeed.ts            # **NEW** — fetch feed with pagination
│   │   ├── useAISummary.ts              # **NEW** — fetch + cache AI credibility summary
│   │   └── useSharedCampaigns.ts        # **NEW** — find completed collaborations between two users
│   ├── types/
│   │   └── index.ts                       # **MODIFY** — add UserRole, OnboardingState, TransactionState, DashboardData
│   ├── context/
│   │   └── DemoModeContext.tsx            # **NEW** — demo mode provider + mock address injection
│   └── utils/
│       ├── commentHash.ts                 # **NEW** — SHA256 of comment string -> buff 32
│       ├── demoAddresses.ts               # **NEW** — pre-configured mock addresses for demo mode
│       └── contractAddresses.ts           # **MODIFY** — add new contract address env vars

backend/
├── package.json                           # **NEW** — express, pg, openai, cors, helmet, morgan, dotenv
├── Dockerfile                             # **NEW** — deploy to Railway/Render
├── nodemon.json                           # **NEW** — dev auto-restart
├── src/
│   ├── index.js                           # **NEW** — Express app entry, CORS, routes, error middleware
│   ├── config.js                          # **NEW** — env vars (DATABASE_URL, OPENAI_API_KEY, PORT, ALLOWED_ORIGINS)
│   ├── db/
│   │   ├── schema.sql                     # **MODIFY** — add user_settings table
│   │   ├── migrate.js                     # **NEW** — run schema.sql against database
│   │   └── connection.js                  # **NEW** — pg Pool singleton
│   ├── routes/
│   │   ├── userSettings.js                # **NEW** — GET/POST /api/user-settings
│   │   ├── profiles.js                    # **NEW** — CRUD /api/profiles
│   │   ├── portfolio.js                   # **NEW** — CRUD /api/portfolio
│   │   ├── feed.js                        # **NEW** — GET /api/feed/global, /api/feed/pool/:id, /api/feed/user/:address
│   │   ├── ai.js                          # **NEW** — POST /api/ai-summary
│   │   └── indexer.js                     # **NEW** — POST /api/indexer/event (optional webhook)
│   └── services/
│       ├── aiService.js                   # **NEW** — OpenAI/Claude API caller with caching + rate limiting
│       └── feedIndexer.js                 # **NEW** — poll Hiro API for print events, store in DB
└── __tests__/
    ├── profiles.test.js                   # **NEW** — CRUD + auth validation
    ├── ai.test.js                         # **NEW** — summary, rate limiting, cache
    └── feed.test.js                       # **NEW** — pagination, filtering

scripts/
├── deploy-frontend.sh                     # **NEW** — Vercel deploy script (accepts --demo flag)
├── deploy-backend.sh                      # **NEW** — Railway deploy script
└── seed-mock-data.sql                     # **MODIFY** — add demo profiles, user_settings, demo pools
```

**Total: ~68 new files** (27 frontend components/pages, 17 backend files, 14 test files, 7 config/scripts, 3 new context/hooks)

---

## 2. Daily Breakdown

### Week 1 — Foundation, Profiles, Ratings, Onboarding, Dashboards

---

#### Day 1 — Project Setup + Wallet + Service Scaffolding (8h)

**Parallel with Contract Day 1:** (multi-sig + timelock + asset-registry)

**Task 1.1: Environment & routing setup (2h)**
- [ ] Verify existing frontend-v2-legacy runs (`npm install && npm run dev`)
- [ ] Add new `.env` vars to project:
  ```
  VITE_REPUTATION_CONTRACT=reputation
  VITE_FUNDING_POOL_CONTRACT=funding-pool
  VITE_MILESTONE_ESCROW_CONTRACT=milestone-escrow
  VITE_VERIFICATION_CONTRACT=project-verification-module
  VITE_BACKEND_API_URL=http://localhost:3001
  VITE_USE_MOCK_DATA=true
  VITE_DEMO_MODE=false
  VITE_DEMO_ADDRESS_CREATIVE=ST1PQ...CREATIVE
  VITE_DEMO_ADDRESS_BACKER=ST1PQ...BACKER
  ```
- [ ] Create `src/utils/contractAddresses.ts` — centralised contract address registry with testnet defaults
- [ ] Install: `axios` for API calls
- **Estimated:** 2h

**Task 1.2: Create new services with mock data (3h)**
- [ ] `reputationService.ts` — mock `getReputationScore`, `getRatingsForUser`, `rateUser`
- [ ] `profileService.ts` — mock CRUD (GET/PUT profile, GET/POST/DELETE portfolio)
- [ ] `poolService.ts` — mock pool data (getPool, getPoolMembers, getProposals)
- [ ] `milestoneService.ts` — mock campaign + milestone data
- [ ] `feedService.ts` — mock feed events (global, per-pool, per-user)
- [ ] `aiService.ts` — mock AI summary
- [ ] All mocks return realistic sample data: 3 test profiles, 2 pools, 5 ratings, 3 campaigns with milestones
- [ ] Extend `src/services/index.ts` factory to include all new services
- [ ] When `VITE_USE_MOCK_DATA=true`, all services return mocks; when `false`, real contract/API calls
- **Estimated:** 3h

**Task 1.3: Wallet connection hardening (2h)**
- [ ] Audit existing `StacksAuthContext.tsx` — ensure both Hiro and Xverse work
- [ ] Add `userAddress` retrieval from `userSession.loadUserData().profile.stxAddress.testnet`
- [ ] Add `switchNetwork` utility for testnet/mainnet toggle
- [ ] Test: connect wallet -> disconnect -> reconnect flow end-to-end
- **Estimated:** 2h

**Task 1.4: Type definitions (1h)**
- [ ] Add to `src/types/index.ts`:
  ```typescript
  interface Profile {
    address: string;
    displayName: string;
    bio: string;
    avatar?: string;
    projectVertical: 'film' | 'music' | 'gaming' | 'immersive-media' | 'other';
    tribeIds: number[];
    portfolio: PortfolioItem[];
    registeredAt: number;
  }

  interface PortfolioItem {
    id: string;
    title: string;
    description: string;
    url?: string;
    completionYear: number;
  }

  interface Rating {
    rater: string;
    raterName?: string;
    campaignId: number;
    rating: number; // 1-5
    commentHash?: string;
    comment?: string; // resolved off-chain
    timestamp: number;
  }

  interface ReputationScore {
    totalRatings: number;
    score: number; // 0-100 percentage
  }

  interface Pool {
    id: number;
    name: string;
    creator: string;
    targetAmount: number;
    minContribution: number;
    minReputation: number;
    duration: number;
    totalCommitted: number;
    status: 'open' | 'closed' | 'allocated';
    memberCount: number;
    createdAt: number;
  }

  interface PoolMember {
    address: string;
    committedAmount: number;
    contributedAmount: number;
    joinedAt: number;
    reputationScore: number;
  }

  interface Campaign {
    id: number;
    creator: string;
    asset: string;
    totalGoal: number;
    totalDeposited: number;
    milestones: Milestone[];
    status: 'active' | 'completed' | 'cancelled';
    deadline: number;
  }

  interface Milestone {
    index: number;
    name: string;
    amount: number;
    approved: boolean;
    released: boolean;
    proofHash?: string;
  }

  interface FeedEvent {
    id: string;
    type: 'rating' | 'milestone' | 'pool-member' | 'pool-created' | 'campaign-created' | 'deposit';
    timestamp: number;
    actor: string;
    poolId?: number;
    campaignId?: number;
    data: Record<string, unknown>;
  }

  type UserRole = 'creative' | 'backer';

  interface OnboardingState {
    role: UserRole | null;
    isComplete: boolean;
    isDemo: boolean;
    currentStep: number;
  }

  type TransactionState = 'idle' | 'loading' | 'success' | 'error';
  ```
- **Estimated:** 1h

---

#### Day 2 — Backend API Setup + Profile Page Scaffold (8h)

**Parallel with Contract Day 2:** (oracle-proxy + reputation.clar + project-verification start)

**Task 2.1: Backend Express API project (3h)**
- [ ] Initialize Node.js/Express project at `backend/`:
  ```
  backend/
  +-- package.json          (express, cors, dotenv, pg, openai, body-parser, helmet, morgan)
  +-- nodemon.json          (watch src/, ext js)
  +-- src/
      +-- index.js          (Express app, CORS, routes mount, error middleware)
      +-- config.js         (PORT, DATABASE_URL, OPENAI_API_KEY, ALLOWED_ORIGINS)
      +-- db/
          +-- connection.js (pg Pool singleton)
          +-- schema.sql    (profiles, portfolio_items, feed_events, ai_summaries tables)
  ```
- [ ] PostgreSQL schema (`schema.sql`):
  ```sql
  CREATE TABLE profiles (
    address VARCHAR(100) PRIMARY KEY,
    display_name VARCHAR(100) NOT NULL,
    bio TEXT DEFAULT '',
    avatar_url TEXT DEFAULT '',
    project_vertical VARCHAR(20) DEFAULT 'other',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
  );

  CREATE TABLE portfolio_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    address VARCHAR(100) NOT NULL REFERENCES profiles(address),
    title VARCHAR(200) NOT NULL,
    description TEXT DEFAULT '',
    url TEXT DEFAULT '',
    completion_year INTEGER,
    created_at TIMESTAMP DEFAULT NOW()
  );

  CREATE TABLE feed_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type VARCHAR(50) NOT NULL,
    event_data JSONB NOT NULL,
    block_height INTEGER,
    tx_id VARCHAR(100),
    pool_id INTEGER,
    campaign_id INTEGER,
    actor VARCHAR(100),
    created_at TIMESTAMP DEFAULT NOW()
  );

  CREATE INDEX idx_feed_events_pool_id ON feed_events(pool_id);
  CREATE INDEX idx_feed_events_created_at ON feed_events(created_at DESC);

  CREATE TABLE ai_summaries (
    address VARCHAR(100) PRIMARY KEY,
    summary TEXT NOT NULL,
    model VARCHAR(50) NOT NULL,
    generated_at TIMESTAMP DEFAULT NOW()
  );
  ```
- [ ] Add `backend/src/routes/profiles.js` — stub: `GET /api/profiles/:address` returns static data
- **Estimated:** 3h

**Task 2.2: Profile page shell (3h)**
- [ ] Create `src/pages/ProfilePage.tsx` — route `/profile/:userAddress`
  - Layout: header (cover + avatar) -> stats bar (reputation, campaigns, tribes) -> tabs (Portfolio | Ratings | Tribes)
  - Fetch profile from `profileService.getProfile(address)` (mock -> API later)
  - Display `useReputation().score` via `reputationService`
  - Stub: "Request AI Credibility Summary" button (no functionality yet)
- [ ] Create `src/components/profile/ProfileHeader.tsx` — avatar, display name, verification badge, reputation badge
- [ ] Create `src/components/profile/ProfileBio.tsx` — bio text + edit button (own profile only)
- [ ] Create `src/components/profile/RatingsReceived.tsx` — list of ratings with star display
- [ ] Create `src/components/profile/PortfolioList.tsx` — list of portfolio items
- [ ] Create `src/hooks/useReputation.ts` — fetches `reputationScore` + `ratings` from `reputationService`
- [ ] Add route to `src/app/router.jsx`: `{ path: '/profile/:userAddress', element: <ProfilePage /> }`
- **Estimated:** 3h

**Task 2.3: Common components (2h)**
- [ ] Create `src/components/common/StarRating.tsx` — reusable star display (filled/half/empty) + interactive mode
- [ ] Create `src/components/common/CommentHashInput.tsx` — text input -> SHA256 -> buff 32 (for `comment-hash` in `rate-user`)
- [ ] Create `src/components/common/ContractCallButton.tsx` — generic button that shows "Confirm in wallet" -> tracks tx via `useTransaction` -> shows success/error
- **Estimated:** 2h

---

#### Day 2.5 — Onboarding & Role Selection (6h)

**Parallel with Contract Day 2:** (oracle-proxy + reputation.clar + project-verification start)

**Task 2.5.1: Backend user_settings table & API (2h)**
- [ ] Add to `backend/src/db/schema.sql`:
  ```sql
  CREATE TABLE user_settings (
    address VARCHAR(100) PRIMARY KEY REFERENCES profiles(address),
    role VARCHAR(20) NOT NULL CHECK (role IN ('creative', 'backer')),
    onboarding_completed BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
  );
  ```
- [ ] Create `backend/src/routes/userSettings.js`:
  - `GET /api/user-settings/:address` — returns `{ address, role, onboardingCompleted, createdAt }` or 404 if not set
  - `POST /api/user-settings` — body: `{ address, role }` — creates or updates row (upsert by address)
    - Auth: verify `x-user-address` header matches `address` in body
    - Returns the created/updated row
  - Validation: `role` must be `'creative'` or `'backer'` (400 if invalid)
- [ ] Mount in `backend/src/index.js`: `app.use('/api', userSettingsRouter)`
- **Estimated:** 2h

**Task 2.5.2: Onboarding page — wallet connection + role selection (2.5h)**
- [ ] Create `src/pages/OnboardingPage.tsx` — route `/onboarding`:
  - Step 1: Welcome + wallet connection
    - "Welcome to CineX" branding
    - "Connect wallet to get started" button (calls existing wallet connect from `StacksAuthContext`)
    - "Continue without wallet" link (enters demo mode with mock address)
  - Step 2: Role selection — two cards: **Creative** and **Backer**
    - Creative: "Fund your next project. Build your reputation. Showcase your portfolio." with film/music/gaming icons
    - Backer: "Discover emerging talent. Earn yield on your STX. Support the creative economy." with yield/pool icons
    - Selected card shows highlighted border + checkmark; only one selectable
  - Step 3: Confirmation — "You're all set as a {Creative/Backer}!" with summary and "Go to Dashboard" CTA
  - On final step: calls `POST /api/user-settings` with `{ address, role }`
  - If wallet not connected and user chose demo mode, uses mock address from `demoAddresses.ts` and sets `VITE_DEMO_MODE=true` in context
- [ ] Create `src/components/onboarding/RoleSelector.tsx`:
  - Two clickable cards (Creative / Backer)
  - Radio-style single selection with visual feedback (border highlight, checkmark icon)
  - Each card: SVG icon, title, 2-3 bullet features
  - `aria-label` on both cards for accessibility
  - `onSelect(role: UserRole)` callback prop
- [ ] Create `src/components/onboarding/OnboardingWizard.tsx`:
  - Step indicator (numbered dots)
  - Back / Next buttons; Next disabled until current step is complete
  - Props: `onComplete(address, role)` called after POST succeeds
  - On demo mode path: skips wallet step, auto-assigns demo address
- [ ] Create `src/hooks/useOnboarding.ts`:
  - `checkStatus(address)` → `GET /api/user-settings/:address`
  - `setRole(address, role)` → `POST /api/user-settings`
  - Returns `{ currentStep, selectedRole, isComplete, isDemo, loading }`
- [ ] Add route: `{ path: '/onboarding', element: <OnboardingPage /> }`
- **Estimated:** 2.5h

**Task 2.5.3: RoleGuard component (1h)**
- [ ] Create `src/components/onboarding/RoleGuard.tsx`:
  - Props: `requiredRole?: UserRole`, `fallback?: ReactNode`
  - Checks `useRole()` — if user has not completed onboarding, redirect to `/onboarding`
  - If `requiredRole` is specified and role doesn't match, redirect to correct dashboard or show fallback
  - Demo users pass through if they completed onboarding (their mock address has a stored role)
  - Renders `null` during loading to prevent flash of incorrect content
- [ ] Create `src/hooks/useRole.ts`:
  - Returns `{ role, isOnboarded, isDemo, isLoading }`
  - Reads from `onboardingService.getStatus(address)` or from cache
  - In demo mode: reads role from demo address config
- [ ] Integrate `RoleGuard` into router: wrap `/dashboard/creator` and `/dashboard/backer`
- **Estimated:** 1h

**Task 2.5.4: Demo mode mock address (0.5h)**
- [ ] Create `src/utils/demoAddresses.ts`:
  ```typescript
  export const DEMO_ADDRESSES = {
    creative: 'ST1PQ...CREATIVE',
    backer: 'ST1PQ...BACKER',
  } as const;
  ```
- [ ] On "Continue without wallet": inject demo address into `DemoModeContext`, set `VITE_DEMO_MODE=true`
- [ ] Store demo preference in sessionStorage so refresh persists
- **Estimated:** 0.5h

---

#### Day 3 — Profile Page: Reputation Data + Verification Badge (8h)

**Parallel with Contract Day 3:** (project-verification-module complete)

**Task 3.1: Wire reputationService to reputation.clar + funding cap (3h)**
- [ ] Implement real `reputationService.getReputationScore(address)`:
  - Read-only call: `contract-call? .reputation get-reputation-score address`
  - Uses `@stacks/transactions` `readOnlyFunction`
  - Returns `{ totalRatings, score }`
- [ ] Implement real `reputationService.getRatingsForUser(address, offset?, limit?)`:
  - Read-only call: `contract-call? .reputation get-ratings-for-user address`
  - Handle list response
  - For each rating, attempt to resolve `comment-hash` -> actual comment from off-chain DB (optional)
- [ ] Implement real `verificationService.getFundingCap(address)`:
  - Read-only call: `contract-call? .project-verification-module get-verification-funding-cap address`
  - Returns cap in micro-STX and human-readable string ("1,000 STX" | "10,000 STX" | "100,000 STX")
- [ ] Add `USE_MOCK_DATA` toggle in service factory: if `false`, use real contract calls; if `true`, mock data
- [ ] Display reputation score as SVG circular progress ring in `ProfileHeader.tsx`
- **Estimated:** 3h

**Task 3.2: Verification badge + cap display (2h)**
- [ ] Create `src/components/profile/VerificationBadge.tsx`:
  - Calls `project-verification-module::is-creator-currently-verified` read-only (via `verificationService`)
  - Blue checkmark if verified, grey outline if not
  - Shows `project-vertical` tag: "Film" | "Music" | "Game" | "Immersive Media" | "Other"
  - Shows funding ceiling: "Can raise up to X STX" — parsed from `get-verification-funding-cap`
  - Tooltip on hover: verification level, expiration block height
- [ ] Integrate into `ProfileHeader.tsx`
- [ ] Add cap display to campaign creation form (`CreateCampaignPage`): show creator's current ceiling before they set a goal. If goal > ceiling, show inline warning.
- **Estimated:** 2h

**Task 3.3: Ratings received section + cap staleness guard (2h)**
- [ ] In `RatingsReceived.tsx`:
  - For each rating: rater avatar (or initial), star display, comment (if resolved), link to campaign
  - Paginated: "Load more" button (offset/limit)
  - Empty state: "No ratings yet. Be the first to collaborate with this creator."
  - Rater name links to `/profile/:raterAddress`
- [ ] **Staleness guard in deposit flow (`ContributeToCampaign` or `useContribute` hook):**
  - Before submitting the deposit transaction, re-call `get-verification-funding-cap` for the campaign owner
  - If the cap has changed since the page loaded (e.g., verification expired while browsing), show a blocking modal:
    "This creator's funding ceiling has changed. The deposit cannot proceed. Refresh the page to see the latest."
  - If the deposit would exceed the cap, reject client-side before calling `openContractCall`
- **Estimated:** 2h

**Task 3.4: Tribe affiliations section (1h)**
- [ ] `src/components/profile/TribeAffiliations.tsx`:
  - Read pool memberships from `poolService` (mock initially, real when `funding-pool.clar` deployed)
  - Display pool cards: name, status badge, member count, funding progress
  - Each card links to `/pool/:poolId`
- **Estimated:** 1h

---

#### Day 3.5 — Role-Based Dashboards (Creator & Backer) (6h)

**Parallel with Contract Day 3:** (project-verification-module complete)

**Task 3.5.1: Dashboard routing (1h)**
- [ ] Create `src/pages/CreatorDashboardPage.tsx` — route `/dashboard/creator`, wrapped in `<RoleGuard requiredRole="creative">`
- [ ] Create `src/pages/BackerDashboardPage.tsx` — route `/dashboard/backer`, wrapped in `<RoleGuard requiredRole="backer">`
- [ ] Add root redirect: `/dashboard` → `/dashboard/creator` or `/dashboard/backer` based on role
- [ ] If user not onboarded, all `/dashboard/*` routes redirect to `/onboarding`
- [ ] Demo users see the same dashboards with `DemoModeBanner` and read-only interactions
- [ ] Add routes to `src/app/router.jsx`
- **Estimated:** 1h

**Task 3.5.2: CreatorDashboard (2h)**
- [ ] Create `src/components/dashboard/CreatorDashboard.tsx`:
  - **Header:** "Welcome, {displayName}" with "Creative" role badge + connect wallet status
  - **Stats row:** 4 compact cards — Active Campaigns count, Total Raised (STX), Reputation Score (progress ring), Active Pools count
  - **Your Campaigns section:** `<CampaignOverview />` — list of campaigns this user created
    - Each card: title, status pill, funding progress bar, milestone count, quick action buttons ("View", "Edit")
    - Empty state: "No campaigns yet. Start your first project!" with CTA
    - Powered by `useUserCampaigns` hook
  - **Your Pools section:** `<PoolOverview />` — list of pools this user is a member of
    - Each card: pool name, member count, funding %, time remaining
    - Empty state: "Join a tribe to start collaborating"
    - Powered by `useUserPools` hook
  - **Pending Milestones section:** inline list of milestones awaiting approval for active campaigns
    - Each item: campaign name, milestone name, amount, "Approve" button (stub)
  - **Quick Actions:** sidebar or row of buttons — "Create Campaign", "Find a Tribe", "View Feed"
- [ ] Create `src/components/dashboard/CampaignOverview.tsx`:
  - Props: `campaigns: Campaign[]`
  - Grid of campaign cards with progress bars, status badges
  - Click card → navigates to pool page (or campaign detail in future)
  - `data-campaign-id` attribute on each card
- [ ] Create `src/components/dashboard/PoolOverview.tsx`:
  - Props: `pools: Pool[]`, `memberCounts: Record<number, number>`
  - Grid of pool cards showing name, member count, funding progress, time remaining
  - Click → `/pool/:poolId`
  - Progress bars with `aria-valuenow`, `aria-valuemin`, `aria-valuemax`
- **Estimated:** 2h

**Task 3.5.3: BackerDashboard (1.5h)**
- [ ] Create `src/components/dashboard/BackerDashboard.tsx`:
  - **Header:** "Welcome, {displayName}" with "Backer" role badge
  - **Stats row:** 4 cards — Active Pools count, Total Contributed (STX), Yield Earned (stub), Backed Creators count
  - **Pools You Joined section:** `<PoolOverview />` — pools this user contributed to
    - Powered by `useUserPools` hook (filtered by contributor role)
  - **Campaigns You Backed section:** list of campaigns this user funded
    - Each entry: campaign title, creator name (linked), amount contributed, status
    - Powered by `useBackedCampaigns` hook
  - **Your Yield section:** `<YieldPanel />` — stub display showing placeholder yield data
    - "Yield tracking coming soon" message with estimated APY range
    - Powered by `useUserYield` hook (returns stub data)
  - **Recommendations section:** 2-3 `<RecommendationCard />` — trending pools or creators
    - Stub: shows hardcoded recommendations based on user's preferred vertical
    - "Recommended for you" heading
- [ ] Create `src/components/dashboard/YieldPanel.tsx`:
  - Stub component: displays "Active Strategies: 0", "Est. APR: —", "Yield tracking will be available when yield contracts are live"
- [ ] Create `src/components/dashboard/RecommendationCard.tsx`:
  - Pool/creator thumbnail placeholder, name, vertical tag, match reason ("Popular in Film"), member count
  - Click → navigate to pool or profile
- **Estimated:** 1.5h

**Task 3.5.4: Dashboard hooks (1.5h)**
- [ ] Create `src/hooks/useUserCampaigns.ts`:
  - `fetchUserCampaigns(address)` — queries `milestoneService` for campaigns where `campaign.creator === address`
  - Returns `{ campaigns, isLoading, error }`
  - Mock: returns 2 sample campaigns; Real: filters on-chain campaigns by creator
- [ ] Create `src/hooks/useUserPools.ts`:
  - `fetchUserPools(address)` — queries `poolService` for pools where user is member
  - Returns `{ pools, isLoading, error }`
  - Mock: returns 2 sample pools; Real: calls `get-pool-members` across known pool IDs
- [ ] Create `src/hooks/useBackedCampaigns.ts`:
  - `fetchBackedCampaigns(address)` — queries `milestoneService` for campaigns user contributed to
  - Returns `{ campaigns, isLoading, error }`
  - Mock: returns 2 sample campaigns; Real: on-chain lookup by contributor
- [ ] Create `src/hooks/useUserYield.ts`:
  - `fetchUserYield(address)` — stub that returns `{ totalYield: 0, strategies: [], isLoading: false }`
  - Ready for real yield contract integration
- [ ] Wire all hooks to service factory: when `VITE_USE_MOCK_DATA=true`, all return mock data
- **Estimated:** 1.5h

---

#### Day 4 — Profile Editing + Portfolio CRUD (Off-Chain) (8h)

**Parallel with Contract Day 4:** (milestone-escrow data model)

**Task 4.1: Backend profile CRUD API (3h)**
- [ ] `backend/src/routes/profiles.js`:
  - `GET /api/profiles/:address` — returns profile + portfolio items
  - `PUT /api/profiles/:address` — update bio, display name, avatar, project vertical (auth: only owner)
  - `GET /api/portfolio/:address` — list portfolio items for user
  - `POST /api/portfolio/:address` — add new portfolio item (auth: only owner)
  - `DELETE /api/portfolio/:portfolioId` — remove item (auth: only owner)
- [ ] Auth middleware: verify `x-user-address` header matches `:address` param
- [ ] Request/response format:
  ```json
  // GET /api/profiles/ST1ABC... -> 200
  {
    "address": "ST1ABC...",
    "displayName": "Jane Filmmaker",
    "bio": "Award-winning documentary filmmaker...",
    "avatarUrl": "https://...",
    "projectVertical": "film",
    "portfolio": [
      { "id": "uuid-1", "title": "My Film", "description": "...", "url": "", "completionYear": 2025 }
    ],
    "createdAt": "2025-01-01T00:00:00Z",
    "updatedAt": "2025-05-18T00:00:00Z"
  }

  // PUT /api/profiles/ST1ABC... -> 200
  { "address": "ST1ABC...", ...updated fields }
  ```
- **Estimated:** 3h

**Task 4.2: Edit Profile modal (3h)**
- [ ] Create `src/components/profile/EditProfileModal.tsx`:
  - Form fields: display name (required, max 100), bio (textarea, max 500), avatar URL, project vertical (select)
  - Validation: address must match authenticated user, bio length limit
  - On save: call `PUT /api/profiles/:address`
- [ ] Create `src/components/profile/PortfolioItemForm.tsx`:
  - Add/Edit portfolio: title (required), description, URL, completion year
  - POST / DELETE to backend API
- [ ] Wire "Edit Profile" button (visible only when `authenticatedUser === profileAddress`)
- **Estimated:** 3h

**Task 4.3: Connect profileService to backend (2h)**
- [ ] Implement real `profileService.getProfile(address)` -> `GET /api/profiles/:address`
- [ ] Implement real `profileService.updateProfile(address, data)` -> `PUT /api/profiles/:address`
- [ ] Implement real `profileService.addPortfolioItem(address, item)` -> `POST /api/portfolio/:address`
- [ ] Implement real `profileService.deletePortfolioItem(itemId)` -> `DELETE /api/portfolio/:id`
- [ ] Switch from mock to real API when `VITE_USE_MOCK_DATA = false`
- **Estimated:** 2h

---

#### Day 5 — Rating UI + Contract Call Integration (8h)

**Parallel with Contract Day 5:** (milestone-escrow deposit/approve/release complete)

**Task 5.1: Rating page (4h)**
- [ ] Create `src/pages/RateUserPage.tsx` — route `/rate/:userAddress`:
  1. Display target user's profile summary (name, avatar, current reputation score)
  2. "Select Collaboration" dropdown — fetches completed campaigns/pools the rater and target shared
  3. Interactive `StarRating` component (1-5, clickable)
  4. Optional comment textarea (max 200 chars) — hashed to `buff 32` via `commentHash.ts` utility
  5. Submit button -> calls `reputationService.rateUser(targetAddress, campaignId, rating, commentHash)`
  6. Transaction flow: `openContractCall` -> user confirms in wallet -> show tx status modal -> on success, redirect to profile
- [ ] Guards: cannot rate self; duplicate (rater, target, campaign) blocked by contract; only verified users
- [ ] Create `src/components/rating/RatingForm.tsx` — the interactive form component
- [ ] Add route: `{ path: '/rate/:userAddress', element: <RateUserPage /> }`
- **Estimated:** 4h

**Task 5.2: Implement real reputationService.rateUser (2h)**
- [ ] Contract call to `reputation.clar::rate-user`:
  ```typescript
  const functionArgs = [
    principalCV(targetAddress),   // target
    uintCV(campaignId),           // campaign-id
    uintCV(rating),               // rating 1-5
    comment ? some(bufferCV(commentHash)) : noneCV(),  // comment-hash (optional)
  ];
  const txOptions = {
    contractAddress,
    contractName: 'reputation',
    functionName: 'rate-user',
    functionArgs,
    postConditions: [],  // no STX transfer
    onFinish: (data) => { /* redirect to profile */ },
    onCancel: () => { /* re-enable form */ },
  };
  await openContractCall(txOptions);
  ```
- [ ] Handle `noneCV()` correctly when comment is empty
- **Estimated:** 2h

**Task 5.3: Shared collaborations fetch (2h)**
- [ ] Create `src/hooks/useSharedCampaigns.ts`:
  - Query `milestone-escrow::get-campaign-contributor` for overlap between rater and target
  - Query `funding-pool::get-pool-membership` for pool overlap
  - Combine into unified list of collaborations for dropdown
  - Initially returns mock data; swaps to real when contracts deployed
- **Estimated:** 2h

---

### Week 2 — Pools, Activity Feed, AI, Demo Mode, Testing, Deployment

---

#### Day 6 — Tribe (Pool) Homepage (8h)

**Parallel with Contract Day 6-7:** (yield-escrow, bitflow-strategy)

**Task 6.1: Pool page — data fetching (3h)**
- [ ] Create `src/pages/PoolPage.tsx` — route `/pool/:poolId`:
  - Fetch pool data from `poolService.getPool(poolId)`:
    ```
    contract-call? .funding-pool get-pool pool-id  ->  Pool tuple
    ```
  - Fetch member list from `poolService.getPoolMembers(poolId, offset, limit)`:
    ```
    contract-call? .funding-pool get-pool-members pool-id offset limit  ->  Member list
    ```
  - If pool has an active allocation, fetch `milestoneService.getCampaign(campaignId)`:
    ```
    contract-call? .milestone-escrow get-campaign campaign-id  ->  Campaign tuple
    ```
- [ ] Create `src/hooks/usePool.ts` — fetch pool + members with loading/error states
- [ ] Create `src/hooks/useMilestones.ts` — fetch campaign milestones
- **Estimated:** 3h

**Task 6.2: Pool page — UI components (3h)**
- [ ] Create `src/components/pool/PoolHeader.tsx`:
  - Pool name, creator link (`/profile/:creator`), status badge (coloured pill)
  - Funding progress bar: `totalCommitted / targetAmount` with percentage
  - Reputation gate info: "Min reputation: 60%"
  - Duration countdown (blocks -> human-readable, e.g., "23 days remaining")
- [ ] Create `src/components/pool/MemberList.tsx`:
  - Grid of member cards: avatar, name, committed amount, reputation score
  - Each card links to `/profile/:memberAddress`
  - Empty state: "No members yet. Be the first to join."
- [ ] Create `src/components/pool/MilestoneProgress.tsx`:
  - Horizontal tracker: completed (green) -> approved (blue) -> pending (grey)
  - Each milestone: name, amount, check/clock icon
  - Only rendered if pool has allocated to a campaign
- **Estimated:** 3h

**Task 6.3: Pool page activity feed (2h)**
- [ ] Add `src/components/pool/ActivityFeed.tsx` inside PoolPage:
  - Fetches `GET /api/feed/pool/:poolId?limit=10` from backend
  - Renders `ActivityFeedItem` components
  - Auto-polls every 30 seconds
  - "View all" link to `/feed?poolId=:poolId`
- **Estimated:** 2h

---

#### Day 7 — Activity Feed Indexer + API (8h)

**Parallel with Contract Day 8:** (funding-pool create/join/contribute)

**Task 7.1: Backend feed indexer — Hiro API event listener (3h)**
- [ ] Create `backend/src/services/feedIndexer.js`:
  - Polls Hiro API every 60s: `GET /extended/v1/contract/{contract_id}/events?limit=50`
  - Filters for `print` events from CineX contracts (reputation, milestone-escrow, funding-pool)
  - Parses `contract_log.raw_value` JSON for structured event data
  - Maps to `feed_events` table: `event_type`, `event_data`, `block_height`, `tx_id`, `pool_id`, `campaign_id`, `actor`
  - Deduplicates by `tx_id`
- [ ] Events indexed from contract plan Section 5.4:
  - `deposit`, `campaign-created`, `milestone-approved`, `milestone-released`
  - `pool-created`, `pool-joined`, `proposal-created`, `vote-cast`, `allocation-executed`
  - `yield-claimed`, `rating-submitted`
- **Estimated:** 3h

**Task 7.2: Backend feed API routes (2h)**
- [ ] `GET /api/feed/global?offset=0&limit=20&type=&since=` — all events (paginated)
- [ ] `GET /api/feed/pool/:poolId?offset=0&limit=20` — events for a specific pool
- [ ] `GET /api/feed/user/:address?offset=0&limit=20` — events involving a user
- [ ] Response format:
  ```json
  // GET /api/feed/global?limit=2 -> 200
  {
    "events": [
      {
        "id": "uuid-1",
        "eventType": "pool-joined",
        "eventData": { "poolId": 1, "member": "ST1...", "amount": 5000 },
        "actor": "ST1...",
        "poolId": 1,
        "blockHeight": 12345,
        "txId": "0x...",
        "createdAt": "2025-05-18T12:00:00Z"
      }
    ],
    "pagination": { "offset": 0, "limit": 2, "total": 42 }
  }
  ```
- [ ] Support `since` param (ISO timestamp) for polling-based refresh
- **Estimated:** 2h

**Task 7.3: Frontend feed UI (3h)**
- [ ] Implement real `feedService.getGlobalFeed(offset, limit)` -> `GET /api/feed/global`
- [ ] Implement real `feedService.getPoolFeed(poolId, offset, limit)` -> `GET /api/feed/pool/:poolId`
- [ ] Implement real `feedService.getUserFeed(address, offset, limit)` -> `GET /api/feed/user/:address`
- [ ] Create `src/pages/ActivityFeedPage.tsx` — route `/feed`:
  - Tabs: "Global" | "My Activity" (if authenticated) | "By Pool" (dropdown filter)
  - `ActivityFeedItem` list: icon + actor link + action description + relative timestamp ("2h ago")
  - Filter pills via `FeedFilters.tsx`: All | Ratings | Pools | Milestones
  - Infinite scroll or "Load more" pagination
  - Auto-refresh toggle (polls every 30s)
- [ ] Create `src/components/feed/ActivityFeedItem.tsx`
- [ ] Create `src/components/feed/FeedFilters.tsx`
- **Estimated:** 3h

---

#### Day 8 — AI Credibility Summary (8h)

**Parallel with Contract Day 9:** (funding-pool propose/vote/execute)

**Task 8.1: AI service (2h)**
- [ ] Create `backend/src/services/aiService.js`:
  ```javascript
  async function generateCredibilitySummary({ displayName, address, portfolio }) {
    const prompt = `Based on the following information, produce a 3-sentence credibility summary. Be neutral and factual. If the information is limited, state that candidly.

  Name/Handle: ${displayName}
  Stacks Address: ${address}
  Portfolio Projects: ${portfolio.map(p => p.title).join(', ') || 'None provided yet'}

  Produce exactly 3 sentences covering: professional background, notable achievements, and any observations.`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: 'You are a neutral credibility assessment assistant for a creative economy platform. You produce concise, factual summaries.' },
        { role: 'user', content: prompt }
      ],
      max_tokens: 150,
      temperature: 0.3,
    });

    return {
      summary: response.choices[0].message.content.trim(),
      generatedAt: new Date().toISOString(),
      model: 'gpt-4',
      disclaimer: 'This summary was generated by AI and may not be complete. Always do your own research.',
    };
  }
  ```
- [ ] Support both OpenAI and Claude via `AI_PROVIDER` env var
- [ ] Rate limiting: max 5 requests per address per hour (in-memory Map)
- [ ] DB caching: store result in `ai_summaries` table with 24h TTL
- **Estimated:** 2h

**Task 8.2: AI API endpoint + rate limiting (2h)**
- [ ] `POST /api/ai-summary`:
  ```json
  // POST /api/ai-summary
  // Body: { "address": "ST1ABC..." }
  //
  // Response 200:
  {
    "address": "ST1ABC...",
    "summary": "Jane Doe has been active in documentary filmmaking since 2022...",
    "generatedAt": "2025-05-18T12:00:00Z",
    "model": "gpt-4",
    "disclaimer": "This summary was generated by AI and may not be complete..."
  }
  //
  // Response 429 (rate limited):
  { "error": "Rate limit exceeded. Try again later.", "retryAfter": "..." }
  ```
- [ ] Cache-first: if DB entry exists and <24h old, return without calling AI API
- [ ] Error if no AI key configured: return 200 with fallback message instead of erroring
- **Estimated:** 2h

**Task 8.3: Frontend AI summary button + modal (3h)**
- [ ] Create `src/hooks/useAISummary.ts`:
  - `requestSummary(address)` -> `POST /api/ai-summary`
  - Manages states: idle / loading / success / error / rate-limited
- [ ] Create `src/components/profile/AICredibilityModal.tsx`:
  - Loading: skeleton text with pulsing animation
  - Success: summary text, model name, generated timestamp, disclaimer footer
  - Error: "Unable to generate summary. Try again later."
  - Rate-limited: "You've used your AI summary requests for this address. Check back later."
  - Disabled (no AI key): "AI credibility summaries will be available post-launch. Review on-chain reputation instead."
- [ ] Wire "Request AI Credibility Summary" button in `ProfileHeader.tsx`:
  - Visible on all profiles (not just own)
  - Click -> opens modal -> shows loading -> shows result
  - Button disabled while loading
- **Estimated:** 3h

**Task 8.4: OpenCode Big Pickle integration note (1h)**
- [ ] Document in code comments: if `AI_PROVIDER=opencode`, backend can call OpenCode's Big Pickle API (future)
- [ ] Add fallback: if no AI API key configured, return static message without crashing
- **Estimated:** 1h

---

#### Day 9 — Demo Mode & Transaction Feedback & Network Detection (8h)

**Parallel with Contract Day 8-9:** (funding-pool propose/vote/execute complete)

**Task 9.1: Demo mode environment variable & context (2h)**
- [ ] Read `VITE_DEMO_MODE` env var on app init
- [ ] Create `src/context/DemoModeContext.tsx`:
  - Provides `{ isDemoMode, demoAddress, selectedRole, enterDemoMode, exitDemoMode }` to entire app
  - `enterDemoMode(role: UserRole)` sets `isDemoMode=true`, assigns mock address from `demoAddresses.ts`
  - `exitDemoMode()` clears demo state, redirects to onboarding
  - In demo mode, injects a mock `userSession` via context so `StacksAuthContext` consumers work without a real wallet
- [ ] Create `src/components/demo/DemoModeBanner.tsx`:
  - Fixed top banner: amber/yellow background, "⚠️ Demo Mode — No real transactions will be executed. [Exit Demo]" text
  - Dismissible with sessionStorage persistence
  - "Exit Demo" button → calls `exitDemoMode()`, reloads to `/onboarding`
  - Uses `position: sticky` (not fixed)
- [ ] All read-only data (profile views, pool browsing, feed) renders from mock services in demo mode — no wallet required
- **Estimated:** 2h

**Task 9.2: Transaction feedback modal (3h)**
- [ ] Create `src/components/demo/TransactionModal.tsx`:
  - Overlay modal with backdrop, focus trapped, Escape key dismisses
  - Three states:
    - **`loading`:** Spinner animation with "Transaction in progress…" text. No dismiss button.
    - **`success`:** Green checkmark circle, "Transaction confirmed!" text. Auto-closes after 3 seconds (configurable). Shows txid link if available.
    - **`error`:** Red X circle, error message text. "Dismiss" button to close. "Retry" button re-executes the transaction.
  - Transitions: `idle` (hidden) → `loading` → `success` or `error`
  - In demo mode: modal always transitions `loading` (2s simulated) → `success` (auto-close after 3s)
- [ ] Create `src/hooks/useTransaction.ts`:
  - `executeTx(config: { fn, args, onSuccess?, onError? })` — manages modal lifecycle
  - In real mode: calls `openContractCall`, shows `loading` during wallet prompt, shows `success` on finish, `error` on cancel/failure
  - In demo mode: simulates 2s delay, shows `loading` → `success` auto-sequence
  - Returns `{ txid, state, execute, reset }`
- [ ] Modify `src/components/common/ContractCallButton.tsx`:
  - Uses `useTransaction().executeTx()` instead of direct `openContractCall`
  - Button disabled and shows spinner during `loading` state
  - Button retains width during loading (`min-width` set on mount)
- **Estimated:** 3h

**Task 9.3: Network detection & switch prompt (2h)**
- [ ] Create `src/hooks/useNetworkDetection.ts`:
  - On mount, reads `window.StacksProvider?.getNetwork()` or `userSession.loadUserData().profile.net`
  - Compares to `VITE_NETWORK` env var
  - Returns `{ isCorrectNetwork, currentNetwork, expectedNetwork, switchNetwork }`
  - Listens to `stxAccountChange` events and re-checks (debounced 300ms)
  - In demo mode: always returns `isCorrectNetwork: true`
- [ ] Create `src/components/demo/NetworkDetector.tsx`:
  - If `isCorrectNetwork === false`, renders non-dismissible inline banner:
    - "⚠️ Wrong Network — Please switch to {expectedNetwork}" with "Switch Network" button
  - "Switch Network" calls `switchNetwork(expectedNetwork)`
  - If wallet doesn't support programmatic switch, shows manual instructions
  - If `isCorrectNetwork === true`, renders `null`
  - Placed at app root level (above router) in layout
- **Estimated:** 2h

**Task 9.4: Demo mode write-action toast + read-only fallback (1h)**
- [ ] All write-action buttons (rate-user, create-pool, etc.) check `isDemoMode`:
  - If true: show toast notification instead of executing: "Demo mode — connect wallet to perform this action"
  - Toast component: slides in from top-right, auto-dismisses after 4 seconds
- [ ] All read-only displays (profile, pools, feed) function normally in demo mode via mock data
- [ ] Create `src/services/demoService.ts` — centralized mock data provider returning demo profiles, pools, campaigns, ratings
- **Estimated:** 1h

---

#### Day 10 — Integration Testing + Full Flow Validation (8h)

**Parallel with Contract Day 10:** (contract E2E tests complete)

**Task 10.1: Frontend unit tests (Vitest) (3h)**
- [ ] `reputationService.test.ts` (6 tests):
  - Mock `openContractCall` for `rate-user` with correct args
  - `noneCV()` for empty comment, `some(bufferCV(sha256(text)))` for filled
  - Error when not verified, self-rating rejected
- [ ] `profileService.test.ts` (4 tests):
  - Mock `GET /api/profiles/:address` -> correct profile rendered
  - Mock `PUT /api/profiles/:address` -> update payload verified
  - Handle 404, handle 403 (wrong auth)
- [ ] `aiService.test.ts` (4 tests):
  - Mock `POST /api/ai-summary` -> modal displays summary
  - Mock 429 -> rate limit message shown
  - Missing API key -> fallback message
- [ ] `poolService.test.ts` (4 tests):
  - Mock `GET` pool -> correct data
  - Mock members list with pagination
  - Handle non-existent pool
- [ ] `StarRating.test.tsx` (3 tests):
  - Renders correct filled/empty star count
  - Clickable in interactive mode
  - Read-only mode blocks clicks
- **Estimated:** 3h

**Task 10.2: Backend integration tests (Jest) (2h)**
- [ ] `profiles.test.js` (6 tests):
  - CRUD cycle: GET -> PUT -> GET verifies update -> POST portfolio -> DELETE portfolio
  - Auth validation: wrong `x-user-address` -> 403
  - 404 for non-existent address
- [ ] `ai.test.js` (5 tests):
  - Valid request -> 200 + summary
  - Missing address -> 400
  - Rate limit hit -> 429
  - Cache hit -> 200 (no API call), cache expired -> new API call
- [ ] `feed.test.js` (4 tests):
  - Global feed pagination
  - Pool-filtered events
  - User-filtered events
  - Empty result set
- **Estimated:** 2h

**Task 10.3: End-to-end user flow testing on testnet (3h)**
- **Flow A (Profile + Rating):**
  1. Connect wallet -> navigate to own profile -> edit bio -> save
  2. Navigate to another user's profile -> view reputation score + ratings
  3. Click "Rate User" -> select completed collaboration -> submit 4-star rating -> confirm tx -> redirect
  4. Back on rated user's profile -> verify new rating in list
- **Flow B (Pool + Feed):**
  1. Navigate to pool page -> view members, milestones, funding progress
  2. View per-pool activity feed -> see "Member X joined" event
  3. Navigate to global feed -> see cross-pool events with filters
- **Flow C (AI Summary):**
  1. Navigate to any profile -> click "Request AI Credibility Summary"
  2. Modal shows loading -> 3-sentence summary appears
  3. Click again -> cached result returns instantly
- **Estimated:** 3h

---

#### Day 11 — Bug Fixes, Documentation, Deployment Prep (8h)

**Parallel with Contract Day 10:** (contract documentation + deployment)

**Task 11.1: Bug bash + polish (3h)**
- [ ] Cross-browser: Chrome, Firefox, Brave
- [ ] Wallet: Hiro extension, Leather, Xverse mobile
- [ ] Mobile responsive: profile page layout at 375px viewport
- [ ] Accessibility: tab indexes, aria labels on star rating, contrast check (WCAG AA)
- [ ] Loading states: every async operation shows skeleton/spinner
- [ ] Empty states: "No ratings yet", "No portfolio items", "No feed events"
- [ ] Error states: wallet disconnected, network mismatch, contract call failure, API down
- **Estimated:** 3h

**Task 11.2: Documentation (2h)**
- [ ] Frontend README: setup instructions, env vars table, contract addresses, mock data toggle, demo mode flag
- [ ] Backend README: all route signatures with request/response examples, AI API key config, indexer setup
- [ ] JSDoc on key component props
- **Estimated:** 2h

**Task 11.3: Deployment configuration (3h)**
- [ ] **Frontend -> Vercel:**
  - `vercel.json` exists — verify build settings (`vite build`)
  - Set env vars in Vercel dashboard: `VITE_NETWORK=testnet`, `VITE_BACKEND_API_URL=https://api.cinex.io`, `VITE_DEMO_MODE=false`, `VITE_USE_MOCK_DATA=false`
  - Domain: `app.cinex.io`
- [ ] **Backend -> Railway:**
  - `Dockerfile`:
    ```dockerfile
    FROM node:20-alpine
    WORKDIR /app
    COPY package*.json ./
    RUN npm ci --omit=dev
    COPY src/ ./src/
    EXPOSE 3001
    CMD ["node", "src/index.js"]
    ```
  - Env: `DATABASE_URL`, `OPENAI_API_KEY`, `ALLOWED_ORIGINS`
- [ ] **Database -> Supabase (free tier):**
  - Create project, run `schema.sql` migration
  - Get `DATABASE_URL` -> set in Railway env
- [ ] **CI/CD (GitHub Actions):**
  ```yaml
  # Frontend: npm ci && npm run build && npm test
  # Backend:  npm ci && npm test
  ```
  - Deploy on push to `main`
- **Estimated:** 3h

---

#### Day 12 — Production Deployment with Demo Mode Configuration (6h)

**Parallel with Contract Day 10+:** (contract deployment finalized)

**Task 12.1: Production build configuration (2h)**
- [ ] Production build script ensures:
  - `VITE_USE_MOCK_DATA=false` (real contract calls)
  - `VITE_DEMO_MODE=false` (real wallet required)
  - All debug/development-only features disabled
- [ ] Create separate staging/demo deployment with `VITE_DEMO_MODE=true`:
  - Deployed to `demo.cinex.vercel.app`
  - Pre-seeded demo data: 2 demo profiles (creative + backer), 3 pools, 5 campaigns, 12 ratings, 20 feed events
- [ ] Add demo seed data to `scripts/seed-mock-data.sql`:
  ```sql
  -- Demo profiles
  INSERT INTO profiles (address, display_name, bio, project_vertical)
  VALUES
    ('ST1PQ...CREATIVE', 'Alex Filmmaker', 'Demo creative account exploring CineX', 'film'),
    ('ST1PQ...BACKER', 'Sam Supporter', 'Demo backer account exploring CineX', 'other');

  -- Demo user_settings
  INSERT INTO user_settings (address, role, onboarding_completed)
  VALUES
    ('ST1PQ...CREATIVE', 'creative', true),
    ('ST1PQ...BACKER', 'backer', true);
  ```
- **Estimated:** 2h

**Task 12.2: Deployment script with environment flag (1.5h)**
- [ ] Create `scripts/deploy-frontend.sh`:
  ```bash
  #!/bin/bash
  # Usage: ./deploy-frontend.sh [--demo]
  DEMO_FLAG=${2:-false}
  if [ "$DEMO_FLAG" = "--demo" ]; then
    vercel --prod --env VITE_DEMO_MODE=true --env VITE_USE_MOCK_DATA=true --env VITE_NETWORK=testnet
  else
    vercel --prod --env VITE_DEMO_MODE=false --env VITE_USE_MOCK_DATA=false --env VITE_NETWORK=testnet
  fi
  ```
- [ ] Create `scripts/deploy-backend.sh`:
  ```bash
  #!/bin/bash
  # Deploy backend without demo flag (backend is environment-agnostic)
  railway up --environment production
  ```
- [ ] Document deployment commands in README
- **Estimated:** 1.5h

**Task 12.3: Smoke tests on both deployments (1.5h)**
- [ ] Production smoke (`app.cinex.vercel.app`):
  - Wallet connect works (Hiro/Xverse)
  - Onboarding → role selection → dashboard loads
  - Profile, pool, feed pages render
  - Transaction modal appears on write actions
  - Network detector works (prompts switch if wrong network)
- [ ] Demo smoke (`demo.cinex.vercel.app`):
  - "Continue without wallet" → onboarding → role selected → dashboard with demo banner
  - All read-only pages work without wallet
  - Write actions show "Demo mode – connect wallet" toast
  - Network detector not visible (bypassed in demo mode)
  - Transaction modal simulates loading → success
- [ ] Verify env vars on both deployments
- **Estimated:** 1.5h

**Task 12.4: Post-deployment verification checklist (1h)**
- [ ] Wallet connects (Hiro + Xverse)
- [ ] Profile page loads for any address
- [ ] Reputation score displays (mock or real)
- [ ] Edit profile saves to backend API
- [ ] Rate User form submits transaction
- [ ] Pool page shows data
- [ ] Activity feed loads events
- [ ] AI summary generates and displays
- [ ] Onboarding flow completes for both roles
- [ ] Demo mode works without wallet
- [ ] Transaction modal shows correct states
- [ ] Network detector triggers on wrong network
- **Estimated:** 1h

---

## 3. API Endpoint Specifications

### 3.1 User Settings API

| Method | Path | Auth | Request Body | Response |
|--------|------|------|-------------|----------|
| `GET` | `/api/user-settings/:address` | No | — | `{ address, role, onboardingCompleted, createdAt }` or 404 |
| `POST` | `/api/user-settings` | Yes (`x-user-address`) | `{ address, role }` | Created/updated `{ address, role, onboardingCompleted, createdAt }` |

### 3.2 Profile API

| Method | Path | Auth | Request Body | Response |
|--------|------|------|-------------|----------|
| `GET` | `/api/profiles/:address` | No | — | `Profile` object or 404 |
| `PUT` | `/api/profiles/:address` | Yes (`x-user-address` header) | `{ displayName?, bio?, avatarUrl?, projectVertical? }` | Updated `Profile` |
| `GET` | `/api/portfolio/:address` | No | — | `PortfolioItem[]` |
| `POST` | `/api/portfolio/:address` | Yes | `{ title, description?, url?, completionYear? }` | Created `PortfolioItem` (201) |
| `DELETE` | `/api/portfolio/:id` | Yes | — | 204 No Content |

### 3.3 Feed API

| Method | Path | Auth | Query Params | Response |
|--------|------|------|-------------|----------|
| `GET` | `/api/feed/global` | No | `offset, limit, type, since` | `{ events: FeedEvent[], pagination }` |
| `GET` | `/api/feed/pool/:poolId` | No | `offset, limit, type, since` | `{ events: FeedEvent[], pagination }` |
| `GET` | `/api/feed/user/:address` | No | `offset, limit, type, since` | `{ events: FeedEvent[], pagination }` |

### 3.4 AI Summary API

| Method | Path | Auth | Request Body | Response |
|--------|------|------|-------------|----------|
| `POST` | `/api/ai-summary` | No (rate-limited by address) | `{ address }` | `{ address, summary, generatedAt, model, disclaimer }` or 429 |

---

## 4. Smart Contract Integration Notes

### 4.1 Reading Reputation Data

```
Contract: reputation.clar
Read-only: get-reputation-score (user principal) -> (response uint uint)
  - Returns: score (0-100 percentage)
  - Frontend: readOnlyFunction with contractAddress + contractName
  - Display: circular progress ring (SVG), coloured by threshold (green >=70, yellow 40-69, red <40)

Read-only: get-ratings-for-user (user principal) -> (response (list ...) uint)
  - Returns: list of {rater, campaign-id, rating, comment-hash, timestamp}
  - Frontend: render each as Rating component
  - Note: comment-hash is buff 32; resolve to actual comment via off-chain DB if available
```

### 4.2 Submitting a Rating

```
Contract: reputation.clar
Public: rate-user (target principal, campaign-id uint, rating uint, comment-hash (optional buff 32))

Frontend flow:
  1. User navigates to /rate/:targetAddress
  2. Selects collaboration from dropdown
  3. Selects rating (1-5)
  4. Optionally writes comment -> SHA256 hashed -> buff 32
  5. openContractCall with:
     - functionName: 'rate-user'
     - functionArgs: [principalCV(target), uintCV(campaignId), uintCV(rating), some(bufferCV(hash)) or noneCV()]
     - postConditions: []
  6. On success: redirect to /profile/:targetAddress
```

### 4.3 Reading Pool Data

```
Contract: funding-pool.clar
Read-only: get-pool (pool-id uint) -> (response Pool tuple uint)
  - Pool: {name, creator, target-amount, min-contribution, min-reputation, duration, total-committed, status, member-count, created-at}
Read-only: get-pool-members (pool-id uint, offset uint, limit uint) -> (response (list ...) uint)
  - Each: {committed-amount, contributed-amount, joined-at, is-active}
```

### 4.4 Reading Campaigns

```
Contract: milestone-escrow.clar
Read-only: get-campaign (campaign-id uint) -> (response Campaign tuple uint)
  - Campaign: {project-id, creator, asset, total-goal, total-deposited, milestones (list 10), status, created-at, deadline}
  - Each milestone: {name, amount, approved, released, proof-hash?, approved-by?, milestone-index}
```

### 4.5 Contract Address Resolution

```typescript
// src/utils/contractAddresses.ts
const NETWORK = import.meta.env.VITE_NETWORK || 'testnet';

const CONTRACT_ADDRESSES = {
  reputation: {
    testnet: { address: 'ST2VTFJEEJQN93Z6P3AFF6QN7M3WXY85ZPNDR3G51', name: 'reputation' },
    mainnet: { address: '', name: 'reputation' },
  },
  fundingPool: {
    testnet: { address: 'ST2VTFJEEJQN93Z6P3AFF6QN7M3WXY85ZPNDR3G51', name: 'funding-pool' },
    mainnet: { address: '', name: 'funding-pool' },
  },
  milestoneEscrow: {
    testnet: { address: 'ST2VTFJEEJQN93Z6P3AFF6QN7M3WXY85ZPNDR3G51', name: 'milestone-escrow' },
    mainnet: { address: '', name: 'milestone-escrow' },
  },
  verification: {
    testnet: { address: 'ST2VTFJEEJQN93Z6P3AFF6QN7M3WXY85ZPNDR3G51', name: 'project-verification-module' },
    mainnet: { address: '', name: 'project-verification-module' },
  },
};

export function getContractAddress(type: keyof typeof CONTRACT_ADDRESSES) {
  return CONTRACT_ADDRESSES[type][NETWORK].address;
}
```

---

## 5. Testing Plan

### 5.1 Frontend Unit Tests (Vitest)

| Test File | Test Cases |
|-----------|------------|
| `reputationService.test.ts` | 6: mock rate-user call args; noneCV vs some(bufferCV); error when unverified; self-rating |
| `profileService.test.ts` | 4: mock GET; mock PUT; 404 handling; 403 auth |
| `aiService.test.ts` | 4: POST summary; 429 rate limit; missing API key fallback; cache hit |
| `poolService.test.ts` | 4: GET pool; GET members; pagination; non-existent |
| `feedService.test.ts` | 4: global feed; pool filtered; user filtered; pagination |
| `StarRating.test.tsx` | 3: renders stars; interactive click; read-only mode |
| `onboardingService.test.ts` | 4: set-role; get-status; invalid role; demo mode flag |
| `RoleGuard.test.tsx` | 3: redirect unonboarded; render children; demo user passes |
| `CreatorDashboard.test.tsx` | 3: renders campaigns; empty state; stats display |
| `BackerDashboard.test.tsx` | 3: renders pools; yield panel; recommendations |
| `TransactionModal.test.tsx` | 4: 3 states render; demo mode auto-simulates; Escape dismisses |
| `NetworkDetector.test.tsx` | 2: wrong network shows banner; correct network null |
| `DemoModeBanner.test.tsx` | 2: visible in demo; hidden when not |

**Total frontend tests: ~46**

### 5.2 Backend Integration Tests (Jest)

| Test File | Test Cases |
|-----------|------------|
| `profiles.test.js` | 6: CRUD cycle; auth validation; field validation; 404 |
| `ai.test.js` | 5: valid -> 200; missing field -> 400; rate limit -> 429; cache hit; cache expiry |
| `feed.test.js` | 4: global pagination; pool filtered; user filtered; empty |
| `onboarding.test.js` | 4: POST set-role; GET status; PUT complete; auth validation |
| `userSettings.test.js` | 4: GET existing; POST create; POST update; invalid role 400 |

**Total backend tests: ~23**

### 5.3 E2E Flows (Manual + Playwright stubs)

- **Flow A:** Wallet connect -> profile view -> edit -> rate user -> confirm tx -> profile updated
- **Flow B:** Pool page -> view members -> view milestones -> view feed -> filter feed
- **Flow C:** Profile -> AI summary request -> modal -> cached re-request
- **Flow D (Onboarding):** No wallet -> /onboarding -> select role -> skip wallet -> dashboard with demo banner
- **Flow E (Demo):** Demo mode -> browse pools -> click write action -> toast "connect wallet"
- **Flow F (Network):** Switch wallet to mainnet -> NetworkDetector banner -> click switch -> resolves

---

## 6. Deployment Steps

### 6.1 Prerequisites

- Stacks testnet wallet (Hiro extension) funded with testnet STX
- OpenAI API key (or Claude API key)
- PostgreSQL database (Supabase free tier or Railway built-in)
- Vercel account (frontend)
- Railway / Render account (backend)

### 6.2 Environment Variables

**Frontend (.env):**
```
VITE_NETWORK=testnet
VITE_STACKS_API_URL=https://api.testnet.hiro.so
VITE_EXPLORER_URL=https://explorer.hiro.so/txid
VITE_BACKEND_API_URL=https://cinex-api.railway.app
VITE_MAIN_HUB_CONTRACT_ADDRESS=ST2VTFJEEJQN93Z6P3AFF6QN7M3WXY85ZPNDR3G51
VITE_MAIN_HUB_CONTRACT_NAME=CineX-project
VITE_REPUTATION_CONTRACT_NAME=reputation
VITE_FUNDING_POOL_CONTRACT_NAME=funding-pool
VITE_MILESTONE_ESCROW_CONTRACT_NAME=milestone-escrow
VITE_VERIFICATION_CONTRACT_NAME=project-verification-module
VITE_USE_MOCK_DATA=true
VITE_DEMO_MODE=false
VITE_DEMO_ADDRESS_CREATIVE=ST1PQ...CREATIVE
VITE_DEMO_ADDRESS_BACKER=ST1PQ...BACKER
```

**Backend (.env):**
```
PORT=3001
DATABASE_URL=postgresql://user:pass@host:5432/cinex
OPENAI_API_KEY=sk-...
AI_PROVIDER=openai
ALLOWED_ORIGINS=http://localhost:5173,https://cinex.vercel.app
STACKS_API_URL=https://api.testnet.hiro.so
```

### 6.3 Deploy Steps

1. **Database:** Run `backend/src/db/schema.sql` against Supabase SQL editor
2. **Backend:** `git push` -> Railway auto-deploys from GitHub repo
3. **Frontend (production):** `./scripts/deploy-frontend.sh` (sets demo=false, mock=false)
4. **Frontend (demo preview):** `./scripts/deploy-frontend.sh --demo` (sets demo=true, mock=true)
5. **Verify:**
   - `GET https://cinex-api.railway.app/api/profiles/ST1...` returns 200
   - `https://app.cinex.vercel.app/` loads with wallet connect
   - `https://demo.cinex.vercel.app/` loads with demo banner
6. **Switch from mock to real:** Set `VITE_USE_MOCK_DATA=false` on production only
7. **Enable AI:** Set `OPENAI_API_KEY` in Railway env, restart backend

### 6.4 Post-Deployment Verification

- [ ] Wallet connects (Hiro + Xverse)
- [ ] Profile page loads for any address
- [ ] Reputation score displays (mock or real)
- [ ] Edit profile saves to backend API
- [ ] Rate User form submits transaction
- [ ] Pool page shows data (mock or real)
- [ ] Activity feed loads events
- [ ] AI summary generates and displays
- [ ] Onboarding flow: wallet + role selection + dashboard redirect
- [ ] Demo mode: no wallet needed, banner visible, read-only works
- [ ] Transaction modal: loading → auto-close (demo) or real tx lifecycle
- [ ] Network detector: prompts switch on wrong network
- [ ] All API endpoints return expected formats

---

## 7. Summary Timeline (Gantt)

| Day | Focus | Key Deliverables |
|-----|-------|-----------------|
| 1 | Project setup, wallet, service scaffolding, types | Services with mock data, wallet connection functional |
| 2 | Backend API, profile page shell, common components | Express server + DB schema, ProfilePage route, StarRating |
| 2.5 | Onboarding & Role Selection | /onboarding page, role select, user_settings table, RoleGuard |
| 3 | Reputation data + verification badge + ratings display | Profile reads `reputation.clar`, verification badge, ratings list |
| 3.5 | Role-Based Dashboards | CreatorDashboard, BackerDashboard, 4 new hooks |
| 4 | Profile editing + portfolio CRUD (off-chain) | Edit profile modal, portfolio CRUD, backend CRUD API complete |
| 5 | Rating UI + contract call integration | RateUserPage, RatingForm, real `rate-user` `openContractCall` |
| 6 | Tribe (pool) homepage + milestone display | PoolPage, MemberList, MilestoneProgress bar |
| 7 | Activity feed indexer + API + UI | Feed indexer, 3 feed API routes, ActivityFeedPage + filters |
| 8 | AI credibility summary | AI API route, AICredibilityModal, useAISummary hook, rate limiting |
| 9 | Demo Mode & Tx Feedback & Network Detection | DemoModeContext, TransactionModal, NetworkDetector, demoService |
| 10 | Integration testing | ~69 tests (frontend + backend), 3 E2E flows verified |
| 11 | Bug fixes, documentation, deployment | READMEs, Dockerfile, CI/CD configuration |
| 12 | Production deployment + demo config | Production/demo deployments, smoke tests, seed data |

---

## 8. Post-Sprint: Pyth/Hermes Frontend Integration

**Status:** Planned (v2, after 2-week sprint)
**Roadmap:** See `CINEX_PYTH_ORACLE_INTEGRATION_v2_ROADMAP.md` for the full v2 Pyth integration strategy.

When the oracle-proxy contract is upgraded to accept Pyth VAAs (post-sprint v2 work), the frontend needs a service to fetch and submit VAAs alongside contract calls.

**New files:**
- `src/services/pythService.ts` — wraps `@pythnetwork/hermes-client` to fetch VAAs for STX/USD and BTC/USD price feeds. Falls back to mock data when `VITE_USE_MOCK_DATA=true`.
- `src/hooks/usePythPrice.ts` — returns `{ price, vaaBytes, isLoading, isStale }` for use in transaction flows that need fresh prices.

**Modified files:**
- `src/services/index.ts` — add Pyth service to factory
- `src/hooks/useTransaction.ts` — optionally attach VAA bytes to contract calls targeting oracle-proxy

**Mock strategy:** When `VITE_USE_MOCK_DATA=true`, `pythService.ts` returns a canned VAA hex string (pre-encoded mock price). No Hermes SDK calls are made.

**Dependencies:** `npm install @pythnetwork/hermes-client`

---

## 9. Files to Create (68 total)

```
frontend-v2/src/ (27 new files)
+-- components/onboarding/RoleSelector.tsx
+-- components/onboarding/OnboardingWizard.tsx
+-- components/onboarding/RoleGuard.tsx
+-- components/dashboard/CreatorDashboard.tsx
+-- components/dashboard/BackerDashboard.tsx
+-- components/dashboard/CampaignOverview.tsx
+-- components/dashboard/PoolOverview.tsx
+-- components/dashboard/YieldPanel.tsx
+-- components/dashboard/RecommendationCard.tsx
+-- components/demo/DemoModeBanner.tsx
+-- components/demo/TransactionModal.tsx
+-- components/demo/NetworkDetector.tsx
+-- components/profile/ProfileHeader.tsx
+-- components/profile/ProfileBio.tsx
+-- components/profile/PortfolioList.tsx
+-- components/profile/RatingsReceived.tsx
+-- components/profile/TribeAffiliations.tsx
+-- components/profile/AICredibilityModal.tsx
+-- components/profile/EditProfileModal.tsx
+-- components/profile/VerificationBadge.tsx
+-- components/rating/RatingForm.tsx
+-- components/rating/StarRating.tsx
+-- components/pool/PoolHeader.tsx
+-- components/pool/MemberList.tsx
+-- components/pool/MilestoneProgress.tsx
+-- components/pool/ProposalCard.tsx
+-- components/feed/ActivityFeed.tsx
+-- components/feed/ActivityFeedItem.tsx
+-- components/feed/FeedFilters.tsx
+-- components/common/CommentHashInput.tsx
+-- pages/OnboardingPage.tsx
+-- pages/CreatorDashboardPage.tsx
+-- pages/BackerDashboardPage.tsx
+-- pages/ProfilePage.tsx
+-- pages/RateUserPage.tsx
+-- pages/PoolPage.tsx
+-- pages/ActivityFeedPage.tsx
+-- services/onboardingService.ts
+-- services/reputationService.ts
+-- services/profileService.ts
+-- services/poolService.ts
+-- services/milestoneService.ts
+-- services/feedService.ts
+-- services/aiService.ts
+-- services/demoService.ts
+-- hooks/useOnboarding.ts
+-- hooks/useRole.ts
+-- hooks/useUserCampaigns.ts
+-- hooks/useUserPools.ts
+-- hooks/useBackedCampaigns.ts
+-- hooks/useUserYield.ts
+-- hooks/useTransaction.ts
+-- hooks/useNetworkDetection.ts
+-- hooks/useReputation.ts
+-- hooks/usePool.ts
+-- hooks/useMilestones.ts
+-- hooks/useActivityFeed.ts
+-- hooks/useAISummary.ts
+-- hooks/useSharedCampaigns.ts
+-- context/DemoModeContext.tsx
+-- utils/commentHash.ts
+-- utils/demoAddresses.ts

backend/ (17 new files)
+-- package.json
+-- Dockerfile
+-- nodemon.json
+-- src/index.js
+-- src/config.js
+-- src/db/schema.sql
+-- src/db/connection.js
+-- src/routes/userSettings.js
+-- src/routes/profiles.js
+-- src/routes/portfolio.js
+-- src/routes/feed.js
+-- src/routes/ai.js
+-- src/routes/indexer.js
+-- src/services/aiService.js
+-- src/services/feedIndexer.js

tests/ (14 new files)
+-- reputationService.test.ts
+-- profileService.test.ts
+-- aiService.test.ts
+-- poolService.test.ts
+-- feedService.test.ts
+-- StarRating.test.tsx
+-- onboardingService.test.ts
+-- RoleGuard.test.tsx
+-- CreatorDashboard.test.tsx
+-- BackerDashboard.test.tsx
+-- TransactionModal.test.tsx
+-- NetworkDetector.test.tsx
+-- DemoModeBanner.test.tsx
+-- backend/__tests__/profiles.test.js
+-- backend/__tests__/ai.test.js
+-- backend/__tests__/feed.test.js
+-- backend/__tests__/onboarding.test.js
+-- backend/__tests__/userSettings.test.js

config/scripts/ (7 new files)
+-- scripts/deploy-frontend.sh
+-- scripts/deploy-backend.sh
+-- scripts/seed-mock-data.sql
```

**Total: 68 files** (44 source, 18 test, 7 config/scripts)

---

*End of plan.*
