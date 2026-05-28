import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useDemoMode } from '../contexts/DemoModeContext';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import TransactionModal, { useTxModal } from '../components/common/TransactionModal';
import { getVerificationStatus, applyForVerification } from '../services/verificationService';

export default function VerificationPage() {
  const { currentUser } = useDemoMode();
  const { user } = useAuth();
  const activeUser = currentUser || user;
  const navigate = useNavigate();
  const tx = useTxModal();

  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [portfolioUrl, setPortfolioUrl] = useState('');
  const [previousWorks, setPreviousWorks] = useState('');
  const [status, setStatus] = useState<{ applied: boolean; verified: boolean; status?: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activeUser?.address) { setLoading(false); return; }
    getVerificationStatus(activeUser.address).then(res => {
      if (res.success && res.data) setStatus(res.data);
      setLoading(false);
    });
  }, [activeUser?.address]);

  const handleSubmit = async () => {
    if (!activeUser?.address) { tx.fail('You must be logged in'); return; }
    if (!name.trim()) { tx.fail('Full name is required'); return; }

    tx.open('Applying for Verification', 'Submitting your verification application');
    setTimeout(async () => {
      const res = await applyForVerification(
        activeUser.address!,
        name.trim(),
        bio.trim(),
        portfolioUrl.trim() || undefined,
        previousWorks.split('\n').map(s => s.trim()).filter(Boolean),
        {},
        '0'
      );
      if (res.success) {
        tx.succeed(res.transactionId);
        setTimeout(() => {
          tx.close();
          setStatus({ applied: true, verified: false, status: 'pending' });
        }, 1000);
      } else {
        tx.fail(res.error || 'Application failed');
      }
    }, 800);
  };

  if (!activeUser) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <p className="text-gray-400">Please sign in to apply for verification.</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <button onClick={() => navigate(-1)} className="text-sm text-gray-500 hover:text-gray-300 mb-4 block">← Back</button>
      <h1 className="text-2xl font-bold text-white mb-6">Creator Verification</h1>

      {loading ? (
        <Card variant="light" padding="default">
          <p className="text-sm text-gray-500">Loading verification status...</p>
        </Card>
      ) : status?.verified ? (
        <Card variant="light" padding="default">
          <div className="text-center py-6">
            <div className="w-16 h-16 rounded-full bg-[#4ade80]/20 flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">✓</span>
            </div>
            <h2 className="text-lg font-semibold text-white mb-2">You are Verified!</h2>
            <p className="text-sm text-gray-400 mb-4">Your identity has been verified. You can now access higher campaign funding limits.</p>
            <Button variant="outline" size="small" onClick={() => navigate(`/profile/${activeUser.address}`)}>View Profile</Button>
          </div>
        </Card>
      ) : status?.applied ? (
        <Card variant="light" padding="default">
          <div className="text-center py-6">
            <div className="w-16 h-16 rounded-full bg-yellow-500/20 flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">⏳</span>
            </div>
            <h2 className="text-lg font-semibold text-white mb-2">Application Pending</h2>
            <p className="text-sm text-gray-400">Your verification application is <strong>{status.status || 'under review'}</strong>. You'll be notified when a decision is made.</p>
          </div>
        </Card>
      ) : (
        <>
          <Card variant="light" padding="default" className="mb-6">
            <p className="text-sm text-gray-400 leading-relaxed">
              Get verified to build trust with backers and unlock higher campaign funding limits. 
              Verification requires submitting your identity details for review by our gatekeepers.
            </p>
          </Card>

          <Card variant="light" padding="default">
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Full Name *</label>
                <Input value={name} onChange={e => setName(e.target.value)} placeholder="Your legal or stage name" />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Bio</label>
                <textarea
                  value={bio}
                  onChange={e => setBio(e.target.value)}
                  placeholder="Tell us about yourself..."
                  rows={3}
                  className="w-full px-4 py-3 text-sm text-white bg-transparent border border-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent placeholder-gray-400 resize-none"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Portfolio URL</label>
                <Input value={portfolioUrl} onChange={e => setPortfolioUrl(e.target.value)} placeholder="https://your-portfolio.com" />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Previous Works (one per line)</label>
                <textarea
                  value={previousWorks}
                  onChange={e => setPreviousWorks(e.target.value)}
                  placeholder="Title of work 1&#10;Title of work 2&#10;Title of work 3"
                  rows={4}
                  className="w-full px-4 py-3 text-sm text-white bg-transparent border border-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent placeholder-gray-400 resize-none"
                />
              </div>
              <div className="pt-2">
                <Button variant="neon" onClick={handleSubmit}>Submit Application</Button>
              </div>
            </div>
          </Card>
        </>
      )}

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