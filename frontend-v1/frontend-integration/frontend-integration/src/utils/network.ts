/**
 * Network configuration and utilities for Stacks blockchain integration
 * Configures network based on environment variables
 */

import { STACKS_TESTNET, STACKS_MAINNET, type StacksNetwork } from '@stacks/network';

export type NetworkType = 'devnet' | 'testnet' | 'mainnet';

/**
 * Get configured Stacks network instance based on environment
 */
export function getNetwork(): StacksNetwork {
  const networkType = (import.meta.env.VITE_NETWORK || 'testnet') as NetworkType;
  const apiUrl = import.meta.env.VITE_STACKS_API_URL;

  switch (networkType) {
    case 'devnet':
      // Devnet uses testnet configuration with custom API URL
      if (apiUrl) {
        return {
          ...STACKS_TESTNET,
          client: {
            baseUrl: apiUrl,
          },
        } as StacksNetwork;
      }
      return STACKS_TESTNET;
    
    case 'testnet':
      if (apiUrl) {
        return {
          ...STACKS_TESTNET,
          client: {
            baseUrl: apiUrl,
          },
        } as StacksNetwork;
      }
      return STACKS_TESTNET;
    
    case 'mainnet':
      if (apiUrl) {
        return {
          ...STACKS_MAINNET,
          client: {
            baseUrl: apiUrl,
          },
        } as StacksNetwork;
      }
      return STACKS_MAINNET;
    
    default:
      console.warn(`Unknown network type: ${networkType}, defaulting to testnet`);
      return STACKS_TESTNET;
  }
}

/**
 * Get contract deployment address from environment
 */
export function getContractAddress(): string {
  const address = import.meta.env.VITE_CO_EP_CONTRACT_ADDRESS;
  
  if (!address) {
    throw new Error('VITE_CO_EP_CONTRACT_ADDRESS not configured in environment');
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
  
  const envKey = envMap[contractType];
  const contractName = import.meta.env[envKey];
  
  if (!contractName) {
    throw new Error(`${envKey} not configured in environment`);
  }
  
  return contractName;
}

/**
 * Build full contract identifier (address.contract-name)
 */
export function getContractIdentifier(contractType: 'coep' | 'crowdfunding' | 'core' | 'verification' | 'escrow'): string {
  const address = getContractAddress();
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
 * Get explorer URL for transaction
 */
export function getExplorerTxUrl(txId: string): string {
  const baseUrl = import.meta.env.VITE_EXPLORER_URL || 'https://explorer.stacks.co';
  const network = getNetworkType();
  
  if (network === 'mainnet') {
    return `${baseUrl}/txid/${txId}`;
  }
  
  return `${baseUrl}/txid/${txId}?chain=${network}`;
}

/**
 * Get explorer URL for address
 */
export function getExplorerAddressUrl(address: string): string {
  const baseUrl = import.meta.env.VITE_EXPLORER_URL || 'https://explorer.stacks.co';
  const network = getNetworkType();
  
  if (network === 'mainnet') {
    return `${baseUrl}/address/${address}`;
  }
  
  return `${baseUrl}/address/${address}?chain=${network}`;
}

/**
 * Get explorer URL for contract
 */
export function getExplorerContractUrl(contractId: string): string {
  const baseUrl = import.meta.env.VITE_EXPLORER_URL || 'https://explorer.stacks.co';
  const network = getNetworkType();
  
  if (network === 'mainnet') {
    return `${baseUrl}/txid/${contractId}`;
  }
  
  return `${baseUrl}/txid/${contractId}?chain=${network}`;
}
