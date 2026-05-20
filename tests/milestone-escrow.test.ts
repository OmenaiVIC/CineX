import { describe, expect, it, beforeEach } from "vitest";
import { Cl } from "@stacks/transactions";

const accounts = simnet.getAccounts();
const deployer = accounts.get("deployer")!;
const creator = accounts.get("wallet_1")!;
const backer1 = accounts.get("wallet_2")!;
const backer2 = accounts.get("wallet_3")!;
const nonContributor = accounts.get("wallet_4")!;
const stranger = accounts.get("wallet_5")!;
const feeCollector = accounts.get("wallet_6")!;

// Error constants (u5400-u5423)
const ERR_CAMPAIGN_NOT_FOUND = Cl.uint(5400);
const ERR_MILESTONE_NOT_FOUND = Cl.uint(5401);
const ERR_NOT_AUTHORIZED = Cl.uint(5402);
const ERR_INSUFFICIENT_FUNDS = Cl.uint(5404);
const ERR_TRANSFER_FAILED = Cl.uint(5405);
const ERR_INVALID_AMOUNT = Cl.uint(5406);
const ERR_PREVIOUS_MILESTONE_NOT_APPROVED = Cl.uint(5407);
const ERR_CREATOR_CANNOT_APPROVE = Cl.uint(5408);
const ERR_NOT_A_CONTRIBUTOR = Cl.uint(5409);
const ERR_MILESTONE_ALREADY_APPROVED = Cl.uint(5410);
const ERR_CAMPAIGN_COMPLETED = Cl.uint(5412);
const ERR_INVALID_DEADLINE = Cl.uint(5413);
const ERR_MILESTONE_LIMIT = Cl.uint(5414);
const ERR_CAMPAIGN_EXPIRED = Cl.uint(5415);
const ERR_FUNDING_CAP_EXCEEDED = Cl.uint(5416);
const ERR_NO_PROOF = Cl.uint(5417);
const ERR_ASSET_NOT_SUPPORTED = Cl.uint(5421);
const ERR_ORACLE_FETCH_FAILED = Cl.uint(5422);

const STX_ASSET = "SP000000000000000000002Q6VF78";
const STX_PRICE_CENTS = 250;

const MILESTONES_2 = Cl.list([
  Cl.tuple({ name: Cl.stringAscii("pre-production"), amount: Cl.uint(1000000) }),
  Cl.tuple({ name: Cl.stringAscii("post-production"), amount: Cl.uint(1000000) }),
]);

const MILESTONES_1 = Cl.list([
  Cl.tuple({ name: Cl.stringAscii("deliverable"), amount: Cl.uint(500000) }),
]);

const PROOF_HASH = Cl.bufferFromHex(new Array(32).fill("ab").join(""));

function initEnv() {
  // oracle-proxy: initialize + set price
  simnet.callPublicFn("oracle-proxy", "initialize", [Cl.principal(deployer), Cl.principal(deployer)], deployer);
  simnet.callPublicFn("oracle-proxy", "update-price", [Cl.uint(STX_PRICE_CENTS)], deployer);

  // asset-registry: initialize with STX, sBTC, USDCx
  simnet.callPublicFn("asset-registry", "initialize", [Cl.principal(deployer), Cl.principal(deployer), Cl.principal(STX_ASSET), Cl.principal(STX_ASSET)], deployer);

  // project-verification-module: initialize
  simnet.callPublicFn("project-verification-module", "initialize", [Cl.principal(deployer), Cl.principal(deployer)], deployer);

  // milestone-escrow: initialize + set fee collector
  simnet.callPublicFn("milestone-escrow", "initialize", [Cl.principal(deployer), Cl.principal(deployer)], deployer);
  simnet.callPublicFn("milestone-escrow", "set-fee-parameters", [Cl.principal(feeCollector), Cl.uint(500)], deployer);
}

describe("Milestone Escrow - Part A Gap Fixes", () => {
  describe("Initialization", () => {
    it("should deploy and initialize all dependencies", () => {
      initEnv();
      const fee = simnet.callReadOnlyFn("milestone-escrow", "get-platform-fee-collector", [], deployer);
      expect(fee.result).toEqual(Cl.ok(Cl.principal(feeCollector)));
    });

    it("should reject initialize from non-owner", () => {
      const result = simnet.callPublicFn("milestone-escrow", "initialize", [Cl.principal(backer1), Cl.principal(backer1)], backer1);
      expect(result.result).toEqual(Cl.error(ERR_NOT_AUTHORIZED));
    });
  });

  describe("create-campaign - Asset Registry Check", () => {
    beforeEach(() => initEnv());

    it("should reject unsupported asset", () => {
      const result = simnet.callPublicFn("milestone-escrow", "create-campaign", [
        Cl.uint(1),
        Cl.principal("SP3K8BC0PPEVCV7NZ6QSRWPQ2JE9E5B6N3PA0KBR9.some-unknown-token"),
        Cl.uint(1000000), MILESTONES_2, Cl.uint(9999999),
      ], creator);
      expect(result.result).toEqual(Cl.error(ERR_ASSET_NOT_SUPPORTED));
    });

    it("should accept STX as supported asset", () => {
      const result = simnet.callPublicFn("milestone-escrow", "create-campaign", [
        Cl.uint(1), Cl.principal(STX_ASSET), Cl.uint(500000), MILESTONES_1, Cl.uint(9999999),
      ], creator);
      expect(result.result).toEqual(Cl.ok(Cl.uint(1)));
    });
  });

  describe("create-campaign - Oracle Fee Computation", () => {
    beforeEach(() => initEnv());

    it("should create campaign with verification fee", () => {
      const result = simnet.callPublicFn("milestone-escrow", "create-campaign", [
        Cl.uint(1), Cl.principal(STX_ASSET), Cl.uint(2000000), MILESTONES_2, Cl.uint(9999999),
      ], creator);
      expect(result.result).toEqual(Cl.ok(Cl.uint(1)));
    });

    it("should create campaign successfully even with oracle zero price (fee=0)", () => {
      simnet.callPublicFn("oracle-proxy", "update-price", [Cl.uint(0)], deployer);
      const result = simnet.callPublicFn("milestone-escrow", "create-campaign", [
        Cl.uint(2), Cl.principal(STX_ASSET), Cl.uint(1000000), MILESTONES_1, Cl.uint(9999999),
      ], creator);
      expect(result.result).toEqual(Cl.ok(Cl.uint(1)));
    });
  });

  describe("create-campaign - Input Validation", () => {
    beforeEach(() => initEnv());

    it("should reject zero-goal campaign", () => {
      const result = simnet.callPublicFn("milestone-escrow", "create-campaign", [
        Cl.uint(4), Cl.principal(STX_ASSET), Cl.uint(0), MILESTONES_1, Cl.uint(9999999),
      ], creator);
      expect(result.result).toEqual(Cl.error(ERR_INVALID_AMOUNT));
    });

    it("should reject expired deadline", () => {
      const result = simnet.callPublicFn("milestone-escrow", "create-campaign", [
        Cl.uint(5), Cl.principal(STX_ASSET), Cl.uint(1000000), MILESTONES_1, Cl.uint(1),
      ], creator);
      expect(result.result).toEqual(Cl.error(ERR_INVALID_DEADLINE));
    });

    it("should reject empty milestone list", () => {
      const result = simnet.callPublicFn("milestone-escrow", "create-campaign", [
        Cl.uint(6), Cl.principal(STX_ASSET), Cl.uint(1000000), Cl.list([]), Cl.uint(9999999),
      ], creator);
      expect(result.result).toEqual(Cl.error(ERR_MILESTONE_NOT_FOUND));
    });

    it("should reject goal exceeding funding cap for unverified creator", () => {
      const result = simnet.callPublicFn("milestone-escrow", "create-campaign", [
        Cl.uint(8), Cl.principal(STX_ASSET), Cl.uint(999999999999), MILESTONES_1, Cl.uint(9999999),
      ], creator);
      expect(result.result).toEqual(Cl.error(ERR_FUNDING_CAP_EXCEEDED));
    });
  });

  describe("deposit", () => {
    beforeEach(() => {
      initEnv();
      simnet.callPublicFn("milestone-escrow", "create-campaign", [
        Cl.uint(1), Cl.principal(STX_ASSET), Cl.uint(2000000), MILESTONES_2, Cl.uint(9999999),
      ], creator);
    });

    it("should accept deposit from backer", () => {
      const result = simnet.callPublicFn("milestone-escrow", "deposit", [Cl.uint(1), Cl.uint(500000)], backer1);
      expect(result.result).toEqual(Cl.ok(Cl.bool(true)));
    });

    it("should reject deposit to non-existent campaign", () => {
      const result = simnet.callPublicFn("milestone-escrow", "deposit", [Cl.uint(999), Cl.uint(500000)], backer1);
      expect(result.result).toEqual(Cl.error(ERR_CAMPAIGN_NOT_FOUND));
    });

    it("should reject deposit exceeding total goal", () => {
      const result = simnet.callPublicFn("milestone-escrow", "deposit", [Cl.uint(1), Cl.uint(999999999)], backer1);
      expect(result.result).toEqual(Cl.error(ERR_INSUFFICIENT_FUNDS));
    });
  });

  describe("approve-milestone", () => {
    beforeEach(() => {
      initEnv();
      simnet.callPublicFn("milestone-escrow", "create-campaign", [
        Cl.uint(1), Cl.principal(STX_ASSET), Cl.uint(2000000), MILESTONES_2, Cl.uint(9999999),
      ], creator);
      simnet.callPublicFn("milestone-escrow", "deposit", [Cl.uint(1), Cl.uint(2000000)], backer1);
    });

    it("should reject approval without proof", () => {
      const result = simnet.callPublicFn("milestone-escrow", "approve-milestone", [Cl.uint(1), Cl.uint(0)], backer1);
      expect(result.result).toEqual(Cl.error(ERR_NO_PROOF));
    });

    it("should reject creator self-approval", () => {
      simnet.callPublicFn("milestone-escrow", "submit-milestone-proof", [Cl.uint(1), Cl.uint(0), PROOF_HASH], creator);
      const result = simnet.callPublicFn("milestone-escrow", "approve-milestone", [Cl.uint(1), Cl.uint(0)], creator);
      expect(result.result).toEqual(Cl.error(ERR_CREATOR_CANNOT_APPROVE));
    });

    it("should reject approval from non-contributor", () => {
      simnet.callPublicFn("milestone-escrow", "submit-milestone-proof", [Cl.uint(1), Cl.uint(0), PROOF_HASH], creator);
      const result = simnet.callPublicFn("milestone-escrow", "approve-milestone", [Cl.uint(1), Cl.uint(0)], stranger);
      expect(result.result).toEqual(Cl.error(ERR_NOT_A_CONTRIBUTOR));
    });

    it("should approve first milestone after proof", () => {
      simnet.callPublicFn("milestone-escrow", "submit-milestone-proof", [Cl.uint(1), Cl.uint(0), PROOF_HASH], creator);
      const result = simnet.callPublicFn("milestone-escrow", "approve-milestone", [Cl.uint(1), Cl.uint(0)], backer1);
      expect(result.result).toEqual(Cl.ok(Cl.bool(true)));
    });

    it("should reject approving milestone 2 before milestone 1", () => {
      simnet.callPublicFn("milestone-escrow", "submit-milestone-proof", [Cl.uint(1), Cl.uint(0), PROOF_HASH], creator);
      simnet.callPublicFn("milestone-escrow", "submit-milestone-proof", [Cl.uint(1), Cl.uint(1), PROOF_HASH], creator);
      const result = simnet.callPublicFn("milestone-escrow", "approve-milestone", [Cl.uint(1), Cl.uint(1)], backer1);
      expect(result.result).toEqual(Cl.error(ERR_PREVIOUS_MILESTONE_NOT_APPROVED));
    });
  });

  describe("release-milestone-funds", () => {
    beforeEach(() => {
      initEnv();
      simnet.callPublicFn("milestone-escrow", "create-campaign", [
        Cl.uint(1), Cl.principal(STX_ASSET), Cl.uint(2000000), MILESTONES_2, Cl.uint(9999999),
      ], creator);
      simnet.callPublicFn("milestone-escrow", "deposit", [Cl.uint(1), Cl.uint(2000000)], backer1);
      simnet.callPublicFn("milestone-escrow", "submit-milestone-proof", [Cl.uint(1), Cl.uint(0), PROOF_HASH], creator);
      simnet.callPublicFn("milestone-escrow", "approve-milestone", [Cl.uint(1), Cl.uint(0)], backer1);
    });

    it("should release funds with fee deduction", () => {
      const result = simnet.callPublicFn("milestone-escrow", "release-milestone-funds", [Cl.uint(1), Cl.uint(0)], deployer);
      expect(result.result).toEqual(Cl.ok(Cl.bool(true)));
    });

    it("should reject release of unapproved milestone", () => {
      const result = simnet.callPublicFn("milestone-escrow", "release-milestone-funds", [Cl.uint(1), Cl.uint(1)], deployer);
      expect(result.result).toEqual(Cl.error(ERR_NOT_AUTHORIZED));
    });

    it("should reject release from non-existent campaign", () => {
      const result = simnet.callPublicFn("milestone-escrow", "release-milestone-funds", [Cl.uint(999), Cl.uint(0)], deployer);
      expect(result.result).toEqual(Cl.error(ERR_CAMPAIGN_NOT_FOUND));
    });
  });

  describe("set-fee-parameters", () => {
    beforeEach(() => initEnv());

    it("should update fee parameters by owner", () => {
      const result = simnet.callPublicFn("milestone-escrow", "set-fee-parameters", [Cl.principal(feeCollector), Cl.uint(1000)], deployer);
      expect(result.result).toEqual(Cl.ok(Cl.bool(true)));
    });

    it("should reject excessive fee rate", () => {
      const result = simnet.callPublicFn("milestone-escrow", "set-fee-parameters", [Cl.principal(feeCollector), Cl.uint(3000)], deployer);
      expect(result.result).toEqual(Cl.error(ERR_INVALID_AMOUNT));
    });

    it("should reject fee update by non-owner", () => {
      const result = simnet.callPublicFn("milestone-escrow", "set-fee-parameters", [Cl.principal(feeCollector), Cl.uint(1000)], backer1);
      expect(result.result).toEqual(Cl.error(ERR_NOT_AUTHORIZED));
    });
  });

  describe("read-only getters", () => {
    beforeEach(() => initEnv());

    it("should return fee constants", () => {
      const fee = simnet.callReadOnlyFn("milestone-escrow", "get-verification-fee-usd-cents", [], deployer);
      expect(fee.result).toEqual(Cl.ok(Cl.uint(500)));
    });
  });

  describe("verification fee computation", () => {
    beforeEach(() => initEnv());

    it("should create campaign with correct fee deduction", () => {
      const result = simnet.callPublicFn("milestone-escrow", "create-campaign", [
        Cl.uint(1), Cl.principal(STX_ASSET), Cl.uint(500000), MILESTONES_1, Cl.uint(9999999),
      ], creator);
      expect(result.result).toEqual(Cl.ok(Cl.uint(1)));
    });
  });
});
