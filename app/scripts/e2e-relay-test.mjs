/**
 * e2e-relay-test.mjs — Full E2E test of passkey relay flow.
 *
 * Each run: generate P-256 key → deploy fresh vault → onboard → fund → SIP-018 sign → relay transfer → confirm
 *
 * Usage: node app/scripts/e2e-relay-test.mjs
 */

import { createHash } from 'crypto';
import { p256 } from '@noble/curves/nist.js';
import stacksTx from '@stacks/transactions';
import netPkg from '@stacks/network';
import crypto from 'node:crypto';
import fs from 'fs';
import path from 'path';

const {
  tupleCV, stringAsciiCV, uintCV, principalCV,
  noneCV, serializeCV, standardPrincipalCV, bufferCV,
  makeContractCall, makeContractDeploy,
  PostConditionMode,
} = stacksTx;
const { STACKS_TESTNET } = netPkg;

const BACKEND_URL = 'https://cine-x-api.vercel.app';
const HIRO_API = 'https://api.testnet.hiro.so';
const RELAY_KEY = process.env.RELAY_KEY;
const RELAY_ADDR = 'ST3CAYVEF4T5REN8DXXVD2RNVXDXVGQAG3RPX2SB4';
const BACKER_ADDRESS = 'ST3MW8XN0A69B5TGRMNDSEVC75ABFRGGGY0D5KXXF';
const CINEX_RP_ID_HASH = 'b1c4e8f3a2d56709c8e4f1a3b6d9e2c5f8a1b4d7e0c3f6a9b2d5e8c1f4a7d0e3';
const NETWORK = STACKS_TESTNET;

const log = (step, msg) => console.log(`[${step}] ${msg}`);
const ok = (step, msg) => console.log(`[${step}] ✓ ${msg}`);
const fail = (step, msg) => { console.error(`[${step}] ✗ ${msg}`); process.exit(1); };

function bufToHex(buf) { return Array.from(buf).map(b => b.toString(16).padStart(2, '0')).join(''); }
function hexToBytes(hex) {
  const b = new Uint8Array(hex.length / 2);
  for (let i = 0; i < b.length; i++) b[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return b;
}
function bytesToBase64url(bytes) {
  let s = ''; for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return Buffer.from(s, 'binary').toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function sha256(data) { return createHash('sha256').update(data).digest(); }

function getNonce(addr) {
  return fetch(`${HIRO_API}/v2/accounts/${addr}?proof=0`).then(r => r.json()).then(d => parseInt(d.nonce));
}

async function broadcastTx(txObj) {
  const ser = txObj.serialize();
  const hex = (typeof ser === 'string') ? ser : Buffer.from(ser).toString('hex');
  const resp = await fetch(`${HIRO_API}/v2/transactions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tx: hex }),
  });
  const text = await resp.text();
  if (!resp.ok) fail('broadcast', `Hiro ${resp.status}: ${text.substring(0, 300)}`);
  let txid = text.replace(/["']/g, '').trim();
  if (!txid.startsWith('0x')) txid = `0x${txid}`;
  return txid;
}

async function waitForTx(txid, maxWait = 90) {
  for (let i = 0; i < maxWait; i++) {
    await new Promise(r => setTimeout(r, 3000));
    try {
      const resp = await fetch(`${HIRO_API}/extended/v1/tx/${txid}`);
      if (resp.ok) {
        const tx = await resp.json();
        if (tx.tx_status === 'success') return tx;
        if (tx.tx_status?.includes('abort') || tx.tx_status === 'problem_processing')
          fail('wait', `TX failed: ${tx.tx_status} — ${tx.vm_error || 'unknown'}\n   txid: ${txid}`);
      }
    } catch {}
    if (i % 5 === 0) process.stdout.write('.');
  }
  fail('wait', `TX ${txid} timed out after ${maxWait * 3}s`);
}

// --- SIP-018 ---
function computeDomainHash(domain) {
  return sha256(hexToBytes(serializeCV(tupleCV({
    name: stringAsciiCV(domain.name), version: stringAsciiCV(domain.version),
    'chain-id': uintCV(domain.chainId), wallet: principalCV(domain.wallet),
  }))));
}
function computeMessageHash(msg) {
  return sha256(hexToBytes(serializeCV(tupleCV({
    topic: stringAsciiCV(msg.topic), 'auth-id': uintCV(msg['auth-id']),
    amount: uintCV(msg.amount), recipient: principalCV(msg.recipient), memo: noneCV(),
  }))));
}
function computeSIP018Challenge(domain, msg) {
  return sha256(Buffer.concat([Buffer.from('SIP018'), computeDomainHash(domain), computeMessageHash(msg)]));
}

function signChallenge(challenge, privKeyBytes) {
  const authenticatorData = new Uint8Array(37);
  authenticatorData.set(hexToBytes(CINEX_RP_ID_HASH), 0);
  authenticatorData[32] = 0x01;
  const challengeB64 = bytesToBase64url(challenge);
  const clientDataJSON = JSON.stringify({ type: 'webauthn.get', challenge: challengeB64, origin: 'https://cine-x-iota.vercel.app', crossOrigin: false });
  const idx = clientDataJSON.indexOf('"challenge":"') + '"challenge":"'.length;
  const prefix = clientDataJSON.substring(0, idx);
  const suffix = clientDataJSON.substring(idx + challengeB64.length);
  const clientDataHash = sha256(new TextEncoder().encode(clientDataJSON));
  const signedDigest = sha256(Buffer.concat([Buffer.from(authenticatorData), clientDataHash]));
  const sig = p256.sign(signedDigest, privKeyBytes, { lowS: true });
  return {
    signature: bufToHex(sig), authenticatorData: bufToHex(authenticatorData),
    clientDataPrefix: bufToHex(new TextEncoder().encode(prefix)),
    clientDataSuffix: bufToHex(new TextEncoder().encode(suffix)),
  };
}

async function main() {
  console.log('=== CineX Pillar — E2E Relay Test (Full Flow) ===\n');

  // Step 1: Generate P-256 keypair
  log('1', 'Generating P-256 keypair...');
  const ownerPrivKey = p256.utils.randomSecretKey();
  const ownerPubKey = p256.getPublicKey(ownerPrivKey, true);
  const ownerPubKeyHex = bufToHex(ownerPubKey);
  ok('1', `Owner P-256 pubkey: ${ownerPubKeyHex.slice(0, 16)}...`);

  // Unique vault name per test run so we never collide
  const vaultSuffix = ownerPubKeyHex.slice(0, 8);
  const VAULT_CONTRACT = `cv-${vaultSuffix}`;
  const VAULT_ADDR = `${RELAY_ADDR}.${VAULT_CONTRACT}`;
  log('1', `Vault contract: ${VAULT_CONTRACT}`);

  let nonce = await getNonce(RELAY_ADDR);
  log('2', `Relay nonce: ${nonce}`);

  // Step 2a: Deploy clarity-webauthn if needed
  const waCheck = await fetch(`${HIRO_API}/extended/v1/contract/${RELAY_ADDR}.clarity-webauthn`);
  if (waCheck.ok) {
    ok('2a', 'clarity-webauthn already deployed');
  } else {
    log('2a', 'Deploying clarity-webauthn...');
    const src = fs.readFileSync(path.resolve('C:/Users/CineX-main/spike-pillar/contracts/clarity-webauthn.clar'), 'utf8');
    const txid = await broadcastTx(await makeContractDeploy({ contractName: 'clarity-webauthn', codeBody: src, senderKey: RELAY_KEY, network: NETWORK, fee: 50000, nonce, clarityVersion: 4 }));
    ok('2a', `Deploy TX: ${txid}`);
    await waitForTx(txid);
    ok('2a', 'clarity-webauthn deployed!');
    nonce++;
  }

  // Step 2b: Deploy fresh vault
  log('2b', `Deploying vault ${VAULT_CONTRACT}...`);
  const vaultSrc = fs.readFileSync(path.resolve('C:/Users/CineX-main/spike-pillar/contracts/cinex-smart-vault.clar'), 'utf8')
    .replace(/'ST29JKDEFRY0RYMGF97FZC9PZWJ4H4VBSQFFERNXX/g, `'${RELAY_ADDR}`);
  const deployTxid = await broadcastTx(await makeContractDeploy({
    contractName: VAULT_CONTRACT, codeBody: vaultSrc, senderKey: RELAY_KEY,
    network: NETWORK, fee: 50000, nonce, clarityVersion: 4,
  }));
  ok('2b', `Deploy TX: ${deployTxid}`);
  await waitForTx(deployTxid);
  ok('2b', 'Vault deployed!');
  nonce++;

  // Step 3: Onboard vault with P-256 key
  log('3', 'Onboarding vault with P-256 key...');
  const onboardTxid = await broadcastTx(await makeContractCall({
    contractAddress: RELAY_ADDR, contractName: VAULT_CONTRACT,
    functionName: 'onboard',
    functionArgs: [bufferCV(ownerPubKey), standardPrincipalCV(RELAY_ADDR)],
    senderKey: RELAY_KEY, nonce, network: NETWORK, fee: 10000,
    postConditionMode: PostConditionMode.Allow, clarityVersion: 4,
  }));
  ok('3', `Onboard TX: ${onboardTxid}`);
  await waitForTx(onboardTxid);
  ok('3', 'Vault onboarded with P-256 key!');
  nonce++;

  // Step 4: SIP-018 challenge + P-256 sign
  log('4', 'Computing SIP-018 challenge...');
  const authId = 1, amountMicrostx = 1_000_000, recipient = BACKER_ADDRESS;
  const domain = { name: 'cinex-smart-vault', version: '1.0.0', chainId: 2143456, wallet: VAULT_ADDR };
  const challenge = computeSIP018Challenge(domain, { topic: 'stx-transfer', 'auth-id': authId, amount: amountMicrostx, recipient, memo: null });
  ok('4', `Challenge: ${bufToHex(challenge).slice(0, 16)}...`);

  log('4', 'Signing with P-256...');
  const signed = signChallenge(challenge, ownerPrivKey);
  ok('4', `Signature: ${signed.signature.slice(0, 16)}...`);

  const clientDataJSON = JSON.stringify({ type: 'webauthn.get', challenge: bytesToBase64url(challenge), origin: 'https://cine-x-iota.vercel.app', crossOrigin: false });
  const localVerify = p256.verify(
    hexToBytes(signed.signature),
    sha256(Buffer.concat([hexToBytes(signed.authenticatorData), sha256(new TextEncoder().encode(clientDataJSON))])),
    ownerPubKey,
  );
  ok('4', `Local P-256 verify: ${localVerify ? 'PASS' : 'FAIL'}`);
  if (!localVerify) fail('4', 'Local P-256 verification failed!');

  // Step 5: Send to relay backend
  log('5', 'Sending to relay backend...');
  const body = {
    recipient, amount: amountMicrostx, authId, pubkey: ownerPubKeyHex,
    signature: signed.signature, authenticatorData: signed.authenticatorData,
    clientDataPrefix: signed.clientDataPrefix, clientDataSuffix: signed.clientDataSuffix,
    domainName: domain.name, domainVersion: domain.version,
    domainChainId: domain.chainId, domainWallet: domain.wallet,
    vaultAddress: RELAY_ADDR, vaultName: VAULT_CONTRACT,
  };

  const relayResp = await fetch(`${BACKEND_URL}/api/passkey/transfer`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Relay-User-Address': VAULT_ADDR,
      'X-Idempotency-Key': crypto.randomUUID(),
    },
    body: JSON.stringify(body),
  });

  const relayText = await relayResp.text();
  console.log(`\n[5] Relay response (${relayResp.status}):`);
  console.log(relayText);
  if (!relayResp.ok) fail('5', `Relay returned ${relayResp.status}`);

  const result = JSON.parse(relayText);
  if (!result.txid) fail('5', 'No txid in response');
  ok('5', `TX broadcast! txid: ${result.txid}`);
  console.log(`\nExplorer: https://explorer.hiro.so/txid/${result.txid}?chain=testnet`);

  // Step 6: Wait for confirmation
  log('6', 'Waiting for on-chain confirmation...');
  const txData = await waitForTx(result.txid);
  ok('6', `Confirmed in block ${txData.block_height}!`);

  console.log('\n=== E2E RELAY TEST COMPLETE ===');
  console.log('  P-256 keypair generated: ✓');
  console.log('  Vault deployed + onboarded: ✓');
  console.log('  SIP-018 challenge computed: ✓');
  console.log('  P-256 signed (local verify): ✓');
  console.log('  Relay backend broadcast: ✓');
  console.log('  On-chain confirmation: ✓');
}

main().catch(e => { fail('FATAL', e.message); });
