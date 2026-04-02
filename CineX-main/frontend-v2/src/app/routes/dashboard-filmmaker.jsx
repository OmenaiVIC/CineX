import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@contexts/StacksAuthContext';
import DashboardLayout from '@components/dashboard/DashboardLayout';

export default function FilmmakerDashboard() {
  const { userData, isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();

  if (isLoading) return <div className="p-12 text-center">Loading...</div>;
  if (!isAuthenticated) {
    navigate('/login');
    return null;
  }

  return (
    <DashboardLayout>
      <section className="container mx-auto px-4 py-12">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-3xl font-bold">Filmmaker Dashboard</h2>
            <p className="text-gray-400">Create and manage your campaigns, pools and submissions.</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-400">Welcome back, <span className="font-semibold text-white">{userData?.name || 'Filmmaker'}</span></p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="p-6 bg-black border border-gray-800 rounded-2xl text-white">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">Create Campaign</h3>
                <p className="text-gray-400 text-sm">Start a public campaign to raise funds from the CineX community.</p>
              </div>
              <div className="text-yellow-400 text-3xl">🎬</div>
            </div>
            <div className="mt-6">
              <Link to="/dashboard/filmmaker/create-campaign" className="inline-flex items-center gap-3 px-4 py-2 bg-yellow-400 text-black rounded-lg font-semibold hover:bg-yellow-500 transition">Create Campaign</Link>
            </div>
          </div>

          <div className="p-6 bg-black border border-gray-800 rounded-2xl text-white">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">Private Pools</h3>
                <p className="text-gray-400 text-sm">Set up invite-only pools for co-producers and selected investors.</p>
              </div>
              <div className="text-yellow-400 text-3xl">🔒</div>
            </div>
            <div className="mt-6">
              <button onClick={() => navigate('/dashboard/filmmaker/create-campaign?type=private')} className="inline-flex items-center gap-3 px-4 py-2 bg-yellow-400 text-black rounded-lg font-semibold hover:bg-yellow-500 transition">Create Private Pool</button>
            </div>
          </div>

          <div className="p-6 bg-black border border-gray-800 rounded-2xl text-white">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">My Campaigns</h3>
                <p className="text-gray-400 text-sm">View and manage your existing campaigns and performance.</p>
              </div>
              <div className="text-yellow-400 text-3xl">📊</div>
            </div>
            <div className="mt-6">
              <Link to="/dashboard/filmmaker/crowdfunding" className="inline-flex items-center gap-3 px-4 py-2 border border-yellow-400 text-yellow-400 rounded-lg font-semibold hover:bg-yellow-400 hover:text-black transition">View Campaigns</Link>
            </div>
          </div>

          <div className="p-6 bg-black border border-gray-800 rounded-2xl text-white">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">Active Pools</h3>
                <p className="text-gray-400 text-sm">Browse active pools and discover collaborators.</p>
              </div>
              <div className="text-yellow-400 text-3xl">🌐</div>
            </div>
            <div className="mt-6">
              <Link to="/active-pools" className="inline-flex items-center gap-3 px-4 py-2 bg-transparent border border-gray-700 text-gray-300 rounded-lg hover:bg-gray-800 transition">Explore Pools</Link>
            </div>
          </div>

          <div className="p-6 col-span-1 sm:col-span-2 lg:col-span-3 bg-black border border-gray-800 rounded-2xl text-white">
            <h4 className="text-white font-semibold mb-3">Quick Actions</h4>
            <div className="flex flex-wrap gap-3">
              <Link to="/dashboard/filmmaker/create-campaign" className="px-4 py-2 bg-yellow-400 text-black rounded-lg font-medium">New Campaign</Link>
              <button onClick={() => navigate('/dashboard/filmmaker/create-campaign?type=private')} className="px-4 py-2 bg-yellow-400 text-black rounded-lg font-medium">New Private Pool</button>
              <Link to="/dashboard/filmmaker/crowdfunding" className="px-4 py-2 border border-gray-700 text-gray-300 rounded-lg">Manage Campaigns</Link>
              <Link to="/active-pools" className="px-4 py-2 border border-gray-700 text-gray-300 rounded-lg">Browse Pools</Link>
            </div>
          </div>
        </div>

        {/* Projects overview */}
        <div className="mt-10 grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="p-6 bg-black border border-gray-800 rounded-2xl text-white">
            <h4 className="text-lg font-semibold mb-4">Projects In Progress</h4>
            <div className="space-y-3">
              <div className="p-4 bg-gray-900/30 border border-gray-800 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold">Ethereal Dreams</p>
                    <p className="text-sm text-gray-400">75% funded — 18 days left</p>
                  </div>
                  <Link to="/dashboard/filmmaker/crowdfunding" className="px-3 py-1 bg-yellow-400 text-black rounded font-medium">Manage</Link>
                </div>
              </div>

              <div className="p-4 bg-gray-900/30 border border-gray-800 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold">Echoes of Tomorrow</p>
                    <p className="text-sm text-gray-400">70% funded — 31 days left</p>
                  </div>
                  <Link to="/dashboard/filmmaker/crowdfunding" className="px-3 py-1 bg-yellow-400 text-black rounded font-medium">Manage</Link>
                </div>
              </div>
            </div>
          </div>

          <div className="p-6 bg-black border border-gray-800 rounded-2xl text-white">
            <h4 className="text-lg font-semibold mb-4">Completed Projects</h4>
            <div className="space-y-3">
              <div className="p-4 bg-gray-900/30 border border-gray-800 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold">Beyond the Horizon</p>
                    <p className="text-sm text-gray-400">Completed — 85,000 STX raised</p>
                  </div>
                  <Link to="/dashboard/filmmaker/crowdfunding" className="px-3 py-1 border border-gray-700 text-gray-300 rounded font-medium">View</Link>
                </div>
              </div>

              <div className="p-4 bg-gray-900/30 border border-gray-800 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold">City Pulse</p>
                    <p className="text-sm text-gray-400">Completed — 42,000 STX raised</p>
                  </div>
                  <Link to="/dashboard/filmmaker/crowdfunding" className="px-3 py-1 border border-gray-700 text-gray-300 rounded font-medium">View</Link>
                </div>
              </div>
            </div>
          </div>

        </div>
      </section>
    </DashboardLayout>
  );
}
