import React, { useState } from 'react';
import styles from '../../styles/Layout/HamburgerMenu.module.css';
import { Link } from 'react-router-dom';
import { FaHome, FaUsers, FaMoon, FaBell } from 'react-icons/fa';

const HamburgerMenu: React.FC<{ open: boolean; onClose: () => void; darkMode: boolean; toggleDarkMode: () => void }> = ({ open, onClose, darkMode, toggleDarkMode }) => {
  const [showNotifications, setShowNotifications] = useState(false);

  if (!open) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <nav className={styles.menu} onClick={e => e.stopPropagation()}>
        <button className={styles.closeBtn} onClick={onClose}>&times;</button>
        <ul className={styles.menuList}>
          <li><Link to="/" onClick={onClose}><FaHome /> Home</Link></li>
          <li><Link to="/campaign-create" onClick={onClose}><FaUsers /> Create Campaign</Link></li>
          <li><Link to="/pool-create" onClick={onClose}><FaUsers /> Create Pool</Link></li>
          <li><Link to="/coep-pools" onClick={onClose}><FaUsers /> Browse Pools</Link></li>
          <li><Link to="/waitlist" onClick={onClose}><FaUsers /> Waitlist</Link></li>
          <li><Link to="/admin" onClick={onClose}><FaUsers /> Admin</Link></li>
          <li><button className={styles.menuBtn} onClick={toggleDarkMode}><FaMoon /> {darkMode ? 'Light Mode' : 'Dark Mode'}</button></li>
          <li>
            <button className={styles.menuBtn} onClick={() => setShowNotifications(!showNotifications)}><FaBell /> Notifications</button>
            {showNotifications && (
              <div className={styles.notificationsPanel}>
                <p>No new notifications.</p>
              </div>
            )}
          </li>
        </ul>
      </nav>
    </div>
  );
};

export default HamburgerMenu;
