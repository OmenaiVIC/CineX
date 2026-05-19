/**
 * Network configuration and utilities for Stacks blockchain integration
 * Configures network based on environment variables with safe fallbacks
 */

import { STACKS_TESTNET, STACKS_MAINNET, type StacksNetwork } from '@stacks/network';

export type NetworkType = 'devnet' | 'testnet' | 'mainnet';

// Hardcoded fallback to prevent "Deployment Plan Invalid" crashes on Vercel
const DEFAULT_TESTNET_ADDRESS = 'ST2VTFJEEJQN93Z6P3AFF6QN7M3WXY85ZPNDR3G51';

/**
 * Get configured Stacks network instance based on environment
 */
export function getNetwork(): StacksNetwork {
  const networkType = (import.meta.env.VITE_NETWORK || 'testnet') as NetworkType;
  const apiUrl = import.meta.env.VITE_STACKS_API_URL || 'https://api.testnet.hiro.so';

  switch (networkType) {
    case 'mainnet':
      return { ...STACKS_MAINNET, client: { baseUrl: apiUrl || STACKS_MAINNET.client.baseUrl } };
    case 'devnet':
    case 'testnet':
    default:
      return { ...STACKS_TESTNET, client: { baseUrl: apiUrl || STACKS_TESTNET.client.baseUrl } };
  }
}

/**
 * Get contract deployment address from environment
 */
export function getContractAddress(contractType: 'coep' | 'crowdfunding' | 'core' | 'verification' | 'escrow'): string {
  const envMap = {
    coep: 'VITE_CO_EP_CONTRACT_ADDRESS',
    crowdfunding: 'VITE_CROWDFUNDING_CONTRACT_ADDRESS',
    core: 'VITE_MAIN_HUB_CONTRACT_ADDRESS',
    verification: 'VITE_VERIFICATION_CONTRACT_ADDRESS',
    escrow: 'VITE_ESCROW_CONTRACT_ADDRESS',
  };
  
  const envKey = envMap[contractType];
  const address = import.meta.env[envKey];

  if (!address) {
    // Soft warning instead of throwing Error to prevent app crash
    console.warn(`[CONFIG] ${envKey} missing in Vercel. Falling back to default.`);
    return DEFAULT_TESTNET_ADDRESS;
  }

  return address;
}

/**
 * Get contract name from environment
 */
export function getContractName(contractType: 'coep' | 'crowdfunding' | 'core' | 'verification' | 'escrow'): string {
  const envMap = {
    coep: 'VITE_CO_EP_CONTRACT_NAME',
    crowdfunding: 'VITE_CROWDFUNDING_CONTRACT_NAME',
    core: 'VITE_MAIN_HUB_CONTRACT_NAME',
    verification: 'VITE_VERIFICATION_CONTRACT_NAME',
    escrow: 'VITE_ESCROW_CONTRACT_NAME',
  };

  const nameMap = {
    coep: 'Co-EP-rotating-fundings',
    crowdfunding: 'crowdfunding-module',
    core: 'CineX-project',
    verification: 'film-verification-module',
    escrow: 'escrow-module',
  };
  
  const envKey = envMap[contractType];
  const contractName = import.meta.env[envKey];

  if (!contractName) {
    console.warn(`[CONFIG] ${envKey} missing. Using fallback name.`);
    return nameMap[contractType];
  }
  
  return contractName;
}

/**
 * Build full contract identifier (address.contract-name)
 */
export function getContractIdentifier(contractType: 'coep' | 'crowdfunding' | 'core' | 'verification' | 'escrow'): string {
  const address = getContractAddress(contractType);
  const name = getContractName(contractType);
  return `${address}.${name}`;
}

/**
 * Get current network type
 */
export function getNetworkType(): NetworkType {
  return (import.meta.env.VITE_NETWORK || 'testnet') as NetworkType;
}

/**
 * Check if running on devnet
 */
export function isDevnet(): boolean {
  return getNetworkType() === 'devnet';
}

/**
 * Get explorer URL utilities
 */
export function getExplorerTxUrl(txId: string): string {
  const baseUrl = import.meta.env.VITE_EXPLORER_URL || 'https://explorer.hiro.so';
  const network = getNetworkType();
  return `${baseUrl}/txid/${txId}?chain=${network}`;
}

export function getExplorerAddressUrl(address: string): string {
  const baseUrl = import.meta.env.VITE_EXPLORER_URL || 'https://explorer.hiro.so';
  const network = getNetworkType();
  return `${baseUrl}/address/${address}?chain=${network}`;
}

/**
 * switchNetwork
 * -------------
 * Persist a network preference to localStorage so the app can pick it up
 * on the next load.  Environment variables (VITE_NETWORK) cannot be changed
 * at runtime, so we store the intent and the user must refresh the page
 * (or the app initialisation reads localStorage).
 *
 * @param target - 'testnet' | 'mainnet'
 *
 * @example
 *   import { switchNetwork } from '../utils/network';
 *   switchNetwork('mainnet');
 *   // Optionally reload: window.location.reload();
 */
export function switchNetwork(target: 'testnet' | 'mainnet'): void {
  localStorage.setItem('cinex_network_preference', target);
  // The app can read this key on startup if needed:
  //   const pref = localStorage.getItem('cinex_network_preference');
  //   if (pref) setEnv('VITE_NETWORK', pref);
  // Since VITE_ vars are baked at build time, a hard reload is the
  // simplest way to pick up a different network.
}