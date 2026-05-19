import { useState, useEffect } from 'react';
import { useAuth } from '@contexts/StacksAuthContext';
import { createAiService } from '@services/index';
import { Link } from 'react-router-dom';

export default function AIRecommendations() {
  const { userSession, activeAddress } = useAuth();
  const [recommendations, setRecommendations] = useState([]);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const aiService = createAiService(userSession);
    Promise.all([
      aiService.getRecommendations(activeAddress || 'demo'),
      aiService.getMatchSuggestions({ address: activeAddress }),
    ]).then(([recRes, matchRes]) => {
      if (recRes.success) setRecommendations(recRes.data);
      if (matchRes.success) setMatches(matchRes.data);
      setLoading(false);
    });
  }, [userSession, activeAddress]);

  if (loading) {
    return (
      <div className="p-6 bg-black border border-gray-800 rounded-2xl text-white">
        <h3 className="font-semibold mb-4 text-white">AI Recommendations</h3>
        <div className="text-gray-400 text-sm animate-pulse">Analysing your interests...</div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-black border border-gray-800 rounded-2xl text-white">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-white">AI Recommendations</h3>
        <span className="text-xs bg-yellow-400/20 text-yellow-400 px-2 py-0.5 rounded-full font-medium">
          AI
        </span>
      </div>

      {recommendations.length > 0 && (
        <div className="mb-5">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Projects & Pools</p>
          <div className="space-y-2">
            {recommendations.map((rec, i) => (
              <div
                key={i}
                className="flex items-center justify-between p-3 rounded-lg bg-gray-900/30 border border-gray-800/50 hover:border-yellow-400/30 transition"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-white truncate">
                    {rec.title || rec.name}
                  </p>
                  <p className="text-xs text-gray-400 truncate">{rec.reason}</p>
                </div>
                <div className="flex-shrink-0 ml-3">
                  <span
                    className={`text-xs font-bold px-2 py-1 rounded ${
                      rec.matchScore >= 80
                        ? 'bg-green-900/40 text-green-400'
                        : rec.matchScore >= 60
                          ? 'bg-yellow-900/40 text-yellow-400'
                          : 'bg-gray-800 text-gray-400'
                    }`}
                  >
                    {rec.matchScore}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {matches.length > 0 && (
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Suggested Collaborators</p>
          <div className="space-y-2">
            {matches.map((m, i) => (
              <div
                key={i}
                className="flex items-center justify-between p-3 rounded-lg bg-gray-900/30 border border-gray-800/50"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-white">{m.displayName}</p>
                  <p className="text-xs text-gray-400 truncate">{m.reason}</p>
                </div>
                <span className="text-xs text-yellow-400 font-semibold flex-shrink-0 ml-3">
                  {m.matchScore}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <Link
        to="/active-pools"
        className="mt-4 inline-flex items-center gap-1 text-xs text-yellow-400 hover:text-yellow-300 transition"
      >
        Explore all pools &rarr;
      </Link>
    </div>
  );
}
