import { Routes, Route, Navigate } from 'react-router-dom';
import { useDemoMode } from '../contexts/DemoModeContext';
import HomePage from '../pages/HomePage';
import DemoPage from '../pages/DemoPage';
import ExplorePage from '../pages/ExplorePage';
import CampaignPage from '../pages/CampaignPage';
import CreateCampaignPage from '../pages/CreateCampaignPage';
import ProfilePage from '../pages/ProfilePage';
import WalletPage from '../pages/WalletPage';
import DashboardPage from '../pages/DashboardPage';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isOnboarded } = useDemoMode();
  if (!isOnboarded) return <Navigate to="/" replace />;
  return <>{children}</>;
}

export function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/demo" element={<DemoPage />} />
      <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
      <Route path="/explore" element={<ExplorePage />} />
      <Route path="/campaign/:id" element={<CampaignPage />} />
      <Route path="/campaign/new" element={<ProtectedRoute><CreateCampaignPage /></ProtectedRoute>} />
      <Route path="/profile/:address" element={<ProfilePage />} />
      <Route path="/wallet" element={<ProtectedRoute><WalletPage /></ProtectedRoute>} />
    </Routes>
  );
}
