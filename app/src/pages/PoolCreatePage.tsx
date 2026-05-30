import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import TransactionModal, { useTxModal } from '../components/common/TransactionModal';
import { useDemoMode } from '../contexts/DemoModeContext';
import { createPool } from '../services/poolService';

const CATEGORIES = [
  { value: 'short-film', label: 'Short Film' },
  { value: 'feature', label: 'Feature' },
  { value: 'documentary', label: 'Documentary' },
  { value: 'music-video', label: 'Music Video' },
  { value: 'web-series', label: 'Web Series' },
];

export default function PoolCreatePage() {
  const navigate = useNavigate();
  const { currentUser } = useDemoMode();
  const tx = useTxModal();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [contributionAmount, setContributionAmount] = useState('');
  const [maxMembers, setMaxMembers] = useState('10');
  const [category, setCategory] = useState('short-film');
  const [deadline, setDeadline] = useState('');

  const handleCreate = async () => {
    if (!currentUser) return;
    if (!name || !targetAmount || !deadline) { tx.fail('Name, target amount, and deadline are required'); return; }
    tx.open('Creating Pool', `Launching pool: ${name}`);
    setTimeout(async () => {
      const res = await createPool(
        currentUser.address,
        name,
        description,
        targetAmount,
        contributionAmount || targetAmount,
        parseInt(maxMembers) || 10,
        category,
        new Date(deadline).getTime(),
      );
      if (res.success) {
        tx.succeed(res.transactionId || 'tx_pool_created');
        setTimeout(() => { tx.close(); navigate(`/pools/${res.data?.id}`); }, 1000);
      } else {
        tx.fail(res.error || 'Failed to create pool');
        setTimeout(() => tx.close(), 1000);
      }
    }, 600);
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <button onClick={() => navigate(-1)} className="text-sm text-gray-500 hover:text-gray-300 mb-4 block">← Back</button>
      <h1 className="text-2xl font-bold text-white mb-6">Create Funding Pool</h1>

      <Card variant="light" padding="default" className="space-y-4">
        <div>
          <label className="block text-xs text-gray-400 mb-1">Pool Name *</label>
          <Input placeholder="e.g. Indie Film Collective" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1">Description</label>
          <textarea
            className="w-full bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#4ade80] resize-none"
            rows={3}
            placeholder="Describe the pool's purpose..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-gray-400 mb-1">Target Amount (₦) *</label>
            <Input type="number" placeholder="500000" value={targetAmount} onChange={(e) => setTargetAmount(e.target.value)} />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Min Contribution (₦)</label>
            <Input type="number" placeholder="10000" value={contributionAmount} onChange={(e) => setContributionAmount(e.target.value)} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-gray-400 mb-1">Max Members</label>
            <Input type="number" placeholder="10" value={maxMembers} onChange={(e) => setMaxMembers(e.target.value)} />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Category</label>
            <Select options={CATEGORIES} value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Select category" />
          </div>
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1">Deadline *</label>
          <Input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
        </div>
        <Button variant="primary" className="w-full" onClick={handleCreate}>Create Pool</Button>
      </Card>

      <TransactionModal
        isOpen={tx.isOpen}
        state={tx.state}
        title={tx.title}
        description={tx.description}
        txId={tx.txId}
        error={tx.error}
        onClose={() => tx.close()}
        onRetry={handleCreate}
      />
    </div>
  );
}
