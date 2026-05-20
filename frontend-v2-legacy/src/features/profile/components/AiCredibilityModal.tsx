import { useState } from 'react';
import type { CredibilitySummary } from '../../../types';
import { createCineXServices } from '../../../services';

interface Props {
  address: string;
  displayName: string;
}

function SparkleIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
    </svg>
  );
}

export default function AiCredibilityModal({ address, displayName }: Props) {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<CredibilitySummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchSummary = async () => {
    setLoading(true);
    setError('');
    setData(null);
    const svc = createCineXServices(null);
    const res = await svc.ai.getCredibilitySummary(address);
    if (res.success && res.data) {
      setData(res.data);
    } else {
      setError(res.error || 'Failed to load credibility summary');
    }
    setLoading(false);
  };

  const handleOpen = () => {
    setOpen(true);
    fetchSummary();
  };

  const handleClose = () => {
    setOpen(false);
    setData(null);
    setError('');
  };

  return (
    <>
      <button onClick={handleOpen}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-black border border-gray-800 rounded-xl text-xs text-gray-400 hover:text-yellow-400 hover:border-yellow-800 transition">
        <SparkleIcon />
        AI Credibility
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}>
          <div className="bg-black border border-gray-800 rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
              <div className="flex items-center gap-2">
                <SparkleIcon />
                <h2 className="text-lg font-semibold text-white">AI Credibility</h2>
              </div>
              <button onClick={handleClose} className="text-gray-500 hover:text-white transition">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="px-5 py-4">
              {loading && (
                <div className="space-y-3 animate-pulse">
                  <div className="h-4 bg-gray-800 rounded w-full" />
                  <div className="h-4 bg-gray-800 rounded w-5/6" />
                  <div className="h-4 bg-gray-800 rounded w-4/6" />
                </div>
              )}

              {error && (
                <div className="text-center py-4">
                  <p className="text-red-400 text-sm">{error}</p>
                  <button onClick={fetchSummary}
                    className="mt-3 text-xs text-yellow-400 hover:text-yellow-300 transition">
                    Try Again
                  </button>
                </div>
              )}

              {data && !loading && (
                <div className="space-y-3">
                  <p className="text-gray-100 text-sm leading-relaxed">{data.summary}</p>

                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <span className={`px-2 py-0.5 rounded-full border ${data.model === 'mock' ? 'border-yellow-800 text-yellow-500' : 'border-gray-700 text-gray-400'}`}>
                      {data.model}
                    </span>
                    <span>{new Date(data.generatedAt).toLocaleDateString()}</span>
                  </div>

                  <div className="bg-yellow-900/20 border border-yellow-800/40 rounded-xl px-3 py-2">
                    <p className="text-xs text-yellow-600/80 leading-relaxed">{data.disclaimer}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
