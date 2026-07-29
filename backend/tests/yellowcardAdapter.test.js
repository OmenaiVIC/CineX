import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import crypto from 'crypto';

const originalFetch = global.fetch;
let fetchSpy;

beforeEach(() => {
  fetchSpy = vi.fn();
  global.fetch = fetchSpy;
});

afterEach(() => {
  global.fetch = originalFetch;
  vi.restoreAllMocks();
});

// ─── classifyError ───────────────────────────────────────────────

describe('yellowcardAdapter - classifyError', () => {
  it('returns transient for AbortError', async () => {
    const { classifyError } = await import('../src/services/bos/yellowcardAdapter.js');
    expect(classifyError(new DOMException('aborted', 'AbortError'))).toBe('transient');
  });

  it('returns transient for fetch TypeError', async () => {
    const { classifyError } = await import('../src/services/bos/yellowcardAdapter.js');
    expect(classifyError(new TypeError('Failed to fetch'))).toBe('transient');
  });

  it('returns transient for 429', async () => {
    const { classifyError } = await import('../src/services/bos/yellowcardAdapter.js');
    expect(classifyError({ status: 429 })).toBe('transient');
  });

  it('returns transient for 5xx', async () => {
    const { classifyError } = await import('../src/services/bos/yellowcardAdapter.js');
    expect(classifyError({ status: 500 })).toBe('transient');
    expect(classifyError({ status: 503 })).toBe('transient');
  });

  it('returns permanent for 4xx (non-429)', async () => {
    const { classifyError } = await import('../src/services/bos/yellowcardAdapter.js');
    expect(classifyError({ status: 400 })).toBe('permanent');
    expect(classifyError({ status: 404 })).toBe('permanent');
  });

  it('returns unknown for unrecognized', async () => {
    const { classifyError } = await import('../src/services/bos/yellowcardAdapter.js');
    expect(classifyError({ message: 'weird' })).toBe('unknown');
    expect(classifyError(null)).toBe('unknown');
  });
});

// ─── signWebhook / verifyWebhookSignature ────────────────────────

describe('yellowcardAdapter - webhook verification', () => {
  it('signWebhook returns HMAC-SHA256 signature', async () => {
    const { signWebhook } = await import('../src/services/bos/yellowcardAdapter.js');
    const payload = '{"event":"payout.completed"}';
    const secret = 'webhook-test-secret';

    const sig = signWebhook(payload, secret);
    const expected = crypto.createHmac('sha256', secret).update(payload).digest('hex');

    expect(sig).toBe(expected);
    expect(sig).toHaveLength(64);
  });

  it('signWebhook returns empty string when no secret', async () => {
    const { signWebhook } = await import('../src/services/bos/yellowcardAdapter.js');
    expect(signWebhook('data', '')).toBe('');
    expect(signWebhook('data')).toBe('');
  });

  it('verifyWebhookSignature returns true for valid signature', async () => {
    const { signWebhook, verifyWebhookSignature } = await import('../src/services/bos/yellowcardAdapter.js');
    const secret = 'verify-secret';
    const payload = '{"status":"completed"}';
    const sig = signWebhook(payload, secret);

    expect(verifyWebhookSignature(payload, sig, secret)).toBe(true);
  });

  it('verifyWebhookSignature supports sha256= prefix', async () => {
    const { signWebhook, verifyWebhookSignature } = await import('../src/services/bos/yellowcardAdapter.js');
    const secret = 'verify-secret';
    const payload = 'test-data';
    const sig = signWebhook(payload, secret);

    expect(verifyWebhookSignature(payload, `sha256=${sig}`, secret)).toBe(true);
  });

  it('verifyWebhookSignature returns false for invalid signature', async () => {
    const { verifyWebhookSignature } = await import('../src/services/bos/yellowcardAdapter.js');
    expect(verifyWebhookSignature('data', '0'.repeat(64), 'secret')).toBe(false);
  });

  it('verifyWebhookSignature returns false when secret is missing', async () => {
    const { verifyWebhookSignature } = await import('../src/services/bos/yellowcardAdapter.js');
    expect(verifyWebhookSignature('data', 'sig', '')).toBe(false);
  });

  it('verifyWebhookSignature returns false when signature is missing', async () => {
    const { verifyWebhookSignature } = await import('../src/services/bos/yellowcardAdapter.js');
    expect(verifyWebhookSignature('data', '', 'secret')).toBe(false);
  });
});

// ─── submitSend ──────────────────────────────────────────────────

describe('yellowcardAdapter - submitSend', () => {
  it('POSTs to /send with normalized response', async () => {
    const { submitSend } = await import('../src/services/bos/yellowcardAdapter.js');

    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        id: 'yc-send-001',
        status: 'pending',
        sequenceId: 'seq-1',
      }),
    });

    const result = await submitSend({
      idempotency_key: 'idem-001',
      amount: 500000,
      currency: 'NGN',
      recipient_type: 'bank_account',
      recipient: { bankCode: '044', accountNumber: '1234567890' },
    });

    expect(result.send_id).toBe('yc-send-001');
    expect(result.status).toBe('pending');
    expect(result.sequence_id).toBe('seq-1');

    const calledUrl = fetchSpy.mock.calls[0][0];
    expect(calledUrl).toContain('/send');
    expect(fetchSpy.mock.calls[0][1].method).toBe('POST');
  });

  it('normalizes successful → completed', async () => {
    const { submitSend } = await import('../src/services/bos/yellowcardAdapter.js');

    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 'yc-002', status: 'successful' }),
    });

    const result = await submitSend({
      idempotency_key: 'idem-002',
      amount: 100000,
    });

    expect(result.status).toBe('completed');
  });

  it('includes X-Idempotency-Key header', async () => {
    const { submitSend } = await import('../src/services/bos/yellowcardAdapter.js');

    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 'yc-003', status: 'pending' }),
    });

    await submitSend({ idempotency_key: 'key-123', amount: 100 });

    const headers = fetchSpy.mock.calls[0][1].headers;
    expect(headers['X-Idempotency-Key']).toBe('key-123');
  });

  it('throws on API error with status', async () => {
    const { submitSend } = await import('../src/services/bos/yellowcardAdapter.js');

    fetchSpy.mockResolvedValueOnce({
      ok: false,
      status: 422,
      text: async () => '{"error":"invalid amount"}',
    });

    await expect(submitSend({ amount: -1 })).rejects.toThrow('422');
  });

  it('throws on network failure', async () => {
    const { submitSend } = await import('../src/services/bos/yellowcardAdapter.js');

    fetchSpy.mockRejectedValueOnce(new TypeError('Failed to fetch'));

    await expect(submitSend({ amount: 100 })).rejects.toThrow('Failed to fetch');
  });
});

// ─── lookupSend ──────────────────────────────────────────────────

describe('yellowcardAdapter - lookupSend', () => {
  it('GETs /send/{id} and normalizes status', async () => {
    const { lookupSend } = await import('../src/services/bos/yellowcardAdapter.js');

    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        id: 'yc-send-001',
        status: 'successful',
        amount: '500000',
      }),
    });

    const result = await lookupSend('yc-send-001');
    expect(result.status).toBe('completed');
    expect(result.data.id).toBe('yc-send-001');

    const calledUrl = fetchSpy.mock.calls[0][0];
    expect(calledUrl).toContain('/send/yc-send-001');
    expect(fetchSpy.mock.calls[0][1].method).toBe('GET');
  });

  it('returns pending for null status', async () => {
    const { lookupSend } = await import('../src/services/bos/yellowcardAdapter.js');

    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 'yc-004', status: null }),
    });

    const result = await lookupSend('yc-004');
    expect(result.status).toBe('pending');
  });

  it('throws on 404', async () => {
    const { lookupSend } = await import('../src/services/bos/yellowcardAdapter.js');

    fetchSpy.mockResolvedValueOnce({
      ok: false,
      status: 404,
      text: async () => 'not found',
    });

    await expect(lookupSend('missing')).rejects.toThrow('404');
  });
});

// ─── listSends ───────────────────────────────────────────────────

describe('yellowcardAdapter - listSends', () => {
  it('GETs /sends with query params', async () => {
    const { listSends } = await import('../src/services/bos/yellowcardAdapter.js');

    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ sends: [{ id: 's1' }], total: 1 }),
    });

    const result = await listSends({ limit: 10, offset: 0, status: 'pending' });
    expect(result.sends).toHaveLength(1);
    expect(result.total).toBe(1);

    const calledUrl = fetchSpy.mock.calls[0][0];
    expect(calledUrl).toContain('limit=10');
    expect(calledUrl).toContain('status=pending');
  });

  it('handles empty params', async () => {
    const { listSends } = await import('../src/services/bos/yellowcardAdapter.js');

    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ sends: [] }),
    });

    const result = await listSends();
    expect(result.sends).toHaveLength(0);
  });
});

// ─── getSendFee ──────────────────────────────────────────────────

describe('yellowcardAdapter - getSendFee', () => {
  it('GETs /sends/fee with amount and currency', async () => {
    const { getSendFee } = await import('../src/services/bos/yellowcardAdapter.js');

    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ fee: 1500, total: 501500 }),
    });

    const result = await getSendFee({ amount: 500000, currency: 'NGN' });
    expect(result.fee).toBe(1500);
    expect(result.total).toBe(501500);

    const calledUrl = fetchSpy.mock.calls[0][0];
    expect(calledUrl).toContain('amount=500000');
    expect(calledUrl).toContain('currency=NGN');
  });
});

// ─── healthCheck ─────────────────────────────────────────────────

describe('yellowcardAdapter - healthCheck', () => {
  it('returns healthy when /account returns 200', async () => {
    const { healthCheck } = await import('../src/services/bos/yellowcardAdapter.js');

    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ accountId: 'acc-1', status: 'active' }),
    });

    const result = await healthCheck();
    expect(result.healthy).toBe(true);
    expect(result.data.accountId).toBe('acc-1');
  });

  it('returns unhealthy when API is down', async () => {
    const { healthCheck } = await import('../src/services/bos/yellowcardAdapter.js');

    fetchSpy.mockRejectedValueOnce(new Error('ECONNREFUSED'));

    const result = await healthCheck();
    expect(result.healthy).toBe(false);
    expect(result.error).toContain('ECONNREFUSED');
  });

  it('returns unhealthy when /account returns 401', async () => {
    const { healthCheck } = await import('../src/services/bos/yellowcardAdapter.js');

    fetchSpy.mockResolvedValueOnce({
      ok: false,
      status: 401,
    });

    const result = await healthCheck();
    expect(result.healthy).toBe(false);
  });
});

// ─── resolveBankAccount ──────────────────────────────────────────

describe('yellowcardAdapter - resolveBankAccount', () => {
  it('POSTs to /details/bank with bankCode and accountNumber', async () => {
    const { resolveBankAccount } = await import('../src/services/bos/yellowcardAdapter.js');

    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        accountName: 'John Doe',
        bankName: 'Access Bank',
      }),
    });

    const result = await resolveBankAccount({
      bankCode: '044',
      accountNumber: '1234567890',
    });

    expect(result.valid).toBe(true);
    expect(result.account_name).toBe('John Doe');
    expect(result.bank_name).toBe('Access Bank');

    const body = JSON.parse(fetchSpy.mock.calls[0][1].body);
    expect(body.bankCode).toBe('044');
    expect(body.accountNumber).toBe('1234567890');
  });

  it('throws on invalid bank account (400)', async () => {
    const { resolveBankAccount } = await import('../src/services/bos/yellowcardAdapter.js');

    fetchSpy.mockResolvedValueOnce({
      ok: false,
      status: 400,
      text: async () => 'invalid account',
    });

    await expect(resolveBankAccount({ bankCode: '000', accountNumber: '000' }))
      .rejects.toThrow('400');
  });
});

// ─── getChannels ─────────────────────────────────────────────────

describe('yellowcardAdapter - getChannels', () => {
  it('GETs /channels and returns channel list', async () => {
    const { getChannels } = await import('../src/services/bos/yellowcardAdapter.js');

    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        channels: [{ id: 'ngn-bank', name: 'Nigerian Bank Transfer', currency: 'NGN' }],
      }),
    });

    const result = await getChannels();
    expect(result.channels).toHaveLength(1);
    expect(result.channels[0].currency).toBe('NGN');
  });
});

// ─── getRates ────────────────────────────────────────────────────

describe('yellowcardAdapter - getRates', () => {
  it('GETs /rates with from/to/amount params', async () => {
    const { getRates } = await import('../src/services/bos/yellowcardAdapter.js');

    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ rate: 1650, from: 'USDC', to: 'NGN' }),
    });

    const result = await getRates({ from: 'USDC', to: 'NGN', amount: 100 });
    expect(result.rate).toBe(1650);

    const calledUrl = fetchSpy.mock.calls[0][0];
    expect(calledUrl).toContain('from=USDC');
    expect(calledUrl).toContain('to=NGN');
  });
});

// ─── backward-compat aliases ─────────────────────────────────────

describe('yellowcardAdapter - backward-compat aliases', () => {
  it('initiatePayout delegates to submitSend', async () => {
    const { initiatePayout } = await import('../src/services/bos/yellowcardAdapter.js');

    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 'yc-compat-001', status: 'pending' }),
    });

    const result = await initiatePayout({
      idempotency_key: 'compat-key',
      amount: 250000,
      recipient: { bankCode: '044', accountNumber: '999' },
    });

    expect(result.send_id).toBe('yc-compat-001');
  });

  it('getPayoutStatus delegates to lookupSend', async () => {
    const { getPayoutStatus } = await import('../src/services/bos/yellowcardAdapter.js');

    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 'yc-compat-002', status: 'successful' }),
    });

    const result = await getPayoutStatus('yc-compat-002');
    expect(result.status).toBe('completed');
  });
});

// ─── HMAC auth header ────────────────────────────────────────────

describe('yellowcardAdapter - HMAC auth', () => {
  it('includes Authorization header when API key and secret are set', async () => {
    const origKey = process.env.YELLOW_CARD_API_KEY;
    const origSecret = process.env.YELLOW_CARD_SECRET_KEY;
    process.env.YELLOW_CARD_API_KEY = 'test-api-key';
    process.env.YELLOW_CARD_SECRET_KEY = 'test-secret-key';

    // Re-import to pick up new env vars
    vi.resetModules();
    const { healthCheck } = await import('../src/services/bos/yellowcardAdapter.js');

    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    });

    await healthCheck();

    const headers = fetchSpy.mock.calls[0][1].headers;
    expect(headers['Authorization']).toBeDefined();
    expect(headers['Authorization']).toContain('YcHmacV1');
    expect(headers['Authorization']).toContain('test-api-key');

    // Restore
    if (origKey !== undefined) process.env.YELLOW_CARD_API_KEY = origKey;
    else delete process.env.YELLOW_CARD_API_KEY;
    if (origSecret !== undefined) process.env.YELLOW_CARD_SECRET_KEY = origSecret;
    else delete process.env.YELLOW_CARD_SECRET_KEY;
  });

  it('omits Authorization header when no credentials', async () => {
    const origKey = process.env.YELLOW_CARD_API_KEY;
    const origSecret = process.env.YELLOW_CARD_SECRET_KEY;
    delete process.env.YELLOW_CARD_API_KEY;
    delete process.env.YELLOW_CARD_SECRET_KEY;

    vi.resetModules();
    const { healthCheck } = await import('../src/services/bos/yellowcardAdapter.js');

    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    });

    await healthCheck();

    const headers = fetchSpy.mock.calls[0][1].headers;
    expect(headers['Authorization']).toBeUndefined();

    if (origKey !== undefined) process.env.YELLOW_CARD_API_KEY = origKey;
    if (origSecret !== undefined) process.env.YELLOW_CARD_SECRET_KEY = origSecret;
  });
});
