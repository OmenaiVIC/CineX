import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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

export default function VerificationPage() {
  const { currentUser } = useDemoMode();
  const { user } = useAuth();
  const activeUser = currentUser || user;
  const { connected: walletConnected, installed: walletInstalled, address: walletAddress } = useStacksConnect();
  const navigate = useNavigate();
  const tx = useTxModal();

  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [portfolioUrl, setPortfolioUrl] = useState('');
  const [previousWorks, setPreviousWorks] = useState('');
  const [status, setStatus] = useState<{ applied: boolean; verified: boolean; status?: string; onchainVerified?: boolean } | null>(null);
  const [loading, setLoading] = useState(true);
  const [onchainRegistered, setOnchainRegistered] = useState(false);
  const [onchainTxId, setOnchainTxId] = useState('');

  const refreshStatus = () => {
    if (!activeUser?.address) return;
    getVerificationStatus(activeUser.address).then(res => {
      if (res.success && res.data) {
        setStatus({ ...res.data, onchainVerified: false });
      }
      setLoading(false);
    });
    // Also check on-chain status
    api.get<{ identity: unknown; verified: unknown; fundingCap: unknown }>(`/verification/onchain-status/${activeUser.address}`).then(res => {
      if (res.success && res.data) {
        const isVerified = !!(res.data.verified as { okay: boolean })?.okay;
        setStatus(prev => prev ? { ...prev, onchainVerified: isVerified } : prev);
      }
    });
  };

  useEffect(() => {
    refreshStatus();
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
          stringAsciiCV('film'),
          uintCV(1),
          uintCV(99999999),
        ],
        appDetails: { name: 'CineX', icon: window.location.origin + '/favicon.ico' },
        onFinish: async (data) => {
          setOnchainTxId(data.txId);
          tx.succeed(data.txId);
          setOnchainRegistered(true);
          // Notify backend to trigger emergency-verify-creator
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
      <h1 className="text-2xl font-bold text-white mb-6">Creator Verification</h1>

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
      ) : status?.verified ? (
        <Card variant="light" padding="default">
          <div className="text-center py-6">
            <div className="w-16 h-16 rounded-full bg-yellow-500/20 flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">⏳</span>
            </div>
            <h2 className="text-lg font-semibold text-white mb-2">Approved — Register on Blockchain</h2>
            <p className="text-sm text-gray-400 mb-4">
              Your application is approved in our system. To activate on-chain verification and unlock higher funding caps, 
              register your identity on the Stacks blockchain using your wallet.
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
              Get verified to build trust with backers and unlock higher campaign funding limits. 
              Verification requires submitting your identity details for review by our gatekeepers, then registering on the blockchain via your Stacks wallet.
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