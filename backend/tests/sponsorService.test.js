import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock database module
const mockDb = {
  get: vi.fn(),
  all: vi.fn(),
  run: vi.fn(),
  release: vi.fn(),
};
vi.mock('../src/database.js', () => ({
  getDb: vi.fn().mockResolvedValue(mockDb),
}));

// Mock fetch for relay balance check
global.fetch = vi.fn();

describe('sponsorService', () => {
  let sponsorService;
  const ORIGINAL_ENV = { ...process.env };

  const defaultConfig = [
    { key: 'daily_cap', value: '20' },
    { key: 'hourly_rate_limit', value: '10' },
    { key: 'min_balance_stx', value: '50' },
    { key: 'critical_balance_stx', value: '10' },
    { key: 'max_single_transfer_stx', value: '10' },
    { key: 'circuit_breaker', value: 'false' },
    { key: 'sponsorable_actions', value: 'stx-transfer,onboard,recovery' },
  ];

  beforeEach(async () => {
    vi.resetModules();
    vi.clearAllMocks();
    process.env = { ...ORIGINAL_ENV, RELAY_ADDRESS: 'ST1RELAY...' };

    // Default config
    mockDb.all.mockResolvedValue([...defaultConfig]);
    // Default: no existing idempotency
    mockDb.get.mockResolvedValue(null);
    // Default: insert succeeds
    mockDb.run.mockResolvedValue({ rows: [{ id: 'test-transfer-id' }] });

    // Default: relay balance ok (100 STX in hex)
    const balanceHex = '0x' + BigInt(100 * 1e6).toString(16);
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ balance: balanceHex }),
    });

    sponsorService = await import('../src/services/sponsorService.js');
    // Clear config cache between tests
    sponsorService.clearConfigCache();
  });

  afterEach(() => {
    process.env = ORIGINAL_ENV;
    vi.restoreAllMocks();
  });

  describe('checkSponsorship', () => {
    it('should sponsor a valid stx-transfer', async () => {
      const result = await sponsorService.checkSponsorship({
        userAddress: 'ST1USER...',
        actionType: 'stx-transfer',
        amountMicrostx: 1000000,
      });
      expect(result.decision).toBe('sponsored');
      expect(result.reason).toBeNull();
      expect(result.transferId).toBe('test-transfer-id');
    });

    it('should reject when circuit breaker is active', async () => {
      mockDb.all.mockResolvedValue([
        { key: 'circuit_breaker', value: 'true' },
        { key: 'sponsorable_actions', value: 'stx-transfer,onboard,recovery' },
        { key: 'daily_cap', value: '20' },
        { key: 'max_single_transfer_stx', value: '10' },
        { key: 'min_balance_stx', value: '50' },
      ]);
      sponsorService.clearConfigCache();
      const result = await sponsorService.checkSponsorship({
        userAddress: 'ST1USER...',
        actionType: 'stx-transfer',
        amountMicrostx: 1000000,
      });
      expect(result.decision).toBe('rejected');
      expect(result.reason).toBe('circuit_breaker');
    });

    it('should reject when action type is not sponsorable', async () => {
      const result = await sponsorService.checkSponsorship({
        userAddress: 'ST1USER...',
        actionType: 'bulk-transfer',
        amountMicrostx: 1000000,
      });
      expect(result.decision).toBe('rejected');
      expect(result.reason).toBe('action_not_sponsored');
    });

    it('should reject when amount exceeds max single transfer', async () => {
      const result = await sponsorService.checkSponsorship({
        userAddress: 'ST1USER...',
        actionType: 'stx-transfer',
        amountMicrostx: 20 * 1e6, // 20 STX > 10 STX limit
      });
      expect(result.decision).toBe('rejected');
      expect(result.reason).toBe('amount_too_high');
    });

    it('should reject when daily quota exceeded', async () => {
      // Return existing quota at limit
      mockDb.get.mockResolvedValue({ transfer_count: 20 });
      const result = await sponsorService.checkSponsorship({
        userAddress: 'ST1USER...',
        actionType: 'stx-transfer',
        amountMicrostx: 1000000,
      });
      expect(result.decision).toBe('rejected');
      expect(result.reason).toBe('quota_exceeded');
    });

    it('should reject when relay balance is low', async () => {
      const balanceHex = '0x' + BigInt(5 * 1e6).toString(16); // 5 STX < 50
      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({ balance: balanceHex }),
      });
      const result = await sponsorService.checkSponsorship({
        userAddress: 'ST1USER...',
        actionType: 'stx-transfer',
        amountMicrostx: 1000000,
      });
      expect(result.decision).toBe('rejected');
      expect(result.reason).toBe('balance_low');
    });

    it('should return cached result for duplicate idempotency key', async () => {
      mockDb.get.mockResolvedValueOnce({
        id: 'existing-id',
        status: 'confirmed',
        tx_hash: '0xabcdef',
        rejection_reason: null,
      });
      const result = await sponsorService.checkSponsorship({
        userAddress: 'ST1USER...',
        actionType: 'stx-transfer',
        amountMicrostx: 1000000,
        idempotencyKey: '550e8400-e29b-41d4-a716-446655440000',
      });
      expect(result.cached).toBe(true);
      expect(result.txHash).toBe('0xabcdef');
    });

    it('should log every decision to relay_transfers', async () => {
      await sponsorService.checkSponsorship({
        userAddress: 'ST1USER...',
        actionType: 'stx-transfer',
        amountMicrostx: 1000000,
        requestIp: '127.0.0.1',
        userAgent: 'test-agent',
      });
      expect(mockDb.run).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO relay_transfers'),
        expect.arrayContaining(['ST1USER...'])
      );
    });
  });

  describe('recordTransfer', () => {
    it('should upsert daily quota', async () => {
      await sponsorService.recordTransfer({
        userAddress: 'ST1USER...',
        amountMicrostx: 1000000,
        gasCostStx: 0.1,
        txHash: '0xabc',
        transferId: 'test-id',
      });
      expect(mockDb.run).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO relay_quotas'),
        expect.arrayContaining(['ST1USER...'])
      );
    });
  });

  describe('confirmTransfer', () => {
    it('should update transfer status to confirmed', async () => {
      await sponsorService.confirmTransfer({ transferId: 'test-id', txHash: '0xabc' });
      expect(mockDb.run).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE relay_transfers'),
        ['0xabc', 'test-id']
      );
    });
  });

  describe('getUserQuota', () => {
    it('should return quota with defaults when no records exist', async () => {
      mockDb.get.mockResolvedValue(null);
      const quota = await sponsorService.getUserQuota('ST1USER...');
      expect(quota.used).toBe(0);
      expect(quota.limit).toBe(20);
      expect(quota.remaining).toBe(20);
    });
  });
});
