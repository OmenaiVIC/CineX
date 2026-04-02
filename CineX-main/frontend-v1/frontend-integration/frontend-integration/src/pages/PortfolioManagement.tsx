import React, { useState, useEffect } from 'react';
import { getFilmmakerPortfolioItem, addFilmmakerPortfolio } from '../services/verificationService';
import type { PortfolioItem } from '../types';

const DEFAULT_CATEGORY: PortfolioItem['category'] = 'documentary';

const PortfolioManagement: React.FC = () => {
  const [address, setAddress] = useState('');
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([]);
  const [newItem, setNewItem] = useState<Partial<PortfolioItem>>({ title: '', description: '', category: DEFAULT_CATEGORY, role: '', year: new Date().getFullYear(), mediaUrls: [] });
  const [error, setError] = useState<string | null>(null);

  // Fetch first 5 portfolio items for the given address
  const fetchPortfolio = async () => {
    setError(null);
    if (!address) return;
    const items: PortfolioItem[] = [];
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
    if (!address || !newItem.title || !newItem.description || !newItem.category || !newItem.role || !newItem.year || !newItem.mediaUrls) return;
    try {
      await addFilmmakerPortfolio(
        address,
        newItem.title,
        newItem.mediaUrls[0] || '',
        newItem.description,
        newItem.year
      );
      setNewItem({ title: '', description: '', category: DEFAULT_CATEGORY, role: '', year: new Date().getFullYear(), mediaUrls: [] });
      await fetchPortfolio();
    } catch (e: any) {
      setError(e.message || 'Failed to add portfolio item.');
    }
  };

  return (
    <div>
      <h2>Your Portfolio</h2>
      <input
        type="text"
        placeholder="Your Stacks Address"
        value={address}
        onChange={e => setAddress(e.target.value)}
      />
      <button onClick={fetchPortfolio} disabled={!address}>Fetch Portfolio</button>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <ul>
        {portfolio.map((item, idx) => (
          <li key={idx}>
            <strong>{item.title}</strong> ({item.year}) - {item.role} [{item.category}]
            <div>{item.description}</div>
            {item.mediaUrls && item.mediaUrls.length > 0 && (
              <ul>
                {item.mediaUrls.map((url, i) => (
                  <li key={i}><a href={url} target="_blank" rel="noopener noreferrer">Media {i + 1}</a></li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>
      <div style={{ marginTop: 20 }}>
        <input
          type="text"
          placeholder="Title"
          value={newItem.title || ''}
          onChange={e => setNewItem({ ...newItem, title: e.target.value })}
        />
        <input
          type="text"
          placeholder="Description"
          value={newItem.description || ''}
          onChange={e => setNewItem({ ...newItem, description: e.target.value })}
        />
        <select
          value={newItem.category || DEFAULT_CATEGORY}
          onChange={e => setNewItem({ ...newItem, category: e.target.value as PortfolioItem['category'] })}
        >
          <option value="short-film">Short Film</option>
          <option value="feature">Feature</option>
          <option value="documentary">Documentary</option>
          <option value="music-video">Music Video</option>
          <option value="web-series">Web Series</option>
        </select>
        <input
          type="text"
          placeholder="Role"
          value={newItem.role || ''}
          onChange={e => setNewItem({ ...newItem, role: e.target.value })}
        />
        <input
          type="number"
          placeholder="Year"
          value={newItem.year || new Date().getFullYear()}
          onChange={e => setNewItem({ ...newItem, year: Number(e.target.value) })}
        />
        <input
          type="text"
          placeholder="Media URLs (comma separated)"
          value={newItem.mediaUrls ? newItem.mediaUrls.join(',') : ''}
          onChange={e => setNewItem({ ...newItem, mediaUrls: e.target.value.split(',').map(s => s.trim()) })}
        />
        <button onClick={handleAddItem} disabled={!address}>Add Portfolio Item</button>
      </div>
    </div>
  );
};

export default PortfolioManagement;
