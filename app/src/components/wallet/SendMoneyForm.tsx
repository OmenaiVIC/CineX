import { useState } from 'react';
import Button from '../ui/Button';
import Input from '../ui/Input';
import TransactionModal, { useTxModal } from '../common/TransactionModal';
import { sendFunds } from '../../services/walletService';
import { addFeedEvent } from '../../services/feedService';

interface Props {
  address: string;
  onSuccess?: () => void;
}

type CurrencyTab = 'NGN' | 'USD' | 'STX';

export default function SendMoneyForm({ address, onSuccess }: Props) {
  const [tab, setTab] = useState<CurrencyTab>('NGN');
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const tx = useTxModal();

  const handleSend = async () => {
    if (!recipient.trim()) { tx.fail('Enter a recipient email or address'); return; }
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) { tx.fail('Enter a valid amount'); return; }

    tx.open('Sending Funds', `Transferring ${amt} ${tab} to ${recipient.slice(0, 20)}...`);
    setTimeout(async () => {
      const res = await sendFunds(address, recipient.trim(), amt, tab);
      if (res.success) {
        const txId = `tx_send_${Date.now()}`;
        tx.succeed(txId);
        addFeedEvent('system', address, `Sent ${amt} ${tab} to ${recipient.slice(0, 20)}...`, recipient);
        setTimeout(() => {
          tx.close();
          setRecipient('');
          setAmount('');
          onSuccess?.();
        }, 1000);
      } else {
        tx.fail(res.error || 'Transaction failed');
      }
    }, 800);
  };

  const currencyLabel: Record<CurrencyTab, string> = { NGN: 'NGN (₦)', USD: 'USD ($)', STX: 'STX' };

  return (
    <div className="space-y-4">
      <h3 className="text-base font-semibold text-white">Send Funds</h3>

      <div className="flex bg-black/30 rounded-lg p-1">
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

      <div>
        <label className="block text-sm text-gray-400 mb-1">Recipient (email or address)</label>
        <Input
          placeholder="email@example.com or wallet address"
          value={recipient}
          onChange={(e) => setRecipient(e.target.value)}
        />
      </div>
      <div>
        <label className="block text-sm text-gray-400 mb-1">Amount ({tab})</label>
        <Input
          type="number"
          placeholder="0"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
      </div>
      <Button variant="primary" size="small" onClick={handleSend}>Send {tab}</Button>
      <TransactionModal
        isOpen={tx.isOpen}
        state={tx.state}
        title={tx.title}
        description={tx.description}
        txId={tx.txId}
        error={tx.error}
        onClose={() => tx.close()}
        onRetry={handleSend}
      />
    </div>
  );
}