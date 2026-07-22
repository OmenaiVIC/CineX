/**
 * @stacks.connect Spike — Shared Types
 * CineX Wallet Abstraction Task 1.1
 */

export interface ConnectAccount {
  stxAddress: string;
  publicKey: string;
  walletType: 'leather' | 'xverse';
  appDetails: {
    name: string;
    icon: string;
  };
}

export interface ConnectTransaction {
  txId: string;
  contractCall: string;
  args: unknown[];
  signature: string;
  broadcastVia: 'hiro-api';
  gasPaid: number;
}

export interface AuthSession {
  authenticated: boolean;
  account: ConnectAccount | null;
  sessionToken: string | null;
}

export interface HiroTxStatus {
  tx_id: string;
  tx_status: 'success' | 'failed' | 'pending' | 'dropped';
  block_height?: number;
  burn_block_time?: number;
}
