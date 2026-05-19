import DashboardLayout from '@components/dashboard/DashboardLayout';
import DemoModeBanner from '@components/common/DemoModeBanner';
import CreatorDashboard from '@components/dashboard/CreatorDashboard';
import RoleGuard from '@components/onboarding/RoleGuard';
import { useAuth } from '@contexts/StacksAuthContext';
import { useDemoMode } from '@contexts/DemoModeContext';

export default function CreatorDashboardPage() {
  const { isAuthenticated } = useAuth();
  const { isDemo } = useDemoMode();

  return (
    <RoleGuard requiredRole="creative">
      <DashboardLayout>
        {isDemo && <DemoModeBanner />}
        <CreatorDashboard />
      </DashboardLayout>
    </RoleGuard>
  );
}
