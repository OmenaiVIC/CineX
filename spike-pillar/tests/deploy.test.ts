/**
 * Path A: Vault Deployment Tests
 *
 * Tests the deployment flow with mocked Hiro API.
 * Real testnet deployment is a manual step in Phase 1C.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe("Vault Deployment", () => {
  it("should read contract source code", () => {
    const contractsDir = resolve(__dirname, "..", "contracts");
    const source = readFileSync(
      resolve(contractsDir, "cinex-smart-vault.clar"),
      "utf-8"
    );

    expect(source).toContain("define-public (onboard");
    expect(source).toContain("define-public (stx-transfer");
    expect(source).toContain("clarity-webauthn verify-assertion");
    expect(source).toContain("used-pubkey-authorizations");
  });

  it("should have all required contract constants", () => {
    const contractsDir = resolve(__dirname, "..", "contracts");
    const source = readFileSync(
      resolve(contractsDir, "cinex-smart-vault.clar"),
      "utf-8"
    );

    expect(source).toContain("ERR_UNAUTHORISED");
    expect(source).toContain("ERR_SIGNATURE_REPLAY");
    expect(source).toContain("ERR_ALREADY_ONBOARDED");
    expect(source).toContain("ERR_NOT_ONBOARDED");
  });

  it("should have Clarinet.toml configured for Clarity 4", () => {
    const clarinetConfig = readFileSync(
      resolve(__dirname, "..", "Clarinet.toml"),
      "utf-8"
    );

    expect(clarinetConfig).toContain("clarity_version = 4");
    expect(clarinetConfig).toContain("epoch = \"3.3\"");
    expect(clarinetConfig).toContain("cinex-smart-vault");
    expect(clarinetConfig).toContain("clarity-webauthn");
  });

  it("should build and broadcast a deploy transaction (mocked)", async () => {
    // Mock the Hiro API responses
    const mockFetch = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ nonce: 0 }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ txid: "0x" + "ab".repeat(32) }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ tx_status: "success" }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ nonce: 1 }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ txid: "0x" + "cd".repeat(32) }),
      });

    vi.stubGlobal("fetch", mockFetch);

    // Mock the Stacks transaction functions to avoid needing real keys
    const mockMakeContractDeploy = vi.fn().mockResolvedValue("mock-serialized-tx");
    const mockMakeContractCall = vi.fn().mockResolvedValue("mock-serialized-tx-2");
    const mockSignWithKey = vi.fn().mockReturnValue({ transaction: "signed-tx", signature: "sig" });
    const mockBroadcastTransaction = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ txid: "0x" + "ab".repeat(32) }) });
    const mockFetchAccountNonce = vi.fn().mockResolvedValue(0);
    const mockGetAddressFromPrivateKey = vi.fn().mockReturnValue("ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM");
    const mockCreateStacksPrivateKey = vi.fn().mockReturnValue({ data: Buffer.alloc(32) });
    const mockPrivateKeyToString = vi.fn().mockReturnValue("a".repeat(64));

    vi.doMock("@stacks/transactions", () => ({
      makeContractDeploy: mockMakeContractDeploy,
      makeContractCall: mockMakeContractCall,
      signWithKey: mockSignWithKey,
      broadcastTransaction: mockBroadcastTransaction,
      fetchAccountNonce: mockFetchAccountNonce,
      getAddressFromPrivateKey: mockGetAddressFromPrivateKey,
      createStacksPrivateKey: mockCreateStacksPrivateKey,
      privateKeyToString: mockPrivateKeyToString,
      bufferCV: (v: any) => v,
      principalCV: (v: any) => v,
      uintCV: (v: any) => v,
    }));

    vi.doMock("@stacks/network", () => ({
      StacksTestnet: class {},
    }));

    const { deployVault } = await import("../src/pillar-deploy.js");
    const { createPillarAccount } = await import("../src/pillar-account.js");
    const { generateContractName } = await import("../src/pillar-address.js");

    const userAccount = createPillarAccount();
    const contractName = generateContractName(1);

    try {
      const result = await deployVault({
        deployerKey: "a".repeat(64),
        contractName,
        userPubkey: userAccount.pubKeyHex,
        userAddress: "ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG",
        network: "testnet",
      });

      expect(result.contractId).toContain(contractName);
      expect(result.network).toBe("testnet");
      expect(mockMakeContractDeploy).toHaveBeenCalledOnce();
      expect(mockMakeContractCall).toHaveBeenCalledOnce();
      expect(mockBroadcastTransaction).toHaveBeenCalledTimes(2);
    } finally {
      vi.restoreAllMocks();
    }
  });
});
