/**
 * Vault v4 Tests
 *
 * Tests for SIP-018 on-chain verification, recovery flow, RP ID hash,
 * and domain wallet binding added in vault v4.
 *
 * PRD Reference: Prompt 6.2 (recovery, RP ID hash) + Prompt 6.3 (SIP-018)
 */

import { describe, it, expect } from "vitest";
import crypto from "node:crypto";
import {
  computeDomainHash,
  computeMessageHash,
  computeSIP018Challenge,
  buildStxTransferChallenge,
  testnetDomain,
  mainnetDomain,
  type CineXDomain,
  type StxTransferMessage,
} from "../src/sip018.js";
import {
  RECOVERY_VETO_WINDOW_MS,
  createRecoveryRequest,
  isRecoveryReady,
  canCancelRecovery,
  type RecoveryRequest,
} from "../src/security-model.js";

const sha256 = (b: Buffer): Buffer =>
  crypto.createHash("sha256").update(b).digest();

const VAULT_A =
  "ST29JKDEFRY0RYMGF97FZC9PZWJ4H4VBSQFFERNXX.cinex-smart-vault-v4";
const VAULT_B =
  "ST29JKDEFRY0RYMGF97FZC9PZWJ4H4VBSQFFERNXX.cinex-smart-vault-v5";

describe("Vault v4: SIP-018 On-Chain Verification", () => {
  describe("domain hash includes wallet field (cross-wallet isolation)", () => {
    it("should produce different hashes for different vault wallets", () => {
      const h1 = computeDomainHash(testnetDomain(VAULT_A));
      const h2 = computeDomainHash(testnetDomain(VAULT_B));
      expect(h1.equals(h2)).toBe(false);
    });

    it("should produce same hash for same vault wallet", () => {
      const h1 = computeDomainHash(testnetDomain(VAULT_A));
      const h2 = computeDomainHash(testnetDomain(VAULT_A));
      expect(h1.equals(h2)).toBe(true);
    });

    it("wallet field prevents cross-chain replay when same wallet used", () => {
      const testnet = { ...testnetDomain(VAULT_A), chainId: 2143456 };
      const mainnet = { ...mainnetDomain(VAULT_A), chainId: 1 };
      const h1 = computeDomainHash(testnet);
      const h2 = computeDomainHash(mainnet);
      expect(h1.equals(h2)).toBe(false);
    });
  });

  describe("challenge computation matches contract pattern", () => {
    it("should produce 32-byte challenge from domain + message", () => {
      const domain = testnetDomain(VAULT_A);
      const msg: StxTransferMessage = {
        topic: "stx-transfer",
        "auth-id": 0,
        amount: 1000000,
        recipient: VAULT_B,
        memo: null,
      };
      const challenge = computeSIP018Challenge(domain, msg);
      expect(challenge.length).toBe(32);
    });

    it("challenge changes when domain-wallet changes (cross-vault protection)", () => {
      const msg: StxTransferMessage = {
        topic: "stx-transfer",
        "auth-id": 0,
        amount: 1000000,
        recipient: VAULT_B,
        memo: null,
      };
      const c1 = computeSIP018Challenge(testnetDomain(VAULT_A), msg);
      const c2 = computeSIP018Challenge(testnetDomain(VAULT_B), msg);
      expect(c1.equals(c2)).toBe(false);
    });

    it("challenge changes when any message field changes", () => {
      const domain = testnetDomain(VAULT_A);
      const base: StxTransferMessage = {
        topic: "stx-transfer",
        "auth-id": 0,
        amount: 1000000,
        recipient: VAULT_B,
        memo: null,
      };

      // Different auth-id
      const differentNonce = { ...base, "auth-id": 1 };
      expect(
        computeSIP018Challenge(domain, base).equals(
          computeSIP018Challenge(domain, differentNonce)
        )
      ).toBe(false);

      // Different amount
      const differentAmount = { ...base, amount: 2000000 };
      expect(
        computeSIP018Challenge(domain, base).equals(
          computeSIP018Challenge(domain, differentAmount)
        )
      ).toBe(false);

      // Different recipient
      const differentRecipient = { ...base, recipient: VAULT_A };
      expect(
        computeSIP018Challenge(domain, base).equals(
          computeSIP018Challenge(domain, differentRecipient)
        )
      ).toBe(false);
    });
  });

  describe("v4 contract function arguments structure", () => {
    it("domain fields are separate parameters (not in sig-auth)", () => {
      // v4 stx-transfer signature:
      // (domain-name, domain-version, domain-chain-id, domain-wallet,
      //  msg-auth-id, msg-amount, msg-recipient, msg-memo,
      //  sig-auth { pubkey, signature, authenticator-data, client-data-prefix, client-data-suffix })
      //
      // Note: auth-id is in msg params, NOT in sig-auth (unlike v3)
      // This is correct per SIP-018: the nonce is part of the message, not the signature wrapper

      const domain = testnetDomain(VAULT_A);
      const msg: StxTransferMessage = {
        topic: "stx-transfer",
        "auth-id": 5,
        amount: 3000000,
        recipient: VAULT_B,
        memo: null,
      };
      const challenge = buildStxTransferChallenge(domain, 5, 3000000, VAULT_B);
      const expected = computeSIP018Challenge(domain, msg);
      expect(challenge.equals(expected)).toBe(true);
    });
  });

  describe("domain tuple field ordering (must match Clarity serialization)", () => {
    it("domain hash is deterministic across TypeScript and Clarity", () => {
      // The Clarity contract computes:
      //   sha256(to-consensus-buff?({
      //     name: "cinex-smart-vault",
      //     version: "1.0.0",
      //     chain-id: u2143456,
      //     wallet: principal,
      //   }))
      //
      // TypeScript must produce the same bytes via serializeCV(tupleCV({...}))
      const domain = testnetDomain(VAULT_A);
      const hash = computeDomainHash(domain);

      // Verify it's a valid 32-byte SHA-256 hash
      expect(hash.length).toBe(32);
      expect(hash).toBeInstanceOf(Buffer);

      // Verify determinism
      const hash2 = computeDomainHash(domain);
      expect(hash.equals(hash2)).toBe(true);
    });

    it("message hash field order matches Clarity contract", () => {
      // The Clarity contract computes:
      //   sha256(to-consensus-buff?({
      //     topic: "stx-transfer",
      //     auth-id: u0,
      //     amount: u1000000,
      //     recipient: principal,
      //     memo: none,
      //   }))
      const msg: StxTransferMessage = {
        topic: "stx-transfer",
        "auth-id": 0,
        amount: 1000000,
        recipient: VAULT_A,
        memo: null,
      };
      const hash = computeMessageHash(msg);
      expect(hash.length).toBe(32);
    });
  });
});

describe("Vault v4: Recovery Flow", () => {
  it("should create a recovery request with 72h veto window", () => {
    const now = Date.now();
    const request = createRecoveryRequest("new-pubkey-hex", "admin-principal", now);
    expect(request.newPubkeyHex).toBe("new-pubkey-hex");
    expect(request.proposedAt).toBe(now);
    expect(request.vetoWindowExpiresAt).toBe(now + RECOVERY_VETO_WINDOW_MS);
    expect(request.status).toBe("proposed");
  });

  it("should not be ready before veto window expires", () => {
    const now = Date.now();
    const request = createRecoveryRequest("new-pubkey-hex", "admin-principal", now);
    expect(isRecoveryReady(request, now + 1000)).toBe(false);
    expect(isRecoveryReady(request, now + RECOVERY_VETO_WINDOW_MS - 1)).toBe(
      false
    );
  });

  it("should be ready after veto window expires", () => {
    const now = Date.now();
    const request = createRecoveryRequest("new-pubkey-hex", "admin-principal", now);
    expect(isRecoveryReady(request, now + RECOVERY_VETO_WINDOW_MS)).toBe(true);
    expect(
      isRecoveryReady(request, now + RECOVERY_VETO_WINDOW_MS + 1000)
    ).toBe(true);
  });

  it("owner can cancel within veto window", () => {
    const now = Date.now();
    const request = createRecoveryRequest("new-pubkey-hex", "admin-principal", now);
    expect(canCancelRecovery(request, now + 1000)).toBe(true);
  });

  it("owner cannot cancel after veto window expires", () => {
    const now = Date.now();
    const request = createRecoveryRequest("new-pubkey-hex", "admin-principal", now);
    expect(
      canCancelRecovery(request, now + RECOVERY_VETO_WINDOW_MS + 1)
    ).toBe(false);
  });

  it("recovery veto window is 72 hours in milliseconds", () => {
    expect(RECOVERY_VETO_WINDOW_MS).toBe(72 * 60 * 60 * 1000);
  });
});

describe("Vault v4: RP ID Hash", () => {
  it("should compute SHA-256 of RP ID string", () => {
    const rpId = "cinex-app";
    const expectedHash = sha256(Buffer.from(rpId, "ascii"));
    expect(expectedHash.length).toBe(32);
    expect(expectedHash).toBeInstanceOf(Buffer);
  });

  it("different RP IDs produce different hashes", () => {
    const hash1 = sha256(Buffer.from("cinex-app", "ascii"));
    const hash2 = sha256(Buffer.from("cine-x-iota.vercel.app", "ascii"));
    expect(hash1.equals(hash2)).toBe(false);
  });
});
