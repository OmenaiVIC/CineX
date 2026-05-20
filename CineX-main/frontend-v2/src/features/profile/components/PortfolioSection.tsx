import type { PortfolioItem } from '../../../types';

interface PortfolioSectionProps {
  items: PortfolioItem[];
  isOwner?: boolean;
  onAdd?: () => void;
  onDelete?: (id: string) => void;
}

const categoryLabels: Record<string, string> = {
  'short-film': 'Short Film',
  'feature': 'Feature',
  'documentary': 'Documentary',
  'music-video': 'Music Video',
  'web-series': 'Web Series',
};

export default function PortfolioSection({ items, isOwner = false, onAdd, onDelete }: PortfolioSectionProps) {
  if (items.length === 0) {
    return (
      <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">Portfolio</h2>
          {isOwner && onAdd && (
            <button onClick={onAdd} className="px-3 py-1.5 text-xs rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition-colors">
              + Add Item
            </button>
          )}
        </div>
        <p className="text-gray-500 text-sm">No portfolio items yet{isOwner ? ' — add your work to build credibility' : '.'}</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-white">Portfolio ({items.length})</h2>
        {isOwner && onAdd && (
          <button onClick={onAdd} className="px-3 py-1.5 text-xs rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition-colors">
            + Add Item
          </button>
        )}
      </div>
      <div className="space-y-4">
        {items.map((item) => (
          <div key={item.id} className="border border-gray-700 rounded-lg p-4 hover:border-gray-600 transition-colors">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-medium text-white">{item.title}</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  {item.role && <span>{item.role} · </span>}
                  {categoryLabels[item.category] || item.category}
                  {item.year && <span> · {item.year}</span>}
                </p>
              </div>
              {isOwner && onDelete && (
                <button onClick={() => onDelete(item.id)} className="text-gray-500 hover:text-red-400 text-sm transition-colors" title="Delete item">
                  &times;
                </button>
              )}
            </div>
            {item.description && (
              <p className="text-sm text-gray-400 mt-2">{item.description}</p>
            )}
            {item.mediaUrls && item.mediaUrls.length > 0 && (
              <div className="flex gap-2 mt-3">
                {item.mediaUrls.map((url, i) => (
                  <a
                    key={i}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-indigo-400 hover:text-indigo-300 underline"
                  >
                    Media {i + 1}
                  </a>
                ))}
              </div>
            )}
            {item.awards && item.awards.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {item.awards.map((award, i) => (
                  <span key={i} className="px-2 py-0.5 bg-amber-900/30 text-amber-400 text-xs rounded-full">
                    {award}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
