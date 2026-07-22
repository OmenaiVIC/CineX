/**
 * Path A: Pillar Signing
 * 
 * Signs challenges using P-256 passkey.
 * Implements the exact WebAuthn signing flow used by Pillar.
 */

import { p256 } from "@noble/curves/nist.js";
import crypto from "node:crypto";
import { buildAuthenticatorData, buildClientDataJSON } from "./pillar-auth.js";

const sha256 = (b: Buffer): Buffer => 
  crypto.createHash("sha256").update(b).digest();

export interface WebAuthnSignature {
  /** P-256 signature (64 bytes, r||s format) */
  signature: Buffer;
  /** Signature as hex string */
  signatureHex: string;
  /** Authenticator data */
  authenticatorData: Buffer;
  /** Client data JSON */
  clientDataJSON: Buffer;
  /** The signed digest (for verification) */
  signedDigest: Buffer;
}

/**
 * Sign a challenge using P-256 passkey.
 * 
 * This implements the exact flow from pillar-wallets-xyz/lib-webauthn-test-signer.mjs:
 * 1. Build authenticatorData with RP ID hash
 * 2. Build clientDataJSON with challenge
 * 3. Compute signedDigest = SHA256(authenticatorData || SHA256(clientDataJSON))
 * 4. Sign with P-256 (low-s normalized, compact format)
 */
export function signChallenge(
  challenge: Buffer,
  privKey: Buffer,
  rpId: string
): WebAuthnSignature {
  if (challenge.length !== 32) {
    throw new Error(`Challenge must be 32 bytes, got ${challenge.length}`);
  }

  // Build authenticator data
  const authenticatorData = buildAuthenticatorData(rpId);
  
  // Build client data JSON
  const clientDataJSON = Buffer.from(
    buildClientDataJSON(challenge, rpId, rpId)
  );
  
  // Compute the digest that WebAuthn signs:
  // sha256(authenticatorData || sha256(clientDataJSON))
  const clientDataHash = sha256(clientDataJSON);
  const signedDigest = sha256(
    Buffer.concat([authenticatorData, clientDataHash])
  );
  
  // Sign with P-256 (low-s normalized, compact format)
  // prehash: true means the input is already a SHA-256 digest — don't hash again
  const sig = p256.sign(signedDigest, privKey, {
    prehash: true,
    format: "compact",
    lowS: true,
  });
  
  return {
    signature: Buffer.from(sig),
    signatureHex: "0x" + Buffer.from(sig).toString("hex"),
    authenticatorData,
    clientDataJSON,
    signedDigest,
  };
}

/**
 * Verify a P-256 signature (for testing).
 * Accepts compact r||s format (64-byte Uint8Array) and verifies against the given digest and public key.
 */
export function verifySignature(
  signature: Buffer,
  digest: Buffer,
  pubkey: Buffer
): boolean {
  return p256.verify(signature, digest, pubkey);
}
