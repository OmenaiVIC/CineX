/**
 * CineX Passkey Security Model
 *
 * Defines RP ID / origin bindings, credential isolation, session management,
 * and recovery flow types for the Pillar passkey wallet.
 *
 * PRD Reference: Reviewer Addendum → "Production Passkey Wallet Requirements"
 *   - approved RP ID / origin bindings for production and demo domains
 *   - a documented recovery / lost-device / admin-init model
 */

import crypto from "node:crypto";

const sha256 = (b: Buffer): Buffer =>
  crypto.createHash("sha256").update(b).digest();

// ---------------------------------------------------------------------------
// RP ID / Origin Matrix
// ---------------------------------------------------------------------------

export type CineXEnvironment = "dev" | "testnet" | "production";

export interface OriginBinding {
  environment: CineXEnvironment;
  rpId: string;
  origin: string;
  /** SHA-256 hash of the RP ID string — stored in vault contract */
  rpIdHash: Buffer;
}

/**
 * CineX origin bindings for all environments.
 *
 * No custom domain budget — uses Vercel free hosting for testnet.
 * Production RP ID (cinex.app) reserved but not yet live.
 *
 * WebAuthn spec: credentials are scoped to RP ID by the browser.
 * A credential registered for "localhost" cannot be used on
 * "cine-x-iota.vercel.app" — this is a SECURITY FEATURE.
 */
export const ORIGIN_BINDINGS: OriginBinding[] = [
  {
    environment: "dev",
    rpId: "localhost",
    origin: "http://localhost:5173",
    rpIdHash: sha256(Buffer.from("localhost", "ascii")),
  },
  {
    environment: "testnet",
    rpId: "cine-x-iota.vercel.app",
    origin: "https://cine-x-iota.vercel.app",
    rpIdHash: sha256(Buffer.from("cine-x-iota.vercel.app", "ascii")),
  },
  {
    environment: "production",
    rpId: "cinex.app",
    origin: "https://cinex.app",
    rpIdHash: sha256(Buffer.from("cinex.app", "ascii")),
  },
];

/**
 * Get the origin binding for a given environment.
 */
export function getOriginBinding(env: CineXEnvironment): OriginBinding {
  const binding = ORIGIN_BINDINGS.find((b) => b.environment === env);
  if (!binding) throw new Error(`Unknown environment: ${env}`);
  return binding;
}

/**
 * Validate that an RP ID hash matches the expected binding.
 * Returns true if the hash matches any registered environment.
 *
 * Matches Clarity: (asserts! (is-eq auth-rp-id rp-id-hash) ERR_BAD_RP_ID)
 */
export function validateRpIdHash(
  actualRpIdHash: Buffer,
  env: CineXEnvironment
): boolean {
  const expected = getOriginBinding(env);
  return actualRpIdHash.equals(expected.rpIdHash);
}

/**
 * Validate that an origin URL matches the expected RP ID.
 * Used on the frontend before calling navigator.credentials.get().
 */
export function validateOrigin(origin: string, env: CineXEnvironment): boolean {
  const binding = getOriginBinding(env);
  return origin === binding.origin;
}

// ---------------------------------------------------------------------------
// Authenticator Data Validation
// ---------------------------------------------------------------------------

export interface AuthenticatorDataValidation {
  valid: boolean;
  error?: string;
}

/**
 * Validate authenticator data fields.
 *
 * Matches Clarity checks in clarity-webauthn.clar and passkey-not-sender.clar:
 *   - Minimum 37 bytes (RP ID hash + flags + sign count)
 *   - User-present flag (bit 0) must be set
 *   - RP ID hash must match expected value
 */
export function validateAuthenticatorData(
  authenticatorData: Buffer,
  expectedRpIdHash: Buffer
): AuthenticatorDataValidation {
  if (authenticatorData.length < 37) {
    return { valid: false, error: "ERR_BAD_AUTH_DATA: authenticator data < 37 bytes" };
  }

  const flagsByte = authenticatorData[32];
  const userPresent = (flagsByte & 0x01) === 0x01;
  if (!userPresent) {
    return { valid: false, error: "ERR_USER_NOT_PRESENT: UP flag not set" };
  }

  const rpIdHashInAuth = authenticatorData.subarray(0, 32);
  if (!rpIdHashInAuth.equals(expectedRpIdHash)) {
    return { valid: false, error: "ERR_BAD_RP_ID: RP ID hash mismatch" };
  }

  return { valid: true };
}

// ---------------------------------------------------------------------------
// Credential Isolation
// ---------------------------------------------------------------------------

export interface PasskeyCredential {
  /** 33-byte compressed P-256 public key (hex) */
  pubkeyHex: string;
  /** WebAuthn credential ID (base64url) */
  credentialId: string;
  /** RP ID this credential was registered for */
  rpId: string;
  /** Environment this credential belongs to */
  environment: CineXEnvironment;
  /** Sequential nonce — next expected auth-id */
  nonce: number;
  /** Whether this credential is active */
  enabled: boolean;
}

/**
 * Check if two credentials can cross-authenticate.
 *
 * Returns false if they belong to different environments (different RP IDs).
 * This is enforced at the browser level (WebAuthn spec) but we validate
 * server-side as defense-in-depth.
 */
export function canCrossAuthenticate(
  credA: PasskeyCredential,
  credB: PasskeyCredential
): boolean {
  if (credA.rpId !== credB.rpId) return false;
  if (credA.environment !== credB.environment) return false;
  return true;
}

/**
 * Check if a credential is valid for the given environment.
 */
export function isCredentialValidForEnv(
  credential: PasskeyCredential,
  env: CineXEnvironment
): boolean {
  const binding = getOriginBinding(env);
  return (
    credential.rpId === binding.rpId &&
    credential.environment === env &&
    credential.enabled
  );
}

// ---------------------------------------------------------------------------
// Nonce Management
// ---------------------------------------------------------------------------

/**
 * Validate that an auth-id matches the expected nonce.
 *
 * Matches Clarity: (asserts! (is-eq nonce (get nonce passkey)) ERR_BAD_NONCE)
 * (passkey-not-sender.clar:287)
 */
export function validateNonce(
  authId: number,
  expectedNonce: number
): { valid: boolean; error?: string } {
  if (authId !== expectedNonce) {
    return {
      valid: false,
      error: `ERR_BAD_NONCE: expected ${expectedNonce}, got ${authId}`,
    };
  }
  return { valid: true };
}

/**
 * Increment nonce after successful consumption.
 */
export function incrementNonce(current: number): number {
  return current + 1;
}

// ---------------------------------------------------------------------------
// Session Management
// ---------------------------------------------------------------------------

export interface SessionToken {
  /** Vault contract address */
  vaultAddress: string;
  /** Hash of the P-256 public key (hex) */
  pubkeyHash: string;
  /** Expiry as Unix timestamp (ms) */
  expiresAt: number;
  /** Issuance timestamp (ms) */
  issuedAt: number;
}

export interface SessionConfig {
  /** Session duration in milliseconds (default: 24 hours) */
  maxAgeMs: number;
  /** Re-auth threshold in micro-STX (transfers above this require fresh auth) */
  reauthThresholdMicroStx: number;
}

export const DEFAULT_SESSION_CONFIG: SessionConfig = {
  maxAgeMs: 24 * 60 * 60 * 1000,
  reauthThresholdMicroStx: 10_000_000, // 10 STX
};

/**
 * Create a session token.
 */
export function createSessionToken(
  vaultAddress: string,
  pubkeyHex: string,
  config: SessionConfig = DEFAULT_SESSION_CONFIG
): SessionToken {
  const now = Date.now();
  const pubkeyHash = sha256(Buffer.from(pubkeyHex, "hex")).toString("hex");
  return {
    vaultAddress,
    pubkeyHash,
    expiresAt: now + config.maxAgeMs,
    issuedAt: now,
  };
}

/**
 * Validate a session token.
 */
export function validateSessionToken(
  token: SessionToken,
  now: number = Date.now()
): { valid: boolean; error?: string } {
  if (now > token.expiresAt) {
    return { valid: false, error: "Session expired" };
  }
  if (!token.vaultAddress || !token.pubkeyHash) {
    return { valid: false, error: "Invalid session token" };
  }
  return { valid: true };
}

/**
 * Check if a transfer requires re-authentication.
 */
export function requiresReauth(
  amountMicroStx: number,
  config: SessionConfig = DEFAULT_SESSION_CONFIG
): boolean {
  return amountMicroStx > config.reauthThresholdMicroStx;
}

// ---------------------------------------------------------------------------
// Recovery Flow Types
// ---------------------------------------------------------------------------

export type RecoveryStatus =
  | "none"
  | "proposed"
  | "veto-window"
  | "executed"
  | "cancelled";

export interface RecoveryRequest {
  /** New P-256 public key to set as owner */
  newPubkeyHex: string;
  /** When recovery was proposed (Unix ms) */
  proposedAt: number;
  /** 72-hour veto window expiry (Unix ms) */
  vetoWindowExpiresAt: number;
  /** Current status */
  status: RecoveryStatus;
  /** Who proposed (admin principal) */
  proposedBy: string;
}

/** Recovery veto window: 72 hours */
export const RECOVERY_VETO_WINDOW_MS = 72 * 60 * 60 * 1000;

/**
 * Create a recovery request with timelock.
 */
export function createRecoveryRequest(
  newPubkeyHex: string,
  proposedBy: string,
  now: number = Date.now()
): RecoveryRequest {
  return {
    newPubkeyHex,
    proposedAt: now,
    vetoWindowExpiresAt: now + RECOVERY_VETO_WINDOW_MS,
    status: "proposed",
    proposedBy,
  };
}

/**
 * Check if recovery veto window has expired (ready for execution).
 */
export function isRecoveryReady(
  request: RecoveryRequest,
  now: number = Date.now()
): boolean {
  return (
    request.status === "proposed" && now >= request.vetoWindowExpiresAt
  );
}

/**
 * Check if original owner can still cancel the recovery.
 */
export function canCancelRecovery(
  request: RecoveryRequest,
  now: number = Date.now()
): boolean {
  return (
    request.status === "proposed" && now < request.vetoWindowExpiresAt
  );
}
