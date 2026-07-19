/**
 * Security Model Tests
 *
 * Validates RP ID / origin binding enforcement, authenticator data checks,
 * credential isolation, session management, nonce handling, and recovery flow.
 *
 * PRD Reference: Reviewer Addendum → "Production Passkey Wallet Requirements"
 */

import { describe, it, expect } from "vitest";
import crypto from "node:crypto";
import {
  ORIGIN_BINDINGS,
  getOriginBinding,
  validateRpIdHash,
  validateOrigin,
  validateAuthenticatorData,
  canCrossAuthenticate,
  isCredentialValidForEnv,
  validateNonce,
  incrementNonce,
  createSessionToken,
  validateSessionToken,
  requiresReauth,
  DEFAULT_SESSION_CONFIG,
  createRecoveryRequest,
  isRecoveryReady,
  canCancelRecovery,
  RECOVERY_VETO_WINDOW_MS,
  type PasskeyCredential,
  type CineXEnvironment,
} from "../src/security-model.js";

const sha256 = (b: Buffer): Buffer =>
  crypto.createHash("sha256").update(b).digest();

function makeCredential(
  overrides: Partial<PasskeyCredential> = {}
): PasskeyCredential {
  return {
    pubkeyHex: "02".repeat(33),
    credentialId: "abc123",
    rpId: "localhost",
    environment: "dev",
    nonce: 0,
    enabled: true,
    ...overrides,
  };
}

function buildAuthenticatorData(
  rpIdHash: Buffer,
  flags: number = 0x01,
  signCount: number = 1
): Buffer {
  const sc = Buffer.alloc(4);
  sc.writeUInt32BE(signCount);
  return Buffer.concat([rpIdHash, Buffer.from([flags]), sc]);
}

describe("Security Model", () => {
  // -----------------------------------------------------------------------
  // RP ID / Origin Bindings
  // -----------------------------------------------------------------------
  describe("RP ID / Origin Bindings", () => {
    it("should have exactly 3 environments", () => {
      expect(ORIGIN_BINDINGS).toHaveLength(3);
    });

    it("should return correct binding for dev", () => {
      const b = getOriginBinding("dev");
      expect(b.rpId).toBe("localhost");
      expect(b.origin).toBe("http://localhost:5173");
      expect(b.rpIdHash.length).toBe(32);
    });

    it("should return correct binding for testnet", () => {
      const b = getOriginBinding("testnet");
      expect(b.rpId).toBe("cine-x-iota.vercel.app");
      expect(b.origin).toBe("https://cine-x-iota.vercel.app");
    });

    it("should return correct binding for production", () => {
      const b = getOriginBinding("production");
      expect(b.rpId).toBe("cinex.app");
      expect(b.origin).toBe("https://cinex.app");
    });

    it("should throw for unknown environment", () => {
      // @ts-expect-error testing invalid input
      expect(() => getOriginBinding("staging")).toThrow("Unknown environment");
    });

    it("should have unique RP IDs across environments", () => {
      const rpIds = ORIGIN_BINDINGS.map((b) => b.rpId);
      expect(new Set(rpIds).size).toBe(3);
    });

    it("should have unique RP ID hashes across environments", () => {
      const hashes = ORIGIN_BINDINGS.map((b) => b.rpIdHash.toString("hex"));
      expect(new Set(hashes).size).toBe(3);
    });
  });

  // -----------------------------------------------------------------------
  // RP ID Hash Validation
  // -----------------------------------------------------------------------
  describe("validateRpIdHash", () => {
    it("should accept correct RP ID hash for dev", () => {
      const b = getOriginBinding("dev");
      expect(validateRpIdHash(b.rpIdHash, "dev")).toBe(true);
    });

    it("should reject wrong RP ID hash (origin mismatch)", () => {
      const wrongHash = sha256(Buffer.from("evil.example.com", "ascii"));
      expect(validateRpIdHash(wrongHash, "dev")).toBe(false);
    });

    it("should reject testnet hash when expecting dev", () => {
      const testnetBinding = getOriginBinding("testnet");
      expect(validateRpIdHash(testnetBinding.rpIdHash, "dev")).toBe(false);
    });

    it("should reject production hash when expecting testnet", () => {
      const prodBinding = getOriginBinding("production");
      expect(validateRpIdHash(prodBinding.rpIdHash, "testnet")).toBe(false);
    });
  });

  // -----------------------------------------------------------------------
  // Origin Validation
  // -----------------------------------------------------------------------
  describe("validateOrigin", () => {
    it("should accept correct origin for dev", () => {
      expect(validateOrigin("http://localhost:5173", "dev")).toBe(true);
    });

    it("should reject wrong port", () => {
      expect(validateOrigin("http://localhost:3000", "dev")).toBe(false);
    });

    it("should reject http for testnet (requires https)", () => {
      expect(validateOrigin("http://cine-x-iota.vercel.app", "testnet")).toBe(
        false
      );
    });

    it("should accept correct origin for testnet", () => {
      expect(
        validateOrigin("https://cine-x-iota.vercel.app", "testnet")
      ).toBe(true);
    });

    it("should reject phishing origin", () => {
      expect(
        validateOrigin("https://cinex-phishing.evil.com", "testnet")
      ).toBe(false);
    });
  });

  // -----------------------------------------------------------------------
  // Authenticator Data Validation
  // -----------------------------------------------------------------------
  describe("validateAuthenticatorData", () => {
    const rpIdHash = sha256(Buffer.from("localhost", "ascii"));

    it("should accept valid authenticator data", () => {
      const authData = buildAuthenticatorData(rpIdHash, 0x01, 1);
      const result = validateAuthenticatorData(authData, rpIdHash);
      expect(result.valid).toBe(true);
    });

    it("should reject data shorter than 37 bytes", () => {
      const short = Buffer.alloc(36, 0x00);
      const result = validateAuthenticatorData(short, rpIdHash);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("ERR_BAD_AUTH_DATA");
    });

    it("should reject when UP flag is not set", () => {
      const authData = buildAuthenticatorData(rpIdHash, 0x00, 1);
      const result = validateAuthenticatorData(authData, rpIdHash);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("ERR_USER_NOT_PRESENT");
    });

    it("should reject when RP ID hash mismatches", () => {
      const wrongHash = sha256(Buffer.from("evil.com", "ascii"));
      const authData = buildAuthenticatorData(wrongHash, 0x01, 1);
      const result = validateAuthenticatorData(authData, rpIdHash);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("ERR_BAD_RP_ID");
    });

    it("should accept data with UP + UV flags (0x05)", () => {
      const authData = buildAuthenticatorData(rpIdHash, 0x05, 1);
      const result = validateAuthenticatorData(authData, rpIdHash);
      expect(result.valid).toBe(true);
    });

    it("should accept exactly 37 bytes (minimum valid)", () => {
      const authData = buildAuthenticatorData(rpIdHash, 0x01, 0);
      expect(authData.length).toBe(37);
      const result = validateAuthenticatorData(authData, rpIdHash);
      expect(result.valid).toBe(true);
    });

    it("should accept extended authenticator data (>37 bytes)", () => {
      const base = buildAuthenticatorData(rpIdHash, 0x01, 1);
      const extended = Buffer.concat([base, Buffer.alloc(16, 0xff)]);
      expect(extended.length).toBe(53);
      const result = validateAuthenticatorData(extended, rpIdHash);
      expect(result.valid).toBe(true);
    });
  });

  // -----------------------------------------------------------------------
  // Credential Isolation
  // -----------------------------------------------------------------------
  describe("Credential Isolation", () => {
    it("should allow cross-authentication for same environment", () => {
      const credA = makeCredential({ rpId: "localhost", environment: "dev" });
      const credB = makeCredential({ rpId: "localhost", environment: "dev" });
      expect(canCrossAuthenticate(credA, credB)).toBe(true);
    });

    it("should block cross-authentication across environments", () => {
      const dev = makeCredential({ rpId: "localhost", environment: "dev" });
      const testnet = makeCredential({
        rpId: "cine-x-iota.vercel.app",
        environment: "testnet",
      });
      expect(canCrossAuthenticate(dev, testnet)).toBe(false);
    });

    it("should block cross-authentication across RP IDs", () => {
      const a = makeCredential({ rpId: "localhost" });
      const b = makeCredential({ rpId: "cinex.app" });
      expect(canCrossAuthenticate(a, b)).toBe(false);
    });

    it("should validate credential for correct environment", () => {
      const cred = makeCredential({
        rpId: "localhost",
        environment: "dev",
      });
      expect(isCredentialValidForEnv(cred, "dev")).toBe(true);
    });

    it("should reject credential for wrong environment", () => {
      const cred = makeCredential({
        rpId: "localhost",
        environment: "dev",
      });
      expect(isCredentialValidForEnv(cred, "testnet")).toBe(false);
    });

    it("should reject disabled credential", () => {
      const cred = makeCredential({ enabled: false });
      expect(isCredentialValidForEnv(cred, "dev")).toBe(false);
    });
  });

  // -----------------------------------------------------------------------
  // Nonce Management
  // -----------------------------------------------------------------------
  describe("Nonce Management", () => {
    it("should accept matching nonce", () => {
      const result = validateNonce(5, 5);
      expect(result.valid).toBe(true);
    });

    it("should reject mismatched nonce", () => {
      const result = validateNonce(5, 6);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("ERR_BAD_NONCE");
    });

    it("should increment nonce correctly", () => {
      expect(incrementNonce(0)).toBe(1);
      expect(incrementNonce(42)).toBe(43);
    });

    it("should reject nonce 0 when expected 1 (replay)", () => {
      const result = validateNonce(0, 1);
      expect(result.valid).toBe(false);
    });
  });

  // -----------------------------------------------------------------------
  // Session Management
  // -----------------------------------------------------------------------
  describe("Session Management", () => {
    it("should create a valid session token", () => {
      const token = createSessionToken("ST...vault", "aa".repeat(33));
      expect(token.vaultAddress).toBe("ST...vault");
      expect(token.pubkeyHash).toHaveLength(64); // SHA-256 hex
      expect(token.expiresAt).toBeGreaterThan(token.issuedAt);
    });

    it("should validate a fresh session token", () => {
      const token = createSessionToken("ST...vault", "aa".repeat(33));
      const result = validateSessionToken(token);
      expect(result.valid).toBe(true);
    });

    it("should reject an expired session token", () => {
      const token = createSessionToken("ST...vault", "aa".repeat(33));
      const futureTime = token.expiresAt + 1;
      const result = validateSessionToken(token, futureTime);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("expired");
    });

    it("should accept a token within its valid window", () => {
      const token = createSessionToken("ST...vault", "aa".repeat(33));
      const midTime = token.issuedAt + 1000;
      const result = validateSessionToken(token, midTime);
      expect(result.valid).toBe(true);
    });

    it("should default max age to 24 hours", () => {
      const token = createSessionToken("ST...vault", "aa".repeat(33));
      const age = token.expiresAt - token.issuedAt;
      expect(age).toBe(24 * 60 * 60 * 1000);
    });

    it("should respect custom session config", () => {
      const token = createSessionToken("ST...vault", "aa".repeat(33), {
        maxAgeMs: 3600_000,
        reauthThresholdMicroStx: 1_000_000,
      });
      const age = token.expiresAt - token.issuedAt;
      expect(age).toBe(3600_000);
    });

    it("should require re-auth for large transfers", () => {
      expect(requiresReauth(100_000_000)).toBe(true); // 100 STX
    });

    it("should not require re-auth for small transfers", () => {
      expect(requiresReauth(1_000_000)).toBe(false); // 1 STX
    });

    it("should use default threshold of 10 STX", () => {
      expect(DEFAULT_SESSION_CONFIG.reauthThresholdMicroStx).toBe(10_000_000);
    });
  });

  // -----------------------------------------------------------------------
  // Recovery Flow
  // -----------------------------------------------------------------------
  describe("Recovery Flow", () => {
    it("should create a recovery request", () => {
      const req = createRecoveryRequest("02".repeat(33), "ST...admin");
      expect(req.status).toBe("proposed");
      expect(req.newPubkeyHex).toBe("02".repeat(33));
      expect(req.vetoWindowExpiresAt - req.proposedAt).toBe(
        RECOVERY_VETO_WINDOW_MS
      );
    });

    it("should have 72-hour veto window", () => {
      expect(RECOVERY_VETO_WINDOW_MS).toBe(72 * 60 * 60 * 1000);
    });

    it("should not be ready during veto window", () => {
      const req = createRecoveryRequest("02".repeat(33), "ST...admin");
      const duringWindow = req.proposedAt + 3600_000; // 1 hour later
      expect(isRecoveryReady(req, duringWindow)).toBe(false);
    });

    it("should be ready after veto window expires", () => {
      const req = createRecoveryRequest("02".repeat(33), "ST...admin");
      const afterWindow = req.vetoWindowExpiresAt + 1;
      expect(isRecoveryReady(req, afterWindow)).toBe(true);
    });

    it("should allow cancellation during veto window", () => {
      const req = createRecoveryRequest("02".repeat(33), "ST...admin");
      const duringWindow = req.proposedAt + 3600_000;
      expect(canCancelRecovery(req, duringWindow)).toBe(true);
    });

    it("should not allow cancellation after veto window", () => {
      const req = createRecoveryRequest("02".repeat(33), "ST...admin");
      const afterWindow = req.vetoWindowExpiresAt + 1;
      expect(canCancelRecovery(req, afterWindow)).toBe(false);
    });

    it("should not allow cancellation of executed recovery", () => {
      const req = createRecoveryRequest("02".repeat(33), "ST...admin");
      req.status = "executed";
      expect(canCancelRecovery(req)).toBe(false);
    });
  });
});
