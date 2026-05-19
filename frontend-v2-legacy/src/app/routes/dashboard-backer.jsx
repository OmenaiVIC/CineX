import DashboardLayout from '@components/dashboard/DashboardLayout';
import DemoModeBanner from '@components/common/DemoModeBanner';
import BackerDashboard from '@components/dashboard/BackerDashboard';
import RoleGuard from '@components/onboarding/RoleGuard';
import { useAuth } from '@contexts/StacksAuthContext';
import { useDemoMode } from '@contexts/DemoModeContext';

export default function BackerDashboardPage() {
  const { isAuthenticated } = useAuth();
  const { isDemo } = useDemoMode();

  return (
    <RoleGuard requiredRole="backer">
      <DashboardLayout>
        {isDemo && <DemoModeBanner />}
        <BackerDashboard />
      </DashboardLayout>
    </RoleGuard>
  );
}
