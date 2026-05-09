import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@contexts/StacksAuthContext';
import DashboardLayout from '@components/dashboard/DashboardLayout';

export default function EndorserDashboard() {
  const { userData, isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();

  if (isLoading) return <div className="p-12 text-center">Loading...</div>;
  if (!isAuthenticated) {
    navigate('/login');
    return null;
  }

  // Mock verification tasks
  const defaultTasks = [
    { id: 1, title: 'Verify filmmaker: Alice Johnson', payout: '0.5% of fee', status: 'open', expanded: false },
    { id: 2, title: 'Verify portfolio: Roots Deep', payout: '0.3% of fee', status: 'open', expanded: false },
    { id: 3, title: 'Review sample reel: Neon Paradise', payout: '0.4% of fee', status: 'open', expanded: false },
  ];

  const [tasksState, setTasksState] = useState(defaultTasks);

  const toggleExpand = (id) => setTasksState(prev => prev.map(t => t.id === id ? { ...t, expanded: !t.expanded } : t));
  const startTask = (id) => setTasksState(prev => prev.map(t => t.id === id ? { ...t, status: 'in_progress' } : t));
  const completeTask = (id) => setTasksState(prev => prev.map(t => t.id === id ? { ...t, status: 'completed', expanded: false } : t));

    return (
      <DashboardLayout>
        <section className="container mx-auto px-4 py-12">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-3xl font-bold">Endorser Dashboard</h2>
                <p className="text-gray-400">Complete proof-of-work verification tasks to earn a share of verification fees.</p>
              </div>
            </div>

            <div className="grid gap-4">
              {tasksState.map(t => (
                <div key={t.id} className="p-6 bg-black border border-gray-800 rounded-2xl text-white">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-white">{t.title}</h3>
                        <span className={`px-2 py-1 text-xs rounded ${t.status === 'completed' ? 'bg-green-500 text-black' : t.status === 'in_progress' ? 'bg-yellow-400 text-black' : 'bg-gray-700 text-gray-200'}`}>{t.status.replace('_',' ')}</span>
                      </div>
                      <p className="text-sm text-gray-400 mt-2">Reward: <strong className="text-yellow-400">{t.payout}</strong></p>
                      {t.expanded && (
                        <div className="mt-3 text-gray-300 text-sm">
                          <p>Task details: Verify identity documents, review portfolio and provide endorsement notes. Ensure compliance with platform standards.</p>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col items-end gap-2">
                      <button onClick={() => toggleExpand(t.id)} className="px-3 py-2 border border-gray-700 rounded text-sm text-gray-200">{t.expanded ? 'Hide' : 'Details'}</button>
                      {t.status !== 'completed' ? (
                        <>
                          {t.status === 'open' && <button onClick={() => startTask(t.id)} className="px-4 py-2 bg-yellow-400 rounded font-bold">Start</button>}
                          {t.status === 'in_progress' && <button onClick={() => completeTask(t.id)} className="px-4 py-2 bg-green-500 rounded font-bold">Complete</button>}
                        </>
                      ) : (
                        <div className="text-sm text-gray-300">Finished</div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </DashboardLayout>
    );
}
