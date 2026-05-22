import { useEffect, useState } from 'react';
import { useAuth } from '@contexts/StacksAuthContext';

function AuthSection({ type = 'login' }) {
  const { signIn, isAuthenticated, isLoading, userData, stxBalance, error } = useAuth();
  const [address, setAddress] = useState('');

  useEffect(() => {
    if (userData) {
      const addr = userData.profile?.stxAddress?.testnet
        || userData.profile?.stxAddress?.mainnet
        || userData.stxAddress?.testnet
        || userData.stxAddress?.mainnet
        || '';
      setAddress(addr);
    }
  }, [userData]);

  if (isAuthenticated && userData) {
    return (
      <section className="pt-20 lg:pt-24 pb-24">
        <div className="container px-4 mx-auto max-w-lg text-center">
          <div className="glass-card p-8">
            <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-green-400/10 flex items-center justify-center">
              <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-3xl font-heading text-white mb-2">Connected</h1>
            <p className="text-gray-400 text-sm break-all mb-6 font-mono">{address}</p>
            {stxBalance && (
              <p className="text-green-400 font-semibold text-lg mb-6">{stxBalance} STX</p>
            )}
            <p className="text-gray-500 text-sm">You are signed in. Close this page and continue to the dashboard.</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="pt-20 lg:pt-24 pb-24">
      <div className="container px-4 mx-auto max-w-lg">
        <div className="glass-card p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-cyan-400/10 flex items-center justify-center">
            <svg className="w-8 h-8 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m0 0v2m0-2h2m-2 0H10m21-7a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>

          <h1 className="mb-3 text-3xl text-white font-heading tracking-tight">
            {type === 'login' ? 'Sign In' : 'Create Account'}
          </h1>
          <p className="text-gray-400 mb-8 text-sm">
            Connect your Stacks wallet to access CineX
          </p>

          {error && (
            <div className="mb-6 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {error}
            </div>
          )}

          <button
            type="button"
            onClick={signIn}
            disabled={isLoading}
            className="w-full px-6 py-4 bg-green-500 hover:bg-green-400 text-black font-bold rounded-full transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
          >
            {isLoading ? (
              <>
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Connecting…
              </>
            ) : (
              <>
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
                </svg>
                Connect Stacks Wallet
              </>
            )}
          </button>

          <p className="mt-6 text-xs text-gray-500">
            Supported wallets: Leather, Xverse, Asigna
          </p>
        </div>
      </div>
    </section>
  );
}

export default AuthSection;
