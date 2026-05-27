import { useState, useEffect } from 'react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import MediaLinkCard from './MediaLinkCard';
import PortfolioForm from './PortfolioForm';
import { getPortfolioForUser, createPortfolioItem, deletePortfolioItem } from '../../services/portfolioService';
import type { PortfolioItem } from '../../types';

interface PortfolioSectionProps {
  address: string;
  isOwnProfile: boolean;
}

export default function PortfolioSection({ address, isOwnProfile }: PortfolioSectionProps) {
  const [items, setItems] = useState<PortfolioItem[]>([]);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    getPortfolioForUser(address).then(res => {
      if (res.success && res.data) setItems(res.data);
    });
  }, [address]);

  const handleAdd = async (item: Omit<PortfolioItem, 'id'>) => {
    const res = await createPortfolioItem(item);
    if (res.success && res.data) {
      setItems(prev => [res.data!, ...prev]);
      setShowForm(false);
    }
  };

  const handleDelete = async (id: string) => {
    const res = await deletePortfolioItem(id, address);
    if (res.success) {
      setItems(prev => prev.filter(i => i.id !== id));
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-base font-semibold text-white">Portfolio ({items.length})</h3>
        {isOwnProfile && (
          <Button variant="outline" size="small" onClick={() => setShowForm(true)}>
            + Add Work
          </Button>
        )}
      </div>

      {items.length === 0 ? (
        <Card variant="light" padding="default">
          <p className="text-sm text-gray-500">
            {isOwnProfile ? 'No portfolio items yet. Add your work to showcase your projects.' : 'No portfolio items yet.'}
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {items.map(item => (
            <Card key={item.id} variant="light" padding="small">
              <div className="flex flex-col h-full">
                <div className="flex items-start justify-between mb-2">
                  <div className="min-w-0 flex-1">
                    <h4 className="text-sm font-semibold text-white truncate">{item.title}</h4>
                    <p className="text-[11px] text-gray-500">
                      {item.role} · {item.year} · {item.category.replace('-', ' ')}
                    </p>
                  </div>
                  {isOwnProfile && (
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="ml-2 w-6 h-6 rounded-full bg-red-500/10 text-red-400 flex items-center justify-center text-[10px] hover:bg-red-500/30 transition-colors shrink-0"
                      title="Delete"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {item.description && (
                  <p className="text-xs text-gray-400 mb-3 line-clamp-2 leading-relaxed">{item.description}</p>
                )}

                {item.mediaUrls && item.mediaUrls.length > 0 && (
                  <div className="space-y-1.5 mt-auto">
                    {item.mediaUrls.map((url, i) => (
                      <MediaLinkCard key={`${url}-${i}`} url={url} />
                    ))}
                  </div>
                )}

                {item.awards && item.awards.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {item.awards.map((award, i) => (
                      <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">
                        {award}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {showForm && (
        <PortfolioForm
          address={address}
          onSubmit={handleAdd}
          onCancel={() => setShowForm(false)}
        />
      )}
    </div>
  );
}
