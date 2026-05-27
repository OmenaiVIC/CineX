import { useNavigate } from 'react-router-dom';
import DemoOnboarding from '../components/onboarding/DemoOnboarding';
import { useDemoMode } from '../contexts/DemoModeContext';
import type { UserRole } from '../types';

export default function DemoPage() {
  const { completeOnboarding } = useDemoMode();
  const navigate = useNavigate();

  const handleComplete = (name: string, role: UserRole) => {
    completeOnboarding(name, role);
    navigate('/dashboard');
  };

  return <DemoOnboarding onComplete={handleComplete} />;
}
