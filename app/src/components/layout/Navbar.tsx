import { useNavigate, useLocation } from 'react-router-dom';
import { useDemoMode } from '../../contexts/DemoModeContext';

export default function Navbar() {
  const { currentUser, isOnboarded, logout } = useDemoMode();
  const navigate = useNavigate();
  const location = useLocation();

  if (!isOnboarded) {
    return (
      <nav className="fixed top-0 left-0 right-0 z-40 bg-[#050505]/85 backdrop-blur-md border-b border-[rgba(255,255,255,0.06)]">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <span
            className="text-lg font-bold text-white cursor-pointer"
            onClick={() => navigate('/')}
          >
            CineX <span className="text-[#4ade80] font-normal" style={{ fontSize: '.75rem', fontWeight: 400 }}>Fintech</span>
          </span>
          <div className="flex items-center gap-4">
            <a href="/litepaper.html" target="_blank" rel="noopener" className="text-xs text-gray-500 hover:text-gray-300 transition-colors hidden sm:block">
              Litepaper
            </a>
            <button
              onClick={() => navigate('/demo')}
              className="px-4 py-1.5 rounded-full bg-[#4ade80] text-black text-xs font-semibold hover:shadow-[0_0_20px_rgba(74,222,128,0.2)] transition-all"
            >
              Try Demo
            </button>
          </div>
        </div>
      </nav>
    );
  }

  const links = [
    { path: '/dashboard', label: 'Dashboard' },
    { path: '/explore', label: 'Explore' },
    { path: '/wallet', label: 'Wallet' },
    { path: `/profile/${currentUser.address}`, label: 'Profile' },
  ];

  return (
    <nav className="sticky top-0 z-40 bg-[#050505]/90 backdrop-blur-md border-b border-[#1a1a2e]">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <span
            className="text-lg font-bold text-[#4ade80] cursor-pointer"
            onClick={() => navigate('/dashboard')}
          >
            CineX
          </span>
          <div className="hidden sm:flex items-center gap-1">
            {links.map(link => (
              <button
                key={link.path}
                onClick={() => navigate(link.path)}
                className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                  location.pathname === link.path
                    ? 'text-white bg-gray-800'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
                }`}
              >
                {link.label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-500 hidden sm:block">
            {currentUser.name.slice(0, 8)}... · {currentUser.role}
          </span>
          <button
            onClick={logout}
            className="text-xs text-gray-500 hover:text-red-400 transition-colors"
          >
            Logout
          </button>
        </div>
      </div>
    </nav>
  );
}
