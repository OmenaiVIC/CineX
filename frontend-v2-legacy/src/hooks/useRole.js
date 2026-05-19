import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@contexts/StacksAuthContext';
import { useDemoMode } from '@contexts/DemoModeContext';
import { DEMO_ADDRESSES } from '@utils/demoAddresses';

const STORAGE_KEY = 'cinex_user_role';

export function useRole() {
  const { userType, setUserType, isAuthenticated, isLoading: authLoading } = useAuth();
  const { isDemo, demoRole } = useDemoMode();
  const [role, setRoleState] = useState(() => {
    return sessionStorage.getItem(STORAGE_KEY);
  });
  const [isOnboarded, setIsOnboarded] = useState(() => {
    return sessionStorage.getItem('cinex_onboarded') === 'true';
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;

    if (isDemo && demoRole) {
      setRoleState(demoRole);
      setIsOnboarded(true);
    } else if (userType === 'filmmaker' || userType === 'endorser') {
      const mapped = userType === 'filmmaker' ? 'creative' : 'backer';
      setRoleState(mapped);
      setIsOnboarded(true);
    }

    setIsLoading(false);
  }, [authLoading, isDemo, demoRole, userType]);

  const setRole = useCallback((newRole) => {
    sessionStorage.setItem(STORAGE_KEY, newRole);
    setRoleState(newRole);
    sessionStorage.setItem('cinex_onboarded', 'true');
    setIsOnboarded(true);

    const legacyMapping = { creative: 'filmmaker', backer: 'endorser' };
    setUserType(legacyMapping[newRole] || 'public');
  }, [setUserType]);

  const clearRole = useCallback(() => {
    sessionStorage.removeItem(STORAGE_KEY);
    sessionStorage.removeItem('cinex_onboarded');
    setRoleState(null);
    setIsOnboarded(false);
    setUserType(null);
  }, [setUserType]);

  const address = isDemo
    ? (demoRole ? DEMO_ADDRESSES[demoRole] : null)
    : null;

  return {
    role,
    isOnboarded,
    isLoading,
    isDemo,
    address,
    setRole,
    clearRole,
  };
}
