# API Key Setup — BOS External Services

Step-by-step guide for obtaining API keys for the BOS (Bridge Orchestration Service) settlement pipeline.

## 1. xReserve (Circle) — USDCx Bridge Attestation

**Type:** Self-service — account creation to API key in ~10 minutes.

### Steps

1. **Create Circle Account**
   - Go to [console.circle.com](https://console.circle.com)
   - Sign up with email (or Google/GitHub SSO)
   - Verify email

2. **Create a Project**
   - In the Console sidebar, click **Projects** → **Create Project**
   - Name it (e.g. `CineX-BOS`)
   - Select **USDC** as the base asset

3. **Get API Keys**
   - Navigate to **Project Settings** → **API Keys**
   - Click **Create Key**
   - Key format: `LIVE_API_KEY:...` (mainnet) or `TEST_API_KEY:...` (testnet)
   - **Copy immediately** — the secret is shown only once

4. **Configure Sandbox**
   - Toggle **Sandbox Mode** in the project settings
   - Sandbox keys prefix: `TEST_API_KEY:`
   - Use sandbox for testnet preview deploys

5. **Set Environment Variables**
   ```
   XRESERVE_API_URL=https://api.circle.com/v1     # production
   XRESERVE_API_URL=https://sandbox.circle.com/v1  # sandbox
   XRESERVE_API_KEY=TEST_API_KEY:xxxxx             # your key
   XRESERVE_ENV=sandbox                             # or 'production'
   ```

### Notes
- Rate limit: 100 req/min (free tier)
- Sandbox and production keys are separate
- No KYB required for API access — just account creation

---

## 2. Yellow Card — NGN Payout

**Type:** Full business onboarding — requires KYB, AML screening, and legal agreement.

### Timeline
| Phase | Duration | What Happens |
|-------|----------|--------------|
| Intro call | 1–2 days | Schedule at yellowcard.io/contact |
| KYB submission | 1–3 weeks | Document review, AML/sanctions screening |
| Sandbox access | Immediate after KYB | Test API keys issued |
| Production access | After legal agreement | Live API keys issued |

### Required Documents (Nigeria entity)
- Certificate of Incorporation (CAC)
- Tax Identification Number (TIN)
- UBO (Ultimate Beneficial Owner) identification
- 6 months of bank statements
- Proof of address (utility bill)

### Steps

1. **Contact Yellow Card**
   - Go to [yellowcard.io/contact](https://yellowcard.io/contact)
   - Request API integration for NGN payouts
   - Mention you need bank transfer API (not just wallet)

2. **Submit KYB Documents**
   - Yellow Card will send a KYB form
   - Upload all required documents
   - AML/sanctions screening (1–3 weeks)

3. **Receive Sandbox Keys**
   - After KYB approval, Yellow Card issues sandbox credentials:
     - API Key
     - Secret Key (for HMAC signing)
   - Sandbox base URL: `https://sandbox-api.yellowcard.io/business`

4. **Test in Sandbox**
   - Run test payouts to sandbox bank accounts
   - Verify webhook signatures with secret key
   - Confirm HMAC auth works

5. **Sign Legal Agreement**
   - Yellow Card sends service agreement
   - Review and sign
   - Production keys issued after signing

6. **Set Environment Variables**
   ```
   YELLOW_CARD_API_URL=https://api.yellowcard.io/business    # production
   YELLOW_CARD_API_URL=https://sandbox-api.yellowcard.io/business  # sandbox
   YELLOW_CARD_API_KEY=your-api-key
   YELLOW_CARD_SECRET_KEY=your-secret-key   # for YcHmacV1 auth
   YELLOW_CARD_ENV=production               # or 'sandbox'
   YELLOW_CARD_WEBHOOK_SECRET=your-webhook-secret
   ```

### Auth Scheme
Yellow Card uses **YcHmacV1** — not Bearer tokens.

```
Authorization: YcHmacV1 {"timestamp":"...","apiKey":"...","bodyHash":"...","signature":"..."}
```

Signature = `HMAC-SHA256(secret, timestamp + apiKey + SHA256(body))`

The adapter in `yellowcardAdapter.js` handles this automatically.

---

## 3. Vercel Deployment

### Testnet Preview (Recommended for MVP)
Set these in Vercel → `cine-x-api` → Settings → Environment Variables → **Preview** scope:

| Variable | Value |
|----------|-------|
| `STACKS_NETWORK` | `testnet` |
| `XRESERVE_ENV` | `sandbox` |
| `XRESERVE_API_URL` | `https://sandbox.circle.com/v1` |
| `XRESERVE_API_KEY` | *(from step 1)* |
| `YELLOW_CARD_ENV` | `sandbox` |
| `YELLOW_CARD_API_URL` | `https://sandbox-api.yellowcard.io/business` |
| `YELLOW_CARD_API_KEY` | *(from step 2)* |
| `YELLOW_CARD_SECRET_KEY` | *(from step 2)* |

Preview deploys get unique URLs (e.g. `cine-x-api-git-branch-name.vercel.app`) and automatically use testnet + sandbox.

### Production
Set the same variables in **Production** scope with production URLs and keys.

---

## 4. Quick Checklist

- [ ] Circle account created at console.circle.com
- [ ] xReserve sandbox API key obtained
- [ ] xReserve production API key obtained (after testing)
- [ ] Yellow Card intro call scheduled
- [ ] Yellow Card KYB documents submitted
- [ ] Yellow Card sandbox keys received
- [ ] Yellow Card production keys received (after legal)
- [ ] All env vars set in Vercel (Preview scope for testnet)
- [ ] BOS pipeline worker tested with sandbox APIs
