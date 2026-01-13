import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getRouteByName } from '@app/router';
import { useAuth } from '@contexts/StacksAuthContext';

/**
 * Main site footer with links and branding
 */
function Footer() {
  return (
    <>
      {/* Learn to Code CTA Section */}
      <section className="py-12">
        <div className="container px-4 mx-auto">
          <div className="relative pt-20 px-4 bg-gray-900/20 overflow-hidden rounded-6xl">
            <div className="text-center md:max-w-xl mx-auto pb-20">
              <span className="inline-block mb-4 text-sm text-yellow-400 font-medium tracking-tighter">
                Join CineX Today
              </span>
              <h2 className="font-heading mb-6 text-7xl text-white tracking-8xl">
                Ready to launch a public campaign or form a private Co-EP funding pool?
              </h2>
              <div className="mb-8">
                {/* Replace external register link with internal Create Campaign CTA */}
                <FooterCreateCampaign />
              </div>
              <img
                className="absolute -bottom-24 right-0 z-0"
                src="/images/lines2.svg"
                alt=""
              />
            </div>
          </div>
        </div>
      </section>

      <footer className="bg-gray-50 overflow-hidden">
        <div className="py-14 bg-black rounded-b-7xl"></div>
        <div className="py-24">
          <div className="container px-4 mx-auto">
            <div className="flex flex-wrap justify-center -m-8 mb-28">
              <div className="w-full md:w-1/2 lg:w-4/12 p-8">
                <div className="md:max-w-xs">
                  <img className="mb-7" src="/images/logo-dark.png" alt="" />
                  <p className="text-gray-400 font-medium">
                    Decentralized Crowdfunding and Collaborative Private Pools for the next generation of cinema, powered by Stacks.
                  </p>
                </div>
              </div>
              <div className="w-full md:w-1/2 lg:w-2/12 p-8">
                <h3 className="mb-6 text-lg text-black font-medium">Quick Links</h3>
                <ul>
                  <li className="mb-2.5">
                    <Link
                      className="inline-block text-lg font-medium text-gray-400 hover:text-black transition duration-300"
                      to={getRouteByName('active-pools')}
                    >
                      Active Pools
                    </Link>
                  </li>
                  <li className="mb-2.5">
                    <Link
                      className="inline-block text-lg font-medium text-gray-400 hover:text-black transition duration-300"
                      to={getRouteByName('waitlist')}
                    >
                      Waitlist
                    </Link>
                  </li>
                  <li className="mb-2.5">
                    <Link
                      className="inline-block text-lg font-medium text-gray-400 hover:text-black transition duration-300"
                      to={getRouteByName('about')}
                    >
                      Our Story
                    </Link>
                  </li>
                  <li>
                    <Link
                       className="inline-block text-lg font-medium text-gray-400 hover:text-black transition duration-300"
                      to={getRouteByName('contact')}
                    >
                      Contact
                    </Link>
                  </li>
                </ul>
              </div>
              <div className="w-full md:w-1/2 lg:flex-1 p-8">
                <div className="flex flex-wrap -m-2">
                  <div className="w-full p-2">
                    <a className="block py-5 px-8 bg-white rounded-full" href="#">
                      <div className="flex flex-wrap items-center -m-2">
                        <div className="w-auto p-2">
                          <img src="/images/footers/twitter.svg" alt="" />
                        </div>
                        <div className="flex-1 p-2">
                          <p className="text-black">Follow us on Twitter for updates</p>
                        </div>
                      </div>
                    </a>
                  </div>
                  <div className="w-full p-2">
                    <a className="block py-5 px-8 bg-white rounded-full" href="#">
                      <div className="flex flex-wrap items-center -m-2">
                        <div className="w-auto p-2">
                          <img src="/images/footers/instagram.svg" alt="" />
                        </div>
                        <div className="flex-1 p-2">
                          <p className="text-black">Follow us on Instagram for updates</p>
                        </div>
                      </div>
                    </a>
                  </div>
                  <div className="w-full p-2">
                    <a className="block py-5 px-8 bg-white rounded-full" href="#">
                      <div className="flex flex-wrap items-center -m-2">
                        <div className="w-auto p-2">
                          <img src="/images/footers/tiktok.svg" alt="" />
                        </div>
                        <div className="flex-1 p-2">
                          <p className="text-black">Follow us on TikTok for updates</p>
                        </div>
                      </div>
                    </a>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap justify-between -m-2">
              <div className="w-auto p-2">
                <p className="inline-block text-sm font-medium text-black/60">© {new Date().getFullYear()} CineX</p>
              </div>
              <div className="w-auto p-2">
                <div className="flex flex-wrap items-center -m-2 sm:-m-7">
                  <div className="w-auto p-2 sm:p-7">
                    <a className="inline-block text-sm text-black/60 hover:text-black font-medium transition duration-300" href="#">
                      Terms of Use
                    </a>
                  </div>
                  <div className="w-auto p-2 sm:p-7">
                    <a className="inline-block text-sm text-black/60 hover:text-black font-medium transition duration-300" href="#">
                      Privacy Policy
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}

      function FooterCreateCampaign() {
        const navigate = useNavigate();
        const { isAuthenticated, signIn, isLoading } = useAuth();
        const [showInstallModal, setShowInstallModal] = useState(false);

        const detectWalletInstalled = () => {
          if (typeof window === 'undefined') return false;
          // Common injects: xverse, hiro (hiro-wallet)
          // eslint-disable-next-line no-undef
          return Boolean(window.xverse || window.hiroWallet || window.hiro || window?.StacksProvider || window?.stacksProvider);
        };

        const walletInstalled = detectWalletInstalled();

        const handleClick = async (e) => {
          e?.preventDefault();
          if (isAuthenticated) {
            // Open create campaign in a new tab to keep user on current page
            window.open('/dashboard/filmmaker/create-campaign', '_blank');
            return;
          }

          // If no wallet detected, show install guidance modal
          if (!walletInstalled) {
            setShowInstallModal(true);
            return;
          }

          try {
            await signIn();
            // After successful sign-in, open create page in new tab
            window.open('/dashboard/filmmaker/create-campaign', '_blank');
          } catch (err) {
            console.error('Sign-in failed:', err);
            navigate('/login');
          }
        };

        const handleTryConnect = async () => {
          setShowInstallModal(false);
          try {
            await signIn();
            // After trying to connect from modal, open create page in a new tab
            window.open('/dashboard/filmmaker/create-campaign', '_blank');
          } catch (err) {
            console.error('Sign-in failed:', err);
            navigate('/login');
          }
        };

        return (
          <>
            <button
              onClick={handleClick}
              disabled={isLoading}
              className={`mb-8 px-5 py-3 font-semibold rounded-lg relative z-10 transition-colors duration-200 ${isAuthenticated ? 'bg-yellow-400 text-black hover:bg-yellow-500' : 'bg-transparent border border-yellow-400 text-yellow-400 hover:bg-yellow-400 hover:text-black'}`}
            >
              {isAuthenticated ? 'Create Campaign' : (isLoading ? 'Connecting...' : 'Connect Wallet')}
            </button>

            {showInstallModal && (
              <InstallWalletModal
                onClose={() => setShowInstallModal(false)}
                onTryConnect={handleTryConnect}
              />
            )}
          </>
        );
      }

      function InstallWalletModal({ onClose, onTryConnect }) {
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/70" onClick={onClose}></div>
            <div className="relative bg-black border border-gray-800 rounded-2xl p-6 max-w-lg w-full mx-4 text-white">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-xl font-bold">No Wallet Detected</h3>
                  <p className="text-gray-400 mt-2">To create campaigns you need a Stacks-compatible wallet. Install one of the recommended wallets below or try connecting anyway.</p>
                </div>
                <button onClick={onClose} className="text-gray-400 hover:text-gray-200">✕</button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                <a target="_blank" rel="noreferrer" href="https://xverse.app/" className="px-4 py-3 bg-white text-black rounded-lg text-center font-semibold">Install Xverse</a>
                <a target="_blank" rel="noreferrer" href="https://wallet.hiro.so/" className="px-4 py-3 bg-white text-black rounded-lg text-center font-semibold">Install Hiro</a>
              </div>

              <div className="flex gap-3">
                <button onClick={onTryConnect} className="flex-1 px-4 py-3 bg-yellow-400 text-black font-bold rounded-lg">Try Connect Anyway</button>
                <button onClick={onClose} className="flex-1 px-4 py-3 border border-gray-700 text-gray-300 rounded-lg">Close</button>
              </div>
            </div>
          </div>
        );
      }

export default Footer;
