// -----------------------------------------------------------------------------
// UNIT TEST FILE: film-verification-module-trait.test.ts
// PURPOSE: Validate that the film-verification-trait is properly defined, 
// deployed, and implemented by the film-verification-module contract.
// -----------------------------------------------------------------------------

// Import Vitest test helpers
import { describe, expect, it } from "vitest";

// Import the Cl helper from Clarinet SDK to easily create Clarity values
import { Cl } from "@stacks/transactions";


const accounts = simnet.getAccounts();
const deployer = accounts.get("deployer")!; // The deployer (owner) of contracts



// ----------------------------------------------------------------------------
// MAIN TEST SUITE FOR FILM VERIFICATION TRAIT
// ----------------------------------------------------------------------------
describe("film-verification-module-trait tests", () => {
  
  // --------------------------------------------------------------------------
  // TEST 1: Verify the trait contract is properly deployed
  // --------------------------------------------------------------------------
  it("ensures film-verification-module-trait is well deployed", () => {

    // Clarinet keeps track of contract source code using the simnet object
    const source = simnet.getContractSource("film-verification-module-trait");

    // If undefined, it means the Clarinet.toml file did not include it correctly - file is not recognized by Clarinet
    expect(source).toBeDefined();
  });


  // --------------------------------------------------------------------------
  // TEST 2: Verify the trait definition exists with correct name
  // --------------------------------------------------------------------------
  it("confirms film-verification-trait is defined correctly", () => {

    // Load the actual code of film-verification-module-trait 
    const source = simnet.getContractSource("film-verification-module-trait");

    // It should contain the trait definition with the correct name
    expect(source).toContain("define-trait film-verification-trait");
  });


  
  // --------------------------------------------------------------------------
  // TEST 3: Confirm the film-verification-module contract implements this trait interface
  // --------------------------------------------------------------------------
  it("validates film-verification-module implements film-verification-trait", () => {

    // Load the actual code of film-verification-module contract
    const verificationModuleSource = simnet.getContractSource("film-verification-module");

    // Check that it explicitly includes the (impl-trait ...) declaration
    expect(verificationModuleSource).toContain("impl-trait .film-verification-module-trait.film-verification-trait");
  });


});
