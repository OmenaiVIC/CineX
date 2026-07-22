/**
 * deploy-v3.mjs — Deploy cinex-smart-vault-v3 (fixed security gap).
 *
 * Deploys only the vault contract — clarity-webauthn is already live.
 * Usage: node scripts/deploy-v3.mjs
 */
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pkg = require('@stacks/transactions');
const { StacksTestnet } = require('@stacks/network');
const fs = require('fs');
const path = require('path');

const KEY = '3803e0e804a68c4eb2861129a158b46459182122be273b04090e23764b86980f';
const network = new StacksTestnet();
const addr = pkg.getAddressFromPrivateKey(KEY, pkg.TransactionVersion.Testnet);
console.log('Deployer:', addr);

async function getNonce() {
  const res = await fetch(`https://api.testnet.hiro.so/v2/accounts/${addr}?proof=0`);
  const d = await res.json();
  return parseInt(d.nonce);
}

async function waitForTx(txid) {
  for (let i = 0; i < 20; i++) {
    await new Promise(r => setTimeout(r, 5000));
    const res = await fetch(`https://api.testnet.hiro.so/extended/v1/tx/${txid}`);
    const d = await res.json();
    process.stdout.write(`  [${i}] ${d.tx_status || 'pending'} `);
    if (d.tx_status === 'success') {
      console.log(`✅ block ${d.block_height}`);
      return true;
    }
    if (d.tx_status === 'abort_by_response') {
      console.log(`❌ ${d.vm_error}`);
      return false;
    }
    console.log();
  }
  return null;
}

async function main() {
  // Check clarity-webauthn exists
  const cwCheck = await fetch(`https://api.testnet.hiro.so/extended/v1/contract/${addr}.clarity-webauthn`);
  if (!cwCheck.ok) {
    console.error('❌ clarity-webauthn not deployed — deploy it first');
    process.exit(1);
  }
  console.log('✅ clarity-webauthn exists');

  // Deploy cinex-smart-vault-v3
  const source = fs.readFileSync(path.resolve('contracts', 'cinex-smart-vault.clar'), 'utf8');
  const nonce = await getNonce();
  console.log(`\n=== Deploying cinex-smart-vault-v3 (${source.length} chars, clarity 4) nonce=${nonce} ===`);

  const tx = await pkg.makeContractDeploy({
    contractName: 'cinex-smart-vault-v3',
    codeBody: source,
    senderKey: KEY,
    network,
    fee: 10000,
    nonce,
    clarityVersion: 4,
  });

  const hex = Buffer.from(tx.serialize()).toString('hex');
  const res = await fetch('https://api.testnet.hiro.so/v2/transactions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tx: hex }),
  });
  const body = await res.json();
  const txid = (typeof body === 'string') ? body : body.txid;
  const error = (typeof body === 'object' && body.error) ? body.error : null;
  console.log('Broadcast:', res.status, error || txid);

  if (!txid) {
    console.error('❌ Failed to broadcast');
    process.exit(1);
  }

  console.log('Explorer:', `https://explorer.hiro.so/txid/${txid}?chain=testnet`);
  const ok = await waitForTx(txid);
  if (!ok) {
    console.error('❌ Deployment failed');
    process.exit(1);
  }

  console.log('\n🎉 cinex-smart-vault-v3 DEPLOYED!');
  console.log('Contract:', `${addr}.cinex-smart-vault-v3`);
}

main().catch(console.error);
