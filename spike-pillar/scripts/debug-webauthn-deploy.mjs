import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pkg = require('@stacks/transactions');
const { StacksTestnet } = require('@stacks/network');
const fs = require('fs');
const path = require('path');

const KEY = '3803e0e804a68c4eb2861129a158b46459182122be273b04090e23764b86980f';
const network = new StacksTestnet();
const addr = pkg.getAddressFromPrivateKey(KEY, pkg.TransactionVersion.Testnet);

const acctRes = await fetch(`https://api.testnet.hiro.so/v2/accounts/${addr}?proof=0`);
const acct = await acctRes.json();
console.log('Address:', addr, 'nonce:', acct.nonce, 'balance:', acct.balance);

const source = fs.readFileSync(path.resolve('contracts/clarity-webauthn.clar'), 'utf8');
console.log('Source length:', source.length);

const tx = await pkg.makeContractDeploy({
  contractName: 'clarity-webauthn',
  codeBody: source,
  senderKey: KEY,
  network,
  fee: 10000,
  nonce: parseInt(acct.nonce),
  clarityVersion: 4,
});

const hex = Buffer.from(tx.serialize()).toString('hex');
console.log('Auth flag:', '0x' + hex.slice(10, 12));
console.log('Clarity version byte:', parseInt(hex.slice(hex.length - 4), 16)); // check last payload bytes

// Analyze serialized tx structure
const version = parseInt(hex.slice(0, 2), 16);
const chainId = parseInt(hex.slice(2, 10), 16);
console.log('Version:', '0x' + hex.slice(0, 2), version === 0x80 ? 'testnet' : 'mainnet');
console.log('Chain ID:', '0x' + hex.slice(2, 10), chainId === 0x80000000 ? 'testnet' : '');

// Auth section
const authFlag = parseInt(hex.slice(10, 12), 16);
console.log('Auth flag:', '0x' + hex.slice(10, 12), authFlag === 0x04 ? 'Standard' : authFlag === 0x80 ? 'Sponsored' : 'Unknown');

console.log('Total tx hex length:', hex.length, 'bytes:', hex.length / 2);

// Now try broadcast and capture FULL error
console.log('\nBroadcasting...');
const res = await fetch('https://api.testnet.hiro.so/v2/transactions', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ tx: hex }),
});
const text = await res.text();
console.log('Status:', res.status);
console.log('Response:', text);
