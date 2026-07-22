/**
 * PasskeyContext.tsx — Passkey auth state management for CineX Pillar.
 *
 * Provides passkey keypair management, SIP-018 signing, and relay transfer
 * execution. Works alongside the existing AuthContext (JWT) and DemoModeContext.
 */

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import {
  getOrCreateKeypair,
  clearKeypair,
  hasKeypair,
  passkeyTransfer,
  getRelayHealth,
  getRelayQuota,
  getExplorerUrl,
  type PasskeyKeypair,
  type TransferParams,
  type TransferResult,
  type RelayHealth,
  type RelayQuota,
} from '../services/passkeyService';

interface PasskeyContextValue {
  keypair: PasskeyKeypair | null;
  isPasskeyReady: boolean;
  loading: boolean;

  initPasskey: () => Promise<PasskeyKeypair>;
  resetPasskey: () => void;
  transfer: (params: TransferParams) => Promise<TransferResult>;
  checkHealth: () => Promise<RelayHealth>;
  checkQuota: () => Promise<RelayQuota>;
  getExplorerUrl: (txid: string) => string;
}

const PasskeyContext = createContext<PasskeyContextValue | null>(null);

export function PasskeyProvider({ children }: { children: ReactNode }) {
  const [keypair, setKeypair] = useState<PasskeyKeypair | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (hasKeypair()) {
      getOrCreateKeypair().then(setKeypair).catch(() => {}).finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const initPasskey = useCallback(async (): Promise<PasskeyKeypair> => {
    const kp = await getOrCreateKeypair();
    setKeypair(kp);
    return kp;
  }, []);

  const resetPasskey = useCallback(() => {
    clearKeypair();
    setKeypair(null);
  }, []);

  const transfer = useCallback(async (params: TransferParams): Promise<TransferResult> => {
    if (!keypair) throw new Error('Passkey not initialized — call initPasskey() first');
    return passkeyTransfer(params);
  }, [keypair]);

  const checkHealth = useCallback(async (): Promise<RelayHealth> => {
    return getRelayHealth();
  }, []);

  const checkQuota = useCallback(async (): Promise<RelayQuota> => {
    if (!keypair) throw new Error('Passkey not initialized');
    return getRelayQuota(keypair.address);
  }, [keypair]);

  return (
    <PasskeyContext.Provider value={{
      keypair,
      isPasskeyReady: !!keypair,
      loading,
      initPasskey,
      resetPasskey,
      transfer,
      checkHealth,
      checkQuota,
      getExplorerUrl,
    }}>
      {children}
    </PasskeyContext.Provider>
  );
}

export function usePasskey(): PasskeyContextValue {
  const ctx = useContext(PasskeyContext);
  if (!ctx) throw new Error('usePasskey must be used within PasskeyProvider');
  return ctx;
}
