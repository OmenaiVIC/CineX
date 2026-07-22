import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  checkHourlyRateLimit,
  validateAuth,
  validateIdempotencyKey,
} from '../src/middleware/relayAuth.js';

describe('relayAuth', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('validateAuth', () => {
    it('should accept valid session auth', () => {
      const req = { user: { address: 'ST1USER...' }, headers: {} };
      const result = validateAuth(req);
      expect(result.valid).toBe(true);
      expect(result.address).toBe('ST1USER...');
      expect(result.authMethod).toBe('session');
    });

    it('should reject when no user and no API key', () => {
      const req = { headers: {} };
      const result = validateAuth(req);
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('Authentication required');
    });

    it('should accept valid API key with user address header', () => {
      process.env.RELAY_API_KEY = 'test-api-key-123';
      const req = {
        headers: {
          'x-relay-api-key': 'test-api-key-123',
          'x-relay-user-address': 'ST1APIUSER...',
        },
      };
      const result = validateAuth(req);
      expect(result.valid).toBe(true);
      expect(result.address).toBe('ST1APIUSER...');
      expect(result.authMethod).toBe('api_key');
      delete process.env.RELAY_API_KEY;
    });

    it('should reject API key without user address header', () => {
      process.env.RELAY_API_KEY = 'test-api-key-123';
      const req = {
        headers: { 'x-relay-api-key': 'test-api-key-123' },
      };
      const result = validateAuth(req);
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('X-Relay-User-Address');
      delete process.env.RELAY_API_KEY;
    });

    it('should reject wrong API key', () => {
      process.env.RELAY_API_KEY = 'correct-key';
      const req = {
        headers: {
          'x-relay-api-key': 'wrong-key',
          'x-relay-user-address': 'ST1USER...',
        },
      };
      const result = validateAuth(req);
      expect(result.valid).toBe(false);
      delete process.env.RELAY_API_KEY;
    });

    it('should prefer session auth over API key', () => {
      process.env.RELAY_API_KEY = 'test-key';
      const req = {
        user: { address: 'ST1SESSIONUSER...' },
        headers: {
          'x-relay-api-key': 'test-key',
          'x-relay-user-address': 'ST1APIUSER...',
        },
      };
      const result = validateAuth(req);
      expect(result.authMethod).toBe('session');
      expect(result.address).toBe('ST1SESSIONUSER...');
      delete process.env.RELAY_API_KEY;
    });
  });

  describe('validateIdempotencyKey', () => {
    it('should accept valid UUID', () => {
      const result = validateIdempotencyKey('550e8400-e29b-41d4-a716-446655440000');
      expect(result.valid).toBe(true);
    });

    it('should accept null (optional)', () => {
      const result = validateIdempotencyKey(null);
      expect(result.valid).toBe(true);
    });

    it('should reject non-UUID string', () => {
      const result = validateIdempotencyKey('not-a-uuid');
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('UUID');
    });

    it('should reject uppercase UUID', () => {
      const result = validateIdempotencyKey('550E8400-E29B-41D4-A716-446655440000');
      expect(result.valid).toBe(false);
    });
  });

  describe('checkHourlyRateLimit', () => {
    it('should allow first request', () => {
      const result = checkHourlyRateLimit('ST1USER...');
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(9);
    });

    it('should block after limit reached', () => {
      for (let i = 0; i < 10; i++) checkHourlyRateLimit('ST1LIMITUSER...');
      const result = checkHourlyRateLimit('ST1LIMITUSER...');
      expect(result.allowed).toBe(false);
      expect(result.retryAfter).toBeGreaterThan(0);
    });

    it('should track different users independently', () => {
      for (let i = 0; i < 10; i++) checkHourlyRateLimit('ST1USER_A...');
      const resultA = checkHourlyRateLimit('ST1USER_A...');
      const resultB = checkHourlyRateLimit('ST1USER_B...');
      expect(resultA.allowed).toBe(false);
      expect(resultB.allowed).toBe(true);
    });
  });
});
