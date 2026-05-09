import React, { useState } from 'react';
import DashboardLayout from '@components/dashboard/DashboardLayout';

const MOCK_CAMPAIGNS = [
  { id: 'ethereal', title: 'Ethereal Dreams', target: 250000, raised: 187500, daysLeft: 14 },
  { id: 'midnight', title: 'Midnight in Marrakech', target: 180000, raised: 156600, daysLeft: 7 },
  { id: 'beyond', title: 'Beyond the Horizon', target: 85000, raised: 72250, daysLeft: 21 },
];

export default function FilmmakerCrowdfunding() {
  const [campaigns, setCampaigns] = useState(MOCK_CAMPAIGNS);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', target: '', days: 30 });

  const createCampaign = (e) => {
    e.preventDefault();
    const newCampaign = {
      id: form.title.toLowerCase().replace(/\s+/g, '-'),
      title: form.title,
      target: Number(form.target) || 0,
      raised: 0,
      daysLeft: Number(form.days) || 30,
    };
    setCampaigns([newCampaign, ...campaigns]);
    setForm({ title: '', target: '', days: 30 });
    setShowForm(false);
  };

  return (
    <DashboardLayout>
      <section className="container mx-auto px-4 py-12">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold">Crowdfunding Module</h2>
            <p className="text-gray-600">Manage public campaigns and view performance.</p>
          </div>
          <div>
            <button
              onClick={() => setShowForm((s) => !s)}
              className="px-4 py-2 bg-yellow-400 rounded font-bold text-black"
            >
              {showForm ? 'Cancel' : 'Create Campaign'}
            </button>
          </div>
        </div>

        {showForm && (
          <form onSubmit={createCampaign} className="mb-8 bg-white p-6 rounded shadow">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <input
                required
                placeholder="Campaign Title"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="p-3 border rounded"
              />
              <input
                required
                placeholder="Target Amount (STX)"
                value={form.target}
                onChange={(e) => setForm({ ...form, target: e.target.value })}
                className="p-3 border rounded"
              />
              <input
                placeholder="Days"
                value={form.days}
                onChange={(e) => setForm({ ...form, days: e.target.value })}
                className="p-3 border rounded"
              />
            </div>
            <div className="mt-4">
              <button type="submit" className="px-4 py-2 bg-yellow-500 rounded font-bold text-black">Create</button>
            </div>
          </form>
        )}

        <div className="grid md:grid-cols-3 gap-6">
          {campaigns.map((c) => {
            const pct = Math.min(100, Math.round((c.raised / c.target) * 100));
            return (
              <div key={c.id} className="p-6 bg-white rounded-lg shadow">
                <h3 className="font-semibold text-lg mb-2">{c.title}</h3>
                <p className="text-sm text-gray-500 mb-3">Target: ${c.target.toLocaleString()}</p>
                <div className="w-full bg-gray-200 rounded-full h-3 mb-3 overflow-hidden">
                  <div style={{ width: `${pct}%` }} className="h-full bg-yellow-400"></div>
                </div>
                <p className="text-sm text-gray-600">Raised: ${c.raised.toLocaleString()} — {pct}%</p>
                <p className="text-sm text-gray-500 mt-2">{c.daysLeft} days left</p>
                <div className="mt-4">
                  <button className="px-3 py-2 bg-gray-900 text-white rounded">Manage</button>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </DashboardLayout>
  );
}
