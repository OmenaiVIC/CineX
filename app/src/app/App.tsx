import { BrowserRouter } from 'react-router-dom';
import { DemoModeProvider } from '../contexts/DemoModeContext';
import { AppRouter } from './router';
import Navbar from '../components/layout/Navbar';

export function App() {
  return (
    <BrowserRouter>
      <DemoModeProvider>
        <Navbar />
        <main className="min-h-screen">
          <AppRouter />
        </main>
      </DemoModeProvider>
    </BrowserRouter>
  );
}
