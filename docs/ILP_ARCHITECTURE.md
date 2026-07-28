# Interledger Protocol (ILP) Architecture — CineX

> **Status:** P2 — Conditional on grant confirmation
> **Created:** 2026-07-27
> **Depends on:** §12.1, §12.2 of Engineering Prompt Bible v2

## Overview

This document defines the architecture for integrating Interledger Protocol (ILP) into CineX to enable:
1. **Inbound foreign currency funding** — backers in Nigeria (NGN), Kenya (KES), etc. can fund campaigns in local currency
2. **Outbound disbursement** — creators receive funds via the existing BOS Yellow Card path
3. **Full traceability** — every ILP transfer is logged with cursor, state, and audit trail

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        INBOUND PATH                             │
│                                                                 │
│  Backer (NGN)  ──→  ILP Connector  ──→  xReserve  ──→  USDCx  │
│  (Local Bank)       (ILP Node)        (Attestation)   (Escrow) │
│                                                                 │
│  1. Backer sends NGN via local bank                             │
│  2. ILP connector routes payment to xReserve                    │
│  3. xReserve attests receipt, mints USDCx                       │
│  4. USDCx credited to milestone-escrow campaign                 │
│  5. Campaign state updated: funded                              │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                        OUTBOUND PATH                            │
│                                                                 │
│  Escrow (USDCx)  ──→  BOS Pipeline  ──→  Yellow Card  ──→  NGN │
│  (Milestone)          (Burn → Attest)     (Payout)        (Creator│
│                                                                 │
│  1. Milestone approved → release triggered                      │
│  2. BOS burns USDCx on-chain                                   │
│  3. xReserve confirms burn, attests amount                      │
│  4. Yellow Card initiates NGN payout to creator bank            │
│  5. Creator receives NGN in bank account                        │
└─────────────────────────────────────────────────────────────────┘
```

## Component Responsibilities

### ILP Connector (New)

| Responsibility | Implementation |
|---|---|
| Accept incoming ILP payment | REST endpoint: `POST /api/ilp/inbound` |
| Validate payment receipt | Verify ILP packet hash + amount |
| Route to xReserve | Call xReserve attestation API |
| Update campaign state | Credit USDCx to milestone-escrow |
| Log to feed_events | Insert `ilp_inbound` event |

### xReserve Adapter (Existing)

| Responsibility | Implementation |
|---|---|
| Attest receipt of foreign currency | `POST /api/ilp/attestation` |
| Confirm USDCx mint | Poll `getAttestationStatus()` |
| Return attestation ID | Store in `external_refs` table |

### Escrow Integration (Existing)

| Responsibility | Implementation |
|---|---|
| Accept USDCx credit | `deposit-token` on milestone-escrow |
| Update campaign funded status | `funded-at` field on campaign |
| Emit feed event | `campaign_funded` |

## Database Schema

### `ilp_transfers` Table

```sql
CREATE TABLE IF NOT EXISTS ilp_transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transfer_type TEXT NOT NULL CHECK (transfer_type IN ('inbound', 'outbound')),
  source_currency TEXT NOT NULL,          -- e.g., 'NGN', 'KES', 'USD'
  source_amount NUMERIC NOT NULL,
  target_currency TEXT NOT NULL DEFAULT 'USDCx',
  target_amount NUMERIC,
  ilp_packet_hash TEXT,                   -- ILPv4 packet hash for verification
  ilp_connection_id TEXT,                 -- ILP connection identifier
  source_address TEXT,                    -- Backer's bank/account reference
  target_address TEXT,                    -- Creator's bank/account reference
  campaign_id INTEGER,                   -- Associated campaign
  milestone_id INTEGER,                  -- Associated milestone (if applicable)
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending', 'validating', 'attesting', 'credited', 'failed', 'refunded'
  )),
  attestation_id TEXT,                   -- xReserve attestation reference
  block_height INTEGER,                  -- On-chain block when credited
  tx_id TEXT,                            -- On-chain transaction ID
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ilp_transfers_status ON ilp_transfers(status);
CREATE INDEX IF NOT EXISTS idx_ilp_transfers_campaign ON ilp_transfers(campaign_id);
CREATE INDEX IF NOT EXISTS idx_ilp_transfers_source ON ilp_transfers(source_address);
```

### `ilp_cursor` Table (Resumable Indexing)

```sql
CREATE TABLE IF NOT EXISTS ilp_cursor (
  id TEXT PRIMARY KEY DEFAULT 'default',
  last_processed_at TIMESTAMP DEFAULT NOW(),
  last_transfer_id UUID,
  last_block_height INTEGER DEFAULT 0
);
```

## API Endpoints

### `POST /api/ilp/inbound`

Accept an incoming ILP payment from a backer.

**Request:**
```json
{
  "sourceCurrency": "NGN",
  "sourceAmount": 50000,
  "sourceAddress": "NGN-BANK-12345",
  "ilpPacketHash": "0x...",
  "ilpConnectionId": "conn-abc-123",
  "campaignId": 42
}
```

**Response (201):**
```json
{
  "id": "uuid-here",
  "status": "validating",
  "sourceCurrency": "NGN",
  "sourceAmount": 50000,
  "targetCurrency": "USDCx",
  "estimatedTargetAmount": 30.30,
  "campaignId": 42
}
```

**Flow:**
1. Validate ILP packet hash
2. Insert into `ilp_transfers` with status `validating`
3. Call xReserve `requestAttestation()` → status `attesting`
4. Poll `getAttestationStatus()` → on confirm:
   - Credit USDCx to milestone-escrow via `deposit-token`
   - Update status → `credited`
   - Insert feed event `ilp_inbound`
5. On failure → status `failed`, insert feed event `ilp_failed`

### `GET /api/ilp/transfer/:id`

Get transfer status and details.

### `GET /api/ilp/transfers`

List transfers with filters (campaign_id, status, source_currency).

### `GET /api/ilp/cursor`

Get current indexer cursor position.

## Sequence Diagram — Inbound Funding

```
Backer          ILP Node        xReserve         Escrow          Feed
  │                │                │                │              │
  │──NGN──→        │                │                │              │
  │                │──ILP Packet──→ │                │              │
  │                │                │──Attest──→     │              │
  │                │                │    (mint USDCx)│              │
  │                │                │                │──Deposit──→  │
  │                │                │                │              │──Event──→
  │                │                │                │              │
  │←──Receipt──    │←──Confirm──    │←──Confirmed──  │              │
```

## Error Handling

| Scenario | Handling |
|---|---|
| ILP packet invalid | Reject with 400, log to `ilp_transfers` as `failed` |
| xReserve attestation timeout | Retry 3x with exponential backoff, then mark `failed` |
| Escrow deposit fails | Refund via ILP return path, mark `refunded` |
| Duplicate ILP packet | Idempotent — return existing transfer by `ilp_packet_hash` |

## Security Considerations

1. **ILP Packet Verification** — verify packet hash matches expected amount + recipient
2. **Idempotency** — `ilp_packet_hash` UNIQUE constraint prevents double-credit
3. **Rate Limiting** — max 10 inbound transfers per source address per hour
4. **Audit Trail** — every state change logged to `ilp_transfers` with timestamp
5. **No Direct Bank Access** — CineX never stores bank credentials; ILP connectors handle sensitive data

## Dependencies

| Component | Status | Notes |
|---|---|---|
| ILP Connector | **MISSING** | Needs implementation |
| xReserve Adapter | ✅ EXISTS | `backend/src/services/bos/xreserveAdapter.js` |
| Escrow Integration | ✅ EXISTS | `milestone-escrow.deposit-token` |
| Yellow Card (outbound) | ✅ EXISTS | `backend/src/services/bos/yellowCardAdapter.js` |
| BOS Pipeline | ✅ EXISTS | `backend/src/services/bos/pipelineWorker.js` |

## Implementation Phases

### Phase 1: Architecture Doc (P2 — NOW)
- ✅ This document
- Define schema, endpoints, sequence diagrams

### Phase 2: ILP Connector (P2 — After Grant)
- Implement `POST /api/ilp/inbound`
- Implement `ilp_transfers` table migration
- Wire to xReserve adapter

### Phase 3: Demo Harness (P2 — After Grant)
- Simulated ILP payment flow
- Evidence artifacts for §12.2 deliverables

### Phase 4: Production (P2 — After Pilot)
- Real ILP connector integration
- Live xReserve attestation
- Yellow Card payout confirmation

## Open Questions

1. Which ILP connector will we use? (Evernode, Tilde, custom?)
2. What is the target settlement time for ILP transfers?
3. Do we need to support multi-hop routing (NGN → USD → USDCx)?
4. What are the xReserve fees for attestation?
5. Is there a minimum transfer amount?

---

*This document is the canonical source for ILP architecture decisions. Update as implementation progresses.*
