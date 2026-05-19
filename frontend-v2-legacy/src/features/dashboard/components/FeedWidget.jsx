import { useState, useEffect } from 'react';
import { useAuth } from '@contexts/StacksAuthContext';
import { createFeedService } from '@services/index';

export default function FeedWidget({ maxItems = 5 }) {
  const { userSession } = useAuth();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const feedService = createFeedService(userSession);
    feedService.getFeed({ page: 1, limit: maxItems }).then((res) => {
      if (res.success) {
        setEvents(res.data.items);
      }
      setLoading(false);
    });
  }, [userSession, maxItems]);

  const typeIcons = {
    campaign_funded: '💰',
    campaign_created: '🎬',
    milestone_reached: '🏆',
    pool_formed: '🌊',
    rating_received: '⭐',
    verification_granted: '✅',
    system: '🔔',
  };

  if (loading) {
    return (
      <div className="p-6 bg-black border border-gray-800 rounded-2xl text-white">
        <h3 className="font-semibold mb-4 text-white">Activity Feed</h3>
        <div className="text-gray-400 text-sm animate-pulse">Loading feed...</div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-black border border-gray-800 rounded-2xl text-white">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-white">Activity Feed</h3>
        <span className="text-xs text-gray-500">{events.length > 0 && 'Live'}</span>
      </div>
      <div className="space-y-1">
        {events.length === 0 && (
          <p className="text-gray-500 text-sm py-4 text-center">No recent activity.</p>
        )}
        {events.map((evt) => (
          <div
            key={evt.id}
            className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-900/40 transition"
          >
            <span className="text-lg flex-shrink-0 mt-0.5">
              {typeIcons[evt.type] || '🔔'}
            </span>
            <div className="min-w-0">
              <p className="text-sm text-gray-200 leading-snug">{evt.summary}</p>
              <p className="text-xs text-gray-500 mt-1">
                {new Date(evt.createdAt).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
