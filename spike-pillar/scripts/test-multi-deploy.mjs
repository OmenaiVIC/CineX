// Test: try deploying with explicit version headers and different clarity versions
import pkgTx from "@stacks/transactions";
const { makeContractDeploy, broadcastTransaction, fetchNonce, getAddressFromPrivateKey, ClarityVersion } = pkgTx;
import pkgNet from "@stacks/network";
const { createNetwork, STACKS_TESTNET } = pkgNet;

const senderKey = "5f0c2ce7d672abfc214b402c39c1ad2cfec3ca35de213dc467350e11612b7528";
const network = createNetwork({ url: "https://api.testnet.hiro.so", ...STACKS_TESTNET });
const addr = getAddressFromPrivateKey(senderKey, "testnet");
let nonce = Number(await fetchNonce({ address: addr, network }));
console.log("addr:", addr, "nonce:", nonce);

// Post using direct fetch (avoid broadcastTransaction double-encode)
async function deploy(name, source, clarityVer) {
  const tx = await makeContractDeploy({
    contractName: name,
    codeBody: source,
    senderKey,
    nonce: nonce++,
    fee: 10000n,
    network,
    clarityVersion: clarityVer,
  });
  const serialized = tx.serialize();
  console.log(`\n--- ${name} (clarityVersion=${clarityVer}) ---`);
  console.log("txid:", tx.txid());

  const response = await fetch("https://api.testnet.hiro.so/v2/transactions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tx: serialized }),
  });
  const text = await response.text();
  console.log("broadcast:", text);

  const txid = tx.txid();
  for (let i = 0; i < 12; i++) {
    await new Promise(r => setTimeout(r, 5000));
    const res = await fetch("https://api.testnet.hiro.so/extended/v1/tx/" + txid);
    const d = await res.json();
    if (d.tx_status === "success") {
      console.log("SUCCESS! contract:", d.smart_contract?.contract_id);
      return true;
    }
    if (d.tx_status === "abort_by_response" || d.tx_status === "abort_by_post_condition") {
      console.log("REJECTED:", d.tx_result?.repr);
      return false;
    }
  }
  console.log("timeout");
  return false;
}

// Test 1: Minimal contract with clarity 3
const r1 = await deploy("cine-c3", `(define-data-var x uint 0)`, 3);

// Test 2: Minimal contract with Clarity2 (no explicit)
const r2 = await deploy("cine-c2", `(define-data-var x uint 0)`, 2);

// Test 3: Minimal contract with clarity 4
const r3 = await deploy("cine-c4", `(define-data-var x uint 0)`, 4);
