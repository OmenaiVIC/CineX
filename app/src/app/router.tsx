import { Routes, Route } from 'react-router-dom';
import ExplorePage from '../pages/ExplorePage';
import CampaignPage from '../pages/CampaignPage';
import CreateCampaignPage from '../pages/CreateCampaignPage';
import ProfilePage from '../pages/ProfilePage';
import WalletPage from '../pages/WalletPage';
import DashboardPage from '../pages/DashboardPage';

export function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<DashboardPage />} />
      <Route path="/dashboard" element={<DashboardPage />} />
      <Route path="/explore" element={<ExplorePage />} />
      <Route path="/campaign/:id" element={<CampaignPage />} />
      <Route path="/campaign/new" element={<CreateCampaignPage />} />
      <Route path="/profile/:address" element={<ProfilePage />} />
      <Route path="/wallet" element={<WalletPage />} />
    </Routes>
  );
}
