import { BrowserRouter } from 'react-router-dom';
import { DemoModeProvider } from '../contexts/DemoModeContext';
import { AuthProvider } from '../contexts/AuthContext';
import { GuideProvider } from '../contexts/GuideContext';
import { AppRouter } from './router';
import Navbar from '../components/layout/Navbar';

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <DemoModeProvider>
          <GuideProvider>
            <Navbar />
            <main className="min-h-screen">
              <AppRouter />
            </main>
          </GuideProvider>
        </DemoModeProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
