import { useNavigate, useLocation } from 'react-router-dom';
import { useDemoMode } from '../../contexts/DemoModeContext';
import { useAuth } from '../../contexts/AuthContext';

export default function Navbar() {
  const { currentUser, isOnboarded, logout: demoLogout } = useDemoMode();
  const { user, isAuthenticated, logout: authLogout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const loggedIn = isAuthenticated || isOnboarded;
  const displayUser = user || currentUser;

  const handleLogout = () => {
    if (isAuthenticated) authLogout();
    if (isOnboarded) demoLogout();
    navigate('/');
  };

  if (!loggedIn) {
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
            <button onClick={() => navigate('/#how-it-works')} className="text-xs text-gray-500 hover:text-gray-300 transition-colors hidden sm:block">
              How It Works
            </button>
            <button onClick={() => navigate('/explore')} className="text-xs text-gray-500 hover:text-gray-300 transition-colors hidden sm:block">
              Explore
            </button>
            <a href="/litepaper.html" target="_blank" rel="noopener" className="text-xs text-gray-500 hover:text-gray-300 transition-colors hidden sm:block">
              Litepaper
            </a>
            <button onClick={() => navigate('/contact')} className="text-xs text-gray-500 hover:text-gray-300 transition-colors hidden sm:block">
              Contact
            </button>
            <button
              onClick={() => navigate('/signin')}
              className="text-xs text-gray-400 hover:text-white transition-colors"
            >
              Sign In
            </button>
            <button
              onClick={() => navigate('/signup')}
              className="px-4 py-1.5 rounded-full bg-[#4ade80] text-black text-xs font-semibold hover:shadow-[0_0_20px_rgba(74,222,128,0.2)] transition-all"
            >
              Get Started
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
    { path: '/contact', label: 'Contact' },
    ...(displayUser?.address ? [{ path: `/profile/${displayUser.address}`, label: 'Profile' }] : []),
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
            {displayUser?.name?.slice(0, 8) || displayUser?.email?.split('@')[0]?.slice(0, 8) || 'User'}...
            {displayUser?.role ? ` · ${displayUser.role}` : ''}
          </span>
          <button
            onClick={handleLogout}
            className="text-xs text-gray-500 hover:text-red-400 transition-colors"
          >
            Logout
          </button>
        </div>
      </div>
    </nav>
  );
}
