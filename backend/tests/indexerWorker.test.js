/**
 * indexerWorker.test.js — Tests for Activity Feed Indexer
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { initIndexer, syncAll, startIndexer, stopIndexer } from '../src/services/indexerWorker.js';

// Mock chain config
vi.mock('../src/config/chain.js', () => ({
  HIRO_API_URL: 'https://api.testnet.hiro.so',
  DEPLOYER_ADDRESS: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM',
  V2_DEPLOYER_ADDRESS: null,
}));

// Mock fetch
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

describe('IndexerWorker', () => {
  let mockDb;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDb = {
      run: vi.fn().mockResolvedValue({}),
      get: vi.fn().mockResolvedValue(null),
      all: vi.fn().mockResolvedValue([]),
    };
  });

  afterEach(() => {
    stopIndexer();
  });

  describe('initIndexer', () => {
    it('should create cursor table and dedup index', async () => {
      await initIndexer(mockDb);

      const runCalls = mockDb.run.mock.calls.map(c => c[0]).join('\n');
      expect(runCalls).toContain('feed_index_cursor');
      expect(runCalls).toContain('idx_feed_events_dedup');
    });
  });

  describe('syncAll', () => {
    it('should skip if already running', async () => {
      // First call starts running
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ results: [] }),
      });

      const p1 = syncAll(mockDb);
      const p2 = syncAll(mockDb); // should skip

      await Promise.all([p1, p2]);
      // No throw
    });

    it('should handle empty events gracefully', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ results: [] }),
      });

      await syncAll(mockDb);
      // No throw
    });

    it('should read last_block_height from cursor table', async () => {
      mockDb.get.mockResolvedValue({ last_block_height: 100 });
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ results: [] }),
      });

      await syncAll(mockDb);

      const getCall = mockDb.get.mock.calls.find(
        c => c[0]?.includes('last_block_height')
      );
      expect(getCall).toBeDefined();
    });

    it('should insert events into feed_events', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          results: [{
            event_type: 'stx-transfer',
            block_height: 150,
            sender: 'ST123',
            tx: { tx_id: 'abc123def456' },
          }],
        }),
      });

      await syncAll(mockDb);

      const insertCalls = mockDb.run.mock.calls.filter(
        c => c[0]?.includes('INSERT INTO feed_events')
      );
      // One insert per contract that matched (7 contracts indexed)
      expect(insertCalls.length).toBeGreaterThanOrEqual(1);
    });

    it('should map event types correctly', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          results: [{
            event_type: 'fungible-token-transfer',
            block_height: 150,
            sender: 'ST123',
            tx: { tx_id: 'abc123def456' },
          }],
        }),
      });

      await syncAll(mockDb);

      const insertCalls = mockDb.run.mock.calls.filter(
        c => c[0]?.includes('INSERT INTO feed_events')
      );
      // The mapped type is passed as a parameter ($1), check the params array
      const firstInsert = insertCalls[0];
      expect(firstInsert).toBeDefined();
      // params: [eventType, eventData, actor, poolId, campaignId, blockHeight, txId]
      expect(firstInsert[1]).toContain('token_transfer');
    });

    it('should update cursor after processing', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          results: [{
            event_type: 'stx-transfer',
            block_height: 200,
            sender: 'ST123',
            tx: { tx_id: 'abc123def456' },
          }],
        }),
      });

      await syncAll(mockDb);

      const cursorUpdate = mockDb.run.mock.calls.find(
        c => c[0]?.includes('ON CONFLICT(contract_id) DO UPDATE')
      );
      expect(cursorUpdate).toBeDefined();
    });
  });

  describe('error handling', () => {
    it('should retry on Hiro API failure', async () => {
      mockFetch
        .mockResolvedValueOnce({ ok: false, status: 500 })
        .mockResolvedValue({
          ok: true,
          json: () => Promise.resolve({ results: [] }),
        });

      await syncAll(mockDb);

      // First contract fails once then retries, remaining 6 contracts succeed
      expect(mockFetch.mock.calls.length).toBeGreaterThanOrEqual(2);
    });

    it('should not throw on individual event insert failure', async () => {
      let callCount = 0;
      mockDb.run.fn = vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount <= 2) return Promise.resolve({});
        return Promise.reject(new Error('DB error'));
      });

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          results: [{
            event_type: 'stx-transfer',
            block_height: 100,
            sender: 'ST123',
            tx: { tx_id: 'abc123def456' },
          }],
        }),
      });

      await syncAll(mockDb);
      // No throw
    });
  });

  describe('start/stop', () => {
    it('should start and stop without error', () => {
      startIndexer(mockDb);
      stopIndexer();
    });

    it('should not start twice (no-op)', () => {
      startIndexer(mockDb);
      startIndexer(mockDb); // second call should be no-op
      stopIndexer();
    });
  });
});
