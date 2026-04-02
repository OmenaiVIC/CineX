import React, { useState } from 'react';
import { useAuth } from '../../auth/StacksAuthContext';
import HamburgerMenu from './HamburgerMenu';
import { Link } from 'react-router-dom';
import styles from '../../styles/Layout/Header.module.css';
import handsLogo from '../../assets/hands-together-logo.svg';

const Header: React.FC = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  // Stacks authentication
  const { 
    userData, 
    isAuthenticated, 
    isLoading, 
    balance, 
    isLoadingBalance, 
    signIn, 
    signOut, 
    refreshBalance 
  } = useAuth();

  // Helper to get address from userData
  const getStacksAddress = () => {
    if (!userData) return '';
    // Stacks Connect v6+ puts addresses in userData.profile.stxAddress, but fallback to userData.stxAddress if needed
    const addr = userData.profile?.stxAddress || userData.stxAddress;
    if (typeof addr === 'string') return addr;
    // If it's an object, prefer mainnet, fallback to testnet
    return addr?.mainnet || addr?.testnet || '';
  };



  const toggleMenu = () => {
    setMenuOpen(!menuOpen);
  };
  const toggleDarkMode = () => setDarkMode((prev) => !prev);


  return (
    <header className={styles.header}>
      <div className={styles.logo}>
        <img src={handsLogo} alt="Hands together logo" className={styles.logoIcon} />
        <Link to="/" className={styles.logoTitle}>CineX</Link>
        {/* Tagline removed as requested */}
      </div>
      <nav className={styles.nav}>
        <Link to="/" className={styles.navLink}>Home</Link>
        <Link to="/campaign-create" className={styles.navLink}>Create Campaign</Link>
        <Link to="/pool-create" className={styles.navLink}>Create Pool</Link>
        <Link to="/coep-pools" className={styles.navLink}>Browse Pools</Link>
        <Link to="/waitlist" className={styles.navLink}>Waitlist</Link>
      </nav>
      <div className={styles.hamburgerMenuWrapper}>
        <button className={styles.hamburger} onClick={toggleMenu} aria-label="Open menu">
          <span className={styles.bar}></span>
          <span className={styles.bar}></span>
          <span className={styles.bar}></span>
        </button>
        <HamburgerMenu open={menuOpen} onClose={toggleMenu} darkMode={darkMode} toggleDarkMode={toggleDarkMode} />
      </div>
      <div className={styles.walletSection}>
        {isLoading ? (
          <button className={styles.walletButton} disabled>Loading...</button>
        ) : userData && isAuthenticated ? (
          <>
            <span className={styles.walletAddress} title={getStacksAddress()}>
              {getStacksAddress().slice(0, 6)}...{getStacksAddress().slice(-4)}
            </span>
            {isLoadingBalance ? (
              <span className={styles.balance}>Loading...</span>
            ) : balance !== null ? (
              <span className={styles.balance} title="STX Balance">
                {balance}
              </span>
            ) : (
              <button className={styles.refreshButton} onClick={refreshBalance} title="Refresh">
                ↻
              </button>
            )}
            <button className={styles.walletButton} onClick={signOut}>Disconnect</button>
          </>
        ) : (
          <button className={styles.walletButton} onClick={signIn}>Connect Wallet</button>
        )}
      </div>
    </header>
  );
};

export default Header;
