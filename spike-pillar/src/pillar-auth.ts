/**
 * Path A: Pillar Authentication
 * 
 * Handles WebAuthn authentication flow using P-256 passkeys.
 * Implements the challenge-response pattern for passkey authentication.
 */

import crypto from "node:crypto";

export interface WebAuthnChallenge {
  /** Random challenge bytes (32 bytes) */
  challenge: Buffer;
  /** Relying party ID (e.g., "cinex.app") */
  rpId: string;
  /** Challenge as base64url for WebAuthn API */
  challengeBase64: string;
}

export interface WebAuthnCredential {
  /** Credential ID from passkey creation */
  credentialId: string;
  /** User handle */
  userHandle: string;
  /** RP ID */
  rpId: string;
}

/**
 * Generate a WebAuthn challenge for authentication.
 * This creates the challenge that will be signed by the passkey.
 */
export function generateChallenge(rpId: string): WebAuthnChallenge {
  const challenge = crypto.randomBytes(32);
  const challengeBase64 = challenge
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  return {
    challenge,
    rpId,
    challengeBase64,
  };
}

/**
 * Build clientDataJSON for WebAuthn authentication.
 * This is the structure that the browser sends to the authenticator.
 */
export function buildClientDataJSON(
  challenge: Buffer,
  rpId: string,
  origin: string
): string {
  const challengeBase64 = challenge
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  return JSON.stringify({
    type: "webauthn.get",
    challenge: challengeBase64,
    origin: `https://${rpId}`,
    crossOrigin: false,
  });
}

/**
 * Build authenticatorData for WebAuthn authentication.
 * This contains the RP ID hash, flags, and sign count.
 */
export function buildAuthenticatorData(rpId: string): Buffer {
  const rpIdHash = crypto.createHash("sha256")
    .update(Buffer.from(rpId, "ascii"))
    .digest();
  
  const flags = Buffer.from([0x05]); // UP + UV
  const signCount = Buffer.from([0x00, 0x00, 0x00, 0x01]);
  
  return Buffer.concat([rpIdHash, flags, signCount]);
}
