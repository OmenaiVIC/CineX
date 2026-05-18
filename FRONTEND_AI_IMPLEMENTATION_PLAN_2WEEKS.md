# CineX Frontend & AI Implementation Plan — 2-Week Sprint

> **Scope:** User Profile page, Rating UI, Tribe (Pool) Homepage, Activity Feed, AI Credibility Summary
> **Framework:** React (Vite) + Tailwind CSS v4 + Stacks Web3 SDK
> **Backend:** Node.js/Express API (off-chain profile store, activity feed indexer, AI proxy)
> **Database:** PostgreSQL (or Supabase) for off-chain data
> **AI:** OpenAI / Claude API for credibility summaries
> **Team:** 1 senior full-stack dev (80h), 1 AI integration specialist (20h)
> **Total estimated effort:** ~100 person-hours

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

**Mock-first strategy:** Each frontend service layer starts with a mock implementation (returning realistic sample data). When the corresponding contract is deployed to devnet/testnet, the service swaps to real `openContractCall` / read-only calls. A `VITE_USE_MOCK_DATA` feature flag controls the switch.

---

## 1. File Structure

The plan extends the existing `frontend-v2-legacy` codebase. All new files are noted with `**NEW**`.

```
frontend-v2/
├── src/
│   ├── app/
│   │   └── router.jsx                     # **MODIFY** — add /profile/:address, /rate/:address, /pool/:id, /feed routes
│   ├── components/
│   │   ├── profile/
│   │   │   ├── ProfileHeader.tsx          # **NEW** — avatar, name, reputation badge, verification badge, AI button
│   │   │   ├── ProfileBio.tsx             # **NEW** — editable bio section
│   │   │   ├── PortfolioList.tsx          # **NEW** — list of past projects (off-chain)
│   │   │   ├── RatingsReceived.tsx        # **NEW** — list of ratings received (from reputation.clar)
│   │   │   ├── TribeAffiliations.tsx      # **NEW** — list of pool memberships
│   │   │   ├── AICredibilityModal.tsx     # **NEW** — modal displaying AI summary
│   │   │   ├── EditProfileModal.tsx       # **NEW** — modal for editing bio + portfolio
│   │   │   └── VerificationBadge.tsx      # **NEW** — blue checkmark + vertical tag
│   │   ├── rating/
│   │   │   ├── RatingForm.tsx             # **NEW** — 1-5 star selector + optional comment
│   │   │   └── StarRating.tsx             # **NEW** — reusable star display (filled/half/empty + interactive)
│   │   ├── pool/
│   │   │   ├── PoolHeader.tsx             # **NEW** — pool name, target, status, reputation gate
│   │   │   ├── MemberList.tsx             # **NEW** — list of pool members (linked to profiles)
│   │   │   ├── MilestoneProgress.tsx      # **NEW** — milestone completion bars
│   │   │   └── ProposalCard.tsx           # **NEW** — allocation proposal card with vote buttons
│   │   ├── feed/
│   │   │   ├── ActivityFeed.tsx           # **NEW** — per-pool feed component
│   │   │   ├── ActivityFeedItem.tsx       # **NEW** — single feed event (icon + actor + action + timestamp)
│   │   │   └── FeedFilters.tsx            # **NEW** — filter by event type, pool, date range
│   │   └── common/
│   │       ├── CommentHashInput.tsx       # **NEW** — text area -> SHA256 -> optional buff 32
│   │       ├── ContractCallButton.tsx     # **NEW** — generic button with tx modal integration
│   │       └── ErrorBoundary.tsx          # **MODIFY** — already exists, extend for new pages
│   ├── pages/
│   │   ├── ProfilePage.tsx                # **NEW** — /profile/:userAddress
│   │   ├── RateUserPage.tsx               # **NEW** — /rate/:userAddress
│   │   ├── PoolPage.tsx                   # **NEW** — /pool/:poolId (replaces placeholder blog page)
│   │   └── ActivityFeedPage.tsx           # **NEW** — /feed
│   ├── services/
│   │   ├── reputationService.ts           # **NEW** — read/write reputation.clar (mock + real)
│   │   ├── profileService.ts              # **NEW** — off-chain profile CRUD (API calls)
│   │   ├── poolService.ts                 # **NEW** — read funding-pool.clar data
│   │   ├── milestoneService.ts            # **NEW** — read milestone-escrow.clar data
│   │   ├── feedService.ts                 # **NEW** — read activity feed from indexer API
│   │   ├── aiService.ts                   # **NEW** — call /api/ai-summary endpoint
│   │   └── index.ts                       # **MODIFY** — add new services to factory
│   ├── hooks/
│   │   ├── useReputation.ts              # **NEW** — fetch reputation score + ratings
│   │   ├── usePool.ts                    # **NEW** — fetch pool data + members
│   │   ├── useMilestones.ts              # **NEW** — fetch campaign milestones
│   │   ├── useActivityFeed.ts            # **NEW** — fetch feed with pagination
│   │   ├── useAISummary.ts              # **NEW** — fetch + cache AI credibility summary
│   │   └── useSharedCampaigns.ts        # **NEW** — find completed collaborations between two users
│   ├── types/
│   │   └── index.ts                       # **MODIFY** — add Profile, Rating, Pool, FeedEvent, Milestone, Campaign
│   └── utils/
│       ├── commentHash.ts                 # **NEW** — SHA256 of comment string -> buff 32
│       └── contractAddresses.ts           # **MODIFY** — add new contract address env vars

backend/
├── package.json                           # **NEW** — express, pg, openai, cors, helmet, morgan, dotenv
├── Dockerfile                             # **NEW** — deploy to Railway/Render
├── nodemon.json                           # **NEW** — dev auto-restart
├── src/
│   ├── index.js                           # **NEW** — Express app entry, CORS, routes, error middleware
│   ├── config.js                          # **NEW** — env vars (DATABASE_URL, OPENAI_API_KEY, PORT, ALLOWED_ORIGINS)
│   ├── db/
│   │   ├── schema.sql                     # **NEW** — profiles, portfolio_items, feed_events, ai_summaries tables
│   │   ├── migrate.js                     # **NEW** — run schema.sql against database
│   │   └── connection.js                  # **NEW** — pg Pool singleton
│   ├── routes/
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
├── deploy-frontend.sh                     # **NEW** — Vercel deploy script
├── deploy-backend.sh                      # **NEW** — Railway deploy script
└── seed-mock-data.sql                     # **NEW** — 3 test profiles, 6 portfolio items, 10 feed events
```

**Total: ~53 new files** (20 frontend components/pages, 15 backend files, 11 test files, 7 config/scripts)

---

## 2. Daily Breakdown

### Week 1 — Foundation, Profiles, Ratings

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
- [ ] Create `src/components/common/ContractCallButton.tsx` — generic button that shows "Confirm in wallet" -> tracks tx via `TransactionTracker` -> shows success/error
- **Estimated:** 2h

---

#### Day 3 — Profile Page: Reputation Data + Verification Badge (8h)

**Parallel with Contract Day 3:** (project-verification-module complete)

**Task 3.1: Wire reputationService to reputation.clar read calls (3h)**
- [ ] Implement real `reputationService.getReputationScore(address)`:
  - Read-only call: `contract-call? .reputation get-reputation-score address`
  - Uses `@stacks/transactions` `readOnlyFunction`
  - Returns `{ totalRatings, score }`
- [ ] Implement real `reputationService.getRatingsForUser(address, offset?, limit?)`:
  - Read-only call: `contract-call? .reputation get-ratings-for-user address`
  - Handle list response
  - For each rating, attempt to resolve `comment-hash` -> actual comment from off-chain DB (optional)
- [ ] Add `USE_MOCK_DATA` toggle in service factory: if `false`, use real contract calls; if `true`, mock data
- [ ] Display reputation score as SVG circular progress ring in `ProfileHeader.tsx`
- **Estimated:** 3h

**Task 3.2: Verification badge (2h)**
- [ ] Create `src/components/profile/VerificationBadge.tsx`:
  - Calls `project-verification-module::is-creator-currently-verified` read-only (via `verificationService`)
  - Blue checkmark if verified, grey outline if not
  - Shows `project-vertical` tag: "Film" | "Music" | "Game" | "Immersive Media" | "Other"
  - Tooltip on hover: verification level, expiration block height
- [ ] Integrate into `ProfileHeader.tsx`
- **Estimated:** 2h

**Task 3.3: Ratings received section (2h)**
- [ ] In `RatingsReceived.tsx`:
  - For each rating: rater avatar (or initial), star display, comment (if resolved), link to campaign
  - Paginated: "Load more" button (offset/limit)
  - Empty state: "No ratings yet. Be the first to collaborate with this creator."
  - Rater name links to `/profile/:raterAddress`
- **Estimated:** 2h

**Task 3.4: Tribe affiliations section (1h)**
- [ ] `src/components/profile/TribeAffiliations.tsx`:
  - Read pool memberships from `poolService` (mock initially, real when `funding-pool.clar` deployed)
  - Display pool cards: name, status badge, member count, funding progress
  - Each card links to `/pool/:poolId`
- **Estimated:** 1h

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

### Week 2 — Pools, Activity Feed, AI, Testing

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

#### Day 9 — Integration Testing + Full Flow Validation (8h)

**Parallel with Contract Day 10:** (contract E2E tests complete)

**Task 9.1: Frontend unit tests (Vitest) (3h)**
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

**Task 9.2: Backend integration tests (Jest) (2h)**
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

**Task 9.3: End-to-end user flow testing on testnet (3h)**
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

#### Day 10 — Bug Fixes, Documentation, Deployment Prep (8h)

**Parallel with Contract Day 10:** (contract documentation + deployment)

**Task 10.1: Bug bash + polish (3h)**
- [ ] Cross-browser: Chrome, Firefox, Brave
- [ ] Wallet: Hiro extension, Leather, Xverse mobile
- [ ] Mobile responsive: profile page layout at 375px viewport
- [ ] Accessibility: tab indexes, aria labels on star rating, contrast check (WCAG AA)
- [ ] Loading states: every async operation shows skeleton/spinner
- [ ] Empty states: "No ratings yet", "No portfolio items", "No feed events"
- [ ] Error states: wallet disconnected, network mismatch, contract call failure, API down
- **Estimated:** 3h

**Task 10.2: Documentation (2h)**
- [ ] Frontend README: setup instructions, env vars table, contract addresses, mock data toggle
- [ ] Backend README: all route signatures with request/response examples, AI API key config, indexer setup
- [ ] JSDoc on key component props
- **Estimated:** 2h

**Task 10.3: Deployment configuration (3h)**
- [ ] **Frontend -> Vercel:**
  - `vercel.json` exists — verify build settings (`vite build`)
  - Set env vars in Vercel dashboard: `VITE_NETWORK=testnet`, `VITE_BACKEND_API_URL=https://api.cinex.io`
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

## 3. API Endpoint Specifications

### 3.1 Profile API

| Method | Path | Auth | Request Body | Response |
|--------|------|------|-------------|----------|
| `GET` | `/api/profiles/:address` | No | — | `Profile` object or 404 |
| `PUT` | `/api/profiles/:address` | Yes (`x-user-address` header) | `{ displayName?, bio?, avatarUrl?, projectVertical? }` | Updated `Profile` |
| `GET` | `/api/portfolio/:address` | No | — | `PortfolioItem[]` |
| `POST` | `/api/portfolio/:address` | Yes | `{ title, description?, url?, completionYear? }` | Created `PortfolioItem` (201) |
| `DELETE` | `/api/portfolio/:id` | Yes | — | 204 No Content |

### 3.2 Feed API

| Method | Path | Auth | Query Params | Response |
|--------|------|------|-------------|----------|
| `GET` | `/api/feed/global` | No | `offset, limit, type, since` | `{ events: FeedEvent[], pagination }` |
| `GET` | `/api/feed/pool/:poolId` | No | `offset, limit, type, since` | `{ events: FeedEvent[], pagination }` |
| `GET` | `/api/feed/user/:address` | No | `offset, limit, type, since` | `{ events: FeedEvent[], pagination }` |

### 3.3 AI Summary API

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

**Total frontend tests: ~25**

### 5.2 Backend Integration Tests (Jest)

| Test File | Test Cases |
|-----------|------------|
| `profiles.test.js` | 6: CRUD cycle; auth validation; field validation; 404 |
| `ai.test.js` | 5: valid -> 200; missing field -> 400; rate limit -> 429; cache hit; cache expiry |
| `feed.test.js` | 4: global pagination; pool filtered; user filtered; empty |

**Total backend tests: ~15**

### 5.3 E2E Flows (Manual + Playwright stubs)

- **Flow A:** Wallet connect -> profile view -> edit -> rate user -> confirm tx -> profile updated
- **Flow B:** Pool page -> view members -> view milestones -> view feed -> filter feed
- **Flow C:** Profile -> AI summary request -> modal -> cached re-request

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
3. **Frontend:** `vercel --prod` or git push -> Vercel auto-deploys
4. **Verify:**
   - `GET https://cinex-api.railway.app/api/profiles/ST1...` returns 200
   - `https://cinex.vercel.app/` loads with wallet connect button
   - Wallet connects, test profile loads
5. **Switch from mock to real:** Set `VITE_USE_MOCK_DATA=false` in Vercel env, verify contract calls work
6. **Enable AI:** Set `OPENAI_API_KEY` in Railway env, restart backend

### 6.4 Post-Deployment Verification

- [ ] Wallet connects (Hiro + Xverse)
- [ ] Profile page loads for any address
- [ ] Reputation score displays (mock or real)
- [ ] Edit profile saves to backend API
- [ ] Rate User form submits transaction
- [ ] Pool page shows data (mock or real)
- [ ] Activity feed loads events
- [ ] AI summary generates and displays
- [ ] All API endpoints return expected formats
- [ ] Error states display correctly (disconnected, network mismatch, contract error)

---

## 7. Summary Timeline (Gantt)

| Day | Focus | Key Deliverables |
|-----|-------|-----------------|
| 1 | Project setup, wallet, service scaffolding, types | Services with mock data, wallet connection functional |
| 2 | Backend API, profile page shell, common components | Express server + DB schema, ProfilePage route, StarRating |
| 3 | Reputation data + verification badge + ratings display | Profile reads `reputation.clar`, verification badge, ratings list |
| 4 | Profile editing + portfolio CRUD (off-chain) | Edit profile modal, portfolio CRUD, backend CRUD API complete |
| 5 | Rating UI + contract call integration | RateUserPage, RatingForm, real `rate-user` `openContractCall` |
| 6 | Tribe (pool) homepage + milestone display | PoolPage, MemberList, MilestoneProgress bar |
| 7 | Activity feed indexer + API + UI | Feed indexer, 3 feed API routes, ActivityFeedPage + filters |
| 8 | AI credibility summary | AI API route, AICredibilityModal, useAISummary hook, rate limiting |
| 9 | Integration testing | ~40 tests (frontend + backend), 3 E2E flows verified |
| 10 | Bug fixes, documentation, deployment | READMEs, Dockerfile, deployed to testnet + Vercel |

---

## 8. Files to Create (53 total)

```
frontend-v2/src/ (20 new files)
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
+-- components/common/ContractCallButton.tsx
+-- pages/ProfilePage.tsx
+-- pages/RateUserPage.tsx
+-- pages/PoolPage.tsx
+-- pages/ActivityFeedPage.tsx
+-- services/reputationService.ts
+-- services/profileService.ts
+-- services/poolService.ts
+-- services/milestoneService.ts
+-- services/feedService.ts
+-- services/aiService.ts
+-- hooks/useReputation.ts
+-- hooks/usePool.ts
+-- hooks/useMilestones.ts
+-- hooks/useActivityFeed.ts
+-- hooks/useAISummary.ts
+-- hooks/useSharedCampaigns.ts
+-- utils/commentHash.ts

backend/ (15 new files)
+-- package.json
+-- Dockerfile
+-- nodemon.json
+-- src/index.js
+-- src/config.js
+-- src/db/schema.sql
+-- src/db/connection.js
+-- src/routes/profiles.js
+-- src/routes/portfolio.js
+-- src/routes/feed.js
+-- src/routes/ai.js
+-- src/routes/indexer.js
+-- src/services/aiService.js
+-- src/services/feedIndexer.js

tests/ (11 new files)
+-- reputationService.test.ts
+-- profileService.test.ts
+-- aiService.test.ts
+-- poolService.test.ts
+-- feedService.test.ts
+-- StarRating.test.tsx
+-- backend/__tests__/profiles.test.js
+-- backend/__tests__/ai.test.js
+-- backend/__tests__/feed.test.js

config/scripts/ (7 new files)
+-- scripts/deploy-frontend.sh
+-- scripts/deploy-backend.sh
+-- scripts/seed-mock-data.sql
```

**Total: 53 files** (35 source, 11 test, 7 config/scripts)

---

*End of plan.*
