import { Routes, Route, Navigate } from 'react-router-dom';
import { useDemoMode } from '../contexts/DemoModeContext';
import { useAuth } from '../contexts/AuthContext';
import HomePage from '../pages/HomePage';
import ExplorePage from '../pages/ExplorePage';
import CampaignPage from '../pages/CampaignPage';
import CreateCampaignPage from '../pages/CreateCampaignPage';
import ProfilePage from '../pages/ProfilePage';
import WalletPage from '../pages/WalletPage';
import DashboardPage from '../pages/DashboardPage';

import ContactPage from '../pages/ContactPage';
import VerificationPage from '../pages/VerificationPage';
import PoolExplorePage from '../pages/PoolExplorePage';
import PoolDetailPage from '../pages/PoolDetailPage';
import PoolCreatePage from '../pages/PoolCreatePage';
import AdminDashboard from '../pages/AdminDashboard';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  const { isOnboarded } = useDemoMode();
  if (!isAuthenticated && !isOnboarded) return <Navigate to="/" replace />;
  return <>{children}</>;
}

export function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/contact" element={<ContactPage />} />
      <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
      <Route path="/explore" element={<ExplorePage />} />
      <Route path="/campaign/:id" element={<CampaignPage />} />
      <Route path="/campaign/new" element={<ProtectedRoute><CreateCampaignPage /></ProtectedRoute>} />
      <Route path="/profile/:address" element={<ProfilePage />} />
      <Route path="/wallet" element={<ProtectedRoute><WalletPage /></ProtectedRoute>} />
      <Route path="/verification/apply" element={<ProtectedRoute><VerificationPage /></ProtectedRoute>} />
      <Route path="/pools" element={<PoolExplorePage />} />
      <Route path="/pools/create" element={<ProtectedRoute><PoolCreatePage /></ProtectedRoute>} />
      <Route path="/pools/:id" element={<PoolDetailPage />} />
      <Route path="/admin" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
    </Routes>
  );
}
