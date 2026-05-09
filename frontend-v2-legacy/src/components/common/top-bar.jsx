import { useAuth } from '@contexts/StacksAuthContext';

function TopBar() {
  const { userData, isAuthenticated } = useAuth();

  const getStacksAddress = () => {
    if (!userData) return '';
    const testnetAddr = userData.profile?.stxAddress?.testnet || userData.stxAddress?.testnet;
    const mainnetAddr = userData.profile?.stxAddress?.mainnet || userData.stxAddress?.mainnet;
    return testnetAddr || mainnetAddr || '';
  };

  return (
    <aside className="py-4 topbar text-black text-center relative z-10">
      {isAuthenticated && userData ? (
        <div>
          <span className="font-semibold">Wallet Address: </span>
          <span title={getStacksAddress()} className="font-mono">
            {getStacksAddress().slice(0, 6)}...{getStacksAddress().slice(-4)}
          </span>
        </div>
      ) : (
        <div>
          Don't Have An Account?{' '}
          <a
            href="#"
            className="underline hover:no-underline"
          >
            Create Account
          </a>
        </div>
      )}
    </aside>
  );
}

export default TopBar;
