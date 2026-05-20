import { useState, useEffect, useCallback } from 'react';

const HIRO_HEALTH_URL = 'https://api.testnet.hiro.so/v2/info';
const POLL_INTERVAL_MS = 60_000;
const TIMEOUT_MS = 8_000;

async function checkHiroHealth(): Promise<boolean> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(HIRO_HEALTH_URL, {
      signal: controller.signal,
      method: 'GET',
    });
    return res.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(id);
  }
}

export default function NetworkDowntimeBanner() {
  const [isDown, setIsDown] = useState(false);
  const [lastOk, setLastOk] = useState<Date>(new Date());

  const check = useCallback(async () => {
    const healthy = await checkHiroHealth();
    if (!healthy) {
      setIsDown(true);
    } else {
      setIsDown(false);
      setLastOk(new Date());
    }
  }, []);

  useEffect(() => {
    check();
    const interval = setInterval(check, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [check]);

  if (!isDown) return null;

  const minutesAgo = Math.floor(
    (Date.now() - lastOk.getTime()) / 60_000,
  );

  return (
    <div
      className="bg-red-600/10 border-b border-red-500/30 px-4 py-2"
      role="alert"
    >
      <div className="max-w-6xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm">
          <span className="inline-block w-2 h-2 bg-red-500 rounded-full animate-pulse" />
          <span className="text-red-300">
            Stacks API temporarily unreachable
            {minutesAgo > 0 && ` (~${minutesAgo} min)`}
          </span>
        </div>
        <button
          onClick={check}
          className="text-xs text-red-300/60 hover:text-red-200 transition"
        >
          Retry now
        </button>
      </div>
    </div>
  );
}
