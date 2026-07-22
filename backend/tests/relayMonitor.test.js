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

// Mock fetch
global.fetch = vi.fn();

describe('relayMonitor', () => {
  let relayMonitor;
  const ORIGINAL_ENV = { ...process.env };

  const defaultConfig = [
    { key: 'min_balance_stx', value: '50' },
    { key: 'critical_balance_stx', value: '10' },
    { key: 'circuit_breaker', value: 'false' },
    { key: 'hourly_rate_limit', value: '10' },
  ];

  beforeEach(async () => {
    vi.resetModules();
    vi.clearAllMocks();
    process.env = { ...ORIGINAL_ENV, RELAY_ADDRESS: 'ST1RELAY...' };

    // Default config
    mockDb.all.mockResolvedValue([...defaultConfig]);
    // Default: healthy volume
    mockDb.get.mockResolvedValue({ cnt: 2 });

    relayMonitor = await import('../src/services/relayMonitor.js');
  });

  afterEach(() => {
    process.env = ORIGINAL_ENV;
    vi.restoreAllMocks();
  });

  describe('getRelayBalance', () => {
    it('should return relay wallet balance', async () => {
      const balanceHex = '0x' + BigInt(100 * 1e6).toString(16);
      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({ balance: balanceHex }),
      });
      const result = await relayMonitor.getRelayBalance();
      expect(result.balanceStx).toBe(100);
      expect(result.address).toBe('ST1RELAY...');
    });

    it('should throw when RELAY_ADDRESS is not set', async () => {
      delete process.env.RELAY_ADDRESS;
      await expect(relayMonitor.getRelayBalance()).rejects.toThrow('RELAY_ADDRESS');
    });

    it('should throw on Hiro API failure', async () => {
      global.fetch.mockResolvedValue({ ok: false, status: 500 });
      await expect(relayMonitor.getRelayBalance()).rejects.toThrow('Hiro API 500');
    });
  });

  describe('checkRelayBalance', () => {
    it('should return healthy when balance is above threshold', async () => {
      const balanceHex = '0x' + BigInt(100 * 1e6).toString(16);
      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({ balance: balanceHex }),
      });
      const result = await relayMonitor.checkRelayBalance();
      expect(result.status).toBe('healthy');
      expect(result.alerts).toHaveLength(0);
    });

    it('should return warning when balance is below minimum', async () => {
      const balanceHex = '0x' + BigInt(30 * 1e6).toString(16); // 30 STX < 50
      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({ balance: balanceHex }),
      });
      const result = await relayMonitor.checkRelayBalance();
      expect(result.status).toBe('degraded');
      expect(result.alerts.some(a => a.type === 'relay_balance_low')).toBe(true);
    });

    it('should return critical when balance is below critical threshold', async () => {
      const balanceHex = '0x' + BigInt(5 * 1e6).toString(16); // 5 STX < 10
      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({ balance: balanceHex }),
      });
      const result = await relayMonitor.checkRelayBalance();
      expect(result.status).toBe('critical');
      expect(result.alerts.some(a => a.type === 'relay_balance_critical')).toBe(true);
    });

    it('should include circuit breaker alert when active', async () => {
      mockDb.all.mockResolvedValue([
        { key: 'min_balance_stx', value: '50' },
        { key: 'critical_balance_stx', value: '10' },
        { key: 'circuit_breaker', value: 'true' },
        { key: 'hourly_rate_limit', value: '10' },
      ]);
      const balanceHex = '0x' + BigInt(100 * 1e6).toString(16);
      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({ balance: balanceHex }),
      });
      const result = await relayMonitor.checkRelayBalance();
      expect(result.alerts.some(a => a.type === 'circuit_breaker_active')).toBe(true);
    });

    it('should alert on high hourly volume', async () => {
      mockDb.get.mockResolvedValue({ cnt: 9 }); // 9/10 = 90% > 80%
      const balanceHex = '0x' + BigInt(100 * 1e6).toString(16);
      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({ balance: balanceHex }),
      });
      const result = await relayMonitor.checkRelayBalance();
      expect(result.alerts.some(a => a.type === 'high_hourly_volume')).toBe(true);
    });
  });

  describe('persistAlert', () => {
    it('should insert alert when none exists', async () => {
      mockDb.get.mockResolvedValue(null); // no existing alert
      await relayMonitor.persistAlert({
        alertKey: 'relay_test',
        alertType: 'test',
        severity: 'warning',
        details: { message: 'test' },
      });
      expect(mockDb.run).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO bos_alerts'),
        expect.arrayContaining(['relay_test'])
      );
    });

    it('should dedup existing unacknowledged alert', async () => {
      mockDb.get.mockResolvedValue({ id: 1 }); // existing alert
      await relayMonitor.persistAlert({
        alertKey: 'relay_test',
        alertType: 'test',
        severity: 'warning',
        details: { message: 'test' },
      });
      expect(mockDb.run).not.toHaveBeenCalled();
    });
  });

  describe('runHealthCheck', () => {
    it('should return healthy result', async () => {
      const balanceHex = '0x' + BigInt(100 * 1e6).toString(16);
      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({ balance: balanceHex }),
      });
      const result = await relayMonitor.runHealthCheck();
      expect(result.status).toBe('healthy');
    });

    it('should handle errors gracefully', async () => {
      global.fetch.mockRejectedValue(new Error('network error'));
      const result = await relayMonitor.runHealthCheck();
      expect(result.status).toBe('error');
      expect(result.alerts[0].severity).toBe('critical');
    });
  });
});
