#!/usr/bin/env node
/**
 * Onboard a user on testnet: call onboard(pubkey, new-owner) on cinex-smart-vault.
 *
 * Usage:
 *   CREATOR_KEY=xxx node scripts/onboard-user.mjs [--owner ST...] [--dry-run]
 *
 * Flow:
 *   1. Generate P-256 keypair (simulates what WebAuthn/passkey produces)
 *   2. Build onboard contract call
 *   3. Sign with deployer key (secp256k1)
 *   4. Broadcast to testnet
 *   5. Wait for confirmation
 *   6. Verify via get-owner read-only call
 */

import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pkg = require('@stacks/transactions');
const { StacksTestnet } = require('@stacks/network');
const { p256 } = await import('@noble/curves/nist.js');

const VAULT_CONTRACT = 'ST29JKDEFRY0RYMGF97FZC9PZWJ4H4VBSQFFERNXX.cinex-smart-vault-v4';
const HIRO_API = 'https://api.testnet.hiro.so';

// ── CLI args ─────────────────────────────────────────────
const args = process.argv.slice(2);
const ownerIdx = args.indexOf('--owner');
const newOwner = ownerIdx >= 0 ? args[ownerIdx + 1] : null;
const dryRun = args.includes('--dry-run');

// ── Deployer key from env ────────────────────────────────
const DEPLOYER_KEY = process.env.CREATOR_KEY;
if (!DEPLOYER_KEY) {
  console.error('ERROR: CREATOR_KEY env var required');
  process.exit(1);
}

const deployerAddr = pkg.getAddressFromPrivateKey(DEPLOYER_KEY, pkg.TransactionVersion.Testnet);
console.log('=== Onboard User on Testnet ===\n');
console.log(`Deployer: ${deployerAddr}`);

// ── 1. Generate P-256 keypair (simulates passkey) ───────
const privKey = p256.utils.randomSecretKey();
const pubKey = p256.getPublicKey(privKey);
const pubkeyHex = Buffer.from(pubKey).toString('hex');

console.log(`\nGenerated P-256 keypair:`);
console.log(`  Public key:  ${pubkeyHex}`);
console.log(`  Key length:  ${pubKey.length} bytes`);

// ── 2. Determine new owner ──────────────────────────────
const [addrPart, namePart] = VAULT_CONTRACT.split('.');
const owner = newOwner || deployerAddr;
console.log(`\nNew owner: ${owner}`);

// ── 3. Check current vault state ────────────────────────
console.log('\nChecking vault state...');
try {
  const resp = await fetch(`${HIRO_API}/v2/contracts/call-read/${addrPart}/${namePart}/is-initialized`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sender: deployerAddr, arguments: [] }),
  });
  const result = await resp.json();
  console.log(`  is-initialized: ${JSON.stringify(result.result)}`);
  if (result.result === '0x03') {
    console.log('  Vault is already initialized.');
  }
} catch (e) {
  console.log(`  Could not check: ${e.message}`);
}

if (dryRun) {
  console.log('\n--- DRY RUN ---');
  console.log(`  Contract: ${VAULT_CONTRACT}`);
  console.log(`  Function: onboard`);
  console.log(`  Arg 0 (pubkey):  0x${pubkeyHex.slice(0, 32)}...`);
  console.log(`  Arg 1 (owner):   ${owner}`);
  process.exit(0);
}

// ── 4. Build and broadcast onboard tx ───────────────────
console.log('\nBuilding onboard transaction...');

// Fetch fresh nonce
const nonceResp = await fetch(`${HIRO_API}/v2/accounts/${deployerAddr}?proof=0`);
const acct = await nonceResp.json();
const nonce = parseInt(acct.nonce);
console.log(`  Nonce: ${nonce}`);

// Build the onboard call
const tx = await pkg.makeContractCall({
  contractAddress: addrPart,
  contractName: namePart,
  functionName: 'onboard',
  functionArgs: [
    pkg.bufferCV(Buffer.from(pubKey)),   // (buff 33) compressed P-256 public key
    pkg.principalCV(owner),               // principal
  ],
  senderKey: DEPLOYER_KEY,
  nonce,
  network: new StacksTestnet(),
  fee: '1000', // 0.001 STX
});

// Serialize
const ser = tx.serialize();
const hexStr = Buffer.from(ser).toString('hex');
console.log(`  TX size: ${hexStr.length / 2} bytes`);

// Broadcast
console.log('\nBroadcasting...');
const broadcastResp = await fetch(`${HIRO_API}/v2/transactions`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ tx: hexStr }),
});

const body = await broadcastResp.text();
let result;
try { result = JSON.parse(body); } catch { result = body; }

const txid = typeof result === 'string' ? result : result?.txid;
if (!txid) {
  console.error('  Broadcast failed:', body);
  process.exit(1);
}

console.log(`  Tx broadcast: ${txid}`);
console.log(`  Explorer:     https://explorer.hiro.so/txid/${txid}?chain=testnet`);

// ── 5. Wait for confirmation ────────────────────────────
console.log('\nWaiting for confirmation...');
let confirmed = false;
let blockHeight = 0;
for (let i = 0; i < 60; i++) {
  try {
    const resp = await fetch(`${HIRO_API}/extended/v1/tx/${txid}`);
    const txInfo = await resp.json();
    if (txInfo.tx_status === 'success') {
      confirmed = true;
      blockHeight = txInfo.block_height;
      break;
    }
    if (txInfo.tx_status === 'abort_by_response' || txInfo.tx_status === 'problem_processing') {
      console.log(`  ❌ Tx failed: ${txInfo.tx_status}`);
      if (txInfo.error) console.log(`  Error: ${txInfo.error}`);
      process.exit(1);
    }
  } catch { /* not found yet */ }
  await new Promise(r => setTimeout(r, 3000));
}

if (!confirmed) {
  console.log('  ⏰ Timed out waiting for confirmation');
  process.exit(1);
}

console.log(`  ✅ Onboard confirmed in block ${blockHeight}`);

// ── 6. Verify via get-owner ─────────────────────────────
console.log('\nVerifying vault owner...');
const verifyResp = await fetch(`${HIRO_API}/v2/contracts/call-read/${addrPart}/${namePart}/get-owner`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ sender: deployerAddr, arguments: [] }),
});
const verifyResult = await verifyResp.json();
console.log(`  get-owner result: ${JSON.stringify(verifyResult.result)}`);
console.log('\n=== Onboard Complete ===');
