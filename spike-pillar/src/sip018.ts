/**
 * SIP-018 Structured Signing for CineX Pillar Vault
 *
 * Implements the SIP-018 challenge computation pattern from
 * pillar-wallets-xyz (smart-wallet-standard-auth-helpers-v7.clar).
 *
 * Challenge = SHA256(SIP018_PREFIX || SHA256(domain-tuple) || SHA256(message-tuple))
 *
 * PRD Reference: Reviewer Addendum → "SIP-018 structured-signing domains and payload rules"
 */

import crypto from "node:crypto";
import {
  tupleCV,
  uintCV,
  stringAsciiCV,
  principalCV,
  serializeCV,
  bufferCV,
  noneCV,
  someCV,
  type ClarityValue,
} from "@stacks/transactions";

const sha256 = (b: Buffer): Buffer =>
  crypto.createHash("sha256").update(b).digest();

/** SIP-018 message prefix: ASCII "SIP018" = 0x534950303138 */
export const SIP018_PREFIX = Buffer.from("534950303138", "hex");

// ---------------------------------------------------------------------------
// Domain
// ---------------------------------------------------------------------------

export interface CineXDomain {
  /** Application name — must match Clarity constant exactly */
  name: string;
  /** Semver version string */
  version: string;
  /** Stacks chain ID: 1 (mainnet) or 2143456 (testnet) */
  chainId: number;
  /** Vault contract principal — binds signature to this specific vault */
  wallet: string;
}

/**
 * Build the SIP-018 domain hash.
 *
 * Matches Clarity:
 *   sha256(to-consensus-buff?({ name, version, chain-id, wallet }))
 *
 * The `wallet: contract-caller` pattern (from Pillar reference) means
 * each vault contract produces a different domain hash, preventing
 * cross-wallet signature replay.
 */
export function computeDomainHash(domain: CineXDomain): Buffer {
  const domainCV = tupleCV({
    name: stringAsciiCV(domain.name),
    version: stringAsciiCV(domain.version),
    "chain-id": uintCV(domain.chainId),
    wallet: principalCV(domain.wallet),
  });
  const serialized = Buffer.from(serializeCV(domainCV), "hex");
  return sha256(serialized);
}

// ---------------------------------------------------------------------------
// Messages — one type per action
// ---------------------------------------------------------------------------

export interface StxTransferMessage {
  topic: "stx-transfer";
  "auth-id": number;
  amount: number;
  recipient: string;
  memo: Buffer | null;
}

export interface RotateOwnerMessage {
  topic: "rotate-owner";
  "auth-id": number;
  "new-pubkey": Buffer;
}

export interface FreezeVaultMessage {
  topic: "freeze-vault";
  "auth-id": number;
  reason: string;
}

export type CineXMessage =
  | StxTransferMessage
  | RotateOwnerMessage
  | FreezeVaultMessage;

/**
 * Build the message hash for any CineX action.
 *
 * Matches Clarity:
 *   sha256(to-consensus-buff?({ topic, ...fields }))
 */
export function computeMessageHash(message: CineXMessage): Buffer {
  const fields: Record<string, ClarityValue> = {};

  fields.topic = stringAsciiCV(message.topic);

  switch (message.topic) {
    case "stx-transfer":
      fields["auth-id"] = uintCV(message["auth-id"]);
      fields.amount = uintCV(message.amount);
      fields.recipient = principalCV(message.recipient);
      fields.memo = message.memo
        ? someCV(bufferCV(message.memo))
        : noneCV();
      break;
    case "rotate-owner":
      fields["auth-id"] = uintCV(message["auth-id"]);
      fields["new-pubkey"] = bufferCV(message["new-pubkey"]);
      break;
    case "freeze-vault":
      fields["auth-id"] = uintCV(message["auth-id"]);
      fields.reason = stringAsciiCV(message.reason);
      break;
  }

  const messageCV = tupleCV(fields);
  const serialized = Buffer.from(serializeCV(messageCV), "hex");
  return sha256(serialized);
}

// ---------------------------------------------------------------------------
// Challenge computation
// ---------------------------------------------------------------------------

/**
 * Compute the SIP-018 challenge for a CineX vault action.
 *
 * challenge = SHA256(SIP018_PREFIX || domainHash || messageHash)
 *
 * This is the value that the WebAuthn authenticator signs as its challenge.
 * The Clarity contract reconstructs this identically and verifies the
 * P-256 signature against it.
 */
export function computeSIP018Challenge(
  domain: CineXDomain,
  message: CineXMessage
): Buffer {
  const domainHash = computeDomainHash(domain);
  const messageHash = computeMessageHash(message);
  return sha256(Buffer.concat([SIP018_PREFIX, domainHash, messageHash]));
}

// ---------------------------------------------------------------------------
// Convenience builders for common actions
// ---------------------------------------------------------------------------

/**
 * Build an stx-transfer SIP-018 challenge.
 */
export function buildStxTransferChallenge(
  domain: CineXDomain,
  authId: number,
  amount: number,
  recipient: string,
  memo: Buffer | null = null
): Buffer {
  return computeSIP018Challenge(domain, {
    topic: "stx-transfer",
    "auth-id": authId,
    amount,
    recipient,
    memo,
  });
}

/**
 * Build a rotate-owner SIP-018 challenge.
 */
export function buildRotateOwnerChallenge(
  domain: CineXDomain,
  authId: number,
  newPubkey: Buffer
): Buffer {
  return computeSIP018Challenge(domain, {
    topic: "rotate-owner",
    "auth-id": authId,
    "new-pubkey": newPubkey,
  });
}

// ---------------------------------------------------------------------------
// Helpers — re-export CV types for test construction
// ---------------------------------------------------------------------------

export { noneCV, bufferCV, tupleCV, uintCV, stringAsciiCV, principalCV, serializeCV } from "@stacks/transactions";

/**
 * Default CineX domain for testnet.
 * wallet must be set to the actual vault contract principal at runtime.
 */
export function testnetDomain(vaultPrincipal: string): CineXDomain {
  return {
    name: "cinex-smart-vault",
    version: "1.0.0",
    chainId: 2143456,
    wallet: vaultPrincipal,
  };
}

/**
 * Default CineX domain for mainnet.
 */
export function mainnetDomain(vaultPrincipal: string): CineXDomain {
  return {
    name: "cinex-smart-vault",
    version: "1.0.0",
    chainId: 1,
    wallet: vaultPrincipal,
  };
}
