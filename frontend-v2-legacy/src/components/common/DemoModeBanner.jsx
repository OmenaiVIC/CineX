import { useDemoMode } from '@contexts/DemoModeContext';
import { DEMO_ADDRESSES, DEMO_PROFILES } from '@utils/demoAddresses';

export default function DemoModeBanner() {
  const { isDemo, demoRole, exitDemoMode } = useDemoMode();

  if (!isDemo) return null;

  const address = demoRole ? DEMO_ADDRESSES[demoRole] : null;
  const profile = address ? DEMO_PROFILES[address] : null;

  return (
    <div className="bg-yellow-400/10 border-b border-yellow-400/20 px-4 py-2">
      <div className="max-w-6xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm">
          <span className="bg-yellow-400 text-black text-xs font-bold px-2 py-0.5 rounded">
            DEMO
          </span>
          <span className="text-yellow-300/80">
            Browsing as{' '}
            <strong className="text-yellow-300">
              {profile?.displayName || demoRole || 'Guest'}
            </strong>
            {' · '}
            <span className="font-mono text-xs text-yellow-400/60">
              {address ? `${address.slice(0, 6)}...${address.slice(-4)}` : ''}
            </span>
          </span>
        </div>
        <button
          onClick={exitDemoMode}
          className="text-xs text-yellow-400/60 hover:text-yellow-300 transition"
        >
          Exit demo &times;
        </button>
      </div>
    </div>
  );
}
