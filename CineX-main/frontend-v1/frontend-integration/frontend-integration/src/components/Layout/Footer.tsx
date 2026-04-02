
import React, { useState } from 'react';
import styles from '../../styles/Layout/Footer.module.css';

import facebookIcon from '../../assets/icons/facebook.svg';
import twitterIcon from '../../assets/icons/twitter.svg';
import instagramIcon from '../../assets/icons/instagram.svg';

const Footer: React.FC = () => {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 2500);
    setEmail('');
  };

  return (
    <footer className={styles.footer}>
      <div className={styles.left}>
        <form className={styles.contactForm} onSubmit={handleSubmit}>
          <label htmlFor="footer-email" className={styles.contactLabel}>Contact us:</label>
          <input
            id="footer-email"
            type="email"
            className={styles.contactInput}
            placeholder="Your email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
          />
          <button type="submit" className={styles.contactButton}>Send</button>
          {submitted && <span className={styles.contactSuccess}>Thank you!</span>}
        </form>
      </div>
      <div className={styles.center}>
        <div className={styles.links}>
          <a href="/about">About</a>
          <a href="/contact">Contact / Support</a>
          <a href="/terms">Terms of Service</a>
        </div>
        <div className={styles.social}>
          <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" aria-label="Twitter">
            <img src={twitterIcon} alt="Twitter" className={styles.socialIcon} />
          </a>
          <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" aria-label="Facebook">
            <img src={facebookIcon} alt="Facebook" className={styles.socialIcon} />
          </a>
          <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" aria-label="Instagram">
            <img src={instagramIcon} alt="Instagram" className={styles.socialIcon} />
          </a>
        </div>
      </div>
      <div className={styles.right}>
        <div className={styles.copy}>
          &copy; {new Date().getFullYear()} CineX. All Rights Reserved.
        </div>
        <div className={styles.info}>
          <span>info@cinex.app</span>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
