import { RouterProvider } from 'react-router-dom';
import { router } from './router';
import ErrorBoundary from '@components/common/error-boundary';
import NetworkDowntimeBanner from '@components/common/NetworkDowntimeBanner';
import { StacksAuthProvider } from '@contexts/StacksAuthContext';
import { DemoModeProvider } from '@contexts/DemoModeContext';

export function AppProvider() {
  return (
    <ErrorBoundary>
      <StacksAuthProvider>
        <DemoModeProvider>
          <NetworkDowntimeBanner />
          <RouterProvider router={router} />
        </DemoModeProvider>
      </StacksAuthProvider>
    </ErrorBoundary>
  );
}