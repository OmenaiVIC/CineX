// -----------------------------------------------------------------------------
// UNIT TEST FILE: escrow-module-trait.test.ts
// PURPOSE: Validate that the escrow trait is correctly defined, deployed, 
// and properly implemented by the escrow-module contract.
// -----------------------------------------------------------------------------


// Import Vitest test helpers
import { describe, expect, it } from "vitest";

// Import the Cl helper from Clarinet SDK to easily create Clarity values
import { Cl } from "@stacks/transactions";


// Access simulation accounts automatically provided by Clarinet
// - These mimic real blockchain users for test purposes
const accounts = simnet.getAccounts();
const deployer = accounts.get("deployer")!; // The deployer (owner) of contracts


// ----------------------------------------------------------------------------
// MAIN TEST SUITE FOR ESCROW TRAIT
// ----------------------------------------------------------------------------

describe("escrow-module-traits tests", () => {

   // --------------------------------------------------------------------------
  // TEST 1: Confirm that the escrow-module-trait contract is deployed correctly
  // --------------------------------------------------------------------------
  it("ensures escrow-module-trait is deployed", () => {

     // Clarinet keeps track of contract source code using the simnet object
     const source = simnet.getContractSource("escrow-module-trait");

    // If undefined, it means the Clarinet.toml file did not include it correctly - file is not recognized by Clarinet
    expect(source).toBeDefined();
  });


  
  // --------------------------------------------------------------------------
  // TEST 2: Confirm the escrow-module contract implements this trait interface
  // --------------------------------------------------------------------------
  it("validates escrow-module implements escrow-trait", () => {

    // Load the actual code of escrow-module contract
    const escrowSource = simnet.getContractSource("escrow-module");

   // Check that it explicitly includes the (impl-trait ...) declaration
   expect(escrowSource).toContain("impl-trait .escrow-module-trait.escrow-trait");
 });

 
  // --------------------------------------------------------------------------
  // TEST 3: Call functions defined in the trait to ensure they exist in the module
  // --------------------------------------------------------------------------
  it("calls trait-defined functions via escrow-module to ensure interface compliance", () => {

    // Call the `deposit-to-campaign` function from escrow-module
    // Using sample values: campaign-id = 1, amount = 100 microSTX

    const depositImpl = simnet.callPublicFn(
      "escrow-module", //target contract
      "deposit-to-campaign", // function name
      [Cl.uint(1), Cl.uint(100)], // campaign-id and amount deposited arguments as Clarity uints
      deployer                   // caller = deployer account

    );

   // Expect a defined response (ResponseOk or ResponseErr)
   expect(depositImpl.result).toBeDefined();
 });


    // Next, check that the `get-campaign-balance` function is callable too
    const getBalance = simnet.callReadOnlyFn(
      "escrow-module", 
      "get-campaign-balance",
      [Cl.uint(1)], // campaign-id '1' as argument 
      deployer

    );

    //Expect a defined read-only result (ok u<number>)
    expect(getBalance.result).toBeDefined();

});
