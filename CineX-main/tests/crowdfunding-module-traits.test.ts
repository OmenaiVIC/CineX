// -----------------------------------------------------------------------------
// UNIT TEST FILE: crowdfunding-module-traits.test.ts
// PURPOSE: Validate that the crowdfunding trait is properly defined, 
// deployed, and implemented by the crowdfunding-module contract.
// -----------------------------------------------------------------------------

// Import Vitest test helpers
import { describe, expect, it } from "vitest";

// Import the Cl helper from Clarinet SDK to easily create Clarity values
import { Cl } from "@stacks/transactions";


const accounts = simnet.getAccounts();
const deployer = accounts.get("deployer")!; // The deployer (owner) of contracts



// ----------------------------------------------------------------------------
// MAIN TEST SUITE FOR CROWDFUNDING TRAIT
// ----------------------------------------------------------------------------
describe("crowdfunding-module-traits tests", () => {
  it("ensures crowdfunding-module-traits is well deployed", () => {

    // Clarinet keeps track of contract source code using the simnet object
    const source = simnet.getContractSource("crowdfunding-module-traits");

   // If undefined, it means the Clarinet.toml file did not include it correctly - file is not recognized by Clarinet
    expect(source).toBeDefined();
  });


  // --------------------------------------------------------------------------
  // TEST 2: Verify that all trait dependencies are imported correctly
  // --------------------------------------------------------------------------
  it("verifies trait dependencies for escrow and verification modules", () => {

    // Load the actual code of crowdfunding-module-traits 
    const source = simnet.getContractSource("crowdfunding-module-traits");

   // It should import escrow and verification traits correctly
   expect(source).toContain("use-trait crwd-escrow-trait .escrow-module-trait.escrow-trait");
   expect(source).toContain("use-trait crwd-verification-trait .film-verification-module-trait.film-verification-trait")
 });


  
  // --------------------------------------------------------------------------
  // TEST 3: Confirm the crowdfunding-module contract implements this trait interface
  // --------------------------------------------------------------------------
  it("validates crowdfunding-module implements crowdfunding-module-trait", () => {

    // Load the actual code of crowdfunding-module contract
    const crowdfundingSource = simnet.getContractSource("crowdfunding-module");

   // Check that it explicitly includes the (impl-trait ...) declaration or reference
   expect(crowdfundingSource).toContain("impl-trait .crowdfunding-module-traits.crowdfunding-trait");
 });


  
});
