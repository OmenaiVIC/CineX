import { useState } from 'react';
import Button from '../ui/Button';
import Input from '../ui/Input';
import TransactionModal, { useTxModal } from '../common/TransactionModal';
import { sendFunds } from '../../services/walletService';
import { passkeyTransfer, hasKeypair } from '../../services/passkeyService';
import { addFeedEvent } from '../../services/feedService';

interface Props {
  address: string;
  onSuccess?: () => void;
}

type CurrencyTab = 'NGN' | 'USD' | 'STX' | 'USDCx';

export default function SendMoneyForm({ address, onSuccess }: Props) {
  const [tab, setTab] = useState<CurrencyTab>('NGN');
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const tx = useTxModal();

  const handleSend = async () => {
    if (!recipient.trim()) { tx.fail('Enter a recipient email or address'); return; }
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) { tx.fail('Enter a valid amount'); return; }

    if (tab === 'USDCx') {
      if (!hasKeypair()) {
        tx.fail('Passkey wallet not set up. Please create a wallet first.');
        return;
      }
      tx.open('Sending Digital Dollars', `Transferring ${amt} digital dollars to ${recipient.slice(0, 20)}...`);
      tx.setLifecycle('building');
      setTimeout(async () => {
        try {
          tx.setLifecycle('signing');
          tx.setLifecycle('broadcasting');
          const result = await passkeyTransfer({
            recipient: recipient.trim(),
            amountStx: amt,
            memo: `Send ${amt} USDCx`,
          });
          tx.setLifecycle('confirming');
          tx.succeed(result.txid, `https://explorer.hiro.so/txid/${result.txid}?chain=testnet`);
          addFeedEvent('system', address, `Sent ${amt} digital dollars to ${recipient.slice(0, 20)}...`, recipient);
          setTimeout(() => { tx.close(); setRecipient(''); setAmount(''); onSuccess?.(); }, 2000);
        } catch (err: any) {
          tx.fail(err?.message || 'Transaction failed');
        }
      }, 300);
      return;
    }

    tx.open('Sending Funds', `Transferring ${amt} ${tab} to ${recipient.slice(0, 20)}...`);
    setTimeout(async () => {
      const res = await sendFunds(address, recipient.trim(), amt, tab as 'NGN' | 'USD' | 'STX');
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

  const currencyLabel: Record<CurrencyTab, string> = {
    NGN: 'NGN (₦)',
    USD: 'USD ($)',
    STX: 'STX',
    USDCx: 'Digital $',
  };

  return (
    <div className="space-y-4">
      <h3 className="text-base font-semibold text-white">Send Funds</h3>

      <div className="flex bg-black/30 rounded-lg p-1">
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

      <div>
        <label className="block text-sm text-gray-400 mb-1">
          {tab === 'USDCx' ? 'Recipient (wallet address)' : 'Recipient (email or address)'}
        </label>
        <Input
          placeholder={tab === 'USDCx' ? 'ST... or SM... address' : 'email@example.com or wallet address'}
          value={recipient}
          onChange={(e) => setRecipient(e.target.value)}
        />
      </div>
      <div>
        <label className="block text-sm text-gray-400 mb-1">
          Amount ({tab === 'USDCx' ? 'digital dollars' : tab})
        </label>
        <Input
          type="number"
          placeholder="0"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
        {tab === 'USDCx' && (
          <p className="text-xs text-gray-600 mt-1">
            Signed with your passkey wallet and confirmed on the blockchain
          </p>
        )}
      </div>
      <Button variant="primary" size="small" onClick={handleSend}>
        {tab === 'USDCx' ? 'Send Digital Dollars' : `Send ${tab}`}
      </Button>
      <TransactionModal
        isOpen={tx.isOpen}
        state={tx.state}
        lifecycleState={tx.lifecycleState}
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
