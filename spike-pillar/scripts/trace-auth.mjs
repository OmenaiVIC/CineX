import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pkg = require('@stacks/transactions');
const { StacksTestnet } = require('@stacks/network');

async function main() {
  const KEY = '3803e0e804a68c4eb2861129a158b46459182122be273b04090e23764b86980f';
  const ADDR = 'ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG';
  const network = new StacksTestnet();

  // Get fresh nonce
  const acctRes = await fetch(`https://api.testnet.hiro.so/v2/accounts/${ADDR}?proof=0`);
  const acct = await acctRes.json();
  console.log('Balance:', acct.balance, 'nonce:', acct.nonce);

  const nonce = parseInt(acct.nonce);
  console.log('Using nonce:', nonce);

  const tx = await pkg.makeContractDeploy({
    contractName: 'cinex-smart-vault',
    codeBody: '(define-public (hello) (ok "world"))',
    senderKey: KEY,
    network,
    fee: 10000,
    nonce,
    clarityVersion: 4,
  });

  const ser = tx.serialize();
  const hex = Buffer.from(ser).toString('hex');

  // Parse the serialized tx format: [version:1][chain_id:4][auth:var][anchorMode:1][postConditionMode:1][postConditions:var][payload:var]
  console.log('\n=== TX format breakdown ===');
  console.log('version (byte 0):', '0x' + hex.slice(0, 2), parseInt(hex.slice(0, 2), 16) === 0x80 ? '(testnet ✓)' : '(WRONG!)');
  console.log('chain_id (bytes 1-4):', '0x' + hex.slice(2, 10), parseInt(hex.slice(2, 10), 16) === 0x80000000 ? '(testnet ✓)' : '');
  
  // Auth starts at byte 5
  const authStart = 10; // 5 bytes * 2 hex chars each
  console.log('auth flag (byte 5):', '0x' + hex.slice(authStart, authStart + 2));
  const authFlag = parseInt(hex.slice(authStart, authStart + 2), 16);
  if (authFlag === 0x04) console.log('  → Standard auth ✓');
  else if (authFlag === 0x80) console.log('  → Sponsored auth ✗');
  else console.log('  → Unknown flag');

  // Spending condition starts at byte 6
  const scStart = authStart + 2;
  console.log('hashMode (byte 6):', '0x' + hex.slice(scStart, scStart + 2));
  console.log('signer (bytes 7-26):', hex.slice(scStart + 2, scStart + 42));
  
  // Check signer matches our address
  const pubkey = pkg.pubKeyfromPrivKey(KEY);
  const derivedAddr = pkg.getAddressFromPublicKey(pubkey.data, pkg.TransactionVersion.Testnet);
  const derivedHash160 = pkg.addressFromPublicKey(pubkey.data, pkg.TransactionVersion.Testnet).hash160;
  console.log('\n=== Address verification ===');
  console.log('Our address:', ADDR);
  console.log('Derived address:', derivedAddr);
  console.log('Our hash160:', ADDR.slice(3)); // remove "ST2C"
  console.log('Derived hash160:', derivedHash160);
  console.log('Tx signer:', hex.slice(scStart + 2, scStart + 42));
  console.log('Signer matches?', hex.slice(scStart + 2, scStart + 42) === derivedHash160);

  console.log('\n=== Broadcasting ===');
  const res = await fetch('https://api.testnet.hiro.so/v2/transactions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tx: hex }),
  });
  const body = await res.json();
  console.log('Status:', res.status);
  console.log('Response:', JSON.stringify(body));
}

main().catch(console.error);
