import { Link } from 'react-router-dom';

function formatSTX(microSTX) {
  const amount = parseInt(microSTX) / 1000000;
  return new Intl.NumberFormat('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(amount);
}

const STATUS_STYLES = {
  active: 'bg-green-900/40 text-green-400',
  funded: 'bg-blue-900/40 text-blue-400',
  failed: 'bg-red-900/40 text-red-400',
  completed: 'bg-gray-800 text-gray-400',
};

export default function CampaignOverview({ campaigns, emptyMessage = 'No campaigns yet. Start your first project!' }) {
  if (!campaigns || campaigns.length === 0) {
    return (
      <div className="text-center py-12">
        <svg className="w-12 h-12 text-gray-600 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
        </svg>
        <p className="text-gray-500 text-sm">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {campaigns.map((campaign) => {
        const pct = Math.min(
          Math.round((Number(campaign.currentAmount) / Number(campaign.targetAmount)) * 100),
          100
        );
        const daysLeft = Math.max(0, Math.ceil((campaign.deadline - Date.now()) / 86400000));

        return (
          <div
            key={campaign.id}
            data-campaign-id={campaign.id}
            className="bg-black border border-gray-800 rounded-2xl p-5 hover:border-yellow-400/30 transition"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="min-w-0 flex-1">
                <h4 className="text-white font-medium text-sm truncate">{campaign.title}</h4>
                <p className="text-xs text-gray-500 capitalize mt-0.5">{campaign.category}</p>
              </div>
              <span className={`text-xs font-medium px-2 py-0.5 rounded ml-2 flex-shrink-0 ${STATUS_STYLES[campaign.status] || 'bg-gray-800 text-gray-400'}`}>
                {campaign.status}
              </span>
            </div>

            <div className="mb-3">
              <div className="flex justify-between text-xs text-gray-400 mb-1">
                <span>{formatSTX(campaign.currentAmount)} STX raised</span>
                <span>{pct}%</span>
              </div>
              <div className="w-full h-1.5 bg-gray-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-yellow-400 to-yellow-500 rounded-full transition-all"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
              <span>Target: {formatSTX(campaign.targetAmount)} STX</span>
              <span>{daysLeft > 0 ? `${daysLeft}d left` : 'Ended'}</span>
            </div>

            {campaign.milestoneCount && (
              <div className="text-xs text-gray-500 mb-3">
                Milestones: {campaign.completedMilestones || 0}/{campaign.milestoneCount}
              </div>
            )}

            <div className="flex gap-2">
              <Link
                to={`/pool/${campaign.id}`}
                className="flex-1 text-center text-xs py-1.5 rounded-lg bg-gray-800 text-gray-300 hover:bg-gray-700 transition"
              >
                View
              </Link>
              <button className="flex-1 text-xs py-1.5 rounded-lg bg-gray-800 text-gray-300 hover:bg-gray-700 transition">
                Edit
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
