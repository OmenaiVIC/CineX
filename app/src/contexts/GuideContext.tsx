import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import HowItWorksGuide from '../components/ui/HowItWorksGuide';

interface GuideContextValue {
  isGuideOpen: boolean;
  openGuide: () => void;
  closeGuide: () => void;
}

const GuideContext = createContext<GuideContextValue | null>(null);

export function GuideProvider({ children }: { children: ReactNode }) {
  const [isGuideOpen, setOpen] = useState(false);

  const openGuide = useCallback(() => setOpen(true), []);
  const closeGuide = useCallback(() => setOpen(false), []);

  return (
    <GuideContext.Provider value={{ isGuideOpen, openGuide, closeGuide }}>
      {children}
      <HowItWorksGuide isOpen={isGuideOpen} onClose={closeGuide} />
    </GuideContext.Provider>
  );
}

export function useGuide(): GuideContextValue {
  const ctx = useContext(GuideContext);
  if (!ctx) throw new Error('useGuide must be used within GuideProvider');
  return ctx;
}
