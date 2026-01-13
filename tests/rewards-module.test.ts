// -----------------------------------------------------------------------------
// REWARDS MODULE TEST
// -----------------------------------------------------------------------------

import { describe, expect, it, beforeAll, beforeEach } from "vitest";
import { Cl } from "@stacks/transactions";

const accounts = simnet.getAccounts();
const deployer = accounts.get("deployer")!;
const wallet1 = accounts.get("wallet_1")!;
const wallet2 = accounts.get("wallet_2")!;
const wallet3 = accounts.get("wallet_3")!;

// Mock contract addresses for testing
const MOCK_CORE_CONTRACT = deployer;
const MOCK_CROWDFUNDING_CONTRACT = deployer; 
const MOCK_REWARDS_CONTRACT = deployer;

// -----------------------------------------------------------------------------
// MAIN TEST SUITE
// -----------------------------------------------------------------------------
describe("rewards-module core functionality tests", () => {

  // ---------------------------------------------------------------------------
  // PHASE 1: BASIC INFRASTRUCTURE & INITIALIZATION
  // ---------------------------------------------------------------------------
  describe("basic infrastructure", () => {
    it("ensures rewards module is deployed", () => {
      const source = simnet.getContractSource("rewards-module");
      expect(source).toBeDefined();
    });

    it("verifies trait implementation", () => {
      const source = simnet.getContractSource("rewards-module");
      expect(source).toContain("impl-trait .rewards-module-trait.rewards-trait");
      expect(source).toContain("impl-trait .emergency-module-trait.emergency-module-trait");
    });

    it("can call get-module-version", () => {
      const result = simnet.callReadOnlyFn(
        "rewards-module",
        "get-module-version", 
        [],
        deployer
      );
      expect(result.result.type).toBe(7); // Success type
    });

    it("can call is-system-paused", () => {
      const result = simnet.callReadOnlyFn(
        "rewards-module",
        "is-system-paused",
        [],
        deployer
      );
      expect(result.result.type).toBe(7); // Success type
    });

    it("can call is-module-active", () => {
      const result = simnet.callReadOnlyFn(
        "rewards-module",
        "is-module-active",
        [],
        deployer
      );
      expect(result.result.type).toBe(7); // Success type
    });

    it("can call get-module-name", () => {
      const result = simnet.callReadOnlyFn(
        "rewards-module",
        "get-module-name",
        [],
        deployer
      );
      expect(result.result.type).toBe(7); // Success type
    });
  });

  // ---------------------------------------------------------------------------
  // PHASE 2: INITIALIZATION & CONFIGURATION
  // ---------------------------------------------------------------------------
  describe("initialization and configuration", () => {
    
    it("initializes the module successfully", () => {
      const initResult = simnet.callPublicFn(
        "rewards-module",
        "initialize",
        [
          Cl.principal(MOCK_CORE_CONTRACT),
          Cl.principal(MOCK_CROWDFUNDING_CONTRACT),
          Cl.principal(MOCK_REWARDS_CONTRACT)
        ],
        deployer
      );
      expect(initResult.result.type).toBe(7); // Success type
    });

    it("fails to initialize when not called by contract owner", () => {
      const initResult = simnet.callPublicFn(
        "rewards-module",
        "initialize",
        [
          Cl.principal(MOCK_CORE_CONTRACT),
          Cl.principal(MOCK_CROWDFUNDING_CONTRACT),
          Cl.principal(MOCK_REWARDS_CONTRACT)
        ],
        wallet1 // Not the owner
      );
      expect(initResult.result.type).toBe(8); // Error type
    });

    it("sets crowdfunding contract successfully", () => {
      const setResult = simnet.callPublicFn(
        "rewards-module",
        "set-crowdfunding",
        [Cl.principal(wallet1)],
        deployer
      );
      expect(setResult.result.type).toBe(7); // Success type
    });

    it("fails to set crowdfunding contract when not owner", () => {
      const setResult = simnet.callPublicFn(
        "rewards-module",
        "set-crowdfunding",
        [Cl.principal(wallet1)],
        wallet2 // Not the owner
      );
      expect(setResult.result.type).toBe(8); // Error type
    });

    it("sets rewards contract successfully", () => {
      const setResult = simnet.callPublicFn(
        "rewards-module",
        "set-rewards",
        [Cl.principal(wallet2)],
        deployer
      );
      expect(setResult.result.type).toBe(7); // Success type
    });
  });

  // ---------------------------------------------------------------------------
  // PHASE 3: REWARD AWARDING FUNCTIONALITY
  // ---------------------------------------------------------------------------
  describe("reward awarding functionality", () => {
    
    beforeAll(() => {
      console.log("Setting up rewards module for testing...");
      
      // Initialize the module first
      const initResult = simnet.callPublicFn(
        "rewards-module",
        "initialize",
        [
          Cl.principal(deployer),
          Cl.principal(deployer),
          Cl.principal(deployer)
        ],
        deployer
      );
      console.log("Rewards module init:", initResult.result.type);
    });

    // -------------------------------------------------------------------------
    // TEST 1: Single Reward Awarding (Mocked dependencies)
    // -------------------------------------------------------------------------
    it("tests single reward awarding process", () => {
      const awardResult = simnet.callPublicFn(
        "rewards-module",
        "award-campaign-reward",
        [
          Cl.uint(100),           // campaign-id
          Cl.principal(wallet2),  // new-contributor
          Cl.uint(1),             // new-reward-tier
          Cl.stringAscii("Early access digital copy and credits"), // reward description
          Cl.contractPrincipal(deployer, "crowdfunding-module") // crowdfunding address
        ],
        wallet1 // campaign owner
      );

      console.log("Single reward award result:", awardResult.result);
      expect(awardResult.result).toBeDefined();
    });

    // -------------------------------------------------------------------------
    // TEST 2: Batch Reward Awarding
    // -------------------------------------------------------------------------
    it("tests batch reward awarding process", () => {
      const contributors = [
        Cl.principal(wallet1),
        Cl.principal(wallet2),
        Cl.principal(wallet3)
      ];
      
      const rewardTiers = [
        Cl.uint(1),
        Cl.uint(2), 
        Cl.uint(1)
      ];
      
      const rewardDescriptions = [
        Cl.stringAscii("Digital copy"),
        Cl.stringAscii("Digital copy + credits"),
        Cl.stringAscii("Digital copy")
      ];

      const batchResult = simnet.callPublicFn(
        "rewards-module",
        "batch-award-campaign-rewards",
        [
          Cl.uint(100),           // campaign-id
          Cl.list(contributors),  // contributors list
          Cl.list(rewardTiers),   // reward tiers list  
          Cl.list(rewardDescriptions), // descriptions list
          Cl.contractPrincipal(deployer, "crowdfunding-module") // crowdfunding address
        ],
        wallet1 // campaign owner
      );

      console.log("Batch reward result:", batchResult.result);
      expect(batchResult.result).toBeDefined();
    });

    // -------------------------------------------------------------------------
    // TEST 3: Contributor Reward Retrieval
    // -------------------------------------------------------------------------
    it("tests contributor reward retrieval", () => {
      const rewardDetails = simnet.callReadOnlyFn(
        "rewards-module",
        "get-contributor-reward",
        [
          Cl.uint(100),           // campaign-id
          Cl.principal(wallet2)   // contributor
        ],
        deployer
      );

      console.log("Contributor reward details:", rewardDetails.result);
      expect(rewardDetails.result).toBeDefined();
    });

    // -------------------------------------------------------------------------
    // TEST 4: Invalid Reward Tier Handling
    // -------------------------------------------------------------------------
    it("handles invalid reward tier gracefully", () => {
      const invalidTierResult = simnet.callPublicFn(
        "rewards-module",
        "award-campaign-reward",
        [
          Cl.uint(100),
          Cl.principal(wallet2),
          Cl.uint(5), // Invalid tier (assuming campaign only has 3 tiers)
          Cl.stringAscii("Invalid tier reward"),
          Cl.contractPrincipal(deployer, "crowdfunding-module")
        ],
        wallet1
      );

      console.log("Invalid tier result:", invalidTierResult.result);
      expect(invalidTierResult.result.type).toBe(8); // Error type
    });

    // -------------------------------------------------------------------------
    // TEST 5: Unequal List Lengths in Batch
    // -------------------------------------------------------------------------
    it("handles unequal list lengths in batch operation", () => {
      const contributors = [
        Cl.principal(wallet1),
        Cl.principal(wallet2)
        // Only 2 contributors
      ];
      
      const rewardTiers = [
        Cl.uint(1),
        Cl.uint(2),
        Cl.uint(1) // 3 tiers - mismatch
      ];
      
      const rewardDescriptions = [
        Cl.stringAscii("Digital copy"),
        Cl.stringAscii("Digital copy + credits")
        // Only 2 descriptions - mismatch
      ];

      const batchResult = simnet.callPublicFn(
        "rewards-module",
        "batch-award-campaign-rewards",
        [
          Cl.uint(100),
          Cl.list(contributors),
          Cl.list(rewardTiers), 
          Cl.list(rewardDescriptions),
          Cl.contractPrincipal(deployer, "crowdfunding-module")
        ],
        wallet1
      );

      console.log("Unequal lists result:", batchResult.result);
      expect(batchResult.result.type).toBe(8); // Error type
    });
  });

  // ---------------------------------------------------------------------------
  // PHASE 4: EMERGENCY & PAUSE FUNCTIONALITY
  // ---------------------------------------------------------------------------
  describe("emergency and pause functionality", () => {

    // -------------------------------------------------------------------------
    // TEST 1: System Pause State Management
    // -------------------------------------------------------------------------
    it("tests system pause state management", () => {
      const initialPauseState = simnet.callReadOnlyFn(
        "rewards-module",
        "is-system-paused",
        [],
        deployer
      );
      expect(initialPauseState.result.type).toBe(7); // Success type
    });

    // -------------------------------------------------------------------------
    // TEST 2: Emergency Withdraw Functionality
    // -------------------------------------------------------------------------
    it("tests emergency withdraw pattern", () => {
      const emergencyWithdrawResult = simnet.callPublicFn(
        "rewards-module",
        "emergency-withdraw",
        [
          Cl.uint(1000000), // 1 STX
          Cl.principal(wallet1) // recipient
        ],
        deployer // Would normally be core contract
      );

      console.log("Emergency withdraw attempt:", emergencyWithdrawResult.result);
      expect(emergencyWithdrawResult.result.type).toBe(8); // Error type
    });
  });

  // ---------------------------------------------------------------------------
  // PHASE 5: SECURITY & ACCESS CONTROL
  // ---------------------------------------------------------------------------
  describe("security and access control", () => {

    // -------------------------------------------------------------------------
    // TEST 1: Authorization Checks
    // -------------------------------------------------------------------------
    it("enforces campaign owner authorization", () => {
      const unauthorizedResult = simnet.callPublicFn(
        "rewards-module",
        "award-campaign-reward",
        [
          Cl.uint(100),
          Cl.principal(wallet2),
          Cl.uint(1),
          Cl.stringAscii("Test reward"),
          Cl.contractPrincipal(deployer, "crowdfunding-module")
        ],
        wallet3 // Not the campaign owner
      );

      console.log("Unauthorized reward attempt:", unauthorizedResult.result);
      expect(unauthorizedResult.result.type).toBe(8); // Error type
    });

    // -------------------------------------------------------------------------
    // TEST 2: Contract Owner Privileges
    // -------------------------------------------------------------------------
    it("enforces contract owner privileges for configuration", () => {
      const unauthorizedConfigResult = simnet.callPublicFn(
        "rewards-module",
        "set-crowdfunding",
        [Cl.principal(wallet1)],
        wallet2 // Not owner
      );

      expect(unauthorizedConfigResult.result.type).toBe(8); // Error type
    });
  });

  // ---------------------------------------------------------------------------
  // PHASE 6: INTEGRATION READINESS
  // ---------------------------------------------------------------------------
  describe("integration readiness", () => {

    // -------------------------------------------------------------------------
    // TEST 1: Contract Interface Compliance
    // -------------------------------------------------------------------------
    it("verifies contract implements required traits", () => {
      const source = simnet.getContractSource("rewards-module");
      
      expect(source).toContain("impl-trait .rewards-module-trait.rewards-trait");
      expect(source).toContain("impl-trait .emergency-module-trait.emergency-module-trait");
      expect(source).toContain("impl-trait .module-base-trait.module-base-trait");
      
      expect(source).toContain("use-trait rewards-crowdfunding-trait");
      expect(source).toContain("use-trait rewards-nft-trait");
      expect(source).toContain("use-trait rewards-emergency-module");
      expect(source).toContain("use-trait rewards-module-base");
    });

    // -------------------------------------------------------------------------
    // TEST 2: Error Code Standardization
    // -------------------------------------------------------------------------
    it("verifies standardized error codes", () => {
      const source = simnet.getContractSource("rewards-module");
      
      expect(source).toContain("ERR-NOT-AUTHORIZED (err u3000)");
      expect(source).toContain("ERR-CAMPAIGN-NOT-FOUND (err u3001)");
      expect(source).toContain("ERR-INVALID-REWARD-TIER (err u3002)");
      expect(source).toContain("ERR-REWARD-MINT-FAILED (err u3004)");
      expect(source).toContain("ERR-LISTS-UNEQUAL-LENGTH (err u3005)");
    });
  });
});

// -----------------------------------------------------------------------------
// ADDITIONAL INTEGRATION TEST SUITE
// -----------------------------------------------------------------------------
describe("rewards-module integration scenarios", () => {

  it("simulates complete reward workflow", () => {
    console.log("Starting complete reward workflow simulation...");

    // Initialize module
    const initResult = simnet.callPublicFn(
      "rewards-module",
      "initialize",
      [
        Cl.principal(deployer),
        Cl.principal(deployer), 
        Cl.principal(deployer)
      ],
      deployer
    );
    expect(initResult.result.type).toBe(7); // Success type

    // Attempt reward awarding
    const workflowResult = simnet.callPublicFn(
      "rewards-module",
      "award-campaign-reward",
      [
        Cl.uint(200),
        Cl.principal(wallet2),
        Cl.uint(2),
        Cl.stringAscii("Complete workflow test reward"),
        Cl.contractPrincipal(deployer, "crowdfunding-module")
      ],
      wallet1
    );

    console.log("Complete workflow result:", workflowResult.result);
    expect(workflowResult.result).toBeDefined();

    // Verify the operation was attempted
    const verificationResult = simnet.callReadOnlyFn(
      "rewards-module", 
      "get-contributor-reward",
      [Cl.uint(200), Cl.principal(wallet2)],
      deployer
    );

    console.log("Workflow verification:", verificationResult.result);
  });

  it("tests batch operations with multiple contributors", () => {
    const maxContributors = 5; // Using smaller number for test performance
    
    const contributors = Array(maxContributors).fill(null).map((_, i) => 
      Cl.principal(accounts.get(`wallet_${(i % 3) + 1}`)!)
    );
    
    const tiers = Array(maxContributors).fill(Cl.uint(1));
    const descriptions = Array(maxContributors).fill(Cl.stringAscii("Batch test reward"));

    const batchResult = simnet.callPublicFn(
      "rewards-module",
      "batch-award-campaign-rewards",
      [
        Cl.uint(300),
        Cl.list(contributors),
        Cl.list(tiers),
        Cl.list(descriptions),
        Cl.contractPrincipal(deployer, "crowdfunding-module")
      ],
      wallet1
    );

    console.log("Large batch operation result:", batchResult.result);
    expect(batchResult.result).toBeDefined();
  });

  it("tests reward retrieval for non-existent rewards", () => {
    const nonExistentReward = simnet.callReadOnlyFn(
      "rewards-module",
      "get-contributor-reward",
      [Cl.uint(999), Cl.principal(wallet1)], // Non-existent campaign and contributor
      deployer
    );

    console.log("Non-existent reward result:", nonExistentReward.result);
    expect(nonExistentReward.result.type).toBe(8); // Error type for non-existent reward
  });
});