import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import type { UserRole, OnboardingState } from '../types';
import { demoState } from '../services/demoState';
import { isDemoMode, setDemoMode } from '../services/demo';
import { resetToSeed } from './DemoStorage';

interface CurrentUser {
  address: string;
  name: string;
  role: UserRole;
}

export interface DemoModeContextType {
  currentUser: CurrentUser | null;
  isOnboarded: boolean;
  isDemoMode: boolean;
  completeOnboarding: (name: string, role: UserRole) => void;
  logout: () => void;
  updateName: (name: string) => void;
  updateRole: (role: UserRole) => void;
  toggleDemoMode: () => void;
  resetDemoData: () => void;
  grantAdmin: (address: string) => void;
}

export const DemoModeContext = createContext<DemoModeContextType | null>(null);

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
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as OnboardingState;
  } catch {
    return null;
  }
}

function saveIdentity(state: OnboardingState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    console.warn('Failed to persist identity to localStorage');
  }
}

function clearIdentity(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch { /* ignore */ }
}

export function DemoModeProvider({ children }: { children: ReactNode }) {
  const [identity, setIdentity] = useState<OnboardingState>(() => {
    const saved = loadIdentity();
    if (saved) return saved;
    return { address: '', role: null, isOnboarded: false, isDemo: true };
  });
  const [mockOn, setMockOn] = useState<boolean>(() => isDemoMode());

  useEffect(() => {
    if (identity.isOnboarded) {
      saveIdentity(identity);
    }
  }, [identity]);

  useEffect(() => {
    if (identity.isOnboarded) {
      demoState.ensureProfile(identity.address);
    }
  }, [identity.address, identity.isOnboarded]);

  const completeOnboarding = useCallback((name: string, role: UserRole) => {
    const address = generateAddress(name, role);
    const newState: OnboardingState = {
      address,
      role,
      isOnboarded: true,
      isDemo: true,
    };
    setIdentity(newState);
    setDemoMode(true);
    setMockOn(true);
    try { localStorage.setItem('cinex_demo_name', name); } catch { /* ignore */ }
    demoState.ensureProfile(address);
  }, []);

  const logout = useCallback(() => {
    clearIdentity();
    setIdentity({ address: '', role: null, isOnboarded: false, isDemo: true });
  }, []);

  const updateName = useCallback((name: string) => {
    if (!identity.role) return;
    const address = generateAddress(name, identity.role);
    const newState = { ...identity, address, name: address };
    setIdentity(newState);
  }, [identity]);

  const updateRole = useCallback((role: UserRole) => {
    if (!identity.address) return;
    const address = generateAddress(identity.address, role);
    setIdentity({ ...identity, role, address });
  }, [identity]);

  const toggleDemoMode = useCallback(() => {
    setMockOn(prev => {
      const next = !prev;
      setDemoMode(next);
      return next;
    });
  }, []);

  const resetDemoData = useCallback(() => {
    resetToSeed();
    if (identity.isOnboarded) {
      demoState.ensureProfile(identity.address);
    }
  }, [identity]);

  const grantAdmin = useCallback((address: string) => {
    demoState.grantAdmin(address);
  }, []);

  const currentUser: CurrentUser | null = identity.isOnboarded
    ? { address: identity.address, name: identity.address, role: identity.role! }
    : null;

  return (
    <DemoModeContext.Provider
      value={{
        currentUser,
        isOnboarded: identity.isOnboarded,
        isDemoMode: mockOn,
        completeOnboarding,
        logout,
        updateName,
        updateRole,
        toggleDemoMode,
        resetDemoData,
        grantAdmin,
      }}
    >
      {children}
    </DemoModeContext.Provider>
  );
}

export function useDemoMode(): DemoModeContextType {
  const ctx = useContext(DemoModeContext);
  if (!ctx) {
    throw new Error('useDemoMode must be used within DemoModeProvider');
  }
  return ctx;
}
