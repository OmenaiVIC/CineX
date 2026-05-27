import { useState } from 'react';
import Button from '../ui/Button';
import Input from '../ui/Input';
import TransactionModal, { useTxModal } from '../common/TransactionModal';
import { debitWallet } from '../../services/walletService';
import { addFeedEvent } from '../../services/feedService';

interface Props {
  address: string;
  onSuccess?: () => void;
}

export default function SendMoneyForm({ address, onSuccess }: Props) {
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const tx = useTxModal();

  const handleSend = () => {
    if (!recipient.trim()) { tx.fail('Enter a recipient address'); return; }
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) { tx.fail('Enter a valid amount'); return; }

    tx.open('Sending Funds', `Transferring ${amt} STX to ${recipient.slice(0, 10)}...`);
    setTimeout(() => {
      const res = debitWallet(address, amt.toString());
      if (res.success) {
        const txId = `tx_send_${Date.now()}`;
        tx.succeed(txId);
        addFeedEvent('system', address, `Sent ${amt} STX to ${recipient.slice(0, 10)}...`, recipient);
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

  return (
    <div className="space-y-4">
      <h3 className="text-base font-semibold text-white">Send Funds</h3>
      <div>
        <label className="block text-sm text-gray-400 mb-1">Recipient Address</label>
        <Input
          placeholder="ST address"
          value={recipient}
          onChange={(e) => setRecipient(e.target.value)}
        />
      </div>
      <div>
        <label className="block text-sm text-gray-400 mb-1">Amount (STX)</label>
        <Input
          type="number"
          placeholder="0"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
      </div>
      <Button variant="primary" size="small" onClick={handleSend}>Send</Button>
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
