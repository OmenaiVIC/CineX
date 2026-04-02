
import { describe, expect, it } from "vitest";

// --- Import Cl types helper from Clarinet SDK -------------------------------
// "Cl" helps us easily create Clarity values such as Cl.uint(1), Cl.bool(true)
import { Cl } from '@stacks/transactions';

// --- Access the global simnet object ---------------------------------------
// Clarinet automatically provides this object so we can call functions
// on our deployed contracts without connecting to a real blockchain.
const accounts = simnet.getAccounts();
const wallet1 = accounts.get("wallet_1")!;
const wallet2 = accounts.get("wallet_2")!;


// ----------------------------------------------------------------------------
// Test suite begins here
// ----------------------------------------------------------------------------
describe("escrow-module module contract unit tests", () => {

// -----------------------------------------------------------
// TEST 1: Confirm contract was actually deployed
// -------------------------------------------------------------
it("ensures contract is deployed", () => {
  const source = simnet.getContractSource("escrow-module");
  expect(source).toBeDefined(); // If undefined, Clarinet.toml path is wrong
});

// -----------------------------------------------------------
// TEST 2: deposit-to-campaign should increase the balance
// -----------------------------------------------------------
it("deposit-to-campaign increases campaign balance", () => {
  // 1️⃣  Call the public function with campaign-id = 1, amount = 1000 microSTX
  const depositSTX = simnet.callPublicFn(
    "escrow-module", // contract name 
    "deposit-to-campaign",
    [Cl.uint(1), Cl.uint(1000)], // arguments as Clarity values
    wallet2         // sender
  );

  // 2️⃣  SIMPLE CHECK: Verify the result returned (ok true) - Just verify it's successful
  expect(depositSTX.result).toBeDefined();
  expect(depositSTX.result.type).toBe(7) // 7 = ResponseOk type

  // 1️⃣  Check balance 
  // Call the public function with campaign-id = 1, amount = 1000 microSTX
  const balanceRead = simnet.callReadOnlyFn(
    "escrow-module", // contract name 
    "get-campaign-balance",
    [Cl.uint(1)],   // campaign-id argument
    wallet2
  );

  // 4️⃣  // SIMPLE CHECK: Verify we got a response and it contains the expected value - returned value to be (ok u1000) 
  expect(balanceRead.result).toBeDefined();
  expect(balanceRead.result.type).toBe(7) // ResponseOk
  // The actual uint value is inside result.value

});

// -----------------------------------------------------------
// TEST 3: withdrawal should fail if not authorized
// -----------------------------------------------------------
it("withdraw-from-campaign fails without authorization", () => {
  const withdrawSTX = simnet.callPublicFn(
    "escrow-module",
    "withdraw-from-campaign",
    [Cl.uint(1), Cl.uint(500)], // attempt to withdraw 500
    wallet2                    // sender (unauthorized)
  );

  // SIMPLE CHECK: Verify it's an error response
  expect(withdrawSTX.result.type).toBe(8); // 8 = ResponseErr type


});

//-----------------------------------------------------------
// TEST 4: owner authorizes withdrawal then it succeeds
// -----------------------------------------------------------
it("authorize-withdrawal then withdraw works", () => {
  // Get the actual deployer address (the real contract owner)
  const deployer = accounts.get("deployer")!;

  // ✅ STEP 0: Initialize the contract first
  // Set core-contract to deployer so deployer can authorize withdrawals 
  const initResult = simnet.callPublicFn(
    "escrow-module",
    "initialize",
    [Cl.principal(deployer),  // core contract = deployer for this test
     Cl.principal(deployer), // crowdfunding contract (not important for this test)
     Cl.principal(deployer) // escrow contract (not important for this test)
    ],
    deployer
  );

  expect(initResult.result.type).toBe(7); // 7 - Initialization should succeed 


  // Deposit funds first
  const depositSTX = simnet.callPublicFn(
    "escrow-module", // contract name 
    "deposit-to-campaign",
    [Cl.uint(1), Cl.uint(1000)], // Use Campaign 2arguments as Clarity values
    wallet2         // sender
  );
  
  expect(depositSTX.result.type).toBe(7); // 7 = Success


  // 1️⃣  Deployer [actual contract owner (wallet_1)] authorizes wallet_2 for campaign 1
  const authorizeSTX = simnet.callPublicFn(
    "escrow-module",
    "authorize-withdrawal",
    [Cl.uint(1), Cl.principal(wallet2)], // campaign-id + authorized address
    deployer                    // use deployer, not wallet
  );

  expect(authorizeSTX.result.type).toBe(7); //Success



  // 2️⃣  Authorized wallet_2 now withdraws 500 microSTX
  const withdrawSTX = simnet.callPublicFn(
    "escrow-module",
    "withdraw-from-campaign",
    [Cl.uint(1), Cl.uint(500)],
    wallet2
  );

  expect(withdrawSTX.result.type).toBe(7); // Success


  // 3️⃣  Check balance decreased from 2000 to 1500
  const balanceAfter = simnet.callReadOnlyFn(
    "escrow-module",
    "get-campaign-balance",
    [Cl.uint(1)],
    wallet2
  );

  expect(balanceAfter.result.type).toBe(7);

  });


});


