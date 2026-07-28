/**
 * indexerWorker.js — Activity Feed Indexer for CineX contracts.
 *
 * Polls Hiro API for contract events (fungible-token-transfer, stx-transfer,
 * contract-call, smart-contract-log) and inserts deduplicated entries into
 * the feed_events table.
 *
 * Supports:
 *   - Resumable catch-up from last processed block (feed_index_cursor)
 *   - Deduplication by (tx_id, event_type)
 *   - Configurable poll interval and batch size
 */

import { HIRO_API_URL, DEPLOYER_ADDRESS, V2_DEPLOYER_ADDRESS } from '../config/chain.js';

let _timer = null;
let _running = false;

const POLL_INTERVAL_MS = parseInt(process.env.INDEXER_POLL_INTERVAL_MS) || 60_000;
const BATCH_SIZE = parseInt(process.env.INDEXER_BATCH_SIZE) || 50;
const MAX_RETRIES = 3;

// Contracts to index events from
const CONTRACTS = [
  { address: DEPLOYER_ADDRESS, name: 'campaign-module-2', label: 'campaign-module' },
  { address: DEPLOYER_ADDRESS, name: 'milestone-escrow', label: 'milestone-escrow' },
  { address: DEPLOYER_ADDRESS, name: 'milestone-verification', label: 'milestone-verification' },
  { address: DEPLOYER_ADDRESS, name: 'reputation', label: 'reputation' },
  { address: DEPLOYER_ADDRESS, name: 'funding-pool', label: 'funding-pool' },
  { address: DEPLOYER_ADDRESS, name: 'project-verification-module', label: 'verification' },
  { address: DEPLOYER_ADDRESS, name: 'oracle-proxy', label: 'oracle' },
];

// Event type mapping from Hiro API event types to feed_events.event_type
const EVENT_TYPE_MAP = {
  'fungible-token-transfer': 'token_transfer',
  'stx-transfer': 'stx_transfer',
  'contract-call': 'contract_call',
  'smart-contract-log': 'contract_log',
};

/**
 * Initialize the indexer — create cursor table if needed and start polling.
 */
export async function initIndexer(db) {
  // Ensure feed_index_cursor table exists
  await db.run(`
    CREATE TABLE IF NOT EXISTS feed_index_cursor (
      contract_id TEXT PRIMARY KEY,
      last_block_height INTEGER NOT NULL DEFAULT 0,
      last_synced_at INTEGER NOT NULL DEFAULT 0
    )
  `);

  // Ensure feed_events has dedup index
  await db.run(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_feed_events_dedup
    ON feed_events (tx_id, event_type)
    WHERE tx_id IS NOT NULL
  `);

  console.log('[indexer] Initialized — cursor table ready');
}

/**
 * Get last processed block for a contract.
 */
async function getLastBlock(db, contractId) {
  const row = await db.get(
    'SELECT last_block_height FROM feed_index_cursor WHERE contract_id = $1',
    [contractId]
  );
  return row?.last_block_height || 0;
}

/**
 * Update cursor for a contract.
 */
async function updateCursor(db, contractId, blockHeight) {
  const now = Math.floor(Date.now() / 1000);
  await db.run(`
    INSERT INTO feed_index_cursor (contract_id, last_block_height, last_synced_at)
    VALUES ($1, $2, $3)
    ON CONFLICT(contract_id) DO UPDATE SET
      last_block_height = GREATEST(feed_index_cursor.last_block_height, EXCLUDED.last_block_height),
      last_synced_at = EXCLUDED.last_synced_at
  `, [contractId, blockHeight, now]);
}

/**
 * Fetch events for a specific contract from Hiro API.
 */
async function fetchContractEvents(contractAddress, contractName, fromBlock, limit = BATCH_SIZE) {
  const url = `${HIRO_API_URL}/extended/v1/contract/${contractAddress}.${contractName}/events?limit=${limit}&offset=0`;
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`Hiro API ${resp.status}: ${url}`);
  const data = await resp.json();
  return (data.results || []).filter(e => e.block_height > fromBlock);
}

/**
 * Transform a Hiro API event into a feed_events row.
 */
function transformEvent(hiroEvent, contractLabel) {
  const eventType = EVENT_TYPE_MAP[hiroEvent.event_type] || hiroEvent.event_type;
  const actor = extractActor(hiroEvent);
  const eventData = {
    contract: contractLabel,
    function_name: hiroEvent.tx?.contract_call?.function_name || null,
    amount: hiroEvent.value || null,
    asset: hiroEvent.asset_identifier || null,
    sender: hiroEvent.sender || null,
    recipient: hiroEvent.recipient || null,
    raw_event_type: hiroEvent.event_type,
  };

  return {
    event_type: eventType,
    event_data: JSON.stringify(eventData),
    actor,
    pool_id: null,
    campaign_id: extractCampaignId(hiroEvent),
    block_height: hiroEvent.block_height,
    tx_id: hiroEvent.tx?.tx_id || null,
  };
}

/**
 * Extract actor address from event.
 */
function extractActor(hiroEvent) {
  if (hiroEvent.sender) return hiroEvent.sender;
  if (hiroEvent.tx?.sender_address) return hiroEvent.tx.sender_address;
  if (hiroEvent.tx?.sponsor_address) return hiroEvent.tx.sponsor_address;
  return null;
}

/**
 * Extract campaign ID from memo or event data.
 */
function extractCampaignId(hiroEvent) {
  // Try to extract campaign ID from memo (hex-encoded string in memo field)
  const memo = hiroEvent.tx?.memo;
  if (memo) {
    try {
      const decoded = Buffer.from(memo.replace('0x', ''), 'hex').toString('utf-8');
      const match = decoded.match(/campaign[_-]?(\d+)/i);
      if (match) return parseInt(match[1]);
    } catch { /* ignore */ }
  }
  return null;
}

/**
 * Insert events into feed_events with deduplication.
 */
async function insertEvents(db, events) {
  let inserted = 0;
  for (const event of events) {
    try {
      await db.run(`
        INSERT INTO feed_events (event_type, event_data, actor, pool_id, campaign_id, block_height, tx_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT DO NOTHING
      `, [event.event_type, event.event_data, event.actor, event.pool_id, event.campaign_id, event.block_height, event.tx_id]);
      inserted++;
    } catch (err) {
      if (!err.message?.includes('UNIQUE') && !err.message?.includes('duplicate')) {
        console.error(`[indexer] Insert error: ${err.message}`);
      }
    }
  }
  return inserted;
}

/**
 * Sync events for a single contract.
 */
async function syncContract(db, contract) {
  const contractId = `${contract.address}.${contract.name}`;
  const lastBlock = await getLastBlock(db, contractId);

  let retries = 0;
  while (retries < MAX_RETRIES) {
    try {
      const events = await fetchContractEvents(contract.address, contract.name, lastBlock);
      if (events.length === 0) return 0;

      const feedEvents = events.map(e => transformEvent(e, contract.label));
      const inserted = await insertEvents(db, feedEvents);

      // Update cursor to highest block
      const maxBlock = Math.max(...events.map(e => e.block_height));
      await updateCursor(db, contractId, maxBlock);

      if (inserted > 0) {
        console.log(`[indexer] ${contract.label}: ${inserted} new events (block ${lastBlock} → ${maxBlock})`);
      }
      return inserted;
    } catch (err) {
      retries++;
      if (retries >= MAX_RETRIES) {
        console.error(`[indexer] ${contract.label}: failed after ${MAX_RETRIES} retries: ${err.message}`);
        return 0;
      }
      await new Promise(r => setTimeout(r, 1000 * retries));
    }
  }
  return 0;
}

/**
 * Run one sync cycle across all contracts.
 */
export async function syncAll(db) {
  if (_running) {
    console.log('[indexer] Sync already in progress, skipping');
    return;
  }

  _running = true;
  let totalInserted = 0;

  try {
    for (const contract of CONTRACTS) {
      const count = await syncContract(db, contract);
      totalInserted += count;
    }
    if (totalInserted > 0) {
      console.log(`[indexer] Cycle complete: ${totalInserted} total events`);
    }
  } catch (err) {
    console.error(`[indexer] Sync cycle error: ${err.message}`);
  } finally {
    _running = false;
  }
}

/**
 * Start the indexer polling loop.
 */
export function startIndexer(db) {
  if (_timer) {
    console.log('[indexer] Already running');
    return;
  }

  console.log(`[indexer] Starting poll loop (interval: ${POLL_INTERVAL_MS}ms, batch: ${BATCH_SIZE})`);

  // Run immediately on start
  syncAll(db).catch(err => console.error(`[indexer] Initial sync error: ${err.message}`));

  _timer = setInterval(() => {
    syncAll(db).catch(err => console.error(`[indexer] Sync error: ${err.message}`));
  }, POLL_INTERVAL_MS);
}

/**
 * Stop the indexer polling loop.
 */
export function stopIndexer() {
  if (_timer) {
    clearInterval(_timer);
    _timer = null;
    console.log('[indexer] Stopped');
  }
}

export default {
  initIndexer,
  syncAll,
  startIndexer,
  stopIndexer,
};
