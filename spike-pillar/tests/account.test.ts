/**
 * Path A: Account Creation Tests
 *
 * Tests P-256 keypair generation.
 * P-256 keys are WebAuthn auth factors only — they do NOT
 * derive Stacks addresses. Address = Vault contract address.
 */

import { describe, it, expect } from "vitest";
import { createPillarAccount } from "../src/pillar-account.js";

describe("Pillar Account Creation", () => {
  it("should generate a valid P-256 keypair", () => {
    const account = createPillarAccount();

    expect(account.privKey).toBeInstanceOf(Buffer);
    expect(account.privKey.length).toBe(32);
    expect(account.pubKey).toBeInstanceOf(Buffer);
    expect(account.pubKey.length).toBe(33);
    expect(account.privKeyHex).toHaveLength(64);
    expect(account.pubKeyHex).toHaveLength(66);
  });

  it("should generate unique keypairs", () => {
    const account1 = createPillarAccount();
    const account2 = createPillarAccount();

    expect(account1.pubKeyHex).not.toBe(account2.pubKeyHex);
    expect(account1.privKeyHex).not.toBe(account2.privKeyHex);
  });

  it("should have deterministic public key from private key", () => {
    const account = createPillarAccount();
    const { p256 } = require("@noble/curves/nist.js");
    const derivedPub = p256.getPublicKey(account.privKey, true);

    expect(Buffer.from(derivedPub).toString("hex")).toBe(account.pubKeyHex);
  });
});
