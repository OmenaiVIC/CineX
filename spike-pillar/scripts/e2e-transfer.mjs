/**
 * E2E P-256 Signed Transfer on Testnet — Vault v4 (SIP-018)
 *
 * Flow:
 *   1. Deploy vault v4 (with SIP-018 on-chain verification)
 *   2. Onboard with P-256 keypair (owner key)
 *   3. Transfer: SIP-018 challenge computed off-chain, P-256 signs, vault verifies on-chain
 *   4. Verify on-chain
 *
 * v4 changes from v3:
 *   - stx-transfer now takes domain + message fields (SIP-018)
 *   - auth-id is in message params, not in sig-auth
 *   - Vault computes SIP-018 challenge on-chain and verifies P-256 signature
 */

import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pkg = require('@stacks/transactions');
const { StacksTestnet } = require('@stacks/network');
const crypto = await import('node:crypto');
const { p256 } = await import('@noble/curves/nist.js');
const fs = require('fs');
const path = require('path');

const sha256 = (b) => crypto.default.createHash('sha256').update(b).digest();

// --- SIP-018 inline helpers (matches src/sip018.ts) ---
const SIP018_PREFIX = Buffer.from('534950303138', 'hex'); // "SIP018"

function computeDomainHash(domain) {
  const domainCV = pkg.tupleCV({
    name: pkg.stringAsciiCV(domain.name),
    version: pkg.stringAsciiCV(domain.version),
    'chain-id': pkg.uintCV(domain.chainId),
    wallet: pkg.principalCV(domain.wallet),
  });
  const serialized = Buffer.from(pkg.serializeCV(domainCV), 'hex');
  return sha256(serialized);
}

function computeMessageHash(message) {
  const fields = {};
  fields.topic = pkg.stringAsciiCV(message.topic);
  fields['auth-id'] = pkg.uintCV(message['auth-id']);
  fields.amount = pkg.uintCV(message.amount);
  fields.recipient = pkg.principalCV(message.recipient);
  fields.memo = message.memo ? pkg.someCV(pkg.bufferCV(message.memo)) : pkg.noneCV();
  const messageCV = pkg.tupleCV(fields);
  const serialized = Buffer.from(pkg.serializeCV(messageCV), 'hex');
  return sha256(serialized);
}

function computeSIP018Challenge(domain, message) {
  const domainHash = computeDomainHash(domain);
  const messageHash = computeMessageHash(message);
  return sha256(Buffer.concat([SIP018_PREFIX, domainHash, messageHash]));
}

function testnetDomain(vaultPrincipal) {
  return {
    name: 'cinex-smart-vault',
    version: '1.0.0',
    chainId: 2143456,
    wallet: vaultPrincipal,
  };
}

// --- Config ---
const RELAY_KEY = process.env.CREATOR_KEY;
if (!RELAY_KEY) { console.error('Set CREATOR_KEY'); process.exit(1); }

const relayAddr = pkg.getAddressFromPrivateKey(RELAY_KEY, pkg.TransactionVersion.Testnet);
const api = 'https://api.testnet.hiro.so';
const NETWORK = new StacksTestnet();
const VAULT_CONTRACT = 'cinex-smart-vault-v4';

console.log('=== E2E P-256 Signed Transfer — Vault v4 (SIP-018) ===\n');
console.log('Relay (tx-sender):', relayAddr);

// --- Step 1: Deploy vault v4 ---
console.log('\n--- Step 1: Deploy vault v4 ---');
const acct0 = await (await fetch(api + '/v2/accounts/' + relayAddr + '?proof=0')).json();
let nonce = parseInt(acct0.nonce);
console.log('Nonce:', nonce);

const v4Check = await fetch(api + '/extended/v1/contract/' + relayAddr + '.' + VAULT_CONTRACT);
if (v4Check.ok) {
  console.log('✅ vault v4 already deployed');
} else {
  const source = fs.readFileSync(path.resolve('contracts', 'cinex-smart-vault.clar'), 'utf8');
  console.log(`Deploying ${VAULT_CONTRACT} (${source.length} chars)...`);
  const deployTx = await pkg.makeContractDeploy({
    contractName: VAULT_CONTRACT,
    codeBody: source,
    senderKey: RELAY_KEY,
    network: NETWORK,
    fee: 10000,
    nonce,
    clarityVersion: 4,
  });
  const hex = Buffer.from(deployTx.serialize()).toString('hex');
  const deployResp = await fetch(api + '/v2/transactions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tx: hex }),
  });
  const deployBody = await deployResp.json();
  const deployTxid = (typeof deployBody === 'string') ? deployBody : deployBody.txid;
  if (!deployTxid) { console.error('❌ Deploy failed:', deployBody); process.exit(1); }
  console.log('Explorer: https://explorer.hiro.so/txid/' + deployTxid + '?chain=testnet');
  for (let i = 0; i < 30; i++) {
    await new Promise(r => setTimeout(r, 5000));
    const resp = await fetch(api + '/extended/v1/tx/' + deployTxid);
    const txData = await resp.json();
    if (txData.tx_status === 'success') {
      console.log('✅ vault v4 deployed at block', txData.block_height);
      break;
    }
    if (txData.tx_status === 'abort_by_response') {
      console.error('❌ Deploy failed:', txData.vm_error);
      process.exit(1);
    }
    if (i % 5 === 0) process.stdout.write('.');
  }
  nonce++;
}

// --- Step 2: Generate owner P-256 keypair ---
console.log('\n--- Step 2: Generate owner P-256 keypair ---');
const ownerPrivKey = p256.utils.randomSecretKey();
const ownerPubKeyCompressed = p256.getPublicKey(ownerPrivKey, true);
const ownerPubKeyHex = Buffer.from(ownerPubKeyCompressed).toString('hex');
console.log('Owner P-256 pubkey:', ownerPubKeyHex);

// --- Step 3: Onboard owner ---
console.log('\n--- Step 3: Onboard owner ---');
const initResp = await fetch(api + '/v2/contracts/call-read/' + relayAddr + '/' + VAULT_CONTRACT + '/is-initialized', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ sender: relayAddr, arguments: [] }),
});
const initData = await initResp.json();
const isInitialized = initData.result === '0x03';
console.log('Already initialized:', isInitialized);

if (!isInitialized) {
  const acct1 = await (await fetch(api + '/v2/accounts/' + relayAddr + '?proof=0')).json();
  nonce = parseInt(acct1.nonce);
  const onboardTx = await pkg.makeContractCall({
    contractAddress: relayAddr,
    contractName: VAULT_CONTRACT,
    functionName: 'onboard',
    functionArgs: [
      pkg.bufferCV(ownerPubKeyCompressed),
      pkg.standardPrincipalCV(relayAddr),
    ],
    senderKey: RELAY_KEY,
    nonce,
    network: NETWORK,
    fee: 10000,
    postConditionMode: pkg.PostConditionMode.Allow,
  });
  const hex = Buffer.from(onboardTx.serialize()).toString('hex');
  const resp = await fetch(api + '/v2/transactions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tx: hex }),
  });
  const body = await resp.json();
  const txid = (typeof body === 'string') ? body : body.txid;
  if (!txid) { console.error('❌ Onboard failed:', body); process.exit(1); }
  console.log('Explorer: https://explorer.hiro.so/txid/' + txid + '?chain=testnet');
  for (let i = 0; i < 20; i++) {
    await new Promise(r => setTimeout(r, 5000));
    const resp2 = await fetch(api + '/extended/v1/tx/' + txid);
    const txData = await resp2.json();
    if (txData.tx_status === 'success') {
      console.log('✅ Onboard confirmed at block', txData.block_height);
      break;
    }
    if (txData.tx_status === 'abort_by_response') {
      console.error('❌ Onboard failed:', txData.vm_error);
      process.exit(1);
    }
  }
  nonce++;
}

// --- Step 4: Compute SIP-018 challenge ---
console.log('\n--- Step 4: Compute SIP-018 challenge ---');
const recipient = 'ST2VBFYX0KCSR9F6BSVRS2YZTGE06S8593YWFEDJQ';
const amount = 1000000; // 1 STX
const authId = 1;

const vaultPrincipal = relayAddr + '.' + VAULT_CONTRACT;
console.log('Vault principal:', vaultPrincipal);

const domain = testnetDomain(vaultPrincipal);
console.log('Domain:', JSON.stringify(domain));

const challenge = computeSIP018Challenge(domain, {
  topic: 'stx-transfer',
  'auth-id': authId,
  amount,
  recipient,
  memo: null,
});
console.log('SIP-018 challenge:', challenge.toString('hex'));

// --- Step 5: Build WebAuthn assertion ---
console.log('\n--- Step 5: Build WebAuthn assertion ---');

const CINEX_RP_ID_HASH = Buffer.from(
  'b1c4e8f3a2d56709c8e4f1a3b6d9e2c5f8a1b4d7e0c3f6a9b2d5e8c1f4a7d0e3', 'hex'
);
const authenticatorData = Buffer.concat([
  CINEX_RP_ID_HASH,
  Buffer.from([0x01]),
  Buffer.alloc(4, 0),
]);

const challengeB64 = challenge.toString('base64url');
const clientDataJSON = JSON.stringify({
  type: 'webauthn.get',
  challenge: challengeB64,
  origin: 'https://localhost',
  crossOrigin: false,
});
const challengeField = '"challenge":"';
const afterChallengeField = clientDataJSON.indexOf(challengeField) + challengeField.length;
const prefix = clientDataJSON.substring(0, afterChallengeField);
const suffixStart = afterChallengeField + challengeB64.length;
const suffix = clientDataJSON.substring(suffixStart);
console.log('clientDataJSON:', clientDataJSON);

const reconstructed = prefix + challengeB64 + suffix;
console.log('Reconstruction matches:', reconstructed === clientDataJSON ? '✅' : '❌');

const prefixBuf = Buffer.from(prefix, 'utf8');
const suffixBuf = Buffer.from(suffix, 'utf8');

const clientDataHash = crypto.default.createHash('sha256').update(Buffer.from(clientDataJSON, 'utf8')).digest();
const signedDigest = crypto.default.createHash('sha256')
  .update(Buffer.concat([authenticatorData, clientDataHash]))
  .digest();
console.log('Signed digest:', signedDigest.toString('hex'));

const sig = p256.sign(signedDigest, ownerPrivKey, { prehash: true, format: 'compact', lowS: true });
console.log('Signature (' + sig.length + ' bytes):', Buffer.from(sig).toString('hex'));

const localValid = p256.verify(sig, signedDigest, p256.getPublicKey(ownerPrivKey, false));
console.log('Local P-256 verify:', localValid ? '✅' : '❌');
if (!localValid) { console.error('FATAL: local verify failed'); process.exit(1); }

// --- Step 6: Test clarity-webauthn verify-assertion (read-only) ---
console.log('\n--- Step 6: Test clarity-webauthn verify-assertion (read-only) ---');
const verifyArgs = [
  pkg.bufferCV(ownerPubKeyCompressed),
  pkg.bufferCV(challenge),
  pkg.bufferCV(CINEX_RP_ID_HASH),
  pkg.bufferCV(authenticatorData),
  pkg.bufferCV(prefixBuf),
  pkg.bufferCV(suffixBuf),
  pkg.bufferCV(Buffer.from(sig)),
];
const verifyResp = await fetch(api + '/v2/contracts/call-read/' + relayAddr + '/clarity-webauthn/verify-assertion', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    sender: relayAddr,
    arguments: verifyArgs.map(a => pkg.cvToHex(a)),
  }),
});
const verifyResult = await verifyResp.json();
console.log('verify-assertion result:', verifyResult.result);

// --- Step 7: Broadcast vault.stx-transfer (v4 SIP-018 interface) ---
console.log('\n--- Step 7: Broadcast vault.stx-transfer (v4 SIP-018) ---');
const acct2 = await (await fetch(api + '/v2/accounts/' + relayAddr + '?proof=0')).json();
nonce = parseInt(acct2.nonce);
console.log('Relay nonce:', nonce);

// v4 sig-auth tuple (no auth-id)
const sigAuth = pkg.tupleCV({
  pubkey: pkg.bufferCV(ownerPubKeyCompressed),
  signature: pkg.bufferCV(Buffer.from(sig)),
  'authenticator-data': pkg.bufferCV(authenticatorData),
  'client-data-prefix': pkg.bufferCV(prefixBuf),
  'client-data-suffix': pkg.bufferCV(suffixBuf),
});

// v4 function args: domain + message + sig-auth
const functionArgs = [
  pkg.stringAsciiCV(domain.name),
  pkg.stringAsciiCV(domain.version),
  pkg.uintCV(domain.chainId),
  pkg.contractPrincipalCV(relayAddr, VAULT_CONTRACT),
  pkg.uintCV(authId),
  pkg.uintCV(amount),
  pkg.standardPrincipalCV(recipient),
  pkg.noneCV(),
  sigAuth,
];

const tx = await pkg.makeContractCall({
  contractAddress: relayAddr,
  contractName: VAULT_CONTRACT,
  functionName: 'stx-transfer',
  functionArgs,
  senderKey: RELAY_KEY,
  nonce,
  network: NETWORK,
  fee: 100000,
  clarityVersion: 4,
  postConditionMode: pkg.PostConditionMode.Allow,
});

const hexStr = Buffer.from(tx.serialize()).toString('hex');
console.log('TX size:', hexStr.length / 2, 'bytes');

const broadcastResp = await fetch(api + '/v2/transactions', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ tx: hexStr }),
});
const broadcastBody = await broadcastResp.text();
console.log('Broadcast status:', broadcastResp.status);
console.log('Response:', broadcastBody);

if (broadcastResp.status !== 200) {
  console.error('❌ Broadcast failed');
  process.exit(1);
}

const txid2 = JSON.parse(broadcastBody);
console.log('Explorer: https://explorer.hiro.so/txid/' + txid2 + '?chain=testnet');

// --- Step 8: Poll for confirmation ---
console.log('\nWaiting for confirmation...');
for (let i = 0; i < 60; i++) {
  await new Promise(r => setTimeout(r, 3000));
  try {
    const resp = await fetch(api + '/extended/v1/tx/' + txid2);
    const txData = await resp.json();
    if (txData.tx_status === 'success') {
      console.log('\n✅ E2E SIP-018 SIGNED TRANSFER CONFIRMED (vault v4)');
      console.log('   Block:', txData.block_height);
      const balAfter = await (await fetch(api + '/v2/accounts/' + relayAddr + '?proof=0')).json();
      const balBefore = parseInt(acct2.balance, 16) / 1e6;
      const balNow = parseInt(balAfter.balance, 16) / 1e6;
      console.log('   Balance before:', balBefore, 'STX');
      console.log('   Balance after:', balNow, 'STX');
      console.log('   Gas + transfer cost:', (balBefore - balNow).toFixed(6), 'STX');
      console.log('\n=== VAULT v4 E2E COMPLETE ===');
      console.log('  SIP-018 domain binding: ✅');
      console.log('  SIP-018 on-chain challenge: ✅');
      console.log('  Owner pubkey stored: ✅');
      console.log('  Owner pubkey validated: ✅');
      console.log('  P-256 signed transfer: ✅');
      console.log('  Relay secp256k1 broadcast: ✅');
      process.exit(0);
    }
    if (txData.tx_status === 'abort_by_response' || txData.tx_status === 'problem_processing') {
      console.log('❌ Tx failed:', txData.tx_status);
      if (txData.vm_error) console.log('VM error:', txData.vm_error);
      process.exit(1);
    }
    if (i % 5 === 0) console.log('  Pending...', i * 3, 's');
  } catch {}
}
console.log('⏰ Timeout');
