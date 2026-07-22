# CineX Wallet Abstraction Plan

## Problem
CineX targets two user groups with opposite needs:
1. **Nigerian creatives** — transact in **NGN** (₦), receive funding from global backers
2. **Global backers** — transact in **USD** ($), fund creative projects worldwide

Both must never see blockchain addresses, sign transactions, or care about gas fees.

## Solution: Dual-Currency Wallet (NGN + USD)

Every user gets a wallet with **three balances** backed by a single on-chain sBTC position:

| Balance | Type | Purpose |
|---------|------|---------|
| `naira_balance` | INTEGER (kobo) | NGN-denominated transactions |
| `usd_balance` | INTEGER (cents) | USD-denominated transactions |
| `sbtc_balance` | TEXT (sats) | On-chain backing for both currencies |

sBTC is the settlement layer — both NGN and USD balances are IOUs fully backed by sBTC in a Pillar smart wallet.

```
┌─────────────────────────────────────────────────────────────────┐
│                     CineX Frontend                              │
│  ┌──────────────────┐  ┌──────────────────┐                    │
│  │  NGN User View   │  │  USD User View   │                    │
│  │  (Nigerian       │  │  (Global Backer) │                    │
│  │   Creative)      │  │                  │                    │
│  │  Balance: ₦      │  │  Balance: $      │                    │
│  │  Send: ₦         │  │  Send: $         │                    │
│  │  Convert to $    │  │  Convert to ₦    │                    │
│  └────────┬─────────┘  └────────┬─────────┘                    │
│           │                     │                               │
│           ▼                     ▼                               │
│  ┌──────────────────────────────────────────────────────┐      │
│  │              Backend (Node.js)                        │      │
│  │  ┌────────────────┐  ┌──────────────────────┐        │      │
│  │  │ WalletService   │  │ RateService           │        │      │
│  │  │ 3-balance       │  │ NGN/USD (parallel mkt)│        │      │
│  │  │ bookkeeping     │  │ USD/sBTC (sBTC peg)   │        │      │
│  │  │ cross-currency  │  │ 5-min cache           │        │      │
│  │  │ sends           │  │ 0.75% spread          │        │      │
│  │  └────────┬────────┘  └───────────┬───────────┘        │      │
│  │           │                       │                      │      │
│  │           ▼                       ▼                      │      │
│  │  ┌──────────────────────────────────────────────┐       │      │
│  │  │          Agent Layer (MCP Tools)              │       │      │
│  │  │  pillar_direct_create_wallet                 │       │      │
│  │  │  pillar_direct_send  (sponsored gas)          │       │      │
│  │  │  transfer_stx / sbtc_transfer                │       │      │
│  │  └──────────────────────────────────────────────┘       │      │
│  └──────────────────────────────────────────────────────────┘      │
│           │                                                         │
│           ▼                                                         │
│  ┌──────────────────────────────────────────────────────────┐      │
│  │  sBTC → Pillar Smart Wallet per user                     │      │
│  │  NGN and USD are both backed by sBTC                      │      │
│  └──────────────────────────────────────────────────────────┘      │
└──────────────────────────────────────────────────────────────────┘
```

## Architecture Layers

### Layer 1: Rate Service
- **Primary source**: Astrum API (free, multi-provider NGN parallel market rates)
- **Fallback**: Admin-configured hardcoded rate (default: ₦1,400/$)
- **Upgrade path**: AbokiFX API (£100/yr) when transaction volume justifies
- **Caching**: 5-minute TTL; stale cache returned with `stale: true` flag + warning
- **Spread**: 0.75% on NGN↔USD conversions (CineX platform performance fee)
  - Buy USD with NGN: user gets `rate * (1 + 0.0075)` — pays more NGN
  - Sell USD for NGN: user gets `rate * (1 - 0.0075)` — receives less NGN
  - Standard fintech practice (Wise: 0.41-1.5%, virtual card providers: 1-3%)

### Layer 2: Dual-Currency Wallet
- User selects **preferred currency** at signup (NGN or USD)
- UI shows only preferred currency by default
- Secondary currency visible in "Convert" section
- Every wallet has NGN + USD + sBTC balances backed by Pillar smart wallet

### Layer 3: Cross-Currency Sends
- **Same currency**: Direct debit/credit (NGN→NGN, USD→USD)
- **Cross-currency**: Auto-convert at current rate + 0.75% spread
  - US backer sends $100 → Nigerian creative receives ₦ equivalent
  - Nigerian creative sends ₦50,000 → US backer receives $ equivalent
- sBTC settles on-chain; NGN/USD ledgers adjust off-chain

### Layer 4: Sponsored Transactions
- All blockchain operations use Pillar-sponsored transactions
- Backend relay pays gas fees (agent-signed)
- User never needs STX for gas

## Rate Sources — Decision Rationale

| Source | Cost | Type | Why Not CBN Rate |
|--------|------|------|-------------------|
| **Astrum API** (MVP) | Free | Multi-provider parallel market | CBN official rate (~₦1,370/$) is a fiction — no Nigerian transacts at it. Parallel market (~₦1,400/$) is what users actually pay. Virtually no Nigerian fintech (Paystack, Flutterwave, Grey, Chipper) uses CBN rates. |
| **AbokiFX** (post-MVP) | £100/yr | Single-provider parallel market | |
| **Chainlink NGN/USD** (future) | Gas | Decentralized oracle on Base | |

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
| btc_address | TEXT | BTC address for deposits |
| status | ENUM | pending/active/suspended |
| **preferred_currency** | TEXT | NGN or USD (user choice at signup) |
| naira_balance | INTEGER | Off-chain NGN ledger (kobo) |
| **usd_balance** | INTEGER | Off-chain USD ledger (cents) |
| sbtc_balance | TEXT | On-chain sBTC backing (sats) |

### `wallet_transactions` Table
| Column | Type | Purpose |
|--------|------|---------|
| type | ENUM | deposit/withdrawal/send/receive/fee/swap |
| amount_naira | INTEGER | NGN amount |
| **amount_usd** | INTEGER | USD amount |
| amount_sbtc | TEXT | sBTC moved |
| **conversion_rate_ngn_usd** | TEXT | Snapshot of rate at time of transaction |
| status | ENUM | pending/confirmed/failed |
| reference | TEXT | Idempotency key |
| tx_id | TEXT | On-chain tx hash |

### `admin_settings` Table
| Column | Type | Purpose |
|--------|------|---------|
| key | TEXT (PK) | Setting key (e.g., `fallback_ngn_usd`) |
| value | TEXT | Setting value |
| updated_at | INTEGER | Last update timestamp |

## API Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/wallets/create` | Create wallet with `preferred_currency` (NGN/USD) |
| POST | `/api/wallets/activate` | Activate after Pillar deployment |
| GET | `/api/wallets/:userId` | Get wallet details |
| GET | `/api/wallets/:userId/balance` | Get NGN + USD + sBTC + equivalents + rates |
| GET | `/api/wallets/:userId/summary` | Comprehensive wallet overview |
| GET | `/api/wallets/:userId/transactions` | Transaction history |
| POST | `/api/wallets/preferred-currency` | Switch between NGN and USD |
| POST | `/api/wallets/deposit` | Record deposit (accepts `currency` param) |
| POST | `/api/wallets/confirm-deposit` | Confirm after on-chain settlement |
| POST | `/api/wallets/send` | Send with auto-cross-currency conversion |
| POST | `/api/wallets/confirm-send` | Confirm after on-chain settlement |
| POST | `/api/wallets/fail` | Fail pending transaction (revert balance) |
| GET | `/api/wallets/rates/all` | Current exchange rates (NGN/USD, USD/sBTC) |
| POST | `/api/wallets/rates/convert` | Calculate conversion without executing |
| POST | `/api/wallets/quote` | Get 60-second locked quote for conversion |
| POST | `/api/wallets/convert` | Execute quoted conversion |

## Edge Cases & Mitigations

### 1. Rate Staleness
- **Risk**: User gets quote, rate moves significantly before confirmation
- **Mitigation**: 60-second quote lock. Stale rate returns `stale: true` flag. UI shows "Rate expired, get new quote."

### 2. NGN Volatility
- **Risk**: NGN drops >5% in a day, sBTC backing insufficient
- **Mitigation**: Large conversions (>₦500k equivalent) require rate acknowledgment. USD balance is canonical store of value.

### 3. USD Card Chargeback
- **Risk**: Backer funds via card, chargebacks 60 days later, sBTC already deployed
- **Mitigation**: 7-day hold on USD card deposits for new users. 3 days for verified users (30+ day accounts). NGN bank transfers: 0 hold (irreversible in Nigeria).

### 4. Cross-Currency Send — Insufficient Balance
- **Risk**: User wants to send $50 but only has NGN
- **Mitigation**: Auto-convert at current rate. Show preview: "You will send ₦70,550 which converts to $50.00". If NGN balance also insufficient, block with clear message + convert suggestion.

### 5. Triple-Layer Rounding (NGN ↔ USD ↔ sBTC)
- **Risk**: 3 conversions create rounding errors
- **Mitigation**: Always go through sBTC (single conversion path). Round in favor of platform for < 1 kobo/cent. Display 2 decimal places for NGN and USD.

### 6. Minimum Conversion Amount
- **Risk**: User tries to convert ₦1 (below on-chain minimum)
- **Mitigation**: Minimum ₦1,000 or $5 equivalent for conversions + sends.

### 7. Deposit Fails Mid-Flight
- **Mitigation**: `status = 'pending'` prevents double-spend. `failTransaction` reverts correct balance. 24h timeout auto-fails.

### 8. Pillar Wallet Deployment Fails
- **Mitigation**: Retry with exponential backoff (3 attempts). Wallet stays `pending`.

### 9. Gas Spikes
- **Mitigation**: Dynamic fee estimation. Queued transactions. Progress bar in UI.

### 10. User Sends to Wrong Recipient
- **Mitigation**: Only email/phone registered users. Confirmation screen. 5-minute cancel window.

## CTO Recommendations

### MVP vs Post-MVP

| Feature | MVP | Post-MVP |
|---------|-----|----------|
| Rate source | Astrum API (free) + admin fallback | AbokiFX paid API + Chainlink oracle |
| Wallet type | Pillar smart wallet (MCP-managed) — see [Pillar Passkey Spike](docs/spikes/pillar-passkey-spike.md) | Custom embedded wallet SDK |
| USD on-ramp | Manual bank wire → backend credits | Stripe card payment → sBTC |
| NGN on-ramp | Manual bank transfer → backend credits | Paystack auto-reconciliation |
| Spread | 0.75% flat | Tiered (volume-based) |
| Quote lock | 60s server-side | Signed off-chain quote |
| Auth | Email + phone | Email-recovered wallet-native auth |
| Gas | Backend sponsored relay | Batch txns for scale |
| Sending | By userId → auto cross-currency | By username, QR code, NFC |
| Withdrawals | Manual support request | Instant to bank via on-ramp partner |

### Security Model

1. **Agent key**: Single hot key on backend signs all txs. Limit daily volume per wallet. Require 2FA for >₦500k or >$350.
2. **Balance audit**: `naira_balance + (usd_balance * ngn_rate)` must equal `sbtc_balance * usd_btc_rate * ngn_rate` within rounding tolerance (checked every conversion).
3. **No free arbitrage**: NGN→USD→NGN round-trip loses on 0.75% spread both directions (total 1.5% loss).
4. **Rate limits**: 5 sends/hour per wallet. 3 failed attempts locks send for 1 hour.
5. **Push notifications**: Any conversion >₦100k or >$200 triggers SMS/email.

### Implementation Order

1. rateService.js — rate fetching + caching + conversion math
2. database.js — dual-currency schema migration
3. walletService.js — 3-balance bookkeeping
4. wallets.js — API routes
5. apiServices.ts — frontend types + methods
6. UI components (separate build phase)

## Files

```
backend/src/
├── services/
│   ├── rateService.js          # NEW — rate fetching, caching, conversion, quotes
│   └── walletService.js        # UPDATED — dual-currency, cross-currency sends, convert
├── routes/
│   └── wallets.js              # UPDATED — +rates, +quote, +convert, +preferred-currency
├── database.js                 # UPDATED — +usd_balance, +preferred_currency, migration
└── index.js                    # (no changes needed — /api/wallets already registered)
```
