// Build a raw deploy transaction from scratch
// The v7 SDK broadcastTransaction was double-encoding. Let me understand the serialize() format.
import pkgTx from "@stacks/transactions";
const { makeContractDeploy, fetchNonce, getAddressFromPrivateKey, ClarityVersion, signWithKey, makeRandomPrivKey } = pkgTx;
import pkgNet from "@stacks/network";
const { createNetwork, STACKS_TESTNET, TransactionVersion } = pkgNet;

const senderKey = "5f0c2ce7d672abfc214b402c39c1ad2cfec3ca35de213dc467350e11612b7528";
const network = createNetwork({ url: "https://api.testnet.hiro.so", ...STACKS_TESTNET });
const addr = getAddressFromPrivateKey(senderKey, "testnet");
const nonce = Number(await fetchNonce({ address: addr, network }));
console.log("addr:", addr, "nonce:", nonce);

const simpleSource = `(define-data-var counter uint 0)
(define-read-only (get-counter) (var-get counter))
(define-public (increment) (begin (var-set counter (+ (var-get counter) u1)) (ok true)))`;

const tx = await makeContractDeploy({
  contractName: "cine-test-v8",
  codeBody: simpleSource,
  senderKey,
  nonce,
  fee: 10000n,
  network,
});

// serialize() returns what format?
const s = tx.serialize();
console.log("serialize type:", typeof s);
console.log("serialize length:", s.length);
console.log("is hex?", /^[0-9a-f]+$/i.test(s));

// Try the .serialize() return value directly as hex
const response1 = await fetch("https://api.testnet.hiro.so/v2/transactions", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ tx: s }),
});
console.log("POST with serialize():", response1.status, await response1.text());

// If serialize returns hex string, try .txid()
console.log("txid():", tx.txid());

// Check if txid matches sha256 of the raw tx
const crypto = await import("crypto");
const rawBytes = Buffer.from(s, "hex");
const hash = crypto.createHash("sha256").update(rawBytes).digest("hex");
console.log("sha256 of serialize hex decoded:", hash);
console.log("matches txid?", hash === tx.txid());
