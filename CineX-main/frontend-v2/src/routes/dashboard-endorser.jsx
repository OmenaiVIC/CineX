import React from 'react';
import { useAuth } from '@contexts/StacksAuthContext';

export default function EndorserDashboard() {
  const { userData } = useAuth();

  // Mock verification tasks
  const tasks = [
    { id: 1, title: 'Verify filmmaker: Alice Johnson', payout: '0.5% of fee', status: 'open' },
    { id: 2, title: 'Verify portfolio: Roots Deep', payout: '0.3% of fee', status: 'open' },
  ];

  return (
    <section className="container mx-auto px-4 py-12">
      <h2 className="text-3xl font-bold mb-4">Endorser Dashboard</h2>
      <p className="text-gray-600 mb-6">Complete proof-of-work verification tasks to earn a share of verification fees.</p>

      <div className="grid gap-4 max-w-2xl">
        {tasks.map(t => (
          <div key={t.id} className="p-6 bg-white rounded-lg shadow flex justify-between items-center">
            <div>
              <h3 className="font-semibold">{t.title}</h3>
              <p className="text-sm text-gray-600">Reward: <strong className="text-yellow-600">{t.payout}</strong></p>
            </div>
            <div>
              <button className="px-4 py-2 bg-yellow-400 rounded font-bold">Start</button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
