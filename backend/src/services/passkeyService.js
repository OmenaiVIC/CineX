/**
 * passkeyService.js — CineX passkey relay service.
 *
 * Receives P-256-signed WebAuthn assertions from the frontend,
 * wraps them in a secp256k1-signed Stacks transaction using
 * the server's CREATOR_KEY, and broadcasts to testnet.
 *
 * This is the "relay" in the passkey wallet architecture:
 *   Frontend (P-256 passkey) → Backend (secp256k1 relay) → Stacks blockchain
 *
 * v4: Integrates with sponsorService for sponsorship tracking and audit logging.
 */

import {
  makeContractCall,
  AnchorMode,
  PostConditionMode,
  standardPrincipalCV,
  principalCV,
  uintCV,
  bufferCV,
  tupleCV,
  someCV,
  noneCV,
  stringAsciiCV,
  getAddressFromPrivateKey,
  TransactionVersion,
} from '@stacks/transactions';
import { HIRO_API_URL, networkInstance, txVersion } from '../config/chain.js';
import { recordTransfer, confirmTransfer, failTransfer } from './sponsorService.js';

const API_URL = HIRO_API_URL;
const DEFAULT_VAULT_CONTRACT_ADDRESS = 'ST29JKDEFRY0RYMGF97FZC9PZWJ4H4VBSQFFERNXX';
const DEFAULT_VAULT_CONTRACT_NAME = 'cinex-smart-vault-v4';

let _initialized = false;
let _network = null;
let _relayKey = null;
let _relayAddress = null;
let _nonce = null;

/**
 * Initialize the passkey relay service.
 * Requires CREATOR_KEY to be set in env.
 */
function init() {
  if (_initialized) return;

  const creatorKey = process.env.CREATOR_KEY;
  if (!creatorKey) {
    console.warn('[passkeyService] CREATOR_KEY not set — passkey relay will fail');
    return;
  }

  try {
    _relayKey = creatorKey;
    _relayAddress = getAddressFromPrivateKey(creatorKey, txVersion);
    _network = networkInstance;
    _initialized = true;
    console.log(`[passkeyService] Initialized. Relay address: ${_relayAddress}`);
  } catch (err) {
    console.error(`[passkeyService] Init failed: ${err.message}`);
  }
}

/**
 * Ensure the relay has a fresh nonce from the chain.
 */
async function ensureNonce() {
  if (!_relayAddress) throw new Error('Relay not initialized');
  const resp = await fetch(`${API_URL}/v2/accounts/${_relayAddress}?proof=0`, {
    headers: { Accept: 'application/json' },
  });
  if (!resp.ok) throw new Error(`Nonce fetch failed: HTTP ${resp.status}`);
  const data = await resp.json();
  _nonce = Number(data.nonce);
  return _nonce;
}

/**
 * Broadcast a signed transaction to the Hiro API.
 */
async function broadcast(signedTxHex) {
  const resp = await fetch(`${API_URL}/v2/transactions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tx: signedTxHex }),
  });
  const text = await resp.text();
  if (!resp.ok) {
    throw new Error(`Hiro API ${resp.status}: ${text.substring(0, 200)}`);
  }
  // Hiro API returns either {"txid":"0x..."} or bare "0x..."
  let txid;
  try {
    const parsed = JSON.parse(text);
    txid = (typeof parsed === 'object' && parsed?.txid) ? parsed.txid : String(parsed);
  } catch {
    txid = text.trim();
  }
  // Extract hex txid — strip all quotes and whitespace
  txid = txid.replace(/["']/g, '').trim();
  if (!txid.startsWith('0x')) txid = `0x${txid}`;
  return txid;
}

/**
 * Execute a passkey-signed STX transfer via the vault contract (v4 SIP-018).
 *
 * @param {Object} params
 * @param {string} params.domainName - SIP-018 domain name (must match Clarity constant)
 * @param {string} params.domainVersion - SIP-018 domain version
 * @param {number} params.domainChainId - SIP-018 chain ID (1 or 2143456)
 * @param {string} params.domainWallet - Vault contract principal (binds signature to this vault)
 * @param {string} params.recipient - Stacks principal to receive STX
 * @param {number} params.amount - Amount in micro-STX
 * @param {number} params.authId - Monotonic auth ID (anti-replay, in message params)
 * @param {string} params.pubkey - 33-byte hex P-256 public key
 * @param {string} params.signature - 64-byte hex P-256 signature
 * @param {string} params.authenticatorData - Hex-encoded authenticator data
 * @param {string} params.clientDataPrefix - Hex-encoded client data prefix
 * @param {string} params.clientDataSuffix - Hex-encoded client data suffix
 * @param {string} [params.memo] - Optional 34-byte memo hex
 * @param {string} [params.transferId] - Relay transfer ID from sponsorService (for audit tracking)
 * @returns {Promise<{txid: string, transferId: string|null}>}
 */
async function passkeyTransfer({
  domainName,
  domainVersion,
  domainChainId,
  domainWallet,
  recipient,
  amount,
  authId,
  pubkey,
  signature,
  authenticatorData,
  clientDataPrefix,
  clientDataSuffix,
  memo,
  transferId,
  vaultAddress,
  vaultName,
}) {
  if (!_initialized || !_relayKey) {
    // Lazy re-init: try once more (handles Vercel cold-start race)
    init();
    if (!_initialized || !_relayKey) {
      throw new Error('Passkey relay not initialized — CREATOR_KEY required');
    }
  }

  const contractAddr = vaultAddress || DEFAULT_VAULT_CONTRACT_ADDRESS;
  const contractName = vaultName || DEFAULT_VAULT_CONTRACT_NAME;

  // SIP-018 domain binding validation — reject unknown domains
  const VALID_DOMAINS = {
    'cinex-smart-vault': { version: '1.0.0', chainIds: [1, 2143456] },
  };
  const domain = VALID_DOMAINS[domainName];
  if (!domain) {
    throw new Error(`Invalid SIP-018 domain: ${domainName}`);
  }
  if (domain.version !== domainVersion) {
    throw new Error(`Invalid domain version: ${domainVersion}`);
  }
  if (!domain.chainIds.includes(domainChainId)) {
    throw new Error(`Invalid domain chain-id: ${domainChainId}`);
  }
  if (!domainWallet || typeof domainWallet !== 'string') {
    throw new Error('domainWallet required');
  }

  // v4: auth-id is in message params, NOT in sig-auth tuple
  const sigAuth = tupleCV({
    pubkey: bufferCV(Buffer.from(pubkey, 'hex')),
    signature: bufferCV(Buffer.from(signature, 'hex')),
    'authenticator-data': bufferCV(Buffer.from(authenticatorData, 'hex')),
    'client-data-prefix': bufferCV(Buffer.from(clientDataPrefix, 'hex')),
    'client-data-suffix': bufferCV(Buffer.from(clientDataSuffix, 'hex')),
  });

  // v4: domain + message + sig-auth
  const functionArgs = [
    stringAsciiCV(domainName),                // domain-name
    stringAsciiCV(domainVersion),             // domain-version
    uintCV(domainChainId),                    // domain-chain-id
    principalCV(domainWallet),                // domain-wallet
    uintCV(authId),                           // msg-auth-id
    uintCV(amount),                           // msg-amount
    standardPrincipalCV(recipient),           // msg-recipient
    memo ? someCV(bufferCV(Buffer.from(memo, 'hex'))) : noneCV(), // msg-memo
    sigAuth,                                  // sig-auth
  ];

  // Import @stacks/transactions (already cached from contractService.js import)
  const nonce = await ensureNonce();

  const tx = await makeContractCall({
    contractAddress: contractAddr,
    contractName: contractName,
    functionName: 'stx-transfer',
    functionArgs,
    senderKey: _relayKey,
    network: _network,
    anchorMode: AnchorMode.Any,
    postConditionMode: PostConditionMode.Allow,
    fee: 100000, // 0.1 STX
    nonce,
    clarityVersion: 4,
  });

  const ser = tx.serialize();
  let serializedTx;
  if (typeof ser === 'string') {
    serializedTx = ser;
  } else {
    serializedTx = Buffer.from(ser).toString('hex');
  }
  const txid = await broadcast(serializedTx);

  // Advance nonce locally
  _nonce = nonce + 1;

  // Record successful broadcast in relay audit log
  const gasCostStx = 0.1; // matches fee: 100000
  try {
    await recordTransfer({
      userAddress: domainWallet,
      amountMicrostx: amount,
      gasCostStx,
      txHash: txid,
      transferId,
    });
  } catch (err) {
    console.warn('[passkeyService] Failed to record transfer:', err.message);
  }

  console.log(`[passkeyService] Transfer broadcast: ${txid}`);
  return { txid, transferId };
}

/**
 * Read-only: get vault owner
 */
async function getVaultOwner(vaultAddress, vaultName) {
  const addr = vaultAddress || DEFAULT_VAULT_CONTRACT_ADDRESS;
  const name = vaultName || DEFAULT_VAULT_CONTRACT_NAME;
  const resp = await fetch(
    `${API_URL}/v2/contracts/call-read/${addr}/${name}/get-owner`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sender: addr,
        arguments: [],
      }),
    }
  );
  if (!resp.ok) throw new Error(`Hiro API ${resp.status}`);
  return resp.json();
}

/**
 * Read-only: check if vault is initialized
 */
async function getVaultInitialized(vaultAddress, vaultName) {
  const addr = vaultAddress || DEFAULT_VAULT_CONTRACT_ADDRESS;
  const name = vaultName || DEFAULT_VAULT_CONTRACT_NAME;
  const resp = await fetch(
    `${API_URL}/v2/contracts/call-read/${addr}/${name}/is-initialized`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sender: addr,
        arguments: [],
      }),
    }
  );
  if (!resp.ok) throw new Error(`Hiro API ${resp.status}`);
  return resp.json();
}

/**
 * Propose recovery — admin broadcasts propose-recovery tx on vault contract.
 * Sets new-pubkey and starts 72h veto window.
 *
 * @param {Object} params
 * @param {string} params.newPubkey - 33-byte hex P-256 public key for recovery
 * @param {string} [params.vaultAddress] - Vault contract address
 * @param {string} [params.vaultName] - Vault contract name
 * @returns {Promise<{txid: string}>}
 */
async function proposeRecovery({ newPubkey, vaultAddress, vaultName }) {
  if (!_initialized || !_relayKey) {
    init();
    if (!_initialized || !_relayKey) {
      throw new Error('Passkey relay not initialized — CREATOR_KEY required');
    }
  }

  const contractAddr = vaultAddress || DEFAULT_VAULT_CONTRACT_ADDRESS;
  const contractName = vaultName || DEFAULT_VAULT_CONTRACT_NAME;

  const functionArgs = [
    bufferCV(Buffer.from(newPubkey, 'hex')),
  ];

  const nonce = await ensureNonce();
  const tx = await makeContractCall({
    contractAddress: contractAddr,
    contractName: contractName,
    functionName: 'propose-recovery',
    functionArgs,
    senderKey: _relayKey,
    network: _network,
    anchorMode: AnchorMode.Any,
    postConditionMode: PostConditionMode.Allow,
    fee: 100000,
    nonce,
    clarityVersion: 4,
  });

  const ser = tx.serialize();
  let serializedTx;
  if (typeof ser === 'string') {
    serializedTx = ser;
  } else {
    serializedTx = Buffer.from(ser).toString('hex');
  }
  const txid = await broadcast(serializedTx);
  _nonce = nonce + 1;

  console.log(`[passkeyService] Propose recovery broadcast: ${txid}`);
  return { txid };
}

/**
 * Execute recovery — admin broadcasts execute-recovery tx after 72h veto window.
 *
 * @param {Object} params
 * @param {string} [params.vaultAddress] - Vault contract address
 * @param {string} [params.vaultName] - Vault contract name
 * @returns {Promise<{txid: string}>}
 */
async function executeRecovery({ vaultAddress, vaultName }) {
  if (!_initialized || !_relayKey) {
    init();
    if (!_initialized || !_relayKey) {
      throw new Error('Passkey relay not initialized — CREATOR_KEY required');
    }
  }

  const contractAddr = vaultAddress || DEFAULT_VAULT_CONTRACT_ADDRESS;
  const contractName = vaultName || DEFAULT_VAULT_CONTRACT_NAME;

  const nonce = await ensureNonce();
  const tx = await makeContractCall({
    contractAddress: contractAddr,
    contractName: contractName,
    functionName: 'execute-recovery',
    functionArgs: [],
    senderKey: _relayKey,
    network: _network,
    anchorMode: AnchorMode.Any,
    postConditionMode: PostConditionMode.Allow,
    fee: 100000,
    nonce,
    clarityVersion: 4,
  });

  const ser = tx.serialize();
  let serializedTx;
  if (typeof ser === 'string') {
    serializedTx = ser;
  } else {
    serializedTx = Buffer.from(ser).toString('hex');
  }
  const txid = await broadcast(serializedTx);
  _nonce = nonce + 1;

  console.log(`[passkeyService] Execute recovery broadcast: ${txid}`);
  return { txid };
}

/**
 * Read-only: get vault recovery state
 * Returns { recovery-pubkey: (optional buff 33), recovery-proposed-at: (optional uint) }
 *
 * @param {string} [vaultAddress]
 * @param {string} [vaultName]
 * @returns {Promise<Object>} Hiro call-read response with recovery state
 */
async function getRecoveryState(vaultAddress, vaultName) {
  const addr = vaultAddress || DEFAULT_VAULT_CONTRACT_ADDRESS;
  const name = vaultName || DEFAULT_VAULT_CONTRACT_NAME;
  const resp = await fetch(
    `${API_URL}/v2/contracts/call-read/${addr}/${name}/get-recovery-state`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sender: addr,
        arguments: [],
      }),
    }
  );
  if (!resp.ok) throw new Error(`Hiro API ${resp.status}`);
  return resp.json();
}

function isInitialized() {
  return _initialized;
}

export {
  init,
  passkeyTransfer,
  getVaultOwner,
  getVaultInitialized,
  isInitialized,
  confirmTransfer,
  failTransfer,
  proposeRecovery,
  executeRecovery,
  getRecoveryState,
};
