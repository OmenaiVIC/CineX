/**
 * Diagnose: why is makeContractDeploy creating sponsored auth?
 */
const { createRequire } = await import("module");
const require = createRequire(import.meta.url);
const cjs = require("@stacks/transactions");
const net = require("@stacks/network");

const KEY = "3803e0e804a68c4eb2861129a158b46459182122be273b04090e23764b86980f";

async function main() {
  const network = new net.StacksTestnet();

  const tx = await cjs.makeContractDeploy({
    contractName: "test-auth",
    codeBody: '(define-public (hello) (ok true))',
    senderKey: KEY,
    nonce: 10,
    fee: 10000,
    clarityVersion: 4,
    network,
  });

  // Inspect auth
  const auth = tx.auth;
  console.log("=== AUTH INSPECTION ===");
  console.log("auth.constructor.name:", auth.constructor.name);
  console.log("auth.authType:", auth.authType);
  console.log("auth keys:", Object.keys(auth).join(", "));

  if (auth.standardAuth) {
    console.log("standardAuth:", JSON.stringify(auth.standardAuth));
  }

  const sc = auth.spendingCondition;
  console.log("\n=== SPENDING CONDITION ===");
  console.log("sc.constructor.name:", sc.constructor.name);
  console.log("sc keys:", Object.keys(sc).join(", "));
  console.log("sc.hashMode:", sc.hashMode);
  console.log("sc.nonce:", sc.nonce);
  console.log("sc.fee:", sc.fee);
  console.log("sc.keyEncoding:", sc.keyEncoding);
  console.log("sc.keyEncoding === TransactionPublicKeyEncoding.Compressed?", sc.keyEncoding === 0 || sc.keyEncoding === 1);
  
  // List all enumerable properties
  for (const k of Object.keys(sc)) {
    const v = sc[k];
    if (typeof v !== "function") {
      console.log(`  sc.${k}:`, typeof v === "object" ? JSON.stringify(v) : v);
    }
  }

  // Check if auth has a "sponsor" or "origin" distinction
  if (auth.origin) console.log("auth.origin:", typeof auth.origin);
  if (auth.sponsor) console.log("auth.sponsor:", typeof auth.sponsor);

  // Check AuthType enum
  console.log("\n=== AuthType enum ===");
  console.log(cjs.AuthType);

  // Check if there's a way to create standard auth explicitly
  console.log("\n=== Available auth-related exports ===");
  for (const k of Object.keys(cjs).filter(k => /auth|standard|sponsor|sign/i.test(k))) {
    console.log(`  ${k}:`, typeof cjs[k]);
  }

  // Also check SpendingConditionType
  console.log("\n=== SpendingConditionType ===");
  console.log(cjs.SpendingConditionType);

  // Try to check if we can manually create a standard auth
  if (cjs.createStandardAuth) {
    console.log("\ncreateStandardAuth exists, checking signature...");
    console.log("  signature:", cjs.createStandardAuth.toString().slice(0, 200));
  }
}

main().catch(e => { console.error("FATAL:", e); process.exit(1); });
