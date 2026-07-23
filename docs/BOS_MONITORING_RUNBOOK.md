# BOS Monitoring Runbook

Responder guide for CineX BOS (Bridge Orchestration Service) monitoring alerts.

## Table of Contents
1. [burn_timeout](#burn_timeout)
2. [attestation_timeout](#attestation_timeout)
3. [destination_release_failure](#destination_release_failure)
4. [yellowcard_api_failure](#yellowcard_api_failure)
5. [webhook_timeout](#webhook_timeout)
6. [stuck_in_state](#stuck_in_state)
7. [rate_stale](#rate_stale)

---

## burn_timeout

**Severity:** Critical
**Threshold:** 10 minutes (burn not confirmed)
**Reaper:** 2x SLA = 20 minutes

### What it means
A Bitcoin burn transaction was submitted but has not been confirmed on-chain within the SLA. The BTC network may be congested, or the transaction may have been broadcast to a congested mempool.

### Immediate actions
1. Check the disbursement status via `GET /api/bos/monitoring/disbursement/:id/timeline`
2. Verify the Bitcoin transaction ID exists in the mempool or on-chain
3. If txid is in mempool → wait (BTC blocks are ~10 min)
4. If txid is missing → check the `relay_wallet_activity` table for the burn attempt

### Resolution
- If the burn confirms → monitor will auto-transition to `burn_confirmed`
- If the burn is stuck in mempool → may need to RBF (replace-by-fee) the transaction
- If the burn never happened → investigate the `disbursement_audit` log for the initiation entry

### Escalation
- If stuck >30 minutes → escalate to Theophilus with disbursement ID and txid
- If no txid found → check `relay_wallet_activity` for wallet key issues

---

## attestation_timeout

**Severity:** Critical
**Threshold:** 15 minutes (attestation not received after burn confirmed)
**Reaper:** 2x SLA = 30 minutes

### What it means
The burn has been confirmed on Bitcoin, but xReserve has not returned an attestation within the SLA. This could indicate xReserve API issues, network problems, or the attestation relay being down.

### Immediate actions
1. Check `GET /api/bos/monitoring/disbursement/:id/timeline` for burn_confirmed timestamp
2. Verify xReserve API health: `curl https://api.xreserve.io/health`
3. Check `external_refs` table for any attestation references
4. Check `on_chain_events` for any Stacks-side events

### Resolution
- If xReserve is temporarily down → wait and re-check in 15 minutes
- If xReserve returns an error → check the error code and follow xReserve docs
- If attestation was received but not recorded → check `disbursement_audit` for gaps

### Escalation
- If xReserve is down for >30 minutes → escalate to Theophilus
- If attestation never arrives → consider manually cancelling the disbursement

---

## destination_release_failure

**Severity:** Critical
**Threshold:** 60 minutes (release not completed after attestation)
**Reaper:** 2x SLA = 120 minutes

### What it means
The xReserve attestation was received, but the Yellow Card payout has not been completed within the SLA. This is the most critical failure point as it means the creator has not received their NGN funds.

### Immediate actions
1. Check `GET /api/bos/monitoring/disbursement/:id/timeline` for attestation_received timestamp
2. Verify Yellow Card API health: `curl https://api.yellowcard.io/api/v1/health`
3. Check `external_status_snapshots` for Yellow Card status updates
4. Check `yellow_card_webhook_events` for any callback data

### Resolution
- If Yellow Card API is down → wait and re-check; payout may complete once API recovers
- If Yellow Card returns an error → check the error code; may need to retry or use fallback
- If webhook was received but not processed → check `yellow_card_webhook_events` table

### Escalation
- If Yellow Card is down for >1 hour → escalate to Theophilus and Yellow Card support
- If payout fails permanently → check `manual_review_queue` for manual intervention

---

## yellowcard_api_failure

**Severity:** Critical
**Threshold:** 15 minutes (Yellow Card API unreachable)
**Reaper:** 2x SLA = 30 minutes

### What it means
The Yellow Card API is unreachable or returning errors. This blocks all outgoing NGN payouts.

### Immediate actions
1. Check Yellow Card status page: `https://status.yellowcard.io`
2. Verify API key validity: `YELLOW_CARD_API_KEY` env var
3. Check if the failure is auth-related (401/403) vs network-related (timeout/5xx)

### Resolution
- If auth error → rotate API key via Yellow Card dashboard
- If network error → wait and re-check; Yellow Card may be doing maintenance
- If rate limited → check request volume; may need to back off

### Escalation
- If down for >30 minutes → contact Yellow Card support
- If API key is invalid → rotate immediately and notify Theophilus

---

## webhook_timeout

**Severity:** Warning
**Threshold:** 15 minutes (webhook not received after payout submitted)
**Reaper:** 2x SLA = 30 minutes

### What it means
A payout was submitted to Yellow Card, but the callback webhook has not been received. The payout may still be processing.

### Immediate actions
1. Check `GET /api/bos/monitoring/disbursement/:id/timeline` for payout_submitted timestamp
2. Check `yellow_card_webhook_events` for any incoming webhooks
3. Verify Yellow Card webhook URL is correctly configured
4. Check if the webhook endpoint is reachable from the internet

### Resolution
- If webhook arrives → monitor will auto-transition to `settled` or `failed`
- If webhook is delayed → Yellow Card may be experiencing high volume
- If webhook never arrives → check Yellow Card dashboard for transaction status

### Escalation
- If webhook is delayed >30 minutes → check Yellow Card dashboard manually
- If payout status is unknown → contact Yellow Card support with the payout reference

---

## stuck_in_state

**Severity:** Warning (critical for non-manual_review states)
**Threshold:** 30 minutes (any non-terminal state)
**Reaper:** 2x SLA = 60 minutes (7x = 210 minutes for manual_review)

### What it means
A disbursement has been in the same non-terminal state for longer than expected. This could indicate a process failure or a stuck transaction.

### Immediate actions
1. Check `GET /api/bos/monitoring/disbursement/:id/timeline` for full lifecycle
2. Identify which state it's stuck in and the duration
3. Check `disbursement_audit` for any error entries
4. Check `bos_alerts` for any related alerts

### Resolution
- If stuck in `initiated` → check if burn was attempted (see burn_timeout)
- If stuck in `burn_submitted` → check BTC mempool (see burn_timeout)
- If stuck in `burn_confirmed` → check xReserve attestation (see attestation_timeout)
- If stuck in `attestation_received` → check Yellow Card payout (see destination_release_failure)
- If stuck in `payout_submitted` → check webhook (see webhook_timeout)
- If stuck in `manual_review` → human must manually resolve; check `manual_review_queue`

### Escalation
- If stuck >1 hour → escalate to Theophilus with disbursement ID and stuck state
- If stuck in `manual_review` >3.5 hours (7x SLA) → escalate to Theophilus immediately

---

## rate_stale

**Severity:** Warning
**Threshold:** 5 minutes (exchange rate older than 5 minutes)
**Reaper:** N/A (continuous check)

### What it means
The USDCx/NGN exchange rate in the `exchange_rates` table is older than 5 minutes. New disbursements may use incorrect NGN amounts.

### Immediate actions
1. Check `exchange_rates` table for the last update timestamp
2. Verify the exchange rate provider is accessible
3. Check if the rate update cron job is running

### Resolution
- If rate provider is down → wait and re-check; may be temporary
- If rate update job is stuck → restart the rate update process
- If rate is stale but provider is up → check for errors in rate update logs

### Escalation
- If rate is stale >15 minutes → escalate to Theophilus
- If rate provider is permanently down → may need to switch to fallback provider

---

## Common Dashboard Queries

### Check all active disbursements
```
GET /api/bos/monitoring/active?limit=50
```

### Check pipeline summary
```
GET /api/bos/monitoring/pipeline
```

### Check unacknowledged alerts
```
GET /api/bos/monitoring/alerts
```

### Check alert statistics
```
GET /api/bos/monitoring/alerts/stats?since=3600000
```

### Check disbursement timeline
```
GET /api/bos/monitoring/disbursement/:id/timeline
```

### Check manual review queue
```
GET /api/bos/monitoring/manual-review
```

### Manually trigger monitor check
```
POST /api/bos/monitoring/run
```

### Acknowledge an alert
```
POST /api/bos/monitoring/alerts/:id/acknowledge
```

---

## Environment Variables

| Variable | Description | Required |
|---|---|---|
| `SLACK_BOS_WEBHOOK_URL` | Slack webhook for BOS alerts | No |
| `BOS_ALERT_EMAIL_RECIPIENTS` | Comma-separated email recipients | No |
| `SMTP_USER` | Gmail SMTP user for email alerts | No |
| `SMTP_PASS` | Gmail SMTP password for email alerts | No |
| `DATABASE_URL` | Neon PostgreSQL connection string | Yes |
| `YELLOW_CARD_API_KEY` | Yellow Card API key | Yes (for payout) |
| `YELLOW_CARD_SECRET_KEY` | Yellow Card secret key | Yes (for payout) |
| `YELLOW_CARD_ENV` | `sandbox` or `production` | Yes (for payout) |
| `XRESERVE_API_URL` | xReserve API base URL | Yes (for attestation) |

---

## Escalation Contacts

- **Theophilus** — Project lead, handles manual review queue and Yellow Card support
- **Yellow Card Support** — For API issues and payout failures
- **xReserve Support** — For attestation issues
