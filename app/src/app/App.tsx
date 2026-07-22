import { BrowserRouter } from 'react-router-dom';
import { DemoModeProvider } from '../contexts/DemoModeContext';
import { AuthProvider } from '../contexts/AuthContext';
import { PasskeyProvider } from '../contexts/PasskeyContext';
import { GuideProvider } from '../contexts/GuideContext';
import { AppRouter } from './router';
import Navbar from '../components/layout/Navbar';

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <PasskeyProvider>
          <DemoModeProvider>
            <GuideProvider>
              <Navbar />
              <main className="min-h-screen">
                <AppRouter />
              </main>
            </GuideProvider>
          </DemoModeProvider>
        </PasskeyProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
