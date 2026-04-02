# CineX Frontend

Decentralized crowdfunding platform for filmmakers built on Stacks blockchain with React 19, TypeScript, and Vite.

## Table of Contents
- [Quick Start](#quick-start)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Authentication](#authentication)
- [Blockchain Integration](#blockchain-integration)
- [Component Structure](#component-structure)
- [Environment Configuration](#environment-configuration)
- [Development](#development)

## ⚡ Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

Connect a Stacks wallet (Hiro/Xverse) to interact with blockchain contracts.

## 🏗️ Architecture

```
frontend-integration/
├── src/
│   ├── auth/                  # Stacks wallet authentication
│   ├── components/            # UI components
│   ├── pages/                 # Page components
│   ├── services/              # Blockchain service layer
│   ├── styles/                # CSS Modules
│   └── utils/                 # Network utilities
├── public/                    # Static assets
├── .env                       # Environment configuration
├── package.json
├── vite.config.ts
└── README.md
```

## 🛠️ Tech Stack

### Core Technologies
- **React 19.1.1**: Modern React with latest features
- **TypeScript**: Type-safe development
- **Vite**: Fast build tool and development server
- **React Router DOM**: Client-side routing

### Stacks Integration
- **@stacks/connect 8.2.0**: Wallet authentication and transaction signing
- **@stacks/transactions**: Contract interaction with Clarity types
- **@stacks/network**: Network configuration (devnet/testnet/mainnet)

### Styling & UI
- **CSS Modules**: Component-scoped styling
- **React Icons**: Icon library
- **Responsive Design**: Mobile-first approach

### Development Tools
- **ESLint**: Code linting and quality checks
- **TypeScript ESLint**: TypeScript-specific linting
- **Vite Plugin React**: React integration with Vite

## 🔐 Authentication

### Stacks Wallet Integration

Supports Hiro Wallet and Xverse with session persistence:

```typescript
// src/auth/StacksAuthContext.tsx
interface AuthContextType {
  userData: UserData | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  connectionStatus: 'disconnected' | 'connecting' | 'connected' | 'error';
  balance: string | null;
  isLoadingBalance: boolean;
  error: string | null;
  signIn: () => Promise<void>;
  signOut: () => void;
  clearError: () => void;
  refreshBalance: () => Promise<void>;
}
```

**Features:**
- Wallet connection/disconnection
- Session persistence across browser refreshes
- Automatic reconnection on app startup
- Real-time balance display
- Connection status indicators
- Error handling for failed connections
- Transaction signing capabilities

## 🔗 Blockchain Integration

### Three-Phase Integration Architecture

All blockchain operations organized into three strategic phases for complete platform functionality:

#### **Phase 1: Core Campaign Flows** ✅
Foundation for crowdfunding operations - campaign creation, contributions, and fund management.

#### **Phase 2: Co-EP Advanced Features** ✅
Rotating pool operations - execution of rotations and beneficiary project management.

#### **Phase 3: Supporting Systems** ✅
Infrastructure services - escrow management, filmmaker verification, and emergency controls.

---

### 📊 Technical Workflow: Three Phases in Action

#### **Phase 1: Core Campaign Flows**

**Purpose**: Enable filmmakers to launch campaigns and receive contributions through secure escrow.

**User Journey:**
1. **Filmmaker creates campaign** → Frontend calls `crowdfundingService.createCampaign()`
2. **Service converts parameters** → Maps JS objects to Clarity types
3. **Blockchain transaction** → Calls `create-campaign` on `crowdfunding-module`
4. **Campaign goes live** → Contributors can now fund via escrow
5. **Contributor funds campaign** → Calls `contributeToCampaign()` with amount
6. **Escrow secures funds** → Money held until milestone verification

**Technical Implementation:**

```typescript
// Campaign Creation Flow
import { createCineXServices } from './services';

const services = createCineXServices(userSession);

// Step 1: Create campaign (7 parameters)
await services.crowdfunding.createCampaign({
  title: 'Documentary Film',
  description: 'A powerful story...',
  targetAmount: '50000000000',  // 50,000 STX in microSTX
  deadline: Date.now() + (30 * 24 * 60 * 60 * 1000), // 30 days
  category: 'documentary',
  verificationRequired: true,
});

// Behind the scenes:
// - Converts deadline to blocks (~10 min/block)
// - Passes verification contract as trait parameter
// - Opens Stacks Connect wallet for signing
// - Returns transaction ID on success

// Step 2: Contribute to campaign
await services.crowdfunding.contributeToCampaign({
  campaignId: 'campaign-001',
  amount: '5000000000',  // 5,000 STX
  anonymous: false,
});

// Behind the scenes:
// - Calls contribute-to-campaign on blockchain
// - Passes escrow-module contract as trait
// - Funds automatically secured in escrow
// - Contributor receives confirmation
```

**Smart Contract Calls:**
- `create-campaign` (crowdfunding-module): 7 parameters including verification trait
- `contribute-to-campaign` (crowdfunding-module): Campaign ID + amount + escrow trait

**Data Flow:**
```
User Input (JS) → Service Layer → Clarity Type Conversion → openContractCall() 
→ Stacks Connect Wallet → User Signs → Blockchain Execution → Transaction ID 
→ Event Emission → Frontend Update
```

---

#### **Phase 2: Co-EP Collaborative Funding**

**Purpose**: Enable professional filmmakers to create rotating funding pools that run CONCURRENTLY with main crowdfunding campaigns.

**Key Concept**: 
- Filmmaker creates **main public campaign** (e.g., $50k STX goal)
- Filmmaker also creates **Co-EP pool** (e.g., 8 members × $5k = $40k STX)
- **BOTH run simultaneously** → Filmmaker can receive funding from BOTH sources
- Pool members rotate as beneficiaries → Each member gets their turn

**User Journey:**
1. **Filmmaker creates main campaign** → Public crowdfunding for general audience
2. **Same filmmaker creates Co-EP pool** → Professional collaborative funding (runs alongside)
3. **Pool members join** → Other verified filmmakers contribute equal amounts
4. **Rotation executes** → Current beneficiary receives pool funds + optional campaign creation
5. **Beneficiary chooses** → Enable public crowdfunding OR pool-only funding
6. **Next rotation** → Advances to next member, cycle continues

**Technical Implementation:**

```typescript
// Co-EP Concurrent Funding Flow

// Step 1: Create main public campaign
await services.crowdfunding.createCampaign({
  title: 'My Feature Film',
  description: 'Epic story...',
  targetAmount: '50000000000',  // 50k STX public goal
  deadline: Date.now() + (60 * 24 * 60 * 60 * 1000),
  category: 'feature',
});

// Step 2: Create Co-EP pool (runs concurrently with main campaign)
await services.coep.createPool({
  name: 'Feature Filmmakers Pool',
  description: 'Collaborative funding for feature films',
  maxMembers: 8,
  contributionAmount: '5000000000',  // 5k STX per member
  cycleDuration: 2160, // ~3 months in blocks
  category: 'feature',
  geographicFocus: 'hollywood',
  legalAgreementHash: '0x...', // SHA256 hash
});
// Result: Main campaign active + Co-EP pool forming
//         Filmmaker can receive from BOTH sources

// Step 3: Pool members contribute for current rotation
await services.coep.contributeToPool({
  poolId: 'pool-1',
  amount: '5000000000',  // 5k STX
});

// Step 4: Beneficiary updates project (BEFORE rotation executes)
// This is WHERE member can set up campaign if they don't have one
await services.coep.updateRotationProjectDetails(
  'pool-1',
  2, // Rotation number
  {
    title: 'Documentary Project',
    description: 'Environmental story...',
    expectedCompletion: 2160,
    rewardTiers: 3,
    rewardDescription: 'Digital access, credits, premiere tickets',
    enablePublicCrowdfunding: true, // ← CHOOSE: true = create campaign, false = pool only
  }
);

// Step 5: Execute rotation
await services.coep.executeRotation('pool-1');

// Behind the scenes:
// - Verifies all pool members contributed
// - Transfers pool funds (8 × 5k = 40k STX) to beneficiary
// - IF enablePublicCrowdfunding was true → Creates campaign automatically
// - IF enablePublicCrowdfunding was false → No campaign, pool funds only
// - Advances rotation to next member
// - Resets contribution status for next cycle

// Beneficiary now receives:
// - Co-EP pool funds: 40k STX (guaranteed)
// - Public campaign funds: Variable (if enabled)
// - TOTAL: Pool + Public contributions
```

**Smart Contract Calls:**
- `create-new-rotating-funding-pool` (Co-EP-rotating-fundings): 9 parameters including verification trait
- `contribute-to-existing-pool` (Co-EP-rotating-fundings): Pool ID
- `execute-rotation-funding` (Co-EP-rotating-fundings): Pool ID + 2 contract traits
- `update-rotation-project-details` (Co-EP-rotating-fundings): 7 parameters

**Three Key Scenarios:**

1. **Filmmaker WITH Main Campaign** (Concurrent Funding):
   - Has active main campaign collecting public funds
   - Creates Co-EP pool running alongside
   - Receives funds from BOTH sources
   - Example: 50k public + 40k Co-EP = 90k total

2. **Member WITHOUT Campaign** (Auto-Creation):
   - Joins pool but has no campaign
   - Updates project details with `enablePublicCrowdfunding: true`
   - Rotation executes → Campaign created automatically
   - Can now receive Co-EP + public funds

3. **Pool-Only Funding** (Private):
   - Member updates with `enablePublicCrowdfunding: false`
   - Rotation executes → No campaign created
   - Receives only Co-EP pool funds
   - Keeps project private to pool members

**Data Flow:**
```
Main Campaign (Public) ──┐
                         ├──→ Escrow → Filmmaker
Co-EP Pool (Members) ────┘

Filmmaker can run BOTH simultaneously
```

---

#### **Phase 3: Supporting Systems**

**Purpose**: Provide infrastructure services for escrow management, filmmaker credibility, and emergency controls.

**User Journey - Escrow:**
1. **Campaign needs funds** → Direct deposit via `escrowService.depositToEscrow()`
2. **Funds secured** → Held in escrow-module contract
3. **Milestone verified** → Funds released to filmmaker
4. **Refund scenario** → Contributor withdraws if campaign fails

**User Journey - Verification:**
1. **Filmmaker applies** → Calls `verificationService.submitVerification()`
2. **Identity proof uploaded** → Document hash stored on-chain
3. **Bond deposited** → Verification bond locked in contract
4. **Admin reviews** → Approves/rejects verification
5. **Status updated** → Filmmaker gains verified badge

**User Journey - Emergency Controls:**
1. **Critical issue detected** → Admin accesses emergency dashboard
2. **System pause triggered** → Calls `emergencyService.pauseSystem(module)`
3. **Issue resolved** → Admin calls `resumeSystem(module)`
4. **Operations restore** → Platform returns to normal

**Technical Implementation:**

```typescript
// Escrow Deposit Flow
await services.escrow.depositToEscrow({
  campaignId: 'campaign-001',
  amount: '10000000000',  // 10,000 STX
});

// Behind the scenes:
// - Calls deposit-to-campaign on escrow-module
// - Links deposit to specific campaign
// - Tracks deposit in escrow balance mapping
// - Enables future withdrawal/release

// Filmmaker Verification Flow
await services.verification.submitVerification({
  name: 'Jane Director',
  bio: 'Award-winning filmmaker with 15 years experience...',
  bondAmount: '5000000000',  // 5,000 STX bond
  documents: {
    identityProof: 'QmXoXxXxXxXx...',  // IPFS hash
    portfolioUrl: 'https://janedirector.com',
  },
});

// Behind the scenes:
// - Converts identity proof to 32-byte buffer (SHA256)
// - Calls submit-filmmaker-for-verification
// - Deposits verification bond
// - Stores filmmaker profile on-chain
// - Awaits admin approval

// Emergency Control Flow
// Check system status (all modules)
const status = await services.emergency.getAllSystemStatuses();
// Returns: { crowdfunding: 'active', coep: 'active', escrow: 'active', verification: 'active' }

// Pause specific module
await services.emergency.pauseSystem('crowdfunding');
// - Calls pause-system on CineX-project main contract
// - Prevents new campaign creation
// - Existing campaigns continue safely

// Resume after fix
await services.emergency.resumeSystem('crowdfunding');
// - Calls resume-system to restore operations
// - Emits system-resumed event
```

**Smart Contract Calls:**
- `deposit-to-campaign` (escrow-module): Campaign ID + amount
- `submit-filmmaker-for-verification` (film-verification-module): 5 parameters including identity buffer
- `pause-system` (CineX-project): Module name
- `resume-system` (CineX-project): Module name
- `get-system-status` (CineX-project): Read-only status check

**Emergency Service Features:**
```typescript
// Monitor all modules
getAllSystemStatuses(): Promise<SystemStatus>

// Check specific module
getSystemStatus(module: 'crowdfunding' | 'coep' | 'escrow' | 'verification'): Promise<string>

// Version tracking
getModuleVersion(module: string): Promise<string>

// Active status check
isModuleActive(module: string): Promise<boolean>
```

---

### 🔄 Complete Platform Workflow Example

**Scenario**: Verified filmmaker creates campaign, receives Co-EP rotation funds, contributors support via escrow.

```typescript
// 1. PHASE 3: Filmmaker gets verified
await services.verification.submitVerification({
  name: 'Alex Chen',
  bio: 'Documentary filmmaker specializing in environmental stories',
  bondAmount: '5000000000',
  documents: { identityProof: 'Qm...' },
});

// 2. PHASE 1: Filmmaker creates campaign
const campaign = await services.crowdfunding.createCampaign({
  title: 'Ocean Conservation Documentary',
  description: 'A 3-part series on coral reef restoration',
  targetAmount: '100000000000',  // 100,000 STX
  deadline: Date.now() + (90 * 24 * 60 * 60 * 1000),  // 90 days
  category: 'documentary',
  verificationRequired: true,
});

// 3. PHASE 2: Campaign becomes beneficiary of Co-EP pool rotation
await services.coep.executeRotation('environmental-pool-01');
// → Automatically transfers 25,000 STX from pool → campaign

// 4. PHASE 1: Contributors add additional funding
await services.crowdfunding.contributeToCampaign({
  campaignId: campaign.id,
  amount: '15000000000',  // 15,000 STX
  anonymous: false,
});

// 5. PHASE 3: Additional escrow deposit (optional)
await services.escrow.depositToEscrow({
  campaignId: campaign.id,
  amount: '10000000000',  // 10,000 STX
});

// 6. PHASE 2: Filmmaker updates project details
await services.coep.updateRotationProjectDetails({
  poolId: 'environmental-pool-01',
  projectTitle: 'Ocean Warriors: Coral Restoration',
  projectDescription: 'Updated scope with 3 locations...',
  fundingGoal: '100000000000',
  timeline: '18 months',
  milestones: 'Research (3mo), Filming (9mo), Post (6mo)',
  teamInfo: 'Dir: Alex Chen, Cinematographer: Maya Torres',
});

// Campaign now has: 25k (rotation) + 15k (contributions) + 10k (escrow) = 50,000 STX
```

**Data Flow Across All Phases:**
```
[Phase 3: Verification] → [Filmmaker Verified]
           ↓
[Phase 1: Campaign Created] → [Campaign Active]
           ↓
[Phase 2: Rotation Executes] → [Pool Funds → Campaign]
           ↓
[Phase 1: Contributions Flow] → [Escrow Secures Funds]
           ↓
[Phase 3: Escrow Management] → [Milestone Releases]
           ↓
[Phase 2: Project Updates] → [Transparency for Funders]
```

---

### Service Layer Architecture

**`src/services/crowdfundingService.ts`** (Phase 1)
```typescript
createCampaign(params: CreateCampaignParams): Promise<void>
contributeToCampaign(params: ContributeParams): Promise<void>
getCampaign(campaignId: string): Promise<Campaign>
getCampaignBalance(campaignId: string): Promise<string>
```

**`src/services/coepService.ts`** (Phase 2)
```typescript
createPool(params: CreatePoolParams): Promise<void>
joinPool(poolId: number): Promise<void>
executeRotation(poolId: string): Promise<void>  // Phase 2 core
updateRotationProjectDetails(params: UpdateProjectParams): Promise<void>  // Phase 2 core
```

**`src/services/escrowService.ts`** (Phase 3)
```typescript
depositToEscrow(params: DepositParams): Promise<void>
withdrawFromEscrow(campaignId: string, amount: string): Promise<void>
getEscrowBalance(campaignId: string): Promise<string>
```

**`src/services/verificationService.ts`** (Phase 3)
```typescript
submitVerification(params: VerificationParams): Promise<void>
checkVerificationStatus(filmmaker: string): Promise<boolean>
getVerifiedFilmmakers(): Promise<string[]>
```

**`src/services/emergencyService.ts`** (Phase 3) ⭐ NEW
```typescript
pauseSystem(module: ModuleName): Promise<void>
resumeSystem(module: ModuleName): Promise<void>
getSystemStatus(module: ModuleName): Promise<string>
getAllSystemStatuses(): Promise<SystemStatus>
getModuleVersion(module: ModuleName): Promise<string>
isModuleActive(module: ModuleName): Promise<boolean>
```

**`src/utils/network.ts`**: Network configuration
```typescript
export function getNetwork(): StacksNetwork;
export function getContractAddress(): string;
export function getContractName(): string;
```

<<<<<<< HEAD
---

### Integrated Smart Contracts

Contract Address: `ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM` (Hiro Devnet)

| Contract | Functions Integrated | Phase |
|----------|---------------------|-------|
| **CineX-project** | `pause-system`, `resume-system`, `get-system-status` | 3 |
| **crowdfunding-module** | `create-campaign`, `contribute-to-campaign` | 1 |
| **Co-EP-rotating-fundings** | `create-new-rotating-funding-pool`, `contribute-to-existing-pool`, `execute-rotation-funding`, `update-rotation-project-details` | 1, 2 |
| **escrow-module** | `deposit-to-campaign`, `withdraw-from-campaign` | 3 |
| **film-verification-module** | `submit-filmmaker-for-verification`, `is-filmmaker-currently-verified` | 3 |
| **rewards-module** | `distribute-rewards`, `claim-rewards` | Future |

**Total Integrated Operations**: 11 write functions, 15+ read-only functions

## 🎨 Component Structure

### Page Components
```typescript
// User Roles & Authentication
├── CreateAccount.tsx          # User registration
├── WalletConnection.tsx       # Wallet authentication

// Campaign Management
├── CreateCampaign.tsx         # Campaign creation wizard
├── CampaignDetail.tsx         # Campaign detail view
├── FundCampaign.tsx           # Funding interface
├── Projects.tsx               # Campaign discovery

// Co-EP Pools
├── CoEPPools.tsx              # Pool discovery and listing
├── PoolCreate.tsx             # Pool creation (4-step wizard)
├── PoolDashboard.tsx          # Member management
├── PoolDetail.tsx             # Individual pool view

// Financial Management
├── EscrowManagement.tsx       # Escrow operations
├── ContributorRewards.tsx     # Rewards distribution

// Administration
├── AdminDashboard.tsx         # Platform management
├── Dashboard.tsx              # User dashboard with role switching
├── Home.tsx                   # Landing page
```

### UI Components
```typescript
// Core Layout
├── Header.tsx                 # Navigation with role switching
├── Footer.tsx                 # Platform footer
├── HamburgerMenu.tsx          # Mobile navigation

// Modals & Forms
├── CreateCampaignModal.tsx    # Campaign creation
├── FundCampaignModal.tsx      # Funding interface
├── EscrowActionModal.tsx      # Escrow actions
├── TransactionStatusModal.tsx # Transaction tracking
├── TransactionStatusUI.tsx    # Transaction status display

// Display Components
├── ProjectCard.tsx            # Campaign cards
├── WalletStatus.tsx           # Connection status
├── AdminControls.tsx          # Admin controls
```

### Styling System

CSS Modules for component-scoped styling (`src/styles/components/`):
```
TransactionStatusUI.module.css
TransactionStatusModal.module.css
ConfigStatus.module.css
Header.module.css
```

**Developer Note:** Use inline styles only for dynamic values (progress widths, animation delays, runtime status colors).

## 🔧 Environment Configuration

### Environment Variables

```bash
# Network Configuration
VITE_NETWORK=devnet
VITE_STACKS_API_URL=https://api.platform.hiro.so/v1/ext/1ec08f6d3c031b532aa987f5a0398f37/stacks-blockchain-api
VITE_EXPLORER_URL=https://explorer.stacks.co

# Contract Addresses (Devnet)
VITE_MAIN_HUB_CONTRACT_ADDRESS=ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM
VITE_MAIN_HUB_CONTRACT_NAME=CineX-project
VITE_CROWDFUNDING_CONTRACT_ADDRESS=ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM
VITE_CROWDFUNDING_CONTRACT_NAME=crowdfunding-module
VITE_ESCROW_CONTRACT_ADDRESS=ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM
VITE_ESCROW_CONTRACT_NAME=escrow-module
VITE_REWARDS_CONTRACT_ADDRESS=ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM
VITE_REWARDS_CONTRACT_NAME=rewards-module
VITE_CO_EP_CONTRACT_ADDRESS=ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM
VITE_CO_EP_CONTRACT_NAME=Co-EP-rotating-fundings
VITE_VERIFICATION_CONTRACT_ADDRESS=ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM
VITE_VERIFICATION_CONTRACT_NAME=film-verification-module

# App Configuration
VITE_APP_NAME=CineX
VITE_APP_VERSION=1.0.0
VITE_APP_URL=http://localhost:5173

# Wallet Configuration
VITE_SUPPORTED_WALLETS=hiro,leather,xverse
VITE_WALLET_TIMEOUT=30000
VITE_TRANSACTION_TIMEOUT=180000

# Feature Flags
VITE_FEATURE_CO_EP_POOLS=true
VITE_FEATURE_NFT_REWARDS=true
VITE_FEATURE_FILM_VERIFICATION=true
VITE_FEATURE_ESCROW=true

# Debug Settings
VITE_DEBUG_MODE=true
VITE_ENABLE_CONSOLE_LOGS=true
VITE_TX_POLLING_INTERVAL=2000
```

### Network Configuration

```typescript
// src/utils/network.ts
export function getNetwork(): StacksNetwork {
  const networkType = (import.meta.env.VITE_NETWORK || 'testnet') as NetworkType;
  const apiUrl = import.meta.env.VITE_STACKS_API_URL;

  switch (networkType) {
    case 'devnet':
      return {
        ...STACKS_TESTNET,
        coreApiUrl: apiUrl || 'https://api.platform.hiro.so/...',
      };
    case 'testnet':
      return apiUrl ? { ...STACKS_TESTNET, coreApiUrl: apiUrl } : STACKS_TESTNET;
    case 'mainnet':
      return apiUrl ? { ...STACKS_MAINNET, coreApiUrl: apiUrl } : STACKS_MAINNET;
  }
}
```

## 💻 Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Run linting
npm run lint
```

### Build Output
- Production bundle: ~1.3 MB (optimized)
- CSS bundle: ~72 kB
- TypeScript: Zero errors

---

## 📚 Additional Documentation

- **Complete Integration Guide**: `../docs/BLOCKCHAIN_INTEGRATION_COMPLETE.md`
- **Integration Summary**: `../docs/INTEGRATION_SUMMARY.md`
- **Backend Requirements**: `../docs/integration-overview.md`
- **Deployment Plan**: `../deployments/default.devnet-plan.yaml.backup`

---

*Last Updated: November 16, 2025*  
*Version: Three-Phase Blockchain Integration Complete ✅*  
*Status: Phase 1 (Campaigns) ✅ | Phase 2 (Co-EP Advanced) ✅ | Phase 3 (Infrastructure) ✅*
