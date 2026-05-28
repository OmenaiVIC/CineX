import { useState, useCallback } from 'react';
import {
  connect as stacksConnect,
  disconnect as stacksDisconnect,
  isConnected,
  getLocalStorage,
  isStacksWalletInstalled,
} from '@stacks/connect';

export function useStacksConnect() {
  const [connected, setConnected] = useState(isConnected);
  const [installed] = useState(isStacksWalletInstalled);
  const [address, setAddress] = useState<string | null>(() => {
    if (isConnected()) {
      const data = getLocalStorage();
      return data?.addresses?.stx?.[0]?.address ?? null;
    }
    return null;
  });

  const connectWallet = useCallback(async (): Promise<string | null> => {
    try {
      const result = await stacksConnect();
      const addr = result?.addresses?.[0]?.address ?? null;
      if (addr) {
        setAddress(addr);
        setConnected(true);
      }
      return addr;
    } catch (err) {
      console.error('[StacksConnect] connection failed:', err);
      return null;
    }
  }, []);

  const disconnectWallet = useCallback(() => {
    stacksDisconnect();
    setConnected(false);
    setAddress(null);
  }, []);

  return {
    connectWallet,
    disconnectWallet,
    connected,
    installed,
    address,
  };
}
