// Network utilities and environment configuration types for CineX
// Provides network switching, deployment detection, and development tools

import { cineXConfig } from './contracts';

/**
 * Network detection and switching utilities
 */
export class NetworkManager {
  private static instance: NetworkManager;
  private currentNetwork: 'testnet' | 'mainnet';
  private networkChangeListeners: Array<(network: 'testnet' | 'mainnet') => void> = [];
  
  private constructor() {
    this.currentNetwork = cineXConfig.environment.network;
  }
  
  static getInstance(): NetworkManager {
    if (!NetworkManager.instance) {
      NetworkManager.instance = new NetworkManager();
    }
    return NetworkManager.instance;
  }
  
  /**
   * Get current active network
   */
  getCurrentNetwork(): 'testnet' | 'mainnet' {
    return this.currentNetwork;
  }
  
  /**
   * Switch to a different network
   */
  async switchNetwork(network: 'testnet' | 'mainnet'): Promise<void> {
    if (this.currentNetwork === network) {
      return; // Already on the requested network
    }
    
    const previousNetwork = this.currentNetwork;
    this.currentNetwork = network;
    
    try {
      // Update the global configuration
      cineXConfig.switchNetwork(network);
      
      // Notify listeners of the network change
      this.networkChangeListeners.forEach(listener => {
        try {
          listener(network);
        } catch (error) {
          console.error('Error in network change listener:', error);
        }
      });
      
      if (cineXConfig.environment.debugMode) {
        console.log(`🔄 Network switched from ${previousNetwork} to ${network}`);
      }
    } catch (error) {
      // Rollback on error
      this.currentNetwork = previousNetwork;
      throw new Error(`Failed to switch network to ${network}: ${error}`);
    }
  }
  
  /**
   * Add listener for network changes
   */
  addNetworkChangeListener(listener: (network: 'testnet' | 'mainnet') => void): () => void {
    this.networkChangeListeners.push(listener);
    
    // Return unsubscribe function
    return () => {
      const index = this.networkChangeListeners.indexOf(listener);
      if (index > -1) {
        this.networkChangeListeners.splice(index, 1);
      }
    };
  }
  
  /**
   * Get network-specific configuration
   */
  getNetworkInfo() {
    const config = cineXConfig.getNetworkConfig();
    return {
      name: this.currentNetwork,
      apiUrl: config.apiUrl,
      explorerUrl: config.explorerUrl,
      chainId: this.currentNetwork === 'mainnet' ? 1 : 2147483648, // Stacks chain IDs
    };
  }
  
  /**
   * Check if contracts are deployed on current network
   */
  async checkContractDeployment(): Promise<{
    deployed: boolean;
    missingContracts: string[];
    networkInfo: {
      name: 'testnet' | 'mainnet';
      apiUrl: string;
      explorerUrl: string;
      chainId: number;
    };
  }> {
    const networkInfo = this.getNetworkInfo();
    const missingContracts: string[] = [];
    
    try {
      const contracts = cineXConfig.getContracts();
      
      // Check each contract by attempting to get contract info
      const contractChecks = Object.entries(contracts).map(async ([name, contract]) => {
        try {
          const response = await fetch(
            `${networkInfo.apiUrl}/v1/contracts/interface/${contract.address}/${contract.name}`
          );
          
          if (!response.ok) {
            missingContracts.push(name);
            return false;
          }
          
          return true;
        } catch (error) {
          missingContracts.push(name);
          return false;
        }
      });
      
      const results = await Promise.all(contractChecks);
      const deployed = results.every(Boolean);
      
      return {
        deployed,
        missingContracts,
        networkInfo
      };
    } catch (error) {
      // If we can't get contracts (not configured), assume not deployed
      return {
        deployed: false,
        missingContracts: ['All contracts (addresses not configured)'],
        networkInfo
      };
    }
  }
}

/**
 * Environment configuration validator
 */
export class EnvironmentValidator {
  /**
   * Validate all environment configuration
   */
  static validateConfiguration(): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];
    const env = cineXConfig.environment;
    
    // Check required configuration
    if (!env.network || !['testnet', 'mainnet'].includes(env.network)) {
      errors.push('Invalid or missing VITE_NETWORK. Must be "testnet" or "mainnet"');
    }
    
    if (!env.stacksApiUrl) {
      errors.push('Missing VITE_STACKS_API_URL');
    } else if (!this.isValidUrl(env.stacksApiUrl)) {
      errors.push('Invalid VITE_STACKS_API_URL format');
    }
    
    if (!env.explorerUrl) {
      warnings.push('Missing VITE_EXPLORER_URL - explorer links will not work');
    } else if (!this.isValidUrl(env.explorerUrl)) {
      warnings.push('Invalid VITE_EXPLORER_URL format');
    }
    
    // Check contract configuration
    if (!cineXConfig.areContractsConfigured()) {
      warnings.push('Contract addresses not configured - using mock data only');
    } else {
      // Validate contract address formats
      const contracts = [
        { name: 'Main Hub', address: env.mainHubContractAddress },
        { name: 'Crowdfunding', address: env.crowdfundingContractAddress },
        { name: 'Escrow', address: env.escrowContractAddress },
        { name: 'Rewards', address: env.rewardsContractAddress },
        { name: 'Co-EP', address: env.coEpContractAddress },
      ];
      
      contracts.forEach(contract => {
        if (!cineXConfig.validateContractAddress(contract.address)) {
          warnings.push(`Invalid ${contract.name} contract address: ${contract.address}`);
        }
      });
    }
    
    // Check wallet configuration
    if (!env.supportedWallets || env.supportedWallets.length === 0) {
      warnings.push('No supported wallets configured');
    }
    
    if (env.walletTimeout < 5000) {
      warnings.push('Wallet timeout is very low - users may experience connection issues');
    }
    
    if (env.transactionTimeout < 30000) {
      warnings.push('Transaction timeout is very low - transactions may fail');
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }
  
  /**
   * Validate URL format
   */
  private static isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }
  
  /**
   * Get configuration summary for debugging
   */
  static getConfigurationSummary(): {
    network: string;
    contractsConfigured: boolean;
    featuresEnabled: string[];
    developmentMode: boolean;
  } {
    const env = cineXConfig.environment;
    
    const featuresEnabled = Object.entries(env.features)
      .filter(([, enabled]) => enabled)
      .map(([feature]) => feature);
    
    return {
      network: env.network,
      contractsConfigured: cineXConfig.areContractsConfigured(),
      featuresEnabled,
      developmentMode: env.debugMode
    };
  }
}

/**
 * Development utilities for contract deployment and testing
 */
export class DevelopmentUtils {
  /**
   * Generate deployment configuration for current environment
   */
  static generateDeploymentConfig(): {
    network: string;
    deployer: string; // Placeholder - should be set by deployment script
    contracts: Array<{
      name: string;
      contractName: string;
      source: string;
    }>;
    environment: Record<string, string>;
  } {
    const env = cineXConfig.environment;
    
    return {
      network: env.network,
      deployer: 'SET_DEPLOYER_ADDRESS', // To be replaced during deployment
      contracts: [
        {
          name: 'Main Hub',
          contractName: env.mainHubContractName,
          source: 'contracts/CineX-project.clar'
        },
        {
          name: 'Crowdfunding Module',
          contractName: env.crowdfundingContractName,
          source: 'contracts/crowdfunding-module.clar'
        },
        {
          name: 'Escrow Module',
          contractName: env.escrowContractName,
          source: 'contracts/escrow-module.clar'
        },
        {
          name: 'Rewards Module',
          contractName: env.rewardsContractName,
          source: 'contracts/rewards-module.clar'
        },
        {
          name: 'Co-EP Module',
          contractName: env.coEpContractName,
          source: 'contracts/Co-EP-rotating-fundings.clar'
        }
      ],
      environment: {
        VITE_NETWORK: env.network,
        VITE_STACKS_API_URL: env.stacksApiUrl,
        VITE_EXPLORER_URL: env.explorerUrl,
        VITE_APP_NAME: env.appName,
        VITE_APP_VERSION: env.appVersion
      }
    };
  }
  
  /**
   * Generate environment file template
   */
  static generateEnvTemplate(network: 'testnet' | 'mainnet' = 'testnet'): string {
    const template = `# CineX Platform Environment Configuration
# Network Configuration
VITE_NETWORK=${network}
VITE_STACKS_API_URL=${network === 'mainnet' ? 'https://api.stacks.co' : 'https://api.testnet.hiro.so'}
VITE_EXPLORER_URL=https://explorer.stacks.co

# Contract Addresses (set these after deployment)
VITE_MAIN_HUB_CONTRACT_ADDRESS=
VITE_MAIN_HUB_CONTRACT_NAME=CineX-project

VITE_CROWDFUNDING_CONTRACT_ADDRESS=
VITE_CROWDFUNDING_CONTRACT_NAME=crowdfunding-module

VITE_ESCROW_CONTRACT_ADDRESS=
VITE_ESCROW_CONTRACT_NAME=escrow-module

VITE_REWARDS_CONTRACT_ADDRESS=
VITE_REWARDS_CONTRACT_NAME=rewards-module

VITE_CO_EP_CONTRACT_ADDRESS=
VITE_CO_EP_CONTRACT_NAME=Co-EP-rotating-fundings

# Application Configuration
VITE_APP_NAME=CineX
VITE_APP_VERSION=1.0.0
VITE_APP_URL=${network === 'mainnet' ? 'https://cinex.app' : 'http://localhost:5173'}

# Wallet Configuration
VITE_SUPPORTED_WALLETS=hiro,leather,xverse
VITE_WALLET_TIMEOUT=30000
VITE_TRANSACTION_TIMEOUT=180000

# Feature Flags
VITE_FEATURE_CO_EP_POOLS=true
VITE_FEATURE_NFT_REWARDS=true
VITE_FEATURE_FILM_VERIFICATION=true
VITE_FEATURE_ESCROW=true

# Development Configuration
VITE_DEBUG_MODE=${network === 'testnet' ? 'true' : 'false'}
VITE_ENABLE_CONSOLE_LOGS=${network === 'testnet' ? 'true' : 'false'}

VITE_TX_POLLING_INTERVAL=2000
`;
    
    return template;
  }
  
  /**
   * Update .env file with deployed contract addresses
   */
  static updateEnvWithContractAddresses(contractAddresses: Record<string, string>): string {
    const updates: string[] = [];
    
    Object.entries(contractAddresses).forEach(([contractKey, address]) => {
      switch (contractKey) {
        case 'mainHub':
          updates.push(`VITE_MAIN_HUB_CONTRACT_ADDRESS=${address}`);
          break;
        case 'crowdfunding':
          updates.push(`VITE_CROWDFUNDING_CONTRACT_ADDRESS=${address}`);
          break;
        case 'escrow':
          updates.push(`VITE_ESCROW_CONTRACT_ADDRESS=${address}`);
          break;
        case 'rewards':
          updates.push(`VITE_REWARDS_CONTRACT_ADDRESS=${address}`);
          break;
        case 'coEp':
          updates.push(`VITE_CO_EP_CONTRACT_ADDRESS=${address}`);
          break;
        default:
          console.warn(`Unknown contract key: ${contractKey}`);
      }
    });
    
    return updates.join('\n');
  }
  
  /**
   * Validate current environment for development
   */
  static validateDevelopmentEnvironment(): {
    isReady: boolean;
    issues: string[];
    recommendations: string[];
  } {
    const validation = EnvironmentValidator.validateConfiguration();
    const issues = [...validation.errors];
    const recommendations: string[] = [];
    
    // Development-specific checks
    const env = cineXConfig.environment;
    
    if (!env.debugMode) {
      recommendations.push('Enable VITE_DEBUG_MODE=true for development');
    }
    
    if (!env.enableConsoleLogs) {
      recommendations.push('Enable VITE_ENABLE_CONSOLE_LOGS=true for development debugging');
    }
    
    if (!cineXConfig.areContractsConfigured()) {
      issues.push('Contract addresses not configured - deploy contracts first');
      recommendations.push('Run deployment script to set contract addresses');
    }
    
    if (env.network === 'mainnet' && env.debugMode) {
      recommendations.push('Disable debug mode for mainnet deployment');
    }
    
    return {
      isReady: issues.length === 0,
      issues,
      recommendations: [...recommendations, ...validation.warnings]
    };
  }
}

// Export singleton instances
export const networkManager = NetworkManager.getInstance();

// Export utility functions
export const {
  validateConfiguration,
  getConfigurationSummary
} = EnvironmentValidator;

export const {
  generateDeploymentConfig,
  generateEnvTemplate,
  updateEnvWithContractAddresses,
  validateDevelopmentEnvironment
} = DevelopmentUtils;