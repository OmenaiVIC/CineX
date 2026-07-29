import {
  makeContractCall,
  makeContractDeploy,
  broadcastTransaction,
  AnchorMode,
  PostConditionMode,
  ClarityVersion,
  contractPrincipalCV,
  standardPrincipalCV,
  uintCV,
  bufferCV,
  cvToHex,
  getAddressFromPrivateKey,
  TransactionVersion,
  stringAsciiCV,
  boolCV,
  listCV,
  someCV,
  noneCV,
} from '@stacks/transactions';
import { HIRO_API_URL, DEPLOYER_ADDRESS, V2_DEPLOYER_ADDRESS, EXPLORER_URL, USDCX_CONTRACT as CHAIN_USDCX, networkInstance, txVersion } from '../config/chain.js';

const API_URL = HIRO_API_URL;
const DEPLOYER = DEPLOYER_ADDRESS;
const V2_DEPLOYER = V2_DEPLOYER_ADDRESS;

let _initialized = false;
let _wallets = null;
let _nonces = {};
let _network = null;

function init() {
  if (_initialized) return;
  const creatorKey = process.env.CREATOR_KEY;
  const backerKey = process.env.BACKER_KEY;
  _network = networkInstance;
  _wallets = {};
  if (creatorKey) {
    try {
      _wallets.creator = { privateKey: creatorKey, address: getAddressFromPrivateKey(creatorKey, txVersion) };
      console.log(`[contractService] Creator wallet initialized: ${_wallets.creator.address}`);
    } catch (err) {
      console.warn(`[contractService] CREATOR_KEY invalid — skipping (${err.message})`);
    }
  }
  if (backerKey) {
    try {
      _wallets.backer = { privateKey: backerKey, address: getAddressFromPrivateKey(backerKey, txVersion) };
      console.log(`[contractService] Backer wallet initialized: ${_wallets.backer.address}`);
    } catch (err) {
      console.warn(`[contractService] BACKER_KEY invalid — skipping (${err.message})`);
    }
  }
  if (Object.keys(_wallets).length === 0) {
    console.warn('[contractService] No wallet keys set — all chain writes will fail');
    return;
  }
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
  // Always trust the chain nonce over our internal counter.
  // The chain is the single source of truth for the account's next valid nonce.
  _nonces[address] = chainNonce;
  return chainNonce;
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

async function callContract(privateKey, contractName, functionName, functionArgs, contractAddress = DEPLOYER) {
  const account = findWalletByKey(privateKey);
  if (!account) throw new Error('Unknown private key');
  const nonce = await ensureNonce(account.address);
  let tx;
  try {
    tx = await makeContractCall({
      contractAddress,
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

async function readOnlyCall(contractName, functionName, functionArgs, contractAddress = DEPLOYER) {
  const resp = await fetch(
    `${API_URL}/v2/contracts/call-read/${contractAddress}/${contractName}/${functionName}`,
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
      tx_status: 'success',
      block_height: data.block_height,
      explorer_url: `${EXPLORER_URL}/${txHash}?chain=testnet`,
    };
  }
  if (data.tx_status === 'pending' || data.tx_status === 'queued') {
    return { status: 'pending', tx_status: data.tx_status, tx_hash: txHash };
  }
  return {
    status: 'failed',
    tx_hash: txHash,
    tx_status: data.tx_status,
    error: data.tx_result?.repr || data.tx_status,
  };
}

/** Alias used by BOS transition guards/actions */
async function getTransactionStatus(txHash) {
  const result = await getTxStatus(txHash);
  return {
    tx_status: result.tx_status || result.status,
    block_height: result.block_height,
  };
}

/**
 * Burn USDCx on Stacks (SIP-010 burn)
 * @param {Object} params
 * @param {number} params.amount - amount in USDCx base units (6 decimals)
 * @param {string} [params.memo] - optional memo
 * @param {string} [params.idempotencyKey] - for idempotent burn submission
 * @returns {Promise<string>} txHash
 */
async function burnUsdcx({ amount, memo, idempotencyKey }) {
  if (!_wallets?.creator) throw new Error('CREATOR_KEY not configured');
  const pk = _wallets.creator.privateKey;
  const usdcxContract = CHAIN_USDCX;
  const [addr, name] = usdcxContract.split('.');
  const args = [
    uintCV(amount),
  ];
  if (memo) {
    args.push(bufferCV(Buffer.from(memo.slice(0, 34), 'utf-8')));
  }
  const txHash = await callContract(pk, name, 'burn', args, addr);
  return txHash;
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
    const nonceResp = await fetch(`${API_URL}/v2/accounts/${address}?proof=0`);
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

async function getScoreData(targetAddress) {
  return await readOnlyCall('reputation', 'get-score-data', [standardPrincipalCV(targetAddress)]);
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
  ], V2_DEPLOYER);
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
  try {
    const v2Data = await readOnlyCall('project-verification-module-v2', 'is-creator-currently-verified', [
      standardPrincipalCV(creatorAddress),
    ], V2_DEPLOYER);
    if (v2Data.okay && v2Data.result) return v2Data;
  } catch (_) { /* v2 may not exist */ }
  return readOnlyCall('project-verification-module', 'is-creator-currently-verified', [
    standardPrincipalCV(creatorAddress),
  ]);
}

async function getCreatorFundingCap(creatorAddress) {
  try {
    const v2Data = await readOnlyCall('project-verification-module-v2', 'get-verification-funding-cap', [
      standardPrincipalCV(creatorAddress),
    ], V2_DEPLOYER);
    if (v2Data.okay && v2Data.result) return v2Data;
  } catch (_) { /* v2 may not exist */ }
  return readOnlyCall('project-verification-module', 'get-verification-funding-cap', [
    standardPrincipalCV(creatorAddress),
  ]);
}

async function getCreatorIdentity(creatorAddress) {
  try {
    const v2Data = await readOnlyCall('project-verification-module-v2', 'get-creator-identity', [
      standardPrincipalCV(creatorAddress),
    ], V2_DEPLOYER);
    if (v2Data.okay && v2Data.result) return v2Data;
  } catch (_) { /* v2 may not exist */ }
  return readOnlyCall('project-verification-module', 'get-creator-identity', [
    standardPrincipalCV(creatorAddress),
  ]);
}

// ========== ADMIN FUNCTIONS ==========

/// Helper: call an admin function with the creator key.
async function adminCall(contractName, functionName, functionArgs, contractAddress = DEPLOYER) {
  if (!_wallets?.creator) throw new Error('CREATOR_KEY not configured');
  const pk = _wallets.creator.privateKey;
  const txHash = await callContract(pk, contractName, functionName, functionArgs, contractAddress);
  return { tx_hash: txHash, explorer_url: `${EXPLORER_URL}/${txHash}?chain=testnet` };
}

// --- funding-pool ---
async function adminSetPoolContractAddresses(verification, reputation, escrow) {
  return adminCall('funding-pool', 'set-contract-addresses', [
    standardPrincipalCV(verification), standardPrincipalCV(reputation), standardPrincipalCV(escrow),
  ]);
}
async function adminSetPoolPauseState(pause) {
  return adminCall('funding-pool', 'set-pause-state', [boolCV(pause)]);
}
async function adminPoolEmergencyWithdraw(amount, recipient) {
  return adminCall('funding-pool', 'emergency-withdraw', [uintCV(amount), standardPrincipalCV(recipient)]);
}
async function adminEmergencyClosePool(poolId) {
  return adminCall('funding-pool', 'emergency-close-pool', [uintCV(poolId)]);
}
async function adminEmergencyRefundMember(poolId, memberAddress) {
  return adminCall('funding-pool', 'emergency-refund-member', [uintCV(poolId), standardPrincipalCV(memberAddress)]);
}

// --- campaign-module-2 ---
async function adminSetCampaignVerificationContract(verification) {
  return adminCall('campaign-module-2', 'set-verification-contract', [standardPrincipalCV(verification)]);
}
async function adminSetCampaignEscrowContract(escrow) {
  return adminCall('campaign-module-2', 'set-escrow-contract', [standardPrincipalCV(escrow)]);
}
async function adminSetCampaignPauseState(pause) {
  return adminCall('campaign-module-2', 'set-pause-state', [boolCV(pause)]);
}
async function adminCampaignEmergencyWithdraw(campaignId, amount, recipient) {
  return adminCall('campaign-module-2', 'emergency-withdraw', [uintCV(campaignId), uintCV(amount), standardPrincipalCV(recipient)]);
}

// --- milestone-escrow ---
async function adminSetEscrowFeeParameters(feeBps, collector) {
  return adminCall('milestone-escrow', 'set-fee-parameters', [uintCV(feeBps), standardPrincipalCV(collector)]);
}
async function adminSetEscrowVerificationContract(verification) {
  return adminCall('milestone-escrow', 'set-verification-contract', [standardPrincipalCV(verification)]);
}
async function adminSetEscrowPauseState(pause) {
  return adminCall('milestone-escrow', 'set-pause-state', [boolCV(pause)]);
}
async function adminEscrowEmergencyWithdraw(amount, recipient) {
  return adminCall('milestone-escrow', 'emergency-withdraw', [uintCV(amount), standardPrincipalCV(recipient)]);
}

// --- milestone-verification ---
async function adminSetVerificationEscrow(escrow) {
  return adminCall('milestone-verification', 'set-milestone-escrow', [standardPrincipalCV(escrow)]);
}
async function adminSetVerificationPauseState(pause) {
  return adminCall('milestone-verification', 'set-pause-state', [boolCV(pause)]);
}
async function adminVerificationEmergencyWithdraw(amount, recipient) {
  return adminCall('milestone-verification', 'emergency-withdraw', [uintCV(amount), standardPrincipalCV(recipient)]);
}

// --- yield-escrow ---
async function adminDistributePlatformYield(campaignId) {
  return adminCall('yield-escrow', 'distribute-platform-yield', [uintCV(campaignId)]);
}
async function adminSetYieldStrategy(strategyContract) {
  return adminCall('yield-escrow', 'set-strategy', [contractPrincipalCV(DEPLOYER, strategyContract)]);
}
async function adminSetYieldMilestoneEscrow(escrow) {
  return adminCall('yield-escrow', 'set-milestone-escrow', [standardPrincipalCV(escrow)]);
}
async function adminSetYieldMilestoneVerification(verification) {
  return adminCall('yield-escrow', 'set-milestone-verification', [standardPrincipalCV(verification)]);
}
async function adminSetYieldPauseState(pause) {
  return adminCall('yield-escrow', 'set-pause-state', [boolCV(pause)]);
}
async function adminYieldEmergencyWithdraw(amount, recipient) {
  return adminCall('yield-escrow', 'emergency-withdraw', [uintCV(amount), standardPrincipalCV(recipient)]);
}

// --- project-verification-module (v1) ---
async function adminV1EmergencyRevokeVerification(creatorAddress) {
  return adminCall('project-verification-module', 'emergency-revoke-verification', [standardPrincipalCV(creatorAddress)]);
}
async function adminV1SetContractAdmin(newAdmin) {
  return adminCall('project-verification-module', 'set-contract-admin', [standardPrincipalCV(newAdmin)]);
}
async function adminV1SetPauseState(pause) {
  return adminCall('project-verification-module', 'set-pause-state', [boolCV(pause)]);
}
async function adminV1EmergencyWithdraw(amount, recipient) {
  return adminCall('project-verification-module', 'emergency-withdraw', [uintCV(amount), standardPrincipalCV(recipient)]);
}

// --- project-verification-module-v2 ---
async function adminV2EmergencyVerifyCreator(creatorAddress, expirationBlock) {
  return adminCall('project-verification-module-v2', 'emergency-verify-creator', [
    standardPrincipalCV(creatorAddress), uintCV(expirationBlock),
  ], V2_DEPLOYER);
}
async function adminV2EmergencyRevokeVerification(creatorAddress) {
  return adminCall('project-verification-module-v2', 'emergency-revoke-verification', [standardPrincipalCV(creatorAddress)], V2_DEPLOYER);
}
async function adminV2SetPauseState(pause) {
  return adminCall('project-verification-module-v2', 'set-pause-state', [boolCV(pause)], V2_DEPLOYER);
}
async function adminV2EmergencyWithdraw(amount, recipient) {
  return adminCall('project-verification-module-v2', 'emergency-withdraw', [uintCV(amount), standardPrincipalCV(recipient)], V2_DEPLOYER);
}

// --- oracle-proxy ---
async function adminSetPriceOracle(oracleAddress) {
  return adminCall('oracle-proxy', 'set-price-oracle', [standardPrincipalCV(oracleAddress)]);
}
async function adminUpdatePrice(newPrice) {
  return adminCall('oracle-proxy', 'update-price', [uintCV(newPrice)]);
}
async function adminEmergencySetPrice(newPrice) {
  return adminCall('oracle-proxy', 'emergency-set-price', [uintCV(newPrice)]);
}
async function getStxPrice() {
  return readOnlyCall('oracle-proxy', 'get-stx-price', []);
}

// --- reputation ---
async function adminSetVerificationGate(reputationContract) {
  return adminCall('reputation', 'set-verification-gate', [standardPrincipalCV(reputationContract)]);
}

// ========== POOL FUNCTIONS ==========

async function createPoolInContract(name, targetAmount, minContribution, minReputation, duration, maxMembers) {
  if (!_wallets?.creator) throw new Error('CREATOR_KEY not configured');
  const pk = _wallets.creator.privateKey;
  const txHash = await callContract(pk, 'funding-pool', 'create-pool', [
    stringAsciiCV(name),
    uintCV(targetAmount),
    uintCV(minContribution),
    uintCV(minReputation),
    uintCV(duration),
    uintCV(maxMembers),
  ]);
  return { tx_hash: txHash, explorer_url: `${EXPLORER_URL}/${txHash}?chain=testnet` };
}

async function joinPoolInContract(poolId, amount) {
  if (!_wallets?.backer) throw new Error('BACKER_KEY not configured');
  const pk = _wallets.backer.privateKey;
  const txHash = await callContract(pk, 'funding-pool', 'join-pool', [
    uintCV(poolId), uintCV(amount),
  ]);
  return { tx_hash: txHash, explorer_url: `${EXPLORER_URL}/${txHash}?chain=testnet` };
}

async function contributeToPoolContract(poolId, amount) {
  if (!_wallets?.backer) throw new Error('BACKER_KEY not configured');
  const pk = _wallets.backer.privateKey;
  const txHash = await callContract(pk, 'funding-pool', 'contribute', [
    uintCV(poolId), uintCV(amount),
  ]);
  return { tx_hash: txHash, explorer_url: `${EXPLORER_URL}/${txHash}?chain=testnet` };
}

async function proposeAllocation(poolId, campaignId, amount) {
  if (!_wallets?.creator) throw new Error('CREATOR_KEY not configured');
  const pk = _wallets.creator.privateKey;
  const txHash = await callContract(pk, 'funding-pool', 'propose-allocation', [
    uintCV(poolId), uintCV(campaignId), uintCV(amount),
  ]);
  return { tx_hash: txHash, explorer_url: `${EXPLORER_URL}/${txHash}?chain=testnet` };
}

async function voteOnProposal(proposalId, approve) {
  if (!_wallets?.backer) throw new Error('BACKER_KEY not configured');
  const pk = _wallets.backer.privateKey;
  const txHash = await callContract(pk, 'funding-pool', 'vote', [
    uintCV(proposalId), approve ? boolCV(true) : boolCV(false),
  ]);
  return { tx_hash: txHash, explorer_url: `${EXPLORER_URL}/${txHash}?chain=testnet` };
}

async function executeAllocation(proposalId) {
  if (!_wallets?.creator) throw new Error('CREATOR_KEY not configured');
  const pk = _wallets.creator.privateKey;
  const txHash = await callContract(pk, 'funding-pool', 'execute-allocation', [
    uintCV(proposalId),
  ]);
  return { tx_hash: txHash, explorer_url: `${EXPLORER_URL}/${txHash}?chain=testnet` };
}

async function closePoolInContract(poolId) {
  if (!_wallets?.creator) throw new Error('CREATOR_KEY not configured');
  const pk = _wallets.creator.privateKey;
  const txHash = await callContract(pk, 'funding-pool', 'close-pool', [
    uintCV(poolId),
  ]);
  return { tx_hash: txHash, explorer_url: `${EXPLORER_URL}/${txHash}?chain=testnet` };
}

async function withdrawUnused(poolId, amount) {
  if (!_wallets?.backer) throw new Error('BACKER_KEY not configured');
  const pk = _wallets.backer.privateKey;
  const txHash = await callContract(pk, 'funding-pool', 'withdraw-unused', [
    uintCV(poolId), uintCV(amount),
  ]);
  return { tx_hash: txHash, explorer_url: `${EXPLORER_URL}/${txHash}?chain=testnet` };
}

// Read-only pool getters
async function getPoolFromContract(poolId) {
  return readOnlyCall('funding-pool', 'get-pool', [uintCV(poolId)]);
}

async function getProposalFromContract(proposalId) {
  return readOnlyCall('funding-pool', 'get-proposal', [uintCV(proposalId)]);
}

async function getPoolMember(poolId, memberAddress) {
  return readOnlyCall('funding-pool', 'get-member', [uintCV(poolId), standardPrincipalCV(memberAddress)]);
}

async function getProposalVote(proposalId, voterAddress) {
  return readOnlyCall('funding-pool', 'get-proposal-vote', [uintCV(proposalId), standardPrincipalCV(voterAddress)]);
}

async function withdrawFromCampaign(campaignId, amount) {
  if (!_wallets?.creator) throw new Error('CREATOR_KEY not configured');
  const pk = _wallets.creator.privateKey;
  const txHash = await callContract(pk, 'milestone-escrow', 'withdraw-from-campaign', [
    uintCV(campaignId), uintCV(amount),
  ]);
  return { tx_hash: txHash, explorer_url: `${EXPLORER_URL}/${txHash}?chain=testnet` };
}

async function collectCampaignFee(campaignId, amount) {
  if (!_wallets?.creator) throw new Error('CREATOR_KEY not configured');
  const pk = _wallets.creator.privateKey;
  const txHash = await callContract(pk, 'milestone-escrow', 'collect-campaign-fee', [
    uintCV(campaignId), uintCV(amount),
  ]);
  return { tx_hash: txHash, explorer_url: `${EXPLORER_URL}/${txHash}?chain=testnet` };
}

async function deployContract(privateKey, contractName, codeBody, clarityVersion = ClarityVersion.Clarity2) {
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
    fee: Math.max(50000, 200000 + Math.floor(codeBody.length / 10) * 500),
    nonce,
    clarityVersion,
  });

  const result = await broadcastTransaction(tx, _network);
  advanceNonce(account.address);

  if (result.error) {
    throw new Error(`transaction rejected: ${result.error}`);
  }
  const deployerAddr = getAddressFromPrivateKey(privateKey, TransactionVersion.Testnet);
  return {
    tx_hash: `0x${result.txid}`,
    explorer_url: `${EXPLORER_URL}/${result.txid}?chain=testnet`,
    contract_id: `${deployerAddr}.${contractName}`,
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
  getTransactionStatus,
  burnUsdcx,
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
  getScoreData,
  createMilestones,
  submitMilestone,
  endorseMilestone,
  finalizeMilestone,
  proxyRegisterCreator,
  withdrawFromCampaign,
  collectCampaignFee,
  getCampaignContributions,
  getYieldPool,
  claimBackerYield,
  claimCreatorBonus,
  createPoolInContract,
  joinPoolInContract,
  contributeToPoolContract,
  proposeAllocation,
  voteOnProposal,
  executeAllocation,
  closePoolInContract,
  withdrawUnused,
  getPoolFromContract,
  getProposalFromContract,
  getPoolMember,
  getProposalVote,
  // Admin
  adminSetPoolContractAddresses,
  adminSetPoolPauseState,
  adminPoolEmergencyWithdraw,
  adminEmergencyClosePool,
  adminEmergencyRefundMember,
  adminSetCampaignVerificationContract,
  adminSetCampaignEscrowContract,
  adminSetCampaignPauseState,
  adminCampaignEmergencyWithdraw,
  adminSetEscrowFeeParameters,
  adminSetEscrowVerificationContract,
  adminSetEscrowPauseState,
  adminEscrowEmergencyWithdraw,
  adminSetVerificationEscrow,
  adminSetVerificationPauseState,
  adminVerificationEmergencyWithdraw,
  adminDistributePlatformYield,
  adminSetYieldStrategy,
  adminSetYieldMilestoneEscrow,
  adminSetYieldMilestoneVerification,
  adminSetYieldPauseState,
  adminYieldEmergencyWithdraw,
  adminV1EmergencyRevokeVerification,
  adminV1SetContractAdmin,
  adminV1SetPauseState,
  adminV1EmergencyWithdraw,
  adminV2EmergencyVerifyCreator,
  adminV2EmergencyRevokeVerification,
  adminV2SetPauseState,
  adminV2EmergencyWithdraw,
  adminSetPriceOracle,
  adminUpdatePrice,
  adminEmergencySetPrice,
  getStxPrice,
  adminSetVerificationGate,
};
