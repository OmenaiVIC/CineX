import { describe, expect, it, beforeEach } from "vitest";
import { Cl } from "@stacks/transactions";

const accounts = simnet.getAccounts();
const deployer = accounts.get("deployer")!;
const signer1 = accounts.get("wallet_1")!;
const signer2 = accounts.get("wallet_2")!;
const signer3 = accounts.get("wallet_3")!;
const nonSigner = accounts.get("wallet_4")!;

const ERR_NOT_SIGNER = Cl.uint(8000);
const ERR_TX_NOT_FOUND = Cl.uint(8001);
const ERR_TX_ALREADY_EXECUTED = Cl.uint(8002);
const ERR_NOT_ENOUGH_CONFIRMATIONS = Cl.uint(8003);
const ERR_SIGNER_ALREADY_EXISTS = Cl.uint(8004);
const ERR_SIGNER_NOT_FOUND = Cl.uint(8005);
const ERR_INVALID_REPLACEMENT = Cl.uint(8006);
const ERR_ALREADY_CONFIRMED = Cl.uint(8007);
const ERR_NOT_OWNER = Cl.uint(8008);
const THRESHOLD = 2;

let txIdCounter = 0;

function getNextTxId(): number {
  txIdCounter += 1;
  return txIdCounter;
}

describe("CineX Multi-Sig - Day 1", () => {
  describe("Initialization", () => {
    it("should initialize by deployer with 3 signers", () => {
      const result = simnet.callPublicFn(
        "cinex-multisig",
        "initialize",
        [Cl.principal(signer1), Cl.principal(signer2), Cl.principal(signer3)],
        deployer
      );
      expect(result.result).toEqual(Cl.ok(Cl.bool(true)));
    });

    it("should fail to initialize twice", () => {
      simnet.callPublicFn(
        "cinex-multisig",
        "initialize",
        [Cl.principal(signer1), Cl.principal(signer2), Cl.principal(signer3)],
        deployer
      );
      const result = simnet.callPublicFn(
        "cinex-multisig",
        "initialize",
        [Cl.principal(signer1), Cl.principal(signer2), Cl.principal(signer3)],
        deployer
      );
      expect(result.result).toEqual(Cl.error(ERR_TX_ALREADY_EXECUTED));
    });

    it("should fail to initialize by non-deployer", () => {
      // Note: initialize sets tx-sender to the caller; only deployer passes
      const result = simnet.callPublicFn(
        "cinex-multisig",
        "initialize",
        [Cl.principal(signer1), Cl.principal(signer2), Cl.principal(signer3)],
        signer1
      );
      expect(result.result).toEqual(Cl.error(ERR_NOT_OWNER));
    });
  });

  describe("Propose & Confirm Transactions", () => {
    beforeEach(() => {
      simnet.callPublicFn(
        "cinex-multisig",
        "initialize",
        [Cl.principal(signer1), Cl.principal(signer2), Cl.principal(signer3)],
        deployer
      );
    });

    it("should propose a transaction by signer", () => {
      const result = simnet.callPublicFn(
        "cinex-multisig",
        "propose-transaction",
        [
          Cl.principal(deployer),
          Cl.stringAscii("set-timelock-addr"),
          Cl.stringAscii(""),
          Cl.bool(true),
        ],
        signer1
      );
      expect(result.result).toEqual(Cl.ok(Cl.uint(1)));
    });

    it("should fail to propose by non-signer", () => {
      const result = simnet.callPublicFn(
        "cinex-multisig",
        "propose-transaction",
        [
          Cl.principal(deployer),
          Cl.stringAscii("set-timelock-addr"),
          Cl.stringAscii(""),
          Cl.bool(true),
        ],
        nonSigner
      );
      expect(result.result).toEqual(Cl.error(ERR_NOT_SIGNER));
    });

    it("should confirm a proposed transaction by second signer", () => {
      simnet.callPublicFn(
        "cinex-multisig",
        "propose-transaction",
        [
          Cl.principal(deployer),
          Cl.stringAscii("set-timelock-addr"),
          Cl.stringAscii(""),
          Cl.bool(true),
        ],
        signer1
      );
      const result = simnet.callPublicFn(
        "cinex-multisig",
        "confirm-transaction",
        [Cl.uint(1)],
        signer2
      );
      expect(result.result).toEqual(Cl.ok(Cl.bool(true)));
    });

    it("should fail to confirm by non-signer", () => {
      simnet.callPublicFn(
        "cinex-multisig",
        "propose-transaction",
        [
          Cl.principal(deployer),
          Cl.stringAscii("set-timelock-addr"),
          Cl.stringAscii(""),
          Cl.bool(true),
        ],
        signer1
      );
      const result = simnet.callPublicFn(
        "cinex-multisig",
        "confirm-transaction",
        [Cl.uint(1)],
        nonSigner
      );
      expect(result.result).toEqual(Cl.error(ERR_NOT_SIGNER));
    });

    it("should fail to double-confirm by same signer", () => {
      simnet.callPublicFn(
        "cinex-multisig",
        "propose-transaction",
        [
          Cl.principal(deployer),
          Cl.stringAscii("set-timelock-addr"),
          Cl.stringAscii(""),
          Cl.bool(true),
        ],
        signer1
      );
      // First confirm by signer2
      simnet.callPublicFn(
        "cinex-multisig",
        "confirm-transaction",
        [Cl.uint(1)],
        signer2
      );
      // Second confirm by signer2 should fail
      const result = simnet.callPublicFn(
        "cinex-multisig",
        "confirm-transaction",
        [Cl.uint(1)],
        signer2
      );
      expect(result.result).toEqual(Cl.error(ERR_ALREADY_CONFIRMED));
    });

    it("should fail to confirm non-existent tx", () => {
      const result = simnet.callPublicFn(
        "cinex-multisig",
        "confirm-transaction",
        [Cl.uint(999)],
        signer1
      );
      expect(result.result).toEqual(Cl.error(ERR_TX_NOT_FOUND));
    });
  });

  describe("Execute Transactions", () => {
    beforeEach(() => {
      simnet.callPublicFn(
        "cinex-multisig",
        "initialize",
        [Cl.principal(signer1), Cl.principal(signer2), Cl.principal(signer3)],
        deployer
      );
    });

    it("should execute an emergency tx after 2 confirmations", () => {
      simnet.callPublicFn(
        "cinex-multisig",
        "propose-transaction",
        [
          Cl.principal(deployer),
          Cl.stringAscii("emergency-pause"),
          Cl.stringAscii(""),
          Cl.bool(false),
        ],
        signer1
      );
      simnet.callPublicFn(
        "cinex-multisig",
        "confirm-transaction",
        [Cl.uint(1)],
        signer2
      );
      const result = simnet.callPublicFn(
        "cinex-multisig",
        "execute-transaction",
        [Cl.uint(1)],
        signer1
      );
      expect(result.result).toEqual(Cl.ok(Cl.bool(true)));
    });

    it("should fail to execute without enough confirmations", () => {
      simnet.callPublicFn(
        "cinex-multisig",
        "propose-transaction",
        [
          Cl.principal(deployer),
          Cl.stringAscii("emergency-pause"),
          Cl.stringAscii(""),
          Cl.bool(false),
        ],
        signer1
      );
      const result = simnet.callPublicFn(
        "cinex-multisig",
        "execute-transaction",
        [Cl.uint(1)],
        signer2
      );
      expect(result.result).toEqual(Cl.error(ERR_NOT_ENOUGH_CONFIRMATIONS));
    });

    it("should fail to execute an already executed tx", () => {
      simnet.callPublicFn(
        "cinex-multisig",
        "propose-transaction",
        [
          Cl.principal(deployer),
          Cl.stringAscii("emergency-pause"),
          Cl.stringAscii(""),
          Cl.bool(false),
        ],
        signer1
      );
      simnet.callPublicFn(
        "cinex-multisig",
        "confirm-transaction",
        [Cl.uint(1)],
        signer2
      );
      simnet.callPublicFn(
        "cinex-multisig",
        "execute-transaction",
        [Cl.uint(1)],
        signer1
      );
      const result = simnet.callPublicFn(
        "cinex-multisig",
        "execute-transaction",
        [Cl.uint(1)],
        signer3
      );
      expect(result.result).toEqual(Cl.error(ERR_TX_ALREADY_EXECUTED));
    });

    it("should fail to execute by non-signer", () => {
      simnet.callPublicFn(
        "cinex-multisig",
        "propose-transaction",
        [
          Cl.principal(deployer),
          Cl.stringAscii("emergency-pause"),
          Cl.stringAscii(""),
          Cl.bool(false),
        ],
        signer1
      );
      simnet.callPublicFn(
        "cinex-multisig",
        "confirm-transaction",
        [Cl.uint(1)],
        signer2
      );
      const result = simnet.callPublicFn(
        "cinex-multisig",
        "execute-transaction",
        [Cl.uint(1)],
        nonSigner
      );
      expect(result.result).toEqual(Cl.error(ERR_NOT_SIGNER));
    });
  });

  describe("Signer Management", () => {
    beforeEach(() => {
      simnet.callPublicFn(
        "cinex-multisig",
        "initialize",
        [Cl.principal(signer1), Cl.principal(signer2), Cl.principal(signer3)],
        deployer
      );
    });

    it("should replace a signer", () => {
      const newSigner = nonSigner;
      const result = simnet.callPublicFn(
        "cinex-multisig",
        "replace-signer",
        [Cl.principal(signer3), Cl.principal(newSigner)],
        signer1
      );
      expect(result.result).toEqual(Cl.ok(Cl.bool(true)));
    });

    it("should fail to replace with existing signer", () => {
      const result = simnet.callPublicFn(
        "cinex-multisig",
        "replace-signer",
        [Cl.principal(signer1), Cl.principal(signer2)],
        signer1
      );
      expect(result.result).toEqual(Cl.error(ERR_SIGNER_ALREADY_EXISTS));
    });

    it("should fail to replace by non-signer", () => {
      const result = simnet.callPublicFn(
        "cinex-multisig",
        "replace-signer",
        [Cl.principal(signer1), Cl.principal(nonSigner)],
        nonSigner
      );
      expect(result.result).toEqual(Cl.error(ERR_NOT_SIGNER));
    });

    it("should fail to replace non-existent signer", () => {
      const result = simnet.callPublicFn(
        "cinex-multisig",
        "replace-signer",
        [Cl.principal(nonSigner), Cl.principal(deployer)],
        signer1
      );
      expect(result.result).toEqual(Cl.error(ERR_SIGNER_NOT_FOUND));
    });
  });

  describe("Read-Only Functions", () => {
    beforeEach(() => {
      simnet.callPublicFn(
        "cinex-multisig",
        "initialize",
        [Cl.principal(signer1), Cl.principal(signer2), Cl.principal(signer3)],
        deployer
      );
      simnet.callPublicFn(
        "cinex-multisig",
        "propose-transaction",
        [
          Cl.principal(deployer),
          Cl.stringAscii("test-fn"),
          Cl.stringAscii(""),
          Cl.bool(true),
        ],
        signer1
      );
    });

    it("should approve a signer", () => {
      const result = simnet.callReadOnlyFn(
        "cinex-multisig",
        "is-approved",
        [Cl.principal(signer1)],
        deployer
      );
      expect(result.result).toEqual(Cl.ok(Cl.bool(true)));
    });

    it("should not approve a non-signer", () => {
      const result = simnet.callReadOnlyFn(
        "cinex-multisig",
        "is-approved",
        [Cl.principal(nonSigner)],
        deployer
      );
      expect(result.result).toEqual(Cl.ok(Cl.bool(false)));
    });

    it("should get transaction details", () => {
      const result = simnet.callReadOnlyFn(
        "cinex-multisig",
        "get-transaction",
        [Cl.uint(1)],
        deployer
      );
      expect(result.result).toEqual(
        Cl.some(
          expect.objectContaining({
            type: 12,
          })
        )
      );
    });

    it("should get signers list", () => {
      const result = simnet.callReadOnlyFn(
        "cinex-multisig",
        "get-signers",
        [],
        deployer
      );
      expect(result.result).toEqual(
        Cl.ok(
          Cl.list([Cl.principal(signer1), Cl.principal(signer2), Cl.principal(signer3)])
        )
      );
    });

    it("should get next tx id", () => {
      const result = simnet.callReadOnlyFn(
        "cinex-multisig",
        "get-next-tx-id",
        [],
        deployer
      );
      expect(result.result).toEqual(Cl.uint(2));
    });

    it("should get timelock addr (initially burn)", () => {
      const result = simnet.callReadOnlyFn(
        "cinex-multisig",
        "get-timelock-addr",
        [],
        deployer
      );
      expect(result.result).toEqual(Cl.principal("SP000000000000000000002Q6VF78"));
    });
  });

  describe("Timelock Address Management", () => {
    beforeEach(() => {
      simnet.callPublicFn(
        "cinex-multisig",
        "initialize",
        [Cl.principal(signer1), Cl.principal(signer2), Cl.principal(signer3)],
        deployer
      );
    });

    it("should set timelock addr by signer", () => {
      const result = simnet.callPublicFn(
        "cinex-multisig",
        "set-timelock-addr",
        [Cl.principal(`${deployer}.timelock`)],
        signer1
      );
      expect(result.result).toEqual(Cl.ok(Cl.bool(true)));
    });
  });
});
