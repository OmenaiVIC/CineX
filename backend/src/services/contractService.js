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
  TransactionVersion,
} from '@stacks/transactions';
import { StacksTestnet } from '@stacks/network';

const API_URL = 'https://api.testnet.hiro.so';
const EXPLORER_URL = 'https://explorer.hiro.so/txid';
const DEPLOYER = 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM';

let _initialized = false;
let _wallets = null;
let _nonces = {};
let _network = null;

function init() {
  if (_initialized) return;
  const creatorKey = process.env.CREATOR_KEY;
  const backerKey = process.env.BACKER_KEY;
  if (!creatorKey || !backerKey) {
    console.warn('[contractService] CREATOR_KEY or BACKER_KEY not set');
    return;
  }
  _network = new StacksTestnet({ url: 'https://api.testnet.hiro.so' });
  _wallets = {
    creator: { privateKey: creatorKey, address: getAddressFromPrivateKey(creatorKey, TransactionVersion.Testnet) },
    backer: { privateKey: backerKey, address: getAddressFromPrivateKey(backerKey, TransactionVersion.Testnet) },
  };
  console.log(`[contractService] Creator: ${_wallets.creator.address}`);
  console.log(`[contractService] Backer:  ${_wallets.backer.address}`);
  _initialized = true;
}

function getNetwork() {
  return _network;
}

function getState() {
  return {
    initialized: _initialized,
    hasWallets: _wallets !== null && Object.keys(_wallets).length > 0,
    walletKeys: _wallets ? Object.keys(_wallets) : [],
    walletAddresses: _wallets ? {
      creator: _wallets.creator?.address || null,
      backer: _wallets.backer?.address || null,
    } : null,
    nonces: { ..._nonces },
  };
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
  for (const role of ['creator', 'backer']) {
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

// Diagnostic: test the broadcast path without a real contract call
async function testBroadcast() {
  const result = {};
  try {
    result.step1 = 'wallets check';
    result.hasWallets = (_wallets !== null && _wallets.backer !== undefined);
    if (!result.hasWallets) return { ...result, error: 'No wallets' };
    
    result.step2 = 'network check';
    result.hasNetwork = (_network !== null && _network.coreApiUrl !== undefined);
    if (!result.hasNetwork) return { ...result, error: 'No network' };
    
    result.step3 = 'nonce fetch';
    const address = _wallets.backer.address;
    const nonceResp = await fetch(`https://api.testnet.hiro.so/v2/accounts/${address}?proof=0`);
    const nonceData = await nonceResp.json();
    result.chainNonce = Number(nonceData.nonce);
    result.balance = nonceData.balance;
    
    result.step4 = 'make simple tx';
    const tx = await makeContractCall({
      contractAddress: DEPLOYER,
      contractName: 'milestone-escrow',
      functionName: 'get-campaign-balance',
      functionArgs: [uintCV(21)],
      senderKey: _wallets.backer.privateKey,
      network: _network,
      anchorMode: AnchorMode.Any,
      postConditionMode: PostConditionMode.Allow,
      fee: 10000,
      nonce: result.chainNonce,
    });
    result.txCreated = true;
    
    result.step5 = 'broadcast';
    const broadcastResp = await broadcastTransaction(tx, _network);
    result.broadcastResult = JSON.stringify(broadcastResp).substring(0, 300);
    
    return result;
  } catch (err) {
    return { ...result, error: (err && err.message) ? err.message : String(err), errorStack: (err && err.stack) ? err.stack.split('\n').slice(0,3).join('|') : '' };
  }
}

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
  getState,
  testBroadcast,
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
