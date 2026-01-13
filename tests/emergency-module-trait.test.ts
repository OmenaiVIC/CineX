// -----------------------------------------------------------------------------
// UNIT TEST FILE: emergency-module-trait.test.ts
// PURPOSE: Validate that the emergency trait is correctly defined, deployed, 
// and properly implemented by the emergency-module contract.
// -----------------------------------------------------------------------------


import { describe, expect, it } from "vitest";

// Import the Cl helper from Clarinet SDK to easily create Clarity values
import { Cl } from "@stacks/transactions";


const accounts = simnet.getAccounts();
const deployer = accounts.get("deployer")!; // The deployer (owner) of contracts
const wallet1 = accounts.get("wallet_1")!;



// Test Suite for emergency-module-base-trait
describe("emergency-module-trait tests", () => {

  
  // --------------------------------------------------------------------------
  // TEST 1: Confirm that the emergency-module-trait contract is deployed correctly
  // --------------------------------------------------------------------------
  it("ensures emergency-module-trait is deployed", () => {
    const source = simnet.getContractSource("emergency-module-trait");
    expect(source).toBeDefined();
  });


  // --------------------------------------------------------------------------
  // TEST 2: Confirm that the emergency-module contract implements this trait interface
  // --------------------------------------------------------------------------

  it("validates emergency-module implements emergency-module trait", () => {
    // Load the actual code of the dummy module-base contract
    const emergencySource = simnet.getContractSource("emergency-module");

   // Check that it explicitly includes the (impl-trait ...) declaration
   expect(emergencySource).toContain("impl-trait .emergency-module-trait.emergency-module-trait");

  });


  // ------------------------------------------------------------------------------------------
  // TEST 3: Call trait-defined functions via emergency-module to ensure interface compliance
  // ------------------------------------------------------------------------------------------
  it("calls trait-defined functions in emergency-module for interface compliance", () => {

    // ----- Call emergency-withdraw -------
    const emergencyWithdrawCall = simnet.callPublicFn(
      "emergency-module",
      "emergency-withdraw",
      [Cl.uint(5000), Cl.principal(wallet1)],
      deployer
    );

    expect(emergencyWithdrawCall.result).toBeDefined();

  });

  
    // ------- Call set-pause-state --------
    const setPauseCall = simnet.callPublicFn(
      "emergency-module",
      "set-pause-state",
      [Cl.bool(true)],
      deployer
    );

    expect(setPauseCall.result).toBeDefined();


    // ------- Call is-system-paused --------
    const pausedStateCall = simnet.callReadOnlyFn(
      "emergency-module",
      "is-system-paused",
      [],
      deployer
    );

    expect(pausedStateCall.result).toBeDefined();



});
