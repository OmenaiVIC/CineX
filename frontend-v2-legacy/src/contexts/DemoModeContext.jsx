import { createContext, useContext, useState, useCallback } from 'react';

const DemoModeContext = createContext();

export function DemoModeProvider({ children }) {
  const [isDemo, setIsDemo] = useState(() => {
    return sessionStorage.getItem('cinex_demo_mode') === 'true';
  });
  const [demoRole, setDemoRole] = useState(() => {
    return sessionStorage.getItem('cinex_demo_role') || null;
  });

  const enterDemoMode = useCallback((role) => {
    sessionStorage.setItem('cinex_demo_mode', 'true');
    sessionStorage.setItem('cinex_demo_role', role);
    setIsDemo(true);
    setDemoRole(role);
  }, []);

  const exitDemoMode = useCallback(() => {
    sessionStorage.removeItem('cinex_demo_mode');
    sessionStorage.removeItem('cinex_demo_role');
    setIsDemo(false);
    setDemoRole(null);
  }, []);

  return (
    <DemoModeContext.Provider value={{ isDemo, demoRole, enterDemoMode, exitDemoMode }}>
      {children}
    </DemoModeContext.Provider>
  );
}

export function useDemoMode() {
  const ctx = useContext(DemoModeContext);
  if (!ctx) throw new Error('useDemoMode must be used within DemoModeProvider');
  return ctx;
}
