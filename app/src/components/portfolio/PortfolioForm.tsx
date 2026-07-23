import { useState } from 'react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Input from '../ui/Input';
import MediaLinkCard from './MediaLinkCard';
import { API_BASE } from '../../services/api';
import { CATEGORY_VALUES } from '../../constants/categories';
import type { PortfolioItem } from '../../types';

interface PortfolioFormProps {
  address: string;
  item?: PortfolioItem;
  onSubmit: (item: Omit<PortfolioItem, 'id'>) => void;
  onCancel: () => void;
}

const CATEGORIES = CATEGORY_VALUES;

export default function PortfolioForm({ address, item, onSubmit, onCancel }: PortfolioFormProps) {
  const [title, setTitle] = useState(item?.title || '');
  const [description, setDescription] = useState(item?.description || '');
  const [category, setCategory] = useState(item?.category || 'film');
  const [role, setRole] = useState(item?.role || '');
  const [year, setYear] = useState(String(item?.year || new Date().getFullYear()));
  const [mediaUrlInput, setMediaUrlInput] = useState('');
  const [mediaUrls, setMediaUrls] = useState<string[]>(item?.mediaUrls || []);
  const [thumbnailUrl, setThumbnailUrl] = useState(item?.thumbnailUrl || '');
  const [thumbnailUploading, setThumbnailUploading] = useState(false);
  const [awardsInput, setAwardsInput] = useState(item?.awards?.join(', ') || '');
  const [error, setError] = useState('');

  const handleAddUrl = () => {
    const url = mediaUrlInput.trim();
    if (!url) return;
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      setError('Please enter a valid URL starting with http:// or https://');
      return;
    }
    setMediaUrls(prev => [...prev, url]);
    setMediaUrlInput('');
    setError('');
  };

  const handleRemoveUrl = (index: number) => {
    setMediaUrls(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = () => {
    if (!title.trim()) { setError('Title is required'); return; }
    if (!role.trim()) { setError('Role is required'); return; }
    const parsedYear = parseInt(year, 10);
    if (isNaN(parsedYear) || parsedYear < 1900 || parsedYear > 2100) { setError('Enter a valid year (1900-2100)'); return; }

    const awards = awardsInput.trim()
      ? awardsInput.split(',').map(a => a.trim()).filter(Boolean)
      : undefined;

    onSubmit({
      address,
      title: title.trim(),
      description: description.trim(),
      category,
      role: role.trim(),
      year: parsedYear,
      mediaUrls,
      thumbnailUrl: thumbnailUrl || undefined,
      awards: awards?.length ? awards : undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onCancel}>
      <div className="bg-[#0a0a0f] border border-[#1a1a2e] rounded-2xl p-8 w-full max-w-xl mx-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-white">{item ? 'Edit Work' : 'Add to Portfolio'}</h3>
          <button onClick={onCancel} className="text-gray-500 hover:text-gray-300 text-xl leading-none">✕</button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs text-gray-400 mb-1">Title *</label>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Echoes of Harmattan" />
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1">Thumbnail</label>
            {thumbnailUrl ? (
              <div className="relative w-full h-32 rounded-lg overflow-hidden mb-2">
                <img src={thumbnailUrl} alt="Thumbnail" className="w-full h-full object-cover" />
                <button
                  onClick={() => setThumbnailUrl('')}
                  className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center text-xs hover:bg-black/80"
                >
                  ✕
                </button>
              </div>
            ) : (
              <label className="flex items-center justify-center w-full h-20 border-2 border-dashed border-gray-800 rounded-lg cursor-pointer hover:border-gray-600 transition-colors">
                <span className="text-xs text-gray-500">Click to upload thumbnail image</span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    setThumbnailUploading(true);
                    const formData = new FormData();
                    formData.append('file', file);
                    try {
                      const token = localStorage.getItem('cinex_auth_token');
                      const headers: Record<string, string> = {};
                      if (token) headers['Authorization'] = `Bearer ${token}`;
                      const res = await fetch(`${API_BASE}/upload`, { method: 'POST', headers, body: formData });
                      const data = await res.json();
                      if (data.url) setThumbnailUrl(data.url);
                    } catch {
                      setError('Failed to upload thumbnail');
                    }
                    setThumbnailUploading(false);
                  }}
                />
              </label>
            )}
            {thumbnailUploading && <p className="text-xs text-gray-500 mt-1">Uploading...</p>}
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1">Description</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Brief description of your role and the project..."
              className="w-full px-4 py-3 text-sm text-white bg-transparent border border-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent placeholder-gray-400 resize-none h-20"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Category</label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value as typeof category)}
                className="w-full px-4 py-3 text-sm text-white bg-[#0a0a0f] border border-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent"
              >
                {CATEGORIES.map(c => (
                  <option key={c} value={c}>{c.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Role</label>
              <Input value={role} onChange={e => setRole(e.target.value)} placeholder="Your role" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Year</label>
              <Input type="number" value={year} onChange={e => setYear(e.target.value)} placeholder="2026" />
            </div>
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1">Media URLs</label>
            <div className="flex gap-2 mb-2">
              <div className="flex-1">
                <Input value={mediaUrlInput} onChange={e => setMediaUrlInput(e.target.value)} placeholder="https://youtube.com/..." />
              </div>
              <Button variant="outline" size="small" onClick={handleAddUrl} type="button">Add</Button>
            </div>
            {mediaUrls.length > 0 && (
              <div className="space-y-1.5">
                {mediaUrls.map((url, i) => (
                  <MediaLinkCard key={`${url}-${i}`} url={url} onRemove={() => handleRemoveUrl(i)} />
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1">Awards (comma-separated)</label>
            <Input value={awardsInput} onChange={e => setAwardsInput(e.target.value)} placeholder="e.g. Best Doc — AFRIFF 2025, Official Selection..." />
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <div className="flex gap-3 pt-2">
            <Button variant="primary" onClick={handleSubmit}>{item ? 'Save Changes' : 'Add to Portfolio'}</Button>
            <Button variant="ghost" onClick={onCancel}>Cancel</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
