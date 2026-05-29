import { createHash } from 'crypto';
import { getAddressFromPrivateKey, TransactionVersion } from '@stacks/transactions';

// Generate a random 32-byte private key
const key = createHash('sha256').update(Math.random().toString() + Date.now().toString() + Math.random().toString()).digest();
const privateKey = key.toString('hex');
const address = getAddressFromPrivateKey(privateKey, TransactionVersion.Testnet);

console.log('Private key: ' + privateKey);
console.log('Address:     ' + address);
