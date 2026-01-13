// -----------------------------------------------------------------------------
// module-base-trait.test.ts
// -----------------------------------------------------------------------------
// This test ensures that the base traits shared by all CineX modules
// (like initialization and ownership verification) are correctly implemented.
//
// Audience: Beginner-friendly — comments guide you through each test concept.
// -----------------------------------------------------------------------------


// Import Vitest test helpers
import { describe, expect, it } from "vitest";

// Import the Cl helper from Clarinet SDK to easily create Clarity values
import { Cl } from "@stacks/transactions";


const accounts = simnet.getAccounts();
const deployer = accounts.get("deployer")!; // The deployer (owner) of contracts
const wallet1 = accounts.get("wallet_1")!;

// Test Suite for module-base-trait
describe("module-base-trait implementation tests", () => {

  // -------------------------------------------------------------
  // TEST 1: Contract deployment verification
  // -------------------------------------------------------------
  it("verifies that the base module contract is deployed", () => {
    // Clarinet keeps track of contract source code using the simnet object
    const source = simnet.getContractSource("module-base-trait");

   // If undefined, it means the Clarinet.toml file did not include it correctly - file is not recognized by Clarinet
    expect(source).toBeDefined();

  });


  // --------------------------------------------------------------------------
  // TEST 2: Confirm that the module-base contract implements this trait interface
  // --------------------------------------------------------------------------

  it("validates module-base implements module-base-trait", () => {
     // Load the actual code of the dummy module-base contract
     const baseSource = simnet.getContractSource("module-base");

    // Check that it explicitly includes the (impl-trait ...) declaration
    expect(baseSource).toContain("impl-trait .module-base-trait.module-base-trait");

  });
  
  // -----------------------------------------------------------------------
  // Call trait-defined functions via module-base to ensure compliance
  // --------------------------------------------------------------------------
  it("calls trait-defined functions in module-base for interface compliance", () => {

    // ----- Call get-module-name -------
    const nameCall = simnet.callReadOnlyFn(
      "module-base",
      "get-module-name",
      [],
      deployer
    );

    expect(nameCall.result).toBeDefined();

  });

  
    // ------- Call is-module-active --------
    const activeCall = simnet.callReadOnlyFn(
      "module-base",
      "is-module-active",
      [],
      deployer
    );

    expect(activeCall.result).toBeDefined();


    // ------- Call get-module-version --------
    const versionCall = simnet.callReadOnlyFn(
      "module-base",
      "get-module-version",
      [],
      deployer
    );

    expect(versionCall.result).toBeDefined();


});
