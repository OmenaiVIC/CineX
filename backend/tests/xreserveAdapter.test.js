import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ─── Mock chain config BEFORE importing adapter ──────────────────
vi.mock('../src/config/chain.js', () => ({
  HIRO_API_URL: 'https://api.testnet.hiro.so',
  USDCX_CONTRACT: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.usdcx',
  DEPLOYER_ADDRESS: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM',
  V2_DEPLOYER_ADDRESS: 'STK0ASFJK4DJG8G8YY556X7H9E1FWABCDWEBGQ12',
}));

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

// ─── requestAttestation ──────────────────────────────────────────

describe('xreserveAdapter - requestAttestation', () => {
  it('returns status=confirmed when burn tx is confirmed', async () => {
    const { requestAttestation } = await import('../src/services/bos/xreserveAdapter.js');

    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        tx_status: 'success',
        block_height: 100,
        burn_block_time: 1700000000,
      }),
    });

    const result = await requestAttestation({
      tx_id: 'abc123',
      token_contract: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.usdcx',
      amount_sats: 1000000,
    });

    expect(result.status).toBe('confirmed');
    expect(result.attestation_id).toBe('abc123');
  });

  it('returns status=pending when burn tx is pending', async () => {
    const { requestAttestation } = await import('../src/services/bos/xreserveAdapter.js');

    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ tx_status: 'pending' }),
    });

    const result = await requestAttestation({ tx_id: 'abc123', token_contract: 'x', amount_sats: 100 });
    expect(result.status).toBe('pending');
  });

  it('returns status=pending when tx not yet indexed (404)', async () => {
    const { requestAttestation } = await import('../src/services/bos/xreserveAdapter.js');

    fetchSpy.mockResolvedValueOnce({
      ok: false,
      status: 404,
      statusText: 'Not Found',
      json: async () => ({ error: 'not found' }),
    });

    const result = await requestAttestation({ tx_id: 'abc123', token_contract: 'x', amount_sats: 100 });
    expect(result.status).toBe('pending');
  });

  it('returns status=failed when burn tx has terminal failure', async () => {
    const { requestAttestation } = await import('../src/services/bos/xreserveAdapter.js');

    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        tx_status: 'drop_off_grid',
        tx_result: { repr: 'ERR_NOT_FOUND' },
      }),
    });

    const result = await requestAttestation({ tx_id: 'abc123', token_contract: 'x', amount_sats: 100 });
    expect(result.status).toBe('failed');
  });

  it('returns status=failed for replace_by_fee', async () => {
    const { requestAttestation } = await import('../src/services/bos/xreserveAdapter.js');

    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ tx_status: 'replace_by_fee' }),
    });

    const result = await requestAttestation({ tx_id: 'abc123', token_contract: 'x', amount_sats: 100 });
    expect(result.status).toBe('failed');
  });

  it('strips 0x prefix from txid', async () => {
    const { requestAttestation } = await import('../src/services/bos/xreserveAdapter.js');

    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ tx_status: 'success', block_height: 50 }),
    });

    await requestAttestation({ tx_id: '0xdeadbeef', token_contract: 'x', amount_sats: 100 });

    const calledUrl = fetchSpy.mock.calls[0][0];
    expect(calledUrl).toContain('/extended/v1/tx/deadbeef');
    expect(calledUrl).not.toContain('0x');
  });

  it('throws on server error (5xx)', async () => {
    const { requestAttestation } = await import('../src/services/bos/xreserveAdapter.js');

    fetchSpy.mockResolvedValueOnce({
      ok: false,
      status: 503,
      statusText: 'Service Unavailable',
      json: async () => ({ error: 'down' }),
    });

    await expect(requestAttestation({ tx_id: 'abc123', token_contract: 'x', amount_sats: 100 }))
      .rejects.toThrow();
  });

  it('throws on network failure', async () => {
    const { requestAttestation } = await import('../src/services/bos/xreserveAdapter.js');

    fetchSpy.mockRejectedValueOnce(new TypeError('Failed to fetch'));

    await expect(requestAttestation({ tx_id: 'abc123', token_contract: 'x', amount_sats: 100 }))
      .rejects.toThrow('Failed to fetch');
  });
});

// ─── getAttestationStatus ────────────────────────────────────────

describe('xreserveAdapter - getAttestationStatus', () => {
  it('maps success → confirmed with block_height', async () => {
    const { getAttestationStatus } = await import('../src/services/bos/xreserveAdapter.js');

    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        tx_status: 'success',
        block_height: 200,
        burn_block_time: 1700001000,
      }),
    });

    const result = await getAttestationStatus('tx123');
    expect(result.status).toBe('confirmed');
    expect(result.attestation_data.tx_id).toBe('tx123');
    expect(result.attestation_data.block_height).toBe(200);
    expect(result.attestation_data.burn_block_time).toBe(1700001000);
  });

  it('maps pending → pending', async () => {
    const { getAttestationStatus } = await import('../src/services/bos/xreserveAdapter.js');

    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ tx_status: 'queued' }),
    });

    const result = await getAttestationStatus('tx456');
    expect(result.status).toBe('pending');
  });

  it('maps terminal failures → failed with error repr', async () => {
    const { getAttestationStatus } = await import('../src/services/bos/xreserveAdapter.js');

    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        tx_status: 'microblocked_conflict',
        tx_result: { repr: 'err(u1)' },
      }),
    });

    const result = await getAttestationStatus('tx789');
    expect(result.status).toBe('failed');
    expect(result.attestation_data.error).toBe('err(u1)');
  });

  it('returns error on network failure (retryable)', async () => {
    const { getAttestationStatus } = await import('../src/services/bos/xreserveAdapter.js');

    fetchSpy.mockRejectedValueOnce(new Error('ECONNREFUSED'));

    await expect(getAttestationStatus('tx999')).rejects.toThrow('ECONNREFUSED');
  });
});

// ─── getReleaseStatus ────────────────────────────────────────────

describe('xreserveAdapter - getReleaseStatus', () => {
  it('delegates to _getTxStatus with release_id', async () => {
    const { getReleaseStatus } = await import('../src/services/bos/xreserveAdapter.js');

    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        tx_status: 'success',
        block_height: 300,
        burn_block_time: 1700002000,
      }),
    });

    const result = await getReleaseStatus('rel123');
    expect(result.status).toBe('confirmed');
    expect(result.release_data.tx_id).toBe('rel123');
    expect(result.release_data.block_height).toBe(300);
  });
});

// ─── releaseDestination ──────────────────────────────────────────

describe('xreserveAdapter - releaseDestination', () => {
  it('returns confirmed with release_id = attestation_id (no-op)', async () => {
    const { releaseDestination } = await import('../src/services/bos/xreserveAdapter.js');

    const result = await releaseDestination({
      attestation_id: 'burn-tx-abc',
      recipient_btc: 'bc1qtest',
      amount_sats: 500000,
      idempotencyKey: 'idem-1',
    });

    expect(result.status).toBe('confirmed');
    expect(result.release_id).toBe('burn-tx-abc');
  });
});

// ─── healthCheck ─────────────────────────────────────────────────

describe('xreserveAdapter - healthCheck', () => {
  it('returns healthy when Hiro API + contract are reachable', async () => {
    const { healthCheck } = await import('../src/services/bos/xreserveAdapter.js');

    // Mock Hiro API root
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    });

    // Mock contract info endpoint
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ name: 'usdcx' }),
    });

    const result = await healthCheck();
    expect(result.healthy).toBe(true);
    expect(result.latencyMs).toBeGreaterThanOrEqual(0);
  });

  it('returns unhealthy when Hiro API is down', async () => {
    const { healthCheck } = await import('../src/services/bos/xreserveAdapter.js');

    fetchSpy.mockRejectedValueOnce(new Error('ECONNREFUSED'));

    const result = await healthCheck();
    expect(result.healthy).toBe(false);
    expect(result.error).toContain('ECONNREFUSED');
  });

  it('returns unhealthy when Hiro API returns non-2xx', async () => {
    const { healthCheck } = await import('../src/services/bos/xreserveAdapter.js');

    fetchSpy.mockResolvedValueOnce({
      ok: false,
      status: 503,
      statusText: 'Service Unavailable',
    });

    const result = await healthCheck();
    expect(result.healthy).toBe(false);
    expect(result.error).toContain('503');
  });

  it('returns unhealthy when contract not found', async () => {
    const { healthCheck } = await import('../src/services/bos/xreserveAdapter.js');

    // Hiro API root OK
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    });

    // Contract endpoint 404
    fetchSpy.mockResolvedValueOnce({
      ok: false,
      status: 404,
    });

    const result = await healthCheck();
    expect(result.healthy).toBe(false);
    expect(result.error).toContain('contract not found');
  });

  it('returns healthy even if contract check throws (degraded)', async () => {
    const { healthCheck } = await import('../src/services/bos/xreserveAdapter.js');

    // Hiro API root OK
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    });

    // Contract check throws
    fetchSpy.mockRejectedValueOnce(new Error('timeout'));

    const result = await healthCheck();
    expect(result.healthy).toBe(true);
  });
});

// ─── classifyError ───────────────────────────────────────────────

describe('xreserveAdapter - classifyError', () => {
  it('returns transient for AbortError (timeout)', async () => {
    const { classifyError } = await import('../src/services/bos/xreserveAdapter.js');
    const err = new DOMException('aborted', 'AbortError');
    expect(classifyError(err)).toBe('transient');
  });

  it('returns transient for fetch TypeError', async () => {
    const { classifyError } = await import('../src/services/bos/xreserveAdapter.js');
    const err = new TypeError('Failed to fetch');
    expect(classifyError(err)).toBe('transient');
  });

  it('returns transient for 429', async () => {
    const { classifyError } = await import('../src/services/bos/xreserveAdapter.js');
    expect(classifyError({ status: 429 })).toBe('transient');
  });

  it('returns transient for 500+', async () => {
    const { classifyError } = await import('../src/services/bos/xreserveAdapter.js');
    expect(classifyError({ status: 500 })).toBe('transient');
    expect(classifyError({ status: 503 })).toBe('transient');
  });

  it('returns permanent for 4xx (non-429)', async () => {
    const { classifyError } = await import('../src/services/bos/xreserveAdapter.js');
    expect(classifyError({ status: 400 })).toBe('permanent');
    expect(classifyError({ status: 404 })).toBe('permanent');
  });

  it('returns unknown for unrecognized errors', async () => {
    const { classifyError } = await import('../src/services/bos/xreserveAdapter.js');
    expect(classifyError({ message: 'something weird' })).toBe('unknown');
    expect(classifyError(null)).toBe('unknown');
  });
});
