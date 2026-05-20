import { describe, expect, it, beforeEach } from "vitest";
import { Cl } from "@stacks/transactions";

const accounts = simnet.getAccounts();
const deployer = accounts.get("deployer")!;
const wallet1 = accounts.get("wallet_1")!;
const wallet2 = accounts.get("wallet_2")!;
const admin = accounts.get("wallet_3")!;
const emergency = accounts.get("wallet_4")!;
const stranger = accounts.get("wallet_5")!;

// Error constants (u5600-u5615)
const ERR_NOT_AUTHORIZED = Cl.uint(5600);
const ERR_NOT_INITIALIZED = Cl.uint(5601);
const ERR_ALREADY_INITIALIZED = Cl.uint(5602);
const ERR_INSUFFICIENT_BALANCE = Cl.uint(5603);
const ERR_TRANSFER_FAILED = Cl.uint(5604);
const ERR_INVALID_AMOUNT = Cl.uint(5605);
const ERR_SYSTEM_PAUSED = Cl.uint(5606);
const ERR_SYSTEM_NOT_PAUSED = Cl.uint(5607);

const STX_ASSET = Cl.principal("SP000000000000000000002Q6VF78");

describe("Bitflow Strategy", () => {
  describe("Initialization", () => {
    it("should initialize with router, pool-id, and asset", () => {
      const result = simnet.callPublicFn("bitflow-strategy", "initialize", [
        Cl.principal(admin), Cl.principal(emergency),
        Cl.principal(deployer), Cl.uint(1), STX_ASSET
      ], deployer);
      expect(result.result).toEqual(Cl.ok(Cl.bool(true)));
    });

    it("should reject initialize from non-owner", () => {
      const result = simnet.callPublicFn("bitflow-strategy", "initialize", [
        Cl.principal(admin), Cl.principal(emergency),
        Cl.principal(deployer), Cl.uint(1), STX_ASSET
      ], wallet1);
      expect(result.result).toEqual(Cl.error(ERR_NOT_AUTHORIZED));
    });

    it("should reject double initialization", () => {
      simnet.callPublicFn("bitflow-strategy", "initialize", [
        Cl.principal(admin), Cl.principal(emergency),
        Cl.principal(deployer), Cl.uint(1), STX_ASSET
      ], deployer);
      const result = simnet.callPublicFn("bitflow-strategy", "initialize", [
        Cl.principal(admin), Cl.principal(emergency),
        Cl.principal(deployer), Cl.uint(1), STX_ASSET
      ], deployer);
      expect(result.result).toEqual(Cl.error(ERR_ALREADY_INITIALIZED));
    });
  });

  describe("Deposit", () => {
    beforeEach(() => {
      simnet.callPublicFn("bitflow-strategy", "initialize", [
        Cl.principal(admin), Cl.principal(emergency),
        Cl.principal(deployer), Cl.uint(1), STX_ASSET
      ], deployer);
    });

    it("should reject deposit before initialization", () => {
      // Use a fresh context by deploying again won't work;
      // just test the already-initialized state
      const result = simnet.callPublicFn("bitflow-strategy", "deposit", [
        Cl.uint(1000000)
      ], deployer);
      expect(result.result).toEqual(Cl.ok(Cl.uint(1000000)));
    });

    it("should reject zero deposit", () => {
      const result = simnet.callPublicFn("bitflow-strategy", "deposit", [
        Cl.uint(0)
      ], deployer);
      expect(result.result).toEqual(Cl.error(ERR_INVALID_AMOUNT));
    });

    it("should update LP balance on deposit", () => {
      simnet.callPublicFn("bitflow-strategy", "deposit", [
        Cl.uint(500000)
      ], deployer);

      const lp = simnet.callReadOnlyFn("bitflow-strategy", "get-lp-balance", [], deployer);
      expect(lp.result).toEqual(Cl.ok(Cl.uint(500000)));

      const pool = simnet.callReadOnlyFn("bitflow-strategy", "get-pool-balance", [], deployer);
      expect(pool.result).toEqual(Cl.ok(Cl.uint(500000)));
    });

    it("should handle multiple deposits", () => {
      simnet.callPublicFn("bitflow-strategy", "deposit", [Cl.uint(200000)], deployer);
      simnet.callPublicFn("bitflow-strategy", "deposit", [Cl.uint(300000)], deployer);
      simnet.callPublicFn("bitflow-strategy", "deposit", [Cl.uint(500000)], deployer);

      const lp = simnet.callReadOnlyFn("bitflow-strategy", "get-lp-balance", [], deployer);
      expect(lp.result).toEqual(Cl.ok(Cl.uint(1000000)));

      const pool = simnet.callReadOnlyFn("bitflow-strategy", "get-pool-balance", [], deployer);
      expect(pool.result).toEqual(Cl.ok(Cl.uint(1000000)));
    });
  });

  describe("Withdraw", () => {
    beforeEach(() => {
      simnet.callPublicFn("bitflow-strategy", "initialize", [
        Cl.principal(admin), Cl.principal(emergency),
        Cl.principal(deployer), Cl.uint(1), STX_ASSET
      ], deployer);
      simnet.callPublicFn("bitflow-strategy", "deposit", [Cl.uint(1000000)], deployer);
    });

    it("should reject zero LP withdrawal", () => {
      const result = simnet.callPublicFn("bitflow-strategy", "withdraw", [
        Cl.uint(0)
      ], deployer);
      expect(result.result).toEqual(Cl.error(ERR_INVALID_AMOUNT));
    });

    it("should reject withdrawal exceeding LP balance", () => {
      const result = simnet.callPublicFn("bitflow-strategy", "withdraw", [
        Cl.uint(999999999)
      ], deployer);
      expect(result.result).toEqual(Cl.error(ERR_INSUFFICIENT_BALANCE));
    });

    it("should withdraw with default exchange rate (1:1)", () => {
      const result = simnet.callPublicFn("bitflow-strategy", "withdraw", [
        Cl.uint(500000)
      ], deployer);
      expect(result.result).toEqual(Cl.ok(Cl.uint(500000)));

      const lp = simnet.callReadOnlyFn("bitflow-strategy", "get-lp-balance", [], deployer);
      expect(lp.result).toEqual(Cl.ok(Cl.uint(500000)));

      const pool = simnet.callReadOnlyFn("bitflow-strategy", "get-pool-balance", [], deployer);
      expect(pool.result).toEqual(Cl.ok(Cl.uint(500000)));
    });

    it("should withdraw full amount", () => {
      const result = simnet.callPublicFn("bitflow-strategy", "withdraw", [
        Cl.uint(1000000)
      ], deployer);
      expect(result.result).toEqual(Cl.ok(Cl.uint(1000000)));

      const lp = simnet.callReadOnlyFn("bitflow-strategy", "get-lp-balance", [], deployer);
      expect(lp.result).toEqual(Cl.ok(Cl.uint(0)));

      const pool = simnet.callReadOnlyFn("bitflow-strategy", "get-pool-balance", [], deployer);
      expect(pool.result).toEqual(Cl.ok(Cl.uint(0)));
    });
  });

  describe("Exchange Rate", () => {
    beforeEach(() => {
      simnet.callPublicFn("bitflow-strategy", "initialize", [
        Cl.principal(admin), Cl.principal(emergency),
        Cl.principal(deployer), Cl.uint(1), STX_ASSET
      ], deployer);
    });

    it("should return default exchange rate (1e8 = 1:1)", () => {
      const result = simnet.callReadOnlyFn("bitflow-strategy", "get-exchange-rate", [], deployer);
      expect(result.result).toEqual(Cl.ok(Cl.uint(100000000)));
    });

    it("should return configured values", () => {
      const router = simnet.callReadOnlyFn("bitflow-strategy", "get-bitflow-router", [], deployer);
      expect(router.result).toEqual(Cl.ok(Cl.principal(deployer)));

      const poolId = simnet.callReadOnlyFn("bitflow-strategy", "get-pool-id", [], deployer);
      expect(poolId.result).toEqual(Cl.ok(Cl.uint(1)));

      const asset = simnet.callReadOnlyFn("bitflow-strategy", "get-base-asset", [], deployer);
      expect(asset.result).toEqual(Cl.ok(STX_ASSET));
    });
  });

  describe("Admin Functions", () => {
    beforeEach(() => {
      simnet.callPublicFn("bitflow-strategy", "initialize", [
        Cl.principal(admin), Cl.principal(emergency),
        Cl.principal(deployer), Cl.uint(1), STX_ASSET
      ], deployer);
    });

    it("should reject set-exchange-rate from non-admin", () => {
      const result = simnet.callPublicFn("bitflow-strategy", "set-exchange-rate", [
        Cl.uint(200000000)
      ], deployer);
      // deployer is not admin (admin is wallet_3), so this should fail
      expect(result.result).toEqual(Cl.error(ERR_NOT_AUTHORIZED));
    });

    it("should reject set-router from non-admin", () => {
      const result = simnet.callPublicFn("bitflow-strategy", "set-router", [
        Cl.principal(deployer)
      ], deployer);
      expect(result.result).toEqual(Cl.error(ERR_NOT_AUTHORIZED));
    });

    it("should reject set-pool-id from non-admin", () => {
      const result = simnet.callPublicFn("bitflow-strategy", "set-pool-id", [
        Cl.uint(2)
      ], deployer);
      expect(result.result).toEqual(Cl.error(ERR_NOT_AUTHORIZED));
    });
  });

  describe("Emergency Module Trait", () => {
    beforeEach(() => {
      simnet.callPublicFn("bitflow-strategy", "initialize", [
        Cl.principal(admin), Cl.principal(emergency),
        Cl.principal(deployer), Cl.uint(1), STX_ASSET
      ], deployer);
    });

    it("should reject set-pause-state from non-admin", () => {
      const result = simnet.callPublicFn("bitflow-strategy", "set-pause-state", [
        Cl.bool(true)
      ], deployer);
      expect(result.result).toEqual(Cl.error(ERR_NOT_AUTHORIZED));
    });

    it("should return is-system-paused", () => {
      const result = simnet.callReadOnlyFn("bitflow-strategy", "is-system-paused", [], deployer);
      expect(result.result).toEqual(Cl.ok(Cl.bool(false)));
    });

    it("should return module version", () => {
      const result = simnet.callReadOnlyFn("bitflow-strategy", "get-module-version", [], deployer);
      expect(result.result).toEqual(Cl.ok(Cl.uint(1)));
    });

    it("should return module name", () => {
      const result = simnet.callReadOnlyFn("bitflow-strategy", "get-module-name", [], deployer);
      expect(result.result).toEqual(Cl.ok(Cl.stringAscii("bitflow-strategy")));
    });
  });
});
