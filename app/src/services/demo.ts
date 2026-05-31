const FAIL_KEY = 'cinex_demo_fail';

export function isDemoMode(): boolean {
  try { return localStorage.getItem('cinex_demo_mode') === 'true'; } catch { return false; }
}

export function setDemoMode(on: boolean): void {
  try { localStorage.setItem('cinex_demo_mode', on ? 'true' : 'false'); } catch { }
}

export function isDemoFailing(): boolean {
  try { return localStorage.getItem(FAIL_KEY) === 'true'; } catch { return false; }
}

export function setDemoFailing(on: boolean): void {
  try { localStorage.setItem(FAIL_KEY, on ? 'true' : 'false'); } catch { }
}

const STORAGE_KEY = 'cinex_demo_identity';

export function getDemoUserAddress(): string {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return 'ST1DEMO00000000000000000000000000000000';
    const state = JSON.parse(raw);
    return state.address || 'ST1DEMO00000000000000000000000000000000';
  } catch {
    return 'ST1DEMO00000000000000000000000000000000';
  }
}
