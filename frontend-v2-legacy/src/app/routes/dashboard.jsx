import React from 'react';
import { Navigate, Link } from 'react-router-dom';
import { useAuth } from '@contexts/StacksAuthContext';
import { useRole } from '@hooks/useRole';
import DashboardLayout from '@components/dashboard/DashboardLayout';

export default function DashboardRouter() {
  const { isAuthenticated, isLoading } = useAuth();
  const { role, isOnboarded, isLoading: roleLoading } = useRole();

  if (isLoading || roleLoading) return <div className="p-12 text-center text-gray-400">Loading...</div>;

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
            <Link to="/login" className="block w-full px-6 py-3 bg-yellow-400 text-black font-bold rounded-lg hover:bg-yellow-500 transition duration-300 text-center">
              Connect Wallet
            </Link>
          </div>
          <p className="text-gray-500 text-xs">Secure • Non-custodial • Decentralized</p>
        </div>
      </div>
    );
  }

  if (isOnboarded && role === 'creative') {
    return <Navigate to="/dashboard/creator" replace />;
  }

  if (isOnboarded && role === 'backer') {
    return <Navigate to="/dashboard/backer" replace />;
  }

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

            <Link to="/dashboard/creator" className="p-6 bg-black border border-gray-800 rounded-2xl text-white hover:shadow-lg transition">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-semibold">Creator Dashboard</h3>
                  <p className="text-gray-400 text-sm mt-2">Create and manage campaigns, pools, and your portfolio.</p>
                </div>
                <div className="text-yellow-400 text-3xl">🎬</div>
              </div>
            </Link>

            <Link to="/dashboard/backer" className="p-6 bg-black border border-gray-800 rounded-2xl text-white hover:shadow-lg transition">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-semibold">Backer Dashboard</h3>
                  <p className="text-gray-400 text-sm mt-2">Discover projects, track yield, and manage contributions.</p>
                </div>
                <div className="text-yellow-400 text-3xl">💰</div>
              </div>
            </Link>
          </div>
        </div>
      </section>
    </DashboardLayout>
  );
}
