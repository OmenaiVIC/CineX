import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@contexts/StacksAuthContext';
import { useRole } from '@hooks/useRole';

export default function DashboardLayout({ children }) {
  const { isAuthenticated } = useAuth();
  const { role } = useRole();
  const location = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const creatorNav = [
    { to: '/dashboard/creator', label: 'Overview', icon: '🏠' },
    { to: '/dashboard/creator/campaigns', label: 'My Campaigns', icon: '🎬' },
    { to: '/dashboard/filmmaker/create-campaign', label: 'Create Campaign', icon: '➕' },
    { to: '/active-pools', label: 'Active Pools', icon: '🌐' },
  ];

  const backerNav = [
    { to: '/dashboard/backer', label: 'Overview', icon: '🏠' },
    { to: '/active-pools', label: 'Discover Pools', icon: '🌐' },
  ];

  const publicNav = [
    { to: '/dashboard/public', label: 'Overview', icon: '🏠' },
    { to: '/active-pools', label: 'Active Pools', icon: '🌐' },
  ];

  const navToRender = role === 'creative' ? creatorNav : role === 'backer' ? backerNav : publicNav;

  // Only show layout with sidebar if authenticated
  if (!isAuthenticated) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen flex bg-white">
      <aside className={`bg-black text-white flex-shrink-0 transition-all duration-300 ${isCollapsed ? 'w-16' : 'w-72'}`}>
        <div className={`py-8 ${isCollapsed ? 'px-2' : 'px-6'}`}>
          <div className={`flex items-center ${isCollapsed ? 'justify-center mb-6' : 'justify-between mb-4'}`}>
            {!isCollapsed && <h2 className="text-xl font-bold">CineX</h2>}
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="text-gray-300 hover:text-white p-1"
              aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {isCollapsed ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              )}
            </button>
          </div>
          {!isCollapsed && (
            <>
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
            </>
          )}
          {isCollapsed && (
            <nav className="space-y-2">
              {navToRender.map((item) => {
                const path = item.to.split('?')[0];
                const active = location.pathname === path || location.pathname.startsWith(path + '/') || location.pathname.startsWith(path);
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    aria-current={active ? 'page' : undefined}
                    className={`block px-2 py-3 rounded-md text-center text-lg ${active ? 'bg-yellow-500 text-black' : 'text-gray-200 hover:bg-gray-800'}`}
                    title={item.label}
                  >
                    {item.icon}
                  </Link>
                );
              })}
            </nav>
          )}
        </div>
      </aside>

      <main className="flex-1 p-8">
        <div className="max-w-6xl mx-auto">{children}</div>
      </main>
    </div>
  );
}
