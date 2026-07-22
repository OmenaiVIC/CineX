import { useCallback } from 'react';

const IDEMPOTENCY_PREFIX = 'cinex_idem_';
const EXPIRY_MS = 10 * 60 * 1000;

export function useIdempotencyKey() {
  const getKey = useCallback((action: string): string => {
    const key = `${IDEMPOTENCY_PREFIX}${action}`;
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const { key: stored, ts } = JSON.parse(raw);
        if (Date.now() - ts < EXPIRY_MS) return stored;
      }
    } catch { /* */ }
    const newKey = crypto.randomUUID();
    try { localStorage.setItem(key, JSON.stringify({ key: newKey, ts: Date.now() })); } catch { /* */ }
    return newKey;
  }, []);

  const isDuplicate = useCallback((action: string): boolean => {
    const key = `${IDEMPOTENCY_PREFIX}${action}`;
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return false;
      const { ts } = JSON.parse(raw);
      return Date.now() - ts < EXPIRY_MS;
    } catch { return false; }
  }, []);

  const clearKey = useCallback((action: string): void => {
    try { localStorage.removeItem(`${IDEMPOTENCY_PREFIX}${action}`); } catch { /* */ }
  }, []);

  return { getKey, isDuplicate, clearKey };
}
