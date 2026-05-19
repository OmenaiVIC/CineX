import { useNavigate } from 'react-router-dom';
import OnboardingWizard from '@components/onboarding/OnboardingWizard';
import { useRole } from '@hooks/useRole';
import { useAuth } from '@contexts/StacksAuthContext';
import DemoModeBanner from '@components/common/DemoModeBanner';

export default function OnboardingPage() {
  const navigate = useNavigate();
  const { isOnboarded, isLoading, setRole } = useRole();
  const { isAuthenticated, userData } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-gray-400 animate-pulse">Loading...</div>
      </div>
    );
  }

  if (isOnboarded) {
    navigate('/dashboard', { replace: true });
    return null;
  }

  const handleComplete = (role) => {
    setRole(role);
    navigate('/dashboard', { replace: true });
  };

  return (
    <>
      {isAuthenticated && <DemoModeBanner />}
      <OnboardingWizard onComplete={handleComplete} />
    </>
  );
}
