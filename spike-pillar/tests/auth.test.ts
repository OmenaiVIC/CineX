/**
 * Path A: Authentication Tests
 * 
 * Tests WebAuthn challenge generation and authentication flow.
 */

import { describe, it, expect } from "vitest";
import { 
  generateChallenge, 
  buildClientDataJSON, 
  buildAuthenticatorData 
} from "../src/pillar-auth.js";

describe("Pillar Authentication", () => {
  const testRpId = "cinex.app";

  it("should generate a valid 32-byte challenge", () => {
    const challenge = generateChallenge(testRpId);
    
    expect(challenge.challenge.length).toBe(32);
    expect(challenge.rpId).toBe(testRpId);
    expect(challenge.challengeBase64).toBeTruthy();
  });

  it("should generate unique challenges", () => {
    const challenge1 = generateChallenge(testRpId);
    const challenge2 = generateChallenge(testRpId);
    
    expect(challenge1.challengeBase64).not.toBe(challenge2.challengeBase64);
  });

  it("should build valid clientDataJSON", () => {
    const challenge = generateChallenge(testRpId);
    const clientDataJSON = buildClientDataJSON(
      challenge.challenge,
      testRpId,
      testRpId
    );
    
    const parsed = JSON.parse(clientDataJSON);
    expect(parsed.type).toBe("webauthn.get");
    expect(parsed.challenge).toBe(challenge.challengeBase64);
    expect(parsed.origin).toBe(`https://${testRpId}`);
    expect(parsed.crossOrigin).toBe(false);
  });

  it("should build valid authenticatorData", () => {
    const authenticatorData = buildAuthenticatorData(testRpId);
    
    // RP ID hash (32 bytes) + flags (1 byte) + sign count (4 bytes) = 37 bytes
    expect(authenticatorData.length).toBe(37);
    
    // Check flags (UP + UV = 0x05)
    expect(authenticatorData[32]).toBe(0x05);
  });
});
