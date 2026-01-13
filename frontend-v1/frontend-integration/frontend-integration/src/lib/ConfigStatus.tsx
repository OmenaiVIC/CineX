// Environment configuration React component for development and debugging
// Shows current configuration status and allows network switching

import { useState, useEffect } from 'react';
import { networkManager, validateConfiguration, getConfigurationSummary } from './networkUtils';
import { cineXConfig } from './contracts';
import styles from '../styles/components/ConfigStatus.module.css';

interface ConfigStatusProps {
  showDetails?: boolean;
  allowNetworkSwitch?: boolean;
}

/**
 * Development component to show environment configuration status
 * Only renders in development/debug mode
 */
export function ConfigStatus({ showDetails = false, allowNetworkSwitch = false }: ConfigStatusProps) {
  const [currentNetwork, setCurrentNetwork] = useState<'testnet' | 'mainnet'>(
    networkManager.getCurrentNetwork()
  );
  const [configSummary, setConfigSummary] = useState(getConfigurationSummary());
  const [validation, setValidation] = useState(validateConfiguration());
  const [isExpanded, setIsExpanded] = useState(showDetails);
  const [isLoading, setIsLoading] = useState(false);
  
  // Only show in debug mode
  const { isDebugMode } = cineXConfig.getDevelopmentUtils();
  if (!isDebugMode) {
    return null;
  }
  
  useEffect(() => {
    // Listen for network changes
    const unsubscribe = networkManager.addNetworkChangeListener((network) => {
      setCurrentNetwork(network);
      setConfigSummary(getConfigurationSummary());
      setValidation(validateConfiguration());
    });
    
    return unsubscribe;
  }, []);
  
  const handleNetworkSwitch = async (network: 'testnet' | 'mainnet') => {
    if (!allowNetworkSwitch) return;
    
    setIsLoading(true);
    try {
      await networkManager.switchNetwork(network);
    } catch (error) {
      console.error('Failed to switch network:', error);
      alert(`Failed to switch to ${network}: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  const getStatusColor = () => {
    if (!validation.isValid) return '#ef4444'; // red
    if (validation.warnings.length > 0) return '#f59e0b'; // amber
    if (!configSummary.contractsConfigured) return '#f59e0b'; // amber
    return '#10b981'; // green
  };
  
  const getStatusText = () => {
    if (!validation.isValid) return 'Configuration Error';
    if (!configSummary.contractsConfigured) return 'Contracts Not Configured';
    if (validation.warnings.length > 0) return 'Configuration Warning';
    return 'Configuration OK';
  };
  
  return (
    <div className={`${styles.container} ${isExpanded ? styles.expanded : styles.collapsed}`}>
      {/* Header */}
      <div 
        className={`${styles.header} ${isExpanded ? styles.headerExpanded : ''}`}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className={styles.statusSection}>
          <div 
            className={styles.statusIndicator}
            style={{ backgroundColor: getStatusColor() }}
          />
          <span className={styles.title}>CineX Config</span>
        </div>
        <span className={`${styles.expandArrow} ${isExpanded ? styles.expandArrowRotated : ''}`}>
          ▼
        </span>
      </div>
      
      {/* Basic Info (Always Visible) */}
      {!isExpanded && (
        <div className={styles.basicInfo}>
          {currentNetwork.toUpperCase()} • {getStatusText()}
        </div>
      )}
      
      {/* Expanded Details */}
      {isExpanded && (
        <div>
          {/* Network Section */}
          <div className={styles.section}>
            <div className={styles.sectionTitle}>Network</div>
            <div className={styles.networkButtons}>
              {(['testnet', 'mainnet'] as const).map((network) => (
                <button
                  key={network}
                  onClick={() => handleNetworkSwitch(network)}
                  disabled={!allowNetworkSwitch || isLoading || currentNetwork === network}
                  className={`${styles.networkButton} ${
                    currentNetwork === network ? styles.networkButtonActive : styles.networkButtonInactive
                  } ${
                    isLoading || (!allowNetworkSwitch && currentNetwork !== network) ? styles.networkButtonDisabled : ''
                  }`}
                >
                  {network.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
          
          {/* Status Section */}
          <div className={styles.section}>
            <div className={styles.sectionTitle}>Status</div>
            <div className={styles.statusText} style={{ color: getStatusColor() }}>
              {getStatusText()}
            </div>
          </div>
          
          {/* Configuration Summary */}
          <div className={styles.section}>
            <div className={styles.sectionTitle}>Configuration</div>
            <div className={styles.configList}>
              <div>Contracts: {configSummary.contractsConfigured ? '✅' : '❌'}</div>
              <div>Features: {configSummary.featuresEnabled.length} enabled</div>
              <div>Debug Mode: {configSummary.developmentMode ? '✅' : '❌'}</div>
            </div>
          </div>
          
          {/* Errors and Warnings */}
          {(validation.errors.length > 0 || validation.warnings.length > 0) && (
            <div>
              <div className={styles.sectionTitle}>Issues</div>
              <div className={styles.issuesList}>
                {validation.errors.map((error, index) => (
                  <div key={`error-${index}`} className={styles.errorItem}>
                    ❌ {error}
                  </div>
                ))}
                {validation.warnings.map((warning, index) => (
                  <div key={`warning-${index}`} className={styles.warningItem}>
                    ⚠️ {warning}
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Contract Addresses (if configured) */}
          {configSummary.contractsConfigured && (
            <div className={styles.contractsSection}>
              <div className={styles.sectionTitle}>Contracts</div>
              <div className={styles.contractsHint}>
                Click to view in explorer
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Hook to access configuration and network state
 */
export function useConfigStatus() {
  const [currentNetwork, setCurrentNetwork] = useState(networkManager.getCurrentNetwork());
  const [configSummary, setConfigSummary] = useState(getConfigurationSummary());
  
  useEffect(() => {
    const unsubscribe = networkManager.addNetworkChangeListener((network) => {
      setCurrentNetwork(network);
      setConfigSummary(getConfigurationSummary());
    });
    
    return unsubscribe;
  }, []);
  
  return {
    currentNetwork,
    configSummary,
    validation: validateConfiguration(),
    networkManager,
    cineXConfig
  };
}

/**
 * Environment configuration panel for development
 */
export function DevConfigPanel() {
  const { isDebugMode } = cineXConfig.getDevelopmentUtils();
  
  if (!isDebugMode) {
    return null;
  }
  
  return (
    <ConfigStatus 
      showDetails={true}
      allowNetworkSwitch={true}
    />
  );
}