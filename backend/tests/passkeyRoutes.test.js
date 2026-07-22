import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';

const mockPasskeyTransfer = vi.fn().mockResolvedValue({ txid: '0xmocktxid123' });
const mockGetVaultOwner = vi.fn().mockResolvedValue({ result: { hex: '0xowner' } });
const mockGetVaultInitialized = vi.fn().mockResolvedValue({ result: { hex: '0x01' } });
const mockCheckSponsorship = vi.fn().mockResolvedValue({ decision: 'sponsored', reason: null, transferId: 'test-id' });
const mockGetUserQuota = vi.fn().mockResolvedValue({ used: 0, limit: 20, remaining: 20 });
const mockCheckRelayBalance = vi.fn().mockResolvedValue({ status: 'healthy', balanceStx: 100, alerts: [] });

vi.mock('../src/services/passkeyService.js', () => ({
  init: vi.fn(),
  passkeyTransfer: (...args) => mockPasskeyTransfer(...args),
  getVaultOwner: (...args) => mockGetVaultOwner(...args),
  getVaultInitialized: (...args) => mockGetVaultInitialized(...args),
  confirmTransfer: vi.fn().mockResolvedValue({}),
  failTransfer: vi.fn().mockResolvedValue({}),
}));

vi.mock('../src/services/sponsorService.js', () => ({
  checkSponsorship: (...args) => mockCheckSponsorship(...args),
  getUserQuota: (...args) => mockGetUserQuota(...args),
  recordTransfer: vi.fn().mockResolvedValue({}),
  confirmTransfer: vi.fn().mockResolvedValue({}),
  failTransfer: vi.fn().mockResolvedValue({}),
}));

vi.mock('../src/services/relayMonitor.js', () => ({
  checkRelayBalance: (...args) => mockCheckRelayBalance(...args),
}));

vi.mock('../src/middleware/relayAuth.js', () => ({
  relayAuthMiddleware: () => (req, res, next) => {
    // Simulate authenticated request
    req.relayUserAddress = 'ST1TESTUSER...';
    req.relayAuthMethod = 'test';
    req.relayIdempotencyKey = null;
    req.relayRateLimit = { remaining: 9 };
    next();
  },
}));

import passkeyRouter from '../src/routes/passkey.js';

function createTestApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/passkey', passkeyRouter);
  app.use((err, req, res, next) => {
    const msg = (err && err.message) ? err.message : String(err);
    res.status(500).json({ error: msg });
  });
  return app;
}

function simulatePost(app, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const server = app.listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      const http = require('http');
      const data = JSON.stringify(body);
      const req = http.request(
        `http://127.0.0.1:${port}/api/passkey/transfer`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(data),
            ...headers,
          },
        },
        (res) => {
          let buf = '';
          res.on('data', (chunk) => { buf += chunk; });
          res.on('end', () => {
            server.close();
            try {
              resolve({ status: res.statusCode, body: buf ? JSON.parse(buf) : null });
            } catch {
              resolve({ status: res.statusCode, body: buf });
            }
          });
        }
      );
      req.on('error', (err) => { server.close(); reject(err); });
      req.write(data);
      req.end();
    });
  });
}

function simulateGet(app, path) {
  return new Promise((resolve, reject) => {
    const server = app.listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      const http = require('http');
      http.get(`http://127.0.0.1:${port}${path}`, (res) => {
        let buf = '';
        res.on('data', (chunk) => { buf += chunk; });
        res.on('end', () => {
          server.close();
          try {
            resolve({ status: res.statusCode, body: buf ? JSON.parse(buf) : null });
          } catch {
            resolve({ status: res.statusCode, body: buf });
          }
        });
      }).on('error', (err) => { server.close(); reject(err); });
    });
  });
}

describe('passkey routes', () => {
  let app;

  beforeEach(() => {
    vi.clearAllMocks();
    mockPasskeyTransfer.mockResolvedValue({ txid: '0xmocktxid123' });
    mockGetVaultOwner.mockResolvedValue({ result: { hex: '0xowner' } });
    mockGetVaultInitialized.mockResolvedValue({ result: { hex: '0x01' } });
    mockCheckSponsorship.mockResolvedValue({ decision: 'sponsored', reason: null, transferId: 'test-id' });
    app = createTestApp();
  });

  describe('POST /api/passkey/transfer', () => {
    const validBody = {
      recipient: 'ST2RECIPIENT',
      amount: 1000000,
      authId: 42,
      pubkey: 'aabb',
      signature: 'ccdd',
      authenticatorData: 'eeff',
      clientDataPrefix: '1122',
      clientDataSuffix: '3344',
    };

    it('should return 400 if recipient missing', async () => {
      const result = await simulatePost(app, { ...validBody, recipient: undefined });
      expect(result.status).toBe(400);
      expect(result.body.error).toContain('recipient');
    });

    it('should return 400 if amount is zero', async () => {
      const result = await simulatePost(app, { ...validBody, amount: 0 });
      expect(result.status).toBe(400);
      expect(result.body.error).toContain('amount');
    });

    it('should return 400 if authId is negative', async () => {
      const result = await simulatePost(app, { ...validBody, authId: -1 });
      expect(result.status).toBe(400);
      expect(result.body.error).toContain('authId');
    });

    it('should return 400 if pubkey missing', async () => {
      const result = await simulatePost(app, { ...validBody, pubkey: undefined });
      expect(result.status).toBe(400);
      expect(result.body.error).toContain('pubkey');
    });

    it('should return 400 if signature missing', async () => {
      const result = await simulatePost(app, { ...validBody, signature: undefined });
      expect(result.status).toBe(400);
      expect(result.body.error).toContain('signature');
    });

    it('should return 400 if authenticatorData missing', async () => {
      const result = await simulatePost(app, { ...validBody, authenticatorData: undefined });
      expect(result.status).toBe(400);
      expect(result.body.error).toContain('authenticatorData');
    });

    it('should return 400 if clientDataPrefix missing', async () => {
      const result = await simulatePost(app, { ...validBody, clientDataPrefix: undefined });
      expect(result.status).toBe(400);
      expect(result.body.error).toContain('clientDataPrefix');
    });

    it('should return 400 if clientDataSuffix missing', async () => {
      const result = await simulatePost(app, { ...validBody, clientDataSuffix: undefined });
      expect(result.status).toBe(400);
      expect(result.body.error).toContain('clientDataSuffix');
    });

    it('should call passkeyTransfer with valid params and return txid', async () => {
      const result = await simulatePost(app, validBody);
      expect(result.status).toBe(200);
      expect(result.body.txid).toBe('0xmocktxid123');
    });

    it('should call next (500) on service error', async () => {
      mockPasskeyTransfer.mockRejectedValueOnce(new Error('relay down'));
      const result = await simulatePost(app, validBody);
      expect(result.status).toBe(500);
      expect(result.body.error).toContain('relay down');
    });

    it('should return 403 when sponsorship rejected', async () => {
      mockCheckSponsorship.mockResolvedValueOnce({ decision: 'rejected', reason: 'quota_exceeded', transferId: 'test-id' });
      const result = await simulatePost(app, validBody);
      expect(result.status).toBe(403);
      expect(result.body.reason).toBe('quota_exceeded');
    });

    it('should check sponsorship before transferring', async () => {
      await simulatePost(app, validBody);
      expect(mockCheckSponsorship).toHaveBeenCalledWith(
        expect.objectContaining({
          userAddress: 'ST1TESTUSER...',
          actionType: 'stx-transfer',
          amountMicrostx: 1000000,
        })
      );
    });
  });

  describe('GET /api/passkey/vault-state', () => {
    it('should return owner and initialized state', async () => {
      const result = await simulateGet(app, '/api/passkey/vault-state');
      expect(result.status).toBe(200);
      expect(result.body.owner).toBeDefined();
      expect(result.body.initialized).toBeDefined();
    });

    it('should call next (500) on service error', async () => {
      mockGetVaultOwner.mockRejectedValueOnce(new Error('network error'));
      const result = await simulateGet(app, '/api/passkey/vault-state');
      expect(result.status).toBe(500);
      expect(result.body.error).toContain('network error');
    });
  });

  describe('GET /api/passkey/quota/:address', () => {
    it('should return user quota', async () => {
      const result = await simulateGet(app, '/api/passkey/quota/ST1USER...');
      expect(result.status).toBe(200);
      expect(result.body.used).toBe(0);
      expect(result.body.limit).toBe(20);
    });
  });

  describe('GET /api/passkey/health', () => {
    it('should return relay health', async () => {
      const result = await simulateGet(app, '/api/passkey/health');
      expect(result.status).toBe(200);
      expect(result.body.status).toBe('healthy');
    });
  });
});
