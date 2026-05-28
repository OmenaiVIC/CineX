import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDemoMode } from '../contexts/DemoModeContext';
import { useAuth } from '../contexts/AuthContext';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import TransactionModal, { useTxModal } from '../components/common/TransactionModal';
import { createCampaign } from '../services/campaignService';
import { addFeedEvent } from '../services/feedService';
import type { Campaign } from '../types';

const CATEGORIES: Campaign['category'][] = ['short-film', 'feature', 'documentary', 'music-video', 'web-series'];

export default function CreateCampaignPage() {
  const { currentUser } = useDemoMode();
  const { user } = useAuth();
  const activeUser = currentUser || user;
  const navigate = useNavigate();
  const tx = useTxModal();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [deadline, setDeadline] = useState('');
  const [category, setCategory] = useState<Campaign['category']>('short-film');
  const [tags, setTags] = useState('');

  if (!activeUser) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8 text-center">
        <p className="text-gray-400">Please complete onboarding first.</p>
      </div>
    );
  }

  const handleSubmit = () => {
    if (!title.trim() || !description.trim() || !targetAmount || !deadline) {
      tx.fail('Please fill in all required fields');
      return;
    }

    const target = parseFloat(targetAmount);
    if (isNaN(target) || target <= 0) {
      tx.fail('Target amount must be a positive number');
      return;
    }

    const deadlineMs = new Date(deadline).getTime();
    if (deadlineMs <= Date.now()) {
      tx.fail('Deadline must be in the future');
      return;
    }

    const tagList = tags.split(',').map(t => t.trim()).filter(Boolean);

    tx.open('Creating Campaign', `Launching "${title}"`);
    setTimeout(() => {
      const res = createCampaign(
        { title: title.trim(), description: description.trim(), targetAmount: target.toString(), deadline: deadlineMs, category, tags: tagList },
        activeUser.address!
      );
      if (res.success && res.data) {
        addFeedEvent('campaign_created', activeUser.address!, `Launched "${title}"`, res.data.id, { category });
        tx.succeed(res.transactionId);
        setTimeout(() => {
          tx.close();
          navigate(`/campaign/${res.data!.id}`);
        }, 1000);
      } else {
        tx.fail(res.error || 'Failed to create campaign');
      }
    }, 800);
  };

  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <button onClick={() => navigate(-1)} className="text-sm text-gray-500 hover:text-gray-300 mb-4 block">← Back</button>
      <h1 className="text-2xl font-bold text-white mb-6">Create Campaign</h1>

      <Card variant="light" padding="default">
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Title *</label>
            <Input placeholder="Campaign title" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Description *</label>
            <textarea
              placeholder="Describe your project..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="w-full px-4 py-3 text-white bg-transparent border border-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent placeholder-gray-400 resize-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Target Amount (₦) *</label>
              <Input type="number" placeholder="250000" value={targetAmount} onChange={(e) => setTargetAmount(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Category *</label>
              <Select
                options={CATEGORIES.map(c => ({ value: c, label: c.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase()) }))}
                value={category}
                onChange={(e) => setCategory(e.target.value as Campaign['category'])}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Deadline *</label>
            <Input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} min={today} />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Tags (comma-separated)</label>
            <Input placeholder="lagos, documentary, environment" value={tags} onChange={(e) => setTags(e.target.value)} />
          </div>
          <div className="flex gap-3 pt-2">
            <Button variant="neon" onClick={handleSubmit}>Launch Campaign</Button>
            <Button variant="outline" onClick={() => navigate(-1)}>Cancel</Button>
          </div>
        </div>
      </Card>

      <TransactionModal
        isOpen={tx.isOpen}
        state={tx.state}
        title={tx.title}
        description={tx.description}
        txId={tx.txId}
        error={tx.error}
        onClose={() => tx.close()}
        onRetry={handleSubmit}
      />
    </div>
  );
}
