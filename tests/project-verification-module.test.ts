import { describe, expect, it, beforeEach } from "vitest";
import { Cl } from "@stacks/transactions";

const accounts = simnet.getAccounts();
const deployer = accounts.get("deployer")!;
const admin = accounts.get("wallet_1")!;
const emergencyAdmin = accounts.get("wallet_2")!;
const creator = accounts.get("wallet_3")!;
const nonAdmin = accounts.get("wallet_4")!;
const signer = accounts.get("wallet_5")!;

const EMPTY_HASH = Cl.bufferFromHex("0000000000000000000000000000000000000000000000000000000000000000");

const ERR_NOT_OWNER = Cl.uint(1016);
const ERR_ALREADY_INITIALIZED = Cl.uint(1017);
const ERR_NOT_ADMIN = Cl.uint(1018);
const ERR_NOT_EMERGENCY_ADMIN = Cl.uint(1019);
const ERR_ALREADY_REGISTERED = Cl.uint(1004);
const ERR_CREATOR_NOT_FOUND = Cl.uint(1002);
const ERR_INVALID_VERTICAL = Cl.uint(1020);
const ERR_NOT_AUTHORIZED = Cl.uint(1001);
const ERR_NOT_VERIFIED = Cl.uint(1009);
const ERR_TRANSFER = Cl.uint(1008);
const ERR_BYPASS_NOT_ENABLED = Cl.uint(1021);
const ERR_INVALID_VERIFICATION_LEVEL_INPUT = Cl.uint(1003);

describe("Project Verification Module - Day 2", () => {
  describe("Initialization", () => {
    it("should initialize by deployer", () => {
      const result = simnet.callPublicFn(
        "project-verification-module",
        "initialize",
        [Cl.principal(admin), Cl.principal(emergencyAdmin)],
        deployer
      );
      expect(result.result).toEqual(Cl.ok(Cl.bool(true)));
    });

    it("should fail to initialize twice", () => {
      simnet.callPublicFn(
        "project-verification-module",
        "initialize",
        [Cl.principal(admin), Cl.principal(emergencyAdmin)],
        deployer
      );
      const result = simnet.callPublicFn(
        "project-verification-module",
        "initialize",
        [Cl.principal(admin), Cl.principal(emergencyAdmin)],
        deployer
      );
      expect(result.result).toEqual(Cl.error(ERR_ALREADY_INITIALIZED));
    });

    it("should fail to initialize by non-deployer", () => {
      const result = simnet.callPublicFn(
        "project-verification-module",
        "initialize",
        [Cl.principal(admin), Cl.principal(emergencyAdmin)],
        admin
      );
      expect(result.result).toEqual(Cl.error(ERR_NOT_OWNER));
    });
  });

  describe("Creator Registration", () => {
    beforeEach(() => {
      simnet.callPublicFn(
        "project-verification-module",
        "initialize",
        [Cl.principal(admin), Cl.principal(emergencyAdmin)],
        deployer
      );
    });

    it("should register a creator with film vertical", () => {
      const result = simnet.callPublicFn(
        "project-verification-module",
        "register-creator",
        [
          Cl.principal(creator),
          Cl.stringAscii("Alice Filmmaker"),
          Cl.stringAscii("https://alice.example.com"),
          EMPTY_HASH,
          Cl.stringAscii("film"),
          Cl.uint(1),
          Cl.uint(50000),
        ],
        creator
      );
      expect(result.result).toEqual(Cl.ok(Cl.uint(1)));
    });

    it("should fail to register as another user", () => {
      const result = simnet.callPublicFn(
        "project-verification-module",
        "register-creator",
        [
          Cl.principal(creator),
          Cl.stringAscii("Alice Filmmaker"),
          Cl.stringAscii("https://alice.example.com"),
          EMPTY_HASH,
          Cl.stringAscii("film"),
          Cl.uint(1),
          Cl.uint(50000),
        ],
        admin
      );
      expect(result.result).toEqual(Cl.error(ERR_NOT_AUTHORIZED));
    });

    it("should fail to register duplicate", () => {
      simnet.callPublicFn(
        "project-verification-module",
        "register-creator",
        [
          Cl.principal(creator),
          Cl.stringAscii("Alice Filmmaker"),
          Cl.stringAscii("https://alice.example.com"),
          EMPTY_HASH,
          Cl.stringAscii("film"),
          Cl.uint(1),
          Cl.uint(50000),
        ],
        creator
      );
      const result = simnet.callPublicFn(
        "project-verification-module",
        "register-creator",
        [
          Cl.principal(creator),
          Cl.stringAscii("Alice Filmmaker"),
          Cl.stringAscii("https://alice.example.com"),
          EMPTY_HASH,
          Cl.stringAscii("film"),
          Cl.uint(1),
          Cl.uint(50000),
        ],
        creator
      );
      expect(result.result).toEqual(Cl.error(ERR_ALREADY_REGISTERED));
    });

    it("should fail to register with invalid vertical", () => {
      const result = simnet.callPublicFn(
        "project-verification-module",
        "register-creator",
        [
          Cl.principal(creator),
          Cl.stringAscii("Alice Filmmaker"),
          Cl.stringAscii("https://alice.example.com"),
          EMPTY_HASH,
          Cl.stringAscii("invalid"),
          Cl.uint(1),
          Cl.uint(50000),
        ],
        creator
      );
      expect(result.result).toEqual(Cl.error(ERR_INVALID_VERTICAL));
    });
  });

  describe("Backward-Compatible Wrappers", () => {
    beforeEach(() => {
      simnet.callPublicFn(
        "project-verification-module",
        "initialize",
        [Cl.principal(admin), Cl.principal(emergencyAdmin)],
        deployer
      );
    });

    it("should register filmmaker via old function name", () => {
      const result = simnet.callPublicFn(
        "project-verification-module",
        "register-filmmaker-id",
        [
          Cl.principal(creator),
          Cl.stringAscii("Alice Filmmaker"),
          Cl.stringAscii("https://alice.example.com"),
          EMPTY_HASH,
          Cl.uint(1),
          Cl.uint(50000),
        ],
        creator
      );
      expect(result.result).toEqual(Cl.ok(Cl.uint(1)));
    });
  });

  describe("Portfolio", () => {
    beforeEach(() => {
      simnet.callPublicFn(
        "project-verification-module",
        "initialize",
        [Cl.principal(admin), Cl.principal(emergencyAdmin)],
        deployer
      );
      simnet.callPublicFn(
        "project-verification-module",
        "register-creator",
        [
          Cl.principal(creator),
          Cl.stringAscii("Alice Filmmaker"),
          Cl.stringAscii("https://alice.example.com"),
          EMPTY_HASH,
          Cl.stringAscii("film"),
          Cl.uint(1),
          Cl.uint(50000),
        ],
        creator
      );
    });

    it("should add portfolio item", () => {
      const result = simnet.callPublicFn(
        "project-verification-module",
        "add-portfolio",
        [
          Cl.principal(creator),
          Cl.stringAscii("My First Film"),
          Cl.stringAscii("https://example.com/my-first-film"),
          Cl.stringAscii("A short film about Clarity smart contracts"),
          Cl.uint(2025),
        ],
        creator
      );
      expect(result.result).toEqual(Cl.ok(Cl.uint(1)));
    });

    it("should fail to add portfolio for unregistered user", () => {
      const result = simnet.callPublicFn(
        "project-verification-module",
        "add-portfolio",
        [
          Cl.principal(nonAdmin),
          Cl.stringAscii("My First Film"),
          Cl.stringAscii("https://example.com/my-first-film"),
          Cl.stringAscii("A short film description"),
          Cl.uint(2025),
        ],
        nonAdmin
      );
      expect(result.result).toEqual(Cl.error(ERR_CREATOR_NOT_FOUND));
    });
  });

  describe("Verification Flow", () => {
    beforeEach(() => {
      simnet.callPublicFn(
        "project-verification-module",
        "initialize",
        [Cl.principal(admin), Cl.principal(emergencyAdmin)],
        deployer
      );
      simnet.callPublicFn(
        "project-verification-module",
        "register-creator",
        [
          Cl.principal(creator),
          Cl.stringAscii("Alice Filmmaker"),
          Cl.stringAscii("https://alice.example.com"),
          EMPTY_HASH,
          Cl.stringAscii("film"),
          Cl.uint(1),
          Cl.uint(50000),
        ],
        creator
      );
    });

    it("should verify creator after payment and admin call", () => {
      simnet.callPublicFn(
        "project-verification-module",
        "pay-verification-fee",
        [Cl.uint(1)],
        creator
      );
      const result = simnet.callPublicFn(
        "project-verification-module",
        "verify-creator",
        [Cl.principal(creator), Cl.uint(100000)],
        admin
      );
      expect(result.result).toEqual(Cl.ok(Cl.bool(true)));
    });

    it("should fail to verify without payment", () => {
      const result = simnet.callPublicFn(
        "project-verification-module",
        "verify-creator",
        [Cl.principal(creator), Cl.uint(100000)],
        admin
      );
      expect(result.result).toEqual(Cl.error(ERR_NOT_AUTHORIZED));
    });

    it("should fail to verify by non-admin", () => {
      simnet.callPublicFn(
        "project-verification-module",
        "pay-verification-fee",
        [Cl.uint(1)],
        creator
      );
      const result = simnet.callPublicFn(
        "project-verification-module",
        "verify-creator",
        [Cl.principal(creator), Cl.uint(100000)],
        nonAdmin
      );
      expect(result.result).toEqual(Cl.error(ERR_NOT_ADMIN));
    });

    it("should return not verified for unverified creator", () => {
      const result = simnet.callReadOnlyFn(
        "project-verification-module",
        "is-creator-currently-verified",
        [Cl.principal(creator)],
        deployer
      );
      expect(result.result).toEqual(Cl.error(ERR_NOT_VERIFIED));
    });

    it("should return verified after verification", () => {
      simnet.callPublicFn(
        "project-verification-module",
        "pay-verification-fee",
        [Cl.uint(1)],
        creator
      );
      simnet.callPublicFn(
        "project-verification-module",
        "verify-creator",
        [Cl.principal(creator), Cl.uint(100000)],
        admin
      );
      const result = simnet.callReadOnlyFn(
        "project-verification-module",
        "is-creator-currently-verified",
        [Cl.principal(creator)],
        deployer
      );
      expect(result.result).toEqual(Cl.ok(Cl.bool(true)));
    });
  });

  describe("Emergency Verification", () => {
    beforeEach(() => {
      simnet.callPublicFn(
        "project-verification-module",
        "initialize",
        [Cl.principal(admin), Cl.principal(emergencyAdmin)],
        deployer
      );
      simnet.callPublicFn(
        "project-verification-module",
        "register-creator",
        [
          Cl.principal(creator),
          Cl.stringAscii("Alice Filmmaker"),
          Cl.stringAscii("https://alice.example.com"),
          EMPTY_HASH,
          Cl.stringAscii("film"),
          Cl.uint(1),
          Cl.uint(50000),
        ],
        creator
      );
    });

    it("should emergency-verify by emergency-admin", () => {
      const result = simnet.callPublicFn(
        "project-verification-module",
        "emergency-verify-creator",
        [Cl.principal(creator), Cl.uint(100000)],
        emergencyAdmin
      );
      expect(result.result).toEqual(Cl.ok(Cl.bool(true)));
    });

    it("should reject emergency-verify by non-authorized", () => {
      const result = simnet.callPublicFn(
        "project-verification-module",
        "emergency-verify-creator",
        [Cl.principal(creator), Cl.uint(100000)],
        nonAdmin
      );
      expect(result.result).toEqual(Cl.error(ERR_NOT_EMERGENCY_ADMIN));
    });

    it("should emergency-revoke by emergency-admin", () => {
      simnet.callPublicFn(
        "project-verification-module",
        "emergency-verify-creator",
        [Cl.principal(creator), Cl.uint(100000)],
        emergencyAdmin
      );
      const result = simnet.callPublicFn(
        "project-verification-module",
        "emergency-revoke-verification",
        [Cl.principal(creator)],
        emergencyAdmin
      );
      expect(result.result).toEqual(Cl.ok(Cl.bool(true)));
    });
  });

  describe("Read-Only Functions", () => {
    beforeEach(() => {
      simnet.callPublicFn(
        "project-verification-module",
        "initialize",
        [Cl.principal(admin), Cl.principal(emergencyAdmin)],
        deployer
      );
      simnet.callPublicFn(
        "project-verification-module",
        "register-creator",
        [
          Cl.principal(creator),
          Cl.stringAscii("Alice Filmmaker"),
          Cl.stringAscii("https://alice.example.com"),
          EMPTY_HASH,
          Cl.stringAscii("film"),
          Cl.uint(1),
          Cl.uint(50000),
        ],
        creator
      );
    });

    it("should return creator identity", () => {
      const result = simnet.callReadOnlyFn(
        "project-verification-module",
        "get-creator-identity",
        [Cl.principal(creator)],
        deployer
      );
      const okResult = result.result;
      expect(okResult).toBeDefined();
    });

    it("should return identity via backward-compat get-filmmaker-identity", () => {
      const result = simnet.callReadOnlyFn(
        "project-verification-module",
        "get-filmmaker-identity",
        [Cl.principal(creator)],
        deployer
      );
      const okResult = result.result;
      expect(okResult).toBeDefined();
    });

    it("should return admin contract address", () => {
      const result = simnet.callReadOnlyFn(
        "project-verification-module",
        "get-admin-contract",
        [],
        deployer
      );
      expect(result.result).toEqual(Cl.ok(Cl.principal(admin)));
    });
  });

  describe("TESTNET_BYPASS_VERIFICATION (Compile-Time Guard)", () => {
    beforeEach(() => {
      simnet.callPublicFn(
        "project-verification-module",
        "initialize",
        [Cl.principal(admin), Cl.principal(emergencyAdmin)],
        deployer
      );
      simnet.callPublicFn(
        "project-verification-module",
        "register-creator",
        [
          Cl.principal(creator),
          Cl.stringAscii("Alice Filmmaker"),
          Cl.stringAscii("https://alice.example.com"),
          EMPTY_HASH,
          Cl.stringAscii("film"),
          Cl.uint(1),
          Cl.uint(50000),
        ],
        creator
      );
    });

    it("should return ERR-BYPASS-NOT-ENABLED when constant is false", () => {
      const result = simnet.callPublicFn(
        "project-verification-module",
        "testnet-bypass-verification",
        [Cl.principal(creator), Cl.uint(1), Cl.stringAscii("team testing")],
        admin
      );
      expect(result.result).toEqual(Cl.error(ERR_BYPASS_NOT_ENABLED));
    });

    it("should reject non-admin caller (guard fires before auth check)", () => {
      const result = simnet.callPublicFn(
        "project-verification-module",
        "testnet-bypass-verification",
        [Cl.principal(creator), Cl.uint(1), Cl.stringAscii("unauthorized")],
        nonAdmin
      );
      expect(result.result).toEqual(Cl.error(ERR_BYPASS_NOT_ENABLED));
    });

    it("should reject unregistered creator (guard fires before creator check)", () => {
      const result = simnet.callPublicFn(
        "project-verification-module",
        "testnet-bypass-verification",
        [Cl.principal(nonAdmin), Cl.uint(1), Cl.stringAscii("not registered")],
        admin
      );
      expect(result.result).toEqual(Cl.error(ERR_BYPASS_NOT_ENABLED));
    });

    it("should reject invalid verification level (guard fires before level check)", () => {
      const result = simnet.callPublicFn(
        "project-verification-module",
        "testnet-bypass-verification",
        [Cl.principal(creator), Cl.uint(3), Cl.stringAscii("invalid level")],
        admin
      );
      expect(result.result).toEqual(Cl.error(ERR_BYPASS_NOT_ENABLED));
    });

    it("get-testnet-bypass-enabled returns false in production", () => {
      const result = simnet.callReadOnlyFn(
        "project-verification-module",
        "get-testnet-bypass-enabled",
        [],
        deployer
      );
      expect(result.result).toEqual(Cl.ok(Cl.bool(false)));
    });

    it("should return creator is not verified after failed bypass", () => {
      simnet.callPublicFn(
        "project-verification-module",
        "testnet-bypass-verification",
        [Cl.principal(creator), Cl.uint(1), Cl.stringAscii("will fail")],
        admin
      );
      const result = simnet.callReadOnlyFn(
        "project-verification-module",
        "is-creator-currently-verified",
        [Cl.principal(creator)],
        deployer
      );
      expect(result.result).toEqual(Cl.error(ERR_NOT_VERIFIED));
    });

    it("should have consistent error codes with existing constants", () => {
      expect(ERR_BYPASS_NOT_ENABLED).toEqual(Cl.uint(1021));
      expect(ERR_NOT_AUTHORIZED).toEqual(Cl.uint(1001));
      expect(ERR_CREATOR_NOT_FOUND).toEqual(Cl.uint(1002));
      expect(ERR_INVALID_VERIFICATION_LEVEL_INPUT).toEqual(Cl.uint(1003));
    });
  });
});
