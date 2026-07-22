/**
 * v6.17.0 deploy — skip manual signing, broadcast directly
 */
const { createRequire } = await import("module");
const require = createRequire(import.meta.url);
const cjs = require("@stacks/transactions");
const net = require("@stacks/network");

const addr = "ST3482KEKEA7152W4XX938392QSN9Z5EAZCX1NWH3";
const KEY = "3803e0e804a68c4eb2861129a158b46459182122be273b04090e23764b86980f";

async function main() {
  const network = new net.StacksTestnet();

  // Fetch nonce
  const acctRes = await fetch(`https://api.testnet.hiro.so/v2/accounts/${addr}?proof=0`);
  const acct = await acctRes.json();
  const nonce = acct.nonce;
  console.log("nonce:", nonce);

  // Simplest possible contract
  const contractSource = '(define-public (hello) (ok true))';

  // v6.17.0: senderKey handles signing internally
  const tx = await cjs.makeContractDeploy({
    contractName: "test-v6d",
    codeBody: contractSource,
    senderKey: KEY,
    nonce,
    fee: 10000,
    clarityVersion: 4,
    network,
  });

  // Serialize — v6.17.0 returns Buffer
  const raw = tx.serialize();
  const hex = Buffer.isBuffer(raw) ? raw.toString("hex") : (typeof raw === "string" ? raw : Buffer.from(raw).toString("hex"));
  
  console.log("auth flag:", hex.slice(0, 2));
  console.log("length:", hex.length, "hex =", hex.length / 2, "bytes");

  // Check if auth is signed (0x04) or unsigned (0x80)
  const authFlag = parseInt(hex.slice(0, 2), 16);
  console.log("auth flag decimal:", authFlag);

  if (authFlag === 0x80) {
    console.log("Auth flag 0x80 = unsigned/public key only");
    console.log("Checking tx.auth structure...");
    console.log("  auth.authType:", tx.auth?.authType);
    console.log("  auth keys:", Object.getOwnPropertyNames(Object.getPrototypeOf(tx.auth || {})).join(", "));
    console.log("  auth fields:", Object.keys(tx.auth || {}).join(", "));
    
    // Try to sign the txid hash with the private key
    const txidHash = tx.txid();
    console.log("\ntxid:", txidHash);

    // v6.17.0 signWithKey expects (StacksPrivateKey, messageHash)
    const privKey = cjs.createStacksPrivateKey(KEY);
    console.log("privKey type:", typeof privKey, privKey.constructor?.name);
    
    const sigResult = cjs.signWithKey(privKey, txidHash);
    console.log("sigResult keys:", Object.keys(sigResult));
    console.log("sigResult.signature:", sigResult.signature?.slice(0, 20) + "...");
    console.log("sigResult.data:", sigResult.data?.slice(0, 20) + "...");
  }

  // Try broadcast either way
  console.log("\n=== BROADCASTING ===");
  const res = await fetch("https://api.testnet.hiro.so/v2/transactions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tx: hex }),
  });
  const data = await res.json();
  console.log("status:", res.status);
  console.log("result:", JSON.stringify(data));
  
  if (data.txid) {
    console.log("explorer: https://explorer.hiro.so/txid/" + data.txid + "?chain=testnet");

    // Wait and check
    for (let i = 0; i < 20; i++) {
      await new Promise(r => setTimeout(r, 5000));
      const r2 = await fetch("https://api.testnet.hiro.so/extended/v1/tx/" + data.txid);
      const txInfo = await r2.json();
      console.log(`  [${(i+1)*5}s] status=${txInfo.tx_status}`);
      if (txInfo.tx_status === "success" || txInfo.tx_status === "abort_by_response") {
        if (txInfo.tx_result) console.log("  result:", txInfo.tx_result.repr);
        if (txInfo.contract_abi) console.log("  ABI:", JSON.stringify(txInfo.contract_abi).slice(0, 300));
        break;
      }
    }
  }
}

main().catch(e => { console.error("FATAL:", e); process.exit(1); });
