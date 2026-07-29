import { useFeed } from '../../hooks/useFeed';
import type { FeedEvent } from '../../types';

const TYPE_ICONS: Record<FeedEvent['type'], string> = {
  campaign_created: '🚀',
  campaign_funded: '💰',
  pool_formed: '🤝',
  milestone_reached: '✅',
  rating_received: '⭐',
  profile_updated: '👤',
  verification_granted: '🛡️',
  system: '🔔',
};

export default function ActivityFeed({ limit = 20 }: { limit?: number }) {
  const { items, hasMore, loadMore } = useFeed(limit);

  if (items.length === 0) {
    return (
      <div className="lp-glass" style={{ padding: '2rem', textAlign: 'center', borderRadius: '12px' }}>
        <p style={{ color: 'var(--text-dim)', fontSize: '0.9rem' }}>No activity yet. Be the first to create a campaign!</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      {items.map((event) => (
        <FeedRow key={event.id} event={event} />
      ))}
      {hasMore && (
        <button
          onClick={loadMore}
          className="lp-btn lp-btn-secondary"
          style={{ marginTop: '0.5rem', alignSelf: 'center', fontSize: '0.85rem', padding: '8px 24px' }}
        >
          Load More
        </button>
      )}
    </div>
  );
}

function timeAgo(createdAt: number): string {
  const diff = Date.now() - createdAt;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

function FeedRow({ event }: { event: FeedEvent }) {
  return (
    <div
      className="lp-glass"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        padding: '0.6rem 1rem',
        borderRadius: '10px',
        fontSize: '0.9rem',
        lineHeight: 1.4,
      }}
    >
      <span style={{ fontSize: '1.1rem', flexShrink: 0 }}>{TYPE_ICONS[event.type] || '🔔'}</span>
      <span style={{ flex: 1, color: 'var(--text)' }}>{event.summary}</span>
      <span style={{ flexShrink: 0, fontSize: '0.75rem', color: 'var(--text-dim)' }}>{timeAgo(event.createdAt)}</span>
    </div>
  );
}
