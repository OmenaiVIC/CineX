import { useState } from 'react';
import Button from '../ui/Button';
import Input from '../ui/Input';
import TransactionModal, { useTxModal } from '../common/TransactionModal';
import { creditWallet } from '../../services/walletService';

interface Props {
  isOpen: boolean;
  address: string;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function FundWalletModal({ isOpen, address, onClose, onSuccess }: Props) {
  const [amount, setAmount] = useState('');
  const tx = useTxModal();

  if (!isOpen) return null;

  const handleFund = async () => {
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) {
      tx.fail('Please enter a valid amount');
      return;
    }
    tx.open('Funding Wallet', `Depositing ${amt} STX to your wallet`);
    setTimeout(async () => {
      const res = await creditWallet(address, amt.toString());
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-[#0a0a0f] border border-[#1a1a2e] rounded-2xl p-8 w-full max-w-md mx-4">
        <h3 className="text-lg font-semibold text-white mb-6">Fund Wallet</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Amount (STX)</label>
            <Input
              type="number"
              placeholder="Enter amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
          <div className="flex gap-3">
            <Button variant="primary" onClick={handleFund}>Deposit</Button>
            <Button variant="outline" onClick={onClose}>Cancel</Button>
          </div>
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
        onRetry={handleFund}
      />
    </div>
  );
}
