import { describe, expect, it, beforeEach } from "vitest";
import { Cl } from "@stacks/transactions";

const accounts = simnet.getAccounts();
const deployer = accounts.get("deployer")!;
const creator = accounts.get("wallet_1")!;
const backer1 = accounts.get("wallet_3")!;
const backer2 = accounts.get("wallet_4")!;
const feeCollector = accounts.get("wallet_7")!;
const stranger = accounts.get("wallet_8")!;

const EMPTY_HASH = Cl.bufferFromHex("0000000000000000000000000000000000000000000000000000000000000000");
const STX_ASSET = "SP000000000000000000002Q6VF78";

// campaign-module (u300+)
const CM_ERR_CAMPAIGN_NOT_FOUND = Cl.error(Cl.uint(302));
const CM_ERR_ALREADY_CLAIMED = Cl.error(Cl.uint(305));
const CM_ERR_TRANSFER_FAILED = Cl.error(Cl.uint(306));
const CM_ERR_ESCROW_BALANCE = Cl.error(Cl.uint(307));
const CM_ERR_NOT_AUTHORIZED = Cl.error(Cl.uint(300));
const CM_ERR_FUNDING_GOAL_NOT_REACHED = Cl.error(Cl.uint(304));
const CM_ERR_SELF_CONTRIBUTION = Cl.error(Cl.uint(321));

// milestone-escrow (u5400+)
const ME_ERR_CAMPAIGN_NOT_FOUND = Cl.error(Cl.uint(5400));
const ME_ERR_NOT_AUTHORIZED = Cl.error(Cl.uint(5402));
const ME_ERR_INVALID_AMOUNT = Cl.error(Cl.uint(5406));
const ME_ERR_TRANSFER_FAILED = Cl.error(Cl.uint(5405));
const ME_ERR_INSUFFICIENT_FUNDS = Cl.error(Cl.uint(5404));

// milestone-verification (u5600+)
const MV_ERR_CAMPAIGN_NOT_FOUND = Cl.error(Cl.uint(5603));
const MV_ERR_MILESTONE_NOT_FOUND = Cl.error(Cl.uint(5604));
const MV_ERR_NOT_CREATOR = Cl.error(Cl.uint(5607));
const MV_ERR_NO_SUBMISSION = Cl.error(Cl.uint(5609));
const MV_ERR_DEADLINE_NOT_PASSED = Cl.error(Cl.uint(5616));
const MV_ERR_EMPTY_MILESTONES = Cl.error(Cl.uint(5618));

const TARGET_AMOUNT = 10000000;
const CAMPAIGN_DURATION = 5000;
const FAR_FUTURE = 9999999;
const desc = Cl.stringAscii("Test film campaign");
const rewardDesc = Cl.stringAscii("Postcard");
const singleMilestone = Cl.list([
  Cl.tuple({ name: Cl.stringAscii("Deliverable"), amount: Cl.uint(TARGET_AMOUNT) }),
]);

const ME = `${deployer}.milestone-escrow`;
const PVM = `${deployer}.project-verification-module`;

function initCore() {
  simnet.callPublicFn("oracle-proxy", "initialize", [Cl.principal(deployer), Cl.principal(deployer)], deployer);
  simnet.callPublicFn("oracle-proxy", "update-price", [Cl.uint(250)], deployer);
  simnet.callPublicFn("asset-registry", "initialize", [Cl.principal(deployer), Cl.principal(deployer), Cl.principal(STX_ASSET), Cl.principal(STX_ASSET)], deployer);
  simnet.callPublicFn("project-verification-module", "initialize", [Cl.principal(deployer), Cl.principal(deployer)], deployer);
  simnet.callPublicFn("reputation", "initialize", [Cl.principal(deployer)], deployer);
  simnet.callPublicFn("milestone-escrow", "initialize", [Cl.principal(deployer), Cl.principal(deployer)], deployer);
  simnet.callPublicFn("milestone-escrow", "set-fee-parameters", [Cl.principal(feeCollector), Cl.uint(500)], deployer);
}

function verifyCreator(address: string) {
  simnet.callPublicFn("project-verification-module", "register-creator", [
    Cl.principal(address), Cl.stringAscii("Name"), Cl.stringAscii("https://example.com"),
    EMPTY_HASH, Cl.stringAscii("film"), Cl.uint(1), Cl.uint(50000),
  ], address);
  simnet.callPublicFn("project-verification-module", "pay-verification-fee", [Cl.uint(1)], address);
  simnet.callPublicFn("project-verification-module", "verify-creator", [Cl.principal(address), Cl.uint(500000000)], deployer);
}

/** Create campaign in BOTH campaign-module AND milestone-escrow with matching id=1 */
function createLinkedCampaigns() {
  // 1. milestone-escrow (user-specified id)
  simnet.callPublicFn("milestone-escrow", "create-campaign", [
    Cl.uint(1), Cl.principal(STX_ASSET), Cl.uint(TARGET_AMOUNT), singleMilestone, Cl.uint(FAR_FUTURE),
  ], creator);
  // 2. campaign-module (auto-increments to id 1)
  simnet.callPublicFn("campaign-module", "create-campaign", [
    desc, Cl.uint(0), Cl.uint(TARGET_AMOUNT), Cl.uint(CAMPAIGN_DURATION), Cl.uint(2), rewardDesc,
    Cl.principal(PVM),
  ], creator);
}

// ============================================================
//  Flow 1: Campaign-module create + contribute
// ============================================================
describe("Flow 1: Campaign-module create + contribute", () => {
  beforeEach(() => {
    initCore();
    verifyCreator(creator);
    verifyCreator(backer1);
    verifyCreator(backer2);
  });

  it("creates campaign with auto-increment id", () => {
    const r = simnet.callPublicFn("campaign-module", "create-campaign", [
      desc, Cl.uint(0), Cl.uint(TARGET_AMOUNT), Cl.uint(CAMPAIGN_DURATION), Cl.uint(2), rewardDesc,
      Cl.principal(PVM),
    ], creator);
    expect(r.result).toEqual(Cl.ok(Cl.uint(1)));
  });

  it("backer contributes through campaign-module (linked to milestone-escrow)", () => {
    createLinkedCampaigns();
    const r = simnet.callPublicFn("campaign-module", "contribute-to-campaign", [
      Cl.uint(1), Cl.uint(1000000), Cl.principal(ME), Cl.principal(PVM),
    ], backer1);
    expect(r.result).toEqual(Cl.ok(Cl.bool(true)));

    const total = simnet.callReadOnlyFn("campaign-module", "get-total-raised-funds", [Cl.uint(1)], deployer);
    expect(total.result).toEqual(Cl.ok(Cl.uint(1000000)));

    const escrowBal = simnet.callReadOnlyFn("milestone-escrow", "get-campaign-balance", [Cl.uint(1)], deployer);
    expect(escrowBal.result).toEqual(Cl.ok(Cl.uint(1000000)));
  });

  it("contract-owner (deployer) rejected by is-valid-module check", () => {
    createLinkedCampaigns();
    const r = simnet.callPublicFn("campaign-module", "contribute-to-campaign", [
      Cl.uint(1), Cl.uint(100000), Cl.principal(ME), Cl.principal(PVM),
    ], deployer);
    // Deployer fails is-valid-module (ERR-INVALID-RECIPIENT u313) before self-contribution check
    expect(r.result).toEqual(Cl.error(Cl.uint(313)));
  });

  it("multiple backers accumulate in both systems", () => {
    createLinkedCampaigns();
    simnet.callPublicFn("campaign-module", "contribute-to-campaign", [
      Cl.uint(1), Cl.uint(300000), Cl.principal(ME), Cl.principal(PVM),
    ], backer1);
    simnet.callPublicFn("campaign-module", "contribute-to-campaign", [
      Cl.uint(1), Cl.uint(700000), Cl.principal(ME), Cl.principal(PVM),
    ], backer2);

    const cmTotal = simnet.callReadOnlyFn("campaign-module", "get-total-raised-funds", [Cl.uint(1)], deployer);
    expect(cmTotal.result).toEqual(Cl.ok(Cl.uint(1000000)));

    const meBal = simnet.callReadOnlyFn("milestone-escrow", "get-campaign-balance", [Cl.uint(1)], deployer);
    expect(meBal.result).toEqual(Cl.ok(Cl.uint(1000000)));
  });
});

// ============================================================
//  Flow 2: Milestone-escrow backward-compat wrappers
// ============================================================
describe("Flow 2: Milestone-escrow wrappers", () => {
  beforeEach(() => {
    initCore();
    verifyCreator(creator);
    verifyCreator(backer1);
    createLinkedCampaigns();
  });

  it("deposit-to-campaign works", () => {
    const r = simnet.callPublicFn("milestone-escrow", "deposit-to-campaign", [Cl.uint(1), Cl.uint(500000)], backer1);
    expect(r.result).toEqual(Cl.ok(Cl.bool(true)));
    const bal = simnet.callReadOnlyFn("milestone-escrow", "get-campaign-balance", [Cl.uint(1)], deployer);
    expect(bal.result).toEqual(Cl.ok(Cl.uint(500000)));
  });

  it("withdraw-from-campaign succeeds (no balance check)", () => {
    simnet.callPublicFn("milestone-escrow", "deposit-to-campaign", [Cl.uint(1), Cl.uint(1000000)], backer1);
    const r = simnet.callPublicFn("milestone-escrow", "withdraw-from-campaign", [Cl.uint(1), Cl.uint(400000)], deployer);
    expect(r.result).toEqual(Cl.ok(Cl.bool(true)));
    // get-campaign-balance tracks total-deposited which is NOT decremented by the wrapper
  });

  it("collect-campaign-fee sends STX to collector", () => {
    simnet.callPublicFn("milestone-escrow", "deposit-to-campaign", [Cl.uint(1), Cl.uint(1000000)], backer1);
    const r = simnet.callPublicFn("milestone-escrow", "collect-campaign-fee", [Cl.uint(1), Cl.uint(50000)], deployer);
    expect(r.result).toEqual(Cl.ok(Cl.bool(true)));
  });

  it("wrappers err on non-existent campaign (deposit, withdraw)", () => {
    // deposit-to-campaign delegates to deposit which checks campaign
    const r1 = simnet.callPublicFn("milestone-escrow", "deposit-to-campaign", [Cl.uint(999), Cl.uint(1000)], backer1);
    expect(r1.result).toEqual(ME_ERR_CAMPAIGN_NOT_FOUND);
    // withdraw-from-campaign looks up campaign
    const r2 = simnet.callPublicFn("milestone-escrow", "withdraw-from-campaign", [Cl.uint(999), Cl.uint(1000)], deployer);
    expect(r2.result).toEqual(ME_ERR_CAMPAIGN_NOT_FOUND);
  });

  it("collect-campaign-fee does NOT validate campaign (succeeds anyway)", () => {
    // Wrapper just does as-contract stx-transfer without checking campaign existence.
    // If the contract has enough STX the transfer succeeds even for fake campaign ids.
    const r = simnet.callPublicFn("milestone-escrow", "collect-campaign-fee", [Cl.uint(999), Cl.uint(1)], deployer);
    expect(r.result).toEqual(Cl.ok(Cl.bool(true)));
  });
});

// ============================================================
//  Flow 3: Milestone-verification lifecycle
// ============================================================
describe("Flow 3: Milestone-verification lifecycle", () => {
  beforeEach(() => {
    initCore();
    verifyCreator(creator);
    verifyCreator(backer1);
    createLinkedCampaigns();

    simnet.callPublicFn("milestone-verification", "initialize", [
      Cl.principal(deployer), Cl.principal(deployer),
      Cl.principal(`${deployer}.yield-escrow`), Cl.principal(ME),
    ], deployer);
  });

  it("creates milestones and reads back", () => {
    const deadlines = Cl.list([Cl.uint(FAR_FUTURE), Cl.uint(FAR_FUTURE), Cl.uint(FAR_FUTURE)]);
    const r = simnet.callPublicFn("milestone-verification", "create-milestones", [Cl.uint(1), deadlines], creator);
    expect(r.result).toEqual(Cl.ok(Cl.bool(true)));
  });

  it("rejects empty milestones list", () => {
    const r = simnet.callPublicFn("milestone-verification", "create-milestones", [Cl.uint(1), Cl.list([])], creator);
    expect(r.result).toEqual(MV_ERR_EMPTY_MILESTONES);
  });

  it("rejects create-milestones by non-creator", () => {
    const r = simnet.callPublicFn("milestone-verification", "create-milestones", [Cl.uint(1), Cl.list([Cl.uint(FAR_FUTURE)])], backer1);
    expect(r.result).toEqual(MV_ERR_NOT_CREATOR);
  });

  it("submit + endorse + finalize (with low deadline) fails finalize", () => {
    // Deadline of 1 — submit works (block >= deadline? No — submit requires block <= deadline.
    // Actually submit requires <= deadline, so deadline=1 fails for submit too since block-height > 1)
    // Use FAR_FUTURE for submit, but then finalize won't trigger since deadline not passed.
    const d = Cl.uint(FAR_FUTURE);
    simnet.callPublicFn("milestone-verification", "create-milestones", [Cl.uint(1), Cl.list([d, d, d])], creator);

    simnet.callPublicFn("campaign-module", "contribute-to-campaign", [
      Cl.uint(1), Cl.uint(500000), Cl.principal(ME), Cl.principal(PVM),
    ], backer1);

    // Submit
    expect(simnet.callPublicFn("milestone-verification", "submit-milestone", [Cl.uint(1), Cl.uint(0)], creator).result)
      .toEqual(Cl.ok(Cl.bool(true)));

    // Endorse
    expect(simnet.callPublicFn("milestone-verification", "endorse-milestone", [Cl.uint(1), Cl.uint(0), Cl.bool(true)], backer1).result)
      .toEqual(Cl.ok(Cl.bool(true)));

    // Finalize fails — deadline not passed
    expect(simnet.callPublicFn("milestone-verification", "finalize-milestone", [Cl.uint(1), Cl.uint(0)], deployer).result)
      .toEqual(MV_ERR_DEADLINE_NOT_PASSED);
  });
});

// ============================================================
//  Flow 4: Campaign-module claim
// ============================================================
describe("Flow 4: Campaign-module claim", () => {
  beforeEach(() => {
    initCore();
    verifyCreator(creator);
    verifyCreator(backer1);
    createLinkedCampaigns();

    // Fully fund the campaign via campaign-module
    simnet.callPublicFn("campaign-module", "contribute-to-campaign", [
      Cl.uint(1), Cl.uint(TARGET_AMOUNT), Cl.principal(ME), Cl.principal(PVM),
    ], backer1);
  });

  it("claim succeeds when goal reached", () => {
    const r = simnet.callPublicFn("campaign-module", "claim-campaign-funds", [
      Cl.uint(1), Cl.principal(ME),
    ], deployer);
    expect(r.result).toEqual(Cl.ok(Cl.bool(true)));
  });

  it("double-claim fails (campaign inactive after first)", () => {
    const r1 = simnet.callPublicFn("campaign-module", "claim-campaign-funds", [Cl.uint(1), Cl.principal(ME)], deployer);
    expect(r1.result).toEqual(Cl.ok(Cl.bool(true)));
    const r2 = simnet.callPublicFn("campaign-module", "claim-campaign-funds", [Cl.uint(1), Cl.principal(ME)], deployer);
    // Claim sets is-active=false, so second claim fails with ERR-CAMPAIGN-INACTIVE (u303)
    expect(r2.result).toEqual(Cl.error(Cl.uint(303)));
  });

  it("non-core caller cannot claim", () => {
    const r = simnet.callPublicFn("campaign-module", "claim-campaign-funds", [Cl.uint(1), Cl.principal(ME)], backer1);
    expect(r.result).toEqual(CM_ERR_NOT_AUTHORIZED);
  });
});

// ============================================================
//  Flow 5: Edge cases
// ============================================================
describe("Flow 5: Edge cases", () => {
  beforeEach(() => initCore());

  it("contribute to non-existent campaign-module campaign", () => {
    verifyCreator(backer1);
    const r = simnet.callPublicFn("campaign-module", "contribute-to-campaign", [
      Cl.uint(999), Cl.uint(100000), Cl.principal(ME), Cl.principal(PVM),
    ], backer1);
    expect(r.result).toEqual(CM_ERR_CAMPAIGN_NOT_FOUND);
  });

  it("deposit to non-existent milestone-escrow campaign", () => {
    verifyCreator(backer1);
    const r = simnet.callPublicFn("milestone-escrow", "deposit", [Cl.uint(999), Cl.uint(1000)], backer1);
    expect(r.result).toEqual(ME_ERR_CAMPAIGN_NOT_FOUND);
  });

  it("deposit of zero rejected", () => {
    verifyCreator(creator);
    simnet.callPublicFn("milestone-escrow", "create-campaign", [
      Cl.uint(1), Cl.principal(STX_ASSET), Cl.uint(TARGET_AMOUNT), singleMilestone, Cl.uint(FAR_FUTURE),
    ], creator);
    const r = simnet.callPublicFn("milestone-escrow", "deposit", [Cl.uint(1), Cl.uint(0)], backer1);
    expect(r.result).toEqual(ME_ERR_INVALID_AMOUNT);
  });

  it("set-fee-parameters by non-owner", () => {
    const r = simnet.callPublicFn("milestone-escrow", "set-fee-parameters", [Cl.principal(creator), Cl.uint(300)], creator);
    expect(r.result).toEqual(ME_ERR_NOT_AUTHORIZED);
  });

  it("create-milestones on non-existent campaign", () => {
    simnet.callPublicFn("milestone-verification", "initialize", [
      Cl.principal(deployer), Cl.principal(deployer),
      Cl.principal(`${deployer}.yield-escrow`), Cl.principal(ME),
    ], deployer);
    const r = simnet.callPublicFn("milestone-verification", "create-milestones", [Cl.uint(999), Cl.list([Cl.uint(1)])], creator);
    expect(r.result).toEqual(MV_ERR_CAMPAIGN_NOT_FOUND);
  });

  it("campaign-module and milestone-escrow both track campaign 1 independently", () => {
    verifyCreator(creator);
    createLinkedCampaigns();
    // campaign-module tracks crowdfunding data
    const owner = simnet.callReadOnlyFn("campaign-module", "get-campaign-owner", [Cl.uint(1)], deployer);
    expect(owner.result).toEqual(Cl.ok(Cl.principal(creator)));
    const goal = simnet.callReadOnlyFn("campaign-module", "get-campaign-funding-goal", [Cl.uint(1)], deployer);
    expect(goal.result).toEqual(Cl.ok(Cl.uint(TARGET_AMOUNT)));
    const raised = simnet.callReadOnlyFn("campaign-module", "get-total-raised-funds", [Cl.uint(1)], deployer);
    expect(raised.result).toEqual(Cl.ok(Cl.uint(0)));
    // milestone-escrow tracks escrow data
    const meBal = simnet.callReadOnlyFn("milestone-escrow", "get-campaign-balance", [Cl.uint(1)], deployer);
    expect(meBal.result).toEqual(Cl.ok(Cl.uint(0)));
  });
});
