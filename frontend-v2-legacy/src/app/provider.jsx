import { RouterProvider } from 'react-router-dom';
import { router } from './router';
import ErrorBoundary from '@components/common/error-boundary';
import { StacksAuthProvider } from '@contexts/StacksAuthContext';

export function AppProvider() {
  return (
    <ErrorBoundary>
      <StacksAuthProvider>
        <RouterProvider router={router} />
      </StacksAuthProvider>
    </ErrorBoundary>
  );
}