import { RouterProvider } from 'react-router-dom';
import { router } from './router';
import ErrorBoundary from '@components/common/error-boundary';
import { StacksAuthProvider } from '@contexts/StacksAuthContext';
import { DemoModeProvider } from '@contexts/DemoModeContext';

export function AppProvider() {
  return (
    <ErrorBoundary>
      <StacksAuthProvider>
        <DemoModeProvider>
          <RouterProvider router={router} />
        </DemoModeProvider>
      </StacksAuthProvider>
    </ErrorBoundary>
  );
}