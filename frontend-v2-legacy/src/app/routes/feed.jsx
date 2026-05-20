import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import PageLayout from '@components/layout/page-layout';
import { createCineXServices } from '@services/index';
import LoadingSkeleton from '@components/common/LoadingSkeleton';

const TYPE_LABELS = {
  campaign_created: 'Campaign Created',
  campaign_funded: 'Campaign Funded',
  pool_formed: 'Pool Formed',
  milestone_reached: 'Milestone Reached',
  rating_received: 'Rating Received',
  profile_updated: 'Profile Updated',
  verification_granted: 'Verified',
  system: 'System',
};

const TYPE_ICONS = {
  campaign_created: (
    <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>
  ),
  campaign_funded: (
    <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  pool_formed: (
    <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
  ),
  milestone_reached: (
    <svg className="w-5 h-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  rating_received: (
    <svg className="w-5 h-5 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
    </svg>
  ),
  verification_granted: (
    <svg className="w-5 h-5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  ),
  system: (
    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
};

const TYPES = ['', 'campaign_created', 'campaign_funded', 'pool_formed', 'milestone_reached', 'rating_received', 'verification_granted', 'system'];

export default function FeedPage() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [typeFilter, setTypeFilter] = useState('');
  const LIMIT = 20;

  const svc = createCineXServices(null);

  useEffect(() => {
    setLoading(true);
    setError('');
    svc.feed.getFeed({ type: typeFilter || undefined, page, limit: LIMIT }).then((res) => {
      if (res.success && res.data) {
        setEvents(res.data.items);
        setTotalPages(res.data.totalPages);
      } else {
        setError(res.error || 'Failed to load feed');
      }
    }).catch((err) => {
      setError(err instanceof Error ? err.message : 'Failed to load feed');
    }).finally(() => setLoading(false));
  }, [page, typeFilter]);

  const handleTypeChange = (newType) => {
    setTypeFilter(newType);
    setPage(1);
  };

  return (
    <PageLayout title="Activity Feed">
      <div className="max-w-3xl mx-auto px-4 py-12">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-white">Activity Feed</h1>
          <div className="flex items-center gap-2">
            <label htmlFor="type-filter" className="text-sm text-gray-400">Filter:</label>
            <select
              id="type-filter"
              value={typeFilter}
              onChange={(e) => handleTypeChange(e.target.value)}
              className="bg-gray-800 text-white border border-gray-700 rounded-lg px-3 py-1.5 text-sm"
            >
              <option value="">All Events</option>
              {TYPES.filter(Boolean).map((t) => (
                <option key={t} value={t}>{TYPE_LABELS[t] || t}</option>
              ))}
            </select>
          </div>
        </div>

        {loading && (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => <LoadingSkeleton key={i} variant="card" />)}
          </div>
        )}

        {error && !loading && (
          <div className="text-center py-16">
            <svg className="w-12 h-12 text-red-500 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <p className="text-gray-400">{error}</p>
          </div>
        )}

        {!loading && !error && events.length === 0 && (
          <div className="text-center py-16">
            <svg className="w-12 h-12 text-gray-600 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
            <p className="text-gray-500">No events yet.</p>
          </div>
        )}

        {!loading && !error && events.length > 0 && (
          <div className="space-y-1">
            {events.map((evt, idx) => (
              <div key={evt.id || idx} className="flex gap-3 py-3 border-b border-gray-800">
                <div className="flex-shrink-0 mt-0.5">
                  {TYPE_ICONS[evt.type] || TYPE_ICONS.system}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white">
                    {evt.targetId ? (
                      <Link to={`/profile/${evt.actor}`} className="text-green-400 hover:underline font-medium">
                        {evt.actor.slice(0, 6)}…
                      </Link>
                    ) : (
                      <span className="text-gray-300">{evt.actor.slice(0, 6)}…</span>
                    )}
                    <span className="text-gray-400"> — </span>
                    <span>{evt.summary}</span>
                  </p>
                  <p className="text-xs text-gray-600 mt-0.5">
                    {new Date(evt.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    <span className="ml-2 text-gray-700">{TYPE_LABELS[evt.type] || evt.type}</span>
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-3 mt-8">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="px-4 py-2 bg-gray-800 text-white rounded-lg disabled:opacity-40 hover:bg-gray-700 text-sm"
            >
              Previous
            </button>
            <span className="text-sm text-gray-400">Page {page} of {totalPages}</span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="px-4 py-2 bg-gray-800 text-white rounded-lg disabled:opacity-40 hover:bg-gray-700 text-sm"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </PageLayout>
  );
}
