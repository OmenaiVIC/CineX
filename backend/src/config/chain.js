/**
 * chain.js — Single source of truth for network-aware chain configuration.
 *
 * Reads STACKS_NETWORK env var (default: "testnet") and exports:
 *   - USDCX_CONTRACT  — SIP-010 contract address for USDCx on current network
 *   - HIRO_API_URL    — Hiro API base URL for current network
 *   - STACKS_NETWORK  — "testnet" | "mainnet"
 *   - networkInstance  — pre-configured StacksTestnet or StacksMainnet instance
 *   - TransactionVersion — Testnet | Mainnet (for address derivation)
 */

import { StacksTestnet, StacksMainnet } from '@stacks/network';

const NETWORK = process.env.STACKS_NETWORK || 'testnet';

const CONFIGS = {
  testnet: {
    usdcx: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.usdcx',
    hiroApi: 'https://api.testnet.hiro.so',
    deployer: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM',
    v2Deployer: 'STK0ASFJK4DJG8G8YY556X7H9E1FWABCDWEBGQ12',
    boot: 'ST000000000000000000002AMW42H',
  },
  mainnet: {
    usdcx: 'SP120SBRBQJ00MCWS7TM5R8WJNTTKD5K0HFRC2CNE.usdcx',
    hiroApi: 'https://api.mainnet.hiro.so',
    deployer: 'SP120SBRBQJ00MCWS7TM5R8WJNTTKD5K0HFRC2CNE',
    v2Deployer: null,
    boot: 'SP000000000000000000002Q6VF78',
  },
};

const cfg = CONFIGS[NETWORK] || CONFIGS.testnet;

export const USDCX_CONTRACT = process.env.USDCX_CONTRACT || cfg.usdcx;
export const HIRO_API_URL = process.env.HIRO_API_URL || cfg.hiroApi;
export const STACKS_NETWORK = NETWORK;
export const DEPLOYER_ADDRESS = cfg.deployer;
export const V2_DEPLOYER_ADDRESS = cfg.v2Deployer;
export const EXPLORER_URL = 'https://explorer.hiro.so/txid';

// Native STX token contract principal (boot address + .stx-token), network-aware.
export const NATIVE_STX_PRINCIPAL = `${cfg.boot}.stx-token`;

// Build a network-aware explorer link for a tx hash.
export function explorerUrl(txHash) {
  return `${EXPLORER_URL}/${txHash}?chain=${NETWORK}`;
}

// Build a network-aware explorer link for an address or contract principal.
export function explorerAddressUrl(addressOrContract) {
  return `https://explorer.hiro.so/address/${encodeURIComponent(addressOrContract)}?chain=${NETWORK}`;
}

// Pre-configured network instance for @stacks/transactions
export const networkInstance = NETWORK === 'mainnet'
  ? new StacksMainnet({ url: cfg.hiroApi })
  : new StacksTestnet({ url: cfg.hiroApi });

// TransactionVersion enum for getAddressFromPrivateKey
import { TransactionVersion } from '@stacks/transactions';
export const txVersion = NETWORK === 'mainnet'
  ? TransactionVersion.Mainnet
  : TransactionVersion.Testnet;

console.log(`[chain] Network: ${NETWORK} | API: ${cfg.hiroApi} | USDCx: ${USDCX_CONTRACT}`);
