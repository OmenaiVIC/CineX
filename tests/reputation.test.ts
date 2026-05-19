import { describe, expect, it, beforeEach } from "vitest";
import { Cl } from "@stacks/transactions";

const accounts = simnet.getAccounts();
const deployer = accounts.get("deployer")!;
const admin = accounts.get("wallet_1")!;
const userA = accounts.get("wallet_2")!;
const userB = accounts.get("wallet_3")!;
const userC = accounts.get("wallet_4")!;
const nonAdmin = accounts.get("wallet_5")!;

const ERR_SELF_RATING = Cl.uint(5200);
const ERR_DUPLICATE_RATING = Cl.uint(5201);
const ERR_INVALID_RATING = Cl.uint(5202);
const ERR_NOT_VERIFIED = Cl.uint(5203);
const ERR_NOT_ADMIN = Cl.uint(5204);
const ERR_ALREADY_INITIALIZED = Cl.uint(5205);
const ERR_NOT_OWNER = Cl.uint(5206);

describe("Reputation - Day 2", () => {
  describe("Initialization", () => {
    it("should initialize by deployer", () => {
      const result = simnet.callPublicFn(
        "reputation",
        "initialize",
        [Cl.principal(admin)],
        deployer
      );
      expect(result.result).toEqual(Cl.ok(Cl.bool(true)));
    });

    it("should fail to initialize twice", () => {
      simnet.callPublicFn(
        "reputation",
        "initialize",
        [Cl.principal(admin)],
        deployer
      );
      const result = simnet.callPublicFn(
        "reputation",
        "initialize",
        [Cl.principal(admin)],
        deployer
      );
      expect(result.result).toEqual(Cl.error(ERR_ALREADY_INITIALIZED));
    });

    it("should fail to initialize by non-deployer", () => {
      const result = simnet.callPublicFn(
        "reputation",
        "initialize",
        [Cl.principal(admin)],
        admin
      );
      expect(result.result).toEqual(Cl.error(ERR_NOT_OWNER));
    });
  });

  describe("Rating", () => {
    beforeEach(() => {
      simnet.callPublicFn(
        "reputation",
        "initialize",
        [Cl.principal(admin)],
        deployer
      );
    });

    it("should allow user to rate another user", () => {
      const result = simnet.callPublicFn(
        "reputation",
        "rate-user",
        [
          Cl.principal(userA),
          Cl.principal(userB),
          Cl.uint(1),
          Cl.uint(4),
          Cl.none(),
        ],
        userA
      );
      expect(result.result).toEqual(Cl.ok(Cl.uint(1)));
    });

    it("should reject self-rating", () => {
      const result = simnet.callPublicFn(
        "reputation",
        "rate-user",
        [
          Cl.principal(userA),
          Cl.principal(userA),
          Cl.uint(1),
          Cl.uint(4),
          Cl.none(),
        ],
        userA
      );
      expect(result.result).toEqual(Cl.error(ERR_SELF_RATING));
    });

    it("should reject duplicate rating for same campaign", () => {
      simnet.callPublicFn(
        "reputation",
        "rate-user",
        [
          Cl.principal(userA),
          Cl.principal(userB),
          Cl.uint(1),
          Cl.uint(4),
          Cl.none(),
        ],
        userA
      );
      const result = simnet.callPublicFn(
        "reputation",
        "rate-user",
        [
          Cl.principal(userA),
          Cl.principal(userB),
          Cl.uint(1),
          Cl.uint(5),
          Cl.none(),
        ],
        userA
      );
      expect(result.result).toEqual(Cl.error(ERR_DUPLICATE_RATING));
    });

    it("should allow same pair to rate on different campaigns", () => {
      simnet.callPublicFn(
        "reputation",
        "rate-user",
        [
          Cl.principal(userA),
          Cl.principal(userB),
          Cl.uint(1),
          Cl.uint(4),
          Cl.none(),
        ],
        userA
      );
      const result = simnet.callPublicFn(
        "reputation",
        "rate-user",
        [
          Cl.principal(userA),
          Cl.principal(userB),
          Cl.uint(2),
          Cl.uint(3),
          Cl.none(),
        ],
        userA
      );
      expect(result.result).toEqual(Cl.ok(Cl.uint(2)));
    });

    it("should reject rating below minimum (0)", () => {
      const result = simnet.callPublicFn(
        "reputation",
        "rate-user",
        [
          Cl.principal(userA),
          Cl.principal(userB),
          Cl.uint(1),
          Cl.uint(0),
          Cl.none(),
        ],
        userA
      );
      expect(result.result).toEqual(Cl.error(ERR_INVALID_RATING));
    });

    it("should reject rating above maximum (6)", () => {
      const result = simnet.callPublicFn(
        "reputation",
        "rate-user",
        [
          Cl.principal(userA),
          Cl.principal(userB),
          Cl.uint(1),
          Cl.uint(6),
          Cl.none(),
        ],
        userA
      );
      expect(result.result).toEqual(Cl.error(ERR_INVALID_RATING));
    });

    it("should reject rating where rater does not match tx-sender", () => {
      const result = simnet.callPublicFn(
        "reputation",
        "rate-user",
        [
          Cl.principal(userA),
          Cl.principal(userB),
          Cl.uint(1),
          Cl.uint(4),
          Cl.none(),
        ],
        userB
      );
      expect(result.result).toEqual(Cl.error(ERR_NOT_ADMIN));
    });
  });

  describe("Reputation Scores", () => {
    beforeEach(() => {
      simnet.callPublicFn(
        "reputation",
        "initialize",
        [Cl.principal(admin)],
        deployer
      );
    });

    it("should return 0 for user with no ratings", () => {
      const result = simnet.callReadOnlyFn(
        "reputation",
        "get-reputation-score",
        [Cl.principal(userB)],
        deployer
      );
      expect(result.result).toEqual(Cl.ok(Cl.uint(0)));
    });

    it("should calculate correct percentage score", () => {
      simnet.callPublicFn(
        "reputation",
        "rate-user",
        [
          Cl.principal(userA),
          Cl.principal(userB),
          Cl.uint(1),
          Cl.uint(4),
          Cl.none(),
        ],
        userA
      );
      const result = simnet.callReadOnlyFn(
        "reputation",
        "get-reputation-score",
        [Cl.principal(userB)],
        deployer
      );
      expect(result.result).toEqual(Cl.ok(Cl.uint(80)));
    });

    it("should aggregate multiple ratings correctly", () => {
      simnet.callPublicFn(
        "reputation",
        "rate-user",
        [
          Cl.principal(userA),
          Cl.principal(userB),
          Cl.uint(1),
          Cl.uint(5),
          Cl.none(),
        ],
        userA
      );
      simnet.callPublicFn(
        "reputation",
        "rate-user",
        [
          Cl.principal(userC),
          Cl.principal(userB),
          Cl.uint(1),
          Cl.uint(3),
          Cl.none(),
        ],
        userC
      );
      const result = simnet.callReadOnlyFn(
        "reputation",
        "get-reputation-score",
        [Cl.principal(userB)],
        deployer
      );
      // Score = (5 + 3) * 100 / (2 * 5) = 800 / 10 = 80
      expect(result.result).toEqual(Cl.ok(Cl.uint(80)));
    });

    it("should return score data for a user", () => {
      simnet.callPublicFn(
        "reputation",
        "rate-user",
        [
          Cl.principal(userA),
          Cl.principal(userB),
          Cl.uint(1),
          Cl.uint(4),
          Cl.none(),
        ],
        userA
      );
      const result = simnet.callReadOnlyFn(
        "reputation",
        "get-score-data",
        [Cl.principal(userB)],
        deployer
      );
      expect(result.result).toEqual(
        Cl.ok(
          Cl.tuple({
            "total-ratings": Cl.uint(1),
            "total-score": Cl.uint(4),
          })
        )
      );
    });
  });

  describe("Verification Gate", () => {
    beforeEach(() => {
      simnet.callPublicFn(
        "reputation",
        "initialize",
        [Cl.principal(admin)],
        deployer
      );
    });

    it("should allow admin to toggle verification gate", () => {
      const result = simnet.callPublicFn(
        "reputation",
        "set-verification-gate",
        [Cl.bool(true)],
        admin
      );
      expect(result.result).toEqual(Cl.ok(Cl.bool(true)));
    });

    it("should reject toggle by non-admin", () => {
      const result = simnet.callPublicFn(
        "reputation",
        "set-verification-gate",
        [Cl.bool(true)],
        nonAdmin
      );
      expect(result.result).toEqual(Cl.error(ERR_NOT_ADMIN));
    });
  });
});
