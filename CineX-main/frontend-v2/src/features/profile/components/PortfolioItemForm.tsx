import { useState } from 'react';

interface PortfolioItemFormData {
  title: string;
  description: string;
  category: string;
  role: string;
  year: number;
  mediaUrls: string[];
  awards: string[];
}

interface PortfolioItemFormProps {
  initial?: Partial<PortfolioItemFormData>;
  onSave: (data: PortfolioItemFormData) => Promise<void>;
  onClose: () => void;
}

const categories = [
  { value: 'short-film', label: 'Short Film' },
  { value: 'feature', label: 'Feature' },
  { value: 'documentary', label: 'Documentary' },
  { value: 'music-video', label: 'Music Video' },
  { value: 'web-series', label: 'Web Series' },
];

export default function PortfolioItemForm({ initial, onSave, onClose }: PortfolioItemFormProps) {
  const [title, setTitle] = useState(initial?.title || '');
  const [description, setDescription] = useState(initial?.description || '');
  const [category, setCategory] = useState(initial?.category || 'short-film');
  const [role, setRole] = useState(initial?.role || '');
  const [year, setYear] = useState(initial?.year || new Date().getFullYear());
  const [mediaUrlInput, setMediaUrlInput] = useState('');
  const [mediaUrls, setMediaUrls] = useState<string[]>(initial?.mediaUrls || []);
  const [awardInput, setAwardInput] = useState('');
  const [awards, setAwards] = useState<string[]>(initial?.awards || []);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addMediaUrl = () => {
    if (mediaUrlInput.trim() && !mediaUrls.includes(mediaUrlInput.trim())) {
      setMediaUrls([...mediaUrls, mediaUrlInput.trim()]);
      setMediaUrlInput('');
    }
  };
  const removeMediaUrl = (url: string) => setMediaUrls(mediaUrls.filter((u) => u !== url));
  const addAward = () => {
    if (awardInput.trim() && !awards.includes(awardInput.trim())) {
      setAwards([...awards, awardInput.trim()]);
      setAwardInput('');
    }
  };
  const removeAward = (a: string) => setAwards(awards.filter((x) => x !== a));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await onSave({ title: title.trim(), description, category, role, year, mediaUrls, awards });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">{initial ? 'Edit' : 'Add'} Portfolio Item</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-200 text-xl leading-none">&times;</button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Title *</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Film or project title" />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Category</label>
              <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500">
                {categories.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Role</label>
              <input value={role} onChange={(e) => setRole(e.target.value)} className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Director, Producer..." />
            </div>
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Year</label>
            <input type="number" value={year} onChange={(e) => setYear(Number(e.target.value))} min={1900} max={new Date().getFullYear()} className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Media URLs</label>
            <div className="flex gap-2">
              <input value={mediaUrlInput} onChange={(e) => setMediaUrlInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addMediaUrl())} className="flex-1 px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="https://youtube.com/..." />
              <button type="button" onClick={addMediaUrl} className="px-3 py-2 text-sm rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-200">Add</button>
            </div>
            {mediaUrls.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {mediaUrls.map((url) => (
                  <span key={url} className="flex items-center gap-1 px-2 py-1 bg-gray-700 rounded text-xs text-gray-300">
                    {url.slice(0, 30)}...
                    <button type="button" onClick={() => removeMediaUrl(url)} className="text-red-400 hover:text-red-300 ml-1">&times;</button>
                  </span>
                ))}
              </div>
            )}
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Awards</label>
            <div className="flex gap-2">
              <input value={awardInput} onChange={(e) => setAwardInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addAward())} className="flex-1 px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Award name" />
              <button type="button" onClick={addAward} className="px-3 py-2 text-sm rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-200">Add</button>
            </div>
            {awards.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {awards.map((a) => (
                  <span key={a} className="flex items-center gap-1 px-2 py-1 bg-amber-900/30 text-amber-400 rounded text-xs">
                    {a}
                    <button type="button" onClick={() => removeAward(a)} className="text-red-400 hover:text-red-300 ml-1">&times;</button>
                  </span>
                ))}
              </div>
            )}
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-200">Cancel</button>
            <button type="submit" disabled={saving || !title.trim()} className="px-4 py-2 text-sm rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition-colors disabled:opacity-50">
              {saving ? 'Saving...' : initial ? 'Update' : 'Add Item'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export type { PortfolioItemFormData };
