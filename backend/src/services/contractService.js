import {
  makeContractCall,
  broadcastTransaction,
  AnchorMode,
  PostConditionMode,
  contractPrincipalCV,
  standardPrincipalCV,
  uintCV,
  bufferCV,
  cvToHex,
  getAddressFromPrivateKey,
} from '@stacks/transactions';
import { StacksTestnet } from '@stacks/network';
import { mnemonicToSeed } from 'bip39';
import { HDKey } from '@scure/bip32';

const API_URL = 'https://api.testnet.hiro.so';
const EXPLORER_URL = 'https://explorer.hiro.so/txid';
const DEPLOYER = 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM';
const STX_DERIVATION_PATH = "m/44'/5757'/0'/0";

let _initialized = false;
let _wallets = null;
let _nonces = {};
let _network = null;

async function deriveKey(mnemonic, index) {
  const seed = await mnemonicToSeed(mnemonic);
  const root = HDKey.fromMasterSeed(new Uint8Array(seed));
  const child = root.derive(STX_DERIVATION_PATH).deriveChild(index);
  const pkBytes = child.privateKey;
  const privateKey = pkBytes.length === 33
    ? Buffer.from(pkBytes).toString('hex')
    : Buffer.from(pkBytes).toString('hex') + '01';
  const address = getAddressFromPrivateKey(privateKey, 'testnet');
  return { privateKey, address };
}

async function init(mnemonic) {
  if (_initialized) return;
  _network = new StacksTestnet({ url: 'https://api.testnet.hiro.so' });
  const [acct0, acct1, acct3] = await Promise.all([
    deriveKey(mnemonic, 0),
    deriveKey(mnemonic, 1),
    deriveKey(mnemonic, 3),
  ]);
  _wallets = {
    creator: acct1,
    backer: acct3,
    deployer: acct0,
  };
  console.log(`[contractService] Creator: ${_wallets.creator.address}`);
  console.log(`[contractService] Backer:  ${_wallets.backer.address}`);
  _initialized = true;
}

function getNetwork() {
  return _network;
}

async function ensureNonce(address) {
  const resp = await fetch(`${API_URL}/v2/accounts/${address}?proof=0`, {
    headers: { Accept: 'application/json' },
  });
  const data = await resp.json();
  const chainNonce = Number(data.nonce);
  if (!(address in _nonces) || chainNonce > _nonces[address]) {
    _nonces[address] = chainNonce;
  }
  return _nonces[address];
}

function advanceNonce(address) {
  _nonces[address] = (_nonces[address] || 0) + 1;
}

function findWalletByKey(privateKey) {
  if (!_wallets) return null;
  for (const role of ['creator', 'backer', 'deployer']) {
    if (_wallets[role].privateKey === privateKey) return _wallets[role];
  }
  return null;
}

async function callContract(privateKey, contractName, functionName, functionArgs) {
  const account = findWalletByKey(privateKey);
  if (!account) throw new Error('Unknown private key');
  const nonce = await ensureNonce(account.address);
  const tx = await makeContractCall({
    contractAddress: DEPLOYER,
    contractName,
    functionName,
    functionArgs,
    senderKey: privateKey,
    network: _network,
    anchorMode: AnchorMode.Any,
    postConditionMode: PostConditionMode.Allow,
    fee: 10000,
    nonce,
  });
  const result = await broadcastTransaction(tx, _network);
  advanceNonce(account.address);
  return `0x${result.txid}`;
}

async function readOnlyCall(contractName, functionName, functionArgs) {
  const resp = await fetch(
    `${API_URL}/v2/contracts/call-read/${DEPLOYER}/${contractName}/${functionName}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sender: DEPLOYER,
        arguments: functionArgs.map(cvToHex),
      }),
    }
  );
  return resp.json();
}

async function getTxStatus(txHash) {
  const resp = await fetch(`${API_URL}/extended/v1/tx/${txHash}`, {
    headers: { Accept: 'application/json' },
  });
  if (!resp.ok) return { status: 'pending', tx_hash: txHash };
  const data = await resp.json();
  if (data.tx_status === 'success') {
    return {
      status: 'confirmed',
      tx_hash: txHash,
      block_height: data.block_height,
      explorer_url: `${EXPLORER_URL}/${txHash}?chain=testnet`,
    };
  }
  if (data.tx_status === 'pending' || data.tx_status === 'queued') {
    return { status: 'pending', tx_hash: txHash };
  }
  return {
    status: 'failed',
    tx_hash: txHash,
    error: data.tx_result?.repr || data.tx_status,
  };
}

// ─── Demo Actions ─────────────────────────────────────────────────────────

async function contribute(campaignId, amountUstx) {
  const pk = _wallets.backer.privateKey;
  const txHash = await callContract(pk, 'campaign-module-2', 'contribute-to-campaign', [
    uintCV(campaignId),
    uintCV(amountUstx),
    contractPrincipalCV(DEPLOYER, 'milestone-escrow'),
    contractPrincipalCV(DEPLOYER, 'project-verification-module'),
  ]);
  return {
    tx_hash: txHash,
    explorer_url: `${EXPLORER_URL}/${txHash}?chain=testnet`,
  };
}

async function submitProof(campaignId, milestoneIndex) {
  const pk = _wallets.creator.privateKey;
  const proofHash = Buffer.from(`milestone-${campaignId}-${milestoneIndex}`);
  const txHash = await callContract(pk, 'milestone-escrow', 'submit-milestone-proof', [
    uintCV(campaignId),
    uintCV(milestoneIndex),
    bufferCV(proofHash),
  ]);
  return {
    tx_hash: txHash,
    explorer_url: `${EXPLORER_URL}/${txHash}?chain=testnet`,
  };
}

async function approve(campaignId, milestoneIndex) {
  const pk = _wallets.backer.privateKey;
  const txHash = await callContract(pk, 'milestone-escrow', 'approve-milestone', [
    uintCV(campaignId),
    uintCV(milestoneIndex),
  ]);
  return {
    tx_hash: txHash,
    explorer_url: `${EXPLORER_URL}/${txHash}?chain=testnet`,
  };
}

async function release(campaignId, milestoneIndex) {
  const pk = _wallets.backer.privateKey;
  const txHash = await callContract(pk, 'milestone-escrow', 'release-milestone-funds', [
    uintCV(campaignId),
    uintCV(milestoneIndex),
  ]);
  return {
    tx_hash: txHash,
    explorer_url: `${EXPLORER_URL}/${txHash}?chain=testnet`,
  };
}

// ─── Read State ───────────────────────────────────────────────────────────

async function getEscrowCampaign(campaignId) {
  return readOnlyCall('milestone-escrow', 'get-campaign', [uintCV(campaignId)]);
}

async function getCampaignModuleCampaign(campaignId) {
  return readOnlyCall('campaign-module-2', 'get-campaign', [uintCV(campaignId)]);
}

async function getEscrowBalance(campaignId) {
  const data = await readOnlyCall('milestone-escrow', 'get-campaign-balance', [uintCV(campaignId)]);
  if (data.okay && data.result) {
    const hex = data.result.replace('0x', '');
    const bytes = Buffer.from(hex, 'hex');
    if (bytes.length >= 18) {
      return Number(bytes.readBigUInt64BE(bytes.length - 8));
    }
    return Number(bytes.readBigUInt64BE(1));
  }
  return 0;
}

async function getMilestoneState(campaignId, milestoneIndex) {
  return readOnlyCall('milestone-escrow', 'get-milestone-state', [
    uintCV(campaignId),
    uintCV(milestoneIndex),
  ]);
}

async function getTotalRaised(campaignId) {
  const data = await readOnlyCall('campaign-module-2', 'get-total-raised-funds', [uintCV(campaignId)]);
  if (data.okay && data.result) {
    const hex = data.result.replace('0x', '');
    const bytes = Buffer.from(hex, 'hex');
    if (bytes.length >= 18) {
      return Number(bytes.readBigUInt64BE(bytes.length - 8));
    }
    return Number(bytes.readBigUInt64BE(1));
  }
  return 0;
}

export default {
  init,
  getNetwork,
  contribute,
  submitProof,
  approve,
  release,
  getTxStatus,
  getEscrowCampaign,
  getCampaignModuleCampaign,
  getEscrowBalance,
  getMilestoneState,
  getTotalRaised,
};
