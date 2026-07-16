import { describe, expect, it, beforeEach } from "vitest";
import { Cl } from "@stacks/transactions";

const accounts = simnet.getAccounts();
const deployer = accounts.get("deployer")!;
const admin = accounts.get("wallet_1")!;
const emergencyAdmin = accounts.get("wallet_2")!;
const signer = accounts.get("wallet_3")!;
const nonAdmin = accounts.get("wallet_4")!;

const ERR_NOT_ADMIN = Cl.uint(5100);
const ERR_NOT_EMERGENCY_ADMIN = Cl.uint(5101);
const ERR_INVALID_PRICE = Cl.uint(5103);
const ERR_ALREADY_INITIALIZED = Cl.uint(5104);
const ERR_NOT_OWNER = Cl.uint(5105);

describe("Oracle Proxy Demo — DEMO_MODE Safety", () => {
  describe("Initialization", () => {
    it("should initialize by deployer", () => {
      const result = simnet.callPublicFn(
        "oracle-proxy-demo",
        "initialize",
        [Cl.principal(admin), Cl.principal(emergencyAdmin)],
        deployer
      );
      expect(result.result).toEqual(Cl.ok(Cl.bool(true)));
    });

    it("should fail to initialize twice", () => {
      simnet.callPublicFn(
        "oracle-proxy-demo",
        "initialize",
        [Cl.principal(admin), Cl.principal(emergencyAdmin)],
        deployer
      );
      const result = simnet.callPublicFn(
        "oracle-proxy-demo",
        "initialize",
        [Cl.principal(admin), Cl.principal(emergencyAdmin)],
        deployer
      );
      expect(result.result).toEqual(Cl.error(ERR_ALREADY_INITIALIZED));
    });

    it("should fail to initialize by non-deployer", () => {
      const result = simnet.callPublicFn(
        "oracle-proxy-demo",
        "initialize",
        [Cl.principal(admin), Cl.principal(emergencyAdmin)],
        admin
      );
      expect(result.result).toEqual(Cl.error(ERR_NOT_OWNER));
    });
  });

  describe("DEMO_MODE Detection", () => {
    it("get-demo-mode returns true", () => {
      const result = simnet.callReadOnlyFn(
        "oracle-proxy-demo",
        "get-demo-mode",
        [],
        deployer
      );
      expect(result.result).toEqual(Cl.ok(Cl.bool(true)));
    });

    it("get-demo-mode returns true even after initialization", () => {
      simnet.callPublicFn(
        "oracle-proxy-demo",
        "initialize",
        [Cl.principal(admin), Cl.principal(emergencyAdmin)],
        deployer
      );
      const result = simnet.callReadOnlyFn(
        "oracle-proxy-demo",
        "get-demo-mode",
        [],
        deployer
      );
      expect(result.result).toEqual(Cl.ok(Cl.bool(true)));
    });
  });

  describe("Price = 0 (Demo Bypass)", () => {
    beforeEach(() => {
      simnet.callPublicFn(
        "oracle-proxy-demo",
        "initialize",
        [Cl.principal(admin), Cl.principal(emergencyAdmin)],
        deployer
      );
    });

    it("get-stx-price returns u0 — no price has been set", () => {
      const result = simnet.callReadOnlyFn(
        "oracle-proxy-demo",
        "get-stx-price",
        [],
        deployer
      );
      expect(result.result).toEqual(Cl.ok(Cl.uint(0)));
    });

    it("get-stx-price returns u0 — even after admin pushes a price", () => {
      simnet.callPublicFn(
        "oracle-proxy-demo",
        "update-price",
        [Cl.uint(150)],
        admin
      );
      const result = simnet.callReadOnlyFn(
        "oracle-proxy-demo",
        "get-stx-price",
        [],
        deployer
      );
      expect(result.result).toEqual(Cl.ok(Cl.uint(0)));
    });

    it("get-stx-price returns u0 — even after emergency price set", () => {
      simnet.callPublicFn(
        "oracle-proxy-demo",
        "emergency-set-price",
        [Cl.uint(200)],
        emergencyAdmin
      );
      const result = simnet.callReadOnlyFn(
        "oracle-proxy-demo",
        "get-stx-price",
        [],
        deployer
      );
      expect(result.result).toEqual(Cl.ok(Cl.uint(0)));
    });

    it("get-stx-price-with-fallback returns u0 — no staleness error", () => {
      const result = simnet.callReadOnlyFn(
        "oracle-proxy-demo",
        "get-stx-price-with-fallback",
        [],
        deployer
      );
      expect(result.result).toEqual(Cl.ok(Cl.uint(0)));
    });

    it("get-stx-price-with-fallback returns u0 — even after price push", () => {
      simnet.callPublicFn(
        "oracle-proxy-demo",
        "update-price",
        [Cl.uint(150)],
        admin
      );
      const result = simnet.callReadOnlyFn(
        "oracle-proxy-demo",
        "get-stx-price-with-fallback",
        [],
        deployer
      );
      expect(result.result).toEqual(Cl.ok(Cl.uint(0)));
    });
  });

  describe("Admin Functions (Preserved for Test Utility)", () => {
    beforeEach(() => {
      simnet.callPublicFn(
        "oracle-proxy-demo",
        "initialize",
        [Cl.principal(admin), Cl.principal(emergencyAdmin)],
        deployer
      );
    });

    it("update-price succeeds — writes to dead storage", () => {
      const result = simnet.callPublicFn(
        "oracle-proxy-demo",
        "update-price",
        [Cl.uint(150)],
        admin
      );
      expect(result.result).toEqual(Cl.ok(Cl.bool(true)));
    });

    it("update-price rejects non-admin", () => {
      const result = simnet.callPublicFn(
        "oracle-proxy-demo",
        "update-price",
        [Cl.uint(150)],
        nonAdmin
      );
      expect(result.result).toEqual(Cl.error(ERR_NOT_ADMIN));
    });

    it("update-price rejects zero price", () => {
      const result = simnet.callPublicFn(
        "oracle-proxy-demo",
        "update-price",
        [Cl.uint(0)],
        admin
      );
      expect(result.result).toEqual(Cl.error(ERR_INVALID_PRICE));
    });

    it("emergency-set-price succeeds", () => {
      const result = simnet.callPublicFn(
        "oracle-proxy-demo",
        "emergency-set-price",
        [Cl.uint(200)],
        emergencyAdmin
      );
      expect(result.result).toEqual(Cl.ok(Cl.bool(true)));
    });

    it("emergency-set-price rejects non-authorized", () => {
      const result = simnet.callPublicFn(
        "oracle-proxy-demo",
        "emergency-set-price",
        [Cl.uint(200)],
        nonAdmin
      );
      expect(result.result).toEqual(Cl.error(ERR_NOT_EMERGENCY_ADMIN));
    });

    it("emergency-set-price succeeds for multi-sig signer", () => {
      simnet.callPublicFn(
        "cinex-multisig",
        "initialize",
        [Cl.principal(signer), Cl.principal(emergencyAdmin), Cl.principal(deployer)],
        deployer
      );
      const result = simnet.callPublicFn(
        "oracle-proxy-demo",
        "emergency-set-price",
        [Cl.uint(200)],
        signer
      );
      expect(result.result).toEqual(Cl.ok(Cl.bool(true)));
    });
  });

  describe("Read-Only Metadata", () => {
    beforeEach(() => {
      simnet.callPublicFn(
        "oracle-proxy-demo",
        "initialize",
        [Cl.principal(admin), Cl.principal(emergencyAdmin)],
        deployer
      );
    });

    it("get-admin-contract returns admin", () => {
      const result = simnet.callReadOnlyFn(
        "oracle-proxy-demo",
        "get-admin-contract",
        [],
        deployer
      );
      expect(result.result).toEqual(Cl.ok(Cl.principal(admin)));
    });

    it("get-emergency-admin returns emergency admin", () => {
      const result = simnet.callReadOnlyFn(
        "oracle-proxy-demo",
        "get-emergency-admin",
        [],
        deployer
      );
      expect(result.result).toEqual(Cl.ok(Cl.principal(emergencyAdmin)));
    });

    it("get-last-updated returns block height after price push", () => {
      simnet.callPublicFn(
        "oracle-proxy-demo",
        "update-price",
        [Cl.uint(150)],
        admin
      );
      const result = simnet.callReadOnlyFn(
        "oracle-proxy-demo",
        "get-last-updated",
        [],
        deployer
      );
      const blockHeight = result.result;
      expect(blockHeight).toBeDefined();
    });
  });
});
