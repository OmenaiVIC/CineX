/**
 * Path A: Pillar Account Creation
 *
 * Creates a P-256 keypair for passkey authentication.
 * Uses @noble/curves/nist.js for P-256 operations.
 *
 * IMPORTANT: P-256 keys are WebAuthn auth factors only.
 * They do NOT derive Stacks addresses. The user's "address"
 * is their Vault contract address (see pillar-address.ts).
 */

import { p256 } from "@noble/curves/nist.js";

export interface PillarAccount {
  /** P-256 private key (32 bytes) */
  privKey: Buffer;
  /** P-256 private key as hex string */
  privKeyHex: string;
  /** Compressed public key (33 bytes) - for on-chain storage */
  pubKey: Buffer;
  /** Compressed public key as hex string */
  pubKeyHex: string;
  /** Uncompressed public key (65 bytes) - for verification */
  pubKeyUncompressedHex: string;
}

/**
 * Create a new P-256 keypair for passkey authentication.
 * This generates the key material that will be stored in the secure enclave.
 */
export function createPillarAccount(): PillarAccount {
  const { secretKey } = p256.keygen();
  const pubUncompressed = p256.getPublicKey(secretKey, false);
  const pubCompressed = p256.getPublicKey(secretKey, true);

  return {
    privKey: Buffer.from(secretKey),
    privKeyHex: Buffer.from(secretKey).toString("hex"),
    pubKey: Buffer.from(pubCompressed),
    pubKeyHex: Buffer.from(pubCompressed).toString("hex"),
    pubKeyUncompressedHex: Buffer.from(pubUncompressed).toString("hex"),
  };
}
