import {
  makeContractCall,
  makeContractDeploy,
  AnchorMode,
  PostConditionMode,
  contractPrincipalCV,
  standardPrincipalCV,
  uintCV,
  bufferCV,
  cvToHex,
  getAddressFromPrivateKey,
  TransactionVersion,
  stringAsciiCV,
  listCV,
  someCV,
  noneCV,
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
  console.log(`[contractService] Creator wallet initialized`);
  console.log(`[contractService] Backer wallet initialized`);
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
  let resp;
  try {
    resp = await fetch(`${API_URL}/v2/accounts/${address}?proof=0`, {
      headers: { Accept: 'application/json' },
    });
  } catch (e) {
    console.warn('[contractService] nonce fetch network error:', e.message);
    if (_nonces[address] !== undefined) return _nonces[address];
    throw new Error(`Nonce fetch network error: ${e.message}`);
  }
  const text = await resp.text();
  let data;
  try { data = JSON.parse(text); } catch (e) {
    console.warn('[contractService] nonce fetch non-JSON:', text.substring(0, 200));
    if (_nonces[address] !== undefined) return _nonces[address];
    throw new Error(`Nonce fetch returned non-JSON (HTTP ${resp.status}): ${text.substring(0, 80)}`);
  }
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
  let tx;
  try {
    tx = await makeContractCall({
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
  } catch (e) {
    throw new Error(`makeContractCall failed: ${e.message}`);
  }

  // Custom broadcast with robust error handling (bypass @stacks/transactions broadcastTransaction)
  const serializedTx = tx.serialize().toString('hex');
  const broadcastUrl = `${_network.coreApiUrl}/v2/transactions`;
  let broadcastResp;
  try {
    console.error(`[callContract] POST ${broadcastUrl} (nonce=${nonce}, ${serializedTx.length} hex chars)`);
    broadcastResp = await fetch(broadcastUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/octet-stream' },
      body: serializedTx,
    });
    console.error(`[callContract] response status=${broadcastResp.status}`);
  } catch (e) {
    console.error(`[callContract] network error:`, e.message);
    throw new Error(`broadcast network error: ${e.message}`);
  }

  const responseText = await broadcastResp.text();
  console.error(`[callContract] response body (first 300): ${responseText.substring(0, 300)}`);

  if (!broadcastResp.ok) {
    const snippet = responseText.substring(0, 200);
    throw new Error(`Hiro API ${broadcastResp.status}: ${snippet}`);
  }

  let result;
  try {
    result = JSON.parse(responseText);
  } catch (e) {
    console.error(`[callContract] JSON parse error: ${e.message}; body: ${responseText.substring(0, 200)}`);
    // response was not JSON — might be plain txid or HTML
    if (/^[0-9a-f]{64}$/i.test(responseText.trim())) {
      result = { txid: responseText.trim() };
    } else {
      throw new Error(`broadcast non-JSON response: ${responseText.substring(0, 200)}`);
    }
  }

  advanceNonce(account.address);
  if (result.error) {
    throw new Error(`transaction rejected: ${result.reason || result.error}`);
  }
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
  if (!resp.ok) throw new Error(`Hiro API ${resp.status} for ${contractName}.${functionName}`);
  const text = await resp.text();
  try { return JSON.parse(text); } catch (e) {
    throw new Error(`Hiro API non-JSON response for ${contractName}.${functionName}: ${text.substring(0,100)}`);
  }
}

async function getTxStatus(txHash) {
  const resp = await fetch(`${API_URL}/extended/v1/tx/${txHash}`, {
    headers: { Accept: 'application/json' },
  });
  if (!resp.ok) return { status: 'pending', tx_hash: txHash };
  const text = await resp.text();
  let data;
  try { data = JSON.parse(text); } catch (e) {
    return { status: 'pending', tx_hash: txHash };
  }
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
  if (!_wallets?.backer) throw new Error('Wallet not initialized (check CREATOR_KEY/BACKER_KEY)');
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

async function createCampaignInEscrow(projectId, asset, totalGoal, milestones, deadline) {
  if (!_wallets?.creator) throw new Error('CREATOR_KEY not configured');
  const pk = _wallets.creator.privateKey;
  const msCVs = milestones.map(ms => ({
    name: stringAsciiCV(ms.name.slice(0, 64)),
    amount: uintCV(ms.amount),
  }));
  const txHash = await callContract(pk, 'milestone-escrow', 'create-campaign', [
    uintCV(projectId),
    contractPrincipalCV(asset === 'STX' ? 'SP000000000000000000002Q6VF78' : asset),
    uintCV(totalGoal),
    listCV(msCVs),
    uintCV(deadline),
  ]);
  return { tx_hash: txHash, explorer_url: `${EXPLORER_URL}/${txHash}?chain=testnet` };
}

async function createCampaignInModule(description, fundingGoal, duration, rewardTiers, rewardDescription) {
  if (!_wallets?.creator) throw new Error('CREATOR_KEY not configured');
  const pk = _wallets.creator.privateKey;
  const txHash = await callContract(pk, 'campaign-module-2', 'create-campaign', [
    stringAsciiCV(description.slice(0, 500)),
    uintCV(0),
    uintCV(fundingGoal),
    uintCV(duration),
    uintCV(rewardTiers || 1),
    stringAsciiCV((rewardDescription || '').slice(0, 150)),
    contractPrincipalCV(DEPLOYER, 'project-verification-module'),
  ]);
  return { tx_hash: txHash, explorer_url: `${EXPLORER_URL}/${txHash}?chain=testnet` };
}

async function depositToEscrow(campaignId, amountUstx) {
  if (!_wallets?.backer) throw new Error('BACKER_KEY not configured');
  const pk = _wallets.backer.privateKey;
  const txHash = await callContract(pk, 'milestone-escrow', 'deposit', [
    uintCV(campaignId),
    uintCV(amountUstx),
  ]);
  return { tx_hash: txHash, explorer_url: `${EXPLORER_URL}/${txHash}?chain=testnet` };
}

async function rateUser(targetAddress, campaignId, rating, commentHash) {
  if (!_wallets?.backer) throw new Error('BACKER_KEY not configured');
  const pk = _wallets.backer.privateKey;
  const raterAddr = _wallets.backer.address;
  const commentHashCV = commentHash
    ? someCV(bufferCV(Buffer.from(commentHash.slice(0, 32), 'utf-8')))
    : noneCV();
  const txHash = await callContract(pk, 'reputation', 'rate-user', [
    standardPrincipalCV(raterAddr),
    standardPrincipalCV(targetAddress),
    uintCV(campaignId),
    uintCV(Math.min(5, Math.max(1, rating))),
    commentHashCV,
  ]);
  return { tx_hash: txHash, explorer_url: `${EXPLORER_URL}/${txHash}?chain=testnet` };
}

async function getAverageRating(targetAddress) {
  return await readOnlyCall('reputation', 'get-average-rating', [standardPrincipalCV(targetAddress)]);
}

async function addPortfolio(projectName, projectUrl, projectDescription, completionYear) {
  if (!_wallets?.creator) throw new Error('CREATOR_KEY not configured');
  const pk = _wallets.creator.privateKey;
  const creatorAddr = _wallets.creator.address;
  const txHash = await callContract(pk, 'project-verification-module', 'add-portfolio', [
    standardPrincipalCV(creatorAddr),
    stringAsciiCV(projectName.slice(0, 100)),
    stringAsciiCV(projectUrl.slice(0, 255)),
    stringAsciiCV(projectDescription.slice(0, 500)),
    uintCV(completionYear || 0),
  ]);
  return { tx_hash: txHash, explorer_url: `${EXPLORER_URL}/${txHash}?chain=testnet` };
}

async function getPortfolio(creatorAddress, portfolioId) {
  return await readOnlyCall('project-verification-module', 'get-portfolio', [
    standardPrincipalCV(creatorAddress),
    uintCV(portfolioId),
  ]);
}

async function getCampaignFromEscrow(campaignId) {
  return await readOnlyCall('milestone-escrow', 'get-campaign', [uintCV(campaignId)]);
}

async function getCampaignFromModule(campaignId) {
  return await readOnlyCall('campaign-module-2', 'get-campaign', [uintCV(campaignId)]);
}

async function createMilestones(campaignId, deadlines) {
  if (!_wallets?.creator) throw new Error('CREATOR_KEY not configured');
  const pk = _wallets.creator.privateKey;
  const txHash = await callContract(pk, 'milestone-verification', 'create-milestones', [
    uintCV(campaignId),
    listCV((deadlines || [100, 200, 300]).map(d => uintCV(d))),
  ]);
  return { tx_hash: txHash, explorer_url: `${EXPLORER_URL}/${txHash}?chain=testnet` };
}

async function submitMilestone(campaignId, milestoneIndex) {
  if (!_wallets?.creator) throw new Error('CREATOR_KEY not configured');
  const pk = _wallets.creator.privateKey;
  const txHash = await callContract(pk, 'milestone-verification', 'submit-milestone', [
    uintCV(campaignId),
    uintCV(milestoneIndex),
  ]);
  return { tx_hash: txHash, explorer_url: `${EXPLORER_URL}/${txHash}?chain=testnet` };
}

async function endorseMilestone(campaignId, milestoneIndex, vote) {
  if (!_wallets?.backer) throw new Error('BACKER_KEY not configured');
  const pk = _wallets.backer.privateKey;
  const txHash = await callContract(pk, 'milestone-verification', 'endorse-milestone', [
    uintCV(campaignId),
    uintCV(milestoneIndex),
    vote,
  ]);
  return { tx_hash: txHash, explorer_url: `${EXPLORER_URL}/${txHash}?chain=testnet` };
}

async function finalizeMilestone(campaignId, milestoneIndex) {
  if (!_wallets?.backer) throw new Error('BACKER_KEY not configured');
  const pk = _wallets.backer.privateKey;
  const txHash = await callContract(pk, 'milestone-verification', 'finalize-milestone', [
    uintCV(campaignId),
    uintCV(milestoneIndex),
  ]);
  return { tx_hash: txHash, explorer_url: `${EXPLORER_URL}/${txHash}?chain=testnet` };
}

async function emergencyVerifyCreator(creatorAddress, expirationBlock) {
  const pk = _wallets?.creator?.privateKey;
  if (!pk) throw new Error('CREATOR_KEY not configured');
  const txHash = await callContract(pk, 'project-verification-module', 'emergency-verify-creator', [
    standardPrincipalCV(creatorAddress),
    uintCV(expirationBlock),
  ]);
  return {
    tx_hash: txHash,
    explorer_url: `${EXPLORER_URL}/${txHash}?chain=testnet`,
  };
}

async function proxyRegisterCreator(creatorAddress, fullName, profileUrl, projectVertical, verificationLevel) {
  if (!_wallets?.creator) throw new Error('CREATOR_KEY not configured');
  const pk = _wallets.creator.privateKey;
  const identityHash = Buffer.from(creatorAddress.slice(0, 32), 'utf-8');
  const expiration = Math.floor(Date.now() / 1000) + 52560 * 2; // ~2 years
  const txHash = await callContract(pk, 'project-verification-module-v2', 'proxy-register-creator', [
    standardPrincipalCV(creatorAddress),
    stringAsciiCV(fullName.slice(0, 100)),
    stringAsciiCV((profileUrl || '').slice(0, 255)),
    bufferCV(identityHash),
    stringAsciiCV(projectVertical || 'film'),
    uintCV(verificationLevel || 1),
    uintCV(expiration),
  ]);
  return {
    tx_hash: txHash,
    explorer_url: `${EXPLORER_URL}/${txHash}?chain=testnet`,
  };
}

async function getCampaignContributions(campaignId, contributor) {
  return await readOnlyCall('campaign-module-2', 'get-campaign-contributions', [
    uintCV(campaignId),
    standardPrincipalCV(contributor),
  ]);
}

async function getYieldPool(campaignId) {
  return await readOnlyCall('yield-escrow', 'get-yield-pool', [uintCV(campaignId)]);
}

async function claimBackerYield(campaignId) {
  if (!_wallets?.backer) throw new Error('BACKER_KEY not configured');
  const pk = _wallets.backer.privateKey;
  const txHash = await callContract(pk, 'yield-escrow', 'claim-backer-yield', [uintCV(campaignId)]);
  return { tx_hash: txHash, explorer_url: `${EXPLORER_URL}/${txHash}?chain=testnet` };
}

async function claimCreatorBonus(campaignId) {
  if (!_wallets?.creator) throw new Error('CREATOR_KEY not configured');
  const pk = _wallets.creator.privateKey;
  const txHash = await callContract(pk, 'yield-escrow', 'claim-creator-bonus', [uintCV(campaignId)]);
  return { tx_hash: txHash, explorer_url: `${EXPLORER_URL}/${txHash}?chain=testnet` };
}

async function isCreatorCurrentlyVerified(creatorAddress) {
  // Check v2 first (proxy-registered users), fall back to v1
  try {
    const v2Data = await readOnlyCall('project-verification-module-v2', 'is-creator-currently-verified', [
      standardPrincipalCV(creatorAddress),
    ]);
    if (v2Data.okay && v2Data.result) return v2Data;
  } catch (_) { /* v2 may not exist yet */ }
  const data = await readOnlyCall('project-verification-module', 'is-creator-currently-verified', [
    standardPrincipalCV(creatorAddress),
  ]);
  return data;
}

async function getCreatorFundingCap(creatorAddress) {
  // Check v2 first, fall back to v1
  try {
    const v2Data = await readOnlyCall('project-verification-module-v2', 'get-verification-funding-cap', [
      standardPrincipalCV(creatorAddress),
    ]);
    if (v2Data.okay && v2Data.result) return v2Data;
  } catch (_) { /* v2 may not exist yet */ }
  const data = await readOnlyCall('project-verification-module', 'get-verification-funding-cap', [
    standardPrincipalCV(creatorAddress),
  ]);
  return data;
}

async function getCreatorIdentity(creatorAddress) {
  // Check v2 first, fall back to v1
  try {
    const v2Data = await readOnlyCall('project-verification-module-v2', 'get-creator-identity', [
      standardPrincipalCV(creatorAddress),
    ]);
    if (v2Data.okay && v2Data.result) return v2Data;
  } catch (_) { /* v2 may not exist yet */ }
  const data = await readOnlyCall('project-verification-module', 'get-creator-identity', [
    standardPrincipalCV(creatorAddress),
  ]);
  return data;
}

async function deployContract(privateKey, contractName, codeBody, clarityVersion = 1) {
  const account = findWalletByKey(privateKey);
  if (!account) throw new Error('Unknown private key');
  const nonce = await ensureNonce(account.address);

  const tx = await makeContractDeploy({
    contractName,
    codeBody,
    senderKey: privateKey,
    network: _network,
    anchorMode: AnchorMode.Any,
    postConditionMode: PostConditionMode.Allow,
    fee: 50000,
    nonce,
    clarityVersion,
  });

  const serializedTx = tx.serialize().toString('hex');
  const broadcastUrl = `${_network.coreApiUrl}/v2/transactions`;
  let broadcastResp;
  try {
    console.error(`[deployContract] POST ${broadcastUrl} (nonce=${nonce}, ${serializedTx.length} hex chars)`);
    broadcastResp = await fetch(broadcastUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/octet-stream' },
      body: serializedTx,
    });
  } catch (e) {
    throw new Error(`broadcast network error: ${e.message}`);
  }

  const responseText = await broadcastResp.text();
  console.error(`[deployContract] response status=${broadcastResp.status}, body (first 300): ${responseText.substring(0, 300)}`);

  if (!broadcastResp.ok) {
    const snippet = responseText.substring(0, 200);
    throw new Error(`Hiro API ${broadcastResp.status}: ${snippet}`);
  }

  let result;
  try {
    result = JSON.parse(responseText);
  } catch (e) {
    if (/^[0-9a-f]{64}$/i.test(responseText.trim())) {
      result = { txid: responseText.trim() };
    } else {
      throw new Error(`broadcast non-JSON response: ${responseText.substring(0, 200)}`);
    }
  }

  advanceNonce(account.address);
  if (result.error) {
    throw new Error(`transaction rejected: ${result.reason || result.error}`);
  }
  return {
    tx_hash: `0x${result.txid}`,
    explorer_url: `${EXPLORER_URL}/${result.txid}?chain=testnet`,
    contract_id: `${DEPLOYER}.${contractName}`,
  };
}

export default {
  init,
  getNetwork,
  getState,
  testBroadcast,
  deployContract,
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
  emergencyVerifyCreator,
  isCreatorCurrentlyVerified,
  getCreatorFundingCap,
  getCreatorIdentity,
  createCampaignInEscrow,
  createCampaignInModule,
  depositToEscrow,
  getCampaignFromEscrow,
  getCampaignFromModule,
  addPortfolio,
  getPortfolio,
  rateUser,
  getAverageRating,
  createMilestones,
  submitMilestone,
  endorseMilestone,
  finalizeMilestone,
  proxyRegisterCreator,
  getCampaignContributions,
  getYieldPool,
  claimBackerYield,
  claimCreatorBonus,
};
