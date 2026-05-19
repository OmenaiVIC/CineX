/**
 * userSettingsService.ts
 * ======================
 * Per-user platform settings (notifications, privacy, display).
 *
 * Public methods:
 *   getSettings(address)       — fetch saved settings for an address
 *   updateSettings(changes)    — merge partial changes
 *   resetDefaults(address)     — restore factory defaults
 */

import type { ServiceResponse, UserSettings } from "../types";

interface UserSession {
  isUserSignedIn(): boolean;
  loadUserData(): { profile: { stxAddress: { testnet: string; mainnet: string } } };
}

// ---------------------------------------------------------------------------
// Defaults — returned when no saved settings exist
// ---------------------------------------------------------------------------
const DEFAULT_SETTINGS: UserSettings = {
  notifications: { email: false, inApp: true, milestones: true },
  privacy:       { showPortfolio: true, showActivity: false },
  display:       { theme: "dark", language: "en" },
  defaultNetwork: "testnet",
};

// ---------------------------------------------------------------------------
// In-memory store (simulates a backend DB)
// ---------------------------------------------------------------------------
const settingsStore = new Map<string, UserSettings>();

export class UserSettingsService {
  private userSession: UserSession | null;

  constructor(userSession: UserSession | null) {
    this.userSession = userSession;
  }

  /**
   * getSettings
   * -----------
   * Retrieve settings for an address, or the default if none saved.
   * @param address - Stacks address
   */
  async getSettings(address: string): Promise<ServiceResponse<UserSettings>> {
    const saved = settingsStore.get(address);
    return { success: true, data: saved ?? { ...DEFAULT_SETTINGS } };
  }

  /**
   * updateSettings
   * --------------
   * Deep-merge partial changes into the user's saved settings.
   * @param address - Stacks address
   * @param changes - Partial UserSettings to merge
   */
  async updateSettings(address: string, changes: Partial<DeepObject<UserSettings>>): Promise<ServiceResponse<UserSettings>> {
    const current = settingsStore.get(address) ?? { ...DEFAULT_SETTINGS };
    const merged = deepMerge(current, changes as Record<string, unknown>) as UserSettings;
    settingsStore.set(address, merged);
    return { success: true, data: merged, transactionId: `mock_tx_${Date.now()}` };
  }

  /**
   * resetDefaults
   * -------------
   * Remove saved settings, falling back to the factory defaults.
   */
  async resetDefaults(address: string): Promise<ServiceResponse<UserSettings>> {
    settingsStore.delete(address);
    return { success: true, data: { ...DEFAULT_SETTINGS } };
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Shorthand for deeply nested objects */
type DeepObject<T> = T extends Record<string, unknown> ? { [K in keyof T]?: DeepObject<T[K]> } : T;

/**
 * Simple deep-merge for plain objects.
 * Nested objects are merged recursively; primitives are overwritten.
 */
function deepMerge(target: Record<string, unknown>, source: Record<string, unknown>): Record<string, unknown> {
  const out = { ...target };
  for (const key of Object.keys(source)) {
    if (
      source[key] !== null &&
      typeof source[key] === "object" &&
      !Array.isArray(source[key]) &&
      target[key] !== null &&
      typeof target[key] === "object" &&
      !Array.isArray(target[key])
    ) {
      out[key] = deepMerge(target[key] as Record<string, unknown>, source[key] as Record<string, unknown>);
    } else {
      out[key] = source[key];
    }
  }
  return out;
}

export function createUserSettingsService(us: UserSession | null): UserSettingsService {
  return new UserSettingsService(us);
}
