// Enhanced Transaction Demo with Modal Integration
// Demonstrates the transaction confirmation modal with the existing transaction tracking system

import React, { useState } from 'react';
import styles from '../styles/components/EnhancedTransactionDemo.module.css';
import { 
  TransactionStatusBadge,
  useTransactionNotifications,
  TransactionToast
} from './TransactionStatusUI';
import { transactionTracker } from './transactionTracker';
import { 
  DemoTransactions, 
  useDemoWallet,
  type CampaignCreateParams,
  type PoolCreateParams
} from './demoTransactions';
import { 
  TransactionModal,
  useTransactionModal,
  TransactionTemplates,
  type TransactionConfirmationData
} from './TransactionModal';

/**
 * Enhanced demo component with modal integration
 */
export const EnhancedTransactionDemo: React.FC = () => {
  const [activeDemo, setActiveDemo] = useState<string>('wallet');
  const { toasts, showToast, hideToast, clearAllToasts } = useTransactionNotifications();
  const wallet = useDemoWallet();
  
  // Transaction modal hook
  const modal = useTransactionModal(async (data: TransactionConfirmationData) => {
    // Handle different transaction types
    switch (data.type) {
      case 'campaign-contribute':
        const campaignId = data.metadata?.campaignId as number || 1;
        const amount = parseInt(data.amount || '0');
        return await DemoTransactions.contributeToCampaign(campaignId, amount);
        
      case 'pool-join':
        const poolId = data.metadata?.poolId as number || 1;
        const bondAmount = data.metadata?.bondAmount as number || 1000;
        return await DemoTransactions.joinPool(poolId, bondAmount);
        
      case 'campaign-create':
        const campaignParams: CampaignCreateParams = {
          title: data.metadata?.campaignTitle as string || 'New Campaign',
          description: 'Campaign created via modal',
          targetAmount: data.metadata?.targetAmount as number || 50000,
          duration: 30,
          category: 'Drama'
        };
        return await DemoTransactions.createCampaign(campaignParams);
        
      case 'pool-create':
        const poolParams: PoolCreateParams = {
          name: data.metadata?.poolName as string || 'New Pool',
          description: 'Pool created via modal',
          bondAmount: data.metadata?.bondAmount as number || 1000,
          maxMembers: data.metadata?.maxMembers as number || 10,
          duration: 90
        };
        return await DemoTransactions.createPool(poolParams);
        
      default:
        throw new Error('Unsupported transaction type');
    }
  });

  // Form states
  const [contributeForm, setContributeForm] = useState({
    campaignId: 1,
    campaignTitle: 'Independent Film Project',
    amount: 5000
  });
  
  const [poolJoinForm, setPoolJoinForm] = useState({
    poolId: 1,
    poolName: 'Indie Filmmakers Collective',
    bondAmount: 2500
  });

  const [campaignCreateForm, setCampaignCreateForm] = useState({
    title: 'My Documentary Film',
    targetAmount: 75000
  });

  const [poolCreateForm, setPoolCreateForm] = useState({
    name: 'Documentary Pool',
    bondAmount: 1500,
    maxMembers: 8
  });

  // Modal handlers
  const handleContributeModal = () => {
    const confirmationData = TransactionTemplates.campaignContribution(
      contributeForm.campaignId,
      contributeForm.amount,
      contributeForm.campaignTitle
    );
    modal.openModal(confirmationData);
  };

  const handlePoolJoinModal = () => {
    const confirmationData = TransactionTemplates.poolJoin(
      poolJoinForm.poolId,
      poolJoinForm.bondAmount,
      poolJoinForm.poolName
    );
    modal.openModal(confirmationData);
  };

  const handleCampaignCreateModal = () => {
    const confirmationData = TransactionTemplates.campaignCreate(
      campaignCreateForm.title,
      campaignCreateForm.targetAmount
    );
    modal.openModal(confirmationData);
  };

  const handlePoolCreateModal = () => {
    const confirmationData = TransactionTemplates.poolCreate(
      poolCreateForm.name,
      poolCreateForm.bondAmount,
      poolCreateForm.maxMembers
    );
    modal.openModal(confirmationData);
  };

  // Direct transaction handlers (without modal)
  const handleDirectContribute = async () => {
    try {
      const txId = await DemoTransactions.contributeToCampaign(
        contributeForm.campaignId,
        contributeForm.amount
      );
      showNotification(txId);
    } catch (error) {
      console.error('Failed to contribute:', error);
    }
  };

  const showNotification = (txId: string) => {
    const transaction = transactionTracker.getTransaction(txId);
    if (transaction) {
      showToast(transaction);
    }
  };

  const renderWalletDemo = () => (
    <div className={styles.spaceY6}>
      <div className={styles.demoSection}>
        <h3 className={styles.demoTitle}>Wallet Connection Status</h3>
        <div className={styles.demoContainer}>
          <div className={styles.walletStatus}>
            <div className={styles.statusBox}>
              <p className={styles.statusLabel}>Status:</p>
              <TransactionStatusBadge 
                status={wallet.isConnected ? 'success' : 'idle'} 
              />
            </div>
            {wallet.address && (
              <div className={styles.addressBox}>
                <p className={styles.statusLabel}>Address:</p>
                <p className={styles.addressValue}>
                  {wallet.address.substring(0, 20)}...
                </p>
              </div>
            )}
          </div>
          
          <div className={styles.buttonContainer}>
            {!wallet.isConnected ? (
              <button
                onClick={wallet.connect}
                disabled={wallet.isConnecting}
                className={styles.primaryButton}
              >
                {wallet.isConnecting ? 'Connecting...' : 'Connect Demo Wallet'}
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

  const renderContributeDemo = () => (
    <div className={styles.spaceY6}>
      <div className={styles.demoSection}>
        <h3 className={styles.demoTitle}>💰 Campaign Contribution</h3>
        <div className={styles.demoContainer}>
          <div className={styles.formGrid}>
            <div className={styles.formField}>
              <label className={styles.formLabel}>
                🎬 Campaign Title
              </label>
              <input
                type="text"
                value={contributeForm.campaignTitle}
                onChange={(e) => setContributeForm(prev => ({ ...prev, campaignTitle: e.target.value }))}
                className={styles.formInput}
              />
            </div>
            
            <div className={styles.formField}>
              <label className={styles.formLabel}>
                🔢 Campaign ID
              </label>
              <input
                type="number"
                value={contributeForm.campaignId}
                onChange={(e) => setContributeForm(prev => ({ ...prev, campaignId: parseInt(e.target.value) || 1 }))}
                className={styles.formInput}
              />
            </div>
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
          
          <div className={styles.buttonContainer}>
            <button
              onClick={handleContributeModal}
              disabled={!wallet.isConnected}
              className={styles.primaryButton}
            >
              Contribute (With Modal)
            </button>
            
            <button
              onClick={handleDirectContribute}
              disabled={!wallet.isConnected}
              className={styles.secondaryButton}
            >
              Direct Contribute
            </button>
          </div>
          
          {!wallet.isConnected && (
            <p className={styles.statusLabel}>Connect wallet to contribute</p>
          )}
        </div>
      </div>
    </div>
  );

  const renderPoolDemo = () => (
    <div className={styles.demoSection}>
      <div>
        <h3 className={styles.sectionTitle}>Co-EP Pool Operations</h3>
        
        {/* Pool Join */}
        <div className={styles.formContainer}>
          <h4 className={styles.formTitle}>Join Existing Pool</h4>
          
          <div className={styles.formGrid}>
            <div>
              <label className={styles.formLabel}>
                Pool Name
              </label>
              <input
                type="text"
                value={poolJoinForm.poolName}
                onChange={(e) => setPoolJoinForm(prev => ({ ...prev, poolName: e.target.value }))}
                className={styles.formField}
              />
            </div>
            
            <div>
              <label className={styles.formLabel}>
                Pool ID
              </label>
              <input
                type="number"
                value={poolJoinForm.poolId}
                onChange={(e) => setPoolJoinForm(prev => ({ ...prev, poolId: parseInt(e.target.value) || 1 }))}
                className={styles.formField}
              />
            </div>
          </div>
          
          <div>
            <label className={styles.formLabel}>
              Bond Amount (μSTX)
            </label>
            <input
              type="number"
              value={poolJoinForm.bondAmount}
              onChange={(e) => setPoolJoinForm(prev => ({ ...prev, bondAmount: parseInt(e.target.value) || 0 }))}
              className={styles.formField}
            />
          </div>
          
          <button
            onClick={handlePoolJoinModal}
            disabled={!wallet.isConnected}
            className={styles.primaryButton}
          >
            Join Pool (With Modal)
          </button>
        </div>

        {/* Pool Create */}
        <div className={styles.formContainer}>
          <h4 className={styles.formTitle}>Create New Pool</h4>
          
          <div className={styles.formGrid}>
            <div>
              <label className={styles.formLabel}>
                Pool Name
              </label>
              <input
                type="text"
                value={poolCreateForm.name}
                onChange={(e) => setPoolCreateForm(prev => ({ ...prev, name: e.target.value }))}
                className={styles.formField}
              />
            </div>
            
            <div>
              <label className={styles.formLabel}>
                Bond Amount (μSTX)
              </label>
              <input
                type="number"
                value={poolCreateForm.bondAmount}
                onChange={(e) => setPoolCreateForm(prev => ({ ...prev, bondAmount: parseInt(e.target.value) || 0 }))}
                className={styles.formField}
              />
            </div>
          </div>
          
          <div>
            <label className={styles.formLabel}>
              Max Members
            </label>
            <input
              type="number"
              value={poolCreateForm.maxMembers}
              onChange={(e) => setPoolCreateForm(prev => ({ ...prev, maxMembers: parseInt(e.target.value) || 0 }))}
              className={styles.formField}
            />
          </div>
          
          <button
            onClick={handlePoolCreateModal}
            disabled={!wallet.isConnected}
            className={styles.primaryButton}
          >
            Create Pool (With Modal)
          </button>
        </div>
        
        {!wallet.isConnected && (
          <p className={styles.statusLabel}>Connect wallet to perform pool operations</p>
        )}
      </div>
    </div>
  );

  const renderCampaignDemo = () => (
    <div className={styles.demoSection}>
      <div>
        <h3 className={styles.sectionTitle}>Campaign Creation</h3>
        <div className={styles.formContainer}>
          <div className={styles.formGrid}>
            <div>
              <label className={styles.formLabel}>
                Campaign Title
              </label>
              <input
                type="text"
                value={campaignCreateForm.title}
                onChange={(e) => setCampaignCreateForm(prev => ({ ...prev, title: e.target.value }))}
                className={styles.formField}
              />
            </div>
            
            <div>
              <label className={styles.formLabel}>
                Target Amount (μSTX)
              </label>
              <input
                type="number"
                value={campaignCreateForm.targetAmount}
                onChange={(e) => setCampaignCreateForm(prev => ({ ...prev, targetAmount: parseInt(e.target.value) || 0 }))}
                className={styles.formField}
              />
            </div>
          </div>
          
          <button
            onClick={handleCampaignCreateModal}
            disabled={!wallet.isConnected}
            className={styles.primaryButton}
          >
            Create Campaign (With Modal)
          </button>
          
          {!wallet.isConnected && (
            <p className={styles.statusLabel}>Connect wallet to create campaign</p>
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
            🎬 CineX Transaction Modal Demo
          </h1>
          <p className={styles.subtitle}>
            📊 Experience the enhanced transaction confirmation system with detailed modals
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
          { id: 'contribute', label: 'Contribute', icon: '💰' },
          { id: 'pools', label: 'Pools', icon: '🏊‍♂️' },
          { id: 'campaign', label: 'Create Campaign', icon: '🎬' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveDemo(tab.id)}
            className={`${styles.tabButton} ${activeDemo === tab.id ? styles.active : ''}`}
          >
            <span className={styles.tabIcon}>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Demo Content */}
      <div className={styles.content}>
        {activeDemo === 'wallet' && renderWalletDemo()}
        {activeDemo === 'contribute' && renderContributeDemo()}
        {activeDemo === 'pools' && renderPoolDemo()}
        {activeDemo === 'campaign' && renderCampaignDemo()}
      </div>

      {/* Instructions */}
      <div className={styles.instructions}>
        <h3 className={styles.instructionsTitle}>
          🚀 Transaction Modal Features
        </h3>
        <div className={styles.spaceY4}>
          <div className={styles.instructionItem}>
            📋 Detailed Information: Each modal shows transaction type, amount, recipient, fees, and risk level
          </div>
          <div className={styles.instructionItem}>
            ⚠️ Safety Features: Warnings for high-risk transactions and detailed confirmations
          </div>
          <div className={styles.instructionItem}>
            🔍 Advanced Details: Expandable contract call information for developers
          </div>
          <div className={styles.instructionItem}>
            🎮 Interactive Demo: Compare modal vs direct transaction flows
          </div>
          <div className={styles.notification}>
            💡 Try both "With Modal" and "Direct" buttons to see the difference!
          </div>
        </div>
      </div>

      {/* Transaction Modal */}
      <TransactionModal
        isOpen={modal.isOpen}
        transactionData={modal.transactionData!}
        currentTransaction={modal.currentTransaction || undefined}
        onConfirm={modal.confirmTransaction}
        onCancel={modal.closeModal}
        isProcessing={modal.isProcessing}
      />

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