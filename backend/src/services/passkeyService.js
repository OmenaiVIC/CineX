/**
 * passkeyService.js — CineX passkey relay service.
 *
 * Receives P-256-signed WebAuthn assertions from the frontend,
 * wraps them in a secp256k1-signed Stacks transaction using
 * the server's CREATOR_KEY, and broadcasts to testnet.
 *
 * This is the "relay" in the passkey wallet architecture:
 *   Frontend (P-256 passkey) → Backend (secp256k1 relay) → Stacks blockchain
 */

import {
  makeContractCall,
  AnchorMode,
  PostConditionMode,
  standardPrincipalCV,
  uintCV,
  bufferCV,
  tupleCV,
  someCV,
  noneCV,
  getAddressFromPrivateKey,
  TransactionVersion,
} from '@stacks/transactions';
import { StacksTestnet } from '@stacks/network';

const API_URL = 'https://api.testnet.hiro.so';
const VAULT_CONTRACT_ADDRESS = 'ST29JKDEFRY0RYMGF97FZC9PZWJ4H4VBSQFFERNXX';
const VAULT_CONTRACT_NAME = 'cinex-smart-vault-v3';

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
    _relayAddress = getAddressFromPrivateKey(creatorKey, TransactionVersion.Testnet);
    _network = new StacksTestnet({ url: API_URL });
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
    headers: { 'Content-Type': 'application/octet-stream' },
    body: signedTxHex,
  });
  const text = await resp.text();
  if (!resp.ok) {
    throw new Error(`Hiro API ${resp.status}: ${text.substring(0, 200)}`);
  }
  // Hiro returns raw txid string on success, or {txid: "..."} sometimes
  let txid;
  try {
    const parsed = JSON.parse(text);
    txid = parsed.txid || text.trim();
  } catch {
    txid = text.trim();
  }
  return txid.startsWith('0x') ? txid : `0x${txid}`;
}

/**
 * Execute a passkey-signed STX transfer via the vault contract.
 *
 * @param {Object} params
 * @param {string} params.recipient - Stacks principal to receive STX
 * @param {number} params.amount - Amount in micro-STX
 * @param {number} params.authId - Monotonic auth ID (anti-replay)
 * @param {string} params.pubkey - 33-byte hex P-256 public key
 * @param {string} params.signature - 64-byte hex P-256 signature
 * @param {string} params.authenticatorData - Hex-encoded authenticator data
 * @param {string} params.clientDataPrefix - Hex-encoded client data prefix
 * @param {string} params.clientDataSuffix - Hex-encoded client data suffix
 * @param {string} [params.memo] - Optional 34-byte memo hex
 * @returns {Promise<{txid: string}>}
 */
async function passkeyTransfer({
  recipient,
  amount,
  authId,
  pubkey,
  signature,
  authenticatorData,
  clientDataPrefix,
  clientDataSuffix,
  memo,
}) {
  if (!_initialized || !_relayKey) {
    throw new Error('Passkey relay not initialized — CREATOR_KEY required');
  }

  // Build the sig-auth tuple matching the Clarity contract's struct definition
  const sigAuth = tupleCV({
    'auth-id': uintCV(authId),
    pubkey: bufferCV(Buffer.from(pubkey, 'hex')),
    signature: bufferCV(Buffer.from(signature, 'hex')),
    'authenticator-data': bufferCV(Buffer.from(authenticatorData, 'hex')),
    'client-data-prefix': bufferCV(Buffer.from(clientDataPrefix, 'hex')),
    'client-data-suffix': bufferCV(Buffer.from(clientDataSuffix, 'hex')),
  });

  const functionArgs = [
    uintCV(amount),
    standardPrincipalCV(recipient),
    memo ? someCV(bufferCV(Buffer.from(memo, 'hex'))) : noneCV(),
    sigAuth,
  ];

  // Import @stacks/transactions (already cached from contractService.js import)
  const nonce = await ensureNonce();

  const tx = await makeContractCall({
    contractAddress: VAULT_CONTRACT_ADDRESS,
    contractName: VAULT_CONTRACT_NAME,
    functionName: 'stx-transfer',
    functionArgs,
    senderKey: _relayKey,
    network: _network,
    anchorMode: AnchorMode.Any,
    postConditionMode: PostConditionMode.Allow,
    fee: 100000, // 0.1 STX
    nonce,
  });

  const serializedTx = tx.serialize().toString('hex');
  const txid = await broadcast(serializedTx);

  // Advance nonce locally
  _nonce = nonce + 1;

  console.log(`[passkeyService] Transfer broadcast: ${txid}`);
  return { txid };
}

/**
 * Read-only: get vault owner
 */
async function getVaultOwner() {
  const resp = await fetch(
    `${API_URL}/v2/contracts/call-read/${VAULT_CONTRACT_ADDRESS}/${VAULT_CONTRACT_NAME}/get-owner`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sender: VAULT_CONTRACT_ADDRESS,
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
async function getVaultInitialized() {
  const resp = await fetch(
    `${API_URL}/v2/contracts/call-read/${VAULT_CONTRACT_ADDRESS}/${VAULT_CONTRACT_NAME}/is-initialized`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sender: VAULT_CONTRACT_ADDRESS,
        arguments: [],
      }),
    }
  );
  if (!resp.ok) throw new Error(`Hiro API ${resp.status}`);
  return resp.json();
}

export {
  init,
  passkeyTransfer,
  getVaultOwner,
  getVaultInitialized,
};
