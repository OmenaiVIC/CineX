import { describe, expect, it, beforeEach } from "vitest";
import { Cl } from "@stacks/transactions";

const accounts = simnet.getAccounts();
const deployer = accounts.get("deployer")!;
const admin = accounts.get("wallet_1")!;
const emergencyAdmin = accounts.get("wallet_2")!;
const signer = accounts.get("wallet_3")!;
const nonAdmin = accounts.get("wallet_4")!;

const STALE_THRESHOLD = 144;
const ERR_NOT_ADMIN = Cl.uint(5100);
const ERR_NOT_EMERGENCY_ADMIN = Cl.uint(5101);
const ERR_STALE_PRICE = Cl.uint(5102);
const ERR_INVALID_PRICE = Cl.uint(5103);
const ERR_ALREADY_INITIALIZED = Cl.uint(5104);
const ERR_NOT_OWNER = Cl.uint(5105);

describe("Oracle Proxy - Day 2", () => {
  describe("Initialization", () => {
    it("should initialize by deployer", () => {
      const result = simnet.callPublicFn(
        "oracle-proxy",
        "initialize",
        [Cl.principal(admin), Cl.principal(emergencyAdmin)],
        deployer
      );
      expect(result.result).toEqual(Cl.ok(Cl.bool(true)));
    });

    it("should fail to initialize twice", () => {
      simnet.callPublicFn(
        "oracle-proxy",
        "initialize",
        [Cl.principal(admin), Cl.principal(emergencyAdmin)],
        deployer
      );
      const result = simnet.callPublicFn(
        "oracle-proxy",
        "initialize",
        [Cl.principal(admin), Cl.principal(emergencyAdmin)],
        deployer
      );
      expect(result.result).toEqual(Cl.error(ERR_ALREADY_INITIALIZED));
    });

    it("should fail to initialize by non-deployer", () => {
      const result = simnet.callPublicFn(
        "oracle-proxy",
        "initialize",
        [Cl.principal(admin), Cl.principal(emergencyAdmin)],
        admin
      );
      expect(result.result).toEqual(Cl.error(ERR_NOT_OWNER));
    });
  });

  describe("Price Management", () => {
    beforeEach(() => {
      simnet.callPublicFn(
        "oracle-proxy",
        "initialize",
        [Cl.principal(admin), Cl.principal(emergencyAdmin)],
        deployer
      );
    });

    it("should allow admin to update price", () => {
      const result = simnet.callPublicFn(
        "oracle-proxy",
        "update-price",
        [Cl.uint(150)],
        admin
      );
      expect(result.result).toEqual(Cl.ok(Cl.bool(true)));
    });

    it("should reject update by non-admin", () => {
      const result = simnet.callPublicFn(
        "oracle-proxy",
        "update-price",
        [Cl.uint(150)],
        nonAdmin
      );
      expect(result.result).toEqual(Cl.error(ERR_NOT_ADMIN));
    });

    it("should reject update with zero price", () => {
      const result = simnet.callPublicFn(
        "oracle-proxy",
        "update-price",
        [Cl.uint(0)],
        admin
      );
      expect(result.result).toEqual(Cl.error(ERR_INVALID_PRICE));
    });

    it("should allow emergency-admin to set price", () => {
      const result = simnet.callPublicFn(
        "oracle-proxy",
        "emergency-set-price",
        [Cl.uint(200)],
        emergencyAdmin
      );
      expect(result.result).toEqual(Cl.ok(Cl.bool(true)));
    });

    it("should allow multi-sig signer to set price via is-approved", () => {
      simnet.callPublicFn(
        "cinex-multisig",
        "initialize",
        [Cl.principal(signer), Cl.principal(emergencyAdmin), Cl.principal(deployer)],
        deployer
      );
      const result = simnet.callPublicFn(
        "oracle-proxy",
        "emergency-set-price",
        [Cl.uint(200)],
        signer
      );
      expect(result.result).toEqual(Cl.ok(Cl.bool(true)));
    });

    it("should reject emergency set by non-authorized", () => {
      const result = simnet.callPublicFn(
        "oracle-proxy",
        "emergency-set-price",
        [Cl.uint(200)],
        nonAdmin
      );
      expect(result.result).toEqual(Cl.error(ERR_NOT_EMERGENCY_ADMIN));
    });
  });

  describe("Read-Only Functions", () => {
    beforeEach(() => {
      simnet.callPublicFn(
        "oracle-proxy",
        "initialize",
        [Cl.principal(admin), Cl.principal(emergencyAdmin)],
        deployer
      );
    });

    it("should return current price", () => {
      const result = simnet.callReadOnlyFn(
        "oracle-proxy",
        "get-stx-price",
        [],
        deployer
      );
      expect(result.result).toEqual(Cl.ok(Cl.uint(0)));
    });

    it("should return price with fallback when fresh", () => {
      simnet.callPublicFn(
        "oracle-proxy",
        "update-price",
        [Cl.uint(150)],
        admin
      );
      const result = simnet.callReadOnlyFn(
        "oracle-proxy",
        "get-stx-price-with-fallback",
        [],
        deployer
      );
      expect(result.result).toEqual(Cl.ok(Cl.uint(150)));
    });
  });

  describe("Admin Contract", () => {
    beforeEach(() => {
      simnet.callPublicFn(
        "oracle-proxy",
        "initialize",
        [Cl.principal(admin), Cl.principal(emergencyAdmin)],
        deployer
      );
    });

    it("should return admin contract address", () => {
      const result = simnet.callReadOnlyFn(
        "oracle-proxy",
        "get-admin-contract",
        [],
        deployer
      );
      expect(result.result).toEqual(Cl.ok(Cl.principal(admin)));
    });
  });
});
