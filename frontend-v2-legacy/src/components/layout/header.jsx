import React, { useState, useCallback, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { getRouteByName, getNavigationRoutes } from '@app/router';
import { useAuth } from '@contexts/StacksAuthContext';

/**
 * Main site header with navigation and mobile menu
 */
const Header = React.memo(function Header() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const location = useLocation();
  const { userData, isAuthenticated, isLoading, signIn, signOut, error } = useAuth();
  const [showError, setShowError] = useState(false);

  useEffect(() => {
    if (error) setShowError(true);
  }, [error]);

  // Detect common Stacks wallet providers (best-effort)
  const detectWalletInstalled = () => {
    if (typeof window === 'undefined') return false;
    // Common injects: xverse, hiro (hiro-wallet), hiroWallet
    // Keep this list minimal; if you have other wallet globals add them here.
    // eslint-disable-next-line no-undef
    return Boolean(window.xverse || window.hiroWallet || window.hiro || window?.StacksProvider || window?.stacksProvider);
  };

  const walletInstalled = detectWalletInstalled();

  const toggleMobileNav = useCallback(() => {
    setMobileNavOpen((prev) => !prev);
  }, []);

  const closeMobileNav = useCallback(() => {
    setMobileNavOpen(false);
  }, []);

  const navigationItems = getNavigationRoutes();

  // Helper to get address from userData
  const getStacksAddress = () => {
    if (!userData) return '';
    const testnetAddr = userData.profile?.stxAddress?.testnet || userData.stxAddress?.testnet;
    const mainnetAddr = userData.profile?.stxAddress?.mainnet || userData.stxAddress?.mainnet;
    return testnetAddr || mainnetAddr || '';
  };

  const handleSignIn = async () => {
    try {
      await signIn();
    } catch (err) {
      console.error('Sign in failed:', err);
    }
  };

  return (
    <header className="overflow-hidden">
      <div className="container px-4 mx-auto">
        <div className="flex items-center justify-between pt-6 -m-2">
          <div className="w-auto p-2">
            <div className="flex flex-wrap items-center">
              <div className="w-auto">
                <Link
                  className="relative z-10 inline-block"
                  to={getRouteByName('home')}
                >
                  <img src="/images/logo.png" alt="" />
                </Link>
              </div>
            </div>
          </div>
          <div className="w-auto p-2">
            <div className="flex flex-wrap items-center">
              <nav className="w-auto hidden lg:block">
                <ul className="flex items-center mr-12">
                  {navigationItems.map((item, index) => (
                    <li
                      key={item.to}
                      className={`${
                        index < navigationItems.length - 1 ? 'mr-12' : ''
                      } text-white font-medium hover:text-opacity-90 tracking-tighter`}
                    >
                      <Link
                        to={item.to}
                        className={`${
                          location.pathname === item.to
                            ? 'text-yellow-400'
                            : 'text-white'
                        } hover:text-yellow-400 transition-colors duration-200`}
                      >
                        {item.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
              <div className="w-auto hidden lg:block">
                <div className="inline-block">
                  {isLoading ? (
                    <button className="inline-block px-8 py-4 text-white hover:text-black tracking-tighter hover:bg-yellow-400 border-2 border-white focus:border-yellow-400/40 hover:border-yellow-400 focus:ring-4 focus:ring-yellow-400/40 rounded-full transition duration-300" disabled>
                      Loading...
                    </button>
                  ) : userData && isAuthenticated ? (
                    <div className="flex items-center gap-4">
                      <button
                        className="inline-block px-8 py-4 text-white hover:text-black tracking-tighter hover:bg-yellow-400 border-2 border-white focus:border-yellow-400/40 hover:border-yellow-400 focus:ring-4 focus:ring-yellow-400/40 rounded-full transition duration-300"
                        onClick={signOut}
                      >
                        Disconnect
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center">
                      <button
                        className="inline-block px-8 py-4 text-white hover:text-black tracking-tighter hover:bg-yellow-400 border-2 border-white focus:border-yellow-400/40 hover:border-yellow-400 focus:ring-4 focus:ring-yellow-400/40 rounded-full transition duration-300"
                        onClick={() => {
                          if (!walletInstalled) {
                            setShowError(true);
                            // Provide user-friendly message
                            // eslint-disable-next-line no-console
                            console.warn('No wallet extension detected');
                            return;
                          }
                          handleSignIn();
                        }}
                        disabled={isLoading}
                      >
                        Connect Wallet
                      </button>
                      {!walletInstalled && (
                        <p className="mt-2 text-xs text-gray-300">No wallet detected — install Xverse/Hiro or use WalletConnect</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <div className="w-auto lg:hidden">
                <button
                  className="relative z-10 inline-block"
                  onClick={toggleMobileNav}
                >
                  <svg
                    className="text-yellow-400"
                    width="51"
                    height="51"
                    viewBox="0 0 56 56"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <rect
                      width="56"
                      height="56"
                      rx="28"
                      fill="currentColor"
                    ></rect>
                    <path
                      d="M37 32H19M37 24H19"
                      stroke="black"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    ></path>
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Auth error banner */}
        {error && showError && (
          <div className="mt-4 mx-4 rounded-md overflow-hidden">
            <div className="flex items-center justify-between bg-red-600 text-white px-4 py-3">
              <div className="text-sm">{error}</div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleSignIn}
                  className="inline-flex items-center px-3 py-1 bg-white text-red-600 font-semibold rounded hover:opacity-90"
                >
                  Retry
                </button>
                <button
                  onClick={() => setShowError(false)}
                  className="inline-flex items-center px-3 py-1 text-white opacity-90 hover:opacity-100"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      <div
        className={`${
          mobileNavOpen ? 'block' : 'hidden'
        } fixed top-0 left-0 bottom-0 right-auto z-50 pointer-events-auto`}
        style={{ width: 'min(100vw, calc(100% - 2rem))' }}
      >
        <div
          className="fixed inset-0 z-0 bg-black opacity-60 pointer-events-auto"
          onClick={toggleMobileNav}
        ></div>
        <nav className="relative z-10 w-full px-9 pt-8 h-full bg-black overflow-y-auto pointer-events-auto">
          <div className="flex flex-wrap justify-between h-full">
            <div className="w-full">
              <div className="flex items-center justify-between -m-2">
                <div className="w-auto p-2">
                  <Link className="inline-block" to={getRouteByName('home')}>
                    <img src="/images/logo.svg" alt="" />
                  </Link>
                </div>
                <div className="w-auto p-2">
                  <button
                    className="inline-block text-white"
                    onClick={toggleMobileNav}
                  >
                    <svg
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M6 18L18 6M6 6L18 18"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      ></path>
                    </svg>
                  </button>
                </div>
              </div>
            </div>
            <div className="flex flex-col justify-center py-16 w-full">
              <ul>
                {navigationItems.map((item, index) => (
                  <li
                    key={item.to}
                    className={`${
                      index < navigationItems.length - 1 ? 'mb-8' : ''
                    } text-white font-medium hover:text-opacity-90 tracking-tighter`}
                  >
                    <Link
                      to={item.to}
                      onClick={closeMobileNav}
                      className={`${
                        location.pathname === item.to
                          ? 'text-yellow-400'
                          : 'text-white'
                      } hover:text-yellow-400 transition-colors duration-200`}
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex flex-col justify-end w-full pb-8">
              {isLoading ? (
                <button className="inline-block px-8 py-4 text-center text-white hover:text-black tracking-tighter hover:bg-yellow-400 border-2 border-white focus:border-yellow-400/40 hover:border-yellow-400 focus:ring-4 focus:ring-yellow-400/40 rounded-full transition duration-300" disabled>
                  Loading...
                </button>
              ) : userData && isAuthenticated ? (
                <div className="flex flex-col gap-4">
                  <span className="text-white text-sm text-center" title={getStacksAddress()}>
                    {getStacksAddress().slice(0, 6)}...{getStacksAddress().slice(-4)}
                  </span>
                  <button
                    className="inline-block px-8 py-4 text-center text-white hover:text-black tracking-tighter hover:bg-yellow-400 border-2 border-white focus:border-yellow-400/40 hover:border-yellow-400 focus:ring-4 focus:ring-yellow-400/40 rounded-full transition duration-300"
                    onClick={() => {
                      signOut();
                      closeMobileNav();
                    }}
                  >
                    Disconnect
                  </button>
                </div>
              ) : (
                <button
                  className="inline-block px-8 py-4 text-center text-white hover:text-black tracking-tighter hover:bg-yellow-400 border-2 border-white focus:border-yellow-400/40 hover:border-yellow-400 focus:ring-4 focus:ring-yellow-400/40 rounded-full transition duration-300"
                  onClick={() => {
                    handleSignIn();
                    closeMobileNav();
                  }}
                  disabled={isLoading}
                >
                  Connect Wallet
                </button>
              )}
            </div>
          </div>
        </nav>
      </div>
    </header>
  );
});

export default Header;
