import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@contexts/StacksAuthContext';

export default function DashboardLayout({ children }) {
  const { userType, isAuthenticated } = useAuth();
  const location = useLocation();

  const filmmakerNav = [
    { to: '/dashboard/filmmaker', label: 'Overview' },
    { to: '/dashboard/filmmaker/crowdfunding', label: 'My Campaigns' },
    { to: '/dashboard/filmmaker/create-campaign', label: 'Create Campaign' },
    { to: '/dashboard/filmmaker/create-campaign?type=private', label: 'Create Private Pool' },
    { to: '/dashboard/filmmaker/co-ep', label: 'Co-EP Rotating Funds' },
    { to: '/dashboard/filmmaker/verification', label: 'Film Verification' },
    { to: '/dashboard/filmmaker/settings', label: 'Settings' },
  ];

  const publicNav = [
    { to: '/dashboard/public', label: 'Overview' },
    { to: '/active-pools', label: 'Active Pools' },
  ];

  const endorserNav = [
    { to: '/dashboard/endorser', label: 'Tasks' },
    { to: '/dashboard/endorser/history', label: 'Earnings' },
  ];

  const navToRender = userType === 'filmmaker' ? filmmakerNav : userType === 'endorser' ? endorserNav : publicNav;

  // Only show layout with sidebar if authenticated
  if (!isAuthenticated) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen flex bg-white">
      <aside className="w-72 bg-gray-900 text-white flex-shrink-0">
        <div className="px-6 py-8">
          <h2 className="text-xl font-bold mb-4">CineX</h2>
          <p className="text-sm text-gray-300 mb-6">Dashboard</p>
          <nav className="space-y-2">
            {navToRender.map((item) => {
              const path = item.to.split('?')[0];
              const active = location.pathname === path || location.pathname.startsWith(path + '/') || location.pathname.startsWith(path);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  aria-current={active ? 'page' : undefined}
                  className={`block px-4 py-2 rounded-md text-sm ${active ? 'bg-yellow-500 text-black font-semibold' : 'text-gray-200 hover:bg-gray-800'}`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </aside>

      <main className="flex-1 p-8">
        <div className="max-w-6xl mx-auto">{children}</div>
      </main>
    </div>
  );
}
