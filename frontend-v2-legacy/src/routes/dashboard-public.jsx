import React from 'react';
import { useAuth } from '@contexts/StacksAuthContext';

export default function PublicDashboard() {
  const { userData } = useAuth();

  return (
    <section className="container mx-auto px-4 py-12">
      <h2 className="text-3xl font-bold mb-4">Public Backer Dashboard</h2>
      <p className="text-gray-600 mb-6">Browse public campaigns and join filmmaker private pools.</p>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="p-6 bg-white rounded-lg shadow">
          <h3 className="font-semibold mb-2">Active Public Campaigns</h3>
          <ul className="text-sm text-gray-700">
            <li>• Ethereal Dreams — 75% funded</li>
            <li>• Midnight in Marrakech — 87% funded</li>
            <li>• Beyond the Horizon — 85% funded</li>
          </ul>
          <div className="mt-4">
            <button className="px-4 py-2 bg-yellow-400 rounded text-black font-bold">Explore Pools</button>
          </div>
        </div>

        <div className="p-6 bg-white rounded-lg shadow">
          <h3 className="font-semibold mb-2">Your Private Pool Invitations</h3>
          <p className="text-sm text-gray-700">No private invitations yet. Browse filmmakers to join private pools.</p>
        </div>
      </div>
    </section>
  );
}
