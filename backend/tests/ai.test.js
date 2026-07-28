/**
 * ai.test.js — Tests for AI Credibility Summary (§11.5)
 *
 * Tests the business logic of the AI summary endpoint.
 * Pure unit tests — no HTTP, no module re-imports.
 */

import { describe, it, expect, vi } from 'vitest';

// ── Mocks ───────────────────────────────────────────────────────────────────

const mockDb = {
  get: vi.fn(),
  all: vi.fn(),
  run: vi.fn().mockResolvedValue({}),
  release: vi.fn(),
};

vi.mock('../src/database.js', () => ({
  getDb: vi.fn(() => Promise.resolve(mockDb)),
}));

// ── Import the module-under-test AFTER mocks ─────────────────────────────────
import aiRouter from '../src/routes/ai.js';
import express from 'express';

// ── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Create an Express app with the AI router mounted.
 */
function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/ai', aiRouter);
  app.use((err, _req, res, _next) => {
    res.status(500).json({ error: err.message || String(err) });
  });
  return app;
}

/**
 * Send a POST request and return { status, body }.
 */
function post(app, path, body) {
  return new Promise((resolve, reject) => {
    const server = app.listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      const http = require('http');
      const data = JSON.stringify(body);
      const opts = {
        hostname: '127.0.0.1',
        port,
        path,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(data),
        },
      };
      const req = http.request(opts, (res) => {
        let raw = '';
        res.on('data', c => (raw += c));
        res.on('end', () => {
          server.close();
          try {
            resolve({ status: res.statusCode, body: JSON.parse(raw) });
          } catch {
            resolve({ status: res.statusCode, body: raw });
          }
        });
      });
      req.on('error', (err) => {
        server.close();
        reject(err);
      });
      req.write(data);
      req.end();
    });
  });
}

// ── Fixtures ────────────────────────────────────────────────────────────────

const PROFILE = {
  address: 'ST1TESTPROFILE123456789012345678901234567890',
  username: 'testcreator',
  bio: 'A test creator.',
  displayName: 'Test Creator',
};

const PORTFOLIO = [
  { title: 'Project Alpha', year: 2025 },
  { title: 'Project Beta', year: 2026 },
];

const CACHED_SUMMARY = {
  address: PROFILE.address,
  summary: 'Cached text.',
  model: 'gpt-4',
  generated_at: Math.floor(Date.now() / 1000) - 3600,
};

// ── Tests ───────────────────────────────────────────────────────────────────

describe('AI Credibility Summary — POST /api/ai/summary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.OPENAI_API_KEY;
  });

  it('returns 400 when address is missing', async () => {
    const app = buildApp();
    const res = await post(app, '/api/ai/summary', {});
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('address required');
  });

  it('returns 429 when rate limit is exceeded (5 requests / hour)', async () => {
    const app = buildApp();
    // Each request with this address consumes one rate-limit slot.
    // Since the rate-limit map is shared globally, we need to use a
    // dedicated address so we don't interfere with other tests.
    const addr = 'STRATELIMIT-' + Date.now();

    // Exhaust the limit (5 requests / window)
    for (let i = 0; i < 5; i++) {
      const r = await post(app, '/api/ai/summary', { address: addr });
      // Don't assert status in the loop — the address doesn't exist
    }
    // 6th should be blocked
    const r = await post(app, '/api/ai/summary', { address: addr });
    expect(r.status).toBe(429);
    expect(r.body).toHaveProperty('retryAfter');
  });

  it('returns 404 when profile does not exist', async () => {
    mockDb.get.mockResolvedValue(null);
    const app = buildApp();
    const res = await post(app, '/api/ai/summary', { address: 'STUNKNOWN...' });
    expect(res.status).toBe(404);
    expect(res.body.error).toContain('Profile not found');
  });

  it('returns fallback summary when OPENAI_API_KEY is not set', async () => {
    mockDb.get.mockResolvedValueOnce(null); // cache miss
    mockDb.get.mockResolvedValueOnce(PROFILE); // profile found
    mockDb.all.mockResolvedValue(PORTFOLIO);

    const app = buildApp();
    const res = await post(app, '/api/ai/summary', { address: PROFILE.address });
    expect(res.status).toBe(200);
    expect(res.body.summary).toContain('portfolio item');
    expect(res.body.model).toBe('fallback');
    expect(res.body.disclaimer).toContain('post-launch');
    expect(mockDb.run).toHaveBeenCalled();
  });

  it('returns cached summary when less than 24h old', async () => {
    mockDb.get.mockResolvedValue(CACHED_SUMMARY);

    const app = buildApp();
    const res = await post(app, '/api/ai/summary', { address: PROFILE.address });
    expect(res.status).toBe(200);
    expect(res.body.summary).toBe('Cached text.');
    expect(res.body.model).toBe('gpt-4');
    expect(mockDb.all).not.toHaveBeenCalled();
  });

  it('returns OpenAI summary when API key is set', async () => {
    process.env.OPENAI_API_KEY = 'sk-test-key';
    mockDb.get.mockResolvedValueOnce(null); // cache miss
    mockDb.get.mockResolvedValueOnce(PROFILE); // profile found
    mockDb.all.mockResolvedValue(PORTFOLIO);

    const origFetch = global.fetch;
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        choices: [{ message: { content: 'Two projects. Consistent quality.' } }],
      }),
    });

    try {
      const app = buildApp();
      const res = await post(app, '/api/ai/summary', { address: PROFILE.address });
      expect(res.status).toBe(200);
      expect(res.body.summary).toContain('projects');
      expect(res.body.model).toBe('gpt-4');
      expect(res.body).toHaveProperty('disclaimer');
      expect(mockDb.run).toHaveBeenCalled();
    } finally {
      global.fetch = origFetch;
    }
  });

  it('returns 500 when OpenAI returns an error', async () => {
    process.env.OPENAI_API_KEY = 'sk-test-key';
    mockDb.get.mockResolvedValueOnce(null);
    mockDb.get.mockResolvedValueOnce(PROFILE);
    mockDb.all.mockResolvedValue(PORTFOLIO);

    const origFetch = global.fetch;
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: () => Promise.resolve({ error: { message: 'bad key' } }),
    });

    try {
      const app = buildApp();
      const res = await post(app, '/api/ai/summary', { address: PROFILE.address });
      expect(res.status).toBe(500);
      expect(res.body.error).toContain('Failed to generate AI summary');
    } finally {
      global.fetch = origFetch;
    }
  });

  it('returns 504 when OpenAI request times out', async () => {
    process.env.OPENAI_API_KEY = 'sk-test-key';
    mockDb.get.mockResolvedValueOnce(null);
    mockDb.get.mockResolvedValueOnce(PROFILE);
    mockDb.all.mockResolvedValue(PORTFOLIO);

    const origFetch = global.fetch;
    global.fetch = vi
      .fn()
      .mockRejectedValue(
        Object.assign(new Error('timed out'), { name: 'AbortError' }),
      );

    try {
      const app = buildApp();
      const res = await post(app, '/api/ai/summary', { address: PROFILE.address });
      expect(res.status).toBe(504);
      expect(res.body.error).toContain('timed out');
    } finally {
      global.fetch = origFetch;
    }
  });

  it('handles empty portfolio gracefully', async () => {
    const EMPTY_ADDR = 'STEMPTYPORTFOLIO...';
    const EMPTY_PROFILE = { ...PROFILE, address: EMPTY_ADDR };
    mockDb.get.mockResolvedValueOnce(null);
    mockDb.get.mockResolvedValueOnce(EMPTY_PROFILE);
    mockDb.all.mockResolvedValue([]);

    const app = buildApp();
    const res = await post(app, '/api/ai/summary', { address: EMPTY_ADDR });
    expect(res.status).toBe(200);
    expect(res.body.summary).toContain('0 portfolio item');
    expect(res.body.model).toBe('fallback');
  });
});
