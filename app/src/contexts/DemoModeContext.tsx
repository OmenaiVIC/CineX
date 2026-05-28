import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import type { UserRole, OnboardingState } from '../types';

interface CurrentUser {
  address: string;
  name: string;
  role: UserRole;
}

interface DemoModeContextValue {
  currentUser: CurrentUser | null;
  isOnboarded: boolean;
  completeOnboarding: (name: string, role: UserRole) => void;
  logout: () => void;
  updateName: (name: string) => void;
  updateRole: (role: UserRole) => void;
}

const DemoModeContext = createContext<DemoModeContextValue | null>(null);

const STORAGE_KEY = 'cinex_demo_identity';

function generateAddress(name: string, role: string): string {
  const input = name.toLowerCase().trim() + ':' + role;
  let h1 = 0, h2 = 0, h3 = 0, h4 = 0;
  for (let i = 0; i < input.length; i++) {
    const c = input.charCodeAt(i);
    h1 = ((h1 << 5) - h1) + c;
    h2 = ((h2 << 7) - h2) + c * 3;
    h3 = ((h3 << 9) - h3) + c * 7;
    h4 = ((h4 << 11) - h4) + c * 13;
    h1 |= 0; h2 |= 0; h3 |= 0; h4 |= 0;
  }
  const parts = [Math.abs(h1), Math.abs(h2), Math.abs(h3), Math.abs(h4)];
  const hex = parts.map(h => h.toString(16).padStart(8, '0')).join('').toUpperCase();
  return 'ST' + hex.slice(0, 38);
}

function loadIdentity(): OnboardingState | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as OnboardingState;
  } catch {
    return null;
  }
}

function saveIdentity(state: OnboardingState): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    console.error('Failed to persist identity to sessionStorage');
  }
}

function clearIdentity(): void {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    //
  }
}

export function DemoModeProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<OnboardingState>(() => {
    const saved = loadIdentity();
    if (saved) return saved;
    return { address: '', role: null, isOnboarded: false, isDemo: true };
  });

  useEffect(() => {
    if (state.isOnboarded) {
      saveIdentity(state);
    }
  }, [state]);

  const completeOnboarding = useCallback((name: string, role: UserRole) => {
    const address = generateAddress(name, role);
    const newState: OnboardingState = {
      address,
      role,
      isOnboarded: true,
      isDemo: true,
    };
    setState(newState);
    try { sessionStorage.setItem('cinex_demo_name', name); } catch { /* ignore */ }
  }, []);

  const logout = useCallback(() => {
    clearIdentity();
    setState({ address: '', role: null, isOnboarded: false, isDemo: true });
  }, []);

  const updateName = useCallback((name: string) => {
    if (!state.role) return;
    const address = generateAddress(name, state.role);
    const newState = { ...state, address, name: address };
    setState(newState);
  }, [state]);

  const updateRole = useCallback((role: UserRole) => {
    if (!state.address) return;
    const newState = { ...state, role };
    const address = generateAddress(
      state.address,
      role
    );
    newState.address = address;
    setState(newState);
  }, [state]);

  const currentUser: CurrentUser | null = state.isOnboarded
    ? { address: state.address, name: state.address, role: state.role! }
    : null;

  return (
    <DemoModeContext.Provider
      value={{
        currentUser,
        isOnboarded: state.isOnboarded,
        completeOnboarding,
        logout,
        updateName,
        updateRole,
      }}
    >
      {children}
    </DemoModeContext.Provider>
  );
}

export function useDemoMode(): DemoModeContextValue {
  const ctx = useContext(DemoModeContext);
  if (!ctx) {
    throw new Error('useDemoMode must be used within DemoModeProvider');
  }
  return ctx;
}
