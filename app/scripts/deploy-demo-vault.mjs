/**
 * Deploy a demo vault under relay address with a fixed P-256 key.
 * This vault is for the passkey-test.html browser demo.
 *
 * Usage: node app/scripts/deploy-demo-vault.mjs
 */

import { createHash } from 'crypto';
import { p256 } from '@noble/curves/nist.js';
import stacksTx from '@stacks/transactions';
import netPkg from '@stacks/network';
import fs from 'fs';
import path from 'path';

const {
  tupleCV, stringAsciiCV, uintCV, principalCV,
  noneCV, serializeCV, standardPrincipalCV, bufferCV,
  makeContractCall, makeContractDeploy,
  PostConditionMode,
} = stacksTx;
const { STACKS_TESTNET } = netPkg;

const HIRO_API = 'https://api.testnet.hiro.so';
const RELAY_KEY = process.env.RELAY_KEY;
const RELAY_ADDR = 'ST3CAYVEF4T5REN8DXXVD2RNVXDXVGQAG3RPX2SB4';
const NETWORK = STACKS_TESTNET;
const VAULT_CONTRACT = 'cinex-demo-vault';

// Fixed P-256 key for demo
const DEMO_PRIVKEY = 'bc2596b550289896cda49e32396cb3aff11ac8b39350aa23c9fa73e2598e1e87';
const DEMO_PRIVKEY_BYTES = hexToBytes(DEMO_PRIVKEY);
const DEMO_PUBKEY = p256.getPublicKey(DEMO_PRIVKEY_BYTES, true);
const DEMO_PUBKEY_HEX = bufToHex(DEMO_PUBKEY);

const log = (msg) => console.log(msg);
const ok = (msg) => console.log(`  ✓ ${msg}`);
const fail = (msg) => { console.error(`  ✗ ${msg}`); process.exit(1); };

function bufToHex(buf) { return Array.from(buf).map(b => b.toString(16).padStart(2, '0')).join(''); }
function hexToBytes(hex) {
  const b = new Uint8Array(hex.length / 2);
  for (let i = 0; i < b.length; i++) b[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return b;
}

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
  if (!resp.ok) fail(`Hiro ${resp.status}: ${text.substring(0, 300)}`);
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
          fail(`TX failed: ${tx.tx_status} — ${tx.vm_error || 'unknown'}`);
      }
    } catch {}
    if (i % 5 === 0) process.stdout.write('.');
  }
  fail(`TX ${txid} timed out`);
}

async function main() {
  console.log('=== Deploy Demo Vault ===\n');

  log(`Relay: ${RELAY_ADDR}`);
  log(`Demo P-256 pubkey: ${DEMO_PUBKEY_HEX}`);
  log(`Demo P-256 privkey: ${DEMO_PRIVKEY}`);
  log(`Vault contract: ${VAULT_CONTRACT}`);
  log('');

  let nonce = await getNonce(RELAY_ADDR);
  log(`Relay nonce: ${nonce}`);

  // Step 1: Deploy vault (if not exists)
  const check = await fetch(`${HIRO_API}/extended/v1/contract/${RELAY_ADDR}.${VAULT_CONTRACT}`);
  if (check.ok) {
    ok('Vault already deployed');
  } else {
    log('\nDeploying vault...');
    const src = fs.readFileSync(path.resolve('C:/Users/CineX-main/spike-pillar/contracts/cinex-smart-vault.clar'), 'utf8')
      .replace(/'ST29JKDEFRY0RYMGF97FZC9PZWJ4H4VBSQFFERNXX/g, `'${RELAY_ADDR}`);
    const txid = await broadcastTx(await makeContractDeploy({
      contractName: VAULT_CONTRACT, codeBody: src, senderKey: RELAY_KEY,
      network: NETWORK, fee: 50000, nonce, clarityVersion: 4,
    }));
    ok(`Deploy TX: ${txid}`);
    await waitForTx(txid);
    ok('Vault deployed!');
    nonce++;
  }

  // Step 2: Onboard with demo P-256 key
  const initResp = await fetch(`${HIRO_API}/v2/contracts/call-read/${RELAY_ADDR}/${VAULT_CONTRACT}/is-initialized`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sender: RELAY_ADDR, arguments: [] }),
  });
  const initData = await initResp.json();
  if (initData.result === '0x04') {
    ok('Vault already onboarded');
  } else {
    log('\nOnboarding vault...');
    nonce = await getNonce(RELAY_ADDR);
    const txid = await broadcastTx(await makeContractCall({
      contractAddress: RELAY_ADDR, contractName: VAULT_CONTRACT,
      functionName: 'onboard',
      functionArgs: [bufferCV(DEMO_PUBKEY), standardPrincipalCV(RELAY_ADDR)],
      senderKey: RELAY_KEY, nonce, network: NETWORK, fee: 10000,
      postConditionMode: PostConditionMode.Allow, clarityVersion: 4,
    }));
    ok(`Onboard TX: ${txid}`);
    await waitForTx(txid);
    ok('Vault onboarded with demo P-256 key!');
    nonce++;
  }

  log('\n=== DEMO VAULT READY ===');
  log(`  Vault principal: ${RELAY_ADDR}.${VAULT_CONTRACT}`);
  log(`  P-256 privkey (paste into test page localStorage): ${DEMO_PRIVKEY}`);
  log(`  P-256 pubkey: ${DEMO_PUBKEY_HEX}`);
}

main().catch(e => { fail(`FATAL: ${e.message}`); });
