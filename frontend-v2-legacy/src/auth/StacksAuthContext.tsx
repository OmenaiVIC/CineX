/**
 * StacksAuthContext.tsx
 * =====================
 * Stacks wallet authentication context for React.
 *
 * Handles three modes:
 *   1. DEMO MODE   — VITE_DEMO_MODE=true → no wallet needed, fixed mock address
 *   2. REAL WALLET — Hiro / Xverse via @stacks/connect (UserSession)
 *   3. GUEST       — no wallet connected, read-only access
 *
 * Exposes signIn, signOut, switchNetwork, and demo-mode flags.
 */

import { createContext, useContext, useState, useEffect } from "react";
import type { ReactNode } from "react";
import { UserSession, AppConfig, authenticate } from "@stacks/connect";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Fixed test address used when VITE_DEMO_MODE=true */
export const DEMO_ADDRESS = "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM";

/** Stacks address of the burn / null principal (used as fallback) */
export const BURN_ADDRESS = "SP000000000000000000002Q6VF78";

const appConfig = new AppConfig(["store_write", "publish_data"]);
const userSession = new UserSession({ appConfig });

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface UserData {
  stxAddress: { mainnet: string; testnet: string };
  btcAddress: { p2wpkh: { mainnet: string; testnet: string } };
  profile: { stxAddress: { mainnet: string; testnet: string } };
  username?: string;
  email?: string;
  given_name?: string;
  family_name?: string;
  [key: string]: any;
}

export interface AuthContextType {
  /** The raw UserSession from @stacks/connect (null in demo mode) */
  userSession: any;
  /** Decoded user data from the wallet, or the demo address object */
  userData: UserData | null;
  /** Whether the auth state is still being determined */
  isLoading: boolean;
  /** True when a wallet session or demo mode is active */
  isAuthenticated: boolean;
  /** Current connection lifecycle stage */
  connectionStatus: "disconnected" | "connecting" | "connected" | "error";
  /** Formatted STX balance string (e.g. "100.0 STX") */
  balance: string | null;
  /** Whether the balance is being fetched */
  isLoadingBalance: boolean;
  /** Last error message, or null */
  error: string | null;
  /** Open the Hiro / Xverse wallet popup for authentication */
  signIn: () => Promise<void>;
  /** Disconnect the wallet and clear session */
  signOut: () => void;
  /** Clear the error state */
  clearError: () => void;
  /** Re-fetch the STX balance from the chain */
  refreshBalance: () => Promise<void>;

  // ---- Day 1 additions ----

  /** True when VITE_DEMO_MODE=true — no real wallet connected */
  isDemoMode: boolean;
  /** The active Stacks address (real or demo) */
  activeAddress: string | null;
  /**
   * Persist a network preference to localStorage.
   * Environment vars can't change at runtime, so this stores intent;
   * the caller should prompt the user to reload.
   */
  switchNetwork: (target: "testnet" | "mainnet") => void;
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const AuthContext = createContext<AuthContextType>({
  userSession,
  userData: null,
  isLoading: false,
  isAuthenticated: false,
  connectionStatus: "disconnected",
  balance: null,
  isLoadingBalance: false,
  error: null,
  signIn: async () => {},
  signOut: () => {},
  clearError: () => {},
  refreshBalance: async () => {},
  isDemoMode: false,
  activeAddress: null,
  switchNetwork: () => {},
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Check whether the Hiro or Xverse wallet extension is installed.
 * Returns true when at least one known wallet global is present.
 */
function isWalletInstalled(): boolean {
  return (
    typeof window !== "undefined" &&
    (("stacks" in window) || ("StacksProvider" in window) || ("LeatherProvider" in window))
  );
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

type AuthProviderProps = { children: ReactNode };

export const AuthProvider = ({ children }: AuthProviderProps) => {
  // ---- Read feature flags from .env ----
  const demoMode = import.meta.env.VITE_DEMO_MODE === "true";

  // ---- State ----
  const [userData, setUserData] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [connectionStatus, setConnectionStatus] = useState<
    "disconnected" | "connecting" | "connected" | "error"
  >("disconnected");
  const [balance, setBalance] = useState<string | null>(null);
  const [isLoadingBalance, setIsLoadingBalance] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // ---- Derived ----
  const isAuthenticated = demoMode || Boolean(userData && userSession.isUserSignedIn());

  const activeAddress: string | null = demoMode
    ? DEMO_ADDRESS
    : userData
      ? (userData.profile?.stxAddress?.testnet ||
         userData.stxAddress?.testnet ||
         userData.profile?.stxAddress?.mainnet ||
         userData.stxAddress?.mainnet ||
         null)
      : null;

  // ---- Helpers ----

  /** Temporary stub — always returns "100.0 STX" until we wire Hiro API */
  const fetchBalance = async (_address: string): Promise<string> => {
    return "100.0 STX";
  };

  /** Extract a usable address from the wallet's user data */
  const getAddressFromUserData = (data: any): string | null => {
    return (
      data.profile?.stxAddress?.testnet ||
      data.stxAddress?.testnet ||
      data.profile?.stxAddress?.mainnet ||
      data.stxAddress?.mainnet ||
      null
    );
  };

  // ---- Effects ----

  /**
   * On mount:
   *   - In demo mode: instantly set the demo address and skip wallet init.
   *   - Otherwise: check for an existing Hiro session or pending sign-in.
   */
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // --- DEMO MODE ---
        if (demoMode) {
          console.log("[StacksAuth] Demo mode active — using fixed address", DEMO_ADDRESS);
          setConnectionStatus("connected");
          setIsLoading(false);
          return;
        }

        // --- REAL WALLET ---
        setConnectionStatus("connecting");

        if (userSession.isUserSignedIn()) {
          const loadedUserData = userSession.loadUserData();
          setUserData(loadedUserData);
          setConnectionStatus("connected");
          localStorage.setItem("cinex_user_data", JSON.stringify(loadedUserData));

          const address = getAddressFromUserData(loadedUserData);
          if (address) {
            setIsLoadingBalance(true);
            const bal = await fetchBalance(address);
            setBalance(bal);
            setIsLoadingBalance(false);
          }
        } else if (userSession.isSignInPending()) {
          const pendingUserData = await userSession.handlePendingSignIn();
          setUserData(pendingUserData);
          setConnectionStatus("connected");
          localStorage.setItem("cinex_user_data", JSON.stringify(pendingUserData));

          const address = getAddressFromUserData(pendingUserData);
          if (address) {
            setIsLoadingBalance(true);
            const bal = await fetchBalance(address);
            setBalance(bal);
            setIsLoadingBalance(false);
          }
        } else {
          // Try restoring from localStorage
          const stored = localStorage.getItem("cinex_user_data");
          if (stored) {
            try {
              const parsed = JSON.parse(stored);
              setUserData(parsed);
              setConnectionStatus("connected");
            } catch {
              localStorage.removeItem("cinex_user_data");
              setConnectionStatus("disconnected");
            }
          } else {
            setConnectionStatus("disconnected");
          }
        }
      } catch (authError) {
        console.error("[StacksAuth] Initialisation error:", authError);
        setError("Failed to initialise authentication. Please try again.");
        setConnectionStatus("error");
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, [demoMode]);

  // ---- Public methods ----

  const signIn = async (): Promise<void> => {
    // In demo mode, signIn is a no-op because we're already "connected"
    if (demoMode) {
      console.log("[StacksAuth] Demo mode — signIn skipped");
      return;
    }

    // Detect missing wallet before calling authenticate
    if (!isWalletInstalled()) {
      setError(
        "No Stacks wallet detected. Please install the Hiro Wallet or Xverse " +
        "browser extension, then try again."
      );
      setConnectionStatus("error");
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setConnectionStatus("connecting");
      setError(null);

      return new Promise<void>((resolve, reject) => {
        authenticate({
          appDetails: {
            name: "CineX",
            icon: window.location.origin + "/vite.svg",
          },
          userSession,
          onFinish: async () => {
            try {
              const loadedUserData = userSession.loadUserData();
              setUserData(loadedUserData);
              setConnectionStatus("connected");
              localStorage.setItem("cinex_user_data", JSON.stringify(loadedUserData));

              const address = getAddressFromUserData(loadedUserData);
              if (address) {
                setIsLoadingBalance(true);
                const userBalance = await fetchBalance(address);
                setBalance(userBalance);
                setIsLoadingBalance(false);
              }

              setIsLoading(false);
              resolve();
            } catch (finishError) {
              console.error("[StacksAuth] Sign-in finish error:", finishError);
              setError("Failed to complete sign in. Please try again.");
              setConnectionStatus("error");
              setIsLoading(false);
              reject(finishError);
            }
          },
          onCancel: () => {
            setError("Sign in was cancelled.");
            setConnectionStatus("disconnected");
            setIsLoading(false);
            reject(new Error("Sign in cancelled"));
          },
        });
      });
    } catch (signInError) {
      console.error("[StacksAuth] Sign-in error:", signInError);
      setError("Failed to sign in. Please check your wallet connection.");
      setConnectionStatus("error");
      setIsLoading(false);
      throw signInError;
    }
  };

  const signOut = (): void => {
    try {
      if (!demoMode) {
        userSession.signUserOut(window.location.origin);
      }
      setUserData(null);
      setConnectionStatus("disconnected");
      setBalance(null);
      setIsLoadingBalance(false);
      localStorage.removeItem("cinex_user_data");
      localStorage.removeItem("blockstack-session");
      setError(null);
    } catch (signOutError) {
      console.error("[StacksAuth] Sign-out error:", signOutError);
      setError("Failed to sign out properly. Please refresh the page.");
      setConnectionStatus("error");
    }
  };

  const clearError = (): void => {
    setError(null);
  };

  const refreshBalance = async (): Promise<void> => {
    if (!userData && !demoMode) return;

    try {
      setIsLoadingBalance(true);
      const address = activeAddress;
      if (address) {
        const newBalance = await fetchBalance(address);
        setBalance(newBalance);
      }
    } catch (err) {
      console.error("[StacksAuth] Balance refresh error:", err);
    } finally {
      setIsLoadingBalance(false);
    }
  };

  /**
   * switchNetwork
   * -------------
   * Store the desired network in localStorage.
   * Since VITE_NETWORK is baked at build time, the page must be reloaded
   * for the change to take effect.
   */
  const switchNetworkFn = (target: "testnet" | "mainnet"): void => {
    localStorage.setItem("cinex_network_preference", target);
    console.log(`[StacksAuth] Network preference saved: ${target}. Reload to apply.`);
  };

  // ---- Context value ----

  const contextValue: AuthContextType = {
    userSession,
    userData,
    isLoading,
    isAuthenticated,
    error,
    connectionStatus,
    balance,
    isLoadingBalance,
    signIn,
    signOut,
    clearError,
    refreshBalance,
    isDemoMode: demoMode,
    activeAddress,
    switchNetwork: switchNetworkFn,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

// ---- Hook ----

export const useAuth = (): AuthContextType => useContext(AuthContext);
