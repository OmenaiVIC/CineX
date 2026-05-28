import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useStacksConnect } from '../hooks/useStacksConnect';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import * as api from '../services/api';

export default function SignUpPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const fromDemo = searchParams.get('from') === 'demo';
  const { connectWallet, disconnectWallet, connected, installed, address: stacksAddress } = useStacksConnect();
  const [tab, setTab] = useState<'wallet' | 'email'>('wallet');

  const initialName = fromDemo
    ? (() => {
        try {
          const raw = sessionStorage.getItem('cinex_demo_identity');
          if (raw) {
            const identity = JSON.parse(raw);
            if (identity.address) {
              const stored = sessionStorage.getItem('cinex_demo_name');
              return stored || identity.address.slice(0, 8);
            }
          }
        } catch { /* ignore */ }
        return '';
      })()
    : '';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState(initialName);
  const [role, setRole] = useState<'creative' | 'backer'>('creative');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [connError, setConnError] = useState('');

  const handleWalletConnect = async () => {
    setConnError('');
    const addr = await connectWallet();
    if (!addr) {
      setConnError('Wallet connection cancelled or failed');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!displayName.trim()) { setError('Display name is required'); return; }

    if (tab === 'wallet') {
      if (!connected || !stacksAddress) { setError('Connect your Stacks wallet first'); return; }
    } else {
      if (!email.trim() || !email.includes('@')) { setError('Enter a valid email address'); return; }
      if (!password || password.length < 6) { setError('Password must be at least 6 characters'); return; }
    }

    setLoading(true);
    const body = tab === 'wallet'
      ? { address: stacksAddress, displayName: displayName.trim(), role }
      : { email: email.trim(), password, displayName: displayName.trim(), role };

    const res = await api.post<{ token: string; user: { id: number; address: string | null; email: string | null; displayName: string; role: string } }>('/auth/register', body);
    setLoading(false);

    if (res.success && res.data) {
      login(res.data.token, res.data.user);
      navigate('/dashboard');
    } else {
      setError(res.error || 'Registration failed');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-white">Create Your Account</h1>
          <p className="text-sm text-gray-500 mt-2">Join CineX and start your creative journey</p>
        </div>

        <Card variant="light" padding="default">
          {fromDemo && (
            <div className="mb-4 bg-[rgba(74,222,128,0.1)] border border-[rgba(74,222,128,0.25)] rounded-lg px-4 py-3 text-xs text-gray-300">
              Migrating from demo — your display name has been pre-filled. Complete signup to create your real account.
            </div>
          )}
          <div className="flex mb-6 bg-black/30 rounded-lg p-1">
            <button
              onClick={() => setTab('wallet')}
              className={`flex-1 py-2 text-sm rounded-md transition-all ${tab === 'wallet' ? 'bg-[#4ade80] text-black font-medium' : 'text-gray-400 hover:text-white'}`}
            >
              Stacks Wallet
            </button>
            <button
              onClick={() => setTab('email')}
              className={`flex-1 py-2 text-sm rounded-md transition-all ${tab === 'email' ? 'bg-[#4ade80] text-black font-medium' : 'text-gray-400 hover:text-white'}`}
            >
              Email
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {tab === 'wallet' ? (
              <div className="space-y-3">
                {!installed ? (
                  <div className="bg-yellow-900/20 border border-yellow-700/40 rounded-lg p-3 text-sm text-yellow-300">
                    No Stacks wallet detected.{' '}
                    <a
                      href="https://www.hiro.so/wallet"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#4ade80] underline"
                    >
                      Install Hiro Wallet
                    </a>{' '}
                    to connect.
                  </div>
                ) : connected && stacksAddress ? (
                  <div className="bg-black/30 rounded-lg p-3">
                    <label className="block text-xs text-gray-400 mb-1">Connected Address</label>
                    <p className="text-sm text-white font-mono break-all">{stacksAddress}</p>
                    <button
                      type="button"
                      onClick={disconnectWallet}
                      className="text-xs text-gray-500 hover:text-red-400 mt-2 transition-colors"
                    >
                      Disconnect
                    </button>
                  </div>
                ) : (
                  <div>
                    <button
                      type="button"
                      onClick={handleWalletConnect}
                      className="w-full py-3 px-4 bg-[#4ade80] text-black font-medium rounded-lg hover:bg-[#3bcc6e] transition-colors text-sm"
                    >
                      Connect Stacks Wallet
                    </button>
                    {connError && <p className="text-xs text-red-400 mt-2">{connError}</p>}
                  </div>
                )}
              </div>
            ) : (
              <>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Email</label>
                  <Input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="you@example.com"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Password</label>
                  <Input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Min 6 characters"
                  />
                </div>
              </>
            )}

            <div>
              <label className="block text-xs text-gray-400 mb-1">Display Name</label>
              <Input
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                placeholder="Your name or studio name"
              />
            </div>

            <div>
              <label className="block text-xs text-gray-400 mb-2">I want to join as</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setRole('creative')}
                  className={`flex-1 py-2 px-3 text-sm rounded-lg border transition-all ${
                    role === 'creative'
                      ? 'bg-[#4ade80]/20 border-[#4ade80] text-[#4ade80] font-medium'
                      : 'border-gray-800 text-gray-400 hover:border-gray-600'
                  }`}
                >
                  Creative
                </button>
                <button
                  type="button"
                  onClick={() => setRole('backer')}
                  className={`flex-1 py-2 px-3 text-sm rounded-lg border transition-all ${
                    role === 'backer'
                      ? 'bg-[#4ade80]/20 border-[#4ade80] text-[#4ade80] font-medium'
                      : 'border-gray-800 text-gray-400 hover:border-gray-600'
                  }`}
                >
                  Backer
                </button>
              </div>
            </div>

            {error && <p className="text-sm text-red-400">{error}</p>}

            <Button variant="primary" className="w-full" disabled={loading}>
              {loading ? 'Creating Account...' : 'Create Account'}
            </Button>
          </form>

          <p className="text-xs text-gray-600 text-center mt-4">
            Already have an account?{' '}
            <button onClick={() => navigate('/signin')} className="text-[#4ade80] hover:underline">Sign In</button>
          </p>
        </Card>
      </div>
    </div>
  );
}
