import { useState } from 'react';
import type { CredibilitySummary } from '../../types';
import LoadingSkeleton from './LoadingSkeleton';

interface AICredibilityModalProps {
  isOpen: boolean;
  credibility: CredibilitySummary | null;
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
  onClose: () => void;
}

export default function AICredibilityModal({ isOpen, credibility, loading, error, onRefresh, onClose }: AICredibilityModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-[#0a0a0f] border border-[#1a1a2e] rounded-2xl p-8 w-full max-w-lg mx-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">AI Credibility Summary</h3>
          <button
            onClick={onRefresh}
            disabled={loading}
            className="text-xs text-[#00e5ff] hover:underline disabled:text-gray-600 disabled:cursor-not-allowed"
          >
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>

        <div className="bg-black/30 rounded-lg p-4 mb-4 min-h-[80px]">
          {loading && !credibility ? (
            <LoadingSkeleton variant="text" count={1} />
          ) : error ? (
            <div className="text-center py-4">
              <p className="text-sm text-red-400 mb-3">{error}</p>
              <button
                onClick={onRefresh}
                className="text-xs text-[#00e5ff] hover:underline"
              >
                Try again
              </button>
            </div>
          ) : credibility ? (
            <div className="space-y-2">
              <p className="text-sm text-gray-300 leading-relaxed">{credibility.summary}</p>
              <p className="text-xs text-gray-600 mt-2">Model: {credibility.model}</p>
              <p className="text-xs text-gray-500 italic">{credibility.disclaimer}</p>
            </div>
          ) : (
            <p className="text-sm text-gray-500">Click Refresh to generate a credibility summary.</p>
          )}
        </div>

        <button
          onClick={onClose}
          className="w-full px-4 py-2 bg-gray-800 text-gray-300 rounded-full text-sm hover:bg-gray-700 transition-colors"
        >
          Close
        </button>
      </div>
    </div>
  );
}