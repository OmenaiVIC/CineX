// Fix: tx.serialize() already returns hex string in v7
import pkgTx from "@stacks/transactions";
const { makeContractDeploy, fetchNonce, getAddressFromPrivateKey, ClarityVersion } = pkgTx;
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

const serialized = tx.serialize();
console.log("serialize type:", typeof serialized, "length:", serialized.length);
console.log("first 100 chars:", serialized.substring(0, 100));
// Check auth flags byte
const authByte = parseInt(serialized.substring(4, 6), 16);
console.log("auth byte:", authByte, "0x" + authByte.toString(16));

// Direct POST using the serialized string directly
const response = await fetch("https://api.testnet.hiro.so/v2/transactions", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ tx: serialized }),
});
const text = await response.text();
console.log("POST status:", response.status);
console.log("POST body:", text);
