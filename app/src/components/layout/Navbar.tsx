import { useNavigate, useLocation } from 'react-router-dom';
import { useDemoMode } from '../../contexts/DemoModeContext';

export default function Navbar() {
  const { currentUser, logout } = useDemoMode();
  const navigate = useNavigate();
  const location = useLocation();

  if (!currentUser) return null;

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
