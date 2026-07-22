import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pkg = require('@stacks/transactions');
const { StacksTestnet } = require('@stacks/network');
const fs = require('fs');
const path = require('path');

const KEY = '3803e0e804a68c4eb2861129a158b46459182122be273b04090e23764b86980f';
const network = new StacksTestnet();
const addr = pkg.getAddressFromPrivateKey(KEY, pkg.TransactionVersion.Testnet);
console.log('Address:', addr);

async function getNonce() {
  const res = await fetch(`https://api.testnet.hiro.so/v2/accounts/${addr}?proof=0`);
  const d = await res.json();
  return parseInt(d.nonce);
}

async function deploy(contractName, sourceFile, clarityVersion, nonce) {
  const source = fs.readFileSync(path.resolve('contracts', sourceFile), 'utf8');
  console.log(`\n=== Deploying ${contractName} (${source.length} chars, clarity ${clarityVersion}) nonce=${nonce} ===`);

  const tx = await pkg.makeContractDeploy({
    contractName,
    codeBody: source,
    senderKey: KEY,
    network,
    fee: 10000,
    nonce,
    clarityVersion,
  });

  const hex = Buffer.from(tx.serialize()).toString('hex');
  console.log('Auth flag:', '0x' + hex.slice(10, 12), '(Standard)');

  const res = await fetch('https://api.testnet.hiro.so/v2/transactions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tx: hex }),
  });
  const body = await res.json();
  // Hiro API returns txid as string (200) or error object (400)
  const txid = (typeof body === 'string') ? body : body.txid;
  const error = (typeof body === 'object' && body.error) ? body.error : null;
  console.log('Broadcast:', res.status, error || txid || JSON.stringify(body));
  return { txid, error };
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
  // Step 1: Deploy clarity-webauthn (Clarity 4, dependency)
  let nonce = await getNonce();
  const r1 = await deploy('clarity-webauthn', 'clarity-webauthn.clar', 4, nonce);
  if (r1.txid) {
    console.log('Explorer:', `https://explorer.hiro.so/txid/${r1.txid}?chain=testnet`);
    const ok1 = await waitForTx(r1.txid);
    if (!ok1) { console.log('FAILED: clarity-webauthn'); return; }
  } else {
    console.log('FAILED to broadcast clarity-webauthn'); return;
  }

  // Step 2: Deploy cinex-smart-vault (Clarity 4, depends on clarity-webauthn)
  nonce = await getNonce();
  const r2 = await deploy('cinex-smart-vault', 'cinex-smart-vault.clar', 4, nonce);
  if (r2.txid) {
    console.log('Explorer:', `https://explorer.hiro.so/txid/${r2.txid}?chain=testnet`);
    const ok2 = await waitForTx(r2.txid);
    if (!ok2) { console.log('FAILED: cinex-smart-vault'); return; }
  } else {
    console.log('FAILED to broadcast cinex-smart-vault'); return;
  }

  // Step 3: Verify both contracts exist
  console.log('\n=== Verifying contracts ===');
  for (const name of ['clarity-webauthn', 'cinex-smart-vault']) {
    const cid = `${addr}.${name}`;
    const res = await fetch(`https://api.testnet.hiro.so/extended/v1/contract/${cid}`);
    if (res.ok) {
      const info = await res.json();
      console.log(`✅ ${cid} — deployed at block ${info.deploy_height}`);
    } else {
      console.log(`⏳ ${cid} — not yet indexed (checking later...)`);
    }
  }

  console.log('\n🎉 DEPLOYMENT COMPLETE!');
  console.log('Contract ID:', `${addr}.cinex-smart-vault`);
}

main().catch(console.error);
