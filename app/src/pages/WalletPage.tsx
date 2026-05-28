import { useState, useMemo } from 'react';
import { useDemoMode } from '../contexts/DemoModeContext';
import { useAuth } from '../contexts/AuthContext';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import LoadingSkeleton from '../components/common/LoadingSkeleton';
import WalletBalance from '../components/wallet/WalletBalance';
import FundWalletModal from '../components/wallet/FundWalletModal';
import SendMoneyForm from '../components/wallet/SendMoneyForm';
import CurrencyConverter from '../components/wallet/CurrencyConverter';
import TransactionHistory from '../components/wallet/TransactionHistory';
import { getAll } from '../contexts/DemoStorage';
import type { CampaignContribution, FeedEvent } from '../types';

export default function WalletPage() {
  const { currentUser } = useDemoMode();
  const { user } = useAuth();
  const activeUser = currentUser || user;
  const [showFund, setShowFund] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const txHistory = useMemo(() => {
    if (!activeUser) return [];
    const contributions = getAll<CampaignContribution>('contributions')
      .filter(c => c.contributor === activeUser.address)
      .map(c => ({
        id: c.txId,
        type: 'debit' as const,
        amount: c.amount,
        summary: `Contributed to campaign ${c.campaignId}`,
        timestamp: c.timestamp,
      }));
    const feed = getAll<FeedEvent>('feed')
      .filter(e => e.actor === activeUser.address && e.type === 'system')
      .map(e => ({
        id: e.id,
        type: ('debit') as const,
        amount: '0',
        summary: e.summary,
        timestamp: e.createdAt,
      }));
    return [...contributions, ...feed].sort((a, b) => b.timestamp - a.timestamp);
  }, [activeUser, refreshKey]);

  if (!activeUser) {
    return <div className="min-h-screen flex items-center justify-center"><LoadingSkeleton variant="card" count={2} /></div>;
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-white mb-6">Wallet</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1 space-y-4">
          <WalletBalance
            address={activeUser.address!}
            onFund={() => setShowFund(true)}
            onSend={() => {}}
          />
          <CurrencyConverter />
        </div>

        <div className="md:col-span-2 space-y-6">
          <Card variant="light" padding="default">
            <SendMoneyForm address={activeUser.address!} onSuccess={() => setRefreshKey(k => k + 1)} />
          </Card>
          <TransactionHistory transactions={txHistory} />
        </div>
      </div>

      <FundWalletModal
        isOpen={showFund}
        address={activeUser.address!}
        onClose={() => setShowFund(false)}
        onSuccess={() => setRefreshKey(k => k + 1)}
      />
    </div>
  );
}
