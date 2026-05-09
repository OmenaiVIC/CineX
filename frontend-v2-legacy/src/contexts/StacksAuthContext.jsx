import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserSession, AppConfig, authenticate } from '@stacks/connect';

// Create app config with proper scopes
const appConfig = new AppConfig(['store_write', 'publish_data']);
const userSession = new UserSession({ appConfig });

const StacksAuthContext = createContext();

// Custom hook to use auth context
function useAuth() {
  const context = useContext(StacksAuthContext);
  if (!context) {
    throw new Error('useAuth must be used within StacksAuthProvider');
  }
  return context;
}

// Helper function to get address from user data
const getAddressFromUserData = (data) => {
  if (!data) return '';
  const testnetAddr = data.profile?.stxAddress?.testnet || data.stxAddress?.testnet;
  const mainnetAddr = data.profile?.stxAddress?.mainnet || data.stxAddress?.mainnet;
  return testnetAddr || mainnetAddr || '';
};

// Provider component
function StacksAuthProvider({ children }) {
  const [userData, setUserData] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [balance, setBalance] = useState(null);
  const [isLoadingBalance, setIsLoadingBalance] = useState(false);
  const [error, setError] = useState(null);
  // user type: 'public' | 'filmmaker' | 'endorser' | null
  const [userType, setUserType] = useState(null);

  // Initialize auth state on mount
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        setIsLoading(true);

        // Check if user is already signed in
        if (userSession.isUserSignedIn()) {
          const loadedUserData = userSession.loadUserData();
          setUserData(loadedUserData);
          setIsAuthenticated(true);
          localStorage.setItem('stacksUserData', JSON.stringify(loadedUserData));
        } else if (userSession.isSignInPending()) {
          // Handle pending sign in
          const pendingUserData = await userSession.handlePendingSignIn();
          setUserData(pendingUserData);
          setIsAuthenticated(true);
          localStorage.setItem('stacksUserData', JSON.stringify(pendingUserData));
        } else {
          // Try to restore from localStorage
          const storedUserData = localStorage.getItem('stacksUserData');
          if (storedUserData) {
            try {
              const parsedUserData = JSON.parse(storedUserData);
              if (userSession.isUserSignedIn()) {
                setUserData(parsedUserData);
                setIsAuthenticated(true);
              } else {
                localStorage.removeItem('stacksUserData');
              }
            } catch (e) {
              console.error('Failed to parse stored user data:', e);
              localStorage.removeItem('stacksUserData');
            }
          }
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        setError('Failed to initialize authentication');
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const signIn = async () => {
    return new Promise((resolve, reject) => {
      try {
        setIsLoading(true);
        setError(null);
        // Add redirectTo so wallets know where to return after auth
        const redirectTo = window.location.pathname || '/';
        console.log('Starting Stacks authenticate, redirectTo=', redirectTo);

        let authTimedOut = false;
        const timeout = setTimeout(() => {
          authTimedOut = true;
          console.warn('Authentication flow did not complete within timeout');
          setIsLoading(false);
          setError('Authentication timed out — check popup blocker or wallet provider');
          reject(new Error('Authentication timed out'));
        }, 15000);

        authenticate({
          appDetails: {
            name: 'CineX',
            icon: window.location.origin + '/images/logo.png',
          },
          userSession,
          redirectTo,
          onFinish: async () => {
            clearTimeout(timeout);
            if (authTimedOut) return; // already rejected
            try {
              const loadedUserData = userSession.loadUserData();
              console.log('Authentication finished, loaded userData:', loadedUserData);
              setUserData(loadedUserData);
              // try to restore userType from profile (fallback to 'public')
              const profileType = loadedUserData?.profile?.apps?.['cinex']?.role || loadedUserData?.profile?.role;
              setUserType(profileType || 'public');
              setIsAuthenticated(true);
              localStorage.setItem('stacksUserData', JSON.stringify(loadedUserData));
              setIsLoading(false);
              resolve();
            } catch (error) {
              console.error('Failed to load user data:', error);
              setError('Failed to load user data');
              setIsLoading(false);
              reject(error);
            }
          },
          onCancel: () => {
            clearTimeout(timeout);
            if (authTimedOut) return;
            console.log('Sign in cancelled');
            setIsLoading(false);
            reject(new Error('Sign in cancelled'));
          },
        });
      } catch (error) {
        console.error('Sign in error:', error);
        setError('Sign in failed');
        setIsLoading(false);
        reject(error);
      }
    });
  };

  const signOut = () => {
    setUserData(null);
    setIsAuthenticated(false);
    setBalance(null);
    setError(null);
    setUserType(null);
    localStorage.removeItem('stacksUserData');
    userSession.signUserOut();
  };

  const refreshBalance = async () => {
    if (!userData) return;
    setIsLoadingBalance(true);
    try {
      // Implement balance fetching logic here
      // For now, this is a placeholder
      setBalance(null);
    } catch (error) {
      console.error('Failed to refresh balance:', error);
    } finally {
      setIsLoadingBalance(false);
    }
  };

  const value = {
    userSession,
    userData,
    isAuthenticated,
    isLoading,
    balance,
    isLoadingBalance,
    error,
    userType,
    setUserType,
    signIn,
    signOut,
    refreshBalance,
    getAddressFromUserData,
  };

  return (
    <StacksAuthContext.Provider value={value}>
      {children}
    </StacksAuthContext.Provider>
  );
}

export { useAuth, StacksAuthProvider };
