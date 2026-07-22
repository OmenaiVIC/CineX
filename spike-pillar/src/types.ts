/**
 * Pillar Passkey Spike — Shared Types
 * CineX Wallet Abstraction Task 1.1
 */

export interface PillarAccount {
  vaultContract: string;
  ownerPubkey: string;
  stxAddress: string;
  btcAddress: string;
  passkeyCredentialId: string;
  passkeyPublicKey: string;
  createdAt: number;
}

export interface PillarSignature {
  r: string;
  s: string;
  v: { parity: boolean };
}

export interface PillarTransaction {
  txId: string;
  contractCall: string;
  args: unknown[];
  signature: PillarSignature;
  relayedVia: 'rendezvous' | 'direct';
  fee: number;
}

export interface RelayRequest {
  transaction: unknown;
  signature: PillarSignature;
}

export interface RelayResponse {
  txId: string;
  status: 'pending' | 'confirmed' | 'failed';
  fee: number;
}

export interface AuthSession {
  authenticated: boolean;
  account: PillarAccount | null;
  sessionToken: string | null;
}
