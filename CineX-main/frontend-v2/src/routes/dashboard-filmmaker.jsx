import React from 'react';
import { useAuth } from '@contexts/StacksAuthContext';

export default function FilmmakerDashboard() {
  const { userData } = useAuth();

  return (
    <section className="container mx-auto px-4 py-12">
      <h2 className="text-3xl font-bold mb-4">Filmmaker Dashboard</h2>
      <p className="text-gray-600 mb-6">Create public campaigns or private/Co-Executive Producer funding pools, and manage submissions.</p>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="p-6 bg-white rounded-lg shadow">
          <h3 className="font-semibold mb-2">Create New Campaign</h3>
          <p className="text-sm text-gray-700">Start a public campaign to raise funds from the community.</p>
          <div className="mt-4">
            <button className="px-4 py-2 bg-yellow-400 rounded text-black font-bold">Create Campaign</button>
          </div>
        </div>

        <div className="p-6 bg-white rounded-lg shadow">
          <h3 className="font-semibold mb-2">Private/Co-EP Pools</h3>
          <p className="text-sm text-gray-700">Set up private or Co-Executive Producer pools for selected investors.</p>
          <div className="mt-4">
            <button className="px-4 py-2 bg-yellow-400 rounded text-black font-bold">Create Private /Co-EP Pool</button>
          </div>
        </div>
      </div>
    </section>
  );
}
