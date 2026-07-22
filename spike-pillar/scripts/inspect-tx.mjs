/**
 * Inspect the raw transaction bytes to find the serialization bug.
 * The node says actual balance = 0, but we have 499.9 STX.
 * Something in the tx encoding must be wrong.
 */
const addr = "ST3482KEKEA7152W4XX938392QSN9Z5EAZCX1NWH3";
const KEY = "3803e0e804a68c4eb2861129a158b46459182122be273b04090e23764b86980f";

async function main() {
  const pkg = await import("@stacks/transactions");
  const netPkg = await import("@stacks/network");

  const { makeContractDeploy, ClarityVersion } = pkg;
  const { createNetwork, STACKS_TESTNET } = netPkg;
  const network = createNetwork({ url: "https://api.testnet.hiro.so", ...STACKS_TESTNET });

  const contractSource = '(define-public (hello) (ok "hello"))';

  // Fetch nonce
  const acctRes = await fetch(`https://api.testnet.hiro.so/v2/accounts/${addr}?proof=0`);
  const acct = await acctRes.json();
  const nonce = acct.nonce;
  console.log("nonce:", nonce);

  // Try with number fee (like CineX backend does) vs BigInt fee
  console.log("\n=== Creating tx with number fee: 10000 ===");
  const tx1 = await makeContractDeploy({
    contractName: "test-inspect",
    codeBody: contractSource,
    senderKey: KEY,
    nonce,
    fee: 10000,  // number, not BigInt
    clarityVersion: ClarityVersion.Clarity4,
    network,
  });

  const serialized1 = typeof tx1.serialize() === "string"
    ? tx1.serialize()
    : Buffer.from(tx1.serialize()).toString("hex");
  
  console.log("hex length:", serialized1.length);
  
  // Auth flag is byte 0
  console.log("auth flag:", serialized1.slice(0, 2));
  
  // For auth flag 0x04 (signed):
  // auth(2 hex) + sig(130 hex) + chain_id(8 hex) + nonce(16 hex) + fee(16 hex) + ...
  // So fee starts at byte offset 2+130+8+16 = 156 hex chars (78 bytes)
  const feeHex = serialized1.slice(156, 172);
  console.log("fee field (bytes 78-86, 8 bytes LE):", feeHex);
  console.log("fee as decimal:", BigInt("0x" + feeHex).toString());

  // Check nonce field too
  const nonceHex = serialized1.slice(140, 156);
  console.log("nonce field (bytes 70-78, 8 bytes LE):", nonceHex);
  console.log("nonce as decimal:", BigInt("0x" + nonceHex).toString());

  // Contract name
  const nameHex = Buffer.from("test-inspect").toString("hex");
  const nameIdx = serialized1.indexOf(nameHex);
  if (nameIdx >= 0) {
    console.log("\ncontract name found at hex offset:", nameIdx);
    // After name: clarity_version(2 hex) + code_length(8 hex)
    const cvByte = serialized1.slice(nameIdx + nameHex.length, nameIdx + nameHex.length + 2);
    console.log("clarity_version byte:", "0x" + cvByte);
  }

  // Also try v6 style broadcast via broadcastTransaction
  console.log("\n=== Trying broadcastTransaction (v7 style) ===");
  const net2 = netPkg.createNetwork ? netPkg.createNetwork({ url: "https://api.testnet.hiro.so", ...netPkg.STACKS_TESTNET }) : new netPkg.StacksTestnet();
  console.log("network type:", typeof net2);
  
  try {
    // v7 broadcastTransaction takes { transaction, network }
    const result1 = await pkg.broadcastTransaction({ transaction: tx1, network });
    console.log("v7 broadcastTransaction result:", JSON.stringify(result1));
  } catch (e) {
    console.log("v7 broadcastTransaction error:", e.message);
  }

  // Now try the same thing but with fee as BigInt
  console.log("\n=== Creating tx with BigInt fee: 10000n ===");
  const tx2 = await makeContractDeploy({
    contractName: "test-inspect2",
    codeBody: contractSource,
    senderKey: KEY,
    nonce: nonce, // same nonce
    fee: 10000n,  // BigInt
    clarityVersion: ClarityVersion.Clarity4,
    network,
  });

  const serialized2 = typeof tx2.serialize() === "string"
    ? tx2.serialize()
    : Buffer.from(tx2.serialize()).toString("hex");
  
  const feeHex2 = serialized2.slice(156, 172);
  console.log("fee field (BigInt version):", feeHex2);
  console.log("fee as decimal:", BigInt("0x" + feeHex2).toString());

  // Compare the two serializations
  if (serialized1 === serialized2) {
    console.log("\nBoth serializations IDENTICAL — fee type doesn't matter");
  } else {
    console.log("\nSerializations DIFFER — fee type matters!");
    // Find first difference
    for (let i = 0; i < Math.max(serialized1.length, serialized2.length); i += 2) {
      if (serialized1.slice(i, i + 2) !== serialized2.slice(i, i + 2)) {
        console.log("First difference at byte", i / 2, ":", serialized1.slice(i, i + 2), "vs", serialized2.slice(i, i + 2));
        console.log("Context (number):", serialized1.slice(Math.max(0, i - 20), i + 20));
        console.log("Context (BigInt):", serialized2.slice(Math.max(0, i - 20), i + 20));
        break;
      }
    }
  }
}

main().catch((e) => { console.error("FATAL:", e); process.exit(1); });
