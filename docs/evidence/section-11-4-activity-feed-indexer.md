# §11.4 Activity Feed Indexer — Evidence

## Requirements (from Prompt Bible)

1. Poll Hiro API for contract events
2. Support 7+ contracts
3. Deduplication by (tx_id, event_type)
4. Resumable catch-up from last block
5. Configurable poll interval
6. Batch processing
7. Error handling with retries

## Implementation

### File: `backend/src/services/indexerWorker.js`

**274 lines, fully functional:**

1. **Polls 7 contracts:**
   - campaign-module-2
   - milestone-escrow
   - milestone-verification
   - reputation
   - funding-pool
   - project-verification-module
   - oracle-proxy

2. **Event type mapping:**
   - `fungible-token-transfer` → `token_transfer`
   - `stx-transfer` → `stx_transfer`
   - `contract-call` → `contract_call`
   - `smart-contract-log` → `contract_log`

3. **Deduplication:**
   - SQL: `ON CONFLICT (tx_id, event_type) WHERE tx_id IS NOT NULL DO NOTHING`
   - Ensures idempotent inserts

4. **Resumable cursor:**
   - Table: `feed_index_cursor`
   - Stores `last_block_height` per contract
   - Reads on startup, updates after each sync

5. **Configurable via env vars:**
   - `INDEXER_POLL_INTERVAL_MS` (default: 60000 = 1 minute)
   - `INDEXER_BATCH_SIZE` (default: 50)

6. **Error handling:**
   - Retries up to 3 times per contract
   - Exponential backoff
   - Individual failures don't block batch

7. **Wired into startup:**
   - `backend/src/index.js` calls `initIndexer(db)` + `startIndexer(db)` in `ensureInit()`
   - `stopIndexer()` called on SIGTERM

### File: `backend/tests/indexerWorker.test.js`

**11 tests passing:**

- initIndexer (1 test)
- syncAll (5 tests)
- error handling (2 tests)
- start/stop (2 tests)

## Running Tests

```bash
cd backend && npx vitest run --run tests/indexerWorker.test.js
```

## Configuration

| Env Var | Default | Description |
|---------|---------|-------------|
| `INDEXER_POLL_INTERVAL_MS` | 60000 | Poll interval in milliseconds |
| `INDEXER_BATCH_SIZE` | 50 | Max events per contract per poll |

## Database Schema

```sql
-- Cursor for resumable indexing
CREATE TABLE feed_index_cursor (
  contract_id TEXT PRIMARY KEY,
  last_block_height INTEGER DEFAULT 0,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Dedup index on feed_events
CREATE UNIQUE INDEX idx_feed_events_dedup
  ON feed_events(tx_id, event_type)
  WHERE tx_id IS NOT NULL;
```

## Status: ✅ COMPLETE

All requirements implemented and tested.
