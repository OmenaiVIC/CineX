// Test if basic STX transfer works — isolates whether the issue is tx format vs contract deploy specifically
import { makeSTXTokenTransfer, broadcastTransaction, getNonce, getAddressFromPrivateKey, TransactionVersion } from "@stacks/transactions";
import { StacksTestnet } from "@stacks/network";

const senderKey = "5f0c2ce7d672abfc214b402c39c1ad2cfec3ca35de213dc467350e11612b7528";
const network = new StacksTestnet();
const addr = getAddressFromPrivateKey(senderKey, TransactionVersion.Testnet);
const nonce = Number(await getNonce(addr, network));

console.log("sender:", addr, "nonce:", nonce);

// Send 1 uSTX to yourself
const tx = await makeSTXTokenTransfer({
  recipient: addr,
  amount: 1n,
  senderKey,
  nonce,
  fee: 10000n,
  network,
  memo: "test",
});
console.log("tx created, txid:", tx.txid());

const result = await broadcastTransaction(tx, network);
console.log("broadcast:", JSON.stringify(result));

// Wait and check
const txid = result.txid;
for (let i = 0; i < 12; i++) {
  await new Promise(r => setTimeout(r, 5000));
  const res = await fetch("https://api.testnet.hiro.so/extended/v1/tx/" + txid);
  const d = await res.json();
  console.log(`  status: ${d.tx_status}, block: ${d.block_height || "-"}`);
  if (d.tx_status === "success") break;
  if (d.tx_status === "abort_by_response") {
    console.log("  result:", d.tx_result?.repr);
    break;
  }
}
