import { useState } from 'react';
import { openContractCall } from '@stacks/connect';
import { STACKS_TESTNET } from '@stacks/network';
import { 
  uintCV, 
  PostConditionMode, 
  Pc 
} from '@stacks/transactions';
import { useAuth } from '../auth/StacksAuthContext';

/**
 * CineX Crowdfunding Contribution Component
 * Handles dynamic STX input and secure blockchain broadcasting
 */
export default function ContractCallExample() {
  const { userData } = useAuth();
  const [amount, setAmount] = useState<string>('10'); // User input in STX
  const [txId, setTxId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Contract Details 
  const contractAddress = 'ST2VTFJEEJQN93Z6P3AFF6QN7M3WXY85ZPNDR3G51';
  const contractName = 'campaign-module';
  const functionName = 'contribute-to-campaign'; // Verify this is the function name in your .clar file

  const handleContractCall = async () => {
    // 1. Basic Validation
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setError("Please enter a valid STX amount.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 2. Convert STX to Micro-STX (The unit the blockchain uses)
      // We use Math.floor to ensure we send an integer
      const amountInMicroSTX = Math.floor(amountNum * 1_000_000);
      const userAddress = userData?.profile?.stxAddress?.testnet;

      if (!userAddress) throw new Error("Wallet address not found.");

      /**
       * 3. DYNAMIC POST-CONDITION
       * This is the "Safety Permit". It tells the Stacks network:
       * "I authorize this transaction ONLY if exactly {amountInMicroSTX} leaves my wallet."
       * If this is missing or the amount is wrong, the transaction will FAIL/ABORT.
       */
      const postConditions = [
        Pc.principal(userAddress)
          .willSendEq(amountInMicroSTX)
          .ustx(),
      ];

      await openContractCall({
        network: STACKS_TESTNET,
        contractAddress,
        contractName,
        functionName,
        functionArgs: [
          uintCV(amountInMicroSTX), // The argument passed to your Clarity function
        ],
        // Post-Condition Mode: Deny ensures no unauthorized assets are moved
        postConditionMode: PostConditionMode.Deny,
        postConditions,
        appDetails: {
          name: 'CineX Crowdfunding',
          icon: window.location.origin + '/logo.png',
        },
        onFinish: (data: { txId: string }) => {
          console.log('Transaction Broadcasted Success:', data.txId);
          setTxId(data.txId);
          setLoading(false);
        },
        onCancel: () => {
          console.log('User cancelled the transaction');
          setLoading(false);
        },
      });
    } catch (e: any) {
      console.error('Contract call failed:', e);
      setError(e.message || 'An unexpected error occurred.');
      setLoading(false);
    }
  };

  if (!userData) {
    return (
      <div className="p-4 bg-gray-100 rounded text-center">
        <p>Please connect your wallet to contribute.</p>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto p-6 bg-white border border-gray-200 rounded-xl shadow-md">
      <h2 className="text-xl font-bold mb-4">Support this Project</h2>
      
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Contribution Amount (STX)
        </label>
        <input 
          type="number" 
          step="0.1"
          value={amount} 
          onChange={(e) => setAmount(e.target.value)}
          className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"
          placeholder="e.g. 50"
        />
        <p className="text-xs text-gray-500 mt-1">
          ≈ {(parseFloat(amount) || 0) * 1_000_000} micro-STX
        </p>
      </div>

      <button 
        onClick={handleContractCall}
        disabled={loading}
        className={`w-full py-3 px-4 rounded-lg font-semibold text-white transition-colors 
          ${loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
      >
        {loading ? 'Waiting for Wallet...' : `Contribute ${amount} STX`}
      </button>

      {/* Transaction Success Feedback */}
      {txId && (
        <div className="mt-4 p-4 bg-green-50 text-green-800 rounded-lg border border-green-100">
          <p className="text-sm font-medium">Transaction Sent!</p>
          <a 
            href={`https://explorer.hiro.so/txid/${txId}?chain=testnet`} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-xs underline block mt-1 font-mono break-all"
          >
            Track on Explorer: {txId}
          </a>
        </div>
      )}

      {/* Error Feedback */}
      {error && (
        <div className="mt-4 p-3 bg-red-50 text-red-700 text-sm rounded border border-red-100">
          <strong>Error:</strong> {error}
        </div>
      )}
    </div>
  );
}