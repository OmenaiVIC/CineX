# CineX Contract Function Sitemap

Legend:
- **✅ Fully Bridged** — backend wrapper + HTTP route + frontend service + UI
- **⚠️ Partial** — backend wrapper exists but no dedicated route or UI
- **🔶 Backend Only** — backend wrapper exists, no frontend
- **◻️ Not Bridged** — no backend wrapper, no UI
- **🔧 Internal** — called by other contracts only (not directly by backend)
- **📖 Read-Only** — used via `readOnlyCall` for data display

---

## 1. Campaign Module (`campaign-module-2`)

| Function | Type | Backend Wrapper | HTTP Route | Frontend Service | UI Page/Component | Status |
|---|---|---|---|---|---|---|
| `create-campaign` | public | `createCampaignInModule` | `POST /api/campaigns` | `createCampaign` | `CreateCampaignPage` | ✅ |
| `contribute-to-campaign` | public | `contribute` | `POST /api/campaigns/:id/contribute` | `contributeToCampaign` | `CampaignPage` (sidebar) | ✅ |
| `claim-campaign-funds` | public | — | — | — | — | ◻️ |
| `initialize` | public | — | — | — | — | ◻️ (deploy-time) |
| `set-verification-contract` | public | — | — | — | — | ◻️ (admin) |
| `set-escrow-contract` | public | — | — | — | — | ◻️ (admin) |
| `set-pause-state` | public | — | — | — | — | ◻️ (admin) |
| `emergency-withdraw` | public | — | — | — | — | ◻️ (admin) |
| `get-total-campaigns` | read-only | — | — | — | — | ◻️ |
| `get-campaign` | read-only | `getCampaignFromModule` | `GET /api/campaigns/:id/chain-state` (included) | `getCampaignChainState` | `CampaignPage` (chain panel) | ✅ |
| `is-active-campaign` | read-only | — | — | — | — | ◻️ |
| `get-campaign-funding-goal` | read-only | — | — | — | — | ◻️ |
| `get-total-raised-funds` | read-only | `getTotalRaised` | `GET /api/campaigns/:id/chain-state` (included) | `getCampaignChainState` | `CampaignPage` (chain panel) | ✅ |
| `get-campaign-owner` | read-only | — | — | — | — | ◻️ |
| `get-filmmaker-verification` | read-only | — | — | — | — | ◻️ |
| `get-emergency-ops-log` | read-only | — | — | — | — | ◻️ |
| `get-campaign-contributions` | read-only | `getCampaignContributions` | `GET /api/yield/contributions/:campaignId/:contributor` | — | — | ✅ |
| `module-status` | read-only | — | — | — | — | ◻️ |
| `is-system-paused` | read-only | — | — | — | — | ◻️ |
| `get-module-version` | read-only | — | — | — | — | ◻️ |
| `is-module-active` | read-only | — | — | — | — | ◻️ |
| `get-module-name` | read-only | — | — | — | — | ◻️ |

---

## 2. Milestone Escrow (`milestone-escrow`)

| Function | Type | Backend Wrapper | HTTP Route | Frontend Service | UI Page/Component | Status |
|---|---|---|---|---|---|---|
| `create-campaign` | public | `createCampaignInEscrow` | `POST /api/campaigns` (as part of) | `createCampaign` | `CreateCampaignPage` | ✅ |
| `deposit` | public | `depositToEscrow` | `POST /api/campaigns/:id/contribute` (as part of) | `contributeToCampaign` | `CampaignPage` (sidebar) | ✅ |
| `deposit-to-campaign` | public | (alias, same as deposit) | — | — | — | 🔧 |
| `withdraw-from-campaign` | public | `withdrawFromCampaign` | `POST /api/campaigns/:id/claim-funds` | `claimCampaignFunds` | `CreatorDashboard` / `CampaignPage` | ✅ |
| `collect-campaign-fee` | public | `collectCampaignFee` | `POST /api/campaigns/:id/claim-funds` (called after withdraw) | `claimCampaignFunds` | (automatic, no UI) | ✅ |
| `submit-milestone-proof` | public | `submitProof` | `POST /api/escrow/milestone-proof` | (via `MilestoneList`) | `CampaignPage` > `MilestoneList` | ✅ |
| `approve-milestone` | public | `approve` | `POST /api/escrow/approve-milestone` | (via `MilestoneList`) | `CampaignPage` > `MilestoneList` | ✅ |
| `release-milestone-funds` | public | `release` | `POST /api/escrow/release-milestone` | (via `MilestoneList`) | `CampaignPage` > `MilestoneList` | ✅ |
| `set-fee-parameters` | public | — | — | — | — | ◻️ (admin) |
| `initialize` | public | — | — | — | — | ◻️ (deploy-time) |
| `set-verification-contract` | public | — | — | — | — | ◻️ (admin) |
| `set-pause-state` | public | — | — | — | — | ◻️ (admin) |
| `emergency-withdraw` | public | — | — | — | — | ◻️ (admin) |
| `get-campaign` | read-only | `getCampaignFromEscrow` / `getEscrowCampaign` | `GET /api/campaigns/:id/chain-state` | `getCampaignChainState` | `CampaignPage` (chain panel) | ✅ |
| `get-milestone-state` | read-only | `getMilestoneState` | `GET /api/campaigns/:id/chain-state` | `getCampaignChainState` | `CampaignPage` (chain panel) | ✅ |
| `get-campaign-contributor` | read-only | — | — | — | — | ◻️ |
| `get-campaign-balance` | read-only | `getEscrowBalance` | `GET /api/campaigns/:id/chain-state` | `getCampaignChainState` | `CampaignPage` (chain panel) | ✅ |
| `get-platform-fee-collector` | read-only | — | — | — | — | ◻️ |
| `get-fee-bps` | read-only | — | — | — | — | ◻️ |
| `get-verification-fee-usd-cents` | read-only | — | — | — | — | ◻️ |
| `is-system-paused` / version / active / name | read-only | — | — | — | — | ◻️ (utility) |

---

## 3. Milestone Verification (`milestone-verification` / `milestone-verification-2`)

| Function | Type | Backend Wrapper | HTTP Route | Frontend Service | UI Page/Component | Status |
|---|---|---|---|---|---|---|
| `initialize` | public | — | — | — | — | ◻️ (deploy-time) |
| `set-milestone-escrow` | public | — | — | — | — | ◻️ (admin) |
| `create-milestones` | public | `createMilestones` | `POST /api/milestones` | `createMilestones` | `PoolCreatePage` / `CreateCampaignPage` | ✅ |
| `submit-milestone` | public | `submitMilestone` | `PUT /api/milestones/:id/status` (→active) | (via `MilestoneList`) | `CampaignPage` > `MilestoneList` | ✅ |
| `endorse-milestone` | public | `endorseMilestone` | `POST /api/milestones/:id/vote` | (via `MilestoneList`) | `CampaignPage` > `MilestoneList` | ✅ |
| `finalize-milestone` | public | `finalizeMilestone` | `PUT /api/milestones/:id/status` (→completed) | (via `MilestoneList`) | `CampaignPage` > `MilestoneList` | ✅ |
| `set-pause-state` | public | — | — | — | — | ◻️ (admin) |
| `emergency-withdraw` | public | — | — | — | — | ◻️ (admin) |
| `is-bonus-forfeited` | read-only | — | — | — | — | ◻️ |
| `get-creator-standing` | read-only | — | — | — | — | ◻️ |
| `get-milestone` | read-only | — | — | — | — | ◻️ |
| `get-endorsement` | read-only | — | — | — | — | ◻️ |
| `get-bonus-retention-rate` | read-only | — | — | — | — | ◻️ |
| status / version / active / name | read-only | — | — | — | — | ◻️ |

---

## 4. Yield Escrow (`yield-escrow`)

| Function | Type | Backend Wrapper | HTTP Route | Frontend Service | UI Page/Component | Status |
|---|---|---|---|---|---|---|
| `initialize` | public | — | — | — | — | ◻️ (deploy-time) |
| `deposit-to-yield-escrow` | public | — | — | — | — | 🔧 (called by milestone-escrow) |
| `withdraw-from-yield-escrow` | public | — | — | — | — | 🔧 (called by milestone-escrow) |
| `claim-backer-yield` | public | `claimBackerYield` | `POST /api/yield/claim-yield/:campaignId` | `claimBackerYield` | `CampaignPage` / `BackerDashboard` / `CreatorDashboard` | ✅ |
| `claim-creator-bonus` | public | `claimCreatorBonus` | `POST /api/yield/claim-bonus/:campaignId` | `claimCreatorBonus` | `CampaignPage` / `CreatorDashboard` | ✅ |
| `distribute-platform-yield` | public | — | — | — | — | ◻️ (admin) |
| `set-strategy` | public | — | — | — | — | ◻️ (admin) |
| `set-milestone-escrow` | public | — | — | — | — | ◻️ (admin) |
| `set-milestone-verification` | public | — | — | — | — | ◻️ (admin) |
| `set-pause-state` | public | — | — | — | — | ◻️ (admin) |
| `emergency-withdraw` | public | — | — | — | — | ◻️ (admin) |
| `get-yield-pool` | read-only | `getYieldPool` | `GET /api/yield/pool/:campaignId` | — | — | ✅ |
| `get-backer-yield-claim` | read-only | — | — | — | — | ◻️ |
| `get-platform-yield-accumulated` | read-only | — | — | — | — | ◻️ |
| `get-default-strategy` | read-only | — | — | — | — | ◻️ |
| `get-milestone-escrow` | read-only | — | — | — | — | ◻️ |
| `get-milestone-verification` | read-only | — | — | — | — | ◻️ |
| status / version / active / name | read-only | — | — | — | — | ◻️ |

---

## 5. Funding Pool (`funding-pool`)

| Function | Type | Backend Wrapper | HTTP Route | Frontend Service | UI Page/Component | Status |
|---|---|---|---|---|---|---|
| `initialize` | public | — | — | — | — | ◻️ (deploy-time) |
| `create-pool` | public | `createPoolInContract` | `POST /api/pools` | `createPool` | `PoolCreatePage` | ✅ |
| `join-pool` | public | `joinPoolInContract` | `POST /api/pools/:id/join` | `joinPool` | `PoolDetailPage` | ✅ |
| `contribute` | public | `contributeToPoolContract` | `POST /api/pools/:id/contribute` | `contributeToPool` | `PoolDetailPage` | ✅ |
| `propose-allocation` | public | `proposeAllocation` | `POST /api/pools/:id/proposals` | `createProposal` | `PoolDetailPage` | ✅ |
| `vote` | public | `voteOnProposal` | `POST /api/proposals/:id/vote` | `voteOnProposal` | `PoolDetailPage` | ✅ |
| `execute-allocation` | public | `executeAllocation` | `POST /api/proposals/:id/execute` | `executeProposal` | `PoolDetailPage` | ✅ |
| `close-pool` | public | `closePoolInContract` | `POST /api/pools/:id/close` | `closePool` | `PoolDetailPage` | ✅ |
| `withdraw-unused` | public | `withdrawUnused` | `POST /api/pools/:id/withdraw` | `withdrawFromPool` | `PoolDetailPage` | ✅ |
| `set-contract-addresses` | public | — | — | — | — | ◻️ (admin) |
| `set-pause-state` | public | — | — | — | — | ◻️ (admin) |
| `emergency-withdraw` | public | — | — | — | — | ◻️ (admin) |
| `emergency-close-pool` | public | — | — | — | — | ◻️ (admin) |
| `emergency-refund-member` | public | — | — | — | — | ◻️ (admin) |
| `get-pool` | read-only | `getPoolFromContract` | `GET /api/pools/:id` (chain data panel) | — | — | ✅ |
| `get-pool-members` | read-only | — | — | — | — | ◻️ (stub in contract) |
| `get-proposal` | read-only | `getProposalFromContract` | `GET /api/pools/proposals/:id` (chain data panel) | — | — | ✅ |
| `get-proposal-vote` | read-only | `getProposalVote` | — | — | — | 🔶 |
| `get-member` | read-only | `getPoolMember` | — | — | — | 🔶 |
| `get-admin-contract` | read-only | — | — | — | — | ◻️ |
| `get-emergency-admin` | read-only | — | — | — | — | ◻️ |
| `get-verification-contract` | read-only | — | — | — | — | ◻️ |
| `get-reputation-contract` | read-only | — | — | — | — | ◻️ |
| `get-escrow-contract` | read-only | — | — | — | — | ◻️ |
| `get-pool-counter` / `get-proposal-counter` | read-only | — | — | — | — | ◻️ |
| status / version / active / name | read-only | — | — | — | — | ◻️ |

---

## 6. Project Verification Module (`project-verification-module`)

| Function | Type | Backend Wrapper | HTTP Route | Frontend Service | UI Page/Component | Status |
|---|---|---|---|---|---|---|
| `initialize` | public | — | — | — | — | ◻️ (deploy-time) |
| `register-creator` | public | — (v2 `proxy-register-creator` used instead) | — | — | — | ◻️ (v2 replaces this) |
| `register-filmmaker-id` | public | — (backward-compat alias) | — | — | — | ◻️ |
| `add-filmmaker-portfolio` | public | — (backward-compat alias) | — | — | — | ◻️ |
| `verify-filmmaker-identity` | public | — (backward-compat alias) | — | — | — | ◻️ |
| `add-portfolio` | public | `addPortfolio` | `POST /api/profiles/:address/portfolio` | `addPortfolio` | `ProfilePage` | ✅ |
| `pay-verification-fee` | public | — | — | — | — | ◻️ |
| `verify-creator` | public | — | — | — | — | ◻️ (admin/timelock) |
| `emergency-verify-creator` | public | `emergencyVerifyCreator` | `POST /api/verification/:id/review` / `POST /api/verification/notify-registered` | (used in admin review flow) | (admin panel) | ⚠️ (admin-only route) |
| `emergency-revoke-verification` | public | — | — | — | — | ◻️ (admin) |
| `update-filmmaker-expiration-period` | public | — | — | — | — | ◻️ (admin) |
| `add-filmmaker-endorsement` | public | — | — | — | — | ◻️ |
| `set-contract-admin` | public | — | — | — | — | ◻️ (admin) |
| `set-core-contract` | public | — | — | — | — | ◻️ (admin) |
| `set-renewal-extension-contract` | public | — | — | — | — | ◻️ (admin) |
| `set-third-party-endorser` | public | — | — | — | — | ◻️ (admin) |
| `set-pause-state` | public | — | — | — | — | ◻️ (admin) |
| `emergency-withdraw` | public | — | — | — | — | ◻️ (admin) |
| `is-portfolio-available` | read-only | — | — | — | — | ◻️ |
| `is-creator-currently-verified` | read-only | `isCreatorCurrentlyVerified` | `GET /api/verification/onchain-status/:address` | (used in verification status panel) | `VerificationPage` | ✅ |
| `get-verification-funding-cap` | read-only | `getCreatorFundingCap` | `GET /api/verification/onchain-status/:address` | (used in verification status panel) | — | ✅ |
| `is-filmmaker-currently-verified` | read-only | — (backward-compat) | — | — | — | ◻️ |
| `is-endorsement-available` | read-only | — | — | — | — | ◻️ |
| `get-creator-identity` | read-only | `getCreatorIdentity` | `GET /api/verification/onchain-status/:address` | (used in verification status panel) | — | ✅ |
| `get-filmmaker-identity` | read-only | — (backward-compat) | — | — | — | ◻️ |
| `get-filmmaker-portfolio` | read-only | `getPortfolio` | — | — | — | 🔶 |
| `get-filmmaker-endorsements` | read-only | — | — | — | — | ◻️ |
| `get-total-filmmakers` | read-only | — | — | — | — | ◻️ |
| `get-total-verification-fees` | read-only | — | — | — | — | ◻️ |
| remaining read-only getters | read-only | — | — | — | — | ◻️ |

---

## 7. Project Verification Module v2 (`project-verification-module-v2`)

| Function | Type | Backend Wrapper | HTTP Route | Frontend Service | UI Page/Component | Status |
|---|---|---|---|---|---|---|
| `initialize` | public | — | — | — | — | ◻️ (deploy-time) |
| `proxy-register-creator` | public | `proxyRegisterCreator` | `POST /api/auth/register` (creator path) | `register` / `quickRegister` | `RegisterPage` / Quick Register | ✅ |
| `register-creator` | public | — | — | — | — | ◻️ (wallet-based, v2 fallback) |
| `emergency-verify-creator` | public | — | — | — | — | ◻️ (admin) |
| `emergency-revoke-verification` | public | — | — | — | — | ◻️ (admin) |
| `set-pause-state` | public | — | — | — | — | ◻️ (admin) |
| `emergency-withdraw` | public | — | — | — | — | ◻️ (admin) |
| `is-creator-currently-verified` | read-only | `isCreatorCurrentlyVerified` (v2 first) | `GET /api/verification/onchain-status/:address` | — | `VerificationPage` | ✅ |
| `get-creator-identity` | read-only | `getCreatorIdentity` (v2 first) | `GET /api/verification/onchain-status/:address` | — | — | ✅ |
| `get-filmmaker-identity` | read-only | (backward-compat) | — | — | — | ◻️ |
| `get-verification-funding-cap` | read-only | `getCreatorFundingCap` (v2 first) | `GET /api/verification/onchain-status/:address` | — | — | ✅ |
| `get-total-registered-creators` | read-only | — | — | — | — | ◻️ |
| status / version / active / name | read-only | — | — | — | — | ◻️ |

---

## 8. Reputation (`reputation`)

| Function | Type | Backend Wrapper | HTTP Route | Frontend Service | UI Page/Component | Status |
|---|---|---|---|---|---|---|
| `initialize` | public | — | — | — | — | ◻️ (deploy-time) |
| `set-verification-gate` | public | — | — | — | — | ◻️ (admin) |
| `rate-user` | public | `rateUser` | `POST /api/profiles/:address/ratings` | `rateUser` | `ProfilePage` | ✅ |
| `get-reputation-score` | read-only | — | — | — | — | ◻️ |
| `get-ratings-for-user` | read-only | — | — | — | — | ◻️ (stub in contract) |
| `get-rating` | read-only | — | — | — | — | ◻️ |
| `get-score-data` | read-only | — | — | — | — | ◻️ |
| `get-total-ratings-count` | read-only | — | — | — | — | ◻️ |
| `get-verification-gate` | read-only | — | — | — | — | ◻️ |
| `get-admin-contract` | read-only | — | — | — | — | ◻️ |

---

## 9. Oracle Proxy (`oracle-proxy`)

| Function | Type | Backend Wrapper | HTTP Route | Frontend Service | UI Page/Component | Status |
|---|---|---|---|---|---|---|
| `initialize` | public | — | — | — | — | ◻️ (deploy-time) |
| `set-price-oracle` | public | — | — | — | — | ◻️ (admin) |
| `update-price` | public | — | — | — | — | ◻️ (admin) |
| `emergency-set-price` | public | — | — | — | — | ◻️ (admin) |
| `get-stx-price` | read-only | — | — | — | — | ◻️ |
| `get-stx-price-with-fallback` | read-only | — | — | — | — | ◻️ |
| `get-last-updated` | read-only | — | — | — | — | ◻️ |
| `get-admin-contract` / `get-emergency-admin` | read-only | — | — | — | — | ◻️ |

---

## 10. Support Contracts

### Bitflow Strategy (`bitflow-strategy`)
All functions are **◻️ Not Bridged** — no backend wrappers, no frontend. The yield strategy is a placeholder/mock for v1.

### Mock Strategy (`mock-strategy`)
Test helper only — no bridging needed.

### Asset Registry (`asset-registry`)
All functions are **◻️ Not Bridged** — no backend wrappers. Admin-only contract utility.

### Timelock (`timelock`)
All functions are **◻️ Not Bridged** — admin-only governance contract.

### Emergency Module (`emergency-module`)
Dummy contract — no bridging needed. Used as a placeholder for emergency paths.

### Multi-Sig (`cinex-multisig`)
All functions are **◻️ Not Bridged** — admin-only governance contract.

### Module Base (`module-base`)
Minimal base trait — no bridging needed.

---

## Deployment Status

| Contract | In Testnet Plan? | Notes |
|---|---|---|
| All 29 contracts (except v2) | ✅ In `default.testnet-plan.yaml` | Deployed under `ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM` |
| `project-verification-module-v2` | ❌ NOT in any testnet plan | ✅ Deployed via Render backend to `STK0ASFJK4DJG8G8YY556X7H9E1FWABCDWEBGQ12` (nonce 4) — standalone, no trait deps |

## Diagnostic/Admin Functions (not in contract tables)

| Function | Purpose | Route |
|---|---|---|
| `init` | Wallet initialization (`CREATOR_KEY`/`BACKER_KEY`) | Called at startup |
| `getNetwork` | Returns StacksTestnet network config | `GET /api/demo/debug` |
| `getState` | Returns wallet/nonce state | `GET /api/demo/debug` |
| `testBroadcast` | Diagnostic broadcast test | `GET /api/demo/test-broadcast` |
| `deployContract` | Deploys a `.clar` contract from disk | `POST /api/deploy/contract` |
| `getTxStatus` | Checks Hiro API for tx confirmation | `GET /api/demo/status/:txHash` |

---

## Summary Statistics

| Status | Count | Notes |
|---|---|---|
| ✅ Fully Bridged | 31 | Backend wrapper + HTTP route + frontend service + UI |
| ⚠️ Partial | 3 | Has backend wrapper, missing HTTP route or full UI |
| 🔶 Backend Only | 3 | Has backend wrapper, no frontend |
| 🔧 Internal | 3 | Called by other contracts, not directly bridged |
| ◻️ Not Bridged | 80+ | Admin functions, read-only getters, governance, support contracts |

### Fully Bridged Functions

1. `campaign-module-2.create-campaign` → `POST /api/campaigns` → `CreateCampaignPage`
2. `campaign-module-2.contribute-to-campaign` → `POST /api/campaigns/:id/contribute` → `CampaignPage`
3. `campaign-module-2.get-campaign` → `GET /api/campaigns/:id/chain-state` → `CampaignPage` (chain panel)
4. `campaign-module-2.get-total-raised-funds` → `GET /api/campaigns/:id/chain-state` → `CampaignPage` (chain panel)
5. `campaign-module-2.get-campaign-contributions` → `GET /api/yield/contributions/:campaignId/:contributor` → (chain data panel)
6. `milestone-escrow.create-campaign` → `POST /api/campaigns` → `CreateCampaignPage`
7. `milestone-escrow.deposit` → `POST /api/campaigns/:id/contribute` → `CampaignPage`
8. `milestone-escrow.withdraw-from-campaign` → `POST /api/campaigns/:id/claim-funds` → `CreatorDashboard` / `CampaignPage`
9. `milestone-escrow.collect-campaign-fee` → `POST /api/campaigns/:id/claim-funds` (auto) → (automatic)
10. `milestone-escrow.submit-milestone-proof` → `POST /api/escrow/milestone-proof` → `MilestoneList`
11. `milestone-escrow.approve-milestone` → `POST /api/escrow/approve-milestone` → `MilestoneList`
12. `milestone-escrow.release-milestone-funds` → `POST /api/escrow/release-milestone` → `MilestoneList`
13. `milestone-escrow.get-campaign` → `GET /api/campaigns/:id/chain-state` → `CampaignPage` (chain panel)
14. `milestone-escrow.get-milestone-state` → `GET /api/campaigns/:id/chain-state` → `CampaignPage` (chain panel)
15. `milestone-escrow.get-campaign-balance` → `GET /api/campaigns/:id/chain-state` → `CampaignPage` (chain panel)
16. `milestone-verification.create-milestones` → `POST /api/milestones` → `CreateCampaignPage`
17. `milestone-verification.submit-milestone` → `PUT /api/milestones/:id/status` (→active) → `MilestoneList`
18. `milestone-verification.endorse-milestone` → `POST /api/milestones/:id/vote` → `MilestoneList`
19. `milestone-verification.finalize-milestone` → `PUT /api/milestones/:id/status` (→completed) → `MilestoneList`
20. `yield-escrow.claim-backer-yield` → `POST /api/yield/claim-yield/:campaignId` → `CampaignPage` / `BackerDashboard`
21. `yield-escrow.claim-creator-bonus` → `POST /api/yield/claim-bonus/:campaignId` → `CampaignPage` / `CreatorDashboard`
22. `yield-escrow.get-yield-pool` → `GET /api/yield/pool/:campaignId` → (chain data panel)
23. `funding-pool.create-pool` → `POST /api/pools` → `PoolCreatePage`
24. `funding-pool.join-pool` → `POST /api/pools/:id/join` → `PoolDetailPage`
25. `funding-pool.contribute` → `POST /api/pools/:id/contribute` → `PoolDetailPage`
26. `funding-pool.propose-allocation` → `POST /api/pools/:id/proposals` → `PoolDetailPage`
27. `funding-pool.vote` → `POST /api/proposals/:id/vote` → `PoolDetailPage`
28. `funding-pool.execute-allocation` → `POST /api/proposals/:id/execute` → `PoolDetailPage`
29. `funding-pool.close-pool` → `POST /api/pools/:id/close` → `PoolDetailPage`
30. `funding-pool.withdraw-unused` → `POST /api/pools/:id/withdraw` → `PoolDetailPage`
31. `funding-pool.get-pool` → `GET /api/pools/:id` → `PoolDetailPage`
32. `funding-pool.get-proposal` → `GET /api/pools/proposals/:id` → `PoolDetailPage`
33. `project-verification-module.add-portfolio` → `POST /api/profiles/:address/portfolio` → `ProfilePage`
34. `project-verification-module.is-creator-currently-verified` → `GET /api/verification/onchain-status/:address` → `VerificationPage`
35. `project-verification-module.get-verification-funding-cap` → `GET /api/verification/onchain-status/:address` → `VerificationPage`
36. `project-verification-module.get-creator-identity` → `GET /api/verification/onchain-status/:address` → `VerificationPage`
37. `project-verification-module-v2.proxy-register-creator` → `POST /api/auth/register` → `RegisterPage`
38. `project-verification-module-v2.is-creator-currently-verified` → `GET /api/verification/onchain-status/:address` → `VerificationPage`
39. `project-verification-module-v2.get-creator-identity` → `GET /api/verification/onchain-status/:address` → `VerificationPage`
40. `project-verification-module-v2.get-verification-funding-cap` → `GET /api/verification/onchain-status/:address` → `VerificationPage`
41. `reputation.rate-user` → `POST /api/profiles/:address/ratings` → `ProfilePage`

### ⚠️ Partial (backend wrapper + partial route, missing full UI)

| Function | Backend Wrapper | HTTP Route | Missing |
|---|---|---|---|
| `yield-escrow.distribute-platform-yield` | — | — | Entirely unbridged (admin) |
| `project-verification-module.emergency-verify-creator` | `emergencyVerifyCreator` | `POST /api/verification/:id/review` | Admin-only, no creator-facing UI |
| `project-verification-module.get-portfolio` (`get-filmmaker-portfolio`) | `getPortfolio` | — | No route exposes chain data |

### 🔶 Backend Only (wrapper exists, no frontend)

| Function | Backend Wrapper | On-Chain Target |
|---|---|---|
| `funding-pool.get-proposal-vote` | `getProposalVote` | `funding-pool.get-proposal-vote` |
| `funding-pool.get-member` | `getPoolMember` | `funding-pool.get-member` |
| `reputation.get-average-rating` | `getAverageRating` | `reputation.get-average-rating` |

### Top Priority Gaps

| Function | Gap | Impact |
|---|---|---|
| `oracle-proxy.get-stx-price` | No backend wrapper | STX price not available for NGN conversion |
| `reputation.get-reputation-score` | No backend wrapper | Score not displayed in profile |
| `funding-pool.get-proposal-vote` | No frontend service / UI | On-chain vote data not surfaced |
