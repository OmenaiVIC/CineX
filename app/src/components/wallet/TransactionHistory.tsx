import Card from '../ui/Card';

interface Tx {
  id: string;
  type: 'credit' | 'debit';
  amount: string;
  summary: string;
  timestamp: number;
}

interface Props {
  transactions: Tx[];
}

export default function TransactionHistory({ transactions }: Props) {
  if (transactions.length === 0) {
    return (
      <Card variant="light" padding="default">
        <h3 className="text-base font-semibold text-white mb-3">Transaction History</h3>
        <p className="text-sm text-gray-500">No transactions yet.</p>
      </Card>
    );
  }

  return (
    <Card variant="light" padding="default">
      <h3 className="text-base font-semibold text-white mb-3">Transaction History</h3>
      <div className="space-y-2">
        {transactions.map((tx) => (
          <div
            key={tx.id}
            className="flex items-center justify-between p-3 bg-black/30 rounded-lg"
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm text-white truncate">{tx.summary}</p>
              <p className="text-xs text-gray-500">
                {new Date(tx.timestamp).toLocaleDateString()} · {tx.id.slice(0, 12)}...
              </p>
            </div>
            <span
              className={`ml-3 font-medium text-sm ${
                tx.type === 'credit' ? 'text-[#4ade80]' : 'text-red-400'
              }`}
            >
              {tx.type === 'credit' ? '+' : '-'}{tx.amount} STX
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
}
