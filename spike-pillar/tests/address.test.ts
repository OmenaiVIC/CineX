/**
 * Path A: Address Derivation Tests
 *
 * In Pillar, user's "address" = Vault contract address.
 * No P-256 key derivation — pure string computation.
 */

import { describe, it, expect } from "vitest";
import { deriveVaultAddress, generateContractName } from "../src/pillar-address.js";

describe("Vault Address Derivation", () => {
  const DEPLOYER = "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM";

  it("should derive a contract ID from deployer + name", () => {
    const id = deriveVaultAddress(DEPLOYER, "cinex-smart-vault-001");
    expect(id).toBe(`${DEPLOYER}.cinex-smart-vault-001`);
  });

  it("should handle numeric user IDs", () => {
    const name = generateContractName(42);
    expect(name).toBe("cinex-smart-vault-000042");
  });

  it("should handle string user IDs", () => {
    const name = generateContractName("alice");
    expect(name).toBe("cinex-smart-vault-alice");
  });

  it("should produce a valid Stacks contract ID format", () => {
    const name = generateContractName(1);
    const id = deriveVaultAddress(DEPLOYER, name);
    expect(id).toMatch(/^S[PT][A-Z0-9]+\.[a-z0-9-]+$/);
  });

  it("should produce deterministic addresses for same inputs", () => {
    const id1 = deriveVaultAddress(DEPLOYER, "cinex-smart-vault-001");
    const id2 = deriveVaultAddress(DEPLOYER, "cinex-smart-vault-001");
    expect(id1).toBe(id2);
  });
});
