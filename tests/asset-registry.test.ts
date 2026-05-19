import { describe, expect, it, beforeEach } from "vitest";
import { Cl } from "@stacks/transactions";

const accounts = simnet.getAccounts();
const deployer = accounts.get("deployer")!;
const admin = accounts.get("wallet_1")!;
const emergencyAdmin = accounts.get("wallet_2")!;
const nonAdmin = accounts.get("wallet_3")!;
const sbtcContract = accounts.get("wallet_4")!;
const usdcxContract = accounts.get("wallet_5")!;

const STX_PRINCIPAL = "SP000000000000000000002Q6VF78";

const ERR_NOT_ADMIN = Cl.uint(5000);
const ERR_ASSET_ALREADY_EXISTS = Cl.uint(5001);
const ERR_ASSET_NOT_FOUND = Cl.uint(5002);
const ERR_ASSET_DISABLED = Cl.uint(5003);
const ERR_NOT_EMERGENCY_ADMIN = Cl.uint(5004);
const ERR_CANNOT_REMOVE_STX = Cl.uint(5005);
const ERR_INVALID_DECIMALS = Cl.uint(5006);
const ERR_ALREADY_INITIALIZED = Cl.uint(5007);
const ERR_NOT_OWNER = Cl.uint(5008);
const ERR_EMPTY_NAME = Cl.uint(5009);

describe("Asset Registry - Day 1", () => {
  describe("Initialization", () => {
    it("should initialize by deployer with seed assets", () => {
      const result = simnet.callPublicFn(
        "asset-registry",
        "initialize",
        [
          Cl.principal(admin),
          Cl.principal(emergencyAdmin),
          Cl.principal(sbtcContract),
          Cl.principal(usdcxContract),
        ],
        deployer
      );
      expect(result.result).toEqual(Cl.ok(Cl.bool(true)));
    });

    it("should fail to initialize twice", () => {
      simnet.callPublicFn(
        "asset-registry",
        "initialize",
        [
          Cl.principal(admin),
          Cl.principal(emergencyAdmin),
          Cl.principal(sbtcContract),
          Cl.principal(usdcxContract),
        ],
        deployer
      );
      const result = simnet.callPublicFn(
        "asset-registry",
        "initialize",
        [
          Cl.principal(admin),
          Cl.principal(emergencyAdmin),
          Cl.principal(sbtcContract),
          Cl.principal(usdcxContract),
        ],
        deployer
      );
      expect(result.result).toEqual(Cl.error(ERR_ALREADY_INITIALIZED));
    });

    it("should fail to initialize by non-deployer", () => {
      const result = simnet.callPublicFn(
        "asset-registry",
        "initialize",
        [
          Cl.principal(admin),
          Cl.principal(emergencyAdmin),
          Cl.principal(sbtcContract),
          Cl.principal(usdcxContract),
        ],
        admin
      );
      expect(result.result).toEqual(Cl.error(ERR_NOT_OWNER));
    });
  });

  describe("is-supported (Read-Only)", () => {
    beforeEach(() => {
      simnet.callPublicFn(
        "asset-registry",
        "initialize",
        [
          Cl.principal(admin),
          Cl.principal(emergencyAdmin),
          Cl.principal(sbtcContract),
          Cl.principal(usdcxContract),
        ],
        deployer
      );
    });

    it("should support STX", () => {
      const result = simnet.callReadOnlyFn(
        "asset-registry",
        "is-supported",
        [Cl.principal(STX_PRINCIPAL)],
        deployer
      );
      expect(result.result).toEqual(Cl.ok(Cl.bool(true)));
    });

    it("should support sBTC", () => {
      const result = simnet.callReadOnlyFn(
        "asset-registry",
        "is-supported",
        [Cl.principal(sbtcContract)],
        deployer
      );
      expect(result.result).toEqual(Cl.ok(Cl.bool(true)));
    });

    it("should support USDCx", () => {
      const result = simnet.callReadOnlyFn(
        "asset-registry",
        "is-supported",
        [Cl.principal(usdcxContract)],
        deployer
      );
      expect(result.result).toEqual(Cl.ok(Cl.bool(true)));
    });

    it("should not support unknown asset", () => {
      const result = simnet.callReadOnlyFn(
        "asset-registry",
        "is-supported",
        [Cl.principal(admin)],
        deployer
      );
      expect(result.result).toEqual(Cl.ok(Cl.bool(false)));
    });
  });

  describe("Admin Asset Management (with admin=wallet_1)", () => {
    beforeEach(() => {
      simnet.callPublicFn(
        "asset-registry",
        "initialize",
        [
          Cl.principal(admin),
          Cl.principal(emergencyAdmin),
          Cl.principal(sbtcContract),
          Cl.principal(usdcxContract),
        ],
        deployer
      );
    });

    it("should add a new asset by admin", () => {
      const newAsset = nonAdmin;
      const result = simnet.callPublicFn(
        "asset-registry",
        "add-asset",
        [
          Cl.principal(newAsset),
          Cl.stringAscii("NewToken"),
          Cl.uint(8),
        ],
        admin
      );
      expect(result.result).toEqual(Cl.ok(Cl.bool(true)));
    });

    it("should fail to add asset by non-admin", () => {
      const result = simnet.callPublicFn(
        "asset-registry",
        "add-asset",
        [
          Cl.principal(nonAdmin),
          Cl.stringAscii("NewToken"),
          Cl.uint(8),
        ],
        nonAdmin
      );
      expect(result.result).toEqual(Cl.error(ERR_NOT_ADMIN));
    });

    it("should fail to add duplicate asset", () => {
      // sBTC was already seeded during init
      const result = simnet.callPublicFn(
        "asset-registry",
        "add-asset",
        [
          Cl.principal(sbtcContract),
          Cl.stringAscii("sBTC"),
          Cl.uint(8),
        ],
        admin
      );
      expect(result.result).toEqual(Cl.error(ERR_ASSET_ALREADY_EXISTS));
    });

    it("should fail to add asset with empty name", () => {
      const newAsset = nonAdmin;
      const result = simnet.callPublicFn(
        "asset-registry",
        "add-asset",
        [
          Cl.principal(newAsset),
          Cl.stringAscii(""),
          Cl.uint(8),
        ],
        admin
      );
      expect(result.result).toEqual(Cl.error(ERR_EMPTY_NAME));
    });

    it("should fail to add asset with invalid decimals", () => {
      const newAsset = nonAdmin;
      const result = simnet.callPublicFn(
        "asset-registry",
        "add-asset",
        [
          Cl.principal(newAsset),
          Cl.stringAscii("BadToken"),
          Cl.uint(19),
        ],
        admin
      );
      expect(result.result).toEqual(Cl.error(ERR_INVALID_DECIMALS));
    });

    it("should soft-remove an asset by admin", () => {
      const newAsset = nonAdmin;
      simnet.callPublicFn(
        "asset-registry",
        "add-asset",
        [
          Cl.principal(newAsset),
          Cl.stringAscii("NewToken"),
          Cl.uint(8),
        ],
        admin
      );
      const result = simnet.callPublicFn(
        "asset-registry",
        "remove-asset",
        [Cl.principal(newAsset)],
        admin
      );
      expect(result.result).toEqual(Cl.ok(Cl.bool(true)));
    });

    it("should fail to remove STX", () => {
      const result = simnet.callPublicFn(
        "asset-registry",
        "remove-asset",
        [Cl.principal(STX_PRINCIPAL)],
        admin
      );
      expect(result.result).toEqual(Cl.error(ERR_CANNOT_REMOVE_STX));
    });

    it("should fail to remove non-existent asset", () => {
      const result = simnet.callPublicFn(
        "asset-registry",
        "remove-asset",
        [Cl.principal(nonAdmin)],
        admin
      );
      expect(result.result).toEqual(Cl.error(ERR_ASSET_NOT_FOUND));
    });

    it("should reflect soft-removed asset as unsupported", () => {
      const newAsset = nonAdmin;
      simnet.callPublicFn(
        "asset-registry",
        "add-asset",
        [
          Cl.principal(newAsset),
          Cl.stringAscii("NewToken"),
          Cl.uint(8),
        ],
        admin
      );
      simnet.callPublicFn(
        "asset-registry",
        "remove-asset",
        [Cl.principal(newAsset)],
        admin
      );
      const result = simnet.callReadOnlyFn(
        "asset-registry",
        "is-supported",
        [Cl.principal(newAsset)],
        deployer
      );
      expect(result.result).toEqual(Cl.ok(Cl.bool(false)));
    });
  });

  describe("Emergency Remove (with emergency-admin=wallet_2)", () => {
    beforeEach(() => {
      simnet.callPublicFn(
        "asset-registry",
        "initialize",
        [
          Cl.principal(admin),
          Cl.principal(emergencyAdmin),
          Cl.principal(sbtcContract),
          Cl.principal(usdcxContract),
        ],
        deployer
      );
    });

    it("should emergency-remove by emergency admin", () => {
      const result = simnet.callPublicFn(
        "asset-registry",
        "emergency-remove-asset",
        [Cl.principal(sbtcContract)],
        emergencyAdmin
      );
      expect(result.result).toEqual(Cl.ok(Cl.bool(true)));
    });

    it("should fail to emergency-remove by non-emergency-admin", () => {
      const result = simnet.callPublicFn(
        "asset-registry",
        "emergency-remove-asset",
        [Cl.principal(sbtcContract)],
        admin
      );
      expect(result.result).toEqual(Cl.error(ERR_NOT_EMERGENCY_ADMIN));
    });

    it("should fail to emergency-remove STX", () => {
      const result = simnet.callPublicFn(
        "asset-registry",
        "emergency-remove-asset",
        [Cl.principal(STX_PRINCIPAL)],
        emergencyAdmin
      );
      expect(result.result).toEqual(Cl.error(ERR_CANNOT_REMOVE_STX));
    });

    it("should fail to emergency-remove non-existent", () => {
      const result = simnet.callPublicFn(
        "asset-registry",
        "emergency-remove-asset",
        [Cl.principal(nonAdmin)],
        emergencyAdmin
      );
      expect(result.result).toEqual(Cl.error(ERR_ASSET_NOT_FOUND));
    });
  });

  describe("Read-Only Functions", () => {
    beforeEach(() => {
      simnet.callPublicFn(
        "asset-registry",
        "initialize",
        [
          Cl.principal(admin),
          Cl.principal(emergencyAdmin),
          Cl.principal(sbtcContract),
          Cl.principal(usdcxContract),
        ],
        deployer
      );
    });

    it("should get asset count", () => {
      const result = simnet.callReadOnlyFn(
        "asset-registry",
        "get-asset-count",
        [],
        deployer
      );
      expect(result.result).toEqual(Cl.uint(3));
    });

    it("should get asset at index 0 (STX)", () => {
      const result = simnet.callReadOnlyFn(
        "asset-registry",
        "get-asset-at-index",
        [Cl.uint(0)],
        deployer
      );
      expect(result.result).toEqual(Cl.some(Cl.principal(STX_PRINCIPAL)));
    });

    it("should get asset at index 1 (sBTC)", () => {
      const result = simnet.callReadOnlyFn(
        "asset-registry",
        "get-asset-at-index",
        [Cl.uint(1)],
        deployer
      );
      expect(result.result).toEqual(Cl.some(Cl.principal(sbtcContract)));
    });

    it("should get asset details by principal", () => {
      const result = simnet.callReadOnlyFn(
        "asset-registry",
        "get-asset",
        [Cl.principal(sbtcContract)],
        deployer
      );
      expect(result.result).toEqual(
        Cl.some(
          expect.objectContaining({ type: 12 })
        )
      );
    });
  });
});
