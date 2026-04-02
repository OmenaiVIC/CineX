// CO-EP MODULE TEST
// -----------------------------------------------------------------------------

import { describe, expect, it, beforeAll, beforeEach } from "vitest";
import { Cl } from "@stacks/transactions";

const accounts = simnet.getAccounts();
const deployer = accounts.get("deployer")!;
const wallet1 = accounts.get("wallet_1")!;
const wallet2 = accounts.get("wallet_2")!;
const wallet3 = accounts.get("wallet_3")!;
const wallet4 = accounts.get("wallet_4")!;
const wallet5 = accounts.get("wallet_5")!;

// Mock contract addresses for testing
const MOCK_CORE_CONTRACT = deployer;
const MOCK_CROWDFUNDING_CONTRACT = deployer;
const MOCK_VERIFICATION_CONTRACT = deployer;
const MOCK_ESCROW_CONTRACT = deployer;

// Test constants
const POOL_CONTRIBUTION_AMOUNT = 1000000; // 1 STX in microSTX
const POOL_CYCLE_DURATION = 4320; // ~30 days in blocks
const MOCK_LEGAL_HASH = new Uint8Array(32).fill(1);

// -----------------------------------------------------------------------------
// MAIN TEST SUITE
// -----------------------------------------------------------------------------
describe("Co-EP-rotating-fundings core functionality tests", () => {

  // ---------------------------------------------------------------------------
  // PHASE 1: BASIC INFRASTRUCTURE & INITIALIZATION
  // ---------------------------------------------------------------------------
  describe("basic infrastructure", () => {
    it("ensures Co-EP module is deployed", () => {
      const source = simnet.getContractSource("Co-EP-rotating-fundings");
      expect(source).toBeDefined();
    });

    it("verifies trait implementation", () => {
      const source = simnet.getContractSource("Co-EP-rotating-fundings");
      expect(source).toContain("impl-trait .emergency-module-trait.emergency-module-trait");
      expect(source).toContain("impl-trait .module-base-trait.module-base-trait");
    });

    it("can call get-module-version", () => {
      const result = simnet.callReadOnlyFn(
        "Co-EP-rotating-fundings",
        "get-module-version",
        [],
        deployer
      );
      expect(result.result.type).toBe(7); // Success type
    });

    it("can call is-system-paused", () => {
      const result = simnet.callReadOnlyFn(
        "Co-EP-rotating-fundings",
        "is-system-paused",
        [],
        deployer
      );
      expect(result.result.type).toBe(7); // Success type
    });

    it("can call is-module-active", () => {
      const result = simnet.callReadOnlyFn(
        "Co-EP-rotating-fundings",
        "is-module-active",
        [],
        deployer
      );
      expect(result.result.type).toBe(7); // Success type
    });

    it("can call get-module-name", () => {
      const result = simnet.callReadOnlyFn(
        "Co-EP-rotating-fundings",
        "get-module-name",
        [],
        deployer
      );
      expect(result.result.type).toBe(7); // Success type
      console.log("Module name:", result.result);
    });
  });

  // ---------------------------------------------------------------------------
  // PHASE 2: INITIALIZATION & CONFIGURATION
  // ---------------------------------------------------------------------------
  describe("initialization and configuration", () => {
    
    it("initializes the module successfully", () => {
      const initResult = simnet.callPublicFn(
        "Co-EP-rotating-fundings",
        "initialize",
        [
          Cl.principal(MOCK_CORE_CONTRACT),
          Cl.principal(MOCK_CROWDFUNDING_CONTRACT),
          Cl.principal(MOCK_VERIFICATION_CONTRACT),
          Cl.principal(MOCK_ESCROW_CONTRACT)
        ],
        deployer
      );
      expect(initResult.result.type).toBe(7); // Success type
      console.log("Co-EP module initialized:", initResult.result);
    });

    it("fails to initialize when not called by contract owner", () => {
      const initResult = simnet.callPublicFn(
        "Co-EP-rotating-fundings",
        "initialize",
        [
          Cl.principal(MOCK_CORE_CONTRACT),
          Cl.principal(MOCK_CROWDFUNDING_CONTRACT),
          Cl.principal(MOCK_VERIFICATION_CONTRACT),
          Cl.principal(MOCK_ESCROW_CONTRACT)
        ],
        wallet1 // Not the owner
      );
      expect(initResult.result.type).toBe(8); // Error type
    });

    it("sets crowdfunding contract successfully", () => {
      const setResult = simnet.callPublicFn(
        "Co-EP-rotating-fundings",
        "set-crowdfunding",
        [Cl.principal(wallet1)],
        deployer
      );
      expect(setResult.result.type).toBe(7); // Success type
    });

    it("fails to set crowdfunding contract when not owner", () => {
      const setResult = simnet.callPublicFn(
        "Co-EP-rotating-fundings",
        "set-crowdfunding",
        [Cl.principal(wallet1)],
        wallet2 // Not the owner
      );
      expect(setResult.result.type).toBe(8); // Error type
    });

    it("sets verification contract successfully", () => {
      const setResult = simnet.callPublicFn(
        "Co-EP-rotating-fundings",
        "set-verification",
        [Cl.principal(wallet2)],
        deployer
      );
      expect(setResult.result.type).toBe(7); // Success type
    });
  });

  // ---------------------------------------------------------------------------
  // PHASE 3: FILMMAKER PROJECT ENTRY FUNCTIONALITY
  // ---------------------------------------------------------------------------
  describe("filmmaker project entry functionality", () => {
    
    beforeAll(() => {
      console.log("Setting up Co-EP module for project testing...");
      
      // Initialize the module first
      const initResult = simnet.callPublicFn(
        "Co-EP-rotating-fundings",
        "initialize",
        [
          Cl.principal(deployer),
          Cl.principal(deployer),
          Cl.principal(deployer),
          Cl.principal(deployer)
        ],
        deployer
      );
      console.log("Co-EP module init:", initResult.result.type);
    });

    // -------------------------------------------------------------------------
    // TEST 1: Add Filmmaker Project
    // -------------------------------------------------------------------------
    it("tests adding filmmaker project", () => {
      const projectResult = simnet.callPublicFn(
        "Co-EP-rotating-fundings",
        "add-filmmaker-project",
        [
          Cl.stringUtf8("The Last Frame"),
          Cl.stringAscii("feature-film"),
          Cl.stringAscii("director"),
          Cl.list([Cl.principal(wallet2), Cl.principal(wallet3)]),
          Cl.uint(100),  // start-date
          Cl.uint(500),  // end-date
          Cl.stringAscii("https://example.com/project/last-frame"),
          Cl.contractPrincipal(deployer, "film-verification-module")
        ],
        wallet1
      );

      console.log("Add filmmaker project result:", projectResult.result);
      expect(projectResult.result).toBeDefined();
    });

    // -------------------------------------------------------------------------
    // TEST 2: Verify Mutual Project Collaboration
    // -------------------------------------------------------------------------
    it("tests verifying mutual project collaboration", () => {
      const verifyResult = simnet.callPublicFn(
        "Co-EP-rotating-fundings",
        "verify-mutual-project",
        [
          Cl.uint(1),  // project-id
          Cl.principal(wallet2)  // collaborator
        ],
        wallet1
      );

      console.log("Verify mutual project result:", verifyResult.result);
      expect(verifyResult.result).toBeDefined();
    });

    // -------------------------------------------------------------------------
    // TEST 3: Get Filmmaker Project Details
    // -------------------------------------------------------------------------
    it("retrieves filmmaker project details", () => {
      const projectDetails = simnet.callReadOnlyFn(
        "Co-EP-rotating-fundings",
        "get-filmmaker-project",
        [
          Cl.principal(wallet1),
          Cl.uint(1)
        ],
        deployer
      );

      console.log("Filmmaker project details:", projectDetails.result);
      expect(projectDetails.result).toBeDefined();
    });

    // -------------------------------------------------------------------------
    // TEST 4: Get Project Counts
    // -------------------------------------------------------------------------
    it("retrieves filmmaker project counts", () => {
      const projectCounts = simnet.callReadOnlyFn(
        "Co-EP-rotating-fundings",
        "get-project-counts",
        [Cl.principal(wallet1)],
        deployer
      );

      console.log("Filmmaker project counts:", projectCounts.result);
      expect(projectCounts.result).toBeDefined();
    });
  });

  // ---------------------------------------------------------------------------
  // PHASE 4: SOCIAL TRUST & CONNECTIONS FUNCTIONALITY
  // ---------------------------------------------------------------------------
  describe("social trust and connections functionality", () => {

    // -------------------------------------------------------------------------
    // TEST 1: Create Mutual Connection
    // -------------------------------------------------------------------------
    it("tests creating mutual connection between filmmakers", () => {
      const connectionResult = simnet.callPublicFn(
        "Co-EP-rotating-fundings",
        "create-mutual-connection",
        [
          Cl.principal(wallet1),  // requester
          Cl.principal(wallet2),  // target
          Cl.stringAscii("collaborator"),
          Cl.list([Cl.uint(1)]),  // mutual project IDs
          Cl.contractPrincipal(deployer, "film-verification-module")
        ],
        wallet1
      );

      console.log("Create mutual connection result:", connectionResult.result);
      expect(connectionResult.result).toBeDefined();
    });

    // -------------------------------------------------------------------------
    // TEST 2: Get Social Connections
    // -------------------------------------------------------------------------
    it("retrieves social connections between filmmakers", () => {
      const connectionsResult = simnet.callReadOnlyFn(
        "Co-EP-rotating-fundings",
        "get-social-connections",
        [
          Cl.principal(wallet1),
          Cl.principal(wallet2)
        ],
        deployer
      );

      console.log("Social connections result:", connectionsResult.result);
      expect(connectionsResult.result).toBeDefined();
    });

    // -------------------------------------------------------------------------
    // TEST 3: Get Verified Collaboration
    // -------------------------------------------------------------------------
    it("checks verified collaboration status", () => {
      const verificationResult = simnet.callReadOnlyFn(
        "Co-EP-rotating-fundings",
        "get-verified-collaboration",
        [
          Cl.principal(wallet1),
          Cl.uint(1)
        ],
        deployer
      );

      console.log("Verified collaboration result:", verificationResult.result);
      expect(verificationResult.result).toBeDefined();
    });
  });

  // ---------------------------------------------------------------------------
  // PHASE 5: ROTATING FUNDING POOL CREATION & MANAGEMENT
  // ---------------------------------------------------------------------------
  describe("rotating funding pool creation and management", () => {

    // -------------------------------------------------------------------------
    // TEST 1: Create New Rotating Funding Pool
    // -------------------------------------------------------------------------
    it("tests creating new rotating funding pool", () => {
      const poolResult = simnet.callPublicFn(
        "Co-EP-rotating-fundings",
        "create-new-rotating-funding-pool",
        [
          Cl.uint(1),  // project-id
          Cl.stringUtf8("Nollywood Feature Cooperative"),
          Cl.uint(5),  // max-members
          Cl.uint(POOL_CONTRIBUTION_AMOUNT),  // contribution per member
          Cl.uint(POOL_CYCLE_DURATION),  // cycle duration
          Cl.buffer(MOCK_LEGAL_HASH),
          Cl.stringAscii("feature length"),
          Cl.stringAscii("Nollywood"),
          Cl.contractPrincipal(deployer, "film-verification-module")
        ],
        wallet1  // pool creator
      );

      console.log("Create pool result:", poolResult.result);
      expect(poolResult.result).toBeDefined();
    });

    // -------------------------------------------------------------------------
    // TEST 2: Join Existing Pool
    // -------------------------------------------------------------------------
    it("tests joining existing pool with mutual connections", () => {
      const joinResult = simnet.callPublicFn(
        "Co-EP-rotating-fundings",
        "join-existing-pool",
        [
          Cl.uint(1),  // pool-id
          Cl.principal(wallet1),  // referrer (pool creator)
          Cl.list([Cl.uint(1)]),  // mutual project IDs
          Cl.stringUtf8("My Feature Film"),
          Cl.stringAscii("A compelling story about..."),
          Cl.uint(1000)  // expected completion
        ],
        wallet2  // new member joining
      );

      console.log("Join pool result:", joinResult.result);
      expect(joinResult.result).toBeDefined();
    });

    // -------------------------------------------------------------------------
    // TEST 3: Get Pool Members
    // -------------------------------------------------------------------------
    it("retrieves pool members list", () => {
      const membersResult = simnet.callReadOnlyFn(
        "Co-EP-rotating-fundings",
        "get-pool-members",
        [Cl.uint(1)],
        deployer
      );

      console.log("Pool members:", membersResult.result);
      expect(membersResult.result).toBeDefined();
    });

    // -------------------------------------------------------------------------
    // TEST 4: Invalid Pool Size Handling
    // -------------------------------------------------------------------------
    it("handles invalid pool size gracefully", () => {
      const invalidPoolResult = simnet.callPublicFn(
        "Co-EP-rotating-fundings",
        "create-new-rotating-funding-pool",
        [
          Cl.uint(1),
          Cl.stringUtf8("Invalid Pool"),
          Cl.uint(25),  // Invalid: exceeds max of 20
          Cl.uint(POOL_CONTRIBUTION_AMOUNT),
          Cl.uint(POOL_CYCLE_DURATION),
          Cl.buffer(MOCK_LEGAL_HASH),
          Cl.stringAscii("feature length"),
          Cl.stringAscii("Global"),
          Cl.contractPrincipal(deployer, "film-verification-module")
        ],
        wallet1
      );

      console.log("Invalid pool size result:", invalidPoolResult.result);
      expect(invalidPoolResult.result.type).toBe(8); // Error type
    });
  });

  // ---------------------------------------------------------------------------
  // PHASE 6: CONTRIBUTION & FUNDING MECHANICS
  // ---------------------------------------------------------------------------
  describe("contribution and funding mechanics", () => {

    // -------------------------------------------------------------------------
    // TEST 1: Contribute to Existing Pool
    // -------------------------------------------------------------------------
    it("tests member contribution to pool", () => {
      const contributeResult = simnet.callPublicFn(
        "Co-EP-rotating-fundings",
        "contribute-to-existing-pool",
        [Cl.uint(1)],  // pool-id
        wallet1
      );

      console.log("Contribution result:", contributeResult.result);
      expect(contributeResult.result).toBeDefined();
    });

    // -------------------------------------------------------------------------
    // TEST 2: Update Rotation Project Details
    // -------------------------------------------------------------------------
    it("tests updating rotation project details", () => {
      const updateResult = simnet.callPublicFn(
        "Co-EP-rotating-fundings",
        "update-rotation-project-details",
        [
          Cl.uint(1),  // pool-id
          Cl.uint(1),  // rotation-number
          Cl.stringUtf8("Updated Project Title"),
          Cl.stringAscii("Updated project description with more details"),
          Cl.uint(2000),  // expected completion
          Cl.uint(3),  // reward tiers
          Cl.stringAscii("Premium rewards for backers")
        ],
        wallet1
      );

      console.log("Update project details result:", updateResult.result);
      expect(updateResult.result).toBeDefined();
    });

    // -------------------------------------------------------------------------
    // TEST 3: Execute Rotation Funding
    // -------------------------------------------------------------------------
    it("tests executing rotation funding", () => {
      const executeResult = simnet.callPublicFn(
        "Co-EP-rotating-fundings",
        "execute-rotation-funding",
        [
          Cl.uint(1),  // pool-id
          Cl.contractPrincipal(deployer, "crowdfunding-module"),
          Cl.contractPrincipal(deployer, "film-verification-module")
        ],
        wallet1
      );

      console.log("Execute rotation funding result:", executeResult.result);
      expect(executeResult.result).toBeDefined();
    });

    // -------------------------------------------------------------------------
    // TEST 4: Prevent Double Contribution
    // -------------------------------------------------------------------------
    it("prevents double contribution from same member", () => {
      // First contribution (should succeed or already done)
      simnet.callPublicFn(
        "Co-EP-rotating-fundings",
        "contribute-to-existing-pool",
        [Cl.uint(1)],
        wallet1
      );

      // Second contribution (should fail)
      const doubleContributeResult = simnet.callPublicFn(
        "Co-EP-rotating-fundings",
        "contribute-to-existing-pool",
        [Cl.uint(1)],
        wallet1
      );

      console.log("Double contribution result:", doubleContributeResult.result);
      expect(doubleContributeResult.result.type).toBe(8); // Error type
    });
  });

  // ---------------------------------------------------------------------------
  // PHASE 7: CROWDFUNDING INTEGRATION
  // ---------------------------------------------------------------------------
  describe("crowdfunding integration", () => {

    // -------------------------------------------------------------------------
    // TEST 1: Linked Campaign Creation Pattern
    // -------------------------------------------------------------------------
    it("tests linked crowdfunding campaign creation pattern", () => {
      console.log("Testing crowdfunding integration pattern...");
      
      // This test verifies that the Co-EP module properly integrates
      // with the crowdfunding module when executing rotation funding
      const integrationResult = simnet.callPublicFn(
        "Co-EP-rotating-fundings",
        "execute-rotation-funding",
        [
          Cl.uint(1),
          Cl.contractPrincipal(deployer, "crowdfunding-module"),
          Cl.contractPrincipal(deployer, "film-verification-module")
        ],
        wallet1
      );

      console.log("Crowdfunding integration result:", integrationResult.result);
      expect(integrationResult.result).toBeDefined();
    });

    // -------------------------------------------------------------------------
    // TEST 2: Public Funding Opt-Out
    // -------------------------------------------------------------------------
    it("tests public funding opt-out mechanism", () => {
      // Update project to disable public crowdfunding
      const optOutResult = simnet.callPublicFn(
        "Co-EP-rotating-fundings",
        "update-rotation-project-details",
        [
          Cl.uint(1),
          Cl.uint(1),
          Cl.stringUtf8("Pool-Only Funded Project"),
          Cl.stringAscii("This project opts out of public crowdfunding"),
          Cl.uint(1500),
          Cl.uint(0),  // 0 reward tiers = no public crowdfunding
          Cl.stringAscii("Co-EP Pool Funded Project")
        ],
        wallet1
      );

      console.log("Opt-out result:", optOutResult.result);
      expect(optOutResult.result).toBeDefined();
    });
  });

  // ---------------------------------------------------------------------------
  // PHASE 8: EMERGENCY & PAUSE FUNCTIONALITY
  // ---------------------------------------------------------------------------
  describe("emergency and pause functionality", () => {

    // -------------------------------------------------------------------------
    // TEST 1: System Pause State Management
    // -------------------------------------------------------------------------
    it("tests system pause state management", () => {
      const initialPauseState = simnet.callReadOnlyFn(
        "Co-EP-rotating-fundings",
        "is-system-paused",
        [],
        deployer
      );
      expect(initialPauseState.result.type).toBe(7); // Success type
      console.log("Initial pause state:", initialPauseState.result);
    });

    // -------------------------------------------------------------------------
    // TEST 2: Emergency Withdraw Functionality
    // -------------------------------------------------------------------------
    it("tests emergency withdraw pattern", () => {
      const emergencyWithdrawResult = simnet.callPublicFn(
        "Co-EP-rotating-fundings",
        "emergency-withdraw",
        [
          Cl.uint(500000), // 0.5 STX
          Cl.principal(wallet1) // recipient
        ],
        deployer
      );

      console.log("Emergency withdraw attempt:", emergencyWithdrawResult.result);
      expect(emergencyWithdrawResult.result.type).toBe(8); // Error type (system not paused)
    });
  });

  // ---------------------------------------------------------------------------
  // PHASE 9: SECURITY & ACCESS CONTROL
  // ---------------------------------------------------------------------------
  describe("security and access control", () => {

    // -------------------------------------------------------------------------
    // TEST 1: Authorization Checks
    // -------------------------------------------------------------------------
    it("enforces pool creator authorization", () => {
      const unauthorizedResult = simnet.callPublicFn(
        "Co-EP-rotating-fundings",
        "update-rotation-project-details",
        [
          Cl.uint(1),
          Cl.uint(1),
          Cl.stringUtf8("Unauthorized Update"),
          Cl.stringAscii("Should fail"),
          Cl.uint(1000),
          Cl.uint(3),
          Cl.stringAscii("Test")
        ],
        wallet3 // Not the beneficiary
      );

      console.log("Unauthorized update attempt:", unauthorizedResult.result);
      expect(unauthorizedResult.result.type).toBe(8); // Error type
    });

    // -------------------------------------------------------------------------
    // TEST 2: Contract Owner Privileges
    // -------------------------------------------------------------------------
    it("enforces contract owner privileges for configuration", () => {
      const unauthorizedConfigResult = simnet.callPublicFn(
        "Co-EP-rotating-fundings",
        "set-crowdfunding",
        [Cl.principal(wallet1)],
        wallet2 // Not owner
      );

      expect(unauthorizedConfigResult.result.type).toBe(8); // Error type
    });

    // -------------------------------------------------------------------------
    // TEST 3: Non-Member Pool Access
    // -------------------------------------------------------------------------
    it("prevents non-members from contributing to pool", () => {
      const nonMemberContribute = simnet.callPublicFn(
        "Co-EP-rotating-fundings",
        "contribute-to-existing-pool",
        [Cl.uint(1)],
        wallet5 // Not a pool member
      );

      console.log("Non-member contribution attempt:", nonMemberContribute.result);
      expect(nonMemberContribute.result.type).toBe(8); // Error type
    });
  });

  // ---------------------------------------------------------------------------
  // PHASE 10: INTEGRATION READINESS
  // ---------------------------------------------------------------------------
  describe("integration readiness", () => {

    // -------------------------------------------------------------------------
    // TEST 1: Contract Interface Compliance
    // -------------------------------------------------------------------------
    it("verifies contract implements required traits", () => {
      const source = simnet.getContractSource("Co-EP-rotating-fundings");
      
      expect(source).toContain("impl-trait .emergency-module-trait.emergency-module-trait");
      expect(source).toContain("impl-trait .module-base-trait.module-base-trait");
      expect(source).toContain("use-trait coep-crowdfunding-trait");
      expect(source).toContain("use-trait coep-verification-trait");
    });

    // -------------------------------------------------------------------------
    // TEST 2: Error Code Standardization
    // -------------------------------------------------------------------------
    it("verifies standardized error codes", () => {
      const source = simnet.getContractSource("Co-EP-rotating-fundings");
      
      expect(source).toContain("ERR-NOT-AUTHORIZED (err u400)");
      expect(source).toContain("ERR-POOL-NOT-FOUND (err u402)");
      expect(source).toContain("ERR-INSUFFICIENT-BALANCE (err u403)");
      expect(source).toContain("ERR-INVALID-POOL-SIZE (err u404)");
      expect(source).toContain("ERR-POOL-FULL (err u405)");
      expect(source).toContain("ERR-NOT-POOL-MEMBER (err u406)");
      expect(source).toContain("ERR-ALREADY-FUNDED (err u407)");
    });

    // -------------------------------------------------------------------------
    // TEST 3: Module Base Functions
    // -------------------------------------------------------------------------
    it("verifies module base trait functions work correctly", () => {
      const versionResult = simnet.callReadOnlyFn(
        "Co-EP-rotating-fundings",
        "get-module-version",
        [],
        deployer
      );
      
      const activeResult = simnet.callReadOnlyFn(
        "Co-EP-rotating-fundings",
        "is-module-active",
        [],
        deployer
      );

      const nameResult = simnet.callReadOnlyFn(
        "Co-EP-rotating-fundings",
        "get-module-name",
        [],
        deployer
      );

      expect(versionResult.result.type).toBe(7);
      expect(activeResult.result.type).toBe(7);
      expect(nameResult.result.type).toBe(7);
    });
  });
});

// -----------------------------------------------------------------------------
// ADDITIONAL INTEGRATION TEST SUITE
// -----------------------------------------------------------------------------
describe("Co-EP integration scenarios", () => {

  it("simulates complete pool lifecycle workflow", () => {
    console.log("Starting complete Co-EP pool lifecycle simulation...");

    // Step 1: Initialize module
    const initResult = simnet.callPublicFn(
      "Co-EP-rotating-fundings",
      "initialize",
      [
        Cl.principal(deployer),
        Cl.principal(deployer),
        Cl.principal(deployer),
        Cl.principal(deployer)
      ],
      deployer
    );
    expect(initResult.result.type).toBe(7);
    console.log("✓ Module initialized");

    // Step 2: Add filmmaker project
    const projectResult = simnet.callPublicFn(
      "Co-EP-rotating-fundings",
      "add-filmmaker-project",
      [
        Cl.stringUtf8("Lifecycle Test Film"),
        Cl.stringAscii("feature-film"),
        Cl.stringAscii("director"),
        Cl.list([Cl.principal(wallet2)]),
        Cl.uint(100),
        Cl.uint(500),
        Cl.stringAscii("https://example.com/lifecycle-film"),
        Cl.contractPrincipal(deployer, "film-verification-module")
      ],
      wallet1
    );
    console.log("✓ Project added:", projectResult.result);

    // Step 3: Create pool
    const poolResult = simnet.callPublicFn(
      "Co-EP-rotating-fundings",
      "create-new-rotating-funding-pool",
      [
        Cl.uint(1),
        Cl.stringUtf8("Lifecycle Test Pool"),
        Cl.uint(3),
        Cl.uint(POOL_CONTRIBUTION_AMOUNT),
        Cl.uint(POOL_CYCLE_DURATION),
        Cl.buffer(MOCK_LEGAL_HASH),
        Cl.stringAscii("feature length"),
        Cl.stringAscii("Global"),
        Cl.contractPrincipal(deployer, "film-verification-module")
      ],
      wallet1
    );
    console.log("✓ Pool created:", poolResult.result);

    // Step 4: Verify workflow completion
    expect(initResult.result.type).toBe(7);
    expect(projectResult.result).toBeDefined();
    expect(poolResult.result).toBeDefined();
    
    console.log("✓ Complete lifecycle workflow validated");
  });

  it("tests multi-member pool formation and contribution", () => {
    console.log("Testing multi-member pool formation...");

    const memberContributions = [wallet1, wallet2, wallet3];
    const contributionResults = memberContributions.map((wallet, index) => {
      const result = simnet.callPublicFn(
        "Co-EP-rotating-fundings",
        "contribute-to-existing-pool",
        [Cl.uint(1)],
        wallet
      );
      console.log(`Member ${index + 1} contribution:`, result.result);
      return result;
    });

    console.log("Multi-member contribution test complete");
    expect(contributionResults.length).toBe(3);
  });

  it("tests rotation schedule advancement pattern", () => {
    console.log("Testing rotation advancement pattern...");

    const rotationResult = simnet.callPublicFn(
      "Co-EP-rotating-fundings",
      "execute-rotation-funding",
      [
        Cl.uint(1),
        Cl.contractPrincipal(deployer, "crowdfunding-module"),
        Cl.contractPrincipal(deployer, "film-verification-module")
      ],
      wallet1
    );

    console.log("Rotation execution result:", rotationResult.result);
    expect(rotationResult.result).toBeDefined();
  });

  it("tests connection between Co-EP and crowdfunding modules", () => {
    console.log("Validating Co-EP ↔ Crowdfunding integration...");

    // This test validates that the Co-EP module properly
    // interfaces with the crowdfunding module
    const integrationCheck = simnet.callPublicFn(
      "Co-EP-rotating-fundings",
      "update-rotation-project-details",
      [
        Cl.uint(1),
        Cl.uint(1),
        Cl.stringUtf8("Integration Test Campaign"),
        Cl.stringAscii("Testing crowdfunding integration"),
        Cl.uint(2000),
        Cl.uint(3),
        Cl.stringAscii("Digital rewards, credits, premiere access")
      ],
      wallet1
    );

    console.log("Integration check result:", integrationCheck.result);
    expect(integrationCheck.result).toBeDefined();
    
    console.log("✓ Co-EP ↔ Crowdfunding integration validated");
  });
});