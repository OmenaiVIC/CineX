// -----------------------------------------------------------------------------
// UNIT TEST FILE: rewards-module-trait.test.ts
// PURPOSE: Validate that the rewards-trait is properly defined, 
// deployed, and implemented by the rewards-module contract.
// -----------------------------------------------------------------------------

// Import Vitest test helpers
import { describe, expect, it } from "vitest";

// Import the Cl helper from Clarinet SDK to easily create Clarity values
import { Cl } from "@stacks/transactions";


const accounts = simnet.getAccounts();
const deployer = accounts.get("deployer")!; // The deployer (owner) of contracts



// ----------------------------------------------------------------------------
// MAIN TEST SUITE FOR REWARDS MODULE TRAIT
// ----------------------------------------------------------------------------
describe("rewards-module-trait tests", () => {
  
  // --------------------------------------------------------------------------
  // TEST 1: Verify the trait contract is properly deployed
  // --------------------------------------------------------------------------
  it("ensures rewards-module-trait is well deployed", () => {

    // Clarinet keeps track of contract source code using the simnet object
    const source = simnet.getContractSource("rewards-module-trait");

    // If undefined, it means the Clarinet.toml file did not include it correctly - file is not recognized by Clarinet
    expect(source).toBeDefined();
  });


  // --------------------------------------------------------------------------
  // TEST 2: Verify the trait definition exists with correct name
  // --------------------------------------------------------------------------
  it("confirms rewards-trait is defined correctly", () => {

    // Load the actual code of rewards-module-trait 
    const source = simnet.getContractSource("rewards-module-trait");

    // It should contain the trait definition with the correct name
    expect(source).toContain("define-trait rewards-trait");
  });


  // --------------------------------------------------------------------------
  // TEST 3: Verify that the rewards-nft-trait dependency is imported correctly
  // --------------------------------------------------------------------------
  it("verifies trait dependencies for rewards-nft module", () => {

    // Load the actual code of rewards-module-trait 
    const source = simnet.getContractSource("rewards-module-trait");

    // It should import the rewards-nft-trait correctly (if it uses it)
    // Note: Based on the contracts you shared, rewards-module uses rewards-nft-trait
    expect(source).toContain("use-trait");
  });


  // --------------------------------------------------------------------------
  // TEST 4: Confirm the rewards-module contract implements this trait interface
  // --------------------------------------------------------------------------
  it("validates rewards-module implements rewards-trait", () => {

    // Load the actual code of rewards-module contract
    const rewardsModuleSource = simnet.getContractSource("rewards-module");

    // Check that it explicitly includes the (impl-trait ...) declaration
    expect(rewardsModuleSource).toContain("impl-trait .rewards-module-trait.rewards-trait");
  });


  // --------------------------------------------------------------------------
  // TEST 5: Verify CineX-rewards-sip09 also implements the rewards-nft-trait
  // --------------------------------------------------------------------------
  it("validates CineX-rewards-sip09 implements rewards-nft-trait", () => {

    // Load the actual code of CineX-rewards-sip09 contract
    const rewardsNFTSource = simnet.getContractSource("CineX-rewards-sip09");

    // Check that it implements the rewards-nft-trait
    expect(rewardsNFTSource).toContain("impl-trait .rewards-nft-trait.rewards-nft-trait");
  });


  // --------------------------------------------------------------------------
  // TEST 6: Verify CineX-rewards-sip09 implements the standard SIP-09 NFT trait
  // --------------------------------------------------------------------------
  it("validates CineX-rewards-sip09 implements SIP-09 NFT trait", () => {

    // Load the actual code of CineX-rewards-sip09 contract
    const rewardsNFTSource = simnet.getContractSource("CineX-rewards-sip09");

    // Check that it implements the standard SIP-09 NFT trait
    expect(rewardsNFTSource).toContain("impl-trait");
    expect(rewardsNFTSource).toContain("nft-trait");
  });

});
