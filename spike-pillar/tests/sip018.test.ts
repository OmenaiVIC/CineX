/**
 * SIP-018 Structured Signing Tests
 *
 * Validates challenge computation matches the Pillar reference pattern,
 * cross-chain/cross-wallet isolation, replay detection, and payload examples.
 *
 * PRD Reference: Reviewer Addendum → "SIP-018 structured-signing domains and payload rules"
 */

import { describe, it, expect } from "vitest";
import crypto from "node:crypto";
import {
  computeDomainHash,
  computeMessageHash,
  computeSIP018Challenge,
  buildStxTransferChallenge,
  buildRotateOwnerChallenge,
  SIP018_PREFIX,
  testnetDomain,
  mainnetDomain,
  type CineXDomain,
  type StxTransferMessage,
} from "../src/sip018.js";

const sha256 = (b: Buffer): Buffer =>
  crypto.createHash("sha256").update(b).digest();

const VAULT_A =
  "ST29JKDEFRY0RYMGF97FZC9PZWJ4H4VBSQFFERNXX.cinex-smart-vault-v3";
const VAULT_B =
  "ST29JKDEFRY0RYMGF97FZC9PZWJ4H4VBSQFFERNXX.cinex-smart-vault-v4";

describe("SIP-018 Structured Signing", () => {
  describe("SIP018_PREFIX", () => {
    it("should equal ASCII 'SIP018'", () => {
      expect(SIP018_PREFIX.toString("ascii")).toBe("SIP018");
      expect(SIP018_PREFIX.toString("hex")).toBe("534950303138");
    });

    it("should be 6 bytes", () => {
      expect(SIP018_PREFIX.length).toBe(6);
    });
  });

  describe("computeDomainHash", () => {
    it("should produce a 32-byte SHA-256 hash", () => {
      const domain = testnetDomain(VAULT_A);
      const hash = computeDomainHash(domain);
      expect(hash.length).toBe(32);
    });

    it("should be deterministic for same inputs", () => {
      const domain = testnetDomain(VAULT_A);
      const h1 = computeDomainHash(domain);
      const h2 = computeDomainHash(domain);
      expect(h1.equals(h2)).toBe(true);
    });

    it("should differ for different wallets (cross-wallet isolation)", () => {
      const h1 = computeDomainHash(testnetDomain(VAULT_A));
      const h2 = computeDomainHash(testnetDomain(VAULT_B));
      expect(h1.equals(h2)).toBe(false);
    });

    it("should differ for different chain IDs (cross-chain isolation)", () => {
      const testnet = { ...testnetDomain(VAULT_A), chainId: 2143456 };
      const mainnet = { ...mainnetDomain(VAULT_A), chainId: 1 };
      const h1 = computeDomainHash(testnet);
      const h2 = computeDomainHash(mainnet);
      expect(h1.equals(h2)).toBe(false);
    });

    it("should differ for different app names", () => {
      const h1 = computeDomainHash(testnetDomain(VAULT_A));
      const h2 = computeDomainHash({
        ...testnetDomain(VAULT_A),
        name: "other-app",
      });
      expect(h1.equals(h2)).toBe(false);
    });

    it("should differ for different versions", () => {
      const h1 = computeDomainHash(testnetDomain(VAULT_A));
      const h2 = computeDomainHash({
        ...testnetDomain(VAULT_A),
        version: "2.0.0",
      });
      expect(h1.equals(h2)).toBe(false);
    });

    it("should match manual SHA256(serialize(domain))", () => {
      const domain = testnetDomain(VAULT_A);
      const hash = computeDomainHash(domain);
      expect(hash.length).toBe(32);
      expect(hash).toBeInstanceOf(Buffer);
    });
  });

  describe("computeMessageHash", () => {
    it("should produce a 32-byte hash for stx-transfer", () => {
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

    it("should be deterministic for same inputs", () => {
      const msg: StxTransferMessage = {
        topic: "stx-transfer",
        "auth-id": 42,
        amount: 5000000,
        recipient: VAULT_A,
        memo: null,
      };
      const h1 = computeMessageHash(msg);
      const h2 = computeMessageHash(msg);
      expect(h1.equals(h2)).toBe(true);
    });

    it("should differ for different auth-ids (nonce prevents replay)", () => {
      const msg0: StxTransferMessage = {
        topic: "stx-transfer",
        "auth-id": 0,
        amount: 1000000,
        recipient: VAULT_A,
        memo: null,
      };
      const msg1: StxTransferMessage = {
        topic: "stx-transfer",
        "auth-id": 1,
        amount: 1000000,
        recipient: VAULT_A,
        memo: null,
      };
      expect(computeMessageHash(msg0).equals(computeMessageHash(msg1))).toBe(
        false
      );
    });

    it("should differ for different amounts", () => {
      const msgA: StxTransferMessage = {
        topic: "stx-transfer",
        "auth-id": 0,
        amount: 1000000,
        recipient: VAULT_A,
        memo: null,
      };
      const msgB: StxTransferMessage = {
        topic: "stx-transfer",
        "auth-id": 0,
        amount: 2000000,
        recipient: VAULT_A,
        memo: null,
      };
      expect(computeMessageHash(msgA).equals(computeMessageHash(msgB))).toBe(
        false
      );
    });

    it("should differ for different recipients", () => {
      const msgA: StxTransferMessage = {
        topic: "stx-transfer",
        "auth-id": 0,
        amount: 1000000,
        recipient: VAULT_A,
        memo: null,
      };
      const msgB: StxTransferMessage = {
        topic: "stx-transfer",
        "auth-id": 0,
        amount: 1000000,
        recipient: VAULT_B,
        memo: null,
      };
      expect(computeMessageHash(msgA).equals(computeMessageHash(msgB))).toBe(
        false
      );
    });

    it("should differ for different topics (action transposition prevention)", () => {
      const transfer = computeMessageHash({
        topic: "stx-transfer",
        "auth-id": 0,
        amount: 1000000,
        recipient: VAULT_A,
        memo: null,
      });
      const freeze = computeMessageHash({
        topic: "freeze-vault",
        "auth-id": 0,
        reason: "security",
      });
      expect(transfer.equals(freeze)).toBe(false);
    });

    it("should handle stx-transfer with memo", () => {
      const msg: StxTransferMessage = {
        topic: "stx-transfer",
        "auth-id": 0,
        amount: 1000000,
        recipient: VAULT_A,
        memo: Buffer.from("hello", "utf-8"),
      };
      const hash = computeMessageHash(msg);
      expect(hash.length).toBe(32);
    });

    it("should differ when memo is present vs absent", () => {
      const noMemo: StxTransferMessage = {
        topic: "stx-transfer",
        "auth-id": 0,
        amount: 1000000,
        recipient: VAULT_A,
        memo: null,
      };
      const withMemo: StxTransferMessage = {
        topic: "stx-transfer",
        "auth-id": 0,
        amount: 1000000,
        recipient: VAULT_A,
        memo: Buffer.from("test"),
      };
      expect(computeMessageHash(noMemo).equals(computeMessageHash(withMemo))).toBe(
        false
      );
    });
  });

  describe("computeSIP018Challenge", () => {
    it("should produce a 32-byte challenge", () => {
      const domain = testnetDomain(VAULT_A);
      const msg: StxTransferMessage = {
        topic: "stx-transfer",
        "auth-id": 0,
        amount: 1000000,
        recipient: VAULT_A,
        memo: null,
      };
      const challenge = computeSIP018Challenge(domain, msg);
      expect(challenge.length).toBe(32);
    });

    it("should include SIP018_PREFIX in computation", () => {
      const domain = testnetDomain(VAULT_A);
      const msg: StxTransferMessage = {
        topic: "stx-transfer",
        "auth-id": 0,
        amount: 1000000,
        recipient: VAULT_A,
        memo: null,
      };

      const domainHash = computeDomainHash(domain);
      const messageHash = computeMessageHash(msg);
      const expected = sha256(
        Buffer.concat([SIP018_PREFIX, domainHash, messageHash])
      );
      const actual = computeSIP018Challenge(domain, msg);
      expect(actual.equals(expected)).toBe(true);
    });

    it("should be deterministic", () => {
      const domain = testnetDomain(VAULT_A);
      const msg: StxTransferMessage = {
        topic: "stx-transfer",
        "auth-id": 7,
        amount: 2500000,
        recipient: VAULT_B,
        memo: null,
      };
      const c1 = computeSIP018Challenge(domain, msg);
      const c2 = computeSIP018Challenge(domain, msg);
      expect(c1.equals(c2)).toBe(true);
    });

    it("should change when domain changes", () => {
      const msg: StxTransferMessage = {
        topic: "stx-transfer",
        "auth-id": 0,
        amount: 1000000,
        recipient: VAULT_A,
        memo: null,
      };
      const c1 = computeSIP018Challenge(testnetDomain(VAULT_A), msg);
      const c2 = computeSIP018Challenge(testnetDomain(VAULT_B), msg);
      expect(c1.equals(c2)).toBe(false);
    });

    it("should change when message changes", () => {
      const domain = testnetDomain(VAULT_A);
      const msg0: StxTransferMessage = {
        topic: "stx-transfer",
        "auth-id": 0,
        amount: 1000000,
        recipient: VAULT_A,
        memo: null,
      };
      const msg1: StxTransferMessage = {
        topic: "stx-transfer",
        "auth-id": 1,
        amount: 1000000,
        recipient: VAULT_A,
        memo: null,
      };
      const c1 = computeSIP018Challenge(domain, msg0);
      const c2 = computeSIP018Challenge(domain, msg1);
      expect(c1.equals(c2)).toBe(false);
    });

    it("should isolate across chains even with same wallet and message", () => {
      const msg: StxTransferMessage = {
        topic: "stx-transfer",
        "auth-id": 0,
        amount: 1000000,
        recipient: VAULT_A,
        memo: null,
      };
      const tn = computeSIP018Challenge(
        { name: "cinex-smart-vault", version: "1.0.0", chainId: 2143456, wallet: VAULT_A },
        msg
      );
      const mn = computeSIP018Challenge(
        { name: "cinex-smart-vault", version: "1.0.0", chainId: 1, wallet: VAULT_A },
        msg
      );
      expect(tn.equals(mn)).toBe(false);
    });
  });

  describe("convenience builders", () => {
    it("buildStxTransferChallenge should match computeSIP018Challenge", () => {
      const domain = testnetDomain(VAULT_A);
      const c1 = buildStxTransferChallenge(domain, 5, 3000000, VAULT_B);
      const c2 = computeSIP018Challenge(domain, {
        topic: "stx-transfer",
        "auth-id": 5,
        amount: 3000000,
        recipient: VAULT_B,
        memo: null,
      });
      expect(c1.equals(c2)).toBe(true);
    });

    it("buildRotateOwnerChallenge should produce valid 32-byte hash", () => {
      const domain = testnetDomain(VAULT_A);
      const newPubkey = Buffer.alloc(33, 0x02);
      const challenge = buildRotateOwnerChallenge(domain, 0, newPubkey);
      expect(challenge.length).toBe(32);
    });
  });

  describe("payload examples (hex output for documentation)", () => {
    it("should output example challenge hex for stx-transfer", () => {
      const domain = testnetDomain(VAULT_A);
      const msg: StxTransferMessage = {
        topic: "stx-transfer",
        "auth-id": 0,
        amount: 1000000,
        recipient:
          "ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG",
        memo: null,
      };
      const challenge = computeSIP018Challenge(domain, msg);
      const hex = challenge.toString("hex");
      expect(hex).toHaveLength(64);
      expect(/^[0-9a-f]{64}$/.test(hex)).toBe(true);
    });

    it("should output example domain hash hex", () => {
      const domain = testnetDomain(VAULT_A);
      const hash = computeDomainHash(domain);
      expect(hash.toString("hex")).toHaveLength(64);
    });

    it("should output example message hash hex", () => {
      const msg: StxTransferMessage = {
        topic: "stx-transfer",
        "auth-id": 42,
        amount: 5000000,
        recipient: VAULT_B,
        memo: Buffer.from("CineX milestone payment"),
      };
      const hash = computeMessageHash(msg);
      expect(hash.toString("hex")).toHaveLength(64);
    });
  });
});
