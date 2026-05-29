import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  makeContractDeploy,
  broadcastTransaction,
  AnchorMode,
  PostConditionMode,
  ClarityVersion,
  getAddressFromPrivateKey,
  TransactionVersion,
} from '@stacks/transactions';
import { StacksTestnet } from '@stacks/network';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CREATOR_KEY = process.env.CREATOR_KEY;
if (!CREATOR_KEY) {
  console.error('ERROR: CREATOR_KEY env var not set');
  process.exit(1);
}

const DEPLOYER = getAddressFromPrivateKey(CREATOR_KEY, TransactionVersion.Testnet);
console.log(`Deployer address: ${DEPLOYER}`);

const CONTRACT_NAME = 'project-verification-module-v2';
const contractPath = path.resolve(__dirname, '..', '..', 'contracts', `${CONTRACT_NAME}.clar`);
if (!fs.existsSync(contractPath)) {
  console.error(`Contract not found: ${contractPath}`);
  process.exit(1);
}

const codeBody = fs.readFileSync(contractPath, 'utf-8');
console.log(`Contract body: ${codeBody.length} chars`);

const network = new StacksTestnet({ url: 'https://api.testnet.hiro.so' });

async function getNonce(address) {
  const resp = await fetch(`https://api.testnet.hiro.so/v2/accounts/${address}?proof=0`);
  const data = await resp.json();
  return Number(data.nonce);
}

async function deploy() {
  const nonce = await getNonce(DEPLOYER);
  console.log(`Nonce: ${nonce}`);

  const tx = await makeContractDeploy({
    contractName: CONTRACT_NAME,
    codeBody,
    senderKey: CREATOR_KEY,
    network,
    anchorMode: AnchorMode.Any,
    postConditionMode: PostConditionMode.Allow,
    fee: 50000,
    nonce,
    clarityVersion: ClarityVersion.Clarity2,
  });

  console.log('Broadcasting transaction...');
  const result = await broadcastTransaction(tx, network);

  if (result.error) {
    console.error(`Transaction rejected: ${result.error}`);
    process.exit(1);
  }

  const txid = `0x${result.txid}`;
  console.log(`\n✅ ${CONTRACT_NAME} deployed successfully!`);
  console.log(`   TxID:      ${txid}`);
  console.log(`   Contract:  ${DEPLOYER}.${CONTRACT_NAME}`);
  console.log(`   Explorer:  https://explorer.hiro.so/txid/${result.txid}?chain=testnet`);
}

deploy().catch(err => {
  console.error('Deploy script error:', err.message || err);
  process.exit(1);
});
