import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@contexts/StacksAuthContext';
import DashboardLayout from '@components/dashboard/DashboardLayout';

export default function DashboardRouter() {
  const { isAuthenticated, isLoading, userType } = useAuth();
  const navigate = useNavigate();

  if (isLoading) return <div className="p-12 text-center">Loading...</div>;

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center">
          <h1 className="text-4xl font-bold text-white mb-4">Welcome to CineX</h1>
          <p className="text-gray-300 mb-8">Connect your wallet to access your dashboard and explore opportunities in decentralized film funding.</p>
          <div className="bg-black border border-gray-800 rounded-2xl p-8 mb-6">
            <div className="text-yellow-400 text-5xl mb-4">🔐</div>
            <h3 className="text-xl font-semibold text-white mb-2">Wallet Connection Required</h3>
            <p className="text-gray-400 text-sm mb-6">Sign in with your Stacks wallet to get started</p>
            <button onClick={() => navigate('/login')} className="w-full px-6 py-3 bg-yellow-400 text-black font-bold rounded-lg hover:bg-yellow-500 transition duration-300">
              Connect Wallet
            </button>
          </div>
          <p className="text-gray-500 text-xs">Secure • Non-custodial • Decentralized</p>
        </div>
      </div>
    );
  }

  // Redirect to role-specific dashboard automatically
  React.useEffect(() => {
    if (userType && isAuthenticated) {
      if (userType === 'filmmaker') navigate('/dashboard/filmmaker');
      else if (userType === 'endorser') navigate('/dashboard/endorser');
      else navigate('/dashboard/public');
    }
  }, [userType, isAuthenticated, navigate]);

  // Styled dashboard entry with role cards
  return (
    <DashboardLayout>
      <section className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold">Your Dashboard</h1>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Link to="/dashboard/public" className="p-6 bg-black border border-gray-800 rounded-2xl text-white hover:shadow-lg transition">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-semibold">Public Dashboard</h3>
                  <p className="text-gray-400 text-sm mt-2">Overview and discover public projects and pools.</p>
                </div>
                <div className="text-yellow-400 text-3xl">🌐</div>
              </div>
            </Link>

            <Link to="/dashboard/filmmaker" className="p-6 bg-black border border-gray-800 rounded-2xl text-white hover:shadow-lg transition">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-semibold">Filmmaker Dashboard</h3>
                  <p className="text-gray-400 text-sm mt-2">Create and manage campaigns, private pools and submissions.</p>
                </div>
                <div className="text-yellow-400 text-3xl">🎬</div>
              </div>
            </Link>

            <Link to="/dashboard/endorser" className="p-6 bg-black border border-gray-800 rounded-2xl text-white hover:shadow-lg transition">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-semibold">Endorser Dashboard</h3>
                  <p className="text-gray-400 text-sm mt-2">Tasks, reviews and endorsement history.</p>
                </div>
                <div className="text-yellow-400 text-3xl">✅</div>
              </div>
            </Link>
          </div>
        </div>
      </section>
    </DashboardLayout>
  );
}
