import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pkg = require('@stacks/transactions');
const { StacksTestnet } = require('@stacks/network');
const fs = require('fs');
const path = require('path');

const KEY = '3803e0e804a68c4eb2861129a158b46459182122be273b04090e23764b86980f';
const network = new StacksTestnet();
const addr = pkg.getAddressFromPrivateKey(KEY, pkg.TransactionVersion.Testnet);

// Get fresh nonce
const acctRes = await fetch(`https://api.testnet.hiro.so/v2/accounts/${addr}?proof=0`);
const acct = await acctRes.json();
const nonce = parseInt(acct.nonce);
const bal = Number(BigInt(acct.balance) / 1000000n);
console.log(`Balance: ${bal} STX, nonce: ${nonce}`);

if (bal < 1) { console.error('Insufficient balance'); process.exit(1); }

// Verify clarity-webauthn exists first
const checkRes = await fetch(`https://api.testnet.hiro.so/v2/contracts/call-read/${addr}/clarity-webauthn/get-rp-id-hash`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ sender: addr, arguments: [] }),
});
const check = await checkRes.json();
if (!check.okay && check.cause?.includes?.('NoSuchContract')) {
  console.error('clarity-webauthn not deployed yet!');
  process.exit(1);
}
console.log('✅ clarity-webauthn confirmed on-chain');

// Deploy cinex-smart-vault
const source = fs.readFileSync(path.resolve('contracts/cinex-smart-vault.clar'), 'utf8');
const VAULT_CONTRACT_NAME = 'cinex-smart-vault-v4';
console.log(`\nDeploying ${VAULT_CONTRACT_NAME} (${source.length} chars, clarity 4) nonce=${nonce}...`);

const tx = await pkg.makeContractDeploy({
  contractName: VAULT_CONTRACT_NAME,
  codeBody: source,
  senderKey: KEY,
  network,
  fee: 10000,
  nonce,
  clarityVersion: 4,
});

const hex = Buffer.from(tx.serialize()).toString('hex');
console.log('Auth flag:', '0x' + hex.slice(10, 12), '(Standard)');

const res = await fetch('https://api.testnet.hiro.so/v2/transactions', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ tx: hex }),
});
const body = await res.json();
const txid = (typeof body === 'string') ? body : body.txid;
const error = (typeof body === 'object' && body.error) ? body.error : null;

if (res.status === 200 && txid) {
  console.log(`✅ Broadcast: ${txid}`);
  console.log(`Explorer: https://explorer.hiro.so/txid/${txid}?chain=testnet`);

  // Poll for confirmation
  console.log('\nWaiting for confirmation...');
  for (let i = 0; i < 60; i++) {
    await new Promise(r => setTimeout(r, 5000));
    const txRes = await fetch(`https://api.testnet.hiro.so/extended/v1/tx/${txid}`);
    if (txRes.ok) {
      const txInfo = await txRes.json();
      if (txInfo.tx_status === 'success') {
        console.log(`✅ CONFIRMED in block ${txInfo.block_height}!`);
        console.log('Result:', txInfo.tx_result?.repr);
        break;
      } else if (['abort_by_response', 'abort_by_post_condition', 'failed'].includes(txInfo.tx_status)) {
        console.log(`❌ FAILED: ${txInfo.tx_status}`);
        console.log('VM error:', txInfo.vm_error);
        console.log('Result:', txInfo.tx_result?.repr);
        break;
      }
      if (i % 6 === 0) console.log(`  [${i}] ${txInfo.tx_status}`);
    }
  }
} else {
  console.log(`❌ Broadcast failed (${res.status}):`, error || JSON.stringify(body));
}
