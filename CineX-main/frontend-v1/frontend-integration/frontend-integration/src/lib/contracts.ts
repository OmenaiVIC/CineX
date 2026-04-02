// Contract addresses and network configuration for CineX platform
// Integrates with environment variables for flexible deployment

import { STACKS_TESTNET, STACKS_MAINNET, type StacksNetwork } from '@stacks/network';

/**
 * Environment configuration interface
 * Maps to .env variables with VITE_ prefix
 */
interface EnvironmentConfig {
  // Network Configuration
  network: 'testnet' | 'mainnet';
  stacksApiUrl: string;
  explorerUrl: string;
  
  // Contract Addresses (will be populated during deployment)
  mainHubContractAddress: string;
  crowdfundingContractAddress: string;
  escrowContractAddress: string;
  rewardsContractAddress: string;
  coEpContractAddress: string;
  
  // Contract Names (defined in Clarity contracts)
  mainHubContractName: string;
  crowdfundingContractName: string;
  escrowContractName: string;
  rewardsContractName: string;
  coEpContractName: string;
  
  // Application Configuration
  appName: string;
  appVersion: string;
  appUrl: string;
  
  // Wallet Configuration
  supportedWallets: string[];
  walletTimeout: number;
  transactionTimeout: number;
  
  // Feature Flags
  features: {
    coEpPools: boolean;
    nftRewards: boolean;
    filmVerification: boolean;
    escrow: boolean;
  };
  
  // Development Configuration
  debugMode: boolean;
  enableConsoleLogs: boolean;
  txPollingInterval: number;
}

/**
 * Load and validate environment configuration from .env variables
 */
function loadEnvironmentConfig(): EnvironmentConfig {
  // Helper function to get required env var
  const getRequiredEnv = (key: string): string => {
    const value = import.meta.env[key];
    if (!value && import.meta.env.VITE_DEBUG_MODE === 'true') {
      console.warn(`Environment variable ${key} is not set`);
    }
    return value || '';
  };
  
  // Helper function to get env var with default
  const getEnvWithDefault = (key: string, defaultValue: string): string => {
    return import.meta.env[key] || defaultValue;
  };
  
  // Helper function to parse boolean env vars
  const parseBooleanEnv = (key: string, defaultValue: boolean = false): boolean => {
    const value = import.meta.env[key];
    if (!value) return defaultValue;
    return value.toLowerCase() === 'true';
  };
  
  // Helper function to parse number env vars
  const parseNumberEnv = (key: string, defaultValue: number): number => {
    const value = import.meta.env[key];
    if (!value) return defaultValue;
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? defaultValue : parsed;
  };
  
  // Helper function to parse array env vars
  const parseArrayEnv = (key: string, defaultValue: string[] = []): string[] => {
    const value = import.meta.env[key];
    if (!value) return defaultValue;
    return value.split(',').map((item: string) => item.trim()).filter(Boolean);
  };
  
  return {
    // Network Configuration - CONFIGURED FOR DEVNET DEPLOYMENT
    network: getEnvWithDefault('VITE_NETWORK', 'mainnet') as 'testnet' | 'mainnet',
    stacksApiUrl: getEnvWithDefault('VITE_STACKS_API_URL', 'http://localhost:3999'),
    explorerUrl: getEnvWithDefault('VITE_EXPLORER_URL', 'https://explorer.stacks.co'),
    
    // Contract Addresses
    mainHubContractAddress: getRequiredEnv('VITE_MAIN_HUB_CONTRACT_ADDRESS'),
    crowdfundingContractAddress: getRequiredEnv('VITE_CROWDFUNDING_CONTRACT_ADDRESS'),
    escrowContractAddress: getRequiredEnv('VITE_ESCROW_CONTRACT_ADDRESS'),
    rewardsContractAddress: getRequiredEnv('VITE_REWARDS_CONTRACT_ADDRESS'),
    coEpContractAddress: getRequiredEnv('VITE_CO_EP_CONTRACT_ADDRESS'),
    
    // Contract Names
    mainHubContractName: getEnvWithDefault('VITE_MAIN_HUB_CONTRACT_NAME', 'CineX-project'),
    crowdfundingContractName: getEnvWithDefault('VITE_CROWDFUNDING_CONTRACT_NAME', 'crowdfunding-module'),
    escrowContractName: getEnvWithDefault('VITE_ESCROW_CONTRACT_NAME', 'escrow-module'),
    rewardsContractName: getEnvWithDefault('VITE_REWARDS_CONTRACT_NAME', 'rewards-module'),
    coEpContractName: getEnvWithDefault('VITE_CO_EP_CONTRACT_NAME', 'Co-EP-rotating-fundings'),
    
    // Application Configuration
    appName: getEnvWithDefault('VITE_APP_NAME', 'CineX'),
    appVersion: getEnvWithDefault('VITE_APP_VERSION', '1.0.0'),
    appUrl: getEnvWithDefault('VITE_APP_URL', 'http://localhost:5173'),
    
    // Wallet Configuration
    supportedWallets: parseArrayEnv('VITE_SUPPORTED_WALLETS', ['hiro', 'leather', 'xverse']),
    walletTimeout: parseNumberEnv('VITE_WALLET_TIMEOUT', 30000),
    transactionTimeout: parseNumberEnv('VITE_TRANSACTION_TIMEOUT', 180000),
    
    // Feature Flags
    features: {
      coEpPools: parseBooleanEnv('VITE_FEATURE_CO_EP_POOLS', true),
      nftRewards: parseBooleanEnv('VITE_FEATURE_NFT_REWARDS', true),
      filmVerification: parseBooleanEnv('VITE_FEATURE_FILM_VERIFICATION', true),
      escrow: parseBooleanEnv('VITE_FEATURE_ESCROW', true),
    },
    
    // Development Configuration
    debugMode: parseBooleanEnv('VITE_DEBUG_MODE', false),
    enableConsoleLogs: parseBooleanEnv('VITE_ENABLE_CONSOLE_LOGS', false),
    txPollingInterval: parseNumberEnv('VITE_TX_POLLING_INTERVAL', 2000),
  };
}

/**
 * Contract identifier interface for Stacks contract calls
 */
export interface ContractIdentifier {
  address: string;
  name: string;
  fullIdentifier: string; // address.contract-name format
}

/**
 * All CineX contract identifiers organized by functionality
 */
export interface CineXContracts {
  mainHub: ContractIdentifier;
  crowdfunding: ContractIdentifier;
  escrow: ContractIdentifier;
  rewards: ContractIdentifier;
  coEp: ContractIdentifier;
}

/**
 * Network configuration for Stacks transactions
 */
export interface NetworkConfig {
  stacksNetwork: StacksNetwork;
  apiUrl: string;
  explorerUrl: string;
  networkName: 'testnet' | 'mainnet';
}

/**
 * Main configuration class that integrates environment variables
 */
class CineXConfig {
  private envConfig: EnvironmentConfig;
  private _contracts: CineXContracts | null = null;
  private _networkConfig: NetworkConfig | null = null;
  
  constructor() {
    this.envConfig = loadEnvironmentConfig();
    
    // Log configuration in debug mode
    if (this.envConfig.debugMode && this.envConfig.enableConsoleLogs) {
      console.log('🔧 CineX Configuration Loaded:', {
        network: this.envConfig.network,
        features: this.envConfig.features,
        contractsConfigured: this.areContractsConfigured(),
      });
    }
  }
  
  /**
   * Get current environment configuration
   */
  get environment(): EnvironmentConfig {
    return this.envConfig;
  }
  
  /**
   * Check if contract addresses are properly configured
   */
  areContractsConfigured(): boolean {
    return !!(
      this.envConfig.mainHubContractAddress &&
      this.envConfig.crowdfundingContractAddress &&
      this.envConfig.escrowContractAddress &&
      this.envConfig.rewardsContractAddress &&
      this.envConfig.coEpContractAddress
    );
  }
  
  /**
   * Get network configuration for Stacks SDK
   */
  getNetworkConfig(): NetworkConfig {
    if (!this._networkConfig) {
      const stacksNetwork = this.envConfig.network === 'mainnet' 
        ? { ...STACKS_MAINNET, coreApiUrl: this.envConfig.stacksApiUrl }
        : { ...STACKS_TESTNET, coreApiUrl: this.envConfig.stacksApiUrl };
      
      this._networkConfig = {
        stacksNetwork,
        apiUrl: this.envConfig.stacksApiUrl,
        explorerUrl: this.envConfig.explorerUrl,
        networkName: this.envConfig.network,
      };
    }
    
    return this._networkConfig;
  }
  
  /**
   * Get all contract identifiers
   */
  getContracts(): CineXContracts {
    if (!this._contracts) {
      if (!this.areContractsConfigured()) {
        throw new Error(
          'Contract addresses not configured. Please set contract addresses in .env file or deploy contracts first.'
        );
      }
      
      this._contracts = {
        mainHub: this.createContractIdentifier(
          this.envConfig.mainHubContractAddress,
          this.envConfig.mainHubContractName
        ),
        crowdfunding: this.createContractIdentifier(
          this.envConfig.crowdfundingContractAddress,
          this.envConfig.crowdfundingContractName
        ),
        escrow: this.createContractIdentifier(
          this.envConfig.escrowContractAddress,
          this.envConfig.escrowContractName
        ),
        rewards: this.createContractIdentifier(
          this.envConfig.rewardsContractAddress,
          this.envConfig.rewardsContractName
        ),
        coEp: this.createContractIdentifier(
          this.envConfig.coEpContractAddress,
          this.envConfig.coEpContractName
        ),
      };
    }
    
    return this._contracts;
  }
  
  /**
   * Get specific contract identifier by name
   */
  getContract(contractName: keyof CineXContracts): ContractIdentifier {
    const contracts = this.getContracts();
    return contracts[contractName];
  }
  
  /**
   * Switch network (for testing and development)
   */
  switchNetwork(network: 'testnet' | 'mainnet'): void {
    this.envConfig.network = network;
    
    // Update API URL based on network
    if (network === 'mainnet') {
      this.envConfig.stacksApiUrl = 'https://api.stacks.co';
    } else {
      this.envConfig.stacksApiUrl = 'https://api.testnet.hiro.so';
    }
    
    // Reset cached configurations
    this._networkConfig = null;
    this._contracts = null;
    
    if (this.envConfig.debugMode && this.envConfig.enableConsoleLogs) {
      console.log(`🔄 Switched to ${network} network`);
    }
  }
  
  /**
   * Get transaction explorer URL
   */
  getExplorerUrl(txId?: string): string {
    const baseUrl = this.envConfig.explorerUrl;
    return txId ? `${baseUrl}/txid/${txId}?chain=${this.envConfig.network}` : baseUrl;
  }
  
  /**
   * Get address explorer URL
   */
  getAddressExplorerUrl(address: string): string {
    return `${this.envConfig.explorerUrl}/address/${address}?chain=${this.envConfig.network}`;
  }
  
  /**
   * Check if a feature is enabled
   */
  isFeatureEnabled(feature: keyof EnvironmentConfig['features']): boolean {
    return this.envConfig.features[feature];
  }
  
  /**
   * Validate contract address format
   */
  validateContractAddress(address: string): boolean {
    // Stacks addresses start with 'S' followed by specific patterns
    const stacksAddressRegex = /^S[TP][0-9A-Z]{38,40}$/;
    return stacksAddressRegex.test(address);
  }
  
  /**
   * Create contract identifier with validation
   */
  private createContractIdentifier(address: string, name: string): ContractIdentifier {
    if (!address) {
      throw new Error(`Contract address for ${name} is not configured`);
    }
    
    if (!this.validateContractAddress(address)) {
      console.warn(`Invalid contract address format: ${address} for contract ${name}`);
    }
    
    return {
      address,
      name,
      fullIdentifier: `${address}.${name}`,
    };
  }
  
  /**
   * Get development mode utilities
   */
  getDevelopmentUtils() {
    return {
      isDebugMode: this.envConfig.debugMode,
      shouldLog: this.envConfig.enableConsoleLogs,
      txPollingInterval: this.envConfig.txPollingInterval,
      walletTimeout: this.envConfig.walletTimeout,
      transactionTimeout: this.envConfig.transactionTimeout,
    };
  }
}

// Export singleton instance
export const cineXConfig = new CineXConfig();

// Export types for external use (avoiding conflicts with interface declarations above)
export { type EnvironmentConfig, type ContractIdentifier as ContractId, type CineXContracts as Contracts, type NetworkConfig as NetConfig };

// Export helper functions
export const {
  environment,
  getNetworkConfig,
  getContracts,
  getContract,
  switchNetwork,
  getExplorerUrl,
  getAddressExplorerUrl,
  isFeatureEnabled,
  validateContractAddress,
  areContractsConfigured,
  getDevelopmentUtils,
} = cineXConfig;

// Export network instances for direct use
export const getStacksNetwork = () => cineXConfig.getNetworkConfig().stacksNetwork;

/**
 * Utility function to update contract addresses (for deployment scripts)
 */
export const updateContractAddresses = (newAddresses: Partial<{
  mainHub: string;
  crowdfunding: string;
  escrow: string;
  rewards: string;
  coEp: string;
}>) => {
  const env = cineXConfig.environment;
  
  if (newAddresses.mainHub) env.mainHubContractAddress = newAddresses.mainHub;
  if (newAddresses.crowdfunding) env.crowdfundingContractAddress = newAddresses.crowdfunding;
  if (newAddresses.escrow) env.escrowContractAddress = newAddresses.escrow;
  if (newAddresses.rewards) env.rewardsContractAddress = newAddresses.rewards;
  if (newAddresses.coEp) env.coEpContractAddress = newAddresses.coEp;
  
  // Reset cached contracts to pick up new addresses
  cineXConfig['_contracts'] = null;
  
  if (env.debugMode && env.enableConsoleLogs) {
    console.log('📝 Contract addresses updated:', newAddresses);
  }
};