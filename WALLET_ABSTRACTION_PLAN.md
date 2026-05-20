# CineX Wallet Abstraction Plan

## Problem
CineX targets 99% non-crypto Nigerian users. Current flow (Leather/Xverse wallet + CEX on-ramp) requires:
1. Download a crypto wallet browser extension
2. Find a CEX to buy STX with Naira
3. Withdraw STX to wallet address
4. Pay gas fees in STX for every transaction
5. Sign popup confirmations for every action

A market woman using POS transfers cannot do this.

## Solution: Invisible Blockchain

**Users should never see an address, sign a transaction, or care about gas fees.**

```
┌─────────────────────────────────────────────────────┐
│              CineX Frontend (React)                  │
│  ┌──────────────┐  ┌──────────────┐                 │
│  │ Email/Phone   │  │ Naira        │                 │
│  │ Login         │  │ Balance UI   │                 │
│  └──────────────┘  └──────────────┘                 │
│         │                   │                        │
│         ▼                   ▼                        │
│  ┌──────────────────────────────────────────┐       │
│  │         Backend (Node.js)                 │       │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐  │       │
│  │  │Wallet    │ │On-ramp   │ │Tx Relay  │  │       │
│  │  │Service   │ │Service   │ │(Gas      │  │       │
│  │  │          │ │          │ │Sponsor)  │  │       │
│  │  └────┬─────┘ └────┬─────┘ └────┬─────┘  │       │
│  └───────┼────────────┼────────────┼────────┘       │
│          │            │            │                  │
│          ▼            ▼            ▼                  │
│  ┌──────────────────────────────────────────┐       │
│  │      MCP Tools / Agent Layer              │       │
│  │  pillar_direct_create_wallet              │       │
│  │  pillar_direct_send                       │       │
│  │  pillar_direct_position                   │       │
│  │  transfer_stx (gas sponsorship)           │       │
│  └──────────────────────────────────────────┘       │
│          │                                            │
│          ▼                                            │
│  ┌──────────────────────────────────────────┐       │
│  │      Stacks Blockchain                    │       │
│  │  Pillar Smart Wallet per user             │       │
│  │  Sponsored transactions (0 gas)           │       │
│  └──────────────────────────────────────────┘       │
└─────────────────────────────────────────────────────┘
```

## Architecture Layers

### Layer 1: User Identity (No Wallet Awareness)
- User signs up with **email + phone**
- Backend creates a `wallets` DB record with unique `user_id`
- User has **zero blockchain interaction** — no address, no keys, no popups

### Layer 2: Pillar Smart Wallet (Backend-Managed)
- Backend deploys a **Pillar smart wallet** via `aibtc_pillar_direct_create_wallet`
- Pillar provides:
  - **Email recovery** (user loses phone → recover via email)
  - **Sponsored gas** (backend relay pays fees)
  - **Agent-signed transactions** (no user wallet popups)
- BNS name auto-registered (e.g., `user123.cinex.btc`)

### Layer 3: On-Ramp (Naira → sBTC)
MVP: **Manual bank transfer → backend credits wallet**
1. User initiates deposit in-app
2. Gets bank account details (or Paystack checkout URL)
3. Transfers Naira
4. Backend confirms receipt (webhook or manual)
5. Backend agent swaps Naira → sBTC via on-ramp partner
6. sBTC deposited to user's Pillar wallet
7. User sees updated Naira balance in app

### Layer 4: Sponsored Transactions (Zero Gas)
- All blockchain operations use **sponsored transactions**
- Backend relay pays gas fees (via `sponsored=true` in MCP tools)
- User never needs STX for gas

## Database Schema

### `wallets` Table
| Column | Type | Purpose |
|--------|------|---------|
| user_id | TEXT (PK) | Maps to frontend auth |
| email | TEXT | Recovery contact |
| phone | TEXT | SMS notifications |
| pillar_wallet_address | TEXT | Deployed Pillar contract |
| bns_name | TEXT | Human-readable send |
| stx_address | TEXT | Underlying STX address |
| status | ENUM | pending/active/suspended |
| naira_balance | INTEGER | Off-chain Naira ledger |
| sbtc_balance | TEXT | On-chain sBTC (wei) |

### `wallet_transactions` Table
| Column | Type | Purpose |
|--------|------|---------|
| type | ENUM | deposit/withdrawal/send/receive |
| amount_naira | INTEGER | User-facing Naira amount |
| amount_sbtc | TEXT | Actual sBTC moved |
| status | ENUM | pending/confirmed/failed |
| reference | TEXT | Idempotency key |
| tx_id | TEXT | On-chain tx hash |

## API Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/wallets/create` | Create wallet record (email/phone) |
| GET | `/api/wallets/:userId` | Get wallet details |
| GET | `/api/wallets/:userId/balance` | Get balance (naira + sBTC) |
| POST | `/api/wallets/deposit` | Record Naira deposit |
| POST | `/api/wallets/confirm-deposit` | Confirm after on-chain settlement |
| POST | `/api/wallets/send` | Send to another user |
| POST | `/api/wallets/confirm-send` | Confirm after on-chain settlement |
| GET | `/api/wallets/:userId/transactions` | Transaction history |
| POST | `/api/wallets/fail` | Fail a pending transaction (revert balance) |

## Edge Cases & Mitigations

### 1. Deposit Fails Mid-Flight
- **Risk**: User sends Naira, backend agent swap fails
- **Mitigation**: `wallet_transactions.status = 'pending'` prevents double-spend. `failTransaction` reverts Naira balance. 24h timeout auto-fails.

### 2. Pillar Wallet Deployment Fails
- **Risk**: `pillar_direct_create_wallet` fails (network congestion, nonce collision)
- **Mitigation**: Retry with exponential backoff (3 attempts). Wallet stays `pending` — user sees "Wallet being set up" in UI.

### 3. Gas Spikes During Sponsored Send
- **Risk**: Network congestion makes sponsored tx expensive
- **Mitigation**: Dynamic fee estimation. Queue transactions. User sees "Transaction processing" progress bar — no error.

### 4. User Sends to Wrong Recipient
- **Risk**: Typo in email/phone destination
- **Mitigation**: Only BNS names and verified emails. No raw addresses. Confirmation screen shows recipient name + amount. 5-minute cancel window.

### 5. Naira Devaluation Window
- **Risk**: Time between deposit quote and confirmation
- **Mitigation**: 15-minute quote lock. Show "Rate locked for 15 minutes" in UI.

### 6. User Loses Email Access
- **Risk**: Pillar email recovery fails if email also lost
- **Mitigation**: Backup phone recovery. Support team can initiate social recovery with ID verification.

### 7. Double-Spend (Frontend Race)
- **Risk**: User taps "Send" twice
- **Mitigation**: `reference` idempotency key. Backend deduplicates within 60s window.

## CTO Recommendations

### MVP vs Post-MVP

| Feature | MVP | Post-MVP |
|---------|-----|----------|
| Wallet Type | Pillar smart wallet (MCP-managed) | Custom embedded wallet SDK |
| On-Ramp | Manual bank transfer → backend credits | Paystack/Flutterwave auto-reconciliation |
| Auth | Email + phone (separate from wallet) | Email-recovered wallet-native auth |
| Gas | Backend sponsored relay | Batch txns for scale efficiency |
| Sending | By email/phone → BNS name lookup | By username, QR code, NFC |
| Withdrawals | Manual support request | Instant to bank via on-ramp partner |
| Recovery | Email OTP → support agent override | Social recovery (3 guardians) |

### Security Model

1. **Agent key**: A single hot key on the backend signs all user transactions. Compromise allows draining all wallets. Mitigation: limit daily volume per wallet, require 2FA for amounts > ₦500,000.
2. **Audit trail**: Every wallet transaction logged with `reference` idempotency key. On-chain tx hash linked to off-chain record.
3. **Rate limits**: 5 sends/hour per wallet. 3 failed attempts locks send for 1 hour.
4. **No raw addresses**: Users can only send to BNS names, emails, or phone numbers registered in the system.

### Integration Timeline

| Phase | When | What |
|-------|------|------|
| 1 | Now | Manual on-ramp + Pillar wallet (backend agent signs) |
| 2 | Week 3-4 | Auto-reconciliation (Paystack webhook) |
| 3 | Week 5-6 | Embedded wallet SDK (phone login, no Leather) |
| 4 | Week 7-8 | Full withdrawal to bank |

## Files Created

```
backend/src/
├── services/
│   └── walletService.js         # Wallet business logic
├── routes/
│   └── wallets.js               # Wallet API endpoints
├── database.js                  # (updated with wallets tables)
└── index.js                     # (updated with wallet routes)
```
