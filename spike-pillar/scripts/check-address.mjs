import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pkg = require('@stacks/transactions');
const { StacksTestnet } = require('@stacks/network');

const KEY = '3803e0e804a68c4eb2861129a158b46459182122be273b04090e23764b86980f';
const network = new StacksTestnet();

// Method 1: getAddressFromPrivateKey
try {
  const addr1 = pkg.getAddressFromPrivateKey(KEY, pkg.TransactionVersion.Testnet);
  console.log('getAddressFromPrivateKey:', addr1);
  const acct1 = await fetch(`https://api.testnet.hiro.so/v2/accounts/${addr1}?proof=0`);
  const d1 = await acct1.json();
  console.log('  balance:', d1.balance, 'nonce:', d1.nonce);
} catch(e) { console.log('getAddressFromPrivateKey failed:', e.message); }

// Method 2: getAddressFromPublicKey
try {
  const pub = pkg.pubKeyfromPrivKey(KEY);
  console.log('\npubKeyfromPrivKey:', pub.data?.slice(0, 20) + '...');
  console.log('pub key type:', pub.type);
  
  const addr2 = pkg.getAddressFromPublicKey(pub.data, pkg.TransactionVersion.Testnet);
  console.log('getAddressFromPublicKey:', addr2);
  const acct2 = await fetch(`https://api.testnet.hiro.so/v2/accounts/${addr2}?proof=0`);
  const d2 = await acct2.json();
  console.log('  balance:', d2.balance, 'nonce:', d2.nonce);
} catch(e) { console.log('getAddressFromPublicKey failed:', e.message); }

// Method 3: addressFromPublicKey  
try {
  const pub = pkg.pubKeyfromPrivKey(KEY);
  const addr3obj = pkg.addressFromPublicKey(pub.data, pkg.TransactionVersion.Testnet);
  console.log('\naddressFromPublicKey hash160:', addr3obj.hash160);
  console.log('addressFromPublicKey version:', addr3obj.version);
  console.log('addressFromPublicKey stacksAddress:', addr3obj.stacksAddress);
  
  const acct3 = await fetch(`https://api.testnet.hiro.so/v2/accounts/${addr3obj.stacksAddress}?proof=0`);
  const d3 = await acct3.json();
  console.log('  balance:', d3.balance, 'nonce:', d3.nonce);
} catch(e) { console.log('addressFromPublicKey failed:', e.message); }

// Check what the makeContractDeploy tx signer is
const tx = await pkg.makeContractDeploy({
  contractName: 'test',
  codeBody: '(define-public (test) (ok true))',
  senderKey: KEY,
  network,
  fee: 10000,
  nonce: 0,
  clarityVersion: 4,
});
console.log('\ntx.auth.spendingCondition.signer:', tx.auth.spendingCondition.signer);
console.log('tx auth flag:', Buffer.from(tx.serialize()).toString('hex').slice(10, 12));

// Now check all three addresses' hash160s
const pub2 = pkg.pubKeyfromPrivKey(KEY);
const pubkeyObj = pkg.createStacksPublicKey(pub2.data);
console.log('\npubkeyObj compressed:', pkg.isCompressed(pubkeyObj));
