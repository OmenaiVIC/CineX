import { makeContractDeploy, broadcastTransaction, getNonce, getAddressFromPrivateKey, TransactionVersion } from "@stacks/transactions";
import { StacksTestnet } from "@stacks/network";

const senderKey = "5f0c2ce7d672abfc214b402c39c1ad2cfec3ca35de213dc467350e11612b7528";
const network = new StacksTestnet();
const addr = getAddressFromPrivateKey(senderKey, TransactionVersion.Testnet);
const nonce = Number(await getNonce(addr, network));

const simpleSource = `
(define-data-var counter uint 0)
(define-read-only (get-counter) (var-get counter))
(define-public (increment) (begin (var-set counter (+ (var-get counter) u1)) (ok true)))
`;

// Try clarity 3
const tx = await makeContractDeploy({
  contractName: "simple-test",
  codeBody: simpleSource,
  senderKey,
  nonce,
  fee: 10000n,
  network,
  clarityVersion: 3,
});
const result = await broadcastTransaction(tx, network);
console.log("deploy clarity 3:", JSON.stringify(result));

// Wait and check
const txid = result.txid;
for (let i = 0; i < 12; i++) {
  await new Promise(r => setTimeout(r, 5000));
  const res = await fetch("https://api.testnet.hiro.so/extended/v1/tx/" + txid);
  const d = await res.json();
  console.log(`  status: ${d.tx_status}`);
  if (d.tx_status === "success") {
    console.log("  contract_id:", d.smart_contract?.contract_id);
    break;
  }
  if (d.tx_status === "abort_by_response" || d.tx_status === "abort_by_post_condition") {
    console.log("  result:", d.tx_result?.repr);
    break;
  }
}
