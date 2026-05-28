import { useState } from 'react';
import Button from '../ui/Button';
import Input from '../ui/Input';
import TransactionModal, { useTxModal } from '../common/TransactionModal';
import { depositToWallet } from '../../services/walletService';
import * as api from '../../services/api';

interface Props {
  isOpen: boolean;
  address: string;
  onClose: () => void;
  onSuccess?: () => void;
}

type CurrencyTab = 'NGN' | 'USD' | 'STX';

const DEMO_CREDIT_NGN = 100000;

export default function FundWalletModal({ isOpen, address, onClose, onSuccess }: Props) {
  const [tab, setTab] = useState<CurrencyTab>('NGN');
  const [amount, setAmount] = useState('');
  const tx = useTxModal();

  if (!isOpen) return null;

  const handleFund = async () => {
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) {
      tx.fail('Please enter a valid amount');
      return;
    }
    tx.open('Funding Wallet', `Depositing ${amt} ${tab} to your wallet`);
    setTimeout(async () => {
      const res = await depositToWallet(address, amt, tab);
      if (res.success) {
        tx.succeed(`tx_fund_${Date.now()}`);
        setTimeout(() => {
          tx.close();
          onSuccess?.();
          onClose();
        }, 1000);
      } else {
        tx.fail(res.error || 'Funding failed');
      }
    }, 800);
  };

  const handleDemoCredit = async () => {
    tx.open('Demo Credit', `Depositing ${DEMO_CREDIT_NGN.toLocaleString()} NGN`);
    setTimeout(async () => {
      const res = await api.post<{ message: string; amount: number }>('/wallets/demo-credit', { user_id: address });
      if (res.success) {
        tx.succeed(`tx_demo_${Date.now()}`);
        setTimeout(() => {
          tx.close();
          onSuccess?.();
          onClose();
        }, 1000);
      } else {
        tx.fail(res.error || 'Demo credit failed');
      }
    }, 800);
  };

  const currencyLabel: Record<CurrencyTab, string> = { NGN: 'NGN (₦)', USD: 'USD ($)', STX: 'STX' };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-[#0a0a0f] border border-[#1a1a2e] rounded-2xl p-8 w-full max-w-md mx-4">
        <h3 className="text-lg font-semibold text-white mb-6">Fund Wallet</h3>

        <div className="flex mb-6 bg-black/30 rounded-lg p-1">
          {(['NGN', 'USD', 'STX'] as CurrencyTab[]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2 text-sm rounded-md transition-all ${tab === t ? 'bg-[#4ade80] text-black font-medium' : 'text-gray-400 hover:text-white'}`}
            >
              {currencyLabel[t]}
            </button>
          ))}
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Amount ({tab})</label>
            <Input
              type="number"
              placeholder={`Enter amount in ${tab}`}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>

          <Button variant="primary" className="w-full" onClick={handleFund}>
            Deposit {tab}
          </Button>

          {tab === 'NGN' && (
            <>
              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-800" /></div>
                <div className="relative flex justify-center"><span className="bg-[#0a0a0f] px-3 text-xs text-gray-600">or</span></div>
              </div>
              <Button variant="outline" className="w-full" onClick={handleDemoCredit}>
                Get ₦{DEMO_CREDIT_NGN.toLocaleString()} Demo Credit
              </Button>
            </>
          )}

          <Button variant="ghost" className="w-full" onClick={onClose}>Cancel</Button>
        </div>
      </div>
      <TransactionModal
        isOpen={tx.isOpen}
        state={tx.state}
        title={tx.title}
        description={tx.description}
        txId={tx.txId}
        error={tx.error}
        onClose={() => { tx.close(); onClose(); }}
        onRetry={tab === 'NGN' && !amount ? handleDemoCredit : handleFund}
      />
    </div>
  );
}