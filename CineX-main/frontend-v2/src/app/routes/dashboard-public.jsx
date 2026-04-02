import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@contexts/StacksAuthContext';
import DashboardLayout from '@components/dashboard/DashboardLayout';

export default function PublicDashboard() {
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
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-3xl font-bold">Public Backer Dashboard</h2>
              <p className="text-gray-400">Browse public campaigns and join filmmaker private pools.</p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="p-6 bg-black border border-gray-800 rounded-2xl text-white">
              <h3 className="font-semibold mb-2 text-white">Active Public Campaigns</h3>
              <ul className="text-sm text-gray-400">
                <li>• Ethereal Dreams — <strong className="text-yellow-400">75% funded</strong></li>
                <li>• Midnight in Marrakech — <strong className="text-yellow-400">87% funded</strong></li>
                <li>• Beyond the Horizon — <strong className="text-yellow-400">85% funded</strong></li>
              </ul>
              <div className="mt-4">
                <Link to="/active-pools" className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-400 rounded text-black font-bold">Explore Pools</Link>
              </div>
            </div>

            <div className="p-6 bg-black border border-gray-800 rounded-2xl text-white">
              <h3 className="font-semibold mb-2 text-white">Your Private Pool Invitations</h3>
              <p className="text-sm text-gray-400">No private invitations yet. Browse filmmakers to join private pools.</p>
            </div>
          </div>
        </div>
      </section>
    </DashboardLayout>
  );
}
