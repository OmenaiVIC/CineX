import { describe, it, expect } from "vitest";
import { Cl, callReadOnlyFn, callPublicFn} from "@stacks/transactions";

// Manually define test principals (these are standard in simnet for Stacks testing)
// Standard simnet accounts (deployer is usually the contract deployer & initial admin)

const accounts = simnet.getAccounts();
// Read the deployer account from simnet; this account deploys the contract.
const deployer = accounts.get("deployer")!; 
// Read wallet_1 for isolated test flows.
const wallet1 = accounts.get("wallet_1")!;
// Read wallet_1 for isolated test flows, and so on
const wallet2 = accounts.get("wallet_2")!;
const wallet3 = accounts.get("wallet_3")!; 
const wallet4 = accounts.get("wallet_4")!;
const wallet5 = accounts.get("wallet_5")!; 
const wallet6 = accounts.get("wallet_6")!;
const wallet7 = accounts.get("wallet_7")!; 
const wallet8 = accounts.get("wallet_8")!; 
const wallet9 = accounts.get("wallet_9")!;
const workFlowWallet = accounts.get("wallet_10")!; // for integration test


// Store the contract name once so all tests reference the same deployed contract.
const contractName = "film-verification-module";
// Store the hard-coded default filmmaker principal initialized at deploy time in the contract map.
const defaultFilmmaker = "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM"; 


// Future block heights for expiration tests (contract checks against current block-height)  
      //Use future height so verification is definitely not expired when tested.
const FUTURE_EXPIRATION_BLOCK = 9999999; 
// Use a second future absolute block height for expiration-update tests.
const FUTURE_EXPIRATION_BLOCK_2 = 1000500; 


// Create a deterministic 32-byte hex string for identity-hash test data.
const HASH_1 = "11".repeat(32); 
const HASH_2 = "12".repeat(32); 
const HASH_3 = "13".repeat(32);
const HASH_4 = "14".repeat(32);
const HASH_5 = "15". repeat(32);
const HASH_6 = "16". repeat(32);
const HASH_7 = "17". repeat(32);
const HASH_8 = "18".repeat(32); 
const HASH_9 = "19".repeat(32);


// ====================== HELPER FUNCTIONS ======================
// Define a helper that calls register-filmmaker-id to reduce duplication in tests.
function registerFilmmaker(
  filmmaker: string, 
  fullName: string, 
  profileUrl: string, 
  identityHexHash: string,
  verificationLevel: 1,  // Default the verification level to basic unless another level is explicitly supplied.
  chosenExpiration: 5000 
){
  // Call the public contract function from a specific sender and return its full response object.
  return callPublicFn({
    // Specify which deployed contract to call.
    contractName,
    // Specify the function being tested.
    functionName: "register-filmmaker-id",
    // Pass the Clarity arguments in the same order the contract expects them.
    functionArgs: [
    //Pass the filmmaker principal argument
    Cl.principal(filmmaker),
    // Pass the full legal name string
    Cl.stringAscii(fullName),
    //Pass the professional profile link
    Cl.stringAscii(profileUrl),
    //Pass the 32-byte identity hash buffer argument (for privacy of docs)
    Cl.bufferFromHex(identityHexHash),
    //Pass the chosen verification level argument; 1 = basic, 2 = basic
    Cl.uint(verificationLevel),
    // Pass a verified profile's subscription expiration argument
    Cl.uint(chosenExpiration)
  ],
  // Use the filmmaker as tx-sender because the contract requires new-filmmaker == tx-sender.
  sender: filmmaker, 
  });
}


// Define a helper to pay the basic verification fee for a filmmaker.
function payBasicVerificationFee(filmmaker: string){
  //Call the public fee-payment function and return its full response object.
  return callPublicFn({
    // Specify the contract to call.
    contractName,
    // Specify the verification payment function.
    functionName: "pay-verification-fee",
    // Pass verification level u1 to take the basic-fee branch.
    functionArgs: [Cl.uint(1)],
  // Use the filmmaker as the sender because the filmmaker pays their own verification fee.
  sender: filmmaker,
  });
 }


 // Define a helper for admin verification to reduce repeated code in tests.
 function verifyFilmmakerAsAdmin(
  // Accept the filmmaker principal to verify.
  filmmaker: string,
  // Default the expiration block to a safely future block height.
  expirationBlock = FUTURE_EXPIRATION_BLOCK
 ){
  // Call the admin-only verification function and return its full response object.
  return callPublicFn({
    //Specify the contract to call.
    contractName,
    // Specify the function that marks a filmmaker as verified.
    functionName: "verify-filmmaker-identity",
    // Pass the filmmaker principal and new expiration block arguments
    functionArgs: [Cl.principal(filmmaker), Cl.uint(expirationBlock)],
  // Use deployer as sender because deployer is the initial contract-admin.
  sender: deployer,
  });  
 }



 // Define a helper to fetch a filmmaker identity tuple through the read-only function.
 function getFilmmakerIdentity(filmmaker: string){
  // Call the read-only function and return its full response object.
  return callReadOnlyFn({
     // Specify the contract name.
     contractName,
     //Specify the function that gets/returns the filmmaker identity data
     functionName: "get-filmmaker-identity",
     // Pass the filmmaker principal whose identity should be fetched.
     functionArgs: [Cl.principal(filmmaker)],
  //Use deployer as sender for the read-only call.
  sender: deployer,
  });
 }
 


// Start the test suite for the film-verification module
describe("film-verification-module", () => {
  // Verify the contract source declares the expected trait implementation.
  it("implements the film-verification-module trait", () => {
  // Read the deployed contract source as a string from simnet.
    const source = simnet.getContractSource(contractName); 

    // Assert that the source explicitly implements the film verification trait.
    expect(source).toContain("impl-trait .film-verification-module-trait.film-verification-trait");
  });

});


  // Verify the base module metadata functions return the expected deployment values.
  it("returns module metadata correctly", () => {
    // Call the read-only function for module version.
    const moduleVersion = callReadOnlyFn({
      //Specify the target contract.
      contractName,
      //Request the module version.
      functionName: "get-module-version",
      //Pass no arguments because the "get-module-version" read-only function takes none
      functionArgs: [],
    //Use deployer as the caller context.
    sender: deployer,
    });  


    // Call the read-only function for module-active status.
  const moduleActive = callReadOnlyFn({
    //Specify the target contract.
    contractName,
    //Request the active/inactive module flag
    functionName: "is-module-active",
    //Pass no arguments because the "is-module-active" read-only function takes none
    functionArgs: [],
  //Use deployer as the caller context.
  sender: deployer,
  });


  // Call the read-only function for module name.
  const moduleName = callReadOnlyFn({
    //Specify the target contract. 
    contractName, 
    //Request the module name
    functionName: "get-module-name",
    //Pass no arguments because the "get-module-name" read-only function takes none
    functionArgs: [],
  //Use deployer as the caller context.
  sender: deployer,
  });
  

  // Assert that module version is initialized to u1.
  expect(moduleVersion.result).toBeOk(Cl.uint(1));
  // Assert that module-active is initialized to true.
  expect(moduleActive.result).toBeOk(Cl.bool(true));
  // Assert that the module name matches the contract’s declared name.
  expect(moduleName.result).toBeOk(Cl.stringAscii("film-verification-module"));
});


// --- DEFAULT FILMMAKER TEST --- checking if default filmmaker exists and is verified
  // Verify the contract ships with the default filmmaker already present and valid.
  it("returns default filmmaker identity info and verified status", () => {
  // Fetch the default filmmaker identity tuple from the contract.
    const getInfoResult = callReadOnlyFn({
      //Specify the target contract
      contractName,
      // Request the identity tuple for a specific filmmaker.
      functionName: "get-filmmaker-identity",
      //Pass the default filmmaker principal as the function's argument
      functionArgs: [Cl.principal(defaultFilmmaker)],
    //Use deployer as the caller context.
    sender: deployer,
    }); 

    // Fetch the default filmmaker’s current verification status.
    const isVerifiedResult = callReadOnlyFn({
      //Specify the target contract
      contractName,
      //Request the verification-status read-only check. 
      functionName: "is-filmmaker-currently-verified",
      // Pass the default filmmaker principal.  
      functionArgs: [Cl.principal(defaultFilmmaker)],
    // Use deployer as read-only caller context.
    sender: deployer,
    });

    // Assert the default filmmaker identity matches the hard-coded deployment values.
    expect(getInfoResult.result).toBeOk(
      Cl.some(
        Cl.tuple({
          "full-name": Cl.stringAscii(defaultFilmmaker), // name of default filmmaker
          "profile-url": Cl.stringascii("t.co/jg7864Qlu7"), // link to default filmmaker's professional profile
          "identity-hash": Cl.bufferFromHex("0000000000000000000000000000000000000000000000000000000000000000"), //hash of default filmmaker's id document 
          "choice-verification-level": Cl.uint(1), // default-filmmaker's verified profile subscription level
          "choice-verification-expiration": Cl.uint(999999999), // default subscription period
          "verified": Cl.bool(true),
          "registration": Cl.uint(0),
        })
      ));

    // Assert the default filmmaker is still currently verified.
    expect(isVerifiedResult.result).toBeOk(Cl.bool(true));
  });




// --- ADMIN FUNCTION TEST ---
  // Verify the deployed contract-admin can be read back correctly.
  it("allows admin to view/retrieve current admin principal", () => {
    // Call the read-only admin getter.
    const adminCall = callReadOnlyFn({
      //Specify the target contract
      contractName,
      // Request the stored contract-admin principal.
      functionName: "get-contract-admin", 
      // Pass no arguments because the function takes none.
      functionArgs: [],
      // Use deployer as read-only caller context.
    sender: deployer,
    });

    // Assert the stored contract-admin matches the deployer principal.
    expect(adminCall.result).toBeOk(Cl.principal(deployer)); 
  });



// --- REGISTRATION TEST (updated for non-default filmmaker)---
  // Verify a filmmaker can register their own identity details. 
  it("registers filmmaker identity", () => {
    // Register wallet1 as a filmmaker with identity metadata.
    const registrationResult = registerFilmmaker(
      wallet1,
      "NewFilmmaker",
      "https://wwww.profile.com/new",
      HASH_1,
      1,
      5000
    );

    // Assert registration succeeds and returns the new total count.
    expect(registrationResult.Result).toBeOk(Cl.uint(1));

    // Read the identity back from storage.
    const identityResult = getFilmmakerIdentity(wallet1);

    // Assert the stored identity fields match the submitted registration input.
    expect(identityResult.result).toBeOk(
      Cl.some(
        Cl.tuple({
          "fullname": Cl.stringAscii("NewFilmmaker"),
          "profile-url": Cl.stringAscii("https://wwww.profile.com/new"),
          "identity-hash": Cl.bufferFromHex(HASH_1),
          "choice-verification-level": Cl.uint(1),
          "choice-verification-expiration": Cl.uint(5000),
          "verified": Cl.bool(false),
          "registration": expect.anything() as unknown as ReturnType<typeof Cl.uint>,
        })
      )
    );
  }); 


  // Verify a sender cannot register some other principal’s filmmaker record.
  it("rejects registration when sender tries to register another principal", () => {
    // Attempt to register wallet2 while wallet1 is the actual tx-sender.
    const unauthorizedRegistration = callPublicFn({
      // Specify the target contract.
      contractName,
      // Specify the registration function.
      functionName: "register-filmmaker-id", 
      // Pass wallet2 as the filmmaker being registered even though wallet1 will send the tx.
      functionArgs: [
        Cl.principal(wallet2), 
        Cl.stringAscii("wrongSender"),
        Cl.stringAscii("https://wwww.profile.com/wrong"),
        Cl.bufferFromHex(HASH_2),
        Cl.uint(1),
        Cl.uint(5000),
      ],
  
    // Intentionally use wallet1 as sender to trigger the authorization check.
    sender: wallet1,
    });

    // Assert the contract rejects the call with ERR-NOT-AUTHORIZED u1001
    expect(unauthorizedRegistration.result).toBeErr(Cl.uint(1001));
  });


  // Verify a registered filmmaker can add a portfolio item.
  it("adds filmmaker portfolio", () => {
    // Register wallet2 before adding a portfolio because registration is required.
    const registrationResult = registerFilmmaker(
      wallet2,
      "PortfolioFilmmaker",
      "https://wwww.profile.com/portfolio",
      HASH_2,
      1,
      5000
    );

    // Assert registration succeeds and returns the new total count.
    expect(registrationResult.result).toBeOk(Cl.uint(2));

    // Add the first portfolio item for wallet2.
    const portfolioResult = callPublicFn({
      // Specify the target contract
      contractName,
      // Specify the function that stores a portfolio item.
      functionName: "add-filmmaker-portfolio",
      // Pass the filmmaker principal and the portfolio fields.
      functionArgs: [
        Cl.principal(wallet2),
        Cl.stringAscii("ProjectTitle"),
        Cl.stringAscii("https://www.project-link.com"),
        Cl.stringAscii("ProjectDescription"),
        Cl.uint(2027),
      ],

      // Use wallet2 as sender because only the filmmaker may add their own portfolio.
      sender: wallet2,
    });

    // Assert the first portfolio item receives ID/count u1.
    expect(portfolioResult.result).toBeOk(Cl.uint(1));
  });
 

  // Verify a filmmaker can only be verified by admin after payment is recorded.
  it("admin verifies filmmaker identity after verification fee payment", () => {
    // Register wallet3 before attempting fee payment or verification.
    const registrationResult = registerFilmmaker(
      wallet3,
      "To Verify Filmmaker",
      "https://wwww.verifyfilm.com",
      HASH_3,
      1,
      5000
    );

    // Assert registration succeeds and returns the new total count, which is now 3.
    expect(registrationResult.result).toBeOk(Cl.uint(3));

    // Pay the basic verification fee as the filmmaker.
    const paymentResult = payBasicVerificationFee(wallet3);

    // Assert the fee payment call succeeds.
    (paymentResult.result).toBeOk(Cl.bool(true));

    // Verify the filmmaker as admin using a future expiration block.
    const verificationResult = verifyFilmmakerAsAdmin(wallet3, FUTURE_EXPIRATION_BLOCK);

    // Assert admin verification succeeds.
    expect(verificationResult.result).toBeOk(Cl.bool(true));

    // Read the current verification state after admin verification.
    const verifiedStatus = callReadOnlyFn({
      // Specify the target contract.
      contractName,
      // Request the verification-status read-only function.
      functionName: "is-filmmaker-currently-verified",
      // Pass wallet3 as the filmmaker being checked.
      functionArgs: [Cl.principal(wallet3)],
      // Use deployer as read-only caller context.
      sender: deployer,
    });

    // Assert wallet3 is now currently verified.
    expect(verifiedStatus.result).toBeOk(Cl.bool(true));

  });



  




  