// Stacks wallet authentication context for React
import { createContext, useContext, useState, useEffect } from 'react';
import { UserSession, AppConfig, authenticate } from '@stacks/connect';

const appConfig = new AppConfig(['store_write', 'publish_data']);
const userSession = new UserSession({ appConfig });

// Proper TypeScript interfaces
interface UserData {
  stxAddress: {
    mainnet: string;
    testnet: string;
  };
  btcAddress: {
    p2wpkh: {
      mainnet: string;
      testnet: string;
    };
  };
  profile: {
    stxAddress: {
      mainnet: string;
      testnet: string;
    };
  };
  username?: string;
  email?: string;
  given_name?: string;
  family_name?: string;
  [key: string]: any;
}

interface AuthContextType {
  userSession: any;
  userData: UserData | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  connectionStatus: 'disconnected' | 'connecting' | 'connected' | 'error';
  balance: string | null;
  isLoadingBalance: boolean;
  error: string | null;
  signIn: () => Promise<void>;
  signOut: () => void;
  clearError: () => void;
  refreshBalance: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  userSession,
  userData: null,
  isLoading: false,
  isAuthenticated: false,
  connectionStatus: 'disconnected',
  balance: null,
  isLoadingBalance: false,
  error: null,
  signIn: async () => {},
  signOut: () => {},
  clearError: () => {},
  refreshBalance: async () => {},
});

import type { ReactNode } from 'react';

type AuthProviderProps = {
  children: ReactNode;
};

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected');
  const [balance, setBalance] = useState<string | null>(null);
  const [isLoadingBalance, setIsLoadingBalance] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Helper function to get address from user data
  const getAddressFromUserData = (data: any): string | null => {
    const testnetAddr = data.profile?.stxAddress?.testnet || data.stxAddress?.testnet;
    const mainnetAddr = data.profile?.stxAddress?.mainnet || data.stxAddress?.mainnet;
    return testnetAddr || mainnetAddr || null;
  };

  // Balance fetching function
  const fetchBalance = async (_address: string): Promise<string> => {
    try {
      // For now, return placeholder balance - will implement real API call later
      return '100.0 STX';
    } catch (error) {
      console.error('Error fetching balance:', error);
      return '0.0 STX';
    }
  };

  // Function to refresh balance
  const refreshBalance = async (): Promise<void> => {
    if (!userData) return;
    
    try {
      setIsLoadingBalance(true);
      const address = getAddressFromUserData(userData);
      if (address) {
        const newBalance = await fetchBalance(address);
        setBalance(newBalance);
      }
    } catch (error) {
      console.error('Error refreshing balance:', error);
    } finally {
      setIsLoadingBalance(false);
    }
  };

  // Check for existing session on app startup
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        setIsLoading(true);
        setConnectionStatus('connecting');
        setError(null);

        if (userSession.isUserSignedIn()) {
          const loadedUserData = userSession.loadUserData();
          setUserData(loadedUserData);
          setConnectionStatus('connected');
          // Persist user data to localStorage
          localStorage.setItem('cinex_user_data', JSON.stringify(loadedUserData));
          
          // Fetch balance after successful connection
          const address = getAddressFromUserData(loadedUserData);
          if (address) {
            setIsLoadingBalance(true);
            const userBalance = await fetchBalance(address);
            setBalance(userBalance);
            setIsLoadingBalance(false);
          }
        } else if (userSession.isSignInPending()) {
          const pendingUserData = await userSession.handlePendingSignIn();
          setUserData(pendingUserData);
          setConnectionStatus('connected');
          // Persist user data to localStorage
          localStorage.setItem('cinex_user_data', JSON.stringify(pendingUserData));
          
          // Fetch balance after successful connection
          const address = getAddressFromUserData(pendingUserData);
          if (address) {
            setIsLoadingBalance(true);
            const userBalance = await fetchBalance(address);
            setBalance(userBalance);
            setIsLoadingBalance(false);
          }
        } else {
          // Try to restore from localStorage
          const storedUserData = localStorage.getItem('cinex_user_data');
          if (storedUserData && userSession.isUserSignedIn()) {
            try {
              const parsedUserData = JSON.parse(storedUserData);
              setUserData(parsedUserData);
              setConnectionStatus('connected');
              
              // Fetch balance for restored session
              const address = getAddressFromUserData(parsedUserData);
              if (address) {
                setIsLoadingBalance(true);
                const userBalance = await fetchBalance(address);
                setBalance(userBalance);
                setIsLoadingBalance(false);
              }
            } catch (parseError) {
              console.warn('Failed to parse stored user data:', parseError);
              localStorage.removeItem('cinex_user_data');
              setConnectionStatus('disconnected');
            }
          } else {
            setConnectionStatus('disconnected');
          }
        }
      } catch (authError) {
        console.error('Authentication initialization error:', authError);
        setError('Failed to initialize authentication. Please try again.');
        setConnectionStatus('error');
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const signIn = async (): Promise<void> => {
    try {
      setIsLoading(true);
      setConnectionStatus('connecting');
      setError(null);

      return new Promise<void>((resolve, reject) => {
        authenticate({
          appDetails: {
            name: 'CineX',
            icon: window.location.origin + '/vite.svg',
          },
          userSession,
          onFinish: async () => {
            try {
              const loadedUserData = userSession.loadUserData();
              setUserData(loadedUserData);
              setConnectionStatus('connected');
              // Persist user data to localStorage
              localStorage.setItem('cinex_user_data', JSON.stringify(loadedUserData));
              
              // Fetch balance after successful sign in
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
              console.error('Sign in finish error:', finishError);
              setError('Failed to complete sign in. Please try again.');
              setConnectionStatus('error');
              setIsLoading(false);
              reject(finishError);
            }
          },
          onCancel: () => {
            setError('Sign in was cancelled.');
            setConnectionStatus('disconnected');
            setIsLoading(false);
            reject(new Error('Sign in cancelled'));
          },
        });
      });
    } catch (signInError) {
      console.error('Sign in error:', signInError);
      setError('Failed to sign in. Please check your wallet connection.');
      setConnectionStatus('error');
      setIsLoading(false);
      throw signInError;
    }
  };

  const signOut = (): void => {
    try {
      userSession.signUserOut(window.location.origin);
      setUserData(null);
      setConnectionStatus('disconnected');
      setBalance(null);
      setIsLoadingBalance(false);
      // Clear persisted data
      localStorage.removeItem('cinex_user_data');
      localStorage.removeItem('blockstack-session');
      setError(null);
    } catch (signOutError) {
      console.error('Sign out error:', signOutError);
      setError('Failed to sign out properly. Please refresh the page.');
      setConnectionStatus('error');
    }
  };

  const clearError = (): void => {
    setError(null);
  };

  const isAuthenticated = Boolean(userData && userSession.isUserSignedIn());

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
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => useContext(AuthContext);