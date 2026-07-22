import { useState } from 'react';
import Button from '../ui/Button';
import Input from '../ui/Input';
import TransactionModal, { useTxModal } from '../common/TransactionModal';
import { depositToWallet } from '../../services/walletService';
import { passkeyTransfer, hasKeypair } from '../../services/passkeyService';
import * as api from '../../services/api';

interface Props {
  isOpen: boolean;
  address: string;
  onClose: () => void;
  onSuccess?: () => void;
}

type CurrencyTab = 'NGN' | 'USD' | 'STX' | 'USDCx';

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

    if (tab === 'USDCx') {
      if (!hasKeypair()) {
        tx.fail('Passkey wallet not set up. Please create a wallet first.');
        return;
      }
      tx.open('Depositing Digital Dollars', `Sending ${amt} digital dollars to your account`);
      tx.setLifecycle('building');
      setTimeout(async () => {
        try {
          tx.setLifecycle('signing');
          tx.setLifecycle('broadcasting');
          const result = await passkeyTransfer({
            recipient: address,
            amountStx: amt,
            memo: `Deposit ${amt} USDCx`,
          });
          tx.setLifecycle('confirming');
          tx.succeed(result.txid, `https://explorer.hiro.so/txid/${result.txid}?chain=testnet`);
          setTimeout(() => { tx.close(); onSuccess?.(); onClose(); }, 2000);
        } catch (err: any) {
          tx.fail(err?.message || 'Deposit failed');
        }
      }, 300);
      return;
    }

    tx.open('Funding Wallet', `Depositing ${amt} ${tab} to your wallet`);
    setTimeout(async () => {
      const res = await depositToWallet(address, amt, tab as 'NGN' | 'USD' | 'STX');
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

  const currencyLabel: Record<CurrencyTab, string> = {
    NGN: 'NGN (₦)',
    USD: 'USD ($)',
    STX: 'STX',
    USDCx: 'Digital $',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-[#0a0a0f] border border-[#1a1a2e] rounded-2xl p-8 w-full max-w-md mx-4">
        <h3 className="text-lg font-semibold text-white mb-6">Fund Wallet</h3>

        <div className="flex mb-6 bg-black/30 rounded-lg p-1">
          {(['NGN', 'USD', 'STX', 'USDCx'] as CurrencyTab[]).map(t => (
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
            <label className="block text-sm text-gray-400 mb-1">
              Amount ({tab === 'USDCx' ? 'digital dollars' : tab})
            </label>
            <Input
              type="number"
              placeholder={`Enter amount in ${tab === 'USDCx' ? 'digital dollars' : tab}`}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
            {tab === 'USDCx' && (
              <p className="text-xs text-gray-600 mt-1">
                Signed with your passkey wallet and confirmed on the blockchain
              </p>
            )}
          </div>

          <Button variant="primary" className="w-full" onClick={handleFund}>
            {tab === 'USDCx' ? 'Deposit Digital Dollars' : `Deposit ${tab}`}
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
        lifecycleState={tx.lifecycleState}
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
