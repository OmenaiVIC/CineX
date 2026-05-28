import { Routes, Route, Navigate } from 'react-router-dom';
import { useDemoMode } from '../contexts/DemoModeContext';
import { useAuth } from '../contexts/AuthContext';
import HomePage from '../pages/HomePage';
import DemoPage from '../pages/DemoPage';
import ExplorePage from '../pages/ExplorePage';
import CampaignPage from '../pages/CampaignPage';
import CreateCampaignPage from '../pages/CreateCampaignPage';
import ProfilePage from '../pages/ProfilePage';
import WalletPage from '../pages/WalletPage';
import DashboardPage from '../pages/DashboardPage';
import SignUpPage from '../pages/SignUpPage';
import SignInPage from '../pages/SignInPage';
import ContactPage from '../pages/ContactPage';
import VerificationPage from '../pages/VerificationPage';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  const { isOnboarded } = useDemoMode();
  if (!isAuthenticated && !isOnboarded) return <Navigate to="/signin" replace />;
  return <>{children}</>;
}

export function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/demo" element={<DemoPage />} />
      <Route path="/signup" element={<SignUpPage />} />
      <Route path="/signin" element={<SignInPage />} />
      <Route path="/contact" element={<ContactPage />} />
      <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
      <Route path="/explore" element={<ExplorePage />} />
      <Route path="/campaign/:id" element={<CampaignPage />} />
      <Route path="/campaign/new" element={<ProtectedRoute><CreateCampaignPage /></ProtectedRoute>} />
      <Route path="/profile/:address" element={<ProfilePage />} />
      <Route path="/wallet" element={<ProtectedRoute><WalletPage /></ProtectedRoute>} />
      <Route path="/verification/apply" element={<ProtectedRoute><VerificationPage /></ProtectedRoute>} />
    </Routes>
  );
}
