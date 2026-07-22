/**
 * Test: Deploy a TRIVIAL contract with explicit ClarityVersion.Clarity4
 * to see if the clarity version is the issue or if ALL deploys fail.
 */
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const HIRO_TESTNET_API = "https://api.testnet.hiro.so";
const DEPLOYER_KEY = "3803e0e804a68c4eb2861129a158b46459182122be273b04090e23764b86980f";
const DEPLOYER_ADDR = "ST3482KEKEA7152W4XX938392QSN9Z5EAZCX1NWH3";

async function main() {
  const pkg = await import("@stacks/transactions");
  const netPkg = await import("@stacks/network");

  const {
    makeContractDeploy,
    ClarityVersion,
    broadcastTransaction,
  } = pkg;

  const { createNetwork, STACKS_TESTNET } = netPkg;
  const network = createNetwork({ url: HIRO_TESTNET_API, ...STACKS_TESTNET });

  // ── Strategy 1: Deploy TRIVIAL contract with clarity 4 ──
  console.log("=== TEST 1: Trivial contract, ClarityVersion.Clarity4 ===");
  const trivialSource = '(define-public (hello) (ok "hello clarity 4"))';
  
  let nonceRes = await fetch(`${HIRO_TESTNET_API}/v2/accounts/${DEPLOYER_ADDR}?proof=0`);
  let acct = await nonceRes.json();
  let nonce = acct.nonce;
  console.log("nonce:", nonce);

  try {
    const tx1 = await makeContractDeploy({
      contractName: "test-clarity4-trivial",
      codeBody: trivialSource,
      senderKey: DEPLOYER_KEY,
      nonce,
      fee: 10000n,
      clarityVersion: ClarityVersion.Clarity4,
      network,
    });

    const hex1 = typeof tx1.serialize() === "string"
      ? tx1.serialize()
      : Buffer.from(tx1.serialize()).toString("hex");
    
    // Check clarity_version byte in payload
    const nameHex = Buffer.from("test-clarity4-trivial").toString("hex");
    const nameIdx = hex1.indexOf(nameHex);
    if (nameIdx >= 0) {
      const afterName = nameIdx + nameHex.length;
      const cvByte = hex1.slice(afterName, afterName + 2);
      console.log("clarity_version byte in tx payload:", "0x" + cvByte, "(expected 0x04)");
    }

    // Direct POST (bypasses broadcastTransaction double-encode)
    const res1 = await fetch(`${HIRO_TESTNET_API}/v2/transactions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tx: hex1 }),
    });
    const data1 = await res1.json();
    console.log("broadcast result:", JSON.stringify(data1));
    if (data1.txid) {
      console.log("txid:", data1.txid);
    }
  } catch (e) {
    console.log("ERROR:", e.message);
  }

  // ── Strategy 2: Deploy trivial contract with clarity 2 (control) ──
  console.log("\n=== TEST 2: Trivial contract, ClarityVersion.Clarity2 (control) ===");
  nonceRes = await fetch(`${HIRO_TESTNET_API}/v2/accounts/${DEPLOYER_ADDR}?proof=0`);
  acct = await nonceRes.json();
  nonce = acct.nonce;
  console.log("nonce:", nonce);

  try {
    const tx2 = await makeContractDeploy({
      contractName: "test-clarity2-trivial",
      codeBody: trivialSource,
      senderKey: DEPLOYER_KEY,
      nonce,
      fee: 10000n,
      clarityVersion: ClarityVersion.Clarity2,
      network,
    });

    const hex2 = typeof tx2.serialize() === "string"
      ? tx2.serialize()
      : Buffer.from(tx2.serialize()).toString("hex");

    const res2 = await fetch(`${HIRO_TESTNET_API}/v2/transactions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tx: hex2 }),
    });
    const data2 = await res2.json();
    console.log("broadcast result:", JSON.stringify(data2));
    if (data2.txid) {
      console.log("txid:", data2.txid);
    }
  } catch (e) {
    console.log("ERROR:", e.message);
  }

  // ── Strategy 3: Deploy actual cinex-smart-vault with explicit Clarity4 ──
  console.log("\n=== TEST 3: cinex-smart-vault, ClarityVersion.Clarity4 ===");
  nonceRes = await fetch(`${HIRO_TESTNET_API}/v2/accounts/${DEPLOYER_ADDR}?proof=0`);
  acct = await nonceRes.json();
  nonce = acct.nonce;
  console.log("nonce:", nonce);

  try {
    const vaultSource = readFileSync(
      resolve(__dirname, "../contracts/cinex-smart-vault.clar"),
      "utf-8"
    );

    const tx3 = await makeContractDeploy({
      contractName: "cinex-smart-vault",
      codeBody: vaultSource,
      senderKey: DEPLOYER_KEY,
      nonce,
      fee: 10000n,
      clarityVersion: ClarityVersion.Clarity4,
      network,
    });

    const hex3 = typeof tx3.serialize() === "string"
      ? tx3.serialize()
      : Buffer.from(tx3.serialize()).toString("hex");

    const res3 = await fetch(`${HIRO_TESTNET_API}/v2/transactions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tx: hex3 }),
    });
    const data3 = await res3.json();
    console.log("broadcast result:", JSON.stringify(data3));
    if (data3.txid) {
      console.log("txid:", data3.txid);
    }
  } catch (e) {
    console.log("ERROR:", e.message);
  }
}

main().catch((e) => { console.error("FATAL:", e); process.exit(1); });
