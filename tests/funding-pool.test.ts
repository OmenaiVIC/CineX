import { describe, expect, it, beforeEach } from "vitest";
import { Cl } from "@stacks/transactions";

const accounts = simnet.getAccounts();
const deployer = accounts.get("deployer")!;
const creator = accounts.get("wallet_1")!;
const backer1 = accounts.get("wallet_3")!;
const backer2 = accounts.get("wallet_4")!;
const stranger = accounts.get("wallet_8")!;
const feeCollector = accounts.get("wallet_7")!;

const EMPTY_HASH = Cl.bufferFromHex("0000000000000000000000000000000000000000000000000000000000000000");
const STX_PRICE_CENTS = 250;
const STX_ASSET = "SP000000000000000000002Q6VF78";

const projectVerificationModule = `${deployer}.project-verification-module`;
const reputationContract = `${deployer}.reputation`;
const milestoneEscrow = `${deployer}.milestone-escrow`;

const ERR_NOT_AUTHORIZED = Cl.uint(5700);
const ERR_ALREADY_INITIALIZED = Cl.uint(5702);
const ERR_POOL_NOT_FOUND = Cl.uint(5703);
const ERR_INVALID_AMOUNT = Cl.uint(5704);
const ERR_POOL_CLOSED = Cl.uint(5707);
const ERR_POOL_FULL = Cl.uint(5708);
const ERR_ALREADY_MEMBER = Cl.uint(5709);
const ERR_NOT_MEMBER = Cl.uint(5710);
const ERR_NOT_VERIFIED = Cl.uint(5712);
const ERR_ALREADY_VOTED = Cl.uint(5717);
const ERR_PROPOSAL_NOT_FOUND = Cl.uint(5713);
const ERR_INSUFFICIENT_UNALLOCATED = Cl.uint(5719);
const ERR_CAMPAIGN_NOT_FOUND = Cl.uint(5720);
const ERR_INSUFFICIENT_FUNDS = Cl.uint(5705);
const ERR_TRANSFER_FAILED = Cl.uint(5706);
const ERR_ZERO_VOTING_POWER = Cl.uint(5724);
const ERR_DURATION_EXCEEDED = Cl.uint(5727);
const ERR_MIN_CONTRIBUTION = Cl.uint(5728);
const ERR_INVALID_TARGET = Cl.uint(5729);
const ERR_CANNOT_EXECUTE = Cl.uint(5731);

const TARGET_AMOUNT = 10000000;
const MIN_CONTRIBUTION = 100000;

const MILESTONES_1 = Cl.list([
  Cl.tuple({ name: Cl.stringAscii("deliverable"), amount: Cl.uint(TARGET_AMOUNT) }),
]);

function initEnv() {
  simnet.callPublicFn("oracle-proxy", "initialize", [Cl.principal(deployer), Cl.principal(deployer)], deployer);
  simnet.callPublicFn("oracle-proxy", "update-price", [Cl.uint(STX_PRICE_CENTS)], deployer);
  simnet.callPublicFn("asset-registry", "initialize", [Cl.principal(deployer), Cl.principal(deployer), Cl.principal(STX_ASSET), Cl.principal(STX_ASSET)], deployer);
  simnet.callPublicFn("project-verification-module", "initialize", [Cl.principal(deployer), Cl.principal(deployer)], deployer);
  simnet.callPublicFn("reputation", "initialize", [Cl.principal(deployer)], deployer);
  simnet.callPublicFn("milestone-escrow", "initialize", [Cl.principal(deployer), Cl.principal(deployer)], deployer);
  simnet.callPublicFn("milestone-escrow", "set-fee-parameters", [Cl.principal(feeCollector), Cl.uint(500)], deployer);

  // Register and verify creator
  simnet.callPublicFn("project-verification-module", "register-creator", [
    Cl.principal(creator), Cl.stringAscii("Alice Filmmaker"), Cl.stringAscii("https://alice.example.com"),
    EMPTY_HASH, Cl.stringAscii("film"), Cl.uint(1), Cl.uint(50000),
  ], creator);
  simnet.callPublicFn("project-verification-module", "pay-verification-fee", [Cl.uint(1)], creator);
  simnet.callPublicFn("project-verification-module", "verify-creator", [Cl.principal(creator), Cl.uint(100000)], deployer);

  // Register and verify backer1
  simnet.callPublicFn("project-verification-module", "register-creator", [
    Cl.principal(backer1), Cl.stringAscii("Charlie Backer"), Cl.stringAscii("https://charlie.example.com"),
    EMPTY_HASH, Cl.stringAscii("film"), Cl.uint(1), Cl.uint(50000),
  ], backer1);
  simnet.callPublicFn("project-verification-module", "pay-verification-fee", [Cl.uint(1)], backer1);
  simnet.callPublicFn("project-verification-module", "verify-creator", [Cl.principal(backer1), Cl.uint(100000)], deployer);

  // Register and verify backer2
  simnet.callPublicFn("project-verification-module", "register-creator", [
    Cl.principal(backer2), Cl.stringAscii("Diana Backer"), Cl.stringAscii("https://diana.example.com"),
    EMPTY_HASH, Cl.stringAscii("film"), Cl.uint(1), Cl.uint(50000),
  ], backer2);
  simnet.callPublicFn("project-verification-module", "pay-verification-fee", [Cl.uint(1)], backer2);
  simnet.callPublicFn("project-verification-module", "verify-creator", [Cl.principal(backer2), Cl.uint(100000)], deployer);

  // Create a campaign via milestone-escrow
  simnet.callPublicFn("milestone-escrow", "create-campaign", [
    Cl.uint(1), Cl.principal(STX_ASSET), Cl.uint(TARGET_AMOUNT), MILESTONES_1, Cl.uint(9999999),
  ], creator);

  // Initialize funding-pool
  simnet.callPublicFn("funding-pool", "initialize", [
    Cl.principal(deployer), Cl.principal(deployer),
    Cl.principal(projectVerificationModule), Cl.principal(reputationContract), Cl.principal(milestoneEscrow),
  ], deployer);
}

function createPool() {
  return simnet.callPublicFn("funding-pool", "create-pool", [
    Cl.stringAscii("test-pool"), Cl.uint(TARGET_AMOUNT), Cl.uint(MIN_CONTRIBUTION),
    Cl.uint(0), Cl.uint(1000), Cl.uint(10),
  ], creator);
}

describe("Funding Pool - Day 9/10", () => {
  describe("Initialization", () => {
    it("should initialize by deployer", () => {
      initEnv();
      const result = simnet.callReadOnlyFn("funding-pool", "get-admin-contract", [], deployer);
      expect(result.result).toEqual(Cl.ok(Cl.principal(deployer)));
    });

    it("should reject double initialize", () => {
      initEnv();
      const result = simnet.callPublicFn("funding-pool", "initialize", [
        Cl.principal(deployer), Cl.principal(deployer),
        Cl.principal(projectVerificationModule), Cl.principal(reputationContract), Cl.principal(milestoneEscrow),
      ], deployer);
      expect(result.result).toEqual(Cl.error(ERR_ALREADY_INITIALIZED));
    });

    it("should reject initialize by non-owner", () => {
      const result = simnet.callPublicFn("funding-pool", "initialize", [
        Cl.principal(deployer), Cl.principal(deployer),
        Cl.principal(projectVerificationModule), Cl.principal(reputationContract), Cl.principal(milestoneEscrow),
      ], creator);
      expect(result.result).toEqual(Cl.error(ERR_NOT_AUTHORIZED));
    });
  });

  describe("Create Pool", () => {
    beforeEach(() => initEnv());

    it("should create pool as verified creator", () => {
      const result = createPool();
      expect(result.result).toEqual(Cl.ok(Cl.uint(1)));
    });

    it("should reject create pool by unregistered user", () => {
      const result = simnet.callPublicFn("funding-pool", "create-pool", [
        Cl.stringAscii("test-pool"), Cl.uint(1000000), Cl.uint(100000),
        Cl.uint(0), Cl.uint(1000), Cl.uint(10),
      ], stranger);
      expect(result.result).toEqual(Cl.error(ERR_NOT_VERIFIED));
    });

    it("should reject create pool with zero target", () => {
      const result = simnet.callPublicFn("funding-pool", "create-pool", [
        Cl.stringAscii("test-pool"), Cl.uint(0), Cl.uint(MIN_CONTRIBUTION),
        Cl.uint(0), Cl.uint(1000), Cl.uint(10),
      ], creator);
      expect(result.result).toEqual(Cl.error(ERR_INVALID_TARGET));
    });

    it("should reject create pool with zero min-contribution", () => {
      const result = simnet.callPublicFn("funding-pool", "create-pool", [
        Cl.stringAscii("test-pool"), Cl.uint(TARGET_AMOUNT), Cl.uint(0),
        Cl.uint(0), Cl.uint(1000), Cl.uint(10),
      ], creator);
      expect(result.result).toEqual(Cl.error(ERR_MIN_CONTRIBUTION));
    });

    it("should reject create pool with excessive duration", () => {
      const result = simnet.callPublicFn("funding-pool", "create-pool", [
        Cl.stringAscii("test-pool"), Cl.uint(TARGET_AMOUNT), Cl.uint(MIN_CONTRIBUTION),
        Cl.uint(0), Cl.uint(90000), Cl.uint(10),
      ], creator);
      expect(result.result).toEqual(Cl.error(ERR_DURATION_EXCEEDED));
    });
  });

  describe("Join Pool", () => {
    beforeEach(() => {
      initEnv();
      createPool();
    });

    it("should join pool with sufficient commitment", () => {
      const result = simnet.callPublicFn("funding-pool", "join-pool", [
        Cl.uint(1), Cl.uint(MIN_CONTRIBUTION),
      ], backer1);
      expect(result.result).toEqual(Cl.ok(Cl.bool(true)));
    });

    it("should reject duplicate membership", () => {
      simnet.callPublicFn("funding-pool", "join-pool", [Cl.uint(1), Cl.uint(MIN_CONTRIBUTION)], backer1);
      const result = simnet.callPublicFn("funding-pool", "join-pool", [Cl.uint(1), Cl.uint(MIN_CONTRIBUTION)], backer1);
      expect(result.result).toEqual(Cl.error(ERR_ALREADY_MEMBER));
    });

    it("should reject join by unverified user", () => {
      const result = simnet.callPublicFn("funding-pool", "join-pool", [Cl.uint(1), Cl.uint(MIN_CONTRIBUTION)], stranger);
      expect(result.result).toEqual(Cl.error(ERR_NOT_VERIFIED));
    });

    it("should reject join when pool is full", () => {
      // Create pool with max-members=2 (creator + 1 more)
      simnet.callPublicFn("funding-pool", "create-pool", [
        Cl.stringAscii("small-pool"), Cl.uint(10000000), Cl.uint(MIN_CONTRIBUTION),
        Cl.uint(0), Cl.uint(1000), Cl.uint(2),
      ], creator);
      // backer1 joins (pool now has creator + backer1 = 2)
      simnet.callPublicFn("funding-pool", "join-pool", [Cl.uint(2), Cl.uint(MIN_CONTRIBUTION)], backer1);
      // backer2 tries to join (pool is full)
      const result = simnet.callPublicFn("funding-pool", "join-pool", [Cl.uint(2), Cl.uint(MIN_CONTRIBUTION)], backer2);
      expect(result.result).toEqual(Cl.error(ERR_POOL_FULL));
    });
  });

  describe("Contribute", () => {
    beforeEach(() => {
      initEnv();
      createPool();
      simnet.callPublicFn("funding-pool", "join-pool", [Cl.uint(1), Cl.uint(5000000)], backer1);
    });

    it("should accept STX contribution", () => {
      const result = simnet.callPublicFn("funding-pool", "contribute", [Cl.uint(1), Cl.uint(1000000)], backer1);
      expect(result.result).toEqual(Cl.ok(Cl.bool(true)));
    });

    it("should reject over-contribution", () => {
      const result = simnet.callPublicFn("funding-pool", "contribute", [Cl.uint(1), Cl.uint(9999999)], backer1);
      expect(result.result).toEqual(Cl.error(ERR_INSUFFICIENT_FUNDS));
    });

    it("should reject contribution from non-member", () => {
      const result = simnet.callPublicFn("funding-pool", "contribute", [Cl.uint(1), Cl.uint(MIN_CONTRIBUTION)], stranger);
      expect(result.result).toEqual(Cl.error(ERR_NOT_MEMBER));
    });

    it("should auto-close pool when total contributed reaches target", () => {
      // backer2 joins and contributes the remaining amount
      simnet.callPublicFn("funding-pool", "join-pool", [Cl.uint(1), Cl.uint(5000000)], backer2);
      simnet.callPublicFn("funding-pool", "contribute", [Cl.uint(1), Cl.uint(5000000)], backer1);
      const result = simnet.callPublicFn("funding-pool", "contribute", [Cl.uint(1), Cl.uint(5000000)], backer2);
      expect(result.result).toEqual(Cl.ok(Cl.bool(true)));

      // Pool should be closed now
      const pool = simnet.callReadOnlyFn("funding-pool", "get-pool", [Cl.uint(1)], deployer);
      expect(pool.result).toMatchObject(Cl.ok(Cl.some(Cl.tuple({
        name: Cl.stringAscii("test-pool"),
        creator: Cl.principal(creator),
        "target-amount": Cl.uint(TARGET_AMOUNT),
        "min-contribution": Cl.uint(MIN_CONTRIBUTION),
        "min-reputation": Cl.uint(0),
        duration: Cl.uint(1000),
        "total-committed": Cl.uint(10000000),
        "total-contributed": Cl.uint(10000000),
        "total-allocated": Cl.uint(0),
        status: Cl.stringAscii("closed"),
        "member-count": Cl.uint(3),
        "max-members": Cl.uint(10),
      }))));
    });

  });

  describe("Propose Allocation", () => {
    beforeEach(() => {
      initEnv();
      createPool();
      simnet.callPublicFn("funding-pool", "join-pool", [Cl.uint(1), Cl.uint(5000000)], backer1);
    });

    it("should propose allocation as member", () => {
      const result = simnet.callPublicFn("funding-pool", "propose-allocation", [
        Cl.uint(1), Cl.uint(1), Cl.uint(1000000),
      ], backer1);
      expect(result.result).toEqual(Cl.ok(Cl.uint(1)));
    });

    it("should reject proposal from non-member", () => {
      const result = simnet.callPublicFn("funding-pool", "propose-allocation", [
        Cl.uint(1), Cl.uint(1), Cl.uint(1000000),
      ], stranger);
      expect(result.result).toEqual(Cl.error(ERR_NOT_MEMBER));
    });

    it("should reject proposal exceeding unallocated capital", () => {
      const result = simnet.callPublicFn("funding-pool", "propose-allocation", [
        Cl.uint(1), Cl.uint(1), Cl.uint(99999999),
      ], backer1);
      expect(result.result).toEqual(Cl.error(ERR_INSUFFICIENT_UNALLOCATED));
    });

    it("should reject proposal for non-existent campaign", () => {
      const result = simnet.callPublicFn("funding-pool", "propose-allocation", [
        Cl.uint(1), Cl.uint(999), Cl.uint(1000000),
      ], backer1);
      expect(result.result).toEqual(Cl.error(ERR_CAMPAIGN_NOT_FOUND));
    });
  });

  describe("Vote", () => {
    beforeEach(() => {
      initEnv();
      createPool();
      simnet.callPublicFn("funding-pool", "join-pool", [Cl.uint(1), Cl.uint(5000000)], backer1);
      simnet.callPublicFn("funding-pool", "join-pool", [Cl.uint(1), Cl.uint(5000000)], backer2);
      simnet.callPublicFn("funding-pool", "propose-allocation", [Cl.uint(1), Cl.uint(1), Cl.uint(5000000)], backer1);
    });

    it("should cast vote as member", () => {
      const result = simnet.callPublicFn("funding-pool", "vote", [Cl.uint(1), Cl.bool(true)], backer1);
      expect(result.result).toEqual(Cl.ok(Cl.bool(true)));
    });

    it("should reject double vote", () => {
      simnet.callPublicFn("funding-pool", "vote", [Cl.uint(1), Cl.bool(true)], backer1);
      const result = simnet.callPublicFn("funding-pool", "vote", [Cl.uint(1), Cl.bool(true)], backer1);
      expect(result.result).toEqual(Cl.error(ERR_ALREADY_VOTED));
    });

    it("should reject vote from non-member", () => {
      const result = simnet.callPublicFn("funding-pool", "vote", [Cl.uint(1), Cl.bool(true)], stranger);
      expect(result.result).toEqual(Cl.error(ERR_NOT_MEMBER));
    });

    it("should reject vote from creator with zero voting power", () => {
      const result = simnet.callPublicFn("funding-pool", "vote", [Cl.uint(1), Cl.bool(true)], creator);
      expect(result.result).toEqual(Cl.error(ERR_ZERO_VOTING_POWER));
    });
  });

  describe("Execute Allocation", () => {
    beforeEach(() => {
      initEnv();
      createPool();
      // backer1 joins and contributes
      simnet.callPublicFn("funding-pool", "join-pool", [Cl.uint(1), Cl.uint(5000000)], backer1);
      simnet.callPublicFn("funding-pool", "contribute", [Cl.uint(1), Cl.uint(5000000)], backer1);
      // backer2 joins and contributes
      simnet.callPublicFn("funding-pool", "join-pool", [Cl.uint(1), Cl.uint(5000000)], backer2);
      simnet.callPublicFn("funding-pool", "contribute", [Cl.uint(1), Cl.uint(5000000)], backer2);
      // backer1 proposes allocation to campaign 1
      simnet.callPublicFn("funding-pool", "propose-allocation", [Cl.uint(1), Cl.uint(1), Cl.uint(5000000)], backer1);
      // Both backers vote FOR — combined 10M votes > 5M quorum
      simnet.callPublicFn("funding-pool", "vote", [Cl.uint(1), Cl.bool(true)], backer1);
      simnet.callPublicFn("funding-pool", "vote", [Cl.uint(1), Cl.bool(true)], backer2);
    });

    it("should execute passed proposal and deposit to milestone-escrow", () => {
      const result = simnet.callPublicFn("funding-pool", "execute-allocation", [Cl.uint(1)], backer1);
      expect(result.result).toEqual(Cl.ok(Cl.bool(true)));
    });

    it("should reject execute from non-existent proposal", () => {
      const result = simnet.callPublicFn("funding-pool", "execute-allocation", [Cl.uint(999)], backer1);
      expect(result.result).toEqual(Cl.error(ERR_PROPOSAL_NOT_FOUND));
    });
  });

  describe("Module Base Trait", () => {
    beforeEach(() => initEnv());

    it("should return module name", () => {
      const result = simnet.callReadOnlyFn("funding-pool", "get-module-name", [], deployer);
      expect(result.result).toEqual(Cl.ok(Cl.stringAscii("funding-pool")));
    });

    it("should return module version", () => {
      const result = simnet.callReadOnlyFn("funding-pool", "get-module-version", [], deployer);
      expect(result.result).toEqual(Cl.ok(Cl.uint(1)));
    });
  });
});
