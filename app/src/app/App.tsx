import { BrowserRouter } from 'react-router-dom';
import { DemoModeProvider, useDemoMode } from '../contexts/DemoModeContext';
import { AppRouter } from './router';
import Navbar from '../components/layout/Navbar';
import DemoOnboarding from '../components/onboarding/DemoOnboarding';

function AppContent() {
  const { isOnboarded, completeOnboarding } = useDemoMode();

  if (!isOnboarded) {
    return <DemoOnboarding onComplete={completeOnboarding} />;
  }

  return (
    <>
      <Navbar />
      <main className="min-h-screen">
        <AppRouter />
      </main>
    </>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <DemoModeProvider>
        <AppContent />
      </DemoModeProvider>
    </BrowserRouter>
  );
}
