/**
 * passkeyService.ts — Browser-side CineX Pillar passkey operations.
 *
 * Handles P-256 keypair management, SIP-018 challenge computation,
 * WebAuthn-compatible signing, and relay backend communication.
 *
 * Architecture: Browser (P-256 passkey) → Backend (secp256k1 relay) → Stacks blockchain
 */

import { API_BASE } from './api';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const VAULT_CONTRACT_ADDRESS = 'ST29JKDEFRY0RYMGF97FZC9PZWJ4H4VBSQFFERNXX';
const VAULT_CONTRACT_NAME = 'cinex-smart-vault-v4';
const VAULT_PRINCIPAL = `${VAULT_CONTRACT_ADDRESS}.${VAULT_CONTRACT_NAME}`;

const CINEX_RP_ID_HASH = 'b1c4e8f3a2d56709c8e4f1a3b6d9e2c5f8a1b4d7e0c3f6a9b2d5e8c1f4a7d0e3';

const PRIVKEY_STORAGE = 'cinex_passkey_privkey';
const PUBKEY_STORAGE = 'cinex_passkey_pubkey';
const AUTHID_STORAGE = 'cinex_passkey_authid';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PasskeyDomain {
  name: string;
  version: string;
  chainId: number;
  wallet: string;
}

export interface PasskeyKeypair {
  publicKeyHex: string;
  publicKeyCompressed: Uint8Array;
  address: string;
}

export interface TransferParams {
  recipient: string;
  amountStx: number;
  memo?: string;
}

export interface TransferResult {
  txid: string;
  transferId?: string;
  cached?: boolean;
}

export interface RelayHealth {
  status: string;
  balanceStx: number;
  address: string;
  alerts: Record<string, unknown>;
}

export interface RelayQuota {
  transferCount: number;
  dailyCap: number;
  remaining: number;
}

// ---------------------------------------------------------------------------
// Keypair Management (using @noble/curves P-256 via dynamic import)
// ---------------------------------------------------------------------------

let _p256: any = null;

async function loadP256() {
  if (!_p256) {
    const mod = await import('@noble/curves/nist.js');
    _p256 = mod.p256;
  }
  return _p256;
}

function bufToHex(buf: Uint8Array): string {
  return Array.from(buf).map(b => b.toString(16).padStart(2, '0')).join('');
}

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

function bytesToBase64url(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Generate or load a P-256 keypair for passkey auth.
 */
export async function getOrCreateKeypair(): Promise<PasskeyKeypair> {
  const p256 = await loadP256();

  let privKeyHex: string;
  let pubKeyHex: string;

  try {
    privKeyHex = localStorage.getItem(PRIVKEY_STORAGE) || '';
    pubKeyHex = localStorage.getItem(PUBKEY_STORAGE) || '';
  } catch {
    privKeyHex = '';
    pubKeyHex = '';
  }

  if (!privKeyHex || !pubKeyHex) {
    const privKey = p256.utils.randomSecretKey();
    const pubKeyCompressed = p256.getPublicKey(privKey, true);
    privKeyHex = bufToHex(privKey);
    pubKeyHex = bufToHex(pubKeyCompressed);

    try {
      localStorage.setItem(PRIVKEY_STORAGE, privKeyHex);
      localStorage.setItem(PUBKEY_STORAGE, pubKeyHex);
    } catch { /* ignore */ }
  }

  const publicKeyCompressed = hexToBytes(pubKeyHex);

  return {
    publicKeyHex: pubKeyHex,
    publicKeyCompressed,
    address: VAULT_PRINCIPAL,
  };
}

/**
 * Clear stored keypair.
 */
export function clearKeypair(): void {
  try {
    localStorage.removeItem(PRIVKEY_STORAGE);
    localStorage.removeItem(PUBKEY_STORAGE);
    localStorage.removeItem(AUTHID_STORAGE);
  } catch { /* ignore */ }
}

/**
 * Check if a keypair is stored.
 */
export function hasKeypair(): boolean {
  try {
    return !!(localStorage.getItem(PRIVKEY_STORAGE) && localStorage.getItem(PUBKEY_STORAGE));
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// SIP-018 Challenge Computation (browser-compatible)
// ---------------------------------------------------------------------------

/**
 * Compute a Clarity-compatible SHA-256 hash of a CV tuple.
 * Uses the Web Crypto API for hashing.
 */
async function sha256(data: Uint8Array): Promise<Uint8Array> {
  const hash = await crypto.subtle.digest('SHA-256', data.buffer as ArrayBuffer);
  return new Uint8Array(hash);
}

/**
 * Build a SIP-018 domain tuple and compute its hash.
 * This replicates the Clarity contract's sha256(to-consensus-buff?({...}))
 * using @stacks/transactions CV serialization.
 */
async function computeDomainHash(domain: PasskeyDomain): Promise<Uint8Array> {
  const { tupleCV, stringAsciiCV, uintCV, principalCV, serializeCV } = await import('@stacks/transactions');

  const domainCV = tupleCV({
    name: stringAsciiCV(domain.name),
    version: stringAsciiCV(domain.version),
    'chain-id': uintCV(domain.chainId),
    wallet: principalCV(domain.wallet),
  });

  const serialized = serializeCV(domainCV);
  const bytes = hexToBytes(serialized);
  return sha256(bytes);
}

/**
 * Build a SIP-018 stx-transfer message tuple and compute its hash.
 */
async function computeMessageHash(params: {
  authId: number;
  amount: number;
  recipient: string;
}): Promise<Uint8Array> {
  const { tupleCV, stringAsciiCV, uintCV, principalCV, noneCV, serializeCV } = await import('@stacks/transactions');

  const messageCV = tupleCV({
    topic: stringAsciiCV('stx-transfer'),
    'auth-id': uintCV(params.authId),
    amount: uintCV(params.amount),
    recipient: principalCV(params.recipient),
    memo: noneCV(),
  });

  const serialized = serializeCV(messageCV);
  const bytes = hexToBytes(serialized);
  return sha256(bytes);
}

/**
 * Compute the SIP-018 challenge.
 * challenge = SHA256(SIP018_PREFIX || domainHash || messageHash)
 */
export async function computeSIP018Challenge(
  domain: PasskeyDomain,
  authId: number,
  amountMicrostx: number,
  recipient: string,
): Promise<Uint8Array> {
  const SIP018_PREFIX = new Uint8Array([0x53, 0x49, 0x50, 0x30, 0x31, 0x38]); // "SIP018"

  const [domainHash, messageHash] = await Promise.all([
    computeDomainHash(domain),
    computeMessageHash({ authId, amount: amountMicrostx, recipient }),
  ]);

  const combined = new Uint8Array(SIP018_PREFIX.length + domainHash.length + messageHash.length);
  combined.set(SIP018_PREFIX, 0);
  combined.set(domainHash, SIP018_PREFIX.length);
  combined.set(messageHash, SIP018_PREFIX.length + domainHash.length);

  return sha256(combined);
}

// ---------------------------------------------------------------------------
// WebAuthn-compatible Signing
// ---------------------------------------------------------------------------

/**
 * Sign a SIP-018 challenge with P-256, producing WebAuthn-compatible data.
 *
 * Returns the components needed by the relay backend:
 * - signature (64 bytes, compact)
 * - authenticatorData (37 bytes)
 * - clientDataPrefix (before challenge in clientDataJSON)
 * - clientDataSuffix (after challenge in clientDataJSON)
 */
export async function signChallenge(
  challenge: Uint8Array,
  privKeyHex: string,
): Promise<{
  signature: string;
  authenticatorData: string;
  clientDataPrefix: string;
  clientDataSuffix: string;
}> {
  const p256 = await loadP256();

  // Build authenticator data
  const rpIdHash = hexToBytes(CINEX_RP_ID_HASH);
  const flags = new Uint8Array([0x01]); // UP flag
  const signCount = new Uint8Array([0x00, 0x00, 0x00, 0x00]);
  const authenticatorData = new Uint8Array(rpIdHash.length + flags.length + signCount.length);
  authenticatorData.set(rpIdHash, 0);
  authenticatorData.set(flags, rpIdHash.length);
  authenticatorData.set(signCount, rpIdHash.length + flags.length);

  // Build clientDataJSON
  const challengeB64 = bytesToBase64url(challenge);
  const clientDataJSON = JSON.stringify({
    type: 'webauthn.get',
    challenge: challengeB64,
    origin: window.location.origin,
    crossOrigin: false,
  });

  // Split around the challenge field
  const challengeField = '"challenge":"';
  const afterChallengeField = clientDataJSON.indexOf(challengeField) + challengeField.length;
  const prefix = clientDataJSON.substring(0, afterChallengeField);
  const suffixStart = afterChallengeField + challengeB64.length;
  const suffix = clientDataJSON.substring(suffixStart);

  // Compute signed digest: SHA256(authenticatorData || SHA256(clientDataJSON))
  const clientDataBytes = new TextEncoder().encode(clientDataJSON);
  const clientDataHash = await sha256(clientDataBytes);

  const signedData = new Uint8Array(authenticatorData.length + clientDataHash.length);
  signedData.set(authenticatorData, 0);
  signedData.set(clientDataHash, authenticatorData.length);
  const signedDigest = await sha256(signedData);

  // Sign with P-256
  const privKey = hexToBytes(privKeyHex);
  const sig = p256.sign(signedDigest, privKey, { prehash: true, format: 'compact', lowS: true });

  // Encode prefix/suffix as hex (UTF-8 bytes) — backend expects hex for bufferCV
  const prefixHex = bufToHex(new TextEncoder().encode(prefix));
  const suffixHex = bufToHex(new TextEncoder().encode(suffix));

  return {
    signature: bufToHex(sig),
    authenticatorData: bufToHex(authenticatorData),
    clientDataPrefix: prefixHex,
    clientDataSuffix: suffixHex,
  };
}

// ---------------------------------------------------------------------------
// Auth ID Management
// ---------------------------------------------------------------------------

/**
 * Get the next auth ID (monotonic, anti-replay).
 * Stored in localStorage, incremented on each transfer.
 */
export function getAuthId(): number {
  try {
    const raw = localStorage.getItem(AUTHID_STORAGE);
    const current = raw ? parseInt(raw, 10) : 0;
    return current + 1;
  } catch {
    return 1;
  }
}

/**
 * Increment the auth ID after a successful transfer.
 */
export function incrementAuthId(): void {
  try {
    const current = getAuthId();
    localStorage.setItem(AUTHID_STORAGE, String(current));
  } catch { /* ignore */ }
}

// ---------------------------------------------------------------------------
// Relay Backend Communication
// ---------------------------------------------------------------------------

/**
 * Build the default CineX domain for testnet.
 */
export function testnetDomain(vaultPrincipal?: string): PasskeyDomain {
  return {
    name: 'cinex-smart-vault',
    version: '1.0.0',
    chainId: 2143456,
    wallet: vaultPrincipal || VAULT_PRINCIPAL,
  };
}

/**
 * Execute a passkey-signed STX transfer via the relay backend.
 */
export async function passkeyTransfer(params: TransferParams): Promise<TransferResult> {
  const keypair = await getOrCreateKeypair();
  const privKeyHex = localStorage.getItem(PRIVKEY_STORAGE) || '';
  if (!privKeyHex) throw new Error('No private key stored');

  const authId = getAuthId();
  const amountMicrostx = Math.round(params.amountStx * 1_000_000);
  const domain = testnetDomain();

  // 1. Compute SIP-018 challenge
  const challenge = await computeSIP018Challenge(domain, authId, amountMicrostx, params.recipient);

  // 2. Sign with P-256
  const signed = await signChallenge(challenge, privKeyHex);

  // 3. Send to relay backend
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Relay-Api-Key': '***REMOVED***',
    'X-Relay-User-Address': keypair.address,
  };

  const idempotencyKey = crypto.randomUUID();
  headers['X-Idempotency-Key'] = idempotencyKey;

  const body = {
    recipient: params.recipient,
    amount: amountMicrostx,
    authId,
    pubkey: keypair.publicKeyHex,
    signature: signed.signature,
    authenticatorData: signed.authenticatorData,
    clientDataPrefix: signed.clientDataPrefix,
    clientDataSuffix: signed.clientDataSuffix,
    domainName: domain.name,
    domainVersion: domain.version,
    domainChainId: domain.chainId,
    domainWallet: domain.wallet,
  };

  const res = await fetch(`${API_BASE}/passkey/transfer`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    let errMsg = `HTTP ${res.status}`;
    try {
      const errBody = await res.json();
      errMsg = errBody.error || errBody.reason || errMsg;
    } catch { /* ignore */ }
    throw new Error(errMsg);
  }

  const result = await res.json();

  // 4. Increment auth ID on success
  incrementAuthId();

  return {
    txid: result.txid,
    transferId: result.transferId,
    cached: result.cached,
  };
}

/**
 * Check relay wallet health.
 */
export async function getRelayHealth(): Promise<RelayHealth> {
  const res = await fetch(`${API_BASE}/passkey/health`);
  return res.json();
}

/**
 * Check user's daily transfer quota.
 */
export async function getRelayQuota(address: string): Promise<RelayQuota> {
  const res = await fetch(`${API_BASE}/passkey/quota/${encodeURIComponent(address)}`);
  return res.json();
}

/**
 * Get explorer URL for a transaction.
 */
export function getExplorerUrl(txid: string): string {
  return `https://explorer.hiro.so/txid/${txid}?chain=testnet`;
}

// ---------------------------------------------------------------------------
// Recovery Management
// ---------------------------------------------------------------------------

/**
 * Read the vault's recovery state (proposed pubkey + block height).
 */
export async function getRecoveryState(
  vaultAddress: string,
  vaultName: string,
): Promise<any> {
  const [addr, name] = [vaultAddress || VAULT_CONTRACT_ADDRESS, vaultName || VAULT_CONTRACT_NAME];
  const contractId = `${addr}.${name}`;
  const encodedFn = encodeURIComponent('get-recovery-state');
  const res = await fetch(
    `${API_BASE.replace('/api', '')}/passkey/vault-state?contractId=${encodeURIComponent(contractId)}&fn=${encodedFn}`,
  );
  if (!res.ok) throw new Error(`Failed to fetch recovery state: HTTP ${res.status}`);
  return res.json();
}

/**
 * Propose a new P-256 public key for vault recovery (admin-signed via relay).
 */
export async function proposeRecovery(
  newPubkey: string,
  vaultAddress?: string,
  vaultName?: string,
): Promise<{ txid: string; status: string }> {
  const keypair = await getOrCreateKeypair();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Relay-Api-Key': '***REMOVED***',
    'X-Relay-User-Address': keypair.address,
  };

  const res = await fetch(`${API_BASE}/passkey/recovery/propose`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      newPubkey,
      vaultAddress: vaultAddress || VAULT_CONTRACT_ADDRESS,
      vaultName: vaultName || VAULT_CONTRACT_NAME,
    }),
  });

  if (!res.ok) {
    let errMsg = `HTTP ${res.status}`;
    try { errMsg = (await res.json()).error || errMsg; } catch { /* ignore */ }
    throw new Error(errMsg);
  }
  return res.json();
}

/**
 * Execute a previously proposed recovery (admin-signed via relay).
 * Only succeeds after the 72-hour veto window has expired.
 */
export async function executeRecovery(
  vaultAddress?: string,
  vaultName?: string,
): Promise<{ txid: string; status: string }> {
  const keypair = await getOrCreateKeypair();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Relay-Api-Key': '***REMOVED***',
    'X-Relay-User-Address': keypair.address,
  };

  const res = await fetch(`${API_BASE}/passkey/recovery/execute`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      vaultAddress: vaultAddress || VAULT_CONTRACT_ADDRESS,
      vaultName: vaultName || VAULT_CONTRACT_NAME,
    }),
  });

  if (!res.ok) {
    let errMsg = `HTTP ${res.status}`;
    try { errMsg = (await res.json()).error || errMsg; } catch { /* ignore */ }
    throw new Error(errMsg);
  }
  return res.json();
}
