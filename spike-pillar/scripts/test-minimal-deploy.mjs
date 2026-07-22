// Minimal contract deploy test — clarity version 2 first
import { makeContractDeploy, broadcastTransaction, getNonce, getAddressFromPrivateKey, TransactionVersion } from "@stacks/transactions";
import { StacksTestnet } from "@stacks/network";

const senderKey = "5f0c2ce7d672abfc214b402c39c1ad2cfec3ca35de213dc467350e11612b7528";
const network = new StacksTestnet();
const addr = getAddressFromPrivateKey(senderKey, TransactionVersion.Testnet);
const nonce = Number(await getNonce(addr, network));

const simpleSource = `(define-data-var counter uint 0)
(define-read-only (get-counter) (var-get counter))
(define-public (increment) (begin (var-set counter (+ (var-get counter) u1)) (ok true)))`;

const tx = await makeContractDeploy({
  contractName: "cine-test-v2",
  codeBody: simpleSource,
  senderKey,
  nonce,
  fee: 10000n,
  network,
  clarityVersion: 2,
});

const result = await broadcastTransaction(tx, network);
console.log("broadcast:", JSON.stringify(result));

const txid = result.txid;
if (!txid) { console.log("no txid, done"); process.exit(1); }

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
