import { Navigate } from 'react-router-dom';
import { useRole } from '@hooks/useRole';

export default function RoleGuard({ requiredRole, fallback, children }) {
  const { role, isOnboarded, isLoading } = useRole();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-gray-400 animate-pulse">Loading...</div>
      </div>
    );
  }

  if (!isOnboarded) {
    return <Navigate to="/onboarding" replace />;
  }

  if (requiredRole && role !== requiredRole) {
    if (fallback) return fallback;
    const correctPath = role === 'creative' ? '/dashboard/creator' : '/dashboard/backer';
    return <Navigate to={correctPath} replace />;
  }

  return children;
}
