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

const VERIFICATION_LEVELS = [
  { value: 1, label: 'Basic (1 year, 1 STX fee)' },
  { value: 2, label: 'Standard (2 years, 5 STX fee)' },
];

export default function VerificationPage() {
  const { currentUser } = useDemoMode();
  const { user } = useAuth();
  const activeUser = currentUser || user;
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
  const [verificationLevel, setVerificationLevel] = useState(1);
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
          uintCV(verificationLevel),
          uintCV(99999999),
        ],
        appDetails: { name: 'CineX', icon: window.location.origin + '/favicon.ico' },
        onFinish: async (data) => {
          setOnchainTxId(data.txId);
          tx.succeed(data.txId);
          setOnchainRegistered(true);
          if (mode === 'full') {
            setTimeout(async () => {
              await api.post('/verification/notify-registered', { address: walletAddress });
              refreshStatus();
            }, 5000);
          } else {
            setTimeout(() => refreshStatus(), 5000);
          }
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
        {mode === 'select' && status?.hasIdentity && !status.onchainVerified && (
          <span className="text-xs px-2 py-0.5 rounded bg-yellow-500/20 text-yellow-400">Unverified</span>
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
            <h2 className="text-lg font-semibold text-white mb-2">Fully Verified (On-Chain)</h2>
            <p className="text-sm text-gray-400 mb-4">Your identity is verified on the blockchain. You can access higher campaign funding limits.</p>
            <Button variant="outline" size="small" onClick={() => navigate(`/profile/${activeUser.address}`)}>View Profile</Button>
          </div>
        </Card>
      ) : status?.hasIdentity && mode === 'select' ? (
        <Card variant="light" padding="default">
          <div className="text-center py-6">
            <div className="w-16 h-16 rounded-full bg-blue-500/20 flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl text-blue-400">⟳</span>
            </div>
            <h2 className="text-lg font-semibold text-white mb-2">Creator Profile Registered</h2>
            <p className="text-sm text-gray-400 mb-4">
              Your creator profile is on-chain but unverified. You can create campaigns up to <strong>1,000 STX</strong>.
              Apply for full verification to unlock higher funding caps.
            </p>
            <Button variant="neon" size="small" onClick={() => setMode('full')}>
              Apply for Full Verification
            </Button>
          </div>
        </Card>
      ) : mode === 'select' ? (
        <>
          <Card variant="light" padding="default" className="mb-4">
            <p className="text-sm text-gray-400 leading-relaxed">
              Register your creator profile on-chain to start raising funds. Unverified creators can raise up to <strong>1,000 STX</strong>.
              Apply for full verification to unlock up to <strong>100,000 STX</strong> funding caps.
            </p>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <Card variant="light" padding="default" className="cursor-pointer hover:border-[#4ade80]/50 transition-all" onClick={() => setMode('quick')}>
              <div className="text-center py-4">
                <div className="w-12 h-12 rounded-full bg-[#4ade80]/10 flex items-center justify-center mx-auto mb-3">
                  <span className="text-xl">⚡</span>
                </div>
                <h3 className="text-sm font-semibold text-white mb-2">Quick Register</h3>
                <p className="text-xs text-gray-500">Register your creator profile on-chain in one step. Start raising up to 1,000 STX immediately.</p>
              </div>
            </Card>

            <Card variant="light" padding="default" className="cursor-pointer hover:border-[#00e5ff]/50 transition-all" onClick={() => setMode('full')}>
              <div className="text-center py-4">
                <div className="w-12 h-12 rounded-full bg-[#00e5ff]/10 flex items-center justify-center mx-auto mb-3">
                  <span className="text-xl">✓</span>
                </div>
                <h3 className="text-sm font-semibold text-white mb-2">Apply for Verification</h3>
                <p className="text-xs text-gray-500">Submit an application for admin review. Get verified to unlock up to 100,000 STX funding caps.</p>
              </div>
            </Card>
          </div>
        </>
      ) : status?.verified && !onchainRegistered ? (
        <Card variant="light" padding="default">
          <div className="text-center py-6">
            <div className="w-16 h-16 rounded-full bg-yellow-500/20 flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">⏳</span>
            </div>
            <h2 className="text-lg font-semibold text-white mb-2">Approved — Register on Blockchain</h2>
            <p className="text-sm text-gray-400 mb-4">
              {mode === 'quick'
                ? 'Complete your on-chain registration to activate your creator profile.'
                : 'Your application is approved. Register your identity on-chain to activate verification and unlock higher funding caps.'}
            </p>
            {!walletInstalled ? (
              <div className="bg-yellow-900/20 border border-yellow-700/40 rounded-lg p-3 text-sm text-yellow-300 mb-3">
                No Stacks wallet detected.{' '}
                <a href="https://www.hiro.so/wallet" target="_blank" rel="noopener noreferrer" className="text-[#4ade80] underline">Install Hiro Wallet</a> to register on-chain.
              </div>
            ) : !walletConnected || !walletAddress ? (
              <p className="text-sm text-gray-500 mb-3">Connect your Stacks wallet to continue.</p>
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
              {onchainRegistered ? 'Registered ✓' : 'Register on Blockchain'}
            </Button>
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
              {mode === 'quick'
                ? 'Register your creator profile on the Stacks blockchain. Your profile will start as unverified, allowing you to raise up to 1,000 STX per campaign. You can apply for full verification later.'
                : 'Get verified to build trust with backers and unlock higher campaign funding limits. Verification requires submitting your identity details for review by our gatekeepers, then registering on the blockchain via your Stacks wallet.'}
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
                  <label className="block text-xs text-gray-400 mb-1">Project Vertical *</label>
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
                <label className="block text-xs text-gray-400 mb-1">Portfolio URL</label>
                <Input value={portfolioUrl} onChange={e => setPortfolioUrl(e.target.value)} placeholder="https://your-portfolio.com" />
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
                    <span className="text-[#4ade80] font-semibold">Unverified cap:</span> 1,000 STX (≈ $1,000) per campaign.
                    You can raise funds immediately after registering.
                  </p>
                </div>
              )}

              {mode === 'quick' && (
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Verification Level</label>
                  <select
                    value={verificationLevel}
                    onChange={e => setVerificationLevel(Number(e.target.value))}
                    className="w-full px-4 py-3 text-sm text-white bg-transparent border border-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent"
                  >
                    {VERIFICATION_LEVELS.map(v => <option key={v.value} value={v.value}>{v.label}</option>)}
                  </select>
                </div>
              )}

              <div className="pt-2 space-y-2">
                <Button variant="neon" onClick={mode === 'quick' ? handleOnchainRegister : handleApply}>
                  {mode === 'quick' ? 'Register Creator Profile' : 'Submit Application'}
                </Button>
                {!walletConnected && mode === 'quick' && (
                  <p className="text-xs text-yellow-400">Connect your Stacks wallet to register on-chain.</p>
                )}
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
