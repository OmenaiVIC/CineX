# CineX Backend Smart Contracts

Clarity smart contracts for decentralized film crowdfunding on Stacks blockchain.

## Table of Contents
- [Architecture Overview](#architecture-overview)
- [Core Smart Contracts](#core-smart-contracts)
- [Module System](#module-system)
- [Trait System](#trait-system)
- [Frontend-Backend Integration](#frontend-backend-integration)
- [Deployment](#deployment)

## Architecture Overview

CineX uses a modular hub-and-spoke architecture for upgradeability and separation of concerns:

```
┌─────────────────────────────────────────────────────────────┐
│                    CineX-project (Hub)                      │
│  - Admin management (safe transfers, pending admin)        │
│  - Module registration & validation                        │
│  - Emergency controls (pause, fund recovery)               │
│  - Cross-module coordination                               │
└───────────┬─────────────────────────────────────┬───────────┘
            │                                     │
    ┌───────▼────────┐                   ┌───────▼────────┐
    │ Core Modules   │                   │ Advanced Modules│
    └───────┬────────┘                   └───────┬────────┘
            │                                     │
   ┌────────┴────────┐              ┌────────────┴───────────────┐
   │                 │              │                            │
┌──▼──────────┐ ┌───▼─────────┐ ┌──▼──────────────┐ ┌──────────▼───────┐
│Crowdfunding │ │  Escrow     │ │ Co-EP Rotating  │ │ Film Verification│
│  Module     │ │  Module     │ │ Fundings        │ │   Module         │
└──┬──────────┘ └───┬─────────┘ └──┬──────────────┘ └──────────┬───────┘
   │                │              │                            │
   └────────┬───────┴──────────────┴────────────────────────────┘
            │
     ┌──────▼──────┐
     │   Rewards   │
     │   Module    │
     └─────────────┘
```

**Design Principles:**
- **Modularity**: Each module handles a specific domain (campaigns, escrow, verification)
- **Upgradeability**: Hub can swap module addresses without redeployment
- **Emergency Safety**: Global pause and fund recovery mechanisms
- **Trait-Based**: Standardized interfaces ensure cross-module compatibility

## Core Smart Contracts

### 1. CineX-project (Main Hub)

**Purpose**: Central coordination point for all platform modules

**Key Responsibilities:**
- **Admin Management**: Safe two-step admin transfers with timeout (144 blocks ~24 hours)
- **Module Registry**: Stores and validates addresses of all active modules
- **Emergency Controls**: System-wide pause and selective fund recovery
- **Authorization**: Delegates operations to modules with validation

**Core Functions:**

```clarity
;; Safe Admin Transfer (Two-Step)
(define-public (safe-propose-admin-transfer (new-admin principal) ...)
  ;; Current admin proposes new admin
  ;; Sets pending-admin with 24-hour expiration
)

(define-public (accept-pending-admin-transfer)
  ;; Prospective admin accepts within timeout
  ;; Prevents unauthorized admin hijacking
)

;; Module Management
(define-public (set-crowdfunding-module (new-module principal) ...)
  ;; Admin updates module address
  ;; Validates not burn address or duplicate
)

;; Emergency Operations
(define-public (emergency-pause-or-not-pause-system (pause bool) ...)
  ;; Pauses all modules simultaneously
  ;; Cascades pause state to registered modules
)

(define-public (emergency-fund-recovery (module <core-emergency-module>) ...)
  ;; Recovers funds from specific module
  ;; Requires system pause + admin authorization
  ;; Enforces withdrawal limits (100,000 STX max)
)
```

**State Variables:**
- `contract-admin`: Current admin address
- `pending-admin`: Proposed new admin (optional)
- `emergency-pause`: System-wide pause state
- Module addresses: `crowdfunding-module`, `escrow-module`, `rewards-module`, `co-ep-module`, `film-verification-module`

**Security Features:**
- Admin transfer timeout (u144 blocks)
- Burn address prevention (`SP000000000000000000002Q6VF78`)
- Large fund recovery limit (100,000 STX)
- Comprehensive audit logging via `print`

---

### 2. Crowdfunding Module

**Purpose**: Manages campaign lifecycle from creation to fund claiming

**Campaign Lifecycle:**
```
Create Campaign → Active → Funding Period → Goal Reached/Not Reached → Claim/Refund
```

**Key Functions:**

```clarity
;; Create Campaign
(define-public (create-campaign 
  (description (string-ascii 500))
  (campaign-id uint)
  (funding-goal uint)
  (duration uint)
  (reward-tiers uint)
  (reward-description (string-ascii 150))
  (verification-address <crwd-verification-trait>))
  
  ;; Validations:
  ;; - Funding goal: MIN-FUNDING (1 STX) to MAX-FUNDING (100,000 STX)
  ;; - Duration: MIN-CAMPAIGN-DURATION (4320 blocks ~30 days)
  ;; - Reward tiers: u1 to MAX-REWARD-TIERS (u10)
  ;; - Filmmaker verification status checked
  
  ;; Actions:
  ;; - Collects CAMPAIGN-FEE (5 STX)
  ;; - Stores campaign in campaigns map
  ;; - Returns unique campaign-id
)

;; Contribute to Campaign
(define-public (contribute-to-campaign 
  (campaign-id uint)
  (amount uint)
  (escrow-address <crwd-escrow-trait>))
  
  ;; Validations:
  ;; - Campaign is-active and not expired
  ;; - Contribution >= MIN-FUNDING
  ;; - Total raised <= funding-goal
  
  ;; Actions:
  ;; - Transfers STX to escrow via deposit-to-campaign
  ;; - Updates campaign total-raised
  ;; - Records contribution in campaign-contributions map
)

;; Claim Funds (Called by Hub)
(define-public (claim-campaign-funds 
  (campaign-id uint)
  (escrow-address <crwd-escrow-trait>))
  
  ;; Validations:
  ;; - Caller is authorized core contract
  ;; - Funding goal reached
  ;; - Funds not already claimed
  
  ;; Actions:
  ;; - Calculates 5% platform fee
  ;; - Withdraws (total-raised - fee) to campaign owner
  ;; - Collects fee to core contract
  ;; - Marks funds-claimed: true
)
```

**Campaign Structure:**
```clarity
{
  description: (string-ascii 500),
  funding-goal: uint,
  duration: uint,
  created-at: uint,
  owner: principal,
  reward-tiers: uint,
  reward-description: (string-ascii 150),
  total-raised: uint,
  is-active: bool,
  funds-claimed: bool,
  is-verified: bool,
  verification-level: uint,  // u0, u1 (basic), u2 (standard)
  expires-at: uint,
  last-activity-at: uint
}
```

**Contribution Tracking:**
```clarity
{
  total-contributed: uint,
  contributions-count: uint,
  first-contribution-at: uint,
  last-contribution-at: uint
}
```

**Constants:**
- `CAMPAIGN-FEE`: u50000000 (5 STX campaign creation fee)
- `MIN-FUNDING`: u1000000 (1 STX minimum)
- `MAX-FUNDING`: u100000000000 (100,000 STX maximum)
- `WITHDRAWAL-FEE-PERCENT`: u5 (5% platform fee on withdrawals)
- `MIN-CAMPAIGN-DURATION`: u4320 (30 days in blocks)

---

### 3. Escrow Module

**Purpose**: Secure fund custody during campaign lifecycle

**Fund Flow:**
```
Contributor → deposit-to-campaign → Escrow Balance → withdraw-from-campaign → Owner
                                                  → collect-campaign-fee → Core Contract
```

**Key Functions:**

```clarity
;; Deposit Funds
(define-public (deposit-to-campaign (campaign-id uint) (amount uint))
  ;; Actions:
  ;; - Transfers STX from contributor to escrow contract
  ;; - Updates campaign-escrow-balances map
  ;; - No authorization check (public deposit)
)

;; Authorize Withdrawal (Hub Only)
(define-public (authorize-withdrawal (campaign-id uint) (requester principal))
  ;; Validations:
  ;; - Caller must be core contract
  
  ;; Actions:
  ;; - Sets authorized-withdrawals flag
  ;; - One-time use (cleared after withdrawal)
)

;; Withdraw Funds (Authorized)
(define-public (withdraw-from-campaign (campaign-id uint) (amount uint))
  ;; Validations:
  ;; - Requester is authorized
  ;; - Sufficient escrow balance
  
  ;; Actions:
  ;; - Transfers STX from escrow to requester
  ;; - Updates campaign-escrow-balances
  ;; - Clears authorization
)

;; Collect Fee (Authorized)
(define-public (collect-campaign-fee (campaign-id uint) (fee-amount uint))
  ;; Validations:
  ;; - Requester is authorized for fee collection
  ;; - Sufficient escrow balance
  
  ;; Actions:
  ;; - Transfers fee to core contract
  ;; - Updates escrow balance
  ;; - Clears authorization
)
```

**Authorization Pattern:**
```
Hub calls authorize-withdrawal → Sets flag in authorized-withdrawals map
Campaign owner calls withdraw-from-campaign → Checks flag → Transfers → Clears flag
```

**Read-Only Functions:**
```clarity
(define-read-only (get-campaign-balance (campaign-id uint))
  ;; Returns escrow balance for campaign
  ;; Used by frontend to display raised funds
)
```

---

### 4. Co-EP Rotating Fundings

**Purpose**: Nigerian Esusu/Ajo-inspired filmmaker cooperative funding pools

**Concept**: Professional filmmakers form mutual credit unions where members contribute equally and rotate as beneficiaries.

**Pool Lifecycle:**
```
Create Pool → Members Join → Pool Activates → Rotation 1 → ... → Rotation N → Completed
```

**Key Functions:**

```clarity
;; Create Pool
(define-public (create-new-rotating-funding-pool
  (new-project-id uint)
  (new-pool-name (string-utf8 100))
  (standard-max-members uint)
  (standard-contribution-per-member uint)
  (pool-cycle-duration uint)
  (pool-legal-agreement-hash (buff 32))
  (pool-category (string-ascii 30))
  (pool-geographic-focus (string-ascii 50))
  (verification-address <coep-verification-trait>))
  
  ;; Validations:
  ;; - Creator is verified filmmaker
  ;; - Creator has verified project collaborations
  ;; - Pool size: u2 to u20 members
  
  ;; Actions:
  ;; - Creates pool in rotating-funding-pools map
  ;; - Adds creator as first member
  ;; - Status: "forming"
)

;; Join Pool (Requires Mutual Connection)
(define-public (join-existing-pool
  (existing-pool-id uint)
  (referrer principal)
  (mutual-project-ids (list 10 uint))
  (new-title (string-utf8 100))
  (new-description (string-ascii 500))
  (expected-completion uint))
  
  ;; Validations:
  ;; - Pool status is "forming"
  ;; - Pool not full
  ;; - Referrer is existing pool member
  ;; - Requester has verified mutual projects with creator
  
  ;; Actions:
  ;; - Adds member to pool-individual-members
  ;; - Updates pool member count
  ;; - If pool reaches max capacity → activates pool + initializes rotation schedule
)

;; Contribute to Pool
(define-public (contribute-to-existing-pool (existing-pool-id uint))
  ;; Validations:
  ;; - Pool status is "active"
  ;; - Member has not yet contributed this cycle
  
  ;; Actions:
  ;; - Transfers contribution-per-member STX to contract
  ;; - Sets has-contributed: true for member
)

;; Execute Rotation
(define-public (execute-rotation-funding
  (existing-pool-id uint)
  (crowdfunding-address <coep-crowdfunding-trait>)
  (verification-contract-address <coep-verification-trait>))
  
  ;; Validations:
  ;; - Pool is active
  ;; - Scheduled date reached (>= block-height)
  ;; - All members have contributed
  
  ;; Actions:
  ;; - Transfers total pool funds to beneficiary
  ;; - Creates linked crowdfunding campaign (if enabled)
  ;; - Updates rotation status to "funded"
  ;; - Advances to next rotation
  ;; - Resets member contributions
)

;; Update Project Details (Beneficiary Only)
(define-public (update-rotation-project-details
  (existing-pool-id uint)
  (current-rotation-number uint)
  (current-title (string-utf8 100))
  (current-project-description (string-ascii 500))
  (current-expected-completion uint)
  (current-reward-tiers uint)
  (current-reward-description (string-ascii 500)))
  
  ;; Validations:
  ;; - Caller is current beneficiary
  ;; - Rotation status is "pending"
  
  ;; Actions:
  ;; - Updates project-details in funding-rotation-schedule
  ;; - Allows opt-out of public crowdfunding (enable-public-crowdfunding: false)
)
```

**Pool Structure:**
```clarity
{
  pool-name: (string-utf8 100),
  pool-creator: principal,
  max-members: uint,
  current-pool-members: uint,
  member-list: (list 20 principal),
  contribution-per-member: uint,
  total-pool-value: uint,
  current-rotation: uint,
  pool-status: (string-ascii 24),  // "forming", "active", "completed", "paused"
  created-at: uint,
  cycle-duration: uint,
  legal-agreement-hash: (buff 32),
  film-project-category: (string-ascii 30),  // "short-film", "feature", "documentary"
  geographic-focus: (string-ascii 50)  // "Bollywood", "Hollywood", "Nollywood", "Global"
}
```

**Social Trust Features:**
- **Filmmaker Projects**: Members add verified project collaborations
- **Mutual Connections**: Bi-directional verified relationships based on shared projects
- **Endorsement Scores**: Calculated from mutual project count (u30 to u100)

**Rotation Schedule:**
```clarity
{
  beneficiary: principal,
  funding-amount: uint,
  scheduled-date: uint,
  completion-status: (string-ascii 24),  // "pending", "funded"
  project-details: {
    title: (string-utf8 100),
    description: (string-ascii 500),
    expected-completion: uint,
    campaign-id: uint,
    enable-public-crowdfunding: bool,  // Smart opt-out
    reward-tiers: uint,
    reward-description: (string-ascii 500)
  }
}
```

**Frontend-Backend Flow:**
```
1. Frontend: createPool() → Backend: create-new-rotating-funding-pool
2. Frontend: joinPool() → Backend: join-existing-pool (verifies mutual connections)
3. Frontend: contributeToPool() → Backend: contribute-to-existing-pool
4. Frontend: updateRotationProjectDetails() → Backend: update-rotation-project-details
5. Frontend: executeRotation() → Backend: execute-rotation-funding → Creates campaign if enabled
```

---

### 5. Film Verification Module

**Purpose**: Build filmmaker credibility through identity verification, portfolios, and endorsements

**Verification Levels:**
- **Basic (Level 1)**: u2000000 (2 STX), valid for u52560 blocks (~1 year)
- **Standard (Level 2)**: u3000000 (3 STX), valid for u105120 blocks (~2 years)

**Verification Workflow:**
```
Register Identity → Add Portfolio → Pay Fee → Admin Verifies → Status: Verified
```

**Key Functions:**

```clarity
;; Register Filmmaker
(define-public (register-filmmaker-id
  (new-filmmaker principal)
  (new-full-name (string-ascii 100))
  (new-profile-url (string-ascii 255))
  (new-identity-hash (buff 32))
  (new-choice-verification-level uint)
  (new-choice-verification-level-expiration uint))
  
  ;; Validations:
  ;; - Caller is filmmaker being registered
  ;; - Not already registered
  
  ;; Actions:
  ;; - Stores filmmaker-identities (verified: false initially)
  ;; - Initializes portfolio and endorsement counts to u0
)

;; Add Portfolio
(define-public (add-filmmaker-portfolio
  (new-added-filmmaker principal)
  (new-added-project-name (string-ascii 100))
  (new-added-project-url (string-ascii 255))
  (new-added-project-desc (string-ascii 500))
  (new-added-project-completion-year uint))
  
  ;; Validations:
  ;; - Caller is filmmaker
  ;; - Filmmaker is registered
  
  ;; Actions:
  ;; - Stores portfolio item in filmmaker-portfolios map
  ;; - Increments filmmaker-portfolio-counts
)

;; Pay Verification Fee
(define-public (pay-verification-fee (verification-level uint))
  ;; Actions:
  ;; - Transfers basic-verification-fee (2 STX) or standard-verification-fee (3 STX)
  ;; - Records payment in verification-payments map
  ;; - Updates total-verification-fee-collected
)

;; Admin Verifies Filmmaker
(define-public (verify-filmmaker-identity
  (filmmaker principal)
  (new-expiration-block uint))
  
  ;; Validations:
  ;; - Caller is admin
  ;; - Filmmaker has paid verification fee
  
  ;; Actions:
  ;; - Sets verified: true in filmmaker-identities
  ;; - Sets choice-verification-expiration
)

;; Add Endorsement (Admin/Endorser)
(define-public (add-filmmaker-endorsement
  (new-added-filmmaker principal)
  (new-endorser-name (string-ascii 100))
  (new-endorsement-letter (string-ascii 255))
  (new-endorsement-url (string-ascii 255)))
  
  ;; Validations:
  ;; - Caller is filmmaker, admin, or third-party endorser
  ;; - Filmmaker is registered
  
  ;; Actions:
  ;; - Stores endorsement in filmmaker-endorsements map
  ;; - Increments endorsement count
)
```

**Filmmaker Identity Structure:**
```clarity
{
  full-name: (string-ascii 100),
  profile-url: (string-ascii 255),
  identity-hash: (buff 32),  // SHA256 of identity document
  choice-verification-level: uint,  // u1 or u2
  choice-verification-expiration: uint,
  verified: bool,
  registration-time: uint
}
```

**Verification Status Check:**
```clarity
(define-read-only (is-filmmaker-currently-verified (new-filmmaker principal))
  ;; Checks:
  ;; 1. verified status is true
  ;; 2. block-height < choice-verification-expiration
  ;; Returns: (ok true) or ERR-VERIFICATION-EXPIRED
)
```

**Frontend Integration:**
```typescript
// Check verification before campaign creation
await services.verification.submitVerification({
  name: 'Jane Director',
  bio: 'Award-winning filmmaker...',
  bondAmount: '5000000000',  // 5,000 STX bond
  documents: {
    identityProof: 'QmXoXxXxXxXx...',  // IPFS hash
    portfolioUrl: 'https://janedirector.com',
  },
});
```

---

### 6. Rewards Module

**Purpose**: Manage NFT reward distribution to campaign contributors

**Reward Flow:**
```
Campaign Owner → award-campaign-reward → Mints NFT → Stores contributor-rewards → NFT to Contributor
```

**Key Functions:**

```clarity
;; Award Single Reward
(define-public (award-campaign-reward
  (campaign-id uint)
  (new-contributor principal)
  (new-reward-tier uint)
  (new-reward-desc (string-ascii 150))
  (crowdfunding-address <rewards-crowdfunding-trait>))
  
  ;; Validations:
  ;; - Caller is campaign owner
  ;; - Reward tier is valid (u1 to campaign reward-tiers)
  
  ;; Actions:
  ;; - Collects REWARD-MINTING-FEE (1 STX)
  ;; - Calls CineX-rewards-sip09.mint()
  ;; - Stores reward in contributor-rewards map
  ;; - Returns token-id
)

;; Batch Award Rewards
(define-public (batch-award-campaign-rewards
  (campaign-id uint)
  (contributors (list 50 principal))
  (reward-tiers (list 50 uint))
  (reward-descriptions (list 50 (string-ascii 150)))
  (crowdfunding-address <rewards-crowdfunding-trait>))
  
  ;; Validations:
  ;; - Caller is campaign owner
  ;; - All lists have equal length
  
  ;; Actions:
  ;; - Collects total batch fee (num_contributors * REWARD-MINTING-FEE)
  ;; - Calls CineX-rewards-sip09.batch-mint()
  ;; - Returns mint result
)
```

**Contributor Reward Structure:**
```clarity
{
  tier: uint,
  description: (string-ascii 150),
  token-id: (optional uint)  // NFT token ID
}
```

**Constants:**
- `REWARD-MINTING-FEE`: u1000000 (1 STX per reward)

**Read-Only:**
```clarity
(define-read-only (get-contributor-reward (campaign-id uint) (contributor principal))
  ;; Returns reward details for contributor
)
```

---

## Module System

### Module Traits

All modules implement base traits for standardization:

```clarity
;; module-base-trait
(define-trait module-base-trait
  (
    (get-module-version () (response uint uint))
    (is-module-active () (response bool uint))
    (get-module-name () (response (string-ascii 50) uint))
  )
)

;; emergency-module-trait
(define-trait emergency-module-trait
  (
    (set-pause-state (bool) (response bool uint))
    (is-system-paused () (response bool uint))
    (emergency-withdraw (uint principal) (response bool uint))
  )
)
```

### Module Validation (Hub)

```clarity
(define-public (validate-safe-module
  (module-base <core-module-base>)
  (emergency-module <core-emergency-module>)
  ...)
  
  ;; Validations:
  ;; - Module version >= u1
  ;; - Module is active
  ;; - Module is registered in hub
  ;; - If system paused, only emergency-capable modules allowed
  
  ;; Returns: (ok true) or error
)
```

---

## Trait System

### Functional Traits

**crowdfunding-module-traits:**
```clarity
(define-trait crowdfunding-trait
  (
    (create-campaign ((string-ascii 500) uint uint uint uint (string-ascii 150) <verification-trait>) 
      (response uint uint))
    (contribute-to-campaign (uint uint <escrow-trait>) (response bool uint))
    (claim-campaign-funds (uint <escrow-trait>) (response bool uint))
    (get-campaign (uint) (response {...} uint))
  )
)
```

**escrow-module-trait:**
```clarity
(define-trait escrow-trait
  (
    (deposit-to-campaign (uint uint) (response bool uint))
    (withdraw-from-campaign (uint uint) (response bool uint))
    (authorize-withdrawal (uint principal) (response bool uint))
    (collect-campaign-fee (uint uint) (response bool uint))
    (get-campaign-balance (uint) (response uint uint))
  )
)
```

**film-verification-module-trait:**
```clarity
(define-trait film-verification-trait
  (
    (register-filmmaker-id (principal (string-ascii 100) (string-ascii 255) (buff 32) uint uint) 
      (response uint uint))
    (is-filmmaker-currently-verified (principal) (response bool uint))
    (get-filmmaker-identity (principal) (response (optional {...}) uint))
  )
)
```

---

## Frontend-Backend Integration

### Campaign Creation Flow

```typescript
// Frontend Service Call
await services.crowdfunding.createCampaign({
  title: 'Documentary Film',
  description: 'A powerful story...',
  targetAmount: '50000000000',  // 50,000 STX
  deadline: Date.now() + (30 * 24 * 60 * 60 * 1000),
  category: 'documentary',
  verificationRequired: true,
});
```

**Backend Execution:**
```clarity
;; 1. Crowdfunding Module
(create-campaign 
  description 
  u0  // Auto-generated campaign-id
  funding-goal 
  duration 
  reward-tiers 
  reward-description
  verification-contract)  // Trait parameter

;; 2. Verification Check
(contract-call? verification-contract is-filmmaker-currently-verified tx-sender)

;; 3. Fee Collection
(stx-transfer? CAMPAIGN-FEE tx-sender core-contract)

;; 4. Campaign Storage
(map-set campaigns campaign-id {...})
```

### Contribution Flow

```typescript
// Frontend
await services.crowdfunding.contributeToCampaign({
  campaignId: 'campaign-001',
  amount: '5000000000',  // 5,000 STX
  anonymous: false,
});
```

**Backend Execution:**
```clarity
;; 1. Crowdfunding Module
(contribute-to-campaign campaign-id amount escrow-contract)

;; 2. Escrow Deposit
(contract-call? escrow-contract deposit-to-campaign campaign-id amount)

;; 3. Escrow Module
(stx-transfer? amount tx-sender (as-contract tx-sender))
(map-set campaign-escrow-balances campaign-id new-balance)

;; 4. Update Campaign
(map-set campaigns campaign-id (merge campaign { total-raised: new-total }))
```

### Claim Funds Flow

```typescript
// Frontend (via Hub)
await services.crowdfunding.claimCampaignFunds({ campaignId: 1 });
```

**Backend Execution:**
```clarity
;; 1. Hub Authorization
(claim-campaign-funds campaign-id crowdfunding-contract escrow-contract)

;; Hub validates:
(asserts! (is-eq tx-sender owner) ERR-NOT-AUTHORIZED)
(asserts! (>= total-raised funding-goal) ERR-FUNDING-GOAL-NOT-REACHED)

;; 2. Authorize Operations
(contract-call? escrow-contract authorize-withdrawal campaign-id owner)
(contract-call? escrow-contract authorize-fee-collection campaign-id owner)

;; 3. Crowdfunding Module Claims
(contract-call? crowdfunding-contract claim-campaign-funds campaign-id escrow-contract)

;; 4. Escrow Processes
(withdraw-from-campaign campaign-id withdraw-amount)  // To owner
(collect-campaign-fee campaign-id fee-amount)  // To core
```

### Co-EP Rotation Flow

```typescript
// Frontend
await services.coep.executeRotation('pool-1');
```

**Backend Execution:**
```clarity
;; 1. Verify Contributions
(verify-all-contributions pool-id)  // Checks all members contributed

;; 2. Transfer Funds
(stx-transfer? funding-amount (as-contract tx-sender) beneficiary)

;; 3. Create Campaign (If Enabled)
(create-linked-crowdfunding-campaign pool-id rotation-number ...)

;; 4. Advance Rotation
(advance-rotation pool-id ...)
  ;; - Creates next rotation schedule
  ;; - Resets member contributions
  ;; - Marks pool "completed" if all rotations done
```

---

## Deployment

### Contract Deployment Order

**1. Deploy Traits First:**
```bash
clarinet deployments apply -p deployments/default.devnet-plan.yaml
```

Traits (no dependencies):
- `module-base-trait`
- `emergency-module-trait`
- `crowdfunding-module-traits`
- `escrow-module-trait`
- `rewards-module-trait`
- `film-verification-module-trait`

**2. Deploy Modules:**
- `film-verification-module`
- `escrow-module`
- `crowdfunding-module`
- `rewards-module`
- `CineX-rewards-sip09` (SIP-09 NFT)
- `Co-EP-rotating-fundings`

**3. Deploy Hub:**
- `CineX-project` (main hub)

**4. Initialize Modules:**
```clarity
;; Hub Initialization
(contract-call? 'ST1...CineX-project initialize-platform
  'ST1...film-verification-module
  'ST1...crowdfunding-module
  'ST1...rewards-module
  'ST1...escrow-module
  'ST1...Co-EP-rotating-fundings
  'ST1...verification-mgt-ext
)

;; Module Initializations
(contract-call? 'ST1...crowdfunding-module initialize 'ST1...CineX-project)
(contract-call? 'ST1...escrow-module initialize 'ST1...CineX-project 'ST1...crowdfunding-module 'ST1...escrow-module)
(contract-call? 'ST1...Co-EP-rotating-fundings initialize 'ST1...CineX-project 'ST1...crowdfunding-module 'ST1...film-verification-module 'ST1...escrow-module)
```

### Devnet Configuration

**Environment Variables:**
```bash
VITE_NETWORK=devnet
VITE_STACKS_API_URL=https://api.platform.hiro.so/v1/ext/.../stacks-blockchain-api

# All contracts deployed at:
VITE_MAIN_HUB_CONTRACT_ADDRESS=ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM
```

**Deployment File:** `deployments/default.devnet-plan.yaml`

---

## Security Considerations

### Admin Controls
- Two-step admin transfer with timeout prevents unauthorized admin hijacking
- Pending admin expires after 144 blocks (~24 hours)

### Emergency Mechanisms
- System-wide pause cascades to all modules
- Fund recovery requires pause + admin authorization
- Large withdrawals (>100,000 STX) blocked

### Address Validation
- Burn address prevention: `SP000000000000000000002Q6VF78`
- Duplicate module checks
- Self-transfer prevention

### Authorization Patterns
- Core contract validates operations before delegating to modules
- Escrow uses one-time authorization flags (cleared after use)
- Campaign ownership verified before fund claims

### Verification Security
- Identity hash stored as (buff 32) SHA256
- Verification bonds (non-refundable after admin review)
- Expiration tracking prevents stale verifications

---

## Testing

**Test Files Location:** `/tests/`

**Run Tests:**
```bash
# Check all contracts
clarinet check

# Run specific test
npm test -- crowdfunding-module.test.ts

# Run all tests
npm test
```

**Key Test Scenarios:**
- Campaign creation with/without verification
- Contribution flow with escrow
- Fund claiming with fee collection
- Co-EP pool rotation
- Emergency pause and recovery
- Admin transfer workflow

---

## Additional Resources

- **Integration Documentation**: `docs/BLOCKCHAIN_INTEGRATION_COMPLETE.md`
- **Frontend README**: `frontend-integration/README.md`
- **Deployment Plan**: `deployments/default.devnet-plan.yaml`
- **Integration Summary**: `docs/INTEGRATION_SUMMARY.md`

---

*Last Updated: November 16, 2025*  
*Backend Architecture: Modular Hub-and-Spoke with Trait-Based Interfaces*  
*Deployment: Hiro Devnet (ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM)*
