import { Link } from 'react-router-dom';

export default function RecommendationCard({ title, category, matchReason, memberCount, to }) {
  return (
    <Link
      to={to || '#'}
      className="block bg-black border border-gray-800 rounded-2xl p-5 hover:border-yellow-400/30 transition"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="w-12 h-12 bg-gray-800 rounded-xl flex items-center justify-center flex-shrink-0">
          <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
        </div>
        <span className="text-xs bg-yellow-400/10 text-yellow-400 px-2 py-0.5 rounded-full font-medium">
          {category}
        </span>
      </div>

      <h4 className="text-white font-medium text-sm mb-1">{title}</h4>
      <p className="text-xs text-gray-500 mb-2">{matchReason}</p>
      {memberCount !== undefined && (
        <p className="text-xs text-gray-600">{memberCount} members</p>
      )}
    </Link>
  );
}
