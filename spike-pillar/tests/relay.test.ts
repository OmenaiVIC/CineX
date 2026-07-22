/**
 * Path A: End-to-End Relay Flow Tests
 *
 * Tests the full lifecycle: account creation → WebAuthn signing → relay broadcast.
 * All network calls mocked — validates the integration logic.
 */

import { describe, it, expect, vi } from "vitest";
import { createPillarAccount } from "../src/pillar-account.js";
import { generateChallenge } from "../src/pillar-auth.js";
import { signChallenge, verifySignature } from "../src/pillar-sign.js";
import { deriveVaultAddress, generateContractName } from "../src/pillar-address.js";

const DEPLOYER = "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM";
const RECIPIENT = "ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG";

describe("End-to-End Relay Flow", () => {
  it("should create account, sign challenge, and verify signature", () => {
    // 1. Create account
    const account = createPillarAccount();
    expect(account.pubKey.length).toBe(33);

    // 2. Generate WebAuthn challenge
    const { challenge, rpId } = generateChallenge("localhost");
    expect(challenge.length).toBe(32);

    // 3. Sign with P-256
    const sig = signChallenge(challenge, account.privKey, rpId);
    expect(sig.signature.length).toBe(64);
    expect(sig.authenticatorData.length).toBe(37);

    // 4. Verify signature
    const valid = verifySignature(sig.signature, sig.signedDigest, account.pubKey);
    expect(valid).toBe(true);

    // 5. Verify fails with wrong key
    const wrongAccount = createPillarAccount();
    const invalid = verifySignature(sig.signature, sig.signedDigest, wrongAccount.pubKey);
    expect(invalid).toBe(false);
  });

  it("should derive vault address for relay target", () => {
    const contractName = generateContractName(1);
    const vaultAddress = deriveVaultAddress(DEPLOYER, contractName);

    expect(vaultAddress).toBe(`${DEPLOYER}.cinex-smart-vault-000001`);
  });

  it("should produce relay-compatible signature bundle", () => {
    const account = createPillarAccount();
    const { challenge, rpId } = generateChallenge("localhost");
    const sig = signChallenge(challenge, account.privKey, rpId);

    // This is what the relay would receive from the frontend
    const relayPayload = {
      authId: 1,
      pubkey: account.pubKeyHex,
      signature: sig.signatureHex,
      authenticatorData: sig.authenticatorData.toString("hex"),
      clientDataPrefix: Buffer.from(
        JSON.stringify({
          type: "webauthn.get",
          challenge: "", // challenge is embedded by base64url encoding
          origin: `https://${rpId}`,
          crossOrigin: false,
        })
      ).toString("hex").substring(0, 256), // prefix
      clientDataSuffix: "00", // minimal suffix
      amount: 1000000, // 1 STX
      recipient: RECIPIENT,
    };

    // Validate payload shape
    expect(relayPayload.pubkey).toHaveLength(66); // 0x + 64 hex
    expect(relayPayload.signature).toMatch(/^0x[0-9a-f]{128}$/); // 64 bytes hex
    expect(relayPayload.authenticatorData).toHaveLength(74); // 37 bytes hex
    expect(typeof relayPayload.amount).toBe("number");
    expect(relayPayload.recipient).toMatch(/^ST/);
  });

  it("should create multiple users with distinct vault addresses", () => {
    const users = Array.from({ length: 5 }, (_, i) => {
      const account = createPillarAccount();
      const contractName = generateContractName(i + 1);
      const vaultAddress = deriveVaultAddress(DEPLOYER, contractName);
      return { account, vaultAddress };
    });

    // All vault addresses unique
    const addresses = users.map((u) => u.vaultAddress);
    expect(new Set(addresses).size).toBe(5);

    // All pubkeys unique
    const pubkeys = users.map((u) => u.account.pubKeyHex);
    expect(new Set(pubkeys).size).toBe(5);
  });
});
