import React, { useState } from 'react';
import { getFilmmakerPortfolioItem, addFilmmakerPortfolio } from '@services/verificationService';

const categories = [
  { value: 'short-film', label: 'Short Film' },
  { value: 'feature', label: 'Feature' },
  { value: 'documentary', label: 'Documentary' },
  { value: 'music-video', label: 'Music Video' },
  { value: 'web-series', label: 'Web Series' },
];

const emptyItem = { title: '', description: '', category: 'documentary', role: '', year: new Date().getFullYear(), mediaUrls: [] };

export default function PortfolioManagement() {
  const [address, setAddress] = useState('');
  const [portfolio, setPortfolio] = useState([]);
  const [newItem, setNewItem] = useState({ ...emptyItem });
  const [error, setError] = useState(null);

  const fetchPortfolio = async () => {
    setError(null);
    if (!address) return;
    const items = [];
    for (let i = 0; i < 5; i++) {
      try {
        const item = await getFilmmakerPortfolioItem(address, i);
        if (item) items.push(item);
      } catch {}
    }
    setPortfolio(items);
  };

  const handleAddItem = async () => {
    setError(null);
    if (!address || !newItem.title || !newItem.description) return;
    try {
      await addFilmmakerPortfolio(
        address,
        newItem.title,
        newItem.mediaUrls[0] || '',
        newItem.description,
        newItem.year
      );
      setNewItem({ ...emptyItem });
      await fetchPortfolio();
    } catch (e) {
      setError(e.message || 'Failed to add portfolio item.');
    }
  };

  return (
    <section className="container mx-auto px-4 py-12">
      <h2 className="text-3xl font-bold mb-6">Your Portfolio</h2>
      <div className="flex gap-3 mb-6 max-w-md">
        <input
          type="text"
          placeholder="Your Stacks Address"
          value={address}
          onChange={e => setAddress(e.target.value)}
          className="flex-1 border border-gray-300 rounded px-4 py-2"
        />
        <button
          onClick={fetchPortfolio}
          disabled={!address}
          className="px-6 py-3 bg-gray-800 text-white rounded font-semibold hover:bg-gray-900 disabled:opacity-50"
        >
          Fetch Portfolio
        </button>
      </div>
      {error && <p className="text-red-600 mb-4">{error}</p>}

      <h3 className="text-xl font-semibold mb-4">Current Items</h3>
      <ul className="space-y-3 mb-10 max-w-xl">
        {portfolio.map((item, idx) => (
          <li key={idx} className="p-4 bg-white rounded shadow">
            <strong>{item.title}</strong> ({item.year}) - {item.role} [{item.category}]
            <p className="text-gray-600 text-sm mt-1">{item.description}</p>
            {item.mediaUrls?.length > 0 && (
              <div className="flex gap-2 mt-2">
                {item.mediaUrls.map((url, i) => (
                  <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="text-yellow-600 text-sm underline">
                    Media {i + 1}
                  </a>
                ))}
              </div>
            )}
          </li>
        ))}
        {portfolio.length === 0 && <p className="text-gray-500">No portfolio items found.</p>}
      </ul>

      <h3 className="text-xl font-semibold mb-4">Add Portfolio Item</h3>
      <div className="space-y-3 max-w-md">
        <input type="text" placeholder="Title" value={newItem.title} onChange={e => setNewItem({ ...newItem, title: e.target.value })} className="w-full border border-gray-300 rounded px-4 py-2" />
        <input type="text" placeholder="Description" value={newItem.description} onChange={e => setNewItem({ ...newItem, description: e.target.value })} className="w-full border border-gray-300 rounded px-4 py-2" />
        <select value={newItem.category} onChange={e => setNewItem({ ...newItem, category: e.target.value })} className="w-full border border-gray-300 rounded px-4 py-2">
          {categories.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
        <input type="text" placeholder="Role" value={newItem.role} onChange={e => setNewItem({ ...newItem, role: e.target.value })} className="w-full border border-gray-300 rounded px-4 py-2" />
        <input type="number" placeholder="Year" value={newItem.year} onChange={e => setNewItem({ ...newItem, year: Number(e.target.value) })} className="w-full border border-gray-300 rounded px-4 py-2" />
        <input type="text" placeholder="Media URLs (comma separated)" value={newItem.mediaUrls?.join(',') || ''} onChange={e => setNewItem({ ...newItem, mediaUrls: e.target.value.split(',').map(s => s.trim()) })} className="w-full border border-gray-300 rounded px-4 py-2" />
        <button onClick={handleAddItem} disabled={!address} className="px-6 py-3 bg-yellow-400 rounded font-bold hover:bg-yellow-500 disabled:opacity-50">
          Add Portfolio Item
        </button>
      </div>
    </section>
  );
}
