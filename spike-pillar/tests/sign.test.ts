/**
 * Path A: Signing Tests
 * 
 * Tests P-256 signing and verification.
 */

import { describe, it, expect } from "vitest";
import { createPillarAccount } from "../src/pillar-account.js";
import { generateChallenge } from "../src/pillar-auth.js";
import { signChallenge, verifySignature } from "../src/pillar-sign.js";

describe("Pillar Signing", () => {
  const testRpId = "cinex.app";

  it("should sign a challenge with P-256", () => {
    const account = createPillarAccount();
    const challenge = generateChallenge(testRpId);
    
    const signature = signChallenge(
      challenge.challenge,
      account.privKey,
      testRpId
    );
    
    expect(signature.signature.length).toBe(64); // r||s format
    expect(signature.signatureHex).toMatch(/^0x[0-9a-f]{128}$/);
    expect(signature.authenticatorData.length).toBe(37);
    expect(signature.clientDataJSON.length).toBeGreaterThan(0);
    expect(signature.signedDigest.length).toBe(32);
  });

  it("should verify a valid signature", () => {
    const account = createPillarAccount();
    const challenge = generateChallenge(testRpId);
    
    const signature = signChallenge(
      challenge.challenge,
      account.privKey,
      testRpId
    );
    
    const isValid = verifySignature(
      signature.signature,
      signature.signedDigest,
      account.pubKey
    );
    
    expect(isValid).toBe(true);
  });

  it("should reject invalid signatures", () => {
    const account = createPillarAccount();
    const challenge = generateChallenge(testRpId);
    
    const signature = signChallenge(
      challenge.challenge,
      account.privKey,
      testRpId
    );
    
    // Create a different digest
    const invalidDigest = Buffer.alloc(32, 0xff);
    
    const isValid = verifySignature(
      signature.signature,
      invalidDigest,
      account.pubKey
    );
    
    expect(isValid).toBe(false);
  });

  it("should reject signatures with wrong public key", () => {
    const account1 = createPillarAccount();
    const account2 = createPillarAccount();
    const challenge = generateChallenge(testRpId);
    
    const signature = signChallenge(
      challenge.challenge,
      account1.privKey,
      testRpId
    );
    
    const isValid = verifySignature(
      signature.signature,
      signature.signedDigest,
      account2.pubKey
    );
    
    expect(isValid).toBe(false);
  });

  it("should reject non-32-byte challenges", () => {
    const account = createPillarAccount();
    const invalidChallenge = Buffer.alloc(16, 0x00); // 16 bytes, not 32
    
    expect(() => {
      signChallenge(invalidChallenge, account.privKey, testRpId);
    }).toThrow("Challenge must be 32 bytes, got 16");
  });
});
