# Yellow Card API Reference

> **Sandbox Base URL**: `https://sandbox.api.yellowcard.io/business`  
> **Production Base URL**: `https://api.yellowcard.io/business`  
> **Auth**: `YcHmacV1` scheme — HMAC-SHA256 signature over (timestamp + apiKey + bodyHash)  
> **Secret Key**: `YELLOW_CARD_SECRET_KEY` (env var)  
> **API Key**: `YELLOW_CARD_API_KEY` (env var)

## Account & Config

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/account` | Get business account info, channels, and configuration |
| `GET` | `/onboarding-status` | Check onboarding/verification status |
| `GET` | `/fees/config` | Get fee configuration for your account |
| `GET` | `/travel-rule/config` | Get Travel Rule compliance configuration |

## Channels & Networks

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/channels` | List available payout channels (NGN bank, mobile money, etc.) |
| `GET` | `/networks` | List supported fiat/bank networks |
| `GET` | `/crypto-channels` | List available crypto payout channels |

## Exchange Rates

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/rates` | Get current exchange rates (`?from=USDC&to=NGN&amount=100000`) |

## Bank Verification

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/details/bank` | Resolve/verify a bank account (`{ bankCode, accountNumber }`) |

## Send (NGN Payout)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/send` | **Submit send request** — initiate NGN payout |
| `POST` | `/send/{id}/accept` | Accept a pending send (for approval workflows) |
| `POST` | `/send/{id}/deny` | Deny a pending send |
| `GET` | `/send/{id}` | Lookup send by Yellow Card ID |
| `GET` | `/send/sequence/{sequenceID}` | Lookup send by sequence ID |
| `GET` | `/sends` | List sends (`?limit=&offset=&status=`) |
| `GET` | `/sends/fee` | Get fee estimate for a send |
| `POST` | `/sends/{id}/fail-pending-liquidity` | Fail a send stuck in pending liquidity |

### Send Request Body

```json
{
  "amount": "16500000",
  "currency": "NGN",
  "recipientType": "bank_account",
  "recipient": {
    "bankCode": "044",
    "accountNumber": "1234567890",
    "accountName": "John Doe"
  },
  "callbackUrl": "https://cine-x-api.vercel.app/api/bos/webhooks/yellowcard"
}
```

### Send Status Values

`pending` | `processing` | `completed` | `successful` | `failed` | `denied` | `cancelled`

> **Note**: `successful` and `completed` both mean payout delivered. Normalize to `completed` internally.

## Send (Crypto)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/crypto/send` | Submit crypto send request |
| `GET` | `/crypto/sends` | List crypto sends |
| `GET` | `/crypto/send/sequence/{sequenceID}` | Lookup crypto send by sequence ID |

## Receive (NGN On-Ramp)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/receive` | Submit receive request (fiat → crypto) |
| `POST` | `/receive/{id}/accept` | Accept receive request |
| `POST` | `/receive/{id}/deny` | Deny receive request |
| `POST` | `/receive/{id}/cancel` | Cancel receive request |
| `POST` | `/receive/{id}/refund` | Refund receive request |
| `GET` | `/receive/{id}` | Lookup receive by Yellow Card ID |
| `GET` | `/receive/sequence/{sequenceID}` | Lookup receive by sequence ID |
| `GET` | `/receives` | List receives |

## Fees

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/fees/config` | Get fee configuration for all channels/currencies |

## Webhooks

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/webhooks` | Create a webhook subscription |
| `PUT` | `/webhooks/{id}` | Update a webhook |
| `DELETE` | `/webhooks/{id}` | Remove a webhook |
| `GET` | `/webhooks` | List webhook subscriptions |

### Webhook Event Types

`send.completed` | `send.failed` | `receive.completed` | `receive.failed` | `crypto.send.completed` | `crypto.send.failed`

## Vaults

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/vaults` | Create a vault |
| `GET` | `/vaults` | Get all vaults for your account |
| `GET` | `/vaults/{vaultId}` | Get vault by ID |
| `GET` | `/vaults/asset-config` | Get asset configuration for vaults |
| `POST` | `/vaults/generate-address` | Generate a deposit address for a vault |

## Sub-Wallets

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/sub-wallets` | Create a sub-wallet |
| `GET` | `/sub-wallets` | List sub-wallets |
| `GET` | `/sub-wallets/{subWalletId}` | Get sub-wallet by ID |
| `PUT` | `/sub-wallets/{subWalletId}` | Update sub-wallet |

## Conversions

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/conversions/eligibility` | Check if account is eligible for auto-conversion |
| `POST` | `/conversions/auto` | Execute auto-conversion |
| `GET` | `/conversions/{id}` | Get conversion by ID |
| `GET` | `/conversions` | List conversions |

## RFQs (Request for Quotes)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/rfqs` | Create a new RFQ |
| `POST` | `/rfqs/{id}/accept` | Accept an RFQ |
| `POST` | `/rfqs/{id}/reject` | Reject an RFQ |
| `GET` | `/rfqs/{id}` | Get RFQ by ID |
| `GET` | `/rfqs` | List RFQs |

## Virtual Accounts

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/virtual-accounts` | List virtual accounts |
| `GET` | `/virtual-accounts/{id}` | Get virtual account by ID |
| `POST` | `/virtual-accounts/simulate-deposit` | **Sandbox only** — simulate a deposit |

## Transactions

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/transactions` | Create a transaction |
| `GET` | `/transactions` | Get transactions for your account |
| `GET` | `/transactions/{id}` | Get transaction by ID |

## Onboarding

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/onboarding-status` | Check KYC/onboarding status |

## Travel Rule

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/travel-rule/config` | Get Travel Rule compliance configuration |

---

## CineX BOS Integration — Endpoint Usage

The BOS state machine uses these Yellow Card endpoints:

| BOS Step | BOS Method | Yellow Card Endpoint |
|----------|-----------|---------------------|
| `submitYellowCardPayout` | `adapter.submitSend()` | `POST /business/send` |
| `confirmYellowCardPayout` | `adapter.lookupSend()` | `GET /business/send/{id}` |
| `healthCheck` | `adapter.healthCheck()` | `GET /business/account` |
| Preflight bank verify | `adapter.resolveBankAccount()` | `POST /business/details/bank` |
| Rate lookup | `adapter.getRates()` | `GET /business/rates` |
| Fee estimate | `adapter.getFee()` | `GET /business/sends/fee` |

---

## MCP Server Configuration

```json
{
  "mcpServers": {
    "payments-service": {
      "type": "http",
      "url": "https://docs.yellowcard.engineering/mcp"
    }
  }
}
```
