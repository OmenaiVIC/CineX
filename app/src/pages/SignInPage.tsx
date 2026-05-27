import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import * as api from '../services/api';

export default function SignInPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<'wallet' | 'email'>('wallet');
  const [address, setAddress] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const body = tab === 'wallet'
      ? { address: address.trim() }
      : { email: email.trim(), password };

    if (tab === 'wallet' && (!address.trim() || address.trim().length < 10)) {
      setError('Enter a valid Stacks address');
      return;
    }
    if (tab === 'email' && (!email.trim() || !password)) {
      setError('Enter email and password');
      return;
    }

    setLoading(true);
    const res = await api.post<{ token: string; user: { id: number; address: string | null; email: string | null; displayName: string; role: string } }>('/auth/login', body);
    setLoading(false);

    if (res.success && res.data) {
      login(res.data.token, res.data.user);
      navigate('/dashboard');
    } else {
      setError(res.error || 'Login failed');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-white">Welcome Back</h1>
          <p className="text-sm text-gray-500 mt-2">Sign in to your CineX account</p>
        </div>

        <Card variant="light" padding="default">
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
              <div>
                <label className="block text-xs text-gray-400 mb-1">Stacks Address</label>
                <Input
                  value={address}
                  onChange={e => setAddress(e.target.value)}
                  placeholder="ST1J4G6R0VX7NZYF1DGX8MNSNYVE3VGZJSRTPGZGM"
                />
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
                    placeholder="Enter your password"
                  />
                </div>
              </>
            )}

            {error && <p className="text-sm text-red-400">{error}</p>}

            <Button variant="primary" className="w-full" disabled={loading}>
              {loading ? 'Signing In...' : 'Sign In'}
            </Button>
          </form>

          <p className="text-xs text-gray-600 text-center mt-4">
            Don't have an account?{' '}
            <button onClick={() => navigate('/signup')} className="text-[#4ade80] hover:underline">Create one</button>
          </p>
        </Card>
      </div>
    </div>
  );
}
