import { useState } from 'react';
import { useAuth } from '@contexts/StacksAuthContext';

interface SendMoneyFormProps {
  onSuccess?: (txid: string) => void;
}

function SendMoneyForm({ onSuccess }: SendMoneyFormProps) {
  const { isAuthenticated, userData, getAddressFromUserData } = useAuth();
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [memo, setMemo] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [txid, setTxid] = useState('');

  const senderAddress = userData ? getAddressFromUserData(userData) : '';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated || !senderAddress) {
      setError('Wallet not connected');
      return;
    }

    const amountVal = parseFloat(amount);
    if (!recipient || !recipient.startsWith('S') || recipient.length < 38) {
      setError('Invalid recipient address');
      return;
    }
    if (isNaN(amountVal) || amountVal <= 0) {
      setError('Invalid amount');
      return;
    }

    setSending(true);
    setError('');
    setTxid('');

    try {
      const { callContract } = await import('@stacks/connect');
      const { StacksMainnet, StacksTestnet } = await import('@stacks/network');
      const { uintCV, principalCV, standardPrincipalCV } = await import('@stacks/transactions');

      const network = senderAddress.startsWith('ST') ? new StacksTestnet() : new StacksMainnet();
      const amountUstx = Math.floor(amountVal * 1_000_000);

      await callContract({
        network,
        contractAddress: 'SP000000000000000000002Q6VF78',
        contractName: 'pox',
        functionName: 'transfer',
        functionArgs: [
          uintCV(amountUstx),
          standardPrincipalCV(senderAddress),
          standardPrincipalCV(recipient),
          principalCV('SP000000000000000000002Q6VF78.burn'),
        ],
        appDetails: { name: 'CineX', icon: window.location.origin + '/favicon.png' },
        onFinish: (data: { txId?: string }) => {
          setTxid(data.txId || '');
          setSending(false);
          onSuccess?.(data.txId || '');
        },
        onCancel: () => {
          setError('Transaction cancelled');
          setSending(false);
        },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Transaction failed');
      setSending(false);
    }
  };

  return (
    <div className="glass-card p-8">
      <h3 className="text-lg font-semibold text-white mb-6">Send STX</h3>

      {error && (
        <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>
      )}

      {txid && (
        <div className="mb-4 p-3 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 text-sm break-all">
          Sent! Tx: {txid.slice(0, 16)}…{txid.slice(-8)}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm text-gray-400 mb-1">Recipient Address</label>
          <input
            type="text"
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            placeholder="SP... or ST..."
            className="w-full px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-xl text-white placeholder-gray-600 focus:border-green-500/50 focus:ring-1 focus:ring-green-500/20 outline-none text-sm font-mono"
            disabled={sending}
          />
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-1">Amount (STX)</label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            step="0.000001"
            min="0"
            className="w-full px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-xl text-white placeholder-gray-600 focus:border-green-500/50 focus:ring-1 focus:ring-green-500/20 outline-none text-sm"
            disabled={sending}
          />
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-1">Memo (optional)</label>
          <input
            type="text"
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            placeholder="For: Campaign contribution"
            maxLength={34}
            className="w-full px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-xl text-white placeholder-gray-600 focus:border-green-500/50 focus:ring-1 focus:ring-green-500/20 outline-none text-sm"
            disabled={sending}
          />
        </div>

        <button
          type="submit"
          disabled={!isAuthenticated || sending}
          className="w-full py-3 px-4 bg-green-500 hover:bg-green-400 text-black font-bold rounded-xl transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {sending ? 'Sending…' : isAuthenticated ? 'Send STX' : 'Connect Wallet'}
        </button>
      </form>
    </div>
  );
}

export default SendMoneyForm;
