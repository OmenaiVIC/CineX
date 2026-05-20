import { describe, expect, it, beforeEach } from "vitest";
import { Cl } from "@stacks/transactions";

const accounts = simnet.getAccounts();
const deployer = accounts.get("deployer")!;
const creator1 = accounts.get("wallet_1")!;
const creator2 = accounts.get("wallet_2")!;
const admin = accounts.get("wallet_3")!;
const emergency = accounts.get("wallet_4")!;
const backer = accounts.get("wallet_5")!;
const feeCollector = accounts.get("wallet_6")!;
const stranger = accounts.get("wallet_7")!;

const milestoneVerification = `${deployer}.milestone-verification`;

// Error constants (u5500-u5518)
const ERR_NOT_AUTHORIZED = Cl.uint(5500);
const ERR_NOT_INITIALIZED = Cl.uint(5501);
const ERR_ALREADY_INITIALIZED = Cl.uint(5502);
const ERR_CAMPAIGN_NOT_FOUND = Cl.uint(5503);
const ERR_INSUFFICIENT_BALANCE = Cl.uint(5504);
const ERR_TRANSFER_FAILED = Cl.uint(5505);
const ERR_INVALID_AMOUNT = Cl.uint(5506);
const ERR_STRATEGY_FAILED = Cl.uint(5507);
const ERR_NO_YIELD = Cl.uint(5508);
const ERR_NO_STRATEGY = Cl.uint(5509);
const ERR_SYSTEM_PAUSED = Cl.uint(5510);
const ERR_SYSTEM_NOT_PAUSED = Cl.uint(5511);
const ERR_NO_YIELD_TO_CLAIM = Cl.uint(5512);
const ERR_BONUS_ALREADY_CLAIMED = Cl.uint(5513);
const ERR_BONUS_FORFEITED = Cl.uint(5514);
const ERR_NOT_BACKER = Cl.uint(5515);
const ERR_NOT_CREATOR = Cl.uint(5516);
const ERR_NO_SNAPSHOT = Cl.uint(5517);
const ERR_NO_ACCUMULATED_YIELD = Cl.uint(5518);

const STX_PRICE_CENTS = 250;

function initEnv() {
  // oracle-proxy: initialize + set price
  simnet.callPublicFn("oracle-proxy", "initialize", [Cl.principal(deployer), Cl.principal(deployer)], deployer);
  simnet.callPublicFn("oracle-proxy", "update-price", [Cl.uint(STX_PRICE_CENTS)], deployer);

  // asset-registry: initialize
  simnet.callPublicFn("asset-registry", "initialize", [Cl.principal(deployer), Cl.principal(deployer), Cl.principal("SP000000000000000000002Q6VF78"), Cl.principal("SP000000000000000000002Q6VF78")], deployer);

  // project-verification-module: initialize
  simnet.callPublicFn("project-verification-module", "initialize", [Cl.principal(deployer), Cl.principal(deployer)], deployer);

  // milestone-escrow: initialize + set fee collector
  simnet.callPublicFn("milestone-escrow", "initialize", [Cl.principal(deployer), Cl.principal(deployer)], deployer);
  simnet.callPublicFn("milestone-escrow", "set-fee-parameters", [Cl.principal(feeCollector), Cl.uint(500)], deployer);
}

describe("Yield Escrow", () => {
  describe("Initialization", () => {
    it("should initialize yield-escrow with admin and emergency addresses", () => {
      const result = simnet.callPublicFn("yield-escrow", "initialize", [
        Cl.principal(admin), Cl.principal(emergency), Cl.principal(deployer), Cl.principal(milestoneVerification)
      ], deployer);
      expect(result.result).toEqual(Cl.ok(Cl.bool(true)));
    });

    it("should reject initialize from non-owner", () => {
      const result = simnet.callPublicFn("yield-escrow", "initialize", [
        Cl.principal(admin), Cl.principal(emergency), Cl.principal(deployer), Cl.principal(milestoneVerification)
      ], creator1);
      expect(result.result).toEqual(Cl.error(ERR_NOT_AUTHORIZED));
    });

    it("should reject double initialization", () => {
      simnet.callPublicFn("yield-escrow", "initialize", [
        Cl.principal(admin), Cl.principal(emergency), Cl.principal(deployer), Cl.principal(milestoneVerification)
      ], deployer);
      const result = simnet.callPublicFn("yield-escrow", "initialize", [
        Cl.principal(admin), Cl.principal(emergency), Cl.principal(deployer), Cl.principal(milestoneVerification)
      ], deployer);
      expect(result.result).toEqual(Cl.error(ERR_ALREADY_INITIALIZED));
    });
  });

  describe("Getters before initialization", () => {
    it("should return default values before init", () => {
      const strategy = simnet.callReadOnlyFn("yield-escrow", "get-default-strategy", [], deployer);
      expect(strategy.result).toEqual(Cl.ok(Cl.none()));

      const accumulated = simnet.callReadOnlyFn("yield-escrow", "get-platform-yield-accumulated", [], deployer);
      expect(accumulated.result).toEqual(Cl.ok(Cl.uint(0)));
    });
  });

  describe("Strategy Management", () => {
    beforeEach(() => {
      simnet.callPublicFn("yield-escrow", "initialize", [
        Cl.principal(admin), Cl.principal(emergency), Cl.principal(deployer), Cl.principal(milestoneVerification)
      ], deployer);
    });

    it("should return none for default strategy before any is set", () => {
      const strategy = simnet.callReadOnlyFn("yield-escrow", "get-default-strategy", [], deployer);
      expect(strategy.result).toEqual(Cl.ok(Cl.none()));
    });

    it("should have correct admin and emergency addresses", () => {
      const adminResult = simnet.callReadOnlyFn("yield-escrow", "get-admin-contract", [], deployer);
      expect(adminResult.result).toEqual(Cl.ok(Cl.principal(admin)));

      const emergencyResult = simnet.callReadOnlyFn("yield-escrow", "get-emergency-admin", [], deployer);
      expect(emergencyResult.result).toEqual(Cl.ok(Cl.principal(emergency)));
    });

    it("should have correct milestone-verification address", () => {
      const mvResult = simnet.callReadOnlyFn("yield-escrow", "get-milestone-verification", [], deployer);
      expect(mvResult.result).toEqual(Cl.ok(Cl.principal(milestoneVerification)));
    });
  });

  describe("Deposit and Position Tracking", () => {
    beforeEach(() => {
      simnet.callPublicFn("yield-escrow", "initialize", [
        Cl.principal(admin), Cl.principal(emergency), Cl.principal(deployer), Cl.principal(milestoneVerification)
      ], deployer);
    });

    it("should reject deposit with zero amount", () => {
      // let bindings (crowdfunding call) run before amount check; no crowdfunding data = ERR_NO_SNAPSHOT
      const result = simnet.callPublicFn("yield-escrow", "deposit-to-yield-escrow", [
        Cl.uint(1), Cl.uint(0), Cl.none()
      ], deployer);
      expect(result.result).toEqual(Cl.error(ERR_NO_SNAPSHOT));
    });

    it("should reject deposit when no crowdfunding data exists", () => {
      const result = simnet.callPublicFn("yield-escrow", "deposit-to-yield-escrow", [
        Cl.uint(1), Cl.uint(1000000), Cl.none()
      ], deployer);
      expect(result.result).toEqual(Cl.error(ERR_NO_SNAPSHOT));
    });
  });

  describe("Withdraw", () => {
    beforeEach(() => {
      simnet.callPublicFn("yield-escrow", "initialize", [
        Cl.principal(admin), Cl.principal(emergency), Cl.principal(deployer), Cl.principal(milestoneVerification)
      ], deployer);
    });

    it("should reject withdraw from non-existent campaign", () => {
      const result = simnet.callPublicFn("yield-escrow", "withdraw-from-yield-escrow", [
        Cl.uint(999), Cl.uint(100000)
      ], deployer);
      expect(result.result).toEqual(Cl.error(ERR_CAMPAIGN_NOT_FOUND));
    });
  });

  describe("Claim Backer Yield", () => {
    beforeEach(() => {
      simnet.callPublicFn("yield-escrow", "initialize", [
        Cl.principal(admin), Cl.principal(emergency), Cl.principal(deployer), Cl.principal(milestoneVerification)
      ], deployer);
    });

    it("should reject claim for non-existent campaign", () => {
      const result = simnet.callPublicFn("yield-escrow", "claim-backer-yield", [
        Cl.uint(999)
      ], deployer);
      expect(result.result).toEqual(Cl.error(ERR_CAMPAIGN_NOT_FOUND));
    });
  });

  describe("Distribute Platform Yield", () => {
    beforeEach(() => {
      simnet.callPublicFn("yield-escrow", "initialize", [
        Cl.principal(admin), Cl.principal(emergency), Cl.principal(deployer), Cl.principal(milestoneVerification)
      ], deployer);
    });

    it("should reject distribute when campaign does not exist", () => {
      const result = simnet.callPublicFn("yield-escrow", "distribute-platform-yield", [
        Cl.uint(999)
      ], admin);
      expect(result.result).toEqual(Cl.error(ERR_CAMPAIGN_NOT_FOUND));
    });
  });

  describe("Emergency Module", () => {
    beforeEach(() => {
      simnet.callPublicFn("yield-escrow", "initialize", [
        Cl.principal(admin), Cl.principal(emergency), Cl.principal(deployer), Cl.principal(milestoneVerification)
      ], deployer);
    });

    it("should reject set-pause-state from non-emergency admin", () => {
      const result = simnet.callPublicFn("yield-escrow", "set-pause-state", [
        Cl.bool(true)
      ], deployer);
      expect(result.result).toEqual(Cl.error(ERR_NOT_AUTHORIZED));
    });

    it("should check is-system-paused", () => {
      const result = simnet.callReadOnlyFn("yield-escrow", "is-system-paused", [], deployer);
      expect(result.result).toEqual(Cl.ok(Cl.bool(false)));
    });

    it("should reject emergency-withdraw without pause", () => {
      const result = simnet.callPublicFn("yield-escrow", "emergency-withdraw", [
        Cl.uint(0), Cl.principal(stranger)
      ], deployer);
      expect(result.result).toEqual(Cl.error(ERR_NOT_AUTHORIZED));
    });
  });

  describe("Module Base Trait", () => {
    beforeEach(() => {
      simnet.callPublicFn("yield-escrow", "initialize", [
        Cl.principal(admin), Cl.principal(emergency), Cl.principal(deployer), Cl.principal(milestoneVerification)
      ], deployer);
    });

    it("should return module version", () => {
      const result = simnet.callReadOnlyFn("yield-escrow", "get-module-version", [], deployer);
      expect(result.result).toEqual(Cl.ok(Cl.uint(2)));
    });

    it("should return module active state", () => {
      const result = simnet.callReadOnlyFn("yield-escrow", "is-module-active", [], deployer);
      expect(result.result).toEqual(Cl.ok(Cl.bool(true)));
    });

    it("should return module name", () => {
      const result = simnet.callReadOnlyFn("yield-escrow", "get-module-name", [], deployer);
      expect(result.result).toEqual(Cl.ok(Cl.stringAscii("yield-escrow")));
    });
  });
});
