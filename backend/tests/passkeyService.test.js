import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@stacks/transactions', () => ({
  makeContractCall: vi.fn().mockResolvedValue({
    serialize: () => Buffer.from('deadbeef', 'hex'),
  }),
  AnchorMode: { Any: 3 },
  PostConditionMode: { Allow: 1 },
  standardPrincipalCV: vi.fn((v) => ({ type: 'principal', value: v })),
  uintCV: vi.fn((v) => ({ type: 'uint', value: v })),
  bufferCV: vi.fn((v) => ({ type: 'buffer', value: v })),
  tupleCV: vi.fn((v) => ({ type: 'tuple', value: v })),
  someCV: vi.fn((v) => ({ type: 'some', value: v })),
  noneCV: vi.fn(() => ({ type: 'none' })),
  stringAsciiCV: vi.fn((v) => ({ type: 'string-ascii', value: v })),
  getAddressFromPrivateKey: vi.fn(() => 'ST1RELAYADDRESS1234567890ABCDEF'),
  TransactionVersion: { Testnet: 0x80 },
}));

vi.mock('@stacks/network', () => ({
  StacksTestnet: class {
    constructor() { this.url = 'https://api.testnet.hiro.so'; }
  },
}));

vi.mock('../src/services/sponsorService.js', () => ({
  recordTransfer: vi.fn().mockResolvedValue({}),
  confirmTransfer: vi.fn().mockResolvedValue({}),
  failTransfer: vi.fn().mockResolvedValue({}),
}));

describe('passkeyService', () => {
  let passkeyService;
  const ORIGINAL_ENV = { ...process.env };

  beforeEach(async () => {
    vi.resetModules();
    process.env = { ...ORIGINAL_ENV, CREATOR_KEY: '0a1b2c3d4e5f' };
    passkeyService = await import('../src/services/passkeyService.js');
  });

  afterEach(() => {
    process.env = ORIGINAL_ENV;
    vi.restoreAllMocks();
  });

  describe('init', () => {
    it('should initialize with valid CREATOR_KEY', () => {
      passkeyService.init();
    });

    it('should warn when CREATOR_KEY is missing', () => {
      delete process.env.CREATOR_KEY;
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      passkeyService.init();
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('CREATOR_KEY not set')
      );
    });
  });

  describe('passkeyTransfer', () => {
    const validParams = {
      domainName: 'cinex-smart-vault',
      domainVersion: '1.0.0',
      domainChainId: 2143456,
      domainWallet: 'ST1WALLET...',
      recipient: 'ST2RECIPIENT1234567890ABCDEF',
      amount: 1000000,
      authId: 42,
      pubkey: 'a'.repeat(66),
      signature: 'b'.repeat(128),
      authenticatorData: 'c'.repeat(100),
      clientDataPrefix: 'd'.repeat(60),
      clientDataSuffix: 'e'.repeat(60),
    };

    it('should throw if not initialized', async () => {
      delete process.env.CREATOR_KEY;
      const fresh = await import('../src/services/passkeyService.js');
      await expect(
        fresh.passkeyTransfer(validParams)
      ).rejects.toThrow('not initialized');
    });

    it('should build sig-auth tuple and broadcast', async () => {
      passkeyService.init();
      global.fetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ nonce: 5 }),
        })
        .mockResolvedValueOnce({
          ok: true,
          text: async () => '0xabcdef1234567890',
        });

      const result = await passkeyService.passkeyTransfer(validParams);
      expect(result.txid).toBe('0xabcdef1234567890');
    });

    it('should prefix 0x to txid if missing', async () => {
      passkeyService.init();
      global.fetch = vi.fn()
        .mockResolvedValueOnce({ ok: true, json: async () => ({ nonce: 0 }) })
        .mockResolvedValueOnce({ ok: true, text: async () => 'abcdef1234567890' });

      const result = await passkeyService.passkeyTransfer(validParams);
      expect(result.txid).toBe('0xabcdef1234567890');
    });

    it('should handle JSON-wrapped txid from Hiro', async () => {
      passkeyService.init();
      global.fetch = vi.fn()
        .mockResolvedValueOnce({ ok: true, json: async () => ({ nonce: 0 }) })
        .mockResolvedValueOnce({ ok: true, text: async () => '{"txid":"aabbccdd"}' });

      const result = await passkeyService.passkeyTransfer(validParams);
      expect(result.txid).toBe('0xaabbccdd');
    });

    it('should throw on nonce fetch failure', async () => {
      passkeyService.init();
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      await expect(
        passkeyService.passkeyTransfer(validParams)
      ).rejects.toThrow('Nonce fetch failed');
    });

    it('should throw on broadcast failure', async () => {
      passkeyService.init();
      global.fetch = vi.fn()
        .mockResolvedValueOnce({ ok: true, json: async () => ({ nonce: 0 }) })
        .mockResolvedValueOnce({ ok: false, status: 400, text: async () => 'bad tx' });

      await expect(
        passkeyService.passkeyTransfer(validParams)
      ).rejects.toThrow('Hiro API 400');
    });

    it('should include memo when provided', async () => {
      passkeyService.init();
      global.fetch = vi.fn()
        .mockResolvedValueOnce({ ok: true, json: async () => ({ nonce: 0 }) })
        .mockResolvedValueOnce({ ok: true, text: async () => '0xtxid' });

      const result = await passkeyService.passkeyTransfer({
        ...validParams,
        memo: 'aabb',
      });
      expect(result.txid).toBe('0xtxid');
    });

    it('should pass correct args to makeContractCall', async () => {
      passkeyService.init();
      global.fetch = vi.fn()
        .mockResolvedValueOnce({ ok: true, json: async () => ({ nonce: 3 }) })
        .mockResolvedValueOnce({ ok: true, text: async () => '0xresult' });

      const { makeContractCall } = await import('@stacks/transactions');
      await passkeyService.passkeyTransfer(validParams);

      expect(makeContractCall).toHaveBeenCalledWith(
        expect.objectContaining({
          contractAddress: 'ST29JKDEFRY0RYMGF97FZC9PZWJ4H4VBSQFFERNXX',
          contractName: 'cinex-smart-vault-v4',
          functionName: 'stx-transfer',
          fee: 100000,
          nonce: 3,
        })
      );
    });

    it('should return transferId when provided', async () => {
      passkeyService.init();
      global.fetch = vi.fn()
        .mockResolvedValueOnce({ ok: true, json: async () => ({ nonce: 0 }) })
        .mockResolvedValueOnce({ ok: true, text: async () => '0xtxid' });

      const result = await passkeyService.passkeyTransfer({
        ...validParams,
        transferId: 'my-transfer-id',
      });
      expect(result.transferId).toBe('my-transfer-id');
    });
  });
});
