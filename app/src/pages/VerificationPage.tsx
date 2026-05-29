import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useDemoMode } from '../contexts/DemoModeContext';
import { useStacksConnect } from '../hooks/useStacksConnect';
import { openContractCall } from '@stacks/connect';
import { standardPrincipalCV, uintCV, stringAsciiCV, bufferCV } from '@stacks/transactions';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import TransactionModal, { useTxModal } from '../components/common/TransactionModal';
import { getVerificationStatus, applyForVerification } from '../services/verificationService';
import * as api from '../services/api';

const DEPLOYER = 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM';

function hashIdentity(email: string): Uint8Array {
  const encoder = new TextEncoder();
  return encoder.encode(email).slice(0, 32);
}

const VERTICALS = [
  { value: 'film', label: 'Film' },
  { value: 'music', label: 'Music' },
  { value: 'gaming', label: 'Gaming' },
  { value: 'immersive-media', label: 'Immersive Media' },
  { value: 'other', label: 'Other' },
];

export default function VerificationPage() {
  const { currentUser } = useDemoMode();
  const { user } = useAuth();
  const activeUser = user || currentUser;
  const { connected: walletConnected, installed: walletInstalled, address: walletAddress } = useStacksConnect();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const tx = useTxModal();

  const initialMode = searchParams.get('mode') === 'quick' ? 'quick' : 'select';
  const [mode, setMode] = useState<'select' | 'quick' | 'full'>(initialMode);

  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [portfolioUrl, setPortfolioUrl] = useState('');
  const [previousWorks, setPreviousWorks] = useState('');
  const [projectVertical, setProjectVertical] = useState('film');
  const [status, setStatus] = useState<{ applied: boolean; verified: boolean; status?: string; onchainVerified?: boolean; hasIdentity?: boolean } | null>(null);
  const [loading, setLoading] = useState(true);
  const [onchainRegistered, setOnchainRegistered] = useState(false);
  const [onchainTxId, setOnchainTxId] = useState('');

  const refreshStatus = () => {
    if (!activeUser?.address) return;
    getVerificationStatus(activeUser.address).then(res => {
      if (res.success && res.data) {
        setStatus({ ...res.data, onchainVerified: false, hasIdentity: false });
      }
      setLoading(false);
    });
    api.get<{ identity: unknown; verified: unknown; fundingCap: unknown }>(`/verification/onchain-status/${activeUser.address}`).then(res => {
      if (res.success && res.data) {
        const isVerified = !!(res.data.verified as { okay: boolean })?.okay;
        const hasIdentity = !!(res.data.identity as { okay: boolean })?.okay;
        setStatus(prev => prev ? { ...prev, onchainVerified: isVerified, hasIdentity } : prev);
      }
    });
  };

  useEffect(() => {
    refreshStatus();
  }, [activeUser?.address]);

  const handleQuickRegister = async () => {
    if (!activeUser?.address) { tx.fail('You must be logged in'); return; }
    if (!name.trim()) { tx.fail('Full name is required'); return; }

    tx.open('Registering', 'Setting up your creator profile...');
    const res = await api.post('/verification/proxy-register', {
      address: activeUser.address,
      name: name.trim(),
      portfolioUrl: portfolioUrl.trim() || '',
      projectVertical,
      verificationLevel: 1,
    });
    if (res.success) {
      tx.succeed('registered');
      setTimeout(() => {
        tx.close();
        setStatus({ applied: false, verified: false, status: undefined, onchainVerified: false, hasIdentity: true });
      }, 1000);
    } else {
      tx.fail(res.error || 'Registration failed');
    }
  };

  const handleApply = async () => {
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
          setStatus({ applied: true, verified: false, status: 'pending', onchainVerified: false });
        }, 1000);
      } else {
        tx.fail(res.error || 'Application failed');
      }
    }, 800);
  };

  const handleOnchainRegister = async () => {
    if (!activeUser?.address || !walletAddress) {
      tx.fail('Connect your Stacks wallet first');
      return;
    }
    tx.open('Register on Blockchain', 'Sign the transaction in your wallet...');
    try {
      const identityHash = hashIdentity(activeUser.address);
      await openContractCall({
        contractAddress: DEPLOYER,
        contractName: 'project-verification-module',
        functionName: 'register-creator',
        functionArgs: [
          standardPrincipalCV(walletAddress),
          stringAsciiCV(name.trim().slice(0, 100)),
          stringAsciiCV((portfolioUrl || '').slice(0, 255)),
          bufferCV(identityHash),
          stringAsciiCV(projectVertical),
          uintCV(2),
          uintCV(99999999),
        ],
        appDetails: { name: 'CineX', icon: window.location.origin + '/favicon.ico' },
        onFinish: async (data) => {
          setOnchainTxId(data.txId);
          tx.succeed(data.txId);
          setOnchainRegistered(true);
          setTimeout(async () => {
            await api.post('/verification/notify-registered', { address: walletAddress });
            refreshStatus();
          }, 5000);
        },
        onCancel: () => {
          tx.fail('Transaction cancelled');
        },
      });
    } catch (err) {
      tx.fail(err instanceof Error ? err.message : 'Registration failed');
    }
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

      <div className="flex items-center gap-3 mb-6">
        <h1 className="text-2xl font-bold text-white">Verification</h1>
        {status?.hasIdentity && !status.onchainVerified && (
          <span className="text-xs px-2 py-0.5 rounded bg-yellow-500/20 text-yellow-400">Profile Created</span>
        )}
        {status?.onchainVerified && (
          <span className="text-xs px-2 py-0.5 rounded bg-[#4ade80]/20 text-[#4ade80]">Verified ✓</span>
        )}
      </div>

      {loading ? (
        <Card variant="light" padding="default">
          <p className="text-sm text-gray-500">Loading verification status...</p>
        </Card>
      ) : status?.onchainVerified ? (
        <Card variant="light" padding="default">
          <div className="text-center py-6">
            <div className="w-16 h-16 rounded-full bg-[#4ade80]/20 flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">✓</span>
            </div>
            <h2 className="text-lg font-semibold text-white mb-2">Fully Verified</h2>
            <p className="text-sm text-gray-400 mb-4">Your identity is verified. You can access higher campaign funding limits.</p>
            <Button variant="outline" size="small" onClick={() => navigate(`/profile/${activeUser.address}`)}>View Profile</Button>
          </div>
        </Card>
      ) : status?.hasIdentity && mode === 'select' ? (
        <Card variant="light" padding="default">
          <div className="text-center py-6">
            <div className="w-16 h-16 rounded-full bg-blue-500/20 flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl text-blue-400">⟳</span>
            </div>
            <h2 className="text-lg font-semibold text-white mb-2">Creator Profile Created</h2>
            <p className="text-sm text-gray-400 mb-4">
              Your creator profile is active. You can create campaigns with the standard funding limit.
              Apply for verification to unlock higher funding caps.
            </p>
            <Button variant="neon" size="small" onClick={() => setMode('full')}>
              Apply for Verification
            </Button>
          </div>
        </Card>
      ) : mode === 'select' ? (
        <>
          <Card variant="light" padding="default" className="mb-4">
            <p className="text-sm text-gray-400 leading-relaxed">
              Register as a creator to start raising funds for your projects. No wallet or crypto experience needed.
            </p>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <Card variant="light" padding="default" className="cursor-pointer hover:border-[#4ade80]/50 transition-all" onClick={() => setMode('quick')}>
              <div className="text-center py-4">
                <div className="w-12 h-12 rounded-full bg-[#4ade80]/10 flex items-center justify-center mx-auto mb-3">
                  <span className="text-xl">⚡</span>
                </div>
                <h3 className="text-sm font-semibold text-white mb-2">Quick Register</h3>
                <p className="text-xs text-gray-500">Register as a creator in seconds. Start raising funds immediately. No wallet required.</p>
              </div>
            </Card>

            <Card variant="light" padding="default" className="cursor-pointer hover:border-[#00e5ff]/50 transition-all" onClick={() => setMode('full')}>
              <div className="text-center py-4">
                <div className="w-12 h-12 rounded-full bg-[#00e5ff]/10 flex items-center justify-center mx-auto mb-3">
                  <span className="text-xl">✓</span>
                </div>
                <h3 className="text-sm font-semibold text-white mb-2">Apply for Verification</h3>
                <p className="text-xs text-gray-500">Submit an application for admin review. Get verified to unlock higher funding caps.</p>
              </div>
            </Card>
          </div>
        </>
      ) : status?.verified && !onchainRegistered && mode === 'full' ? (
        <Card variant="light" padding="default">
          <div className="text-center py-6">
            <div className="w-16 h-16 rounded-full bg-yellow-500/20 flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">⏳</span>
            </div>
            <h2 className="text-lg font-semibold text-white mb-2">Approved — Final Step</h2>
            <p className="text-sm text-gray-400 mb-4">
              Your application is approved. Complete the on-chain registration to activate your verification.
            </p>
            {!walletInstalled ? (
              <div className="bg-yellow-900/20 border border-yellow-700/40 rounded-lg p-3 text-sm text-yellow-300 mb-3">
                <p className="mb-1 font-medium">Hiro Wallet required for this step</p>
                <p className="text-xs text-yellow-400">This is a one-time setup to link your identity. <a href="https://www.hiro.so/wallet" target="_blank" rel="noopener noreferrer" className="text-[#4ade80] underline">Install the free Hiro Wallet</a> to continue.</p>
              </div>
            ) : !walletConnected || !walletAddress ? (
              <p className="text-sm text-gray-500 mb-3">Connect your wallet to continue.</p>
            ) : null}
            {onchainTxId && (
              <p className="text-xs text-gray-500 mb-3 break-all">Tx: {onchainTxId}</p>
            )}
            <Button
              variant="neon"
              size="small"
              onClick={handleOnchainRegister}
              disabled={!walletConnected || !walletAddress || onchainRegistered}
            >
              {onchainRegistered ? 'Registered ✓' : 'Complete Registration'}
            </Button>
          </div>
        </Card>
      ) : status?.applied && mode === 'full' ? (
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
              {mode === 'quick'
                ? 'Create your creator profile and start raising funds immediately. Your profile will start with standard funding limits — you can apply for higher limits later.'
                : 'Get verified to build trust with backers and unlock higher campaign funding limits. Submit your identity details for review, then complete a one-time wallet registration.'}
            </p>
          </Card>

          <Card variant="light" padding="default">
            <div className="space-y-4">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-sm font-semibold text-white">{mode === 'quick' ? 'Quick Register' : 'Verification Application'}</h3>
                <button onClick={() => setMode('select')} className="text-xs text-gray-500 hover:text-gray-300">Change mode</button>
              </div>

              <div>
                <label className="block text-xs text-gray-400 mb-1">Full Name *</label>
                <Input value={name} onChange={e => setName(e.target.value)} placeholder="Your legal or stage name" />
              </div>

              {mode === 'quick' && (
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Project Category *</label>
                  <select
                    value={projectVertical}
                    onChange={e => setProjectVertical(e.target.value)}
                    className="w-full px-4 py-3 text-sm text-white bg-transparent border border-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent"
                  >
                    {VERTICALS.map(v => <option key={v.value} value={v.value}>{v.label}</option>)}
                  </select>
                </div>
              )}

              {mode === 'full' && (
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
              )}

              <div>
                <label className="block text-xs text-gray-400 mb-1">Portfolio URL (Behance, YouTube, Vimeo, personal site, etc.)</label>
                <Input value={portfolioUrl} onChange={e => setPortfolioUrl(e.target.value)} placeholder="https://behance.net/yourname" />
              </div>

              {mode === 'full' && (
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
              )}

              {mode === 'quick' && (
                <div className="bg-[#4ade80]/5 border border-[#4ade80]/20 rounded-lg p-3">
                  <p className="text-xs text-gray-400">
                    <span className="text-[#4ade80] font-semibold">Get started today:</span> Register once, no wallet needed. You can start raising funds for your first project immediately.
                  </p>
                </div>
              )}

              <div className="pt-2">
                <Button variant="neon" onClick={mode === 'quick' ? handleQuickRegister : handleApply} className="w-full">
                  {mode === 'quick' ? 'Register Creator Profile' : 'Submit Application'}
                </Button>
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
        onRetry={handleApply}
      />
    </div>
  );
}
