import { useState } from 'react';

interface PortfolioItem {
  id: string;
  title: string;
  description: string;
  category: string;
  role: string;
  year: number;
  mediaUrls: string[];
  awards?: string[];
}

interface Props {
  items: PortfolioItem[];
  isOwnProfile: boolean;
  onAdd?: (item: Omit<PortfolioItem, 'id'>) => void;
  onDelete?: (id: string) => void;
}

export default function PortfolioSection({ items, isOwnProfile, onAdd, onDelete }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [newItem, setNewItem] = useState({ title: '', description: '', category: '', role: '', year: new Date().getFullYear() });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newItem.title && onAdd) {
      onAdd(newItem);
      setNewItem({ title: '', description: '', category: '', role: '', year: new Date().getFullYear() });
      setShowForm(false);
    }
  };

  return (
    <section className="bg-black border border-gray-800 rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-white">
          Portfolio ({items.length})
        </h2>
        {isOwnProfile && !showForm && (
          <button onClick={() => setShowForm(true)}
            className="text-sm text-yellow-400 hover:text-yellow-300 transition">
            + Add Item
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="mb-4 p-4 bg-gray-900 rounded-xl space-y-3">
          <input type="text" placeholder="Project title" value={newItem.title}
            onChange={(e) => setNewItem({ ...newItem, title: e.target.value })}
            className="w-full bg-black border border-gray-800 rounded-xl px-4 py-2 text-white text-sm focus:outline-none focus:border-yellow-400/50" required />
          <textarea placeholder="Description" value={newItem.description} rows={2}
            onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
            className="w-full bg-black border border-gray-800 rounded-xl px-4 py-2 text-white text-sm focus:outline-none focus:border-yellow-400/50 resize-none" />
          <div className="grid grid-cols-2 gap-3">
            <input type="text" placeholder="Category (e.g. short-film)" value={newItem.category}
              onChange={(e) => setNewItem({ ...newItem, category: e.target.value })}
              className="w-full bg-black border border-gray-800 rounded-xl px-4 py-2 text-white text-sm focus:outline-none focus:border-yellow-400/50" />
            <input type="text" placeholder="Role (e.g. Director)" value={newItem.role}
              onChange={(e) => setNewItem({ ...newItem, role: e.target.value })}
              className="w-full bg-black border border-gray-800 rounded-xl px-4 py-2 text-white text-sm focus:outline-none focus:border-yellow-400/50" />
          </div>
          <div className="flex justify-between items-center">
            <button type="button" onClick={() => setShowForm(false)}
              className="text-sm text-gray-500 hover:text-gray-300 transition">Cancel</button>
            <button type="submit"
              className="px-4 py-2 bg-yellow-400 text-black font-semibold rounded-xl hover:bg-yellow-300 transition text-sm">
              Add
            </button>
          </div>
        </form>
      )}

      {items.length === 0 ? (
        <p className="text-gray-600 text-sm text-center py-8">
          {isOwnProfile ? 'Add your first portfolio item to showcase your work.' : 'No portfolio items yet.'}
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {items.map((item) => (
            <div key={item.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4 relative group">
              <h3 className="text-white font-medium text-sm">{item.title}</h3>
              {item.description && <p className="text-gray-500 text-xs mt-1 line-clamp-2">{item.description}</p>}
              <div className="flex flex-wrap gap-2 mt-2">
                {item.category && <span className="text-[10px] bg-gray-800 text-gray-400 px-2 py-0.5 rounded-full">{item.category}</span>}
                {item.role && <span className="text-[10px] bg-yellow-400/10 text-yellow-400 px-2 py-0.5 rounded-full">{item.role}</span>}
                <span className="text-[10px] bg-gray-800 text-gray-500 px-2 py-0.5 rounded-full">{item.year}</span>
              </div>
              {isOwnProfile && onDelete && (
                <button onClick={() => onDelete(item.id)}
                  className="absolute top-2 right-2 text-gray-600 hover:text-red-400 transition opacity-0 group-hover:opacity-100">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
