// v7.x API — correct broadcastTransaction signature
import pkgTx from "@stacks/transactions";
const { makeContractDeploy, broadcastTransaction, fetchNonce, getAddressFromPrivateKey, ClarityVersion } = pkgTx;
import pkgNet from "@stacks/network";
const { createNetwork, STACKS_TESTNET } = pkgNet;

const senderKey = "5f0c2ce7d672abfc214b402c39c1ad2cfec3ca35de213dc467350e11612b7528";
const network = createNetwork({ url: "https://api.testnet.hiro.so", ...STACKS_TESTNET });
const addr = getAddressFromPrivateKey(senderKey, "testnet");
const nonce = await fetchNonce({ address: addr, network });

console.log("addr:", addr, "nonce:", nonce);

const simpleSource = `(define-data-var counter uint 0)
(define-read-only (get-counter) (var-get counter))
(define-public (increment) (begin (var-set counter (+ (var-get counter) u1)) (ok true)))`;

const tx = await makeContractDeploy({
  contractName: "cine-test-v7",
  codeBody: simpleSource,
  senderKey,
  nonce,
  fee: 10000n,
  network,
});

console.log("tx created, txid:", tx.txid());

// v7 broadcastTransaction takes { transaction, network } object
const result = await broadcastTransaction({ transaction: tx, network });
console.log("broadcast:", JSON.stringify(result));

const txid = result.txid;
if (!txid) { console.log("no txid"); process.exit(1); }

for (let i = 0; i < 15; i++) {
  await new Promise(r => setTimeout(r, 5000));
  const res = await fetch("https://api.testnet.hiro.so/extended/v1/tx/" + txid);
  const d = await res.json();
  console.log(`  status: ${d.tx_status}, block: ${d.block_height || "-"}`);
  if (d.tx_status === "success") {
    console.log("  contract:", d.smart_contract?.contract_id);
    break;
  }
  if (d.tx_status === "abort_by_response") {
    console.log("  result:", d.tx_result?.repr);
    break;
  }
}
