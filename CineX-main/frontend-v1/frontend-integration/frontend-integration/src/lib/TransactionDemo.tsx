// Transaction Demo Component
// Demonstrates the transaction status tracking system with interactive examples

import React, { useState } from 'react';
import { 
  TransactionStatusBadge,
  useTransactionNotifications,
  TransactionToast
} from './TransactionStatusUI';
import { 
  DemoTransactions, 
  useDemoWallet,
  type CampaignCreateParams,
  type PoolCreateParams
} from './demoTransactions';
import styles from '../styles/components/TransactionDemo.module.css';

/**
 * Demo component showing transaction tracking features
 */
export const TransactionDemo: React.FC = () => {
  const [activeDemo, setActiveDemo] = useState<string>('wallet');
  const { toasts, showToast, hideToast, clearAllToasts } = useTransactionNotifications();
  const wallet = useDemoWallet();
  
  // Form states for different transaction types
  const [campaignForm, setCampaignForm] = useState<CampaignCreateParams>({
    title: 'My Independent Film',
    description: 'A compelling story about...',
    targetAmount: 50000,
    duration: 30,
    category: 'Drama'
  });
  
  const [poolForm, setPoolForm] = useState<PoolCreateParams>({
    name: 'Indie Filmmakers Pool',
    description: 'A collaborative pool for independent filmmakers',
    bondAmount: 1000,
    maxMembers: 10,
    duration: 90
  });
  
  const [contributeForm, setContributeForm] = useState({
    campaignId: 1,
    amount: 5000
  });

  const handleCampaignCreate = async () => {
    try {
      const txId = await DemoTransactions.createCampaign(campaignForm);
      const transaction = { 
        id: txId, 
        title: 'Create Campaign',
        status: 'pending' as const,
        userMessage: 'Starting campaign creation...',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        retryCount: 0,
        canRetry: true,
        maxRetries: 3,
        type: 'campaign-create' as const,
        description: `Creating campaign: ${campaignForm.title}`
      };
      showToast(transaction);
    } catch (error) {
      console.error('Failed to create campaign:', error);
    }
  };

  const handleContribute = async () => {
    try {
      const txId = await DemoTransactions.contributeToCampaign(
        contributeForm.campaignId, 
        contributeForm.amount
      );
      const transaction = { 
        id: txId,
        title: 'Contribute to Campaign',
        status: 'pending' as const,
        userMessage: 'Processing contribution...',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        retryCount: 0,
        canRetry: true,
        maxRetries: 3,
        type: 'campaign-contribute' as const,
        description: `Contributing ${contributeForm.amount} μSTX`,
        amount: contributeForm.amount.toString()
      };
      showToast(transaction);
    } catch (error) {
      console.error('Failed to contribute:', error);
    }
  };

  const handlePoolCreate = async () => {
    try {
      const txId = await DemoTransactions.createPool(poolForm);
      const transaction = { 
        id: txId,
        title: 'Create Pool',
        status: 'pending' as const,
        userMessage: 'Creating Co-EP pool...',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        retryCount: 0,
        canRetry: true,
        maxRetries: 3,
        type: 'pool-create' as const,
        description: `Creating pool: ${poolForm.name}`
      };
      showToast(transaction);
    } catch (error) {
      console.error('Failed to create pool:', error);
    }
  };

  const renderWalletDemo = () => (
    <div className={styles.walletDemo}>
      <div>
        <h3 className={styles.sectionTitle}>🔗 Wallet Connection</h3>
        <div className={styles.walletContent}>
          <div className={styles.walletStatus}>
            <div className={styles.statusBox}>
              <p className={styles.statusLabel}>🔌 Connection Status:</p>
              <TransactionStatusBadge 
                status={wallet.isConnected ? 'success' : 'idle'} 
              />
            </div>
            {wallet.address && (
              <div className={styles.addressBox}>
                <p className={styles.statusLabel}>📍 Address:</p>
                <p className={styles.addressDisplay}>
                  {wallet.address.substring(0, 20)}...
                </p>
              </div>
            )}
          </div>
          
          <div className={styles.buttonGroup}>
            {!wallet.isConnected ? (
              <button
                onClick={wallet.connect}
                disabled={wallet.isConnecting}
                className={styles.primaryButton}
              >
                {wallet.isConnecting ? 'Connecting...' : 'Connect Wallet'}
              </button>
            ) : (
              <button
                onClick={wallet.disconnect}
                className={styles.secondaryButton}
              >
                Disconnect
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  const renderCampaignDemo = () => (
    <div className={styles.demoSection}>
      <div>
        <h3 className={styles.sectionTitle}>Campaign Creation</h3>
        <div className={styles.demoContainer}>
          <div className={styles.formGrid}>
            <div className={styles.formField}>
              <label className={styles.formLabel}>
                Campaign Title
              </label>
              <input
                type="text"
                value={campaignForm.title}
                onChange={(e) => setCampaignForm(prev => ({ ...prev, title: e.target.value }))}
                className={styles.formInput}
              />
            </div>
            
            <div className={styles.formField}>
              <label className={styles.formLabel}>
                Target Amount (μSTX)
              </label>
              <input
                type="number"
                value={campaignForm.targetAmount}
                onChange={(e) => setCampaignForm(prev => ({ ...prev, targetAmount: parseInt(e.target.value) || 0 }))}
                className={styles.formInput}
              />
            </div>
            
            <div className={styles.formField}>
              <label className={styles.formLabel}>
                Category
              </label>
              <select
                value={campaignForm.category}
                onChange={(e) => setCampaignForm(prev => ({ ...prev, category: e.target.value }))}
                className={styles.formInput}
              >
                <option value="Drama">Drama</option>
                <option value="Comedy">Comedy</option>
                <option value="Documentary">Documentary</option>
                <option value="Horror">Horror</option>
                <option value="Sci-Fi">Sci-Fi</option>
              </select>
            </div>
            
            <div className={styles.formField}>
              <label className={styles.formLabel}>
                Duration (days)
              </label>
              <input
                type="number"
                value={campaignForm.duration}
                onChange={(e) => setCampaignForm(prev => ({ ...prev, duration: parseInt(e.target.value) || 0 }))}
                className={styles.formInput}
              />
            </div>
          </div>
          
          <div className={styles.formField}>
            <label className={styles.formLabel}>
              Description
            </label>
            <textarea
              value={campaignForm.description}
              onChange={(e) => setCampaignForm(prev => ({ ...prev, description: e.target.value }))}
              rows={3}
              className={styles.formTextarea}
            />
          </div>
          
          <button
            onClick={handleCampaignCreate}
            disabled={!wallet.isConnected}
            className={styles.primaryButton}
          >
            Create Campaign (Demo)
          </button>
          
          {!wallet.isConnected && (
            <p className={styles.warningText}>Connect wallet to create campaign</p>
          )}
        </div>
      </div>
    </div>
  );

  const renderContributeDemo = () => (
    <div className={styles.demoSection}>
      <div>
        <h3 className={styles.sectionTitle}>Campaign Contribution</h3>
        <div className={styles.demoContainer}>
          <div className={styles.formGrid}>
            <div className={styles.formField}>
              <label className={styles.formLabel}>
                Campaign ID
              </label>
              <input
                type="number"
                value={contributeForm.campaignId}
                onChange={(e) => setContributeForm(prev => ({ ...prev, campaignId: parseInt(e.target.value) || 1 }))}
                className={styles.formInput}
              />
            </div>
            
            <div className={styles.formField}>
              <label className={styles.formLabel}>
                Amount (μSTX)
              </label>
              <input
                type="number"
                value={contributeForm.amount}
                onChange={(e) => setContributeForm(prev => ({ ...prev, amount: parseInt(e.target.value) || 0 }))}
                className={styles.formInput}
              />
            </div>
          </div>
          
          <button
            onClick={handleContribute}
            disabled={!wallet.isConnected}
            className={styles.primaryButton}
          >
            Contribute (Demo)
          </button>
          
          {!wallet.isConnected && (
            <p className={styles.warningText}>Connect wallet to contribute</p>
          )}
        </div>
      </div>
    </div>
  );

  const renderPoolDemo = () => (
    <div className={styles.demoSection}>
      <div>
        <h3 className={styles.sectionTitle}>Co-EP Pool Creation</h3>
        <div className={styles.demoContainer}>
          <div className={styles.formGrid}>
            <div className={styles.formField}>
              <label className={styles.formLabel}>
                Pool Name
              </label>
              <input
                type="text"
                value={poolForm.name}
                onChange={(e) => setPoolForm(prev => ({ ...prev, name: e.target.value }))}
                className={styles.formInput}
              />
            </div>
            
            <div className={styles.formField}>
              <label className={styles.formLabel}>
                Bond Amount (μSTX)
              </label>
              <input
                type="number"
                value={poolForm.bondAmount}
                onChange={(e) => setPoolForm(prev => ({ ...prev, bondAmount: parseInt(e.target.value) || 0 }))}
                className={styles.formInput}
              />
            </div>
            
            <div className={styles.formField}>
              <label className={styles.formLabel}>
                Max Members
              </label>
              <input
                type="number"
                value={poolForm.maxMembers}
                onChange={(e) => setPoolForm(prev => ({ ...prev, maxMembers: parseInt(e.target.value) || 0 }))}
                className={styles.formInput}
              />
            </div>
            
            <div className={styles.formField}>
              <label className={styles.formLabel}>
                Duration (days)
              </label>
              <input
                type="number"
                value={poolForm.duration}
                onChange={(e) => setPoolForm(prev => ({ ...prev, duration: parseInt(e.target.value) || 0 }))}
                className={styles.formInput}
              />
            </div>
          </div>
          
          <div className={styles.formField}>
            <label className={styles.formLabel}>
              Description
            </label>
            <textarea
              value={poolForm.description}
              onChange={(e) => setPoolForm(prev => ({ ...prev, description: e.target.value }))}
              rows={3}
              className={styles.formTextarea}
            />
          </div>
          
          <button
            onClick={handlePoolCreate}
            disabled={!wallet.isConnected}
            className={styles.primaryButton}
          >
            Create Pool (Demo)
          </button>
          
          {!wallet.isConnected && (
            <p className={styles.warningText}>Connect wallet to create pool</p>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className={styles.container}>
      <div className={styles.wrapper}>
        {/* Header */}
        <div className={styles.header}>
          <h1 className={styles.title}>
            🎬 CineX Transaction Demo
          </h1>
          <p className={styles.subtitle}>
            📊 Interactive demonstration of the transaction status tracking system
          </p>
        
          {toasts.length > 0 && (
            <button
              onClick={clearAllToasts}
              className={styles.clearButton}
            >
              Clear All Notifications ({toasts.length})
            </button>
          )}
        </div>

        {/* Navigation */}
        <div className={styles.navigation}>
          {[
            { id: 'wallet', label: 'Wallet', icon: '🔗' },
            { id: 'campaign', label: 'Campaign', icon: '🎬' },
            { id: 'contribute', label: 'Contribute', icon: '💰' },
            { id: 'pool', label: 'Co-EP Pool', icon: '🏊‍♂️' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveDemo(tab.id)}
              className={`${styles.tabButton} ${
                activeDemo === tab.id ? styles.tabButtonActive : ''
              }`}
            >
              <span className={styles.tabIcon}>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Demo Content */}
        <div className={styles.content}>
          {activeDemo === 'wallet' && renderWalletDemo()}
          {activeDemo === 'campaign' && renderCampaignDemo()}
          {activeDemo === 'contribute' && renderContributeDemo()}
          {activeDemo === 'pool' && renderPoolDemo()}
        </div>

        {/* Instructions */}
        <div className={styles.instructions}>
          <h3 className={styles.instructionsTitle}>
            📋 How to Use This Demo
          </h3>
          <div className={styles.spaceY4}>
            <div className={styles.instructionItem}>
              🔗 1. Wallet: Connect the demo wallet to enable transactions
            </div>
            <div className={styles.instructionItem}>
              🎬 2. Campaign: Create a funding campaign and watch the multi-step progress
            </div>
            <div className={styles.instructionItem}>
              💰 3. Contribute: Contribute to a campaign with simple progress tracking
            </div>
            <div className={styles.instructionItem}>
              🏊‍♂️ 4. Co-EP Pool: Create a collaborative funding pool with step-by-step progress
            </div>
            <div className={styles.notification}>
              🔔 Watch for toast notifications in the top-right corner showing transaction status updates!
            </div>
          </div>
        </div>

        {/* Toast Notifications */}
        {toasts.map(transaction => (
          <TransactionToast
            key={transaction.id}
            transaction={transaction}
            onDismiss={() => hideToast(transaction.id)}
          />
        ))}
      </div>
    </div>
  );
};